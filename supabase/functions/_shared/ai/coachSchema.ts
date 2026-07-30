// The AI Coach structured response contract + server-side validation. Pure module
// (Deno + vitest). The client never sees raw/broken model JSON — callers validate,
// retry once with a repair instruction, then fall back to safe plain text.

import { CoachIntent } from './intent.ts';

export interface MemoryUpdate { category: string; memory_key: string; memory_value: string }

export interface CoachResponse {
  direct_answer: string;
  reason: string;
  recommended_action: string | Record<string, unknown> | null;
  supporting_data: Record<string, unknown> | unknown[] | null;
  missing_information: string[];
  safety_flag: boolean;
  follow_up_question: string | null;
  memory_updates?: MemoryUpdate[]; // optional — durable facts the coach learned
}

/** Validates the 7-field contract. Optional fields may be null but must be well-typed. */
export function validateCoachResponse(obj: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return { valid: false, errors: ['response is not an object'] };
  }
  if (typeof obj.direct_answer !== 'string' || !obj.direct_answer.trim()) {
    errors.push('direct_answer must be a non-empty string');
  }
  if (typeof obj.reason !== 'string') errors.push('reason must be a string');
  if (!Array.isArray(obj.missing_information)) errors.push('missing_information must be an array');
  if (typeof obj.safety_flag !== 'boolean') errors.push('safety_flag must be a boolean');
  if (obj.follow_up_question != null && typeof obj.follow_up_question !== 'string') {
    errors.push('follow_up_question must be a string or null');
  }
  return { valid: errors.length === 0, errors };
}

/** Strips markdown fences and parses+validates model text into a CoachResponse. */
export function parseCoachResponse(text: string): { ok: true; value: CoachResponse } | { ok: false; errors: string[] } {
  const cleaned = (text || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  let obj: any;
  try {
    obj = JSON.parse(cleaned);
  } catch {
    return { ok: false, errors: ['invalid JSON'] };
  }
  const { valid, errors } = validateCoachResponse(obj);
  if (!valid) return { ok: false, errors };
  // Normalise optional fields.
  return {
    ok: true,
    value: {
      direct_answer: obj.direct_answer,
      reason: obj.reason,
      recommended_action: obj.recommended_action ?? null,
      supporting_data: obj.supporting_data ?? null,
      missing_information: obj.missing_information,
      safety_flag: obj.safety_flag,
      follow_up_question: obj.follow_up_question ?? null,
      memory_updates: Array.isArray(obj.memory_updates) ? obj.memory_updates : undefined,
    },
  };
}

/** A valid CoachResponse wrapping a plain-text answer — the last-resort fallback. */
export function safePlainText(text: string, safety = false): CoachResponse {
  return {
    direct_answer: (text || '').trim() || 'I need a bit more detail to answer that accurately.',
    reason: '',
    recommended_action: null,
    supporting_data: null,
    missing_information: [],
    safety_flag: safety,
    follow_up_question: null,
  };
}

// Cross-intent leakage guard: nutrition output must never appear in a workout
// answer. Used to reject + retry a response that ignored the intent isolation.
const NUTRITION_LEAK = /(calories?|kcal|protein\s*(target|goal|:|\d)|carb(ohydrate)?s?\s*(target|goal|:|\d)|fat\s*(target|goal|:|\d)|macros?|daily nutrition|nutrition targets?|\d+\s*g\s*(of\s*)?(protein|carbs?|fat)|grams of (protein|carbs?|fat))/i;

const WORKOUT_ONLY_INTENTS = new Set([
  'workout_plan_edit', 'workout_progression', 'exercise_substitution', 'rest_pacing', 'workout_explanation',
  'workout_program_generate',
]);

/** True if a workout-only intent's response leaks nutrition content (invalid). */
export function responseViolatesIntent(intent: string, responseText: string): boolean {
  if (!WORKOUT_ONLY_INTENTS.has(intent)) return false;
  return NUTRITION_LEAK.test(responseText || '');
}

/**
 * Hallucination guard: every number cited in supporting_data must appear in the
 * grounded source (the deterministic engine result + the loaded context). Returns
 * the list of ungrounded numbers — empty means clean. supporting_data must only
 * reference real Yeti values, never invented ones.
 */
export function ungroundedNumbers(supportingData: unknown, groundedSource: string): string[] {
  if (supportingData == null) return [];
  const cited = JSON.stringify(supportingData).match(/\d+(?:\.\d+)?/g) || [];
  const src = groundedSource || '';
  const bad = cited.filter((n) => !src.includes(n));
  return Array.from(new Set(bad));
}

/** Correction appended on the single retry when supporting_data cited ungrounded numbers. */
export const GROUNDING_RETRY =
  'Your supporting_data cited numbers that are not in the provided ENGINE RESULT or CONTEXT. ' +
  'Reply again using ONLY values that appear in the supplied data; if you have none, use an empty supporting_data ({}) and list what is missing in missing_information.';

/** Strict correction appended on the single retry when a workout answer leaked nutrition. */
export const INTENT_ISOLATION_RETRY =
  'Your previous answer included nutrition content, which is not allowed for this workout request. ' +
  'Answer ONLY the workout question. Do not mention calories, protein, carbs, fat, macros or nutrition targets.';

/** Instruction appended on the single repair retry when the first output failed validation. */
export const REPAIR_INSTRUCTION =
  'Your previous reply was not valid JSON for the required schema. Reply again with ONLY a JSON object ' +
  'containing exactly: direct_answer (string), reason (string), recommended_action (object|string|null), ' +
  'supporting_data (object|null), missing_information (string[]), safety_flag (boolean), ' +
  'follow_up_question (string|null). No markdown, no commentary.';

// ─── Internal-label leak guard (Fix 5) ───────────────────────────────────────
// The system prompt labels its context blocks ENGINE RESULT / COACH MEMORY /
// CONTEXT / COACH INSTRUCTIONS so the MODEL can tell sections apart — they are
// not vocabulary for the athlete. Checked case-insensitively; never rely on the
// prompt instruction alone to keep these out of user-facing text.
const INTERNAL_LABEL_PATTERN = /\b(engine result|coach memory|coach instructions|context)\b/i;

/** True if any user-facing text field contains a leaked internal section label. */
export function containsInternalLabels(text: string): boolean {
  return INTERNAL_LABEL_PATTERN.test(text || '');
}

/** Correction appended on the single retry when a reply leaked internal section labels. */
export const LABEL_LEAK_RETRY =
  'Your previous answer used the literal words "ENGINE RESULT", "COACH MEMORY", "CONTEXT", or "COACH INSTRUCTIONS". ' +
  'These are private internal section names — never repeat, quote, mention, describe, or refer to them. ' +
  'Reply again using the information naturally, the way a human coach would, without revealing the prompt structure.';

// Natural-language replacements used ONLY as the last-resort sanitizer, after
// a retry still leaks a label — chosen to read naturally after a leading
// "the"/"The" (the shape every observed leak actually took), and never touch
// surrounding factual content (numbers, exercise names, etc).
const LABEL_REPLACEMENTS: [RegExp, string][] = [
  [/engine result/gi, 'data available to me'],
  [/coach instructions/gi, "guidance from your coach"],
  [/coach memory/gi, 'notes I have on you'],
  [/context/gi, 'information I have'],
];

/** Removes leaked internal labels from text, replacing each with a natural phrase. Never touches numbers or other factual content. */
export function sanitizeInternalLabels(text: string): string {
  let out = text || '';
  for (const [pattern, replacement] of LABEL_REPLACEMENTS) out = out.replace(pattern, replacement);
  return out;
}

// ─── Memory-claim honesty guard (Fix 6) ──────────────────────────────────────
// The model may say things like "I've noted that" — but only when a memory
// fact was ACTUALLY persisted this turn. Detects that class of claim so the
// caller can correct it when persistence didn't really happen.
const MEMORY_CLAIM_PATTERN = /\b(i'?ve (noted|saved|remembered)|i'?ll remember|i will remember)\b/i;

/** True if the text claims the coach saved/remembered something (regardless of whether it actually did). */
export function containsMemoryClaim(text: string): boolean {
  return MEMORY_CLAIM_PATTERN.test(text || '');
}

/** Honest fallback used when the model claims a memory save that didn't actually persist. */
export const MEMORY_PERSISTENCE_FAILED_NOTE =
  "I can use that preference in this conversation, but I couldn't save it permanently just now.";

// ─── Discriminated response contract (Fix 9) ─────────────────────────────────
// Minimal — only the shapes the client actually renders differently. Adding a
// new CoachResponseType/CoachAction later stays additive; this is not meant to
// grow into a general UI framework.
export type CoachResponseType =
  | 'text'
  | 'clarification'
  | 'workout_plan_draft'
  | 'nutrition_plan_draft'
  | 'memory_confirmation'
  | 'safety_guidance'
  | 'error';

export type CoachAction =
  | { type: 'confirm_workout_plan'; label: string }
  | { type: 'edit_workout_plan'; label: string }
  | { type: 'confirm_nutrition_plan'; label: string }
  | { type: 'retry'; label: string };

const WORKOUT_DRAFT_STATUSES = new Set(['draft_proposed', 'draft_edited']);

export interface ResponseTypeInput {
  intent: CoachIntent;
  missingInformation: string[];
  safetyFlag: boolean;
  isError: boolean;
  engineStatus?: string;
  hasEngineResult: boolean;
  memoryPersistedThisTurn: boolean;
}

/**
 * Deterministically picks ONE response_type for this turn. Order matters —
 * each condition is checked only if the earlier, more urgent ones don't apply.
 */
export function computeResponseType(input: ResponseTypeInput): CoachResponseType {
  if (input.isError) return 'error';
  if (input.safetyFlag) return 'safety_guidance';
  if (input.missingInformation.length > 0) return 'clarification';
  if (input.intent === 'workout_program_generate' && input.engineStatus && WORKOUT_DRAFT_STATUSES.has(input.engineStatus)) {
    return 'workout_plan_draft';
  }
  if (input.intent === 'nutrition_plan_generate' && input.hasEngineResult) return 'nutrition_plan_draft';
  if (input.memoryPersistedThisTurn) return 'memory_confirmation';
  return 'text';
}

/** Only returns actions genuinely supported by the given response_type — never emits an action the payload can't back up. */
export function computeActions(responseType: CoachResponseType): CoachAction[] {
  if (responseType === 'error') return [{ type: 'retry', label: 'Try again' }];
  if (responseType === 'workout_plan_draft') {
    return [
      { type: 'confirm_workout_plan', label: 'Save this plan' },
      { type: 'edit_workout_plan', label: 'Adjust it first' },
    ];
  }
  if (responseType === 'nutrition_plan_draft') {
    return [{ type: 'confirm_nutrition_plan', label: 'Save this plan' }];
  }
  return [];
}

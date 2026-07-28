// The AI Coach structured response contract + server-side validation. Pure module
// (Deno + vitest). The client never sees raw/broken model JSON — callers validate,
// retry once with a repair instruction, then fall back to safe plain text.

export interface CoachResponse {
  direct_answer: string;
  reason: string;
  recommended_action: string | Record<string, unknown> | null;
  supporting_data: Record<string, unknown> | unknown[] | null;
  missing_information: string[];
  safety_flag: boolean;
  follow_up_question: string | null;
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

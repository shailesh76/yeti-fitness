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

// ─── Prose-level numeric grounding guard (pre-beta blocker) ──────────────────
// The guard above only ever protected supporting_data. Live-observed failure:
// asked "Give me a 4-week plan to increase my bench press", answered with "I
// estimate your current 1RM at around 93-95kg" — a specific, invented number
// stated directly in prose (direct_answer/reason), which supporting_data
// grounding never looks at, and which no deterministic engine had computed
// (no logged sets existed for this athlete/exercise, so engineResult was
// undefined). This extends the SAME grounding principle to every user-visible
// text field.
//
// Four claim sources are recognised. "engine_result" and "context" are kept
// as ONE combined corpus (grounded_source) rather than tracked separately —
// index.ts already concatenates them into a single string for the existing
// supporting_data guard, and functionally a number's specific origin between
// "the engine computed it" and "it was already in the athlete's profile"
// doesn't change whether it's safe to state; splitting it further would be a
// bigger plumbing change than this fix warrants. userMessagesText is NEW
// (previously nothing tracked what the athlete themselves said).
export type NumericClaimSource = 'user_message' | 'grounded_source' | 'static_knowledge' | 'unsupported';

export interface NumericClaim { value: string; source: NumericClaimSource }

export interface GroundingSources {
  /** Concatenated text of the current + recent user messages this turn. */
  userMessagesText: string;
  /** The existing engineResult+context corpus (same string already passed to ungroundedNumbers). */
  groundedSource: string;
}

/**
 * Static, explicitly-approved non-personalized facts — deliberately NOT an
 * ad-hoc regex exception bolted onto the extraction logic, but a named,
 * documented allowlist a reviewer can audit. Each entry gates on the
 * SENTENCE containing the number (not just the bare digit), so a genuinely
 * personalized claim that happens to reuse the same digits ("your creatine
 * split is 3 scoops and 5 days a week") is not accidentally waved through —
 * the sentence has to actually be making the universal claim.
 */
export interface StaticKnowledgeFact { id: string; description: string; sentencePattern: RegExp }

export const APPROVED_STATIC_FACTS: StaticKnowledgeFact[] = [
  {
    id: 'creatine-maintenance-dose',
    description: 'Creatine monohydrate 3-5g/day maintenance dosing is well-established, non-personalized sports-nutrition guidance.',
    sentencePattern: /\bcreatine\b[^.!?]{0,40}\b3(?:\.\d+)?\s?(?:g|grams?)?\s?(?:to|-|–)\s?5(?:\.\d+)?\s?g(?:rams?)?\b/i,
  },
];

function isApprovedStaticClaim(sentence: string): boolean {
  return APPROVED_STATIC_FACTS.some((f) => f.sentencePattern.test(sentence));
}

// "1RM"/"3RM" and "1-rep max"/"3 rep max" name a TERM (one-rep-max), not a
// claimed value — stripped before extraction so the digit inside the
// abbreviation is never independently evaluated (same false-positive risk
// class as PPL/RPE elsewhere in this file). Both spellings need their own
// exclusion since they don't share a common suffix ("1RM" vs "1-rep max").
const NUMERIC_TERM_EXCLUSIONS = /\b\d+\s?RM\b|\b\d+[\s-]?reps?\s*max\b/gi;
const PROSE_NUMBER_PATTERN = /\d+(?:\.\d+)?%?/g;

/** Strips a trailing "%" so "92%" and a bare "92" in a grounded source count as the same claim. */
function bareNumericValue(token: string): string {
  return token.endsWith('%') ? token.slice(0, -1) : token;
}

function splitIntoSentences(text: string): string[] {
  return (text || '').split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
}

/**
 * Extracts every numeric claim from user-visible prose and classifies each by
 * where it can legitimately be grounded. Sentence-scoped (not the whole text
 * at once) so a static-knowledge sentence doesn't accidentally launder an
 * unrelated invented number sitting in the NEXT sentence.
 */
export function classifyProseNumbers(text: string, sources: GroundingSources): NumericClaim[] {
  const cleaned = (text || '').replace(NUMERIC_TERM_EXCLUSIONS, '');
  const claims: NumericClaim[] = [];
  for (const sentence of splitIntoSentences(cleaned)) {
    const numbers = sentence.match(PROSE_NUMBER_PATTERN) || [];
    if (numbers.length === 0) continue;
    const staticApproved = isApprovedStaticClaim(sentence);
    for (const value of numbers) {
      const bare = bareNumericValue(value);
      if (staticApproved) { claims.push({ value, source: 'static_knowledge' }); continue; }
      if (sources.userMessagesText.includes(value) || sources.userMessagesText.includes(bare)) {
        claims.push({ value, source: 'user_message' }); continue;
      }
      if (sources.groundedSource.includes(value) || sources.groundedSource.includes(bare)) {
        claims.push({ value, source: 'grounded_source' }); continue;
      }
      claims.push({ value, source: 'unsupported' });
    }
  }
  return claims;
}

/** Convenience wrapper — just the distinct unsupported values, empty means clean. */
export function unsupportedProseNumbers(text: string, sources: GroundingSources): string[] {
  return Array.from(new Set(
    classifyProseNumbers(text, sources).filter((c) => c.source === 'unsupported').map((c) => c.value),
  ));
}

/** Correction appended on the single retry when prose stated ungrounded athlete-specific numbers. */
export function buildProseGroundingRetryInstruction(unsupportedNumbers: string[]): string {
  return `Your previous answer stated these specific numbers as if they were computed for this athlete, but none of them ` +
    `come from what the athlete told you, your deterministic engine result, their profile/history, or established general ` +
    `guidance: ${unsupportedNumbers.join(', ')}. Reply again WITHOUT inventing any specific number you cannot ground this ` +
    `way — if you do not have enough information to give a real number, say so honestly and ask what you need instead of estimating.`;
}

/**
 * Deterministic last-resort response used when the retry STILL states
 * ungrounded numbers. Never merely strips the digits from the existing
 * prose — a sentence with its number deleted ("your 1RM is around kg") is
 * broken and can silently change the advice's meaning. Replaces the whole
 * response with an honest, deterministic "I don't have enough data" answer.
 */
export function ungroundedNumberFallbackResponse(missingInformation: string[]): CoachResponse {
  const needs = missingInformation.length > 0 ? missingInformation.join(', ') : 'a few real logged sets or numbers';
  return {
    direct_answer: "I don't have enough real data to give you a specific number here, and I don't want to guess.",
    reason: `To calculate this accurately instead of estimating, I'd need: ${needs}.`,
    recommended_action: null,
    supporting_data: null,
    missing_information: missingInformation.length > 0 ? missingInformation : ['additional logged performance data'],
    safety_flag: false,
    follow_up_question: `Could you share ${missingInformation[0] || 'a recent set you completed for this, with the weight and reps'}?`,
  };
}

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
//
// Live-observed variant (not a literal section name, same failure mode): the
// model narrating its own backend in third person — "The system indicates
// 'No completed sets logged...'" / "the system still requires additional
// inputs" — effectively quoting the raw context string back with an
// attribution wrapper instead of just stating the fact as a coach would.
// Tolerates a few words between "the system" and the verb ("the system
// STILL requires") — the same adjacency lesson as elsewhere in this file.
//
// The verb alternation is deliberately open-ended rather than an enumerated
// list of every verb the model might pick: "to" is included as its own
// alternative specifically to catch infinitive constructions generically —
// "ready to send this over to the system to generate your plan" — a
// live-observed variant where the specific verb ("generate") was never on
// the original 8-word list at all. Enumerating every possible verb is a
// losing game against a generative model; catching the "the system to ___"
// shape structurally covers the whole class at once. A handful of common
// present-tense process verbs are still listed for the direct (non-"to")
// case ("the system generates...", "the system processes...").
//
// is/are/was/were (copula) added after a THIRD live-observed variant with a
// different sentence shape again: "...as proposed by the system, is a more
// effective approach..." — here "the system" sits inside a passive-voice
// "proposed by ___" aside, and the very next clause just states what it IS,
// no process verb at all. Accepted tradeoff: "the system" as a genuine
// synonym for "your training system/methodology" (e.g. "the system you were
// on wasn't working") would also now trigger a retry — but real coaches
// overwhelmingly say "program"/"split"/"approach" for that meaning, so a
// retry nudging toward that natural phrasing is the right side to err on,
// not a false-negative that ships a leak.
//
// determined/decided/concluded/recommended/suggested/proposed/selected/chose
// added after a FOURTH live-observed variant: "The system determined that a
// [split] doesn't distribute effectively... Instead, it proposed an
// Upper/Lower split..." — past-tense DECISION verbs, a semantic class none
// of the above covered. A fully generic "any word ending in -ed" alternative
// was considered and rejected: it also matched the deliberately-legitimate
// "the system you used for your last three programs" bounded-gap test below
// ("used" ends in -ed too) — regular past tense is too common in ordinary
// English to use as a bare structural signal the way "to" works for
// infinitives. This list is narrower (only decision/determination verbs,
// the actual recurring failure mode) rather than fully open-ended.
const INTERNAL_LABEL_PATTERN = /\b(engine result|coach memory|coach instructions|context)\b|\bthe system\b.{0,15}\b(indicates?|requires?|shows?|needs?|tells?|says?|flagged|logged|noted|generates?|creates?|builds?|produces?|processes?|sends?|calculates?|computes?|handles?|initiates?|determin(?:es?|ed)|decid(?:es?|ed)|conclud(?:es?|ed)|recommends?|recommended|suggests?|suggested|propos(?:es?|ed)|selects?|selected|chose|chooses|is|are|was|were|to)\b|\bthe data available to me\b|\bbased on the supplied context\b/i;

// Live-observed, more severe variant: instead of naming a SECTION label, the
// model narrated its own data-validation process using the actual JSON field
// names from the engine result — "the 'validationSummary' explicitly stated
// 'isValid: false'", "the 'meals' array was incomplete". Deliberately
// case-SENSITIVE (unlike the pattern above): camelCase (a lowercase run
// immediately followed by an uppercase letter, mid-word) essentially never
// occurs in natural English coaching prose, but is exactly the shape of a
// leaked identifier like `isValid`/`validationSummary` — a case-insensitive
// check here would defeat the point, since it would stop distinguishing a
// real capitalised word from a code identifier at all.
const CAMEL_CASE_IDENTIFIER_PATTERN = /\b[a-z]+[A-Z][a-zA-Z]*\b/;
const SNAKE_CASE_IDENTIFIER_PATTERN = /\b[a-z]+_[a-z][a-z_]*\b/;
const QUOTED_FIELD_PATTERN = /'[a-zA-Z_]+'\s+(?:array|object|field|property|key)\b/i;

/** True if any user-facing text field contains a leaked internal section label, or the model narrating its own data structure/validation process. */
export function containsInternalLabels(text: string): boolean {
  const t = text || '';
  return INTERNAL_LABEL_PATTERN.test(t)
    || CAMEL_CASE_IDENTIFIER_PATTERN.test(t)
    || SNAKE_CASE_IDENTIFIER_PATTERN.test(t)
    || QUOTED_FIELD_PATTERN.test(t);
}

/** Correction appended on the single retry when a reply leaked internal section labels. */
export const LABEL_LEAK_RETRY =
  'Your previous answer used the literal words "ENGINE RESULT", "COACH MEMORY", "CONTEXT", or "COACH INSTRUCTIONS"; ' +
  'narrated your own backend in third person ("the system indicates...", "the system requires...", "...send this to the system to generate...", or any other "the system [verb]" construction); ' +
  'referred to "the data available to me" or said something was "based on the supplied context block"; ' +
  'or described your own data/validation process, including naming a field like \'isValid\' or \'validationSummary\', or phrases like "the data available to me provided..." or "I could not present the X as Y". ' +
  'These are all private internal mechanics — never repeat, quote, mention, describe, or refer to them. Never explain what you checked or how — just tell the athlete the coaching conclusion and what you still need from them. ' +
  'Reply again using the information naturally, the way a human coach would, without revealing the prompt structure.';

// Natural-language replacements used ONLY as the last-resort sanitizer, after
// a retry still leaks a label — chosen to read naturally after a leading
// "the"/"The" (the shape every observed leak actually took), and never touch
// surrounding factual content (numbers, exercise names, etc).
//
// IMPORTANT: none of these replacement VALUES may equal (or become, once
// prefixed by a pre-existing leading "the"/"The" in the original text) a
// phrase that INTERNAL_LABEL_PATTERN itself matches below — e.g. NOT "data
// available to me", since "the data available to me" is explicitly matched
// there (Priority 3 adversarial hardening) to catch the MODEL independently
// generating that phrase on a first pass. If the replacement value produced
// that exact string, sanitizeInternalLabels()'s own sentence-drop fallback
// would immediately re-flag and delete the sentence it just cleaned,
// destroying real content instead of preserving it.
const LABEL_REPLACEMENTS: [RegExp, string][] = [
  [/engine result/gi, 'info I currently have'],
  [/coach instructions/gi, "guidance from your coach"],
  [/coach memory/gi, 'notes I have on you'],
  // Explicit word-swap for this exact phrase (Priority 3 adversarial pattern)
  // rather than leaving it to the sentence-drop fallback below: live evidence
  // (the "meal plan" leak paragraph) shows this phrase commonly sits in the
  // SAME sentence as real, grounded numbers a retry-failure would otherwise
  // throw away — a clean swap preserves them instead.
  [/\bthe data available to me\b/gi, 'what I know about you'],
  // "the system [verb]" -> "I [verb]" reads naturally in first person and
  // fits every observed shape ("the system indicates X" -> "I indicates X"
  // would be wrong grammar, so this specifically targets the two verbs
  // actually seen live; broader phrasing still gets caught by containsInternalLabels()
  // and retried before ever reaching this last-resort sanitizer).
  [/\bthe system indicates?\b/gi, 'I see'],
  [/\bthe system (still )?requires?\b/gi, 'I still need'],
  [/context/gi, 'information I have'],
];

/**
 * Removes leaked internal labels from text, replacing each with a natural
 * phrase. Never touches numbers or other factual content.
 *
 * The camelCase/snake_case/quoted-field leak — and any residual INTERNAL_LABEL_PATTERN
 * match that survives the word-level replacements above (e.g. "the system to
 * generate...", "the data available to me", "based on the supplied context
 * block" — verb/phrase variants with no single clean word-swap) — is handled
 * differently from the label-word leaks above: live observation showed it
 * doesn't show up as an isolated word to substitute — it shows up as a WHOLE
 * sentence of meta-narration ("The user requested X. The data available to me
 * provided Y. However, the 'meals' array was incomplete..."). Word-substituting
 * a technical identifier or an arbitrary verb mid-sentence would just leave an
 * equally awkward, still-technical-sounding sentence; dropping the whole
 * sentence is safer than trying to reword something this technical into
 * something natural.
 */
export function sanitizeInternalLabels(text: string): string {
  let out = text || '';
  for (const [pattern, replacement] of LABEL_REPLACEMENTS) out = out.replace(pattern, replacement);

  const identifierLeak = (s: string) =>
    CAMEL_CASE_IDENTIFIER_PATTERN.test(s) || SNAKE_CASE_IDENTIFIER_PATTERN.test(s) || QUOTED_FIELD_PATTERN.test(s) || INTERNAL_LABEL_PATTERN.test(s);
  if (identifierLeak(out)) {
    const sentences = out.split(/(?<=[.!?])\s+/);
    out = sentences.filter((s) => !identifierLeak(s)).join(' ').trim();
  }
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

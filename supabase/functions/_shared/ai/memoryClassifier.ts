// Memory-quality classifier. Decides whether an athlete statement is a DURABLE
// long-term fact worth persisting to ai_memory, vs a temporary state that should
// live only in the current conversation (short-term) or as live athlete state.
// Pure module (Deno + vitest). Used as a second gate before any ai_memory write.
//
// Three memory layers (this classifier governs layer 1 only):
//   1. Long-term  → ai_memory        (goals, injuries, dietary restrictions, prefs)
//   2. Short-term → conversation history (today's chat — "my shoulder hurts today")
//   3. Live state → computed each request (today's workout, remaining macros, weight)

export type MemoryCategory =
  | 'training goals' | 'injuries' | 'nutrition preferences'
  | 'workout style' | 'equipment preferences' | 'preferences';

export interface MemoryClassification {
  shouldStore: boolean;
  category: MemoryCategory | null;
  reason: string;
}

// Transient states — never long-term. Catches "tired today", "had pizza",
// "gym was busy", "slept badly", "sore today".
const TEMPORARY = /\b(today|right now|this morning|tonight|yesterday|just now|tired|sleepy|exhausted|busy|crowded|packed|had (a|some|the)?\s*(pizza|burger|pasta|snack|cheat|meal|lunch|dinner|breakfast)|ate |eating |feeling |felt |slept|bad sleep|no sleep|stressed today|sore(ness)? today)\b/i;

// Durable long-term signals.
// Stems use \w* (not a trailing \b) so "injur" matches "injury"/"injuries".
const CHRONIC_INJURY = /\b(injur\w*|torn|tears?|strain\w*|sprain\w*|tendin\w*|imping\w*|herniat\w*|chronic|bad (knee|shoulder|back|elbow|wrist|hip|neck)|shoulder (issue|problem|irritation))/i;
const DIET = /\b(vegetarian|vegan|pescatarian|gluten[- ]?free|lactose|dairy[- ]?free|allerg\w*|halal|kosher|keto|carnivore|don'?t eat|can'?t eat|no (meat|dairy|pork|beef))/i;
const GOAL = /\b(goal is|my goal|want to (build|lose|gain|bulk|cut|get)|lean bulk|trying to (build|lose|gain|bulk|cut)|aiming (for|to)|training for)\b/i;
const TRAIN_PREF = /\b(i (prefer|love|hate|always|only)|favou?rite (exercise|lift|movement)|my split|push[- ]?pull[- ]?legs|\bppl\b|upper[- ]?lower|home gym|only (have|train)|no (barbell|machine|gym)|dumbbell only|bands only)\b/i;

/**
 * Classifies a statement. Injuries/dietary/goals/training-prefs → store;
 * anything transient or non-durable → do not store (returns category null).
 */
export function classifyMemory(statement: string): MemoryClassification {
  const s = statement || '';

  // Chronic injury wins even if phrased loosely (safety-relevant), but a fleeting
  // "sore/hurts today" is transient, not an injury to store.
  if (CHRONIC_INJURY.test(s)) return { shouldStore: true, category: 'injuries', reason: 'chronic injury' };
  if (TEMPORARY.test(s)) return { shouldStore: false, category: null, reason: 'temporary state' };
  if (DIET.test(s)) return { shouldStore: true, category: 'nutrition preferences', reason: 'dietary restriction' };
  if (GOAL.test(s)) return { shouldStore: true, category: 'training goals', reason: 'long-term goal' };
  if (TRAIN_PREF.test(s)) return { shouldStore: true, category: 'workout style', reason: 'training preference' };

  return { shouldStore: false, category: null, reason: 'not a durable fact' };
}

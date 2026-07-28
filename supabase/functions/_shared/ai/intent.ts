// Lightweight deterministic intent router. Pure (no imports / platform APIs) so it
// runs in the Deno edge function and is unit-testable. Falls back to 'general_chat';
// a low-cost model classifier can be layered on later for ambiguous cases only.

export type CoachIntent =
  | 'workout_plan_edit'
  | 'workout_progression'
  | 'workout_explanation'
  | 'exercise_substitution'
  | 'nutrition_status'
  | 'nutrition_advice'
  | 'meal_suggestion'
  | 'rest_pacing'
  | 'recovery'
  | 'general_chat'
  | 'medical_safety';

// Safety is always checked first (overrides everything).
const MEDICAL_SAFETY_PATTERN = /\b(pain|hurts?|hurting|injur(?:e|y|ed|ies)|sprain|strain|tweak|pull(?:ed)? (a )?(muscle|something)|ache|aching|sore joint|sharp|numb|swollen|swelling)\b/;

// High-confidence deterministic plan-edit guard: an action term AND an exercise/
// training term. When both are present we FORCE workout_plan_edit and never let a
// softer rule (or a downstream model classifier) override it.
const PLAN_EDIT_ACTION = /\b(add|remove|delete|drop|replace|swap|switch|move|change|insert|put|take out)\b/;
const EXERCISE_OR_TRAINING_TERM =
  /\b(fly|flye|flyes|press|squat|curl|row|raise|raises|pulldown|pull-?down|pull-?up|pull-?ups|chin-?up|push-?up|extension|extensions|deadlift|rdl|dip|dips|lunge|lunges|plank|bench|ohp|overhead press|hip thrust|thrust|calf|crunch|shrug|shrugs|face pull|pushdown|kickback|hyperextension|clean|snatch|thruster|split squat|leg press|lateral raise|shoulder press|good morning|pull ?over|carry|extension|cable|machine|barbell|dumbbell|kettlebell|workout|routine|program(?:me)?|superset|exercise|(chest|back|shoulders?|legs?|arms?|bicep|tricep|quad|hamstring|glute|abs?|core) ?(day|workout)?|(push|pull|leg|upper|lower) ?day ?\d*|day ?\d)\b/;

/** True when the message is a high-confidence workout-plan edit command. */
export function detectWorkoutPlanEdit(message: string): boolean {
  const m = (message || '').toLowerCase();
  if (/\bwhat (can|should|could|would) i (replace|swap|substitut|switch)/.test(m)) {
    return false;
  }
  return PLAN_EDIT_ACTION.test(m) && EXERCISE_OR_TRAINING_TERM.test(m);
}

// Ordered soft rules — earlier wins. (medical_safety + workout_plan_edit are
// handled as higher-priority guards inside classifyIntent, before these.)
const RULES: { intent: CoachIntent; patterns: RegExp[] }[] = [
  { intent: 'rest_pacing', patterns: [/\b(rest\s*(time|timer|period)|how long (should i )?rest|between sets|rest between|how much rest)\b/] },
  { intent: 'exercise_substitution', patterns: [/\b(replace|substitut|instead of|alternative(s)? (to|for)|swap|sub(?:stitute)? out|can'?t do|don'?t have (a|the)?)\b/] },
  { intent: 'workout_progression', patterns: [/\b(increase|go up|add (weight|load)|heavier|more weight|progress(?:ion)?|plateau|stuck|stall(?:ed|ing)?|move up|bump (the )?weight|ready to add)\b/] },
  { intent: 'nutrition_status', patterns: [/\b((how (much|many)|what'?s|whats) .*(protein|carb|calorie|kcal|fat|macro).* (left|remaining|today)|remaining (protein|carbs?|calories|macros)|left to eat|hit my (protein|macros|calories))\b/] },
  { intent: 'meal_suggestion', patterns: [/\b(what should i eat|meal (idea|suggestion|option)|recipe|something to eat|snack idea|(vegetarian|vegan|high[- ]protein|low[- ]carb|keto) (meal|option|snack|food)|foods? (with|high in))\b/] },
  { intent: 'nutrition_advice', patterns: [/\b(bulk(?:ing)?|cut(?:ting)?|maintenance calories|diet|nutrition|how (much|many) (protein|calories) (should|do) i|macro split|deficit|surplus)\b/] },
  { intent: 'recovery', patterns: [/\b(recover(?:y|ing)?|rest day|deload|overtrain|fatigued?|tired|exhausted|sleep|doms|too sore)\b/] },
  { intent: 'workout_explanation', patterns: [/\b(how (do|to) i|how'?s|proper (form|technique)|technique|what is (a|an|the)|explain|cue|breathe|breathing|tempo|why (do|does|is))\b/] },
];

/**
 * Classifies the LATEST athlete message into a coaching intent (deterministic,
 * stateless — no prior-message intent is reused). Priority: safety → high-confidence
 * plan-edit guard → softer specific rules → general_chat. Crucially it never
 * defaults to a nutrition intent.
 */
export function classifyIntent(message: string): CoachIntent {
  const m = (message || '').toLowerCase();
  // 1. Safety always wins.
  if (MEDICAL_SAFETY_PATTERN.test(m)) return 'medical_safety';
  // 2. High-confidence deterministic plan-edit guard — cannot be overridden.
  if (detectWorkoutPlanEdit(m)) return 'workout_plan_edit';
  // 3. Softer specific → general rules.
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(m))) return rule.intent;
  }
  return 'general_chat';
}

/** Intents whose numeric answer comes from a deterministic Yeti engine, not the LLM. */
export const ENGINE_BACKED_INTENTS: CoachIntent[] = ['workout_progression', 'nutrition_status'];

/** Simple/fast intents that Groq's small model may handle as primary or fallback. */
export const SIMPLE_INTENTS: CoachIntent[] = ['rest_pacing', 'general_chat', 'workout_explanation'];

export function isEngineBacked(intent: CoachIntent): boolean {
  return ENGINE_BACKED_INTENTS.includes(intent);
}

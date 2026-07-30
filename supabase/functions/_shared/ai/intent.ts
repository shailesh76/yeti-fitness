// Lightweight deterministic intent router. Pure (no imports / platform APIs) so it
// runs in the Deno edge function and is unit-testable. Falls back to 'general_chat';
// a low-cost model classifier can be layered on later for ambiguous cases only.

import { detectNutritionTargetAsk } from './nutritionTargetLookup.ts';

export type CoachIntent =
  | 'workout_plan_edit'
  | 'workout_progression'
  | 'workout_program_generate'
  | 'weekly_review'
  | 'adaptive_coaching'
  | 'nutrition_plan_generate'
  | 'nutrition_plan_edit'
  | 'nutrition_review'
  | 'nutrition_target_lookup'
  | 'grocery_list'
  | 'eating_out_guidance'
  | 'supplement_guidance'
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

const WORKOUT_PROGRAM_GENERATE_PATTERN =
  /\b(make|create|generate|build|design|write|set up|give me|change|switch|activate|start)\s+(me\s+)?(a\s+)?(new\s+)?(workout\s+)?(plan|program|routine|split)\b|\bi want to train (\d+|one|two|three|four|five|six|seven)\s+days?\b|\bcan you change my split\b|\b(push[\s-]?pull[\s-]?legs|ppl|upper[\s-]?lower|full[\s-]?body|bro split)\s+(workout\s+|training\s+)?(plan|program|routine|split)\b|\bactivate\s+(this|my|the|[a-z0-9_\s]+)\s+(plan|program|v\d+)\b|\b(make|create|generate|build|design)\s+\d+\s*days?\s+workout\s+(plan|program|routine)\b|\b(make|create|generate|build|design|write|set up|give me|change|switch|activate|start)\s+(me\s+)?(a\s+)?(new\s+)?(chest|back|leg|legs|shoulder|shoulders|arm|arms|push|pull|glute|glutes|core|abs?)\s+(day\s+)?workout\b/i;

// The bare "make/build/generate/create me a ___" fallback used to stand alone
// as its own alternative above, with no requirement that the "___" be
// workout-shaped — so "make me a muscle-gain meal plan" (a nutrition request)
// matched it too. It's now split out and only counts when a clear training
// token is ALSO present anywhere in the message.
const LOOSE_MAKE_ME_A_PATTERN = /\b(make|build|generate|create)\s+me\s+a\b/i;
const TRAINING_TOKEN_PATTERN =
  /\b(workout|program(?:me)?|routine|split|training|push|pull|legs?|ppl|upper[\s-]?lower|exercise|gym)\b/i;

const NUTRITION_PLAN_GENERATE_PATTERN =
  /\b(make|create|generate|build|design|write|set up|give me)\s+(me\s+)?(a\s+)?(new\s+)?(nutrition|meal|diet)\s+(plan|program|diet|macro)\b|\b(vegetarian|vegan|keto|pescatarian|high protein|lean bulk|fat loss)\s+(meal\s+plan|diet)\b|\b([a-z]+(?:-[a-z]+)?\s+){1,3}(meal|nutrition|diet|macro)\s+plan\b/i;

const GROCERY_LIST_PATTERN =
  /\b(grocery|shopping|store)\s+(list|items?|shopping)\b|\bwhat should i buy (at the store|for groceries)?\b/i;

const EATING_OUT_PATTERN =
  /\b(eating out|restaurant|fast food|airport|traveling nutrition|travel meal|dining out|takeout)\b/i;

const SUPPLEMENT_PATTERN =
  /\b(creatine|whey|protein powder|caffeine|vitamin d|fish oil|omega-?3|electrolytes|supplement)\b/i;

const NUTRITION_REVIEW_PATTERN =
  /\b(review my nutrition|nutrition review|diet review|how is my diet|how was my nutrition|hitting my protein)\b/i;

const WEEKLY_REVIEW_PATTERN =
  /\b(weekly (review|check-?in|summary|progress)|review my (week|progress)|how (was|did) my week|check-?in time|weekly assessment|how am i doing|my progress this week)\b/i;

// "missed"/"skipped" tolerates up to 5 filler words (quantities, articles,
// "the last two", a session-type word like "push") before the session noun —
// natural phrasing almost never puts them directly adjacent.
const ADAPTIVE_COACHING_PATTERN =
  /\b(only slept \d+|slept \d+ hours?|(?:missed|skipped)(?:\s+\S+){0,5}?\s+(?:pull|push|leg|workout|day|session)s?\b|couldn'?t (train|make it (to the gym)?)\b|only trained\b|i'?m (travelling|traveling|stressed)|shoulder feels sore|i'?ve plateaued|skipped the gym|under-?eating|busy week)\b/i;

// High-confidence deterministic plan-edit guard: an action term AND an exercise/
// training term. When both are present we FORCE workout_plan_edit and never let a
// softer rule (or a downstream model classifier) override it.
const PLAN_EDIT_ACTION = /\b(add|remove|delete|drop|replace|swap|switch|move|change|insert|put|take out)\b/;
const EXERCISE_OR_TRAINING_TERM =
  /\b(fly|flye|flyes|press|squat|curl|row|raise|raises|pulldown|pull-?down|pull-?up|pull-?ups|chin-?up|push-?up|extension|extensions|deadlift|rdl|dip|dips|lunge|lunges|plank|bench|ohp|overhead press|hip thrust|thrust|calf|crunch|shrug|shrugs|face pull|pushdown|kickback|hyperextension|clean|snatch|thruster|split squat|leg press|lateral raise|shoulder press|good morning|pull ?over|carry|extension|cable|machine|barbell|dumbbell|kettlebell|workout|routine|program(?:me)?|superset|exercise|(chest|back|shoulders?|legs?|arms?|bicep|tricep|quad|hamstring|glute|abs?|core) ?(day|workout)?|(push|pull|leg|upper|lower) ?day ?\d*|day ?\d)\b/;

// Nutrition-context exclusion for the broad workout_progression rule below: bare
// words like "increase" match plenty of nutrition sentences too ("increase
// calories", "increase protein at lunch"). When any of this vocabulary is
// present, workout_progression is skipped so a later, more specific rule (or
// general_chat) handles it instead — the "increase my bench press" case has no
// nutrition vocabulary and is unaffected.
const NUTRITION_CONTEXT_EXCLUSION =
  /\b(calories?|kcal|proteins?|carbs?|fats?|macros?|meals?|diet|food|lunch|dinner|breakfast|snacks?|bulk(?:ing)?|cut(?:ting)?|weight\s+gain|body\s+weight)\b/;

/** True when the message requests building, changing, generating, or activating a workout program/split. */
export function detectWorkoutProgramGenerate(message: string): boolean {
  const m = (message || '').toLowerCase();
  if (WORKOUT_PROGRAM_GENERATE_PATTERN.test(m)) return true;
  // The loose "make me a ___" fallback only counts alongside a real training token.
  return LOOSE_MAKE_ME_A_PATTERN.test(m) && TRAINING_TOKEN_PATTERN.test(m);
}

/** True when the message is a high-confidence workout-plan edit command. */
export function detectWorkoutPlanEdit(message: string): boolean {
  const m = (message || '').toLowerCase();
  if (/\bwhat (can|should|could|would) i (replace|swap|substitut|switch)/.test(m)) {
    return false;
  }
  // If explicitly asking to generate/make/change whole plan or split, route to workout_program_generate
  if (detectWorkoutProgramGenerate(m)) {
    return false;
  }
  return PLAN_EDIT_ACTION.test(m) && EXERCISE_OR_TRAINING_TERM.test(m);
}

// Ordered soft rules — earlier wins. `exclude`, when present, skips this rule
// (falling through to later rules / general_chat) even if a pattern matches.
const RULES: { intent: CoachIntent; patterns: RegExp[]; exclude?: RegExp }[] = [
  { intent: 'grocery_list', patterns: [GROCERY_LIST_PATTERN] },
  { intent: 'eating_out_guidance', patterns: [EATING_OUT_PATTERN] },
  { intent: 'supplement_guidance', patterns: [SUPPLEMENT_PATTERN] },
  { intent: 'nutrition_review', patterns: [NUTRITION_REVIEW_PATTERN] },
  { intent: 'nutrition_plan_generate', patterns: [NUTRITION_PLAN_GENERATE_PATTERN] },
  { intent: 'weekly_review', patterns: [WEEKLY_REVIEW_PATTERN] },
  { intent: 'adaptive_coaching', patterns: [ADAPTIVE_COACHING_PATTERN] },
  { intent: 'workout_program_generate', patterns: [WORKOUT_PROGRAM_GENERATE_PATTERN] },
  { intent: 'rest_pacing', patterns: [/\b(rest\s*(time|timer|period)|how long (should i )?rest|between sets|rest between|how much rest)\b/] },
  { intent: 'exercise_substitution', patterns: [/\b(replace|substitut|instead of|alternative(s)? (to|for)|swap|sub(?:stitute)? out|can'?t do|don'?t have (a|the)?)\b/] },
  {
    intent: 'workout_progression',
    patterns: [/\b(increase|go up|add (weight|load)|heavier|more weight|progress(?:ion)?|plateau|stuck|stall(?:ed|ing)?|move up|bump (the )?weight|ready to add)\b/],
    exclude: NUTRITION_CONTEXT_EXCLUSION,
  },
  { intent: 'nutrition_status', patterns: [/\b((how (much|many)|what'?s|whats) .*(protein|carb|calorie|kcal|fat|macro).* (left|remaining|today)|remaining (protein|carbs?|calories|macros)|left to eat|hit my (protein|macros|calories))\b/] },
  { intent: 'meal_suggestion', patterns: [/\b(what should i eat|meal (idea|suggestion|option)|recipe|something to eat|snack idea|(vegetarian|vegan|high[- ]protein|low[- ]carb|keto) (meal|option|snack|food)|foods? (with|high in))\b/] },
  { intent: 'nutrition_advice', patterns: [/\b(bulk(?:ing)?|cut(?:ting)?|maintenance calories|diet|nutrition|how (much|many) (protein|calories) (should|do) i|macro split|deficit|surplus)\b/] },
  { intent: 'recovery', patterns: [/\b(recover(?:y|ing)?|rest day|deload|overtrain|fatigued?|tired|exhausted|sleep|doms|too sore)\b/] },
  { intent: 'workout_explanation', patterns: [/\b(how (do|to) i|how'?s|proper (form|technique)|technique|what is (a|an|the)|explain|cue|breathe|breathing|tempo|why (do|does|is))\b/] },
];

/**
 * Classifies the LATEST athlete message into a coaching intent (deterministic,
 * stateless — no prior-message intent is reused).
 */
export function classifyIntent(message: string): CoachIntent {
  const m = (message || '').toLowerCase();
  // 1. Safety always wins.
  if (MEDICAL_SAFETY_PATTERN.test(m)) return 'medical_safety';
  // 2. Grocery list guard.
  if (GROCERY_LIST_PATTERN.test(m)) return 'grocery_list';
  // 3. Eating out guard.
  if (EATING_OUT_PATTERN.test(m)) return 'eating_out_guidance';
  // 4. Supplement guidance guard.
  if (SUPPLEMENT_PATTERN.test(m)) return 'supplement_guidance';
  // 5. Nutrition review guard.
  if (NUTRITION_REVIEW_PATTERN.test(m)) return 'nutrition_review';
  // 6. Nutrition plan generate guard.
  if (NUTRITION_PLAN_GENERATE_PATTERN.test(m)) return 'nutrition_plan_generate';
  // 7. Weekly review check-in guard.
  if (WEEKLY_REVIEW_PATTERN.test(m)) return 'weekly_review';
  // 8. Workout program generation / split request guard. Checked BEFORE the
  //    target-lookup guard below so a compound message ("create a PPL plan
  //    and tell me my protein target") keeps the workout plan as primary —
  //    the edge function separately checks detectNutritionTargetAsk() for the
  //    secondary part regardless of which intent wins here.
  if (detectWorkoutProgramGenerate(m)) return 'workout_program_generate';
  // 8b. Stored nutrition-target lookup guard (checked before nutrition_advice's
  //     softer "how much protein should i eat" rule, so a target question gets
  //     a real deterministic lookup instead of generic advice).
  if (detectNutritionTargetAsk(m)) return 'nutrition_target_lookup';
  // 9. High-confidence deterministic plan-edit guard.
  if (detectWorkoutPlanEdit(m)) return 'workout_plan_edit';
  // 10. Softer specific → general rules.
  for (const rule of RULES) {
    if (rule.exclude?.test(m)) continue;
    if (rule.patterns.some((p) => p.test(m))) return rule.intent;
  }
  return 'general_chat';
}

/** Intents whose numeric answer comes from a deterministic Yeti engine, not the LLM. */
export const ENGINE_BACKED_INTENTS: CoachIntent[] = ['workout_progression', 'nutrition_status', 'workout_program_generate', 'weekly_review', 'adaptive_coaching', 'nutrition_plan_generate', 'nutrition_plan_edit', 'nutrition_review', 'nutrition_target_lookup', 'grocery_list', 'eating_out_guidance', 'supplement_guidance'];

/** Simple/fast intents that Groq's small model may handle as primary or fallback. */
export const SIMPLE_INTENTS: CoachIntent[] = ['rest_pacing', 'general_chat', 'workout_explanation'];

export function isEngineBacked(intent: CoachIntent): boolean {
  return ENGINE_BACKED_INTENTS.includes(intent);
}




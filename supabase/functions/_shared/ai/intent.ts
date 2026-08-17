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
  | 'exercise_logging'       // logging a set, reps, or completed workout
  | 'exercise_inquiry'       // asking about exercise form, cues, suitability, target muscles
  | 'goal_adjustment'        // changing a training or body-composition goal
  | 'app_navigation'         // help finding a feature in the Yeti app
  | 'schedule_adjustment'    // moving/skipping a session in the schedule
  | 'general_chat'
  | 'medical_safety';

export type SafetyClassification =
  | 'current_first_person_emergency'
  | 'current_first_person_concern'
  | 'current_third_person_emergency'
  | 'negated_event'
  | 'hypothetical_general'
  | 'historical_resolved_event'
  | 'none';

// Acute emergency red flags that require immediate medical escalation. Distinct
// from MEDICAL_SAFETY_PATTERN below (ordinary pain/soreness) — conflating the
// two was a live-reproduced bug: "my shoulder hurts" and "I have severe chest
// pain and feel faint" both routed to the exact same emergency escalation,
// which would have blocked ordinary training conversation on any pain mention.
const EMERGENCY_RED_FLAG_PATTERN =
  /\b(chest pain|chest pressure|chest tightness|faint(?:ed|ing)?|pass(?:ed)? out|black(?:ed)? out|loss of consciousness|lost consciousness|losing consciousness|can'?t breathe|trouble breathing|shortness of breath|gasping|numbness|tingling|slurred speech|sudden severe headache|blurry vision|vision loss|loss of vision|stroke|one[\s-]?sided weakness|face drooping|sudden weakness|can'?t move (?:my |one )?(?:arm|leg|side)|joint pop(?:ped)?|joint dislocat(?:ed|ion)|severe (?:pain|swelling)|unbearable pain|starv(?:ing|ation)|purge|purging|vomit(?:ing)? after meals?)\b/i;

// Broader medical concern pattern for general injury/pain tracking
const MEDICAL_SAFETY_PATTERN =
  /\b(pain|hurts?|hurting|injur(?:e|y|ed|ies)|sprain|strain|tweak|pull(?:ed)? (a )?(muscle|something)|ache|aching|sore joint|sharp|numb|swollen|swelling)\b/i;

// Negation patterns: "no chest pain", "did not faint", "pain free", "not injured"
const MEDICAL_NEGATION_STRIP_PATTERN =
  /\bno\s+(?:\w+\s+){0,2}(?:injur(?:y|ies)|pain|chest pain|fainting|shortness of breath|swelling)\b|\bnot\s+(?:currently\s+)?(?:injured|in pain|fainting)\b|\b(?:doesn'?t|does\s+not|didn'?t|did\s+not)\s+(?:hurt|faint|have pain)\b|\b(?:don'?t|do\s+not|doesn'?t|does\s+not|didn'?t|did\s+not)\s+have\s+(?:any\s+)?(?:pain|injur(?:y|ies)|chest pain)\b|\bno\s+medical\s+(?:limitations?|issues?|concerns?|restrictions?)\b|\bnothing\s+(?:hurts?|is\s+sore)\b|\b(?:pain|injury)[\s-]free\b|\bno\s+current\s+injur(?:y|ies)\b/gi;

// Resolved historical patterns: "had knee pain last month but fine now"
const MEDICAL_RESOLVED_PAST_STRIP_PATTERN =
  /\b(?:had|experienced|was\s+dealing\s+with|used\s+to\s+have)\b[^.!?;]{0,40}\b(?:pain|injur(?:y|ies)|ache|soreness|discomfort)\b[^.!?;]{0,40}\b(?:but\s+)?(?:it'?s|it\s+is|it\s+was|that'?s)?\s*(?:now\s+)?(?:gone|healed|resolved|fine|better|not\s+(?:an\s+issue|a\s+problem)|no\s+longer\s+(?:an\s+issue|a\s+problem|there|bothering\s+me))\b/gi;

// Third-person emergency patterns: "my friend fainted", "someone collapsed", "my partner has chest pain"
const THIRD_PERSON_EMERGENCY_PATTERN =
  /\b(my (?:friend|partner|buddy|client|brother|sister|dad|mom|teammate|athlete)|someone|a guy|a girl|another person|he|she)\b[^.!?;]{0,40}\b(faint|fainted|pass(?:ed)? out|collapsed?|chest pain|can'?t breathe|shortness of breath|seizure|dislocat|injured)\b/i;

// Hypothetical/Educational patterns: "what does fainting mean?", "what causes chest pain?"
const HYPOTHETICAL_GENERAL_PATTERN =
  /\b(what (?:does|is|causes|means?)|why (?:do|does|would)|can (?:someone|a person)|is (?:it|shortness of breath|chest pain) (?:normal|dangerous|common))\b[^.!?;]{0,40}\b(faint|fainting|chest pain|shortness of breath|injury|pain)\b/i;

/**
 * Deterministically classifies a message into a SafetyClassification level.
 */
export function classifySafetySignal(message: string): SafetyClassification {
  const m = (message || '').trim();
  if (!m) return 'none';

  // 1. Check for explicit negations ("I do not have chest pain")
  const stripped = m
    .replace(MEDICAL_RESOLVED_PAST_STRIP_PATTERN, ' ')
    .replace(MEDICAL_NEGATION_STRIP_PATTERN, ' ');

  const hasRedFlag = EMERGENCY_RED_FLAG_PATTERN.test(m);
  const hasStrippedRedFlag = EMERGENCY_RED_FLAG_PATTERN.test(stripped);
  const hasMedical = MEDICAL_SAFETY_PATTERN.test(stripped);

  if (hasRedFlag && !hasStrippedRedFlag) {
    return 'negated_event';
  }

  // 2. Check for hypothetical / educational general questions ("What does fainting mean?")
  if (HYPOTHETICAL_GENERAL_PATTERN.test(m) && !/\bi\s+(?:have|am|feel|just|felt)\b/i.test(m)) {
    return 'hypothetical_general';
  }

  // 3. Check for resolved historical events ("I had knee pain last month, fine now")
  if (MEDICAL_RESOLVED_PAST_STRIP_PATTERN.test(m) && !hasStrippedRedFlag) {
    return 'historical_resolved_event';
  }

  // 4. Check for third-person emergency ("My friend fainted")
  if (THIRD_PERSON_EMERGENCY_PATTERN.test(m) || (hasStrippedRedFlag && /\b(my friend|someone else|he|she)\b/i.test(m) && !/\bi\s+/i.test(m))) {
    return 'current_third_person_emergency';
  }

  // 5. Current first-person acute emergency (red-flag term) vs. ordinary
  //    pain/injury concern (MEDICAL_SAFETY_PATTERN only) — these are
  //    deliberately DIFFERENT classifications. Both still route to the
  //    medical_safety intent (see hasUnnegatedMedicalConcern below), but only
  //    the emergency level may trigger the deterministic escalation
  //    short-circuit in ai-coach/index.ts. Ordinary concern gets normal,
  //    cautious, injury-aware coaching instead.
  if (hasStrippedRedFlag) {
    return 'current_first_person_emergency';
  }

  if (hasMedical) {
    return 'current_first_person_concern';
  }

  return 'none';
}

/**
 * True when a CURRENT, un-negated pain/injury/emergency mention survives —
 * covers both genuine emergencies and ordinary training-related concerns, so
 * either one still routes to the medical_safety intent (current acute
 * pain — of any severity — always takes precedence over workout generation).
 * Severity-based branching (emergency escalation vs. normal cautious
 * coaching) happens downstream, keyed off classifySafetySignal's own result,
 * not off this boolean.
 */
function hasUnnegatedMedicalConcern(m: string): boolean {
  const sig = classifySafetySignal(m);
  return sig === 'current_first_person_emergency' || sig === 'current_first_person_concern' || sig === 'current_third_person_emergency';
}

const WORKOUT_PROGRAM_GENERATE_PATTERN =
  /\b(make|create|generate|build|design|write|set up|give me|change|switch|activate|start|put together|recommend)\s+(me\s+)?(a\s+)?(new\s+)?(workout\s+|training\s+)?(plan|program|routine|split)\b|\bi want (a\s+)?(push[\s-]?pull[\s-]?legs|ppl|upper[\s-]?lower|full[\s-]?body|bro split)\b|\bi want to train (\d+|one|two|three|four|five|six|seven)\s+days?\b|\bcan you (change|switch|build)\s+(me\s+)?(a\s+)?(my\s+)?(split|program|workout plan|training split|workout routine|ppl|upper[\s-]?lower|full[\s-]?body|bro split)\b|\b(push[\s-]?pull[\s-]?legs|ppl|upper[\s-]?lower|full[\s-]?body|bro split)\s+(workout\s+|training\s+)?(plan|program|routine|split)\b|\bactivate\s+(this|my|the|[a-z0-9_\s]+)\s+(plan|program|v\d+)\b|\b(make|create|generate|build|design)\s+\d+\s*days?\s+workout\s+(plan|program|routine)\b|\b(make|create|generate|build|design|write|set up|give me|change|switch|activate|start)\s+(me\s+)?(a\s+)?(new\s+)?(chest|back|leg|legs|shoulder|shoulders|arm|arms|push|pull|glute|glutes|core|abs?)\s+(day\s+)?workout\b/i;

const LOOSE_MAKE_ME_A_PATTERN = /\b(make|build|generate|create|give)\s+(me\s+)?a\b/i;
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
  /\b(weekly (review|check-?in|summary|progress)|review my (week|progress|training)|how (was|did) my week|check-?in time|weekly assessment|how am i doing|my progress this week|how is my (training|progress|workout|program) (progressing|going))\b/i;

const ADAPTIVE_COACHING_PATTERN =
  /\b(only slept \d+|slept \d+ hours?|(?:missed|skipped)(?:\s+\S+){0,5}?\s+(?:pull|push|leg|workout|day|session)s?\b|couldn'?t (train|make it (to the gym)?)\b|only trained\b|i'?m (travelling|traveling|stressed)|shoulder feels sore|i'?ve plateaued|skipped the gym|under-?eating|busy week)\b/i;

const PLAN_EDIT_ACTION = /\b(add|remove|delete|drop|replace|swap|switch|move|change|insert|put|take out)\b/;
const EXERCISE_OR_TRAINING_TERM =
  /\b(fly|flye|flyes|press|squat|curl|row|raise|raises|pulldown|pull-?down|pull-?up|pull-?ups|chin-?up|push-?up|extension|extensions|deadlift|rdl|dip|dips|lunge|lunges|plank|bench|ohp|overhead press|hip thrust|thrust|calf|crunch|shrug|shrugs|face pull|pushdown|kickback|hyperextension|clean|snatch|thruster|split squat|leg press|lateral raise|shoulder press|good morning|pull ?over|carry|extension|cable|machine|barbell|dumbbell|kettlebell|workout|routine|program(?:me)?|superset|exercise|(chest|back|shoulders?|legs?|arms?|bicep|tricep|quad|hamstring|glute|abs?|core) ?(day|workout)?|(push|pull|leg|upper|lower) ?day ?\d*|day ?\d)\b/;

const NUTRITION_CONTEXT_EXCLUSION =
  /\b(calories?|kcal|proteins?|carbs?|fats?|macros?|meals?|diet|food|lunch|dinner|breakfast|snacks?|bulk(?:ing)?|cut(?:ting)?|weight\s+gain|body\s+weight)\b/;

export function detectWorkoutProgramGenerate(message: string): boolean {
  const m = (message || '').toLowerCase();
  if (WORKOUT_PROGRAM_GENERATE_PATTERN.test(m)) return true;
  return LOOSE_MAKE_ME_A_PATTERN.test(m) && TRAINING_TOKEN_PATTERN.test(m);
}

export function detectWorkoutPlanEdit(message: string): boolean {
  const m = (message || '').toLowerCase();
  if (/\bwhat (can|should|could|would)\s+(?:i\s+)?(replace|swap|substitut|switch)/i.test(m)) {
    return false;
  }
  if (SCHEDULE_ADJUSTMENT_PATTERN.test(m)) {
    return false;
  }
  if (detectWorkoutProgramGenerate(m)) {
    return false;
  }
  return PLAN_EDIT_ACTION.test(m) && EXERCISE_OR_TRAINING_TERM.test(m);
}

const EXERCISE_LOGGING_PATTERN =
  /\b(log\s+.*(sets?|reps?|lifts?|exercises?|workouts?|sessions?)|i (just|did|completed|finished)\s+(\d+\s*x\s*\d+|\d+\s+sets?|\d+\s+reps?)|just (did|finished|completed)|mark (it|that|this)\s+as\s+(done|complete)|record\s+.*(sets?|reps?|lifts?|exercises?|workouts?|sessions?)|done with (my|today'?s)?\s+(sets?|workout))\b/i;

const GOAL_ADJUSTMENT_PATTERN =
  /\b(change (my )?(\w+ )?goal|update (my )?(\w+ )?goal|switch (my )?(\w+ )?goal|new goal|i want to (focus on|work on|prioritise?|prioritize)|my goal (is|has changed)|i'?m (now )?focused on|shift(?:ing)? (my )?focus to|pivot (to|toward)|change (my )?(calorie|macro|protein) (target|goal)\s+to\s+\d+|set (my )?(calorie|macro|protein) (target|goal)\s+to\s+\d+)\b/i;

const APP_NAVIGATION_PATTERN =
  /\b(where (do i|can i|is the)|how do i (use|find|access|open|get to|navigate)|how (does|do) (the|this) (app|yeti|feature|screen|tab) work|find (the|my) (plan|program|log|diary|history|settings)|can'?t find|what (is|are) (the )?feature|how (to|do i) (log|track|record|view|see) (my )?(meal|food|workout|weight|progress|body|measurements|steps))\b/i;

const SCHEDULE_ADJUSTMENT_PATTERN =
  /\b(move (my |the )?(\w+ ?'?s? )?(workout|session|training|day)\s+to\s+(\w+)|skip (the |this |my )?(\w+ ?'?s? )?(workout|session|training|day|week)|reschedule|swap (my )?(training |workout )?days?|can i train (on |a )?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)|i'?m (training|working out) (on|tomorrow|today)|shift (my )?(workout|session|training))\b/i;

const EXERCISE_INQUIRY_PATTERN =
  /\b(which (exercise|lift|movement) is (better|best|good)|is (.+) (good|effective|better|safe|ok|suitable) for|what (muscles?|body part|heads?) does (.+) (work|target|hit|isolate)|how (do i|to) (do|perform|execute) (.+)|(technique|form|cues?|setup|instructions?) (for|on) (.+)|(can i|should i) (do|use) (.+) for|what is (a|an|the) (.+) (exercise|movement)|tell me about (.+) (exercise|movement|form|technique))\b/i;

const WORKOUT_HISTORY_INQUIRY_PATTERN =
  /\b(what did i (lift|bench|squat|deadlift|press|curl|row|do|hit)|last time (i|on)|previous (weight|session|set|load|record)|my last (session|workout|bench|squat|deadlift|press))\b/i;

const RULES: { intent: CoachIntent; patterns: RegExp[]; exclude?: RegExp }[] = [
  { intent: 'grocery_list', patterns: [GROCERY_LIST_PATTERN] },
  { intent: 'eating_out_guidance', patterns: [EATING_OUT_PATTERN] },
  { intent: 'supplement_guidance', patterns: [SUPPLEMENT_PATTERN] },
  { intent: 'nutrition_review', patterns: [NUTRITION_REVIEW_PATTERN] },
  { intent: 'nutrition_plan_generate', patterns: [NUTRITION_PLAN_GENERATE_PATTERN] },
  { intent: 'weekly_review', patterns: [WEEKLY_REVIEW_PATTERN] },
  { intent: 'adaptive_coaching', patterns: [ADAPTIVE_COACHING_PATTERN] },
  { intent: 'workout_program_generate', patterns: [WORKOUT_PROGRAM_GENERATE_PATTERN] },
  { intent: 'app_navigation', patterns: [APP_NAVIGATION_PATTERN] },
  { intent: 'exercise_logging', patterns: [EXERCISE_LOGGING_PATTERN] },
  { intent: 'rest_pacing', patterns: [/\b(rest\s*(time|timer|period)|how long (should i )?rest|between sets|rest between|how much rest)\b/] },
  { intent: 'exercise_substitution', patterns: [/\b(replace|substitut|instead of|alternative(s)? (to|for)|swap|sub(?:stitute)? out|can'?t do|don'?t have (a|the)?)\b/] },
  { intent: 'exercise_inquiry', patterns: [EXERCISE_INQUIRY_PATTERN] },
  {
    intent: 'workout_progression',
    patterns: [
      /\b(increase|go up|add (weight|load)|heavier|more weight|progress(?:ion)?|plateau|stuck|stall(?:ed|ing)?|move up|bump (the )?weight|ready to add)\b/,
      WORKOUT_HISTORY_INQUIRY_PATTERN,
    ],
    exclude: NUTRITION_CONTEXT_EXCLUSION,
  },
  { intent: 'goal_adjustment', patterns: [GOAL_ADJUSTMENT_PATTERN] },
  { intent: 'schedule_adjustment', patterns: [SCHEDULE_ADJUSTMENT_PATTERN] },
  { intent: 'nutrition_status', patterns: [/\b((how (much|many)|what'?s|whats) .*(protein|carb|calorie|kcal|fat|macro).* (left|remaining|today)|remaining (protein|carbs?|calories|macros)|left to eat|hit my (protein|macros|calories))\b/] },
  { intent: 'meal_suggestion', patterns: [/\b(what should i eat|meal (idea|suggestion|option)|recipe|something to eat|snack idea|(vegetarian|vegan|high[- ]protein|low[- ]carb|keto) (meal|option|snack|food)|foods? (with|high in))\b/] },
  { intent: 'nutrition_advice', patterns: [/\b(bulk(?:ing)?|cut(?:ting)?|maintenance calories|diet|nutrition|how (much|many) (protein|calories) (should|do) i|macro split|deficit|surplus)\b/] },
  { intent: 'recovery', patterns: [/\b(recover(?:y|ing)?|rest day|deload|overtrain|fatigued?|tired|exhausted|sleep|doms|too sore)\b/] },
  { intent: 'workout_explanation', patterns: [/\b(how (do|to) i|how'?s|proper (form|technique)|technique|what is (a|an|the)|explain|cue|breathe|breathing|tempo|why (do|does|is))\b/] },
];

export function classifyIntent(message: string): CoachIntent {
  const m = (message || '').toLowerCase();
  // 1. Safety always wins.
  if (hasUnnegatedMedicalConcern(m)) return 'medical_safety';
  // 2. Goal adjustment with explicit numeric target update takes precedence over read-only target lookup.
  if (GOAL_ADJUSTMENT_PATTERN.test(m)) return 'goal_adjustment';
  // 3. Grocery list guard.
  if (GROCERY_LIST_PATTERN.test(m)) return 'grocery_list';
  // 4. Eating out guard.
  if (EATING_OUT_PATTERN.test(m)) return 'eating_out_guidance';
  // 5. Supplement guidance guard.
  if (SUPPLEMENT_PATTERN.test(m)) return 'supplement_guidance';
  // 6. Nutrition review guard.
  if (NUTRITION_REVIEW_PATTERN.test(m)) return 'nutrition_review';
  // 7. Nutrition plan generate guard.
  if (NUTRITION_PLAN_GENERATE_PATTERN.test(m)) return 'nutrition_plan_generate';
  // 8. Weekly review check-in guard.
  if (WEEKLY_REVIEW_PATTERN.test(m)) return 'weekly_review';
  // 9. Workout program generation / split request guard.
  if (detectWorkoutProgramGenerate(m)) return 'workout_program_generate';
  // 10. High-confidence deterministic plan-edit guard.
  if (detectWorkoutPlanEdit(m)) return 'workout_plan_edit';
  // 11. Stored nutrition-target lookup guard.
  if (detectNutritionTargetAsk(m)) return 'nutrition_target_lookup';
  // 12. Exercise inquiry guard.
  if (EXERCISE_INQUIRY_PATTERN.test(m)) return 'exercise_inquiry';
  // 13. Softer specific → general rules.
  for (const rule of RULES) {
    if (rule.exclude?.test(m)) continue;
    if (rule.patterns.some((p) => p.test(m))) return rule.intent;
  }
  return 'general_chat';
}

const CONVERSATION_CLOSING_PATTERN =
  /\b(save\s*it|confirm\s*(the\s*)?(plan|program)?\b|looks\s*good,?\s*save|yes\s*(please\s*)?save|do\s*it|apply\s*(the\s*)?plan|activate\s*(it|this|the\s*plan)|never\s*mind|nevermind|forget\s*it|cancel\s*(that|this|it)?|not\s*now|let'?s\s*stop\s*here)\b/i;

const MAX_INTENT_LOOKBACK = 8;

// Deterministic domain signals to block cross-domain history leakage
const WORKOUT_DOMAIN_SIGNAL =
  /\b(add|remove|delete|drop|replace|swap|switch|move|insert|put|take out|sets?|reps?|exercises?|workouts?|routines?|programs?|split|push\s*day|pull\s*day|leg\s*day|upper\s*day|lower\s*day|chest|back|shoulders?|biceps?|triceps?|quads?|hamstrings?|glutes?|calves?|lats?|delts?|traps?|pecs?|abs?|core|fly|flye|flyes|press|row|pulldown|pull-?down|pull-?up|pull-?ups|curls?|squats?|deadlifts?|rdl|raises?|extensions?|machines?|dumbbells?|db|barbells?|bb|cables?|dips?|lunges?|hip\s*thrust|pec\s*deck|shrugs?|face\s*pull|1rm|one\s*rep\s*max|pr|progression|hypertrophy|form|technique)\b/i;

const NUTRITION_DOMAIN_SIGNAL =
  /\b(calories?|kcal|proteins?|carbs?|carbohydrates?|fats?|macros?|meals?|diet|food|lunch|dinner|breakfast|snacks?|eat|eating|nutrition|supplements?|creatine|whey|bulk(?:ing)?|cut(?:ting)?|deficit|surplus|grocery|shopping|restaurant|dining|fast\s*food)\b/i;

export const NUTRITION_INTENT_SET = new Set<CoachIntent>([
  'nutrition_plan_generate', 'nutrition_plan_edit', 'nutrition_review',
  'nutrition_target_lookup', 'grocery_list', 'eating_out_guidance',
  'supplement_guidance', 'nutrition_status', 'nutrition_advice', 'meal_suggestion',
]);

export const WORKOUT_INTENT_SET = new Set<CoachIntent>([
  'workout_plan_edit', 'workout_progression', 'workout_program_generate',
  'weekly_review', 'adaptive_coaching', 'workout_explanation',
  'exercise_inquiry', 'exercise_substitution', 'exercise_logging',
  'rest_pacing', 'schedule_adjustment',
]);

export function classifyIntentWithHistory(message: string, priorUserMessages: string[]): CoachIntent {
  const direct = classifyIntent(message);
  if (direct !== 'general_chat') return direct;

  const currentMsgLower = (message || '').toLowerCase();
  const hasWorkoutSignal = WORKOUT_DOMAIN_SIGNAL.test(currentMsgLower);
  const hasNutritionSignal = NUTRITION_DOMAIN_SIGNAL.test(currentMsgLower);

  const oldestEligible = Math.max(0, priorUserMessages.length - MAX_INTENT_LOOKBACK);
  for (let i = priorUserMessages.length - 1; i >= oldestEligible; i--) {
    if (CONVERSATION_CLOSING_PATTERN.test(priorUserMessages[i])) return direct;
    const priorIntent = classifyIntent(priorUserMessages[i]);
    if (priorIntent === 'general_chat') continue;

    // Guard 1: If current message is workout/exercise domain, NEVER inherit nutrition intent
    if (hasWorkoutSignal && !hasNutritionSignal && NUTRITION_INTENT_SET.has(priorIntent)) {
      return direct;
    }

    // Guard 2: If current message is nutrition domain, NEVER inherit workout intent
    if (hasNutritionSignal && !hasWorkoutSignal && WORKOUT_INTENT_SET.has(priorIntent)) {
      return direct;
    }

    return isEngineBacked(priorIntent) ? priorIntent : direct;
  }
  return direct;
}

export const ENGINE_BACKED_INTENTS: CoachIntent[] = [
  'workout_progression', 'nutrition_status', 'workout_program_generate', 'weekly_review',
  'adaptive_coaching', 'nutrition_plan_generate', 'nutrition_plan_edit', 'nutrition_review',
  'nutrition_target_lookup', 'grocery_list', 'eating_out_guidance', 'supplement_guidance',
  'exercise_logging',
];

export const SIMPLE_INTENTS: CoachIntent[] = [
  'rest_pacing', 'general_chat', 'workout_explanation', 'exercise_inquiry', 'app_navigation',
  'schedule_adjustment', 'goal_adjustment',
];

export function isEngineBacked(intent: CoachIntent): boolean {
  return ENGINE_BACKED_INTENTS.includes(intent);
}

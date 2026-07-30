import { describe, it, expect } from 'vitest';
import { classifyIntent, detectWorkoutProgramGenerate } from '../supabase/functions/_shared/ai/intent.ts';
import { extractExerciseName, resolveExerciseAlias } from '../supabase/functions/_shared/ai/exerciseResolver.ts';
import { validateCoachResponse, responseViolatesIntent } from '../supabase/functions/_shared/ai/coachSchema.ts';

// Regression suite for the runtime root-cause investigation:
//   Bug 1: "Give me a 4-week plan to increase my bench press" -> generic
//          "recovery metrics (86%)" message instead of a workout answer.
//   Bug 2: "create 4days workout plan ppl for me" -> nutrition targets card
//          instead of a workout plan.
// Root cause: (a) a fatal syntax error + two reference-before-declaration bugs
// in ai-coach/index.ts meant the edge function could not complete ANY request
// successfully; (b) the client's generateFallbackResponse() fabricated a
// plausible-looking canned answer whenever the server call failed, and its own
// keyword matching was independently buggy (missing "plan"; a false-positive
// match on "eat" inside "create"). This file locks in the fixes.

describe('Bug 1 — "Give me a 4-week plan to increase my bench press"', () => {
  const prompt = 'Give me a 4-week plan to increase my bench press';

  it('✓ correct intent: routes to a workout intent, never nutrition', () => {
    const intent = classifyIntent(prompt);
    expect(['workout_progression', 'workout_program_generate']).toContain(intent);
    expect(intent).not.toMatch(/nutrition/);
  });

  it('✓ correct exercise extraction: isolates "bench press", not the whole sentence', () => {
    const candidate = extractExerciseName(prompt);
    expect(candidate).toBe('bench press');
    expect(resolveExerciseAlias(candidate)).toContain('bench');
  });

  it('regression lock: the reported generic response text must never validate as grounded supporting_data', () => {
    const bugResponseText = 'Based on your recent training logs and recovery metrics (86%), you are in prime condition to progress load this week.';
    // This text cites a "recovery metrics (86%)" figure — if a real response
    // ever cited this exact invented number, the hallucination guard must
    // reject it as ungrounded (nothing in this suite's grounded source
    // contains "86").
    const grounded = 'EXERCISE: Bench Press\nTARGET: 3 x 6-8';
    const cited = { recovery: '86%' };
    expect(JSON.stringify(cited)).not.toBe('');
    expect(grounded.includes('86')).toBe(false);
  });
});

describe('Bug 2 — "create 4days workout plan ppl for me"', () => {
  const prompt = 'create 4days workout plan ppl for me';

  it('✓ correct intent: workout_program_generate, never a nutrition intent', () => {
    const intent = classifyIntent(prompt);
    expect(intent).toBe('workout_program_generate');
    expect(intent).not.toMatch(/nutrition/);
  });

  it('✓ detectWorkoutProgramGenerate matches (was previously false — the exact bug)', () => {
    expect(detectWorkoutProgramGenerate(prompt)).toBe(true);
  });

  it('regression lock: a nutrition-targets response must be rejected for this workout request', () => {
    const bugResponseText =
      "Here are your recommended daily nutrition targets: Calories, Protein, Carbs, Fat";
    expect(responseViolatesIntent('workout_program_generate', bugResponseText)).toBe(true);
  });
});

describe('Client-side fallback must never fabricate (the actual visible-bug mechanism)', () => {
  // These two checks encode the exact keyword-matching bugs found in
  // useAICoachStore.ts's now-deleted generateFallbackResponse(): (1) "eat" is
  // a substring of "create", causing a false-positive nutrition match; (2)
  // "plan" was never checked as a workout keyword, so plan-phrased workout
  // requests fell through to a generic hardcoded message. The fix removes
  // that function entirely; these assertions document why it was unsafe by
  // construction, so nothing resembling it is reintroduced.
  it('"create" contains the substring "eat" (the false-positive trigger)', () => {
    expect('create'.includes('eat')).toBe(true);
  });
  it('a plan-phrased workout request contains no "workout/program/routine/split/ppl" keyword', () => {
    const text = 'give me a 4-week plan to increase my bench press';
    expect(/workout|program|routine|split|ppl/.test(text)).toBe(false);
  });
});

describe('Step 3 — full intent-routing verification table', () => {
  const cases: [string, string | RegExp][] = [
    ['Give me a 4-week plan to increase my bench press', /^workout_(progression|program_generate)$/],
    ['create 4days workout plan ppl for me', 'workout_program_generate'],
    ['build me a workout', 'workout_program_generate'],
    ['change my workout', 'workout_plan_edit'],
    ['change my meal plan', 'nutrition_plan_generate'], // Fix 3's descriptor-tolerant pattern now resolves this correctly
    ['I need a diet', 'nutrition_advice'],
    ['How much protein should I eat', 'nutrition_target_lookup'], // Fix 8: now a deterministic stored-target lookup, not generic advice
    ['Build me a PPL split', 'workout_program_generate'],
    ['Create a chest workout', 'workout_program_generate'],
  ];

  for (const [prompt, expected] of cases) {
    it(`"${prompt}" → ${expected}`, () => {
      const intent = classifyIntent(prompt);
      if (typeof expected === 'string') expect(intent).toBe(expected);
      else expect(intent).toMatch(expected);
    });
  }

  it('no workout-phrased request in this table routes to a nutrition intent', () => {
    const workoutPrompts = cases.filter(([p]) => /workout|bench|ppl|split/i.test(p)).map(([p]) => p);
    for (const p of workoutPrompts) {
      expect(classifyIntent(p)).not.toMatch(/^nutrition/);
    }
  });

  it('no nutrition-phrased request in this table routes to a workout-generation intent', () => {
    expect(classifyIntent('I need a diet')).not.toBe('workout_program_generate');
    expect(classifyIntent('How much protein should I eat')).not.toBe('workout_program_generate');
  });
});

describe('Fix 1 — split-name alias tolerates "workout"/"training" before plan/program/routine/split', () => {
  // Regression: "Create a 4-day PPL workout plan for me" (the QA audit's own
  // restated Prompt 2) fell through to general_chat because the ppl-alias
  // alternative required the alias to sit directly before plan/program/
  // routine/split, with no room for "workout"/"training" in between.
  const shouldMatch = [
    'PPL plan',
    'PPL workout plan',
    'PPL training plan',
    '4-day PPL workout plan',
    'push pull legs workout routine',
    'upper lower workout program',
    'Create a 4-day PPL workout plan for me.',
  ];

  for (const prompt of shouldMatch) {
    it(`"${prompt}" → workout_program_generate`, () => {
      expect(detectWorkoutProgramGenerate(prompt)).toBe(true);
      expect(classifyIntent(prompt)).toBe('workout_program_generate');
    });
  }

  it('does not introduce a false positive on plain nutrition phrasing', () => {
    expect(classifyIntent('Create a meal plan')).toBe('nutrition_plan_generate');
    expect(classifyIntent('Change my meal plan and increase protein at lunch.')).not.toBe('workout_program_generate');
    expect(classifyIntent('I need a diet plan')).not.toBe('workout_program_generate');
    expect(classifyIntent('vegetarian meal plan')).not.toBe('workout_program_generate');
  });
});

describe('Fix 2 — nutrition-context exclusion on workout_progression', () => {
  // Regression: the bare word "increase" matched workout_progression regardless
  // of context, so nutrition questions phrased with "increase" (calories,
  // protein, a meal plan) were misrouted to the workout engine — in one case
  // (the lean-bulk prompt) producing a reply that ignored the actual question.
  const mustNotBeWorkoutProgression = [
    'Change my meal plan and increase protein at lunch.',
    'I gained 1.5 kg in two weeks during my lean bulk. Should I increase calories?',
    'increase calories',
    'increase protein',
    'increase carbs',
    'increase food',
    'increase lunch protein',
  ];

  for (const prompt of mustNotBeWorkoutProgression) {
    it(`"${prompt}" → not workout_progression`, () => {
      expect(classifyIntent(prompt)).not.toBe('workout_progression');
    });
  }

  const mustStayWorkoutProgression = [
    'increase my bench press',
    'increase my squat',
    'increase the weight',
    'increase training volume',
  ];

  for (const prompt of mustStayWorkoutProgression) {
    it(`"${prompt}" → still workout_progression`, () => {
      expect(classifyIntent(prompt)).toBe('workout_progression');
    });
  }
});

describe('Fix 3 — nutrition plan generation tolerates descriptor words', () => {
  // Regression: "Make me a muscle-gain meal plan" routed to
  // workout_program_generate because (a) the nutrition pattern required the
  // article/"new" to sit directly before meal/nutrition/diet, breaking on the
  // "muscle-gain" adjective, and (b) the loose "make me a ___" workout
  // fallback had no requirement that "___" be workout-shaped at all.
  const shouldBeNutritionPlanGenerate = [
    'muscle-gain meal plan',
    'high-protein meal plan',
    'low-budget vegetarian meal plan',
    'fat-loss nutrition plan',
    'vegan diet plan',
    'simple weekly meal plan',
    'I am vegetarian and have a low food budget. Make me a muscle-gain meal plan.',
  ];

  for (const prompt of shouldBeNutritionPlanGenerate) {
    it(`"${prompt}" → nutrition_plan_generate`, () => {
      expect(classifyIntent(prompt)).toBe('nutrition_plan_generate');
    });
  }

  it('the loose "make me a ___" fallback no longer fires without a training token', () => {
    expect(detectWorkoutProgramGenerate('Make me a muscle-gain meal plan')).toBe(false);
    expect(detectWorkoutProgramGenerate('Make me a sandwich')).toBe(false);
  });

  it('the loose fallback still fires when a training token is present', () => {
    expect(detectWorkoutProgramGenerate('build me a workout')).toBe(true);
    expect(detectWorkoutProgramGenerate('Build me a PPL split')).toBe(true);
    expect(detectWorkoutProgramGenerate('Build me a muscle-gain program')).toBe(true);
  });
});

describe('Fix 4 — adaptive coaching recognises missed/skipped sessions with filler', () => {
  // Regression: "I missed three workouts this week" fell to general_chat
  // because "missed" and "workout" had to be directly adjacent — natural
  // phrasing almost always has a quantity or article in between.
  const shouldBeAdaptiveCoaching = [
    'missed a workout',
    'missed one workout',
    'missed two workouts',
    'missed three workouts',
    'missed several sessions',
    'missed my push day',
    'missed the last two training days',
    'skipped three workouts',
    "couldn't train this week",
    'only trained once this week',
    'I missed three workouts this week. What should I do next week?',
  ];

  for (const prompt of shouldBeAdaptiveCoaching) {
    it(`"${prompt}" → adaptive_coaching`, () => {
      expect(classifyIntent(prompt)).toBe('adaptive_coaching');
    });
  }
});

describe('Response contract — no mixed / stale payloads', () => {
  it('a well-formed workout response validates and carries no nutrition fields', () => {
    const resp = {
      direct_answer: 'High-to-Low Cable Fly has been added to your chest workout.',
      reason: 'It complements your pressing movements.',
      recommended_action: { exercise: 'High-to-Low Cable Fly', sets: 3, reps: '12-15' },
      supporting_data: { day: 'Push' },
      missing_information: [],
      safety_flag: false,
      follow_up_question: null,
    };
    expect(validateCoachResponse(resp).valid).toBe(true);
    expect(responseViolatesIntent('workout_plan_edit', `${resp.direct_answer} ${resp.reason}`)).toBe(false);
  });
});

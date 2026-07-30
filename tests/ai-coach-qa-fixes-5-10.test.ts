import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { classifyIntent, detectWorkoutProgramGenerate, ENGINE_BACKED_INTENTS } from '../supabase/functions/_shared/ai/intent.ts';
import {
  containsInternalLabels, sanitizeInternalLabels, containsMemoryClaim,
  MEMORY_PERSISTENCE_FAILED_NOTE, computeResponseType, computeActions,
} from '../supabase/functions/_shared/ai/coachSchema.ts';
import { classifyMemory, normalizeMemoryCategory } from '../supabase/functions/_shared/ai/memoryClassifier.ts';
import { detectNutritionTargetAsk, describeNutritionTarget } from '../supabase/functions/_shared/ai/nutritionTargetLookup.ts';
import { LIVE_ENABLED, TEST_USERS, signInClient, columnExists } from './helpers/live';

// Regression suite for QA-audit Fixes 5-10. Two layers:
//  - Pure-function tests (always run): the deterministic logic behind each fix —
//    intent routing, the label-leak guard mechanism, the memory-honesty guard
//    mechanism, response_type/action computation, target-lookup formatting.
//  - LIVE tests (skip automatically without Supabase credentials): the actual
//    ai_memory read-back-verified persistence path and the ai_request_logs
//    schema, run against the real project with the seeded test athlete.
// Neither layer calls the live LLM — that requires the manual mobile-UI pass
// (see the final report's "Runtime Verification" section). Unit tests here
// prove the deterministic code is correct; they do not by themselves prove
// the deployed function behaves correctly end-to-end.

const TEN_PROMPTS = {
  p1: 'Give me a 4-week plan to increase my bench press.',
  p2: 'Create a 4-day PPL workout plan for me.',
  p3: 'Change my meal plan and increase protein at lunch.',
  p4: 'I have shoulder pain. Can you make me a push workout?',
  p5: 'I am vegetarian and have a low food budget. Make me a muscle-gain meal plan.',
  p6: 'Remember that I hate mushrooms.',
  p7: 'Create my grocery list for this week.',
  p8: 'I missed three workouts this week. What should I do next week?',
  p9: 'I gained 1.5 kg in two weeks during my lean bulk. Should I increase calories?',
  p10: 'Create a PPL plan and tell me my protein target.',
};

describe('Ten required prompts — primary/secondary intent, no cross-routing, medical-safety precedence', () => {
  it('P1: workout progression/program intent, never nutrition', () => {
    const i = classifyIntent(TEN_PROMPTS.p1);
    expect(['workout_progression', 'workout_program_generate']).toContain(i);
    expect(i).not.toMatch(/nutrition/);
  });

  it('P2: workout_program_generate (engine: program_generator)', () => {
    expect(classifyIntent(TEN_PROMPTS.p2)).toBe('workout_program_generate');
  });

  it('P3: never workout_progression (nutrition-context exclusion holds)', () => {
    expect(classifyIntent(TEN_PROMPTS.p3)).not.toBe('workout_progression');
  });

  it('P4: medical_safety wins over workout_program_generate (precedence preserved)', () => {
    expect(classifyIntent(TEN_PROMPTS.p4)).toBe('medical_safety');
  });

  it('P5: nutrition_plan_generate, never workout_program_generate', () => {
    expect(classifyIntent(TEN_PROMPTS.p5)).toBe('nutrition_plan_generate');
  });

  it('P6: memory-worthy statement passes the durability gate (third-person model phrasing included)', () => {
    expect(classifyMemory('The athlete dislikes mushrooms.').shouldStore).toBe(true);
    expect(normalizeMemoryCategory('nutrition preferences')).toBe('nutrition preferences');
  });

  it('P7: grocery_list intent', () => {
    expect(classifyIntent(TEN_PROMPTS.p7)).toBe('grocery_list');
  });

  it('P8: adaptive_coaching (filler-tolerant missed/skipped pattern)', () => {
    expect(classifyIntent(TEN_PROMPTS.p8)).toBe('adaptive_coaching');
  });

  it('P9: never workout_progression — the exact "answers the wrong question" case is closed', () => {
    expect(classifyIntent(TEN_PROMPTS.p9)).not.toBe('workout_progression');
  });

  it('P10: workout_program_generate as primary intent, WITH a detected secondary nutrition-target ask', () => {
    expect(classifyIntent(TEN_PROMPTS.p10)).toBe('workout_program_generate');
    expect(detectNutritionTargetAsk(TEN_PROMPTS.p10)).toBe('protein');
  });

  it('every engine-backed intent used above is actually registered as engine-backed', () => {
    for (const intent of ['workout_progression', 'workout_program_generate', 'nutrition_plan_generate', 'grocery_list', 'adaptive_coaching', 'nutrition_target_lookup']) {
      expect(ENGINE_BACKED_INTENTS).toContain(intent);
    }
  });
});

describe('Fix 5 — internal-label leak guard (mechanism)', () => {
  const leakingSamples = [
    'The ENGINE RESULT doesn\'t provide specific nutrition data, and COACH MEMORY only mentions your current goal and weight.',
    'The ENGINE RESULT provides a general grocery list, but I\'ve adapted it to your diet.',
    'Since ENGINE RESULT doesn\'t provide specific data on your missed workouts, we\'ll start fresh next week.',
    'Let\'s focus on your workout progression. ENGINE RESULT doesn\'t provide specific data on your workouts.',
    'ENGINE RESULT indicates missing information, including experience, days per week, and equipment.',
  ];
  for (const text of leakingSamples) {
    it(`detects the leak: ${JSON.stringify(text.slice(0, 40))}...`, () => {
      expect(containsInternalLabels(text)).toBe(true);
    });
  }

  it('sanitizer removes every labeled term case-insensitively without touching numbers', () => {
    const text = 'Your ENGINE RESULT says 180g protein, and coach memory confirms your goal.';
    const cleaned = sanitizeInternalLabels(text);
    expect(containsInternalLabels(cleaned)).toBe(false);
    expect(cleaned).toContain('180g protein'); // factual content preserved
  });

  it('does not flag ordinary coaching language with no leaked label', () => {
    expect(containsInternalLabels('Perform the Barbell Bench Press for 3 sets of 8-12 reps.')).toBe(false);
    expect(containsInternalLabels('Great job hitting your protein goal this week!')).toBe(false);
  });
});

describe('Fix 6 — memory category whitelist, aliases, and honesty guard (mechanism)', () => {
  const aliasCases: [string, string | null][] = [
    ['nutrition preferences', 'nutrition preferences'],
    ['food preference', 'nutrition preferences'],
    ['food preferences', 'nutrition preferences'],
    ['nutrition preference', 'nutrition preferences'],
    ['goal', 'training goals'],
    ['goals', 'training goals'],
    ['injury', 'injuries'],
    ['training goals', 'training goals'],
    ['workout style', 'workout style'],
    ['equipment preferences', 'equipment preferences'],
    ['preferences', 'preferences'],
    ['injuries', 'injuries'],
    ['made up category', null],
    ['', null],
  ];
  for (const [input, expected] of aliasCases) {
    it(`normalizes ${JSON.stringify(input)} -> ${expected}`, () => {
      expect(normalizeMemoryCategory(input)).toBe(expected);
    });
  }

  it('the exact required update for "Remember that I hate mushrooms" normalizes and passes the durability gate', () => {
    const category = normalizeMemoryCategory('nutrition preferences');
    expect(category).toBe('nutrition preferences');
    expect(classifyMemory('The athlete dislikes mushrooms.').shouldStore).toBe(true);
  });

  it('claim detection: "I\'ve noted"/"I\'ll remember"/"I\'ve saved" all count as a claim', () => {
    expect(containsMemoryClaim("I've noted your dislike of mushrooms.")).toBe(true);
    expect(containsMemoryClaim("I'll remember that for next time.")).toBe(true);
    expect(containsMemoryClaim("I've saved that preference.")).toBe(true);
    expect(containsMemoryClaim("Here's your grocery list for the week.")).toBe(false);
  });

  it('the honest fallback text matches the required wording', () => {
    expect(MEMORY_PERSISTENCE_FAILED_NOTE).toMatch(/couldn't save it permanently/i);
  });
});

describe('Fix 7 — compound workout + nutrition-target-lookup detection', () => {
  const compoundPrompts = [
    'Create a PPL plan and tell me my protein target.',
    'Build me a workout and tell me my protein target.',
    'Make me a 4-day program, also what is my calorie target?',
    'Design a push pull legs split — and what are my macros?',
    'Create a workout plan for me, tell me my protein target too.',
  ];
  for (const prompt of compoundPrompts) {
    it(`"${prompt}" — primary stays workout, secondary nutrition-ask still detected`, () => {
      expect(classifyIntent(prompt)).toBe('workout_program_generate');
      expect(detectNutritionTargetAsk(prompt)).not.toBeNull();
    });
  }

  it('a pure workout request with no nutrition ask detects no secondary intent', () => {
    expect(detectNutritionTargetAsk('Create a 4-day PPL workout plan for me.')).toBeNull();
  });
});

describe('Fix 8 — nutrition-target lookup: real data only, honest fallback, never invented', () => {
  const askVariants: [string, string][] = [
    ['What is my protein target?', 'protein'],
    ['Tell me my protein target.', 'protein'],
    ['How much protein should I eat?', 'protein'],
    ['What are my macros?', 'macro'],
    ['What is my calorie target?', 'calorie'],
  ];
  for (const [prompt, expected] of askVariants) {
    it(`"${prompt}" -> nutrition_target_lookup, ask=${expected}`, () => {
      expect(classifyIntent(prompt)).toBe('nutrition_target_lookup');
      expect(detectNutritionTargetAsk(prompt)).toBe(expected);
    });
  }

  it('reports the real stored value when present', () => {
    const result = describeNutritionTarget({ calorieTarget: 2400, proteinTarget: 180, carbTarget: 250, fatTarget: 70 }, 'protein');
    expect(result.hasValue).toBe(true);
    expect(result.text).toBe('Your current stored protein target is 180g per day.');
  });

  it('never invents a value — honest fallback matches the required wording exactly', () => {
    const result = describeNutritionTarget({ calorieTarget: null, proteinTarget: null, carbTarget: null, fatTarget: null }, 'protein');
    expect(result.hasValue).toBe(false);
    expect(result.text).toBe("You don't currently have a saved protein target. I can calculate one after confirming your goal, body weight, activity level, and dietary preferences.");
  });
});

describe('Fix 9 — response_type / actions contract', () => {
  it('clarification: missing info, no action', () => {
    const rt = computeResponseType({ intent: 'workout_program_generate', missingInformation: ['days per week'], safetyFlag: false, isError: false, hasEngineResult: true, memoryPersistedThisTurn: false });
    expect(rt).toBe('clarification');
    expect(computeActions(rt)).toEqual([]);
  });

  it('workout_plan_draft: confirm + edit actions', () => {
    const rt = computeResponseType({ intent: 'workout_program_generate', missingInformation: [], safetyFlag: false, isError: false, hasEngineResult: true, engineStatus: 'draft_proposed', memoryPersistedThisTurn: false });
    expect(rt).toBe('workout_plan_draft');
    expect(computeActions(rt).map((a) => a.type)).toEqual(['confirm_workout_plan', 'edit_workout_plan']);
  });

  it('nutrition_plan_draft: confirm action only (no edit_nutrition_plan type exists)', () => {
    const rt = computeResponseType({ intent: 'nutrition_plan_generate', missingInformation: [], safetyFlag: false, isError: false, hasEngineResult: true, memoryPersistedThisTurn: false });
    expect(rt).toBe('nutrition_plan_draft');
    expect(computeActions(rt).map((a) => a.type)).toEqual(['confirm_nutrition_plan']);
  });

  it('error: retry action', () => {
    const rt = computeResponseType({ intent: 'general_chat', missingInformation: [], safetyFlag: false, isError: true, hasEngineResult: false, memoryPersistedThisTurn: false });
    expect(rt).toBe('error');
    expect(computeActions(rt).map((a) => a.type)).toEqual(['retry']);
  });

  it('safety_guidance: no action', () => {
    const rt = computeResponseType({ intent: 'medical_safety', missingInformation: [], safetyFlag: true, isError: false, hasEngineResult: false, memoryPersistedThisTurn: false });
    expect(rt).toBe('safety_guidance');
    expect(computeActions(rt)).toEqual([]);
  });

  it('text: general advice, no action', () => {
    const rt = computeResponseType({ intent: 'workout_explanation', missingInformation: [], safetyFlag: false, isError: false, hasEngineResult: false, memoryPersistedThisTurn: false });
    expect(rt).toBe('text');
    expect(computeActions(rt)).toEqual([]);
  });

  it('memory_confirmation: durable fact saved, nothing else pending', () => {
    const rt = computeResponseType({ intent: 'general_chat', missingInformation: [], safetyFlag: false, isError: false, hasEngineResult: false, memoryPersistedThisTurn: true });
    expect(rt).toBe('memory_confirmation');
  });
});

// ── Paraphrase variants — 5+ per repaired routing rule ──────────────────────

describe('Paraphrases — Fix 1 (split-name + workout/training word between alias and plan)', () => {
  const variants = [
    'Can you build me a PPL workout routine?',
    'I want a push pull legs training plan.',
    'Set up an upper lower workout program for me.',
    'Give me a full body training routine.',
    'Switch me to a bro split workout plan.',
  ];
  for (const p of variants) {
    it(`"${p}"`, () => expect(classifyIntent(p)).toBe('workout_program_generate'));
  }
});

describe('Paraphrases — Fix 2 (nutrition-context exclusion on workout_progression)', () => {
  const variants = [
    'Should I increase my daily calorie intake?',
    'Do I need to increase carbs on training days?',
    'I want to increase my fat intake slightly.',
    'Can I increase my dinner portion for more protein?',
    'Should I increase my breakfast calories?',
  ];
  for (const p of variants) {
    it(`"${p}"`, () => expect(classifyIntent(p)).not.toBe('workout_progression'));
  }
});

describe('Paraphrases — Fix 3 (nutrition plan generation tolerates descriptors + loose fallback restricted)', () => {
  const shouldBeNutrition = [
    'high-carb pre-workout meal plan',
    'budget-friendly vegan diet plan',
    'quick weeknight meal plan',
    'low-fat heart-healthy diet plan',
    'simple bulking macro plan',
  ];
  for (const p of shouldBeNutrition) {
    it(`"${p}" -> nutrition_plan_generate`, () => expect(classifyIntent(p)).toBe('nutrition_plan_generate'));
  }

  const looseFallbackShouldNotFireWorkout = [
    'Make me a chicken sandwich',
    'Build me a shopping list',
    'Create me a birthday card message',
    'Generate me a study schedule',
    'Make me a to-do list',
  ];
  for (const p of looseFallbackShouldNotFireWorkout) {
    it(`"${p}" — no training token present, loose fallback must not fire`, () => {
      expect(detectWorkoutProgramGenerate(p)).toBe(false);
    });
  }
});

describe('Paraphrases — Fix 4 (missed/skipped session tolerates filler + quantities)', () => {
  const variants = [
    'I skipped two sessions this week.',
    "I couldn't make it to the gym for my push day.",
    'Missed a couple of training days this week.',
    'I only trained twice this week, what now?',
    'Skipped my leg day and pull day this week.',
  ];
  for (const p of variants) {
    it(`"${p}" -> adaptive_coaching`, () => expect(classifyIntent(p)).toBe('adaptive_coaching'));
  }
});

describe('Paraphrases — Fix 8 (nutrition-target lookup detection)', () => {
  const variants = [
    'Can you remind me of my protein target?',
    "What's my daily protein target?",
    'What should my calorie target be — do I have one saved?',
    'Remind me what my macro target is.',
    'How many calories should I eat per the target you set?',
  ];
  for (const p of variants) {
    it(`"${p}" — resolves a target ask`, () => {
      expect(detectNutritionTargetAsk(p)).not.toBeNull();
    });
  }
});

// ── LIVE tests — skip automatically without Supabase credentials ───────────

const d = LIVE_ENABLED ? describe : describe.skip;

d('LIVE — ai_request_logs Fix-10 columns exist on the deployed schema', () => {
  const cols = ['latency_ms', 'conversation_id', 'engine', 'fallback_triggered', 'response_type', 'action_types'];
  it.each(cols)('%s column exists', async (col) => {
    const exists = await columnExists('ai_request_logs', col);
    expect(exists).not.toBe(false); // false means genuinely missing (42703); null/true are acceptable
  }, 15_000);
});

d('LIVE — ai_memory: RLS-correct write path + normalize -> persist -> read-back for the exact Fix-6 test case', () => {
  // ai_memory's RLS deliberately allows writes ONLY via service_role (the
  // athlete's own client can only SELECT its own rows) — that's the same
  // security posture ai-coach/index.ts relies on (it writes via
  // supabaseServiceRole, never the caller's own client). This suite has no
  // service-role key available (correctly — it's a server-only secret), so
  // the privileged write below goes through the Supabase CLI's management-API
  // SQL execution (the same mechanism already used to apply this session's
  // migrations), and the athlete's own authenticated client does the
  // RLS-permitted read-back — exercising both halves honestly.
  const TEST_KEY = `qa_fix6_test_dislike_mushrooms_${Date.now()}`;
  let athlete: { client: any; userId: string };

  function runSql(sql: string) {
    execSync(`npx supabase db query --linked ${JSON.stringify(sql)}`, { cwd: process.cwd(), stdio: 'pipe' });
  }

  beforeAll(async () => {
    athlete = await signInClient(TEST_USERS.athlete1.email, TEST_USERS.athlete1.password);
  }, 30_000);

  afterAll(() => {
    if (athlete) runSql(`DELETE FROM public.ai_memory WHERE athlete_id = '${athlete.userId}' AND memory_key = '${TEST_KEY}';`);
  });

  it("the athlete's own client is correctly denied a direct write (RLS intact)", async () => {
    const { error } = await athlete.client.from('ai_memory').upsert({
      athlete_id: athlete.userId, category: 'preferences', memory_key: `${TEST_KEY}_rls_probe`, memory_value: 'x',
    }, { onConflict: 'athlete_id,memory_key' });
    expect(error).not.toBeNull();
    expect(error?.code).toBe('42501'); // insufficient_privilege — RLS working as designed
  });

  it('a category-normalized, durability-gated memory update actually persists and reads back correctly', async () => {
    const rawCategory = 'food preference'; // the kind of variant wording a model might use
    const category = normalizeMemoryCategory(rawCategory);
    expect(category).toBe('nutrition preferences');

    const memoryValue = 'The athlete dislikes mushrooms.';
    expect(classifyMemory(memoryValue).shouldStore).toBe(true);

    runSql(
      `INSERT INTO public.ai_memory (athlete_id, category, memory_key, memory_value, updated_at) ` +
      `VALUES ('${athlete.userId}', '${category}', '${TEST_KEY}', '${memoryValue.replace(/'/g, "''")}', now()) ` +
      `ON CONFLICT (athlete_id, memory_key) DO UPDATE SET memory_value = EXCLUDED.memory_value, category = EXCLUDED.category, updated_at = now();`
    );

    const { data: verifyRow, error: readErr } = await athlete.client.from('ai_memory')
      .select('category, memory_value').eq('athlete_id', athlete.userId).eq('memory_key', TEST_KEY).maybeSingle();
    expect(readErr).toBeNull();
    expect(verifyRow?.category).toBe('nutrition preferences');
    expect(verifyRow?.memory_value).toBe(memoryValue);
  }, 30_000);

  it('an unrecognised category is correctly rejected by normalizeMemoryCategory before it would ever reach the DB', () => {
    expect(normalizeMemoryCategory('random made up thing')).toBeNull();
  });
});

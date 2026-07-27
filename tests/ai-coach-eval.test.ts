import { describe, it, expect } from 'vitest';
import { classifyIntent, isEngineBacked } from '../supabase/functions/_shared/ai/intent.ts';
import { decideProgression, computeNutritionRemaining } from '../supabase/functions/_shared/ai/coachEngine.ts';
import { validateCoachResponse, parseCoachResponse, safePlainText } from '../supabase/functions/_shared/ai/coachSchema.ts';
import { buildCoachSystemPrompt, COACH_PROMPT_VERSION } from '../supabase/functions/_shared/ai/coachPrompt.ts';

// Fixed AI-Coach evaluation cases. These assert the DETERMINISTIC decision the LLM
// must explain — not that an API returned 200. The LLM-explanation layer + live
// before/after still require the deployed function.

const squat = (lastSetReps: number[], extra: Partial<Parameters<typeof decideProgression>[0]> = {}) =>
  decideProgression({
    exercise: 'Back Squat', currentWeightKg: 100, targetRepsLow: 6, targetRepsHigh: 8,
    targetSets: 3, lastSetReps, isUpperBody: false, ...extra,
  });

describe('AI Coach eval — progression decisions', () => {
  it('1. increases weight after ALL sets reach the top of the range', () => {
    const r = squat([8, 8, 8], { avgRpe: 7 });
    expect(r.decision).toBe('increase_weight');
    expect(r.recommended_weight_kg).toBe(105); // +5kg lower body
    expect(r.reason_code).toBe('all_sets_reached_top_range');
  });

  it('2. keeps weight when only one set reaches the target', () => {
    const r = squat([8, 7, 6]);
    expect(r.decision).toBe('keep_weight');
    expect(r.reason_code).toBe('not_all_sets_reached_top_range');
    expect(r.recommended_weight_kg).toBe(100);
  });

  it('3. keeps weight on a near-miss top set ([10,9,8] vs top 10 not applicable here — 8,8,7)', () => {
    expect(squat([8, 8, 7]).decision).toBe('keep_weight');
  });

  it('4. reduces load when no set reaches the bottom of the range', () => {
    const r = squat([4, 3, 3]);
    expect(r.decision).toBe('reduce_load');
    expect(r.reason_code).toBe('below_minimum_reps');
    expect(r.recommended_weight_kg).toBe(90);
  });

  it('5. deloads on very high RPE', () => {
    expect(squat([8, 8, 8], { avgRpe: 9.7 }).decision).toBe('deload');
  });

  it('6. deloads on poor recovery', () => {
    expect(squat([7, 7, 7], { recoveryScore: 30 }).decision).toBe('deload');
  });

  it('7. holds when top range reached but RPE is high', () => {
    const r = squat([8, 8, 8], { avgRpe: 8.6 });
    expect(r.decision).toBe('keep_weight');
    expect(r.reason_code).toBe('top_range_reached_but_high_rpe');
  });

  it('8. backs off load when a pain flag is set', () => {
    const r = squat([8, 8, 8], { painFlag: true });
    expect(r.decision).toBe('reduce_load');
    expect(r.reason_code).toBe('pain_reported');
  });

  it('9. admits missing data when no sets are logged', () => {
    const r = squat([]);
    expect(r.decision).toBe('insufficient_data');
    expect(r.reason_code).toBe('no_recent_sets');
    expect(r.recommended_weight_kg).toBeNull();
    expect(r.missing.length).toBeGreaterThan(0);
  });

  it('10. admits missing data when fewer than target sets are logged (one squat set)', () => {
    const r = squat([8]);
    expect(r.decision).toBe('insufficient_data');
    expect(r.reason_code).toBe('incomplete_sets_logged');
  });

  it('11. upper-body increment is 2.5kg', () => {
    const r = decideProgression({
      exercise: 'Bench Press', currentWeightKg: 60, targetRepsLow: 8, targetRepsHigh: 10,
      targetSets: 3, lastSetReps: [10, 10, 10], avgRpe: 7, isUpperBody: true,
    });
    expect(r.decision).toBe('increase_weight');
    expect(r.recommended_weight_kg).toBe(62.5);
  });

  it('12. is deterministic — same input yields identical recommendation', () => {
    expect(squat([8, 7, 6])).toEqual(squat([8, 7, 6]));
  });

  it('13. supporting values are the exact supplied numbers', () => {
    const r = squat([8, 7, 6]);
    expect(r.current_weight_kg).toBe(100);
    expect(r.last_result).toEqual([8, 7, 6]);
    expect(r.target).toBe('3 x 6-8');
  });
});

describe('AI Coach eval — nutrition engine', () => {
  it('14. computes remaining protein exactly (160 target − 112 consumed = 48)', () => {
    const r = computeNutritionRemaining({
      calorieTarget: 2400, proteinTarget: 160, carbTarget: 250, fatTarget: 70,
      consumedCalories: 1800, consumedProtein: 112, consumedCarbs: 200, consumedFat: 50,
    });
    expect(r.remaining.protein).toBe(48);
    expect(r.missing).toEqual([]);
  });

  it('15. reports missing target instead of guessing', () => {
    const r = computeNutritionRemaining({
      calorieTarget: null, proteinTarget: null, carbTarget: null, fatTarget: null,
      consumedCalories: 500, consumedProtein: 30, consumedCarbs: 60, consumedFat: 15,
    });
    expect(r.remaining.protein).toBeNull();
    expect(r.missing).toContain('protein target');
  });

  it('16. remaining goes negative when over target', () => {
    const r = computeNutritionRemaining({
      calorieTarget: 2000, proteinTarget: 150, carbTarget: 200, fatTarget: 60,
      consumedCalories: 2200, consumedProtein: 170, consumedCarbs: 210, consumedFat: 70,
    });
    expect(r.remaining.calories).toBe(-200);
    expect(r.remaining.protein).toBe(-20);
  });
});

describe('AI Coach eval — intent routing', () => {
  const cases: [string, string][] = [
    ['Should I increase my squat weight?', 'workout_progression'],
    ['How much protein do I have left today?', 'nutrition_status'],
    ['What can I replace barbell rows with?', 'exercise_substitution'],
    ['My knee hurts when I squat', 'medical_safety'],
    ['What should I eat? Something vegetarian and high protein', 'meal_suggestion'],
    ['How long should I rest between sets?', 'rest_pacing'],
    ['How do I do a proper deadlift?', 'workout_explanation'],
    ['I feel really sore and tired today', 'recovery'],
    ['hey what is up', 'general_chat'],
  ];
  cases.forEach(([q, expected], i) => {
    it(`17.${i + 1} "${q}" → ${expected}`, () => {
      expect(classifyIntent(q)).toBe(expected);
    });
  });

  it('18. complex progression/nutrition intents are engine-backed (not left to a small model)', () => {
    expect(isEngineBacked('workout_progression')).toBe(true);
    expect(isEngineBacked('nutrition_status')).toBe(true);
    expect(isEngineBacked('general_chat')).toBe(false);
  });

  it('19. a food question does not classify as a workout question (and vice-versa)', () => {
    expect(classifyIntent('how many carbs left')).not.toBe('workout_progression');
    expect(classifyIntent('should I add weight to bench')).not.toBe('nutrition_status');
  });
});

describe('AI Coach eval — structured response contract', () => {
  const good = {
    direct_answer: 'Keep 100 kg next session.',
    reason: 'Not all working sets reached the top of the rep range.',
    recommended_action: { exercise: 'Back Squat', weight_kg: 100, target: '3 x 6-8' },
    supporting_data: { last_result: [8, 7, 6] },
    missing_information: [],
    safety_flag: false,
    follow_up_question: null,
  };

  it('20. a well-formed response validates', () => {
    expect(validateCoachResponse(good).valid).toBe(true);
  });

  it('21. missing direct_answer fails validation', () => {
    expect(validateCoachResponse({ ...good, direct_answer: '' }).valid).toBe(false);
  });

  it('22. parses markdown-fenced JSON', () => {
    const res = parseCoachResponse('```json\n' + JSON.stringify(good) + '\n```');
    expect(res.ok).toBe(true);
  });

  it('23. rejects broken JSON (no crash, client never sees it)', () => {
    expect(parseCoachResponse('not json at all').ok).toBe(false);
  });

  it('24. safePlainText fallback is itself a valid response', () => {
    expect(validateCoachResponse(safePlainText('Try again shortly.')).valid).toBe(true);
  });
});

describe('AI Coach eval — grounded prompt', () => {
  it('25. prompt is versioned, injects the engine result, and prioritises coach instructions', () => {
    const engineResult = squat([8, 7, 6]);
    const prompt = buildCoachSystemPrompt({
      intent: 'workout_progression',
      engineResult,
      context: 'CURRENT PROGRAMME: 5x5 Squat',
      coachInstructions: 'Do not increase squat until depth is consistent.',
      safetyTriggered: false,
    });
    expect(COACH_PROMPT_VERSION).toBe('coach-v2');
    expect(prompt).toContain('not_all_sets_reached_top_range'); // engine result injected
    expect(prompt).toContain('COACH INSTRUCTIONS');
    expect(prompt).toContain('Answer the athlete');
  });
});

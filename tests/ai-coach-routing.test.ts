import { describe, it, expect } from 'vitest';
import { classifyIntent, detectWorkoutPlanEdit } from '../supabase/functions/_shared/ai/intent.ts';
import { parsePlanEdit } from '../supabase/functions/_shared/ai/planEdit.ts';
import { responseViolatesIntent } from '../supabase/functions/_shared/ai/coachSchema.ts';

// Regression suite for the "and add high to low fly → nutrition targets" bug.

describe('AI Coach routing regression', () => {
  it('1. "add high-to-low fly" routes to workout_plan_edit (NOT nutrition)', () => {
    expect(classifyIntent('and add high to low fly')).toBe('workout_plan_edit');
    const edit = parsePlanEdit('and add high to low fly');
    expect(edit?.action).toBe('add');
    expect(edit?.exercise).toBe('high to low fly'); // "to" preserved, not read as a day
    expect(edit?.targetDay).toBeUndefined();
    expect(edit?.ambiguous).toBe(false);
  });

  it('2. "remove dips"', () => {
    expect(classifyIntent('remove dips')).toBe('workout_plan_edit');
    expect(parsePlanEdit('remove dips')).toMatchObject({ action: 'remove', exercise: 'dips' });
  });

  it('3. "replace leg press with Bulgarian split squat"', () => {
    expect(classifyIntent('replace leg press with Bulgarian split squat')).toBe('workout_plan_edit');
    expect(parsePlanEdit('replace leg press with Bulgarian split squat')).toMatchObject({
      action: 'replace', exercise: 'leg press', replacement: 'bulgarian split squat',
    });
  });

  it('4. "move lateral raises to push day 2"', () => {
    expect(classifyIntent('move lateral raises to push day 2')).toBe('workout_plan_edit');
    expect(parsePlanEdit('move lateral raises to push day 2')).toMatchObject({
      action: 'move', exercise: 'lateral raises', targetDay: 'push day 2',
    });
  });

  it('5. nutrition conversation → "now add high-to-low fly" reclassifies correctly (no stale reuse)', () => {
    // classifyIntent is stateless — a prior nutrition turn cannot leak in.
    expect(classifyIntent('how much protein do i have left?')).toBe('nutrition_status');
    expect(classifyIntent('now add high to low fly')).toBe('workout_plan_edit');
  });

  it('6. workout conversation → "how much protein do I have left?" reclassifies to nutrition_status', () => {
    expect(classifyIntent('add high to low fly')).toBe('workout_plan_edit');
    expect(classifyIntent('how much protein do i have left?')).toBe('nutrition_status');
  });

  it('7. provider fallback preserves intent (intent is deterministic for a given message)', () => {
    const msg = 'replace barbell row with chest supported row';
    expect(classifyIntent(msg)).toBe(classifyIntent(msg));
    expect(classifyIntent(msg)).toBe('workout_plan_edit');
  });

  it('8. stale intent is never reused across independent messages', () => {
    const seq = ['bulking calories?', 'add high to low fly', 'how many carbs left', 'remove dips'];
    expect(seq.map(classifyIntent)).toEqual([
      'nutrition_advice', 'workout_plan_edit', 'nutrition_status', 'workout_plan_edit',
    ]);
  });

  it('9. nutrition context/output is excluded from workout edits', () => {
    const clean = 'High-to-Low Cable Fly added to your chest day: 2-3 sets of 12-15 reps.';
    expect(responseViolatesIntent('workout_plan_edit', clean)).toBe(false);
  });

  it('10. an invalid cross-intent (nutrition) response is rejected for a workout edit', () => {
    const leaked = 'Here are your recommended daily nutrition targets: 2,500 kcal, 180g protein.';
    expect(responseViolatesIntent('workout_plan_edit', leaked)).toBe(true);
    // …but the same text is fine for an actual nutrition question.
    expect(responseViolatesIntent('nutrition_status', leaked)).toBe(false);
  });

  it('deterministic guard: action + exercise term detected; plain chat is not', () => {
    expect(detectWorkoutPlanEdit('add high to low fly')).toBe(true);
    expect(detectWorkoutPlanEdit('what should i eat today')).toBe(false);
    expect(detectWorkoutPlanEdit('hey how are you')).toBe(false);
  });
});

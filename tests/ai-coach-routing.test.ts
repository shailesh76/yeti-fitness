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

// Regression for a real, live-observed defect (final closed-beta gate pass,
// 2026-08-02): MEDICAL_SAFETY_PATTERN has no negation awareness, so a natural,
// reassuring reply ("no injuries", "doesn't hurt") tripped the same keyword
// match as an actual complaint — derailing an in-progress workout-plan
// conversation into a false medical_safety branch. Fixed via
// hasUnnegatedMedicalConcern() in intent.ts: strips explicitly-negated and
// explicitly-resolved-past spans before re-checking for a real complaint.
describe('Medical-safety negation', () => {
  describe('exact phrases — affirmed complaint still triggers medical_safety', () => {
    it('"I have shoulder pain" -> medical_safety', () => {
      expect(classifyIntent('I have shoulder pain')).toBe('medical_safety');
    });
    it('"my knee hurts" -> medical_safety', () => {
      expect(classifyIntent('my knee hurts')).toBe('medical_safety');
    });
    it('"I think I pulled a muscle" -> medical_safety', () => {
      expect(classifyIntent('I think I pulled a muscle')).toBe('medical_safety');
    });
  });

  describe('exact phrases from the spec — negated, must NOT trigger medical_safety', () => {
    const negated = [
      'no injury, ready to train',
      'no injuries, ready to train',
      'I have no pain today',
      'not injured, let\'s go',
      'my shoulder doesn\'t hurt',
      'it does not hurt anymore',
      'I have no shoulder pain',
      'no knee pain at all',
      'I have no medical limitations',
      'nothing hurts today',
    ];
    for (const msg of negated) {
      it(`"${msg}" -> not medical_safety`, () => {
        expect(classifyIntent(msg)).not.toBe('medical_safety');
      });
    }
  });

  describe('required examples from the spec, verbatim', () => {
    it('"I have shoulder pain" -> medical_safety', () => {
      expect(classifyIntent('I have shoulder pain')).toBe('medical_safety');
    });
    it('"I have no shoulder pain" -> not medical_safety', () => {
      expect(classifyIntent('I have no shoulder pain')).not.toBe('medical_safety');
    });
    it('"My shoulder doesn\'t hurt" -> not medical_safety', () => {
      expect(classifyIntent('My shoulder doesn\'t hurt')).not.toBe('medical_safety');
    });
    it('"I had shoulder pain last week but it is gone now" -> not medical_safety (historical, resolved)', () => {
      expect(classifyIntent('I had shoulder pain last week but it is gone now')).not.toBe('medical_safety');
    });
  });

  describe('paraphrase coverage', () => {
    it('"I\'m not currently injured" -> not medical_safety', () => {
      expect(classifyIntent('I\'m not currently injured')).not.toBe('medical_safety');
    });
    it('"I don\'t have any pain right now" -> not medical_safety', () => {
      expect(classifyIntent('I don\'t have any pain right now')).not.toBe('medical_safety');
    });
    it('"I\'m pain-free these days" -> not medical_safety', () => {
      expect(classifyIntent('I\'m pain-free these days')).not.toBe('medical_safety');
    });
    it('"I used to have knee pain but it\'s fine now" -> not medical_safety', () => {
      expect(classifyIntent('I used to have knee pain but it\'s fine now')).not.toBe('medical_safety');
    });
    it('"I experienced some soreness last week but that\'s no longer an issue" -> not medical_safety', () => {
      expect(classifyIntent('I experienced some soreness last week but that\'s no longer an issue')).not.toBe('medical_safety');
    });
  });

  describe('current acute pain still takes precedence (mixed messages)', () => {
    it('"no knee pain but sharp shoulder pain" -> medical_safety (affirmed remainder wins)', () => {
      expect(classifyIntent('no knee pain but sharp shoulder pain')).toBe('medical_safety');
    });
    it('"Build me a 4-day workout plan, my shoulder hurts a lot" -> medical_safety (safety beats plan generation)', () => {
      expect(classifyIntent('Build me a 4-day workout plan, my shoulder hurts a lot')).toBe('medical_safety');
    });
  });

  describe('the actual fix: a negated mention no longer blocks the real request behind it', () => {
    it('"Build me a 4-day workout plan, no injuries" -> workout_program_generate, not medical_safety', () => {
      expect(classifyIntent('Build me a 4-day workout plan, no injuries')).toBe('workout_program_generate');
    });
    it('"Intermediate, full gym, no injuries." -> not medical_safety (the exact live-observed false trigger)', () => {
      expect(classifyIntent('Intermediate, full gym, no injuries.')).not.toBe('medical_safety');
    });
  });
});

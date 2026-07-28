import { describe, it, expect } from 'vitest';
import { resolveExerciseAlias, normalizeExerciseInput } from '../supabase/functions/_shared/ai/exerciseResolver.ts';
import { ungroundedNumbers } from '../supabase/functions/_shared/ai/coachSchema.ts';

describe('Phase 3 — canonical exercise resolver', () => {
  const cases: [string, string][] = [
    ['incline smith', 'incline smith machine press'],
    ['smith incline', 'incline smith machine press'],
    ['smith press', 'smith machine press'],
    ['incline machine press', 'incline machine press'],
    ['cable fly', 'cable fly'],
    ['high to low fly', 'high to low cable fly'],
    ['high-to-low fly', 'high to low cable fly'],
    ['lat pulldown', 'lat pulldown'],
    ['close grip pulldown', 'close grip lat pulldown'],
    ['db row', 'dumbbell row'],
    ['dumbbell row', 'dumbbell row'],
    ['shoulder press', 'shoulder press'],
    ['machine shoulder press', 'machine shoulder press'],
  ];
  cases.forEach(([alias, canonical]) => {
    it(`resolves "${alias}" → "${canonical}"`, () => {
      expect(resolveExerciseAlias(alias)).toBe(canonical);
    });
  });

  it('resolves the longest contained alias ("smith incline press today")', () => {
    expect(resolveExerciseAlias('smith incline press today')).toBe('incline smith machine press');
  });

  it('normalizes punctuation/case/whitespace and falls back to the input', () => {
    expect(normalizeExerciseInput('  High-To-Low  FLY!! ')).toBe('high-to-low fly');
    expect(resolveExerciseAlias('some brand-new lift')).toBe('some brand-new lift');
  });
});

describe('Phase 7 — hallucination guard (supporting_data grounding)', () => {
  const grounded = JSON.stringify({ current_weight_kg: 100, last_result: [8, 7, 6] }) + '\nTARGET: 3 x 6-8';

  it('passes when every cited number appears in the grounded source', () => {
    expect(ungroundedNumbers({ weight: 100, reps: [8, 7, 6] }, grounded)).toEqual([]);
  });

  it('flags a number that is not in the grounded source (fabricated)', () => {
    expect(ungroundedNumbers({ weight: 142.5 }, grounded)).toContain('142.5');
  });

  it('treats null/absent supporting_data as clean', () => {
    expect(ungroundedNumbers(null, grounded)).toEqual([]);
    expect(ungroundedNumbers(undefined, grounded)).toEqual([]);
  });
});

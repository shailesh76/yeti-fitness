import { describe, it, expect } from 'vitest';
import { resolveExerciseNamesAgainstCatalog, normalizeExerciseName, ExerciseCatalogEntry } from '../packages/database/src/repositories/ExerciseRepository';

/** Builds a synthetic catalog of `count` entries, e0..e(count-1), so tests can
 * prove resolution isn't limited to some arbitrary page size (the P0 bug
 * this replaces queried only the first 200 rows). */
function bigCatalog(count: number): ExerciseCatalogEntry[] {
  return Array.from({ length: count }, (_, i) => ({ id: `ex-${i}`, name: `Exercise ${i}` }));
}

describe('normalizeExerciseName', () => {
  it('lowercases and collapses/trims whitespace', () => {
    expect(normalizeExerciseName('  Barbell   Bench  Press  ')).toBe('barbell bench press');
  });

  it('handles empty/undefined input without throwing', () => {
    expect(normalizeExerciseName('')).toBe('');
    expect(normalizeExerciseName(undefined as any)).toBe('');
  });
});

describe('resolveExerciseNamesAgainstCatalog — exact and normalized matches', () => {
  const catalog: ExerciseCatalogEntry[] = [
    { id: 'ex-1', name: 'Barbell Bench Press' },
    { id: 'ex-2', name: 'Incline Dumbbell Press' },
    { id: 'ex-3', name: 'Barbell Row' },
  ];

  it('resolves an exact name match', () => {
    const { resolved, unresolved } = resolveExerciseNamesAgainstCatalog(['Barbell Bench Press'], catalog);
    expect(unresolved).toEqual([]);
    expect(resolved.get('barbell bench press')).toBe('ex-1');
  });

  it('resolves case- and whitespace-insensitively', () => {
    const { resolved, unresolved } = resolveExerciseNamesAgainstCatalog(['  barbell BENCH   press '], catalog);
    expect(unresolved).toEqual([]);
    expect(resolved.get('barbell bench press')).toBe('ex-1');
  });

  it('resolves multiple names in one call, each to the correct id', () => {
    const { resolved, unresolved } = resolveExerciseNamesAgainstCatalog(
      ['Barbell Row', 'Incline Dumbbell Press'],
      catalog,
    );
    expect(unresolved).toEqual([]);
    expect(resolved.get('barbell row')).toBe('ex-3');
    expect(resolved.get('incline dumbbell press')).toBe('ex-2');
  });
});

describe('resolveExerciseNamesAgainstCatalog — full catalog, not just the first 200', () => {
  it('resolves an exercise sitting well past row 200 of a large catalog', () => {
    const catalog = bigCatalog(500);
    // Row 350 — nowhere near a 200-row page limit.
    const { resolved, unresolved } = resolveExerciseNamesAgainstCatalog(['Exercise 350'], catalog);
    expect(unresolved).toEqual([]);
    expect(resolved.get('exercise 350')).toBe('ex-350');
  });

  it('resolves an exercise at the very end of a 2,491-entry catalog (the real live catalog size)', () => {
    const catalog = bigCatalog(2491);
    const { resolved, unresolved } = resolveExerciseNamesAgainstCatalog(['Exercise 2490'], catalog);
    expect(unresolved).toEqual([]);
    expect(resolved.get('exercise 2490')).toBe('ex-2490');
  });
});

describe('resolveExerciseNamesAgainstCatalog — aliases', () => {
  const catalog: ExerciseCatalogEntry[] = [
    { id: 'ex-1', name: 'Barbell Bench Press', aliases: ['Bench Press', 'BB Bench'] },
  ];

  it('resolves via a known alias when the canonical name does not match', () => {
    const { resolved, unresolved } = resolveExerciseNamesAgainstCatalog(['Bench Press'], catalog);
    expect(unresolved).toEqual([]);
    expect(resolved.get('bench press')).toBe('ex-1');
  });

  it('resolves via a second alias on the same exercise', () => {
    const { resolved, unresolved } = resolveExerciseNamesAgainstCatalog(['BB Bench'], catalog);
    expect(unresolved).toEqual([]);
    expect(resolved.get('bb bench')).toBe('ex-1');
  });
});

describe('resolveExerciseNamesAgainstCatalog — unresolved names, never a wrong-exercise fallback', () => {
  const catalog: ExerciseCatalogEntry[] = [
    { id: 'ex-1', name: 'Barbell Bench Press' },
    { id: 'ex-2', name: 'Squat' },
  ];

  it('reports a genuinely unknown name as unresolved, not resolved to catalog[0] or anything else', () => {
    const { resolved, unresolved } = resolveExerciseNamesAgainstCatalog(['Zercher Carry'], catalog);
    expect(unresolved).toEqual(['Zercher Carry']);
    // The specific regression this guards: an unresolved name must never
    // silently map to the first catalog entry (or any entry at all).
    expect([...resolved.values()]).not.toContain('ex-1');
    expect(resolved.size).toBe(0);
  });

  it('reports every unresolved name when several are unknown, alongside any that DO resolve', () => {
    const { resolved, unresolved } = resolveExerciseNamesAgainstCatalog(
      ['Barbell Bench Press', 'Not A Real Exercise', 'Also Not Real'],
      catalog,
    );
    expect(resolved.get('barbell bench press')).toBe('ex-1');
    expect(unresolved).toEqual(['Not A Real Exercise', 'Also Not Real']);
  });

  it('an empty catalog leaves every requested name unresolved', () => {
    const { resolved, unresolved } = resolveExerciseNamesAgainstCatalog(['Squat'], []);
    expect(resolved.size).toBe(0);
    expect(unresolved).toEqual(['Squat']);
  });

  it('an empty requested-names list resolves nothing and reports nothing unresolved', () => {
    const { resolved, unresolved } = resolveExerciseNamesAgainstCatalog([], catalog);
    expect(resolved.size).toBe(0);
    expect(unresolved).toEqual([]);
  });
});

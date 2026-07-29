import { describe, it, expect } from 'vitest';
import { decideProgression, estimateOneRepMax } from '../supabase/functions/_shared/ai/coachEngine.ts';

// Multi-signal progression: PR history, session-history deload/plateau/volume
// trend, and adherence. All additive to the existing rep-based engine — see
// tests/ai-coach-eval.test.ts for the untouched original 34 cases (still green).

const baseSquat = (overrides: Partial<Parameters<typeof decideProgression>[0]> = {}) =>
  decideProgression({
    exercise: 'Back Squat', currentWeightKg: 100, targetRepsLow: 6, targetRepsHigh: 8,
    targetSets: 3, lastSetReps: [8, 8, 8], isUpperBody: false, ...overrides,
  });

describe('estimateOneRepMax (Epley formula)', () => {
  it('computes weight x (1 + reps/30)', () => {
    expect(estimateOneRepMax(100, 8)).toBe(126.67); // 100 * (1 + 8/30) = 126.666...
    expect(estimateOneRepMax(60, 10)).toBe(80);      // 60 * (1 + 10/30) = 80
  });
  it('returns 0 for invalid input rather than NaN/guessing', () => {
    expect(estimateOneRepMax(0, 8)).toBe(0);
    expect(estimateOneRepMax(100, 0)).toBe(0);
    expect(estimateOneRepMax(-5, 8)).toBe(0);
    expect(estimateOneRepMax(NaN, 8)).toBe(0);
  });
});

describe('Adherence gate', () => {
  it('overrides an otherwise-earned increase when adherence is low', () => {
    const r = baseSquat({ adherencePct: 30 });
    expect(r.decision).toBe('keep_weight');
    expect(r.reason_code).toBe('low_adherence_build_consistency');
    expect(r.adherence_pct).toBe(30);
  });
  it('does not affect the decision when adherence is healthy', () => {
    const r = baseSquat({ adherencePct: 90 });
    expect(r.decision).toBe('increase_weight');
    expect(r.adherence_pct).toBe(90);
  });
  it('is inert when not supplied (backward compatible)', () => {
    const r = baseSquat();
    expect(r.decision).toBe('increase_weight');
    expect(r.adherence_pct).toBeNull();
  });
});

describe('Session-history deload (real measured drop)', () => {
  it('recommends a deload on a genuine >10% 1RM drop, even with a good current session', () => {
    // current session looks great (would otherwise increase), but the engine
    // must not ignore a real, recent, measured performance collapse.
    const r = baseSquat({
      sessionHistory: [
        { daysAgo: 0, estimated1rm: 100, volumeKg: 2400 },   // latest — dropped hard
        { daysAgo: 4, estimated1rm: 120, volumeKg: 2880 },   // previous
      ],
    });
    expect(r.decision).toBe('deload');
    expect(r.reason_code).toBe('performance_drop_recent');
  });

  it('does not trigger on a normal, small week-to-week fluctuation', () => {
    const r = baseSquat({
      sessionHistory: [
        { daysAgo: 0, estimated1rm: 118, volumeKg: 2800 },
        { daysAgo: 4, estimated1rm: 120, volumeKg: 2880 },
      ],
    });
    expect(r.decision).toBe('increase_weight'); // normal rep-based path proceeds
  });

  it('history-based deload takes priority over a normal increase', () => {
    const withDrop = baseSquat({ sessionHistory: [{ daysAgo: 0, estimated1rm: 90, volumeKg: 2000 }, { daysAgo: 3, estimated1rm: 120, volumeKg: 2800 }] });
    expect(withDrop.decision).toBe('deload');
  });
});

describe('Plateau detection (informational only — never overrides the decision)', () => {
  it('flags a genuine 3+ week plateau with real evidence', () => {
    const r = baseSquat({
      sessionHistory: [
        { daysAgo: 0, estimated1rm: 121, volumeKg: 2400 },   // newest
        { daysAgo: 10, estimated1rm: 120, volumeKg: 2350 },
        { daysAgo: 25, estimated1rm: 120, volumeKg: 2380 },  // oldest — 25 days ago, >=21
      ],
    });
    expect(r.plateau_detected).toBe(true);
    expect(['volume', 'strength']).toContain(r.plateau_type);
    // Still driven by THIS session's real reps — decision unchanged by the flag.
    expect(r.decision).toBe('increase_weight');
  });

  it('does not flag a plateau when the span is under 3 weeks', () => {
    const r = baseSquat({
      sessionHistory: [
        { daysAgo: 0, estimated1rm: 121, volumeKg: 2400 },
        { daysAgo: 10, estimated1rm: 120, volumeKg: 2380 }, // span only 10 days
      ],
    });
    expect(r.plateau_detected).toBe(false);
  });

  it('does not flag a plateau when 1RM has genuinely progressed', () => {
    const r = baseSquat({
      sessionHistory: [
        { daysAgo: 0, estimated1rm: 130, volumeKg: 2400 },
        { daysAgo: 25, estimated1rm: 110, volumeKg: 2200 },
      ],
    });
    expect(r.plateau_detected).toBe(false);
  });
});

describe('Weekly volume trend (informational)', () => {
  it('reports increasing / decreasing / stable relative to the prior session', () => {
    expect(baseSquat({ sessionHistory: [{ daysAgo: 0, estimated1rm: 121, volumeKg: 3000 }, { daysAgo: 4, estimated1rm: 120, volumeKg: 2000 }] }).weekly_volume_trend).toBe('increasing');
    expect(baseSquat({ sessionHistory: [{ daysAgo: 0, estimated1rm: 121, volumeKg: 1000 }, { daysAgo: 4, estimated1rm: 120, volumeKg: 2000 }] }).weekly_volume_trend).toBe('decreasing');
    expect(baseSquat({ sessionHistory: [{ daysAgo: 0, estimated1rm: 121, volumeKg: 2020 }, { daysAgo: 4, estimated1rm: 120, volumeKg: 2000 }] }).weekly_volume_trend).toBe('stable');
  });
});

describe('Personal-record awareness', () => {
  it('flags a new PR when the recommended weight exceeds the recorded best', () => {
    const r = baseSquat({ personalRecordKg: 102.5 }); // recommends 105 → new PR
    expect(r.decision).toBe('increase_weight');
    expect(r.new_pr).toBe(true);
  });
  it('does not flag a new PR when the recommendation stays under the record', () => {
    const r = baseSquat({ personalRecordKg: 200 });
    expect(r.new_pr).toBe(false);
  });
  it('is undefined when no PR data is supplied (never fabricated)', () => {
    expect(baseSquat().new_pr).toBeUndefined();
  });
  it('is never set on a non-increase decision', () => {
    const r = baseSquat({ lastSetReps: [8, 7, 6], personalRecordKg: 50 });
    expect(r.decision).toBe('keep_weight');
    expect(r.new_pr).toBeUndefined();
  });
});

describe('Backward compatibility — old callers are byte-for-byte unaffected', () => {
  it('reproduces the exact original decision/weight for a plain call with no new fields', () => {
    const r = baseSquat();
    expect(r.decision).toBe('increase_weight');
    expect(r.recommended_weight_kg).toBe(105);
    expect(r.reason_code).toBe('all_sets_reached_top_range');
    expect(r.plateau_detected).toBeUndefined();
    expect(r.weekly_volume_trend).toBeUndefined();
  });
});

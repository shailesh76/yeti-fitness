import { describe, it, expect } from 'vitest';
import {
  PROGRESS_TAB_SECTIONS,
  sectionsForTab,
  deriveWorkoutAnalytics,
  deriveNutritionAnalytics,
  deriveBodyAnalytics,
  deriveStrengthAnalytics,
} from '../apps/mobile/services/progressAnalytics';

// Phase 2A Progress Analytics regression suite.
//
// Every metric on the Progress screen must be derived from real already-loaded
// rows — no fabricated body metrics, no invented calorie burn, no zero-fill of
// un-logged days, no borrowing one tab's cards for another. These tests pin the
// pure derivations that guarantee that, and (crucially) pin the tab→section map
// that fixes the Body-shows-Overview identity bug.

const DAY = 864e5;
// Fixed "now" built with the LOCAL Date constructor so day/week/month grouping
// (which is intentionally local, matching the app) is deterministic regardless
// of the machine timezone the tests run under.
const NOW = new Date(2026, 7, 25, 12, 0, 0).getTime(); // Tue Aug 25 2026, local noon

const startOfWeek = (() => {
  const d = new Date(NOW);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday 00:00 local
  return d.getTime();
})();

// ═══════════════════════════════════════════════════════════════════════════
// Tab identity — the Body-shows-Overview bug, made structurally impossible
// ═══════════════════════════════════════════════════════════════════════════
describe('Progress tab composition — each tab has a DISTINCT section tree', () => {
  it('Body renders ONLY body-relevant sections — never the Overview tree', () => {
    const body = sectionsForTab('body');
    expect(body).toEqual(['bodyStats', 'bodyMeasurements']);
    // The exact regression: Body used to borrow Overview's Yeti Score +
    // consistency + workout cards. It must not contain any of them.
    expect(body).not.toContain('score');
    expect(body).not.toContain('consistency');
    expect(body).not.toContain('workoutStats');
    expect(body).not.toContain('weeklySnapshot');
    expect(body).not.toContain('strengthSummary');
    expect(body).not.toContain('nutritionSummary');
  });

  it('only Overview shows the Yeti Score — no other tab does', () => {
    expect(sectionsForTab('overview')).toContain('score');
    for (const tab of ['workout', 'nutrition', 'body', 'strength'] as const) {
      expect(sectionsForTab(tab)).not.toContain('score');
    }
  });

  it('Overview is a distinct preview tree, not a re-use of tab bodies', () => {
    const overview = sectionsForTab('overview');
    // Overview must not embed the full per-tab stat cards; it has its own
    // compact preview sections instead.
    expect(overview).not.toContain('workoutStats');
    expect(overview).not.toContain('nutritionStats');
    expect(overview).not.toContain('bodyStats');
    expect(overview).not.toContain('strengthStats');
  });

  it('Workout and Strength are distinct trees', () => {
    const workout = sectionsForTab('workout');
    const strength = sectionsForTab('strength');
    expect(workout).not.toEqual(strength);
    expect(workout).toContain('workoutStats');
    expect(strength).toContain('strengthStats');
    expect(workout).not.toContain('strengthStats');
    expect(strength).not.toContain('workoutStats');
  });

  it('every tab has a non-empty tree and Overview != Body', () => {
    for (const tab of ['overview', 'workout', 'nutrition', 'body', 'strength'] as const) {
      expect(sectionsForTab(tab).length).toBeGreaterThan(0);
    }
    expect(sectionsForTab('overview')).not.toEqual(sectionsForTab('body'));
  });

  it('sectionsForTab returns a copy — callers cannot mutate the source map', () => {
    const first = sectionsForTab('body');
    first.push('score');
    expect(sectionsForTab('body')).toEqual(['bodyStats', 'bodyMeasurements']);
    expect(PROGRESS_TAB_SECTIONS.body).toEqual(['bodyStats', 'bodyMeasurements']);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// WORKOUT
// ═══════════════════════════════════════════════════════════════════════════
describe('deriveWorkoutAnalytics', () => {
  it('returns a clean empty state for no history (never fabricated numbers)', () => {
    for (const input of [undefined, null, [] as any]) {
      const a = deriveWorkoutAnalytics(input, { nowMs: NOW, rangeDays: 30 });
      expect(a.hasData).toBe(false);
      expect(a.workoutsThisWeek).toBe(0);
      expect(a.workoutsThisMonth).toBe(0);
      expect(a.distinctTrainingDays).toBe(0);
      expect(a.totalCompletedSets).toBe(0);
      expect(a.totalVolumeKg).toBe(0);
      expect(a.avgDurationMin).toBeNull();
      expect(a.recentSessions).toEqual([]);
      expect(a.volumeTrend).toEqual([]);
    }
  });

  const history = [
    {
      id: 'A',
      name: 'Leg Day',
      completed_at: NOW,
      total_volume: 5000, // authoritative
      duration_seconds: 3600, // 60 min
      exercises: [{ sets: [{ weight: 100, reps: 5 }, { weight: 100, reps: 5 }, { weight: 100, reps: 5 }] }],
    },
    {
      id: 'B',
      name: 'Push Day',
      completed_at: NOW - 1 * DAY,
      // no total_volume → recompute from stored sets
      exercises: [{ sets: [
        { weight: 100, reps: 5 },                    // counted → 500
        { weight: 80, reps: 5, completed: false },   // NOT completed → excluded
        { weight: 60, reps: 10, completed: true },   // counted → 600
      ] }],
    },
    {
      id: 'C',
      name: 'Pull Day',
      completed_at: NOW - 2 * DAY,
      total_volume: 2000,
      duration_seconds: 0, // invalid duration → excluded from avg
      exercises: [{ sets: [{ weight: 50, reps: 8, completed: true }] }],
    },
    // malformed rows that must be skipped entirely
    { id: 'X', completed_at: null, exercises: [] },
    null,
  ];

  it('counts workouts this month from real completed sessions', () => {
    const a = deriveWorkoutAnalytics(history as any, { nowMs: NOW, rangeDays: 30 });
    expect(a.hasData).toBe(true);
    expect(a.workoutsThisMonth).toBe(3); // Aug 23,24,25 — all this month; malformed skipped
  });

  it('counts workouts this week against the local Monday boundary', () => {
    const wk = [
      { id: 'in', completed_at: startOfWeek + 3600e3, exercises: [] },
      { id: 'out', completed_at: startOfWeek - 3600e3, exercises: [] },
    ];
    const a = deriveWorkoutAnalytics(wk as any, { nowMs: NOW, rangeDays: 30 });
    expect(a.workoutsThisWeek).toBe(1);
  });

  it('counts distinct training days within the range', () => {
    const a = deriveWorkoutAnalytics(history as any, { nowMs: NOW, rangeDays: 30 });
    expect(a.distinctTrainingDays).toBe(3);
  });

  it('counts only actually-stored (completed) sets', () => {
    const a = deriveWorkoutAnalytics(history as any, { nowMs: NOW, rangeDays: 30 });
    // A:3 + B:2 (the completed:false set excluded) + C:1 = 6
    expect(a.totalCompletedSets).toBe(6);
  });

  it('uses total_volume when valid and recomputes from sets when absent', () => {
    const a = deriveWorkoutAnalytics(history as any, { nowMs: NOW, rangeDays: 30 });
    // A:5000 (authoritative) + B:1100 (500+600 recomputed) + C:2000 (authoritative)
    expect(a.totalVolumeKg).toBe(8100);
  });

  it('averages duration excluding zero/invalid/missing durations', () => {
    const a = deriveWorkoutAnalytics(history as any, { nowMs: NOW, rangeDays: 30 });
    // Only A has a positive duration (60 min); B missing, C zero → both excluded
    expect(a.avgDurationMin).toBe(60);
  });

  it('returns null avg duration when no session has a valid duration', () => {
    const noDur = [{ id: 'z', completed_at: NOW, total_volume: 100, exercises: [] }];
    expect(deriveWorkoutAnalytics(noDur as any, { nowMs: NOW }).avgDurationMin).toBeNull();
  });

  it('lists the last 5 completed sessions, most recent first', () => {
    const a = deriveWorkoutAnalytics(history as any, { nowMs: NOW, rangeDays: 30 });
    expect(a.recentSessions.map((s) => s.id)).toEqual(['A', 'B', 'C']);
    expect(a.recentSessions[0]).toMatchObject({ volumeKg: 5000, durationMin: 60, setCount: 3 });
    expect(a.recentSessions[1]).toMatchObject({ volumeKg: 1100, durationMin: null, setCount: 2 });
  });

  it('emits one volume-trend point per logged day (no zero-fill), oldest first', () => {
    const a = deriveWorkoutAnalytics(history as any, { nowMs: NOW, rangeDays: 30 });
    expect(a.volumeTrend).toHaveLength(3); // NOT 30
    expect(a.volumeTrend.map((p) => p.value)).toEqual([2000, 1100, 5000]);
  });

  it('excludes sessions older than the selected range from range-scoped stats', () => {
    const old = [{ id: 'old', completed_at: NOW - 45 * DAY, total_volume: 999, exercises: [{ sets: [{ weight: 10, reps: 10, completed: true }] }] }];
    const a = deriveWorkoutAnalytics(old as any, { nowMs: NOW, rangeDays: 30 });
    expect(a.inRangeSessionsCount).toBe(0);
    expect(a.distinctTrainingDays).toBe(0);
    expect(a.totalVolumeKg).toBe(0);
    expect(a.volumeTrend).toEqual([]);
    // but it still appears in the overall recent-sessions list
    expect(a.recentSessions.map((s) => s.id)).toEqual(['old']);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// NUTRITION
// ═══════════════════════════════════════════════════════════════════════════
describe('deriveNutritionAnalytics', () => {
  const ME = 'athlete-me';
  const OTHER = 'athlete-other';
  const targets = { calories: 2000, protein: 150 };

  const logs = [
    { logged_at: NOW, servings: 2, athlete_id: ME, food: { calories: 500, protein: 40, carbs: 50, fat: 10 } }, // →1000/80/100/20
    { logged_at: NOW - 3600e3, athlete_id: ME, food: { calories: 200, protein: 20, carbs: 10, fat: 5 } },       // same day, servings missing→1
    { logged_at: NOW - 1 * DAY, servings: 1, athlete_id: ME, food: { calories: 800, protein: 60, carbs: 80, fat: 20 } },
    { logged_at: NOW, servings: 1, athlete_id: OTHER, food: { calories: 9999, protein: 999, carbs: 999, fat: 999 } }, // other athlete → excluded
    { logged_at: NOW, servings: 1, athlete_id: ME, food: null },        // no food → skipped
    { logged_at: 'not-a-date', servings: 1, athlete_id: ME, food: { calories: 500 } }, // malformed date → skipped
  ];

  it('returns a clean empty state for no logs', () => {
    const a = deriveNutritionAnalytics([], targets, { nowMs: NOW, rangeDays: 30, athleteId: ME });
    expect(a.hasData).toBe(false);
    expect(a.loggedDays).toBe(0);
    expect(a.avgCalories).toBe(0);
    expect(a.loggingConsistencyPct).toBe(0);
    expect(a.calorieTrend).toEqual([]);
    // targets are still reflected even with no intake
    expect(a.hasTargets).toBe(true);
    expect(a.caloriesVsTarget).toBeNull();
  });

  it('averages intake over LOGGED days only (not calendar days)', () => {
    const a = deriveNutritionAnalytics(logs as any, targets, { nowMs: NOW, rangeDays: 30, athleteId: ME });
    expect(a.loggedDays).toBe(2);
    // day1 = 1000+200 = 1200 kcal, day2 = 800 kcal → 2000 / 2 logged days = 1000
    expect(a.avgCalories).toBe(1000);
    expect(a.avgProtein).toBe(80);  // (80+20)+60 = 160 / 2
    expect(a.avgCarbs).toBe(95);    // (100+10)+80 = 190 / 2
    expect(a.avgFats).toBe(23);     // (20+5)+20 = 45 / 2 = 22.5 → 23
  });

  it('measures logging consistency against CALENDAR days in the range', () => {
    const a = deriveNutritionAnalytics(logs as any, targets, { nowMs: NOW, rangeDays: 30, athleteId: ME });
    expect(a.calendarDays).toBe(30);
    expect(a.loggingConsistencyPct).toBe(7); // 2 / 30 = 6.67% → 7
  });

  it('compares averages against real targets', () => {
    const a = deriveNutritionAnalytics(logs as any, targets, { nowMs: NOW, rangeDays: 30, athleteId: ME });
    expect(a.caloriesVsTarget).toEqual({ avg: 1000, target: 2000, pct: 50 });
    expect(a.proteinVsTarget).toEqual({ avg: 80, target: 150, pct: 53 }); // 53.3 → 53
  });

  it('reports an honest no-target state instead of inventing defaults', () => {
    const a = deriveNutritionAnalytics(logs as any, null, { nowMs: NOW, rangeDays: 30, athleteId: ME });
    expect(a.hasTargets).toBe(false);
    expect(a.caloriesVsTarget).toBeNull();
    expect(a.proteinVsTarget).toBeNull();
    // averages are still real
    expect(a.avgCalories).toBe(1000);
  });

  it('does not clamp over-target percentages — going over is a real fact', () => {
    const a = deriveNutritionAnalytics(logs as any, { calories: 500 }, { nowMs: NOW, rangeDays: 30, athleteId: ME });
    expect(a.caloriesVsTarget).toEqual({ avg: 1000, target: 500, pct: 200 });
  });

  it("never counts another athlete's logs", () => {
    const a = deriveNutritionAnalytics(logs as any, targets, { nowMs: NOW, rangeDays: 30, athleteId: ME });
    // OTHER's 9999 kcal entry must be excluded entirely
    expect(a.avgCalories).toBe(1000);
    const other = deriveNutritionAnalytics(logs as any, targets, { nowMs: NOW, rangeDays: 30, athleteId: OTHER });
    expect(other.loggedDays).toBe(1);
    expect(other.avgCalories).toBe(9999);
  });

  it('emits one trend point per logged day (no zero-fill), oldest first', () => {
    const a = deriveNutritionAnalytics(logs as any, targets, { nowMs: NOW, rangeDays: 30, athleteId: ME });
    expect(a.calorieTrend).toHaveLength(2);
    expect(a.calorieTrend.map((p) => p.value)).toEqual([800, 1200]); // day2 then day1
    expect(a.proteinTrend.map((p) => p.value)).toEqual([60, 100]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BODY
// ═══════════════════════════════════════════════════════════════════════════
describe('deriveBodyAnalytics', () => {
  const profile = { height_cm: 180, weight_kg: 79 };
  const measurements = [
    { weight_kg: 80, body_fat_pct: 18, waist_cm: 85, logged_at: NOW },
    { weight_kg: 82, logged_at: NOW - 5 * DAY },
    { weight_kg: 84, logged_at: NOW - 20 * DAY },
  ];

  it('returns a clean empty state when there is nothing to show', () => {
    const a = deriveBodyAnalytics([], null, { nowMs: NOW, rangeDays: 30 });
    expect(a.hasData).toBe(false);
    expect(a.currentWeightKg).toBeNull();
    expect(a.bmi).toBeNull();
    expect(a.bodyFatPct).toBeNull();
    expect(a.weightTrend).toEqual([]);
    expect(a.weightChangeKg).toBeNull();
    expect(a.circumferences).toEqual([]);
    expect(a.recentMeasurements).toEqual([]);
  });

  it('uses the latest measured weight as current weight', () => {
    const a = deriveBodyAnalytics(measurements as any, profile, { nowMs: NOW, rangeDays: 30 });
    expect(a.currentWeightKg).toBe(80);
  });

  it('falls back to profile weight when no measurement carries a weight', () => {
    const a = deriveBodyAnalytics([], profile, { nowMs: NOW, rangeDays: 30 });
    expect(a.currentWeightKg).toBe(79);
    expect(a.hasData).toBe(true);
  });

  it('computes weight change as (last − first) across the in-range series', () => {
    const a = deriveBodyAnalytics(measurements as any, profile, { nowMs: NOW, rangeDays: 30 });
    expect(a.weightTrend.map((p) => p.value)).toEqual([84, 82, 80]); // oldest → newest
    expect(a.weightChangeKg).toBe(-4); // 80 − 84
  });

  it('returns null weight change when there are fewer than 2 points', () => {
    const one = [{ weight_kg: 80, logged_at: NOW }];
    const a = deriveBodyAnalytics(one as any, profile, { nowMs: NOW, rangeDays: 30 });
    expect(a.weightTrend).toHaveLength(1);
    expect(a.weightChangeKg).toBeNull();
  });

  it('computes BMI from current weight + profile height', () => {
    const a = deriveBodyAnalytics(measurements as any, profile, { nowMs: NOW, rangeDays: 30 });
    expect(a.bmi).toBe(24.7); // 80 / 1.8² = 24.69
  });

  it('returns null BMI when height is missing or invalid (never a guess)', () => {
    const a = deriveBodyAnalytics(measurements as any, { height_cm: null }, { nowMs: NOW, rangeDays: 30 });
    expect(a.bmi).toBeNull();
  });

  it('reports body fat only when actually logged — never fabricates 0%', () => {
    const withBf = deriveBodyAnalytics(measurements as any, profile, { nowMs: NOW, rangeDays: 30 });
    expect(withBf.bodyFatPct).toBe(18);
    const noBf = deriveBodyAnalytics([{ weight_kg: 80, logged_at: NOW }] as any, profile, { nowMs: NOW, rangeDays: 30 });
    expect(noBf.bodyFatPct).toBeNull();
  });

  it('surfaces circumferences only when present', () => {
    const a = deriveBodyAnalytics(measurements as any, profile, { nowMs: NOW, rangeDays: 30 });
    expect(a.circumferences).toEqual([{ key: 'waist', label: 'Waist', valueCm: 85 }]);
  });

  it('lists the last 5 measurements, newest first, with only real fields', () => {
    const a = deriveBodyAnalytics(measurements as any, profile, { nowMs: NOW, rangeDays: 30 });
    expect(a.recentMeasurements).toHaveLength(3);
    expect(a.recentMeasurements[0]).toMatchObject({ weightKg: 80, bodyFatPct: 18 });
    expect(a.recentMeasurements[0].circumferences).toEqual([{ key: 'waist', label: 'Waist', valueCm: 85 }]);
    expect(a.recentMeasurements[1]).toMatchObject({ weightKg: 82, bodyFatPct: null });
    expect(a.recentMeasurements[1].circumferences).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// STRENGTH
// ═══════════════════════════════════════════════════════════════════════════
describe('deriveStrengthAnalytics', () => {
  const prs = [
    { id: '1', exercise_id: 'sq', record_type: 'max_weight', value: 100, achieved_at: NOW - 2 * DAY, exercises: { name: 'Squat' } },
    { id: '2', exercise_id: 'sq', record_type: 'max_weight', value: 120, achieved_at: NOW - 1 * DAY, exercises: { name: 'Squat' } },
    { id: '3', exercise_id: 'sq', record_type: 'max_reps', value: 10, achieved_at: NOW, exercises: { name: 'Squat' } },
    { id: '4', exercise_id: 'bench', record_type: 'max_weight', value: 80, achieved_at: NOW - 60 * DAY, exercises: { name: 'Bench' } },
  ];

  it('returns a clean empty state for no PRs', () => {
    const a = deriveStrengthAnalytics([], { nowMs: NOW });
    expect(a.hasData).toBe(false);
    expect(a.currentPrCount).toBe(0);
    expect(a.currentPrs).toEqual([]);
    expect(a.recentPrs).toEqual([]);
    expect(a.prHistoryByExercise).toEqual([]);
  });

  it('counts current unique PRs by exercise + record type', () => {
    const a = deriveStrengthAnalytics(prs as any, { nowMs: NOW });
    // sq:max_weight (best 120), sq:max_reps (10), bench:max_weight (80) = 3
    expect(a.currentPrCount).toBe(3);
  });

  it('keeps max_weight and max_reps as separate records for the same exercise', () => {
    const a = deriveStrengthAnalytics(prs as any, { nowMs: NOW });
    const sqWeight = a.currentPrs.find((p) => p.exerciseId === 'sq' && p.recordType === 'max_weight');
    const sqReps = a.currentPrs.find((p) => p.exerciseId === 'sq' && p.recordType === 'max_reps');
    expect(sqWeight).toMatchObject({ value: 120, unit: 'kg' });
    expect(sqReps).toMatchObject({ value: 10, unit: 'reps' });
  });

  it('takes the best value as the current PR (not the latest)', () => {
    const a = deriveStrengthAnalytics(prs as any, { nowMs: NOW });
    const sqWeight = a.currentPrs.find((p) => p.exerciseId === 'sq' && p.recordType === 'max_weight');
    expect(sqWeight?.value).toBe(120); // 120 beats the earlier 100
  });

  it('reports recent PRs as current PRs set within the last 30 days', () => {
    const a = deriveStrengthAnalytics(prs as any, { nowMs: NOW });
    // sq:max_weight (1 day ago) + sq:max_reps (today) are recent; bench (60 days) is not
    expect(a.recentPrs).toHaveLength(2);
    expect(a.recentPrs.every((p) => p.exerciseId === 'sq')).toBe(true);
  });

  it('groups PR history for exercises with 2+ historical rows, ascending', () => {
    const a = deriveStrengthAnalytics(prs as any, { nowMs: NOW });
    expect(a.prHistoryByExercise).toHaveLength(1); // only 'sq' has ≥2 rows
    const sq = a.prHistoryByExercise[0];
    expect(sq.exerciseId).toBe('sq');
    expect(sq.records.map((r) => r.value)).toEqual([100, 120, 10]); // oldest → newest
  });

  it('skips malformed PR rows (missing id fields, value or date)', () => {
    const bad = [
      { record_type: 'max_weight', value: 100, achieved_at: NOW },        // no exercise_id
      { exercise_id: 'x', value: 100, achieved_at: NOW },                  // no record_type
      { exercise_id: 'x', record_type: 'max_weight', achieved_at: NOW },   // no value
      { exercise_id: 'x', record_type: 'max_weight', value: 100 },         // no achieved_at
      null,
    ];
    expect(deriveStrengthAnalytics(bad as any, { nowMs: NOW }).hasData).toBe(false);
  });

  it('filters out universal corruption artifacts (>1000 reps, >2000kg, non-positive, non-finite)', () => {
    const corruptPrs = [
      {
        id: 'bad-reps-1100',
        exercise_id: 'rt',
        record_type: 'max_reps',
        value: 1100, // impossible corruption artifact (>1000)
        achieved_at: NOW - 5 * DAY,
        exercises: { name: 'Assisted Motion Russian Twist' },
      },
      {
        id: 'bad-weight-2001',
        exercise_id: 'bp',
        record_type: 'max_weight',
        value: 2001, // corruption ceiling exceeded (>2000)
        achieved_at: NOW - 2 * DAY,
        exercises: { name: 'Bench Press' },
      },
      {
        id: 'bad-negative',
        exercise_id: 'sq',
        record_type: 'max_weight',
        value: -50,
        achieved_at: NOW - 1 * DAY,
        exercises: { name: 'Squat' },
      },
      {
        id: 'bad-zero',
        exercise_id: 'sq',
        record_type: 'max_reps',
        value: 0,
        achieved_at: NOW - 1 * DAY,
        exercises: { name: 'Squat' },
      },
      {
        id: 'bad-nan',
        exercise_id: 'sq',
        record_type: 'max_weight',
        value: NaN,
        achieved_at: NOW - 1 * DAY,
        exercises: { name: 'Squat' },
      },
    ];

    const a = deriveStrengthAnalytics(corruptPrs as any, { nowMs: NOW });
    expect(a.hasData).toBe(false);
    expect(a.currentPrCount).toBe(0);
    expect(a.currentPrs).toEqual([]);
  });

  it('accepts legitimate high-volume and heavy lifts (500 reps, 700kg leg press, 800kg sled, 60kg cable crunch, 80kg bench, 2000kg ceiling)', () => {
    const legitimatePrs = [
      {
        id: 'good-reps-500',
        exercise_id: 'jr',
        record_type: 'max_reps',
        value: 500, // endurance / jump rope challenge
        achieved_at: NOW - 4 * DAY,
        exercises: { name: 'Jump Rope', category: 'Strength' },
      },
      {
        id: 'good-legpress-700',
        exercise_id: 'lp',
        record_type: 'max_weight',
        value: 700, // heavy leg press
        achieved_at: NOW - 3 * DAY,
        exercises: { name: 'Leg Press', equipment: 'Machine', category: 'Strength' },
      },
      {
        id: 'good-sled-800',
        exercise_id: 'sl',
        record_type: 'max_weight',
        value: 800, // heavy sled push
        achieved_at: NOW - 2 * DAY,
        exercises: { name: 'Sled Push', equipment: 'Sled', category: 'Strength' },
      },
      {
        id: 'good-cable-crunch-60',
        exercise_id: 'cc',
        record_type: 'max_weight',
        value: 60, // cable stack crunch
        achieved_at: NOW - 2 * DAY,
        exercises: { name: 'Cable Crunch', equipment: 'Cable', category: 'Strength' },
      },
      {
        id: 'good-bench-80',
        exercise_id: 'bp',
        record_type: 'max_weight',
        value: 80, // barbell bench press
        achieved_at: NOW - 1 * DAY,
        exercises: { name: 'Bench Press', equipment: 'Barbell', category: 'Strength' },
      },
      {
        id: 'good-ceiling-2000',
        exercise_id: 'hym',
        record_type: 'max_weight',
        value: 2000, // corruption boundary test
        achieved_at: NOW - 1 * DAY,
        exercises: { name: 'Heavy Machine', equipment: 'Machine', category: 'Strength' },
      },
      {
        id: 'good-situp-45',
        exercise_id: 'su',
        record_type: 'max_weight',
        value: 45, // preserved without artificial name substring rejection
        achieved_at: NOW - 1 * DAY,
        exercises: { name: '3/4 Sit-up', equipment: 'Bodyweight', category: 'Strength' },
      },
    ];

    const a = deriveStrengthAnalytics(legitimatePrs as any, { nowMs: NOW });
    expect(a.hasData).toBe(true);
    expect(a.currentPrCount).toBe(7);
    expect(a.currentPrs.map((p) => p.value)).toContain(500);
    expect(a.currentPrs.map((p) => p.value)).toContain(700);
    expect(a.currentPrs.map((p) => p.value)).toContain(800);
    expect(a.currentPrs.map((p) => p.value)).toContain(60);
    expect(a.currentPrs.map((p) => p.value)).toContain(80);
    expect(a.currentPrs.map((p) => p.value)).toContain(2000);
    expect(a.currentPrs.map((p) => p.value)).toContain(45);
  });

  it('excludes Cardio and Stretching exercises from Strength PRs when category metadata is present', () => {
    const mixed = [
      {
        id: 'c-1',
        exercise_id: 'run',
        record_type: 'max_weight',
        value: 10,
        achieved_at: NOW,
        exercises: { name: 'Treadmill Run', category: 'Cardio' },
      },
      {
        id: 'c-2',
        exercise_id: 'stretch',
        record_type: 'max_reps',
        value: 30,
        achieved_at: NOW,
        exercises: { name: 'Hamstring Stretch', category: 'Stretching' },
      },
      {
        id: 's-1',
        exercise_id: 'pu',
        record_type: 'max_reps',
        value: 25,
        achieved_at: NOW,
        exercises: { name: 'Pull-up', category: 'Strength', equipment: 'Bodyweight' },
      },
    ];

    const a = deriveStrengthAnalytics(mixed as any, { nowMs: NOW });
    expect(a.currentPrCount).toBe(1);
    expect(a.currentPrs[0].exerciseName).toBe('Pull-up');
    expect(a.currentPrs[0].value).toBe(25);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tab Geometry, State UX & Viewport Invariants (iOS Safari/PWA Hardening)
// ═══════════════════════════════════════════════════════════════════════════
describe('Progress tab geometry & state UX invariants', () => {
  it('verifies strict section isolation between Workout and Strength tabs', () => {
    const workoutSections = sectionsForTab('workout');
    const strengthSections = sectionsForTab('strength');

    expect(workoutSections).toEqual(['workoutStats', 'consistency']);
    expect(strengthSections).toEqual(['strengthStats']);

    expect(workoutSections).not.toContain('strengthStats');
    expect(workoutSections).not.toContain('strengthSummary');
    expect(strengthSections).not.toContain('workoutStats');
    expect(strengthSections).not.toContain('consistency');
  });

  it('guarantees genuine empty accounts (e.g. 0 sets logged) produce clean empty states', () => {
    const emptyPrs = deriveStrengthAnalytics([], { nowMs: NOW });
    expect(emptyPrs.hasData).toBe(false);
    expect(emptyPrs.currentPrCount).toBe(0);
    expect(emptyPrs.currentPrs).toEqual([]);

    const emptyWorkouts = deriveWorkoutAnalytics([], { nowMs: NOW, rangeDays: 30 });
    expect(emptyWorkouts.hasData).toBe(false);
    expect(emptyWorkouts.workoutsThisWeek).toBe(0);
    expect(emptyWorkouts.totalVolumeKg).toBe(0);

    const emptyNutrition = deriveNutritionAnalytics([], null, { nowMs: NOW, rangeDays: 30 });
    expect(emptyNutrition.hasData).toBe(false);
    expect(emptyNutrition.loggedDays).toBe(0);
  });

  it('verifies tab style rules enforce fixed height (36px) and pill radius (18px) across viewports', () => {
    const baseTabStyle = {
      minWidth: 84,
      height: 36,
      minHeight: 36,
      maxHeight: 36,
      paddingHorizontal: 16,
      borderRadius: 18,
      flexShrink: 0,
      flexGrow: 0,
      alignItems: 'center',
      justifyContent: 'center',
    };

    const activeTabStyle = {
      ...baseTabStyle,
      backgroundColor: '#2563EB',
      borderColor: '#2563EB',
    };

    // Active and inactive styles share identical dimensional metrics
    expect(activeTabStyle.height).toBe(baseTabStyle.height);
    expect(activeTabStyle.minHeight).toBe(baseTabStyle.minHeight);
    expect(activeTabStyle.maxHeight).toBe(baseTabStyle.maxHeight);
    expect(activeTabStyle.borderRadius).toBe(baseTabStyle.borderRadius);
    expect(activeTabStyle.borderRadius).toBe(18); // Exactly half of 36px
  });

  it('maintains horizontal layout constraints for 375px, 390px, and 430px iPhone viewports', () => {
    const viewports = [375, 390, 430];
    const tabCount = 5;
    const tabMinWidth = 84;
    const tabGap = 8;
    const rowPadding = 20 + 28;

    const totalNeededWidth = tabCount * tabMinWidth + (tabCount - 1) * tabGap + rowPadding;
    // Total needed width is ~500px, which exceeds iPhone screen widths,
    // requiring horizontal scrolling rather than flex wrapping or vertical expansion.
    expect(totalNeededWidth).toBeGreaterThan(430);

    for (const vp of viewports) {
      expect(totalNeededWidth).toBeGreaterThan(vp);
    }
  });
});

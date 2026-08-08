import { describe, it, expect } from 'vitest';
import {
  ZERO_MACROS,
  resolveConsumedMacros,
  sumMealLogsForDay,
  pickRicherMacros,
  planMuscleSummary,
  planExerciseCount,
  planSetCount,
  buildTodaysPlan,
  describeReadiness,
} from '../apps/mobile/services/homeSummary';

// Regression suite for the Home screen shipping seeded demo data as if it were
// the athlete's own: 1,980 kcal consumed / 152g protein / "Push Day —
// Chest, Shoulders, Triceps / 75 min" / "87% Fully Ready, +7 pts this week",
// all visible on a brand-new account with nothing logged.

describe('Nutrition — a real zero day must read zero', () => {
  it('returns zeros for a genuinely empty day instead of leaving demo macros', () => {
    expect(resolveConsumedMacros({ calories: 0, protein: 0, carbs: 0, fat: 0 })).toEqual(ZERO_MACROS);
  });

  it('returns zeros (never a placeholder) when the source is null/undefined', () => {
    expect(resolveConsumedMacros(null)).toEqual(ZERO_MACROS);
    expect(resolveConsumedMacros(undefined)).toEqual(ZERO_MACROS);
  });

  it('passes real logged values through untouched', () => {
    expect(resolveConsumedMacros({ calories: 1432, protein: 98, carbs: 150, fat: 41 })).toEqual({
      calories: 1432, protein: 98, carbs: 150, fat: 41,
    });
  });

  it('never emits the old seeded values for an empty account', () => {
    const result = resolveConsumedMacros({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    expect(result.calories).not.toBe(1980);
    expect(result.protein).not.toBe(152);
    expect(result.carbs).not.toBe(205);
    expect(result.fat).not.toBe(62);
  });

  it('coerces malformed/negative/NaN values to zero rather than rendering them', () => {
    expect(resolveConsumedMacros({ calories: NaN, protein: -5, carbs: undefined, fat: 12 })).toEqual({
      calories: 0, protein: 0, carbs: 0, fat: 12,
    });
  });
});

describe('Nutrition — summing the web (AsyncStorage) meal logs', () => {
  const noon = new Date('2026-08-08T12:00:00').getTime();
  const alsoToday = new Date('2026-08-08T19:30:00').getTime();
  const yesterday = new Date('2026-08-07T12:00:00').getTime();
  const A = 'athlete-a';
  const B = 'athlete-b';

  it('sums only logs from the requested day', () => {
    const logs = [
      { logged_at: noon, servings: 1, athlete_id: A, food: { calories: 500, protein: 40, carbs: 50, fat: 10 } },
      { logged_at: alsoToday, servings: 1, athlete_id: A, food: { calories: 300, protein: 20, carbs: 30, fat: 5 } },
      { logged_at: yesterday, servings: 1, athlete_id: A, food: { calories: 900, protein: 90, carbs: 90, fat: 30 } },
    ];
    expect(sumMealLogsForDay(logs, noon, A)).toEqual({ calories: 800, protein: 60, carbs: 80, fat: 15 });
  });

  it('multiplies by servings', () => {
    const logs = [{ logged_at: noon, servings: 2.5, athlete_id: A, food: { calories: 200, protein: 10, carbs: 20, fat: 4 } }];
    expect(sumMealLogsForDay(logs, noon, A)).toEqual({ calories: 500, protein: 25, carbs: 50, fat: 10 });
  });

  it('treats a missing servings count as exactly one', () => {
    const logs = [{ logged_at: noon, athlete_id: A, food: { calories: 200, protein: 10, carbs: 20, fat: 4 } }];
    expect(sumMealLogsForDay(logs, noon, A)).toEqual({ calories: 200, protein: 10, carbs: 20, fat: 4 });
  });

  it('returns zeros for no logs at all', () => {
    expect(sumMealLogsForDay([], noon, A)).toEqual(ZERO_MACROS);
    expect(sumMealLogsForDay(null, noon, A)).toEqual(ZERO_MACROS);
  });

  it('skips logs with no resolved food rather than counting them as zero-calorie entries', () => {
    const logs = [
      { logged_at: noon, servings: 1, athlete_id: A, food: null },
      { logged_at: noon, servings: 1, athlete_id: A, food: { calories: 100, protein: 5, carbs: 10, fat: 2 } },
    ];
    expect(sumMealLogsForDay(logs, noon, A)).toEqual({ calories: 100, protein: 5, carbs: 10, fat: 2 });
  });

  // Cross-account isolation. useFoodStore is a single global zustand store
  // persisted under one AsyncStorage key and is NOT cleared on sign-out, so
  // account B can be handed account A's still-resident logs.
  it("never counts another athlete's meals", () => {
    const logs = [
      { logged_at: noon, servings: 1, athlete_id: A, food: { calories: 700, protein: 50, carbs: 60, fat: 20 } },
      { logged_at: noon, servings: 1, athlete_id: B, food: { calories: 250, protein: 15, carbs: 25, fat: 8 } },
    ];
    expect(sumMealLogsForDay(logs, noon, B)).toEqual({ calories: 250, protein: 15, carbs: 25, fat: 8 });
    expect(sumMealLogsForDay(logs, noon, A)).toEqual({ calories: 700, protein: 50, carbs: 60, fat: 20 });
  });

  it("shows zero for a fresh account whose store still holds the previous account's logs", () => {
    const leftoverFromA = [
      { logged_at: noon, servings: 1, athlete_id: A, food: { calories: 1980, protein: 152, carbs: 205, fat: 62 } },
    ];
    expect(sumMealLogsForDay(leftoverFromA, noon, B)).toEqual(ZERO_MACROS);
  });

  it('excludes unattributable logs rather than crediting them to the current athlete', () => {
    const logs = [
      { logged_at: noon, servings: 1, food: { calories: 400, protein: 30, carbs: 40, fat: 12 } },
      { logged_at: noon, servings: 1, athlete_id: A, food: { calories: 100, protein: 5, carbs: 10, fat: 2 } },
    ];
    expect(sumMealLogsForDay(logs, noon, A)).toEqual({ calories: 100, protein: 5, carbs: 10, fat: 2 });
  });

  it('returns zeros when there is no signed-in athlete id', () => {
    const logs = [{ logged_at: noon, servings: 1, athlete_id: A, food: { calories: 500, protein: 40, carbs: 50, fat: 10 } }];
    expect(sumMealLogsForDay(logs, noon, '')).toEqual(ZERO_MACROS);
  });

  // Regression: useFoodStore.mealLogs is only hydrated from AsyncStorage by
  // food-diary's initSync() — nothing loads it on app boot. Landing on Home
  // directly (never having opened Food Diary this session) left the array
  // empty in memory even though real logs existed on disk, so a real logged
  // day silently rendered as zero — the same failure mode as the mock-data
  // seed, just from a different cause. home.tsx now calls
  // useFoodStore.getState().loadLocalCache() before reading mealLogs; this
  // documents the exact shape that fix depends on: sumMealLogsForDay itself
  // has no way to distinguish "genuinely nothing logged" from "not hydrated
  // yet" — an empty array must be treated as zero either way, which is why
  // the hydration has to happen upstream, not here.
  it('an unhydrated (empty) log array reads as zero, not as an error', () => {
    expect(sumMealLogsForDay([], noon, A)).toEqual(ZERO_MACROS);
  });

  it('picks whichever source actually has logs (web: local DB is empty, store is not)', () => {
    const fromLocalDb = { ...ZERO_MACROS };
    const fromStore = { calories: 800, protein: 60, carbs: 80, fat: 15 };
    expect(pickRicherMacros(fromLocalDb, fromStore)).toEqual(fromStore);
    expect(pickRicherMacros(fromStore, fromLocalDb)).toEqual(fromStore);
  });

  it('stays at zero when BOTH sources are empty — the real empty-account case', () => {
    expect(pickRicherMacros({ ...ZERO_MACROS }, { ...ZERO_MACROS })).toEqual(ZERO_MACROS);
  });
});

describe("Today's Plan — real metadata or an honest empty state", () => {
  const plan = {
    id: 'plan-1',
    name: 'Upper/Lower Program',
    days: [
      {
        exercises: [
          { sets: '4', exercise: { muscle_group: 'Chest' } },
          { sets: '4', exercise: { muscle_group: 'Back' } },
          { sets: 3, exercise: { muscle_group: 'Shoulders' } },
          { sets: 3, exercise: { muscle_group: 'Chest' } },
        ],
      },
    ],
  };

  it('returns null when there is no session and no plan — no "Push Day" fallback', () => {
    expect(buildTodaysPlan({ activeSession: null, plans: [] })).toBeNull();
    expect(buildTodaysPlan({ activeSession: null, plans: null })).toBeNull();
    expect(buildTodaysPlan({})).toBeNull();
  });

  it('uses the real plan name, never a hardcoded one', () => {
    const result = buildTodaysPlan({ plans: [plan] });
    expect(result?.name).toBe('Upper/Lower Program');
    expect(result?.name).not.toBe('Push Day');
    expect(result?.kind).toBe('template');
  });

  it('derives muscle groups from the plan\'s own exercises, not "Chest, Shoulders, Triceps"', () => {
    const result = buildTodaysPlan({ plans: [plan] });
    expect(result?.muscleSummary).toBe('Chest · Back · Shoulders');
    expect(result?.muscleSummary).not.toContain('Triceps');
  });

  it('counts real exercises and real sets (replacing the hardcoded "6 Exercises / 75 min")', () => {
    const result = buildTodaysPlan({ plans: [plan] });
    expect(result?.exerciseCount).toBe(4);
    expect(result?.setCount).toBe(14);
  });

  it('prefers an in-progress session over a saved template', () => {
    const result = buildTodaysPlan({
      activeSession: { id: 'sess-9', name: 'Upper/Lower Program' },
      plans: [plan],
    });
    expect(result?.kind).toBe('session');
    expect(result?.sessionId).toBe('sess-9');
    expect(result?.name).toBe('Upper/Lower Program');
  });

  it('falls back to an honest generic label (never a fake plan) for an unnamed session', () => {
    const result = buildTodaysPlan({ activeSession: { id: 'sess-9', name: '' }, plans: [] });
    expect(result?.name).toBe('Workout in progress');
    expect(result?.name).not.toBe('Push Day');
  });

  it('emits an empty muscle summary rather than inventing one when rows carry no muscle data', () => {
    const bare = { name: 'Custom Plan', days: [{ exercises: [{ sets: '3', exercise: {} }] }] };
    const result = buildTodaysPlan({ plans: [bare] });
    expect(result?.muscleSummary).toBe('');
    expect(result?.exerciseCount).toBe(1);
  });

  it('reads muscle data from primary_muscle/target_muscle when muscle_group is absent', () => {
    const alt = { name: 'P', days: [{ exercises: [{ sets: 1, exercise: { primary_muscle: 'Quads' } }] }] };
    expect(planMuscleSummary(alt)).toBe('Quads');
  });

  it('caps the muscle summary at three groups', () => {
    const many = {
      name: 'P',
      days: [{ exercises: [
        { exercise: { muscle_group: 'A' } }, { exercise: { muscle_group: 'B' } },
        { exercise: { muscle_group: 'C' } }, { exercise: { muscle_group: 'D' } },
      ] }],
    };
    expect(planMuscleSummary(many)).toBe('A · B · C');
  });

  it('counts across multiple days', () => {
    const multi = {
      name: 'P',
      days: [
        { exercises: [{ sets: 3 }, { sets: 3 }] },
        { exercises: [{ sets: '2' }] },
      ],
    };
    expect(planExerciseCount(multi)).toBe(3);
    expect(planSetCount(multi)).toBe(8);
  });

  it('handles a plan with no days/exercises without throwing', () => {
    expect(planExerciseCount({ name: 'Empty' })).toBe(0);
    expect(planSetCount({ name: 'Empty' })).toBe(0);
    expect(planMuscleSummary(null)).toBe('');
  });
});

describe('Yeti Readiness — unavailable rather than fabricated', () => {
  it('reports unavailable when there is no real score (the current production state)', () => {
    expect(describeReadiness(null)).toEqual({ available: false });
    expect(describeReadiness(undefined)).toEqual({ available: false });
    expect(describeReadiness(NaN)).toEqual({ available: false });
  });

  it('never returns the seeded 87 / +7 pts for an athlete with no data', () => {
    const state = describeReadiness(null, null);
    expect(state.available).toBe(false);
    expect(state).not.toHaveProperty('score');
    expect(state).not.toHaveProperty('delta');
  });

  it('describes a real score with the correct band', () => {
    expect(describeReadiness(92)).toMatchObject({ available: true, score: 92, label: 'Fully Ready', tone: 'ready' });
    expect(describeReadiness(70)).toMatchObject({ available: true, score: 70, label: 'Getting There', tone: 'moderate' });
    expect(describeReadiness(45)).toMatchObject({ available: true, score: 45, label: 'Recovery Needed', tone: 'recover' });
  });

  it('omits the weekly delta when there is no real previous score to compare', () => {
    expect(describeReadiness(85)).toMatchObject({ available: true, delta: null });
  });

  it('computes a real delta only from two real scores', () => {
    expect(describeReadiness(85, 78)).toMatchObject({ delta: 7 });
    expect(describeReadiness(70, 82)).toMatchObject({ delta: -12 });
  });

  it('clamps out-of-range scores instead of rendering impossible percentages', () => {
    expect(describeReadiness(140)).toMatchObject({ score: 100 });
    expect(describeReadiness(-20)).toMatchObject({ score: 0 });
  });
});

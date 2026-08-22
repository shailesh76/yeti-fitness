import { beforeEach, describe, expect, it, vi } from 'vitest';

const fixtures = vi.hoisted(() => ({
  pendingProfile: {} as { resolve?: (value: any) => void },
  calls: [] as string[],
  patchHomeSnapshot: vi.fn(),
  initializeFromProfile: vi.fn(),
}));

vi.mock('../apps/mobile/services/screenDataCache', () => ({
  hydrateScreenData: vi.fn(() => {
    fixtures.calls.push('profile-start');
    return new Promise((resolve) => { fixtures.pendingProfile.resolve = resolve; });
  }),
}));

vi.mock('../apps/mobile/services/homeSummary', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../apps/mobile/services/homeSummary')>();
  return {
    ...actual,
    hydrateHomeSnapshot: vi.fn(async () => {
      fixtures.calls.push('home-ready');
      return { ...actual.EMPTY_HOME_SNAPSHOT, athleteName: 'Cached Athlete', updatedAt: 1 };
    }),
    patchHomeSnapshot: fixtures.patchHomeSnapshot,
  };
});

vi.mock('../apps/mobile/services/nutritionTargets', () => ({
  getCachedNutritionTargets: vi.fn(async () => {
    fixtures.calls.push('nutrition-ready');
    return { calories: 1715, protein: 140, carbs: 160, fat: 55, locked: false, mode: 'MANUAL' };
  }),
}));

vi.mock('../apps/mobile/store/useFoodStore', () => ({
  useFoodStore: {
    getState: () => ({
      loadLocalCache: async () => { fixtures.calls.push('food-ready'); },
    }),
  },
}));

vi.mock('../apps/mobile/store/useUserStore', () => ({
  useUserStore: { getState: () => ({ initializeFromProfile: fixtures.initializeFromProfile }) },
}));

import { beginAuthenticatedHydration, resetAuthenticatedHydration } from '../apps/mobile/services/authenticatedHydration';
import { buildMealGroups, normalizeMealType, restoreMealLogsForUser } from '../apps/mobile/services/foodDiaryGroups';
import { sumMealLogsForDay } from '../apps/mobile/services/homeSummary';

describe('cold authenticated hydration', () => {
  beforeEach(() => {
    fixtures.calls.length = 0;
    fixtures.patchHomeSnapshot.mockClear();
    fixtures.initializeFromProfile.mockClear();
    resetAuthenticatedHydration();
  });

  it('starts Home, food, and nutrition local hydration before a delayed profile read resolves', async () => {
    const hydration = beginAuthenticatedHydration('athlete-1');
    await Promise.resolve();

    expect(fixtures.calls).toContain('profile-start');
    expect(fixtures.calls).toContain('home-ready');
    expect(fixtures.calls).toContain('food-ready');
    expect(fixtures.calls).toContain('nutrition-ready');
    expect(fixtures.patchHomeSnapshot).not.toHaveBeenCalled();

    fixtures.pendingProfile.resolve?.({ full_name: 'Cached Athlete', weight_kg: 80 });
    await hydration;
    expect(fixtures.patchHomeSnapshot).toHaveBeenCalledWith('athlete-1', expect.objectContaining({
      athleteName: 'Cached Athlete',
      currentWeight: 80,
      targetMacros: expect.objectContaining({ calories: 1715, mode: 'MANUAL' }),
    }));
  });

  it('deduplicates concurrent authenticated hydration', async () => {
    const first = beginAuthenticatedHydration('athlete-1');
    const second = beginAuthenticatedHydration('athlete-1');
    expect(second).toBe(first);
    fixtures.pendingProfile.resolve?.({});
    await first;
    expect(fixtures.calls.filter((call) => call === 'food-ready')).toHaveLength(1);
  });
});

describe('food diary core meal regression', () => {
  it('always creates Breakfast, Lunch, Dinner, and Snacks for an empty day', () => {
    expect(buildMealGroups([]).map((group) => group.title)).toEqual([
      'Breakfast', 'Lunch', 'Dinner', 'Snacks',
    ]);
  });

  it('keeps Dinner and Snacks visible when their groups have zero logs', () => {
    const groups = buildMealGroups([{ athlete_id: 'athlete-1', meal_type: 'LUNCH', servings: 1, food: { calories: 400 } }]);
    expect(groups.find((group) => group.key === 'DINNER')?.logs).toEqual([]);
    expect(groups.find((group) => group.key === 'SNACK')?.logs).toEqual([]);
  });

  it('normalizes persisted meal spellings without merging workout meals into Snacks', () => {
    expect(normalizeMealType('dinner')).toBe('DINNER');
    expect(normalizeMealType('snacks')).toBe('SNACK');
    expect(normalizeMealType('pre workout')).toBe('PRE_WORKOUT');
    expect(normalizeMealType('post-workout')).toBe('POST_WORKOUT');
  });

  it('restores only the authenticated athlete Dinner and Snack records', () => {
    const restored = restoreMealLogsForUser([
      { athlete_id: 'athlete-1', meal_type: 'dinner', servings: 1 },
      { athlete_id: 'athlete-1', meal_type: 'snacks', servings: 1 },
      { athlete_id: 'athlete-2', meal_type: 'DINNER', servings: 1 },
    ], 'athlete-1');
    expect(restored.map((log) => log.meal_type)).toEqual(['DINNER', 'SNACK']);
  });

  it('includes all four core meals in both Food Diary and Home totals', () => {
    const now = Date.now();
    const logs = [
      ['BREAKFAST', 200], ['LUNCH', 400], ['DINNER', 600], ['SNACK', 100],
    ].map(([meal_type, calories], index) => ({
      id: String(index), athlete_id: 'athlete-1', meal_type: String(meal_type), servings: 1,
      logged_at: now, food: { calories: Number(calories), protein: 10, carbs: 10, fat: 5 },
    }));
    const diaryCalories = buildMealGroups(logs).reduce((sum, group) => sum + group.kcal, 0);
    expect(diaryCalories).toBe(1300);
    expect(sumMealLogsForDay(logs, now, 'athlete-1').calories).toBe(diaryCalories);
  });
});

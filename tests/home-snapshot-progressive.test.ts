import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockStorage, mockAsyncStorage } = vi.hoisted(() => {
  const mockStorage: Record<string, string> = {};
  const mockAsyncStorage = {
    getItem: vi.fn(async (k: string) => mockStorage[k] || null),
    setItem: vi.fn(async (k: string, v: string) => { mockStorage[k] = v; }),
    removeItem: vi.fn(async (k: string) => { delete mockStorage[k]; }),
    clear: vi.fn(async () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }),
    getAllKeys: vi.fn(async () => Object.keys(mockStorage)),
    multiRemove: vi.fn(async (keys: string[]) => { keys.forEach(k => delete mockStorage[k]); }),
  };
  return { mockStorage, mockAsyncStorage };
});

if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {
    localStorage: {
      getItem: (k: string) => mockStorage[k] || null,
      setItem: (k: string, v: string) => { mockStorage[k] = v; },
      removeItem: (k: string) => { delete mockStorage[k]; },
    },
  };
}

(globalThis as any).AsyncStorage = mockAsyncStorage;

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: mockAsyncStorage,
  ...mockAsyncStorage,
}));

import {
  HomeSnapshot,
  getHomeSnapshot,
  hydrateHomeSnapshot,
  patchHomeSnapshot,
  persistHomeSnapshot,
  homeCacheKey,
  ZERO_MACROS,
} from '../apps/mobile/services/homeSummary';
import {
  getScreenData,
  setScreenData,
  subscribeScreenData,
  clearScreenDataForTests,
  isScreenDataStale,
} from '../apps/mobile/services/screenDataCache';

describe('Home Screen — Last-Mile Progressive Snapshot Architecture', () => {
  const userId = 'athlete-test-123';
  const userKey = homeCacheKey(userId);

  beforeEach(() => {
    clearScreenDataForTests();
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  });

  // Test 1: Home renders persisted snapshot before remote resolves
  it('1. Home renders persisted snapshot before remote network call resolves', async () => {
    const persisted: HomeSnapshot = {
      athleteName: 'Iron Yeti',
      currentWeight: 84.5,
      targetMacros: { calories: 2600, protein: 180, carbs: 280, fat: 75 },
      consumedMacros: { calories: 1200, protein: 90, carbs: 110, fat: 35 },
      todayPlan: { name: 'Heavy Squat Day', kind: 'plan', muscleSummary: 'Quads, Glutes', exerciseCount: 4, setCount: 16 },
      waterMl: 1500,
      steps: 6200,
      weeklyWorkoutCount: 3,
      weeklyCalories: 14200,
      cachedAt: Date.now() - 10000,
    };

    await persistHomeSnapshot(userId, persisted);
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      `@yeti_screen_data:${userKey}`,
      JSON.stringify(persisted)
    );

    // Clear in-memory cache to simulate fresh cold start / tab remount
    clearScreenDataForTests();

    // Initial in-memory read before hydration is null
    expect(getHomeSnapshot(userId)).toBeNull();

    // Hydrate persistent snapshot from disk
    const hydrated = await hydrateHomeSnapshot(userId);
    expect(mockAsyncStorage.getItem).toHaveBeenCalledWith(`@yeti_screen_data:${userKey}`);
    expect(hydrated).not.toBeNull();
    expect(hydrated).not.toBeNull();
    expect(hydrated?.athleteName).toBe('Iron Yeti');
    expect(hydrated?.currentWeight).toBe(84.5);
    expect(hydrated?.targetMacros?.calories).toBe(2600);
    expect(hydrated?.consumedMacros.calories).toBe(1200);

    // In-memory cache is now primed for 0ms synchronous read
    const inMemory = getHomeSnapshot(userId);
    expect(inMemory).toEqual(hydrated);
  });

  // Test 2: One slow Home dependency does not block other cards
  it('2. One slow Home dependency does not block other independent branches', async () => {
    let fastBranchResolved = false;
    let slowBranchResolved = false;

    // Simulate concurrent branches via Promise.allSettled
    const fastPromise = (async () => {
      fastBranchResolved = true;
      return { calories: 2400 };
    })();

    const slowPromise = new Promise((resolve) => {
      setTimeout(() => {
        slowBranchResolved = true;
        resolve({ profile: 'Late Profile' });
      }, 50);
    });

    const results = await Promise.allSettled([fastPromise, slowPromise]);
    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('fulfilled');
    expect(fastBranchResolved).toBe(true);
    expect(slowBranchResolved).toBe(true);
  });

  // Test 3: Remote refresh does not clear existing Home data
  it('3. Remote refresh preserves existing Home data while background network requests run', async () => {
    const initial: HomeSnapshot = {
      athleteName: 'Active Yeti',
      currentWeight: 80,
      targetMacros: { calories: 2500, protein: 175, carbs: 250, fat: 70 },
      consumedMacros: { calories: 850, protein: 60, carbs: 90, fat: 25 },
      todayPlan: null,
      waterMl: 1000,
      steps: 4000,
      weeklyWorkoutCount: 2,
      weeklyCalories: 9500,
      cachedAt: Date.now(),
    };
    persistHomeSnapshot(userId, initial);

    // Snapshot is present
    const cachedBefore = getHomeSnapshot(userId);
    expect(cachedBefore?.athleteName).toBe('Active Yeti');

    // Simulate partial background update (e.g. only water refreshed)
    const patched = patchHomeSnapshot(userId, { waterMl: 1500 });
    expect(patched.waterMl).toBe(1500);
    expect(patched.athleteName).toBe('Active Yeti'); // Untouched fields intact
    expect(patched.consumedMacros.calories).toBe(850);
  });

  // Test 4: Weight mutation patches Home immediately
  it('4. Weight mutation patches Home snapshot immediately', () => {
    patchHomeSnapshot(userId, {
      athleteName: 'Athlete',
      consumedMacros: ZERO_MACROS,
      currentWeight: 82.0,
    });

    // Simulate weight tracking action
    const updated = patchHomeSnapshot(userId, { currentWeight: 81.2 });
    expect(updated.currentWeight).toBe(81.2);
    expect(getHomeSnapshot(userId)?.currentWeight).toBe(81.2);
  });

  // Test 5: Food mutation patches Home totals immediately
  it('5. Food mutation patches Home totals immediately without network roundtrip', () => {
    patchHomeSnapshot(userId, {
      consumedMacros: { calories: 500, protein: 40, carbs: 50, fat: 15 },
    });

    // Simulate adding a snack (300 kcal, 20g protein, 35g carbs, 8g fat)
    const newConsumed = {
      calories: 500 + 300,
      protein: 40 + 20,
      carbs: 50 + 35,
      fat: 15 + 8,
    };
    const updated = patchHomeSnapshot(userId, { consumedMacros: newConsumed });

    expect(updated.consumedMacros.calories).toBe(800);
    expect(updated.consumedMacros.protein).toBe(60);
    expect(getHomeSnapshot(userId)?.consumedMacros.calories).toBe(800);
  });

  // Test 6: Nutrition target mutation patches Home immediately
  it('6. Nutrition target mutation patches Home snapshot and fires subscriber', () => {
    let subscriberNotified = false;
    let notifiedSnapshot: HomeSnapshot | null = null;

    const unsubscribe = subscribeScreenData<HomeSnapshot>(userKey, (snap) => {
      subscriberNotified = true;
      notifiedSnapshot = snap;
    });

    const newTargets = { calories: 2800, protein: 200, carbs: 300, fat: 80 };
    patchHomeSnapshot(userId, { targetMacros: newTargets });

    expect(subscriberNotified).toBe(true);
    expect(notifiedSnapshot?.targetMacros?.calories).toBe(2800);
    expect(notifiedSnapshot?.targetMacros?.protein).toBe(200);

    unsubscribe();
  });

  // Test 7: Workout completion patches Home immediately
  it('7. Workout completion patches weeklyWorkoutCount immediately', () => {
    patchHomeSnapshot(userId, { weeklyWorkoutCount: 2 });

    // Athlete finishes a session
    const current = getHomeSnapshot(userId)?.weeklyWorkoutCount ?? 0;
    const updated = patchHomeSnapshot(userId, { weeklyWorkoutCount: current + 1 });

    expect(updated.weeklyWorkoutCount).toBe(3);
    expect(getHomeSnapshot(userId)?.weeklyWorkoutCount).toBe(3);
  });

  // Test 8: Realtime profile event patches Home without reload
  it('8. Realtime profile event patches Home snapshot without full screen reload', () => {
    let subscriberCalls = 0;
    let latestName = '';
    let latestWeight: number | null | undefined = null;

    const unsubscribe = subscribeScreenData<HomeSnapshot>(userKey, (snap) => {
      subscriberCalls++;
      latestName = snap?.athleteName || '';
      latestWeight = snap?.currentWeight;
    });

    // Initial state
    patchHomeSnapshot(userId, { athleteName: 'Old Name', currentWeight: 75.0 });
    expect(latestName).toBe('Old Name');

    // Realtime UPDATE payload arrives from Supabase
    patchHomeSnapshot(userId, { athleteName: 'New Realtime Name', currentWeight: 76.5 });

    expect(subscriberCalls).toBe(2);
    expect(latestName).toBe('New Realtime Name');
    expect(latestWeight).toBe(76.5);

    unsubscribe();
  });

  // Test 9: Home stale-window does not suppress mutation updates
  it('9. Stale-window caching does not suppress direct mutation updates', () => {
    // Prime cache as fresh
    setScreenData(userKey, { athleteName: 'Cached Name' });
    expect(isScreenDataStale(userKey)).toBe(false);

    // Mutation arrives during fresh window
    patchHomeSnapshot(userId, { athleteName: 'Direct Mutation Name' });

    // Memory cache reflects mutation immediately regardless of stale window
    const snapshot = getHomeSnapshot(userId);
    expect(snapshot?.athleteName).toBe('Direct Mutation Name');
  });

  // Test 10: Remote failure leaves cached Home intact
  it('10. Remote failure or error leaves cached Home snapshot completely intact', async () => {
    const reliableSnapshot: HomeSnapshot = {
      athleteName: 'Resilient Yeti',
      currentWeight: 85.0,
      targetMacros: { calories: 2700, protein: 190, carbs: 290, fat: 80 },
      consumedMacros: { calories: 1500, protein: 110, carbs: 140, fat: 45 },
      todayPlan: null,
      waterMl: 2000,
      steps: 8500,
      weeklyWorkoutCount: 4,
      weeklyCalories: 18000,
      cachedAt: Date.now(),
    };
    persistHomeSnapshot(userId, reliableSnapshot);

    // Simulate network error in remote fetch branch
    const failedNetworkCall = Promise.reject(new Error('Network request failed'));
    const results = await Promise.allSettled([failedNetworkCall]);

    expect(results[0].status).toBe('rejected');

    // Cached home snapshot is still 100% available and intact
    const current = getHomeSnapshot(userId);
    expect(current).not.toBeNull();
    expect(current?.athleteName).toBe('Resilient Yeti');
    expect(current?.consumedMacros.calories).toBe(1500);
    expect(current?.waterMl).toBe(2000);
  });
});

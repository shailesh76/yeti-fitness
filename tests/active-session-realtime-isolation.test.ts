import { describe, expect, it, vi, beforeEach } from 'vitest';

const { mockStorage, mockAsyncStorage } = vi.hoisted(() => {
  const mockStorage: Record<string, string> = {};
  const mockAsyncStorage = {
    getItem: vi.fn(async (k: string) => mockStorage[k] || null),
    setItem: vi.fn(async (k: string, v: string) => { mockStorage[k] = v; }),
    removeItem: vi.fn(async (k: string) => { delete mockStorage[k]; }),
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

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: mockAsyncStorage,
  ...mockAsyncStorage,
}));

vi.mock('../apps/mobile/lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((cb) => { if (cb) cb('SUBSCRIBED'); return {}; }),
    })),
    removeChannel: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'assign-new',
            plan_id: 'plan-new',
            assigned_at: '2026-08-23T12:00:00Z',
            plan: {
              id: 'plan-new',
              name: 'Brand New Plan',
              coach: { full_name: 'Coach Sarah' },
              days: [
                {
                  id: 'day-new-1',
                  day_number: 1,
                  name: 'Heavy Deadlifts',
                  exercises: [{ id: 'ex-new-1', exercise_id: 'deadlift', sets: '5', reps: '5', weight: '180' }],
                },
              ],
            },
          },
        ],
        error: null,
      }),
    })),
  },
}));

vi.mock('../apps/mobile/database', () => ({
  database: null,
  isNativeDbAvailable: false,
}));

vi.mock('../apps/mobile/services/notificationService', () => ({
  sendLocalNotification: vi.fn(),
}));

vi.mock('../apps/mobile/services/screenDataCache', () => ({
  invalidateScreenData: vi.fn(),
  getScreenData: vi.fn(),
  setScreenData: vi.fn(),
  persistScreenData: vi.fn(),
}));

import { useSessionStore } from '../apps/mobile/store/useSessionStore';
import { useWorkoutStore } from '../apps/mobile/store/useWorkoutStore';
import { applyRealtimePlanEvent, startPlanRealtime, stopPlanRealtime } from '../apps/mobile/services/planRealtime';

describe('Phase 9: Active Session Isolation from Realtime Updates', () => {
  beforeEach(async () => {
    await stopPlanRealtime();
    useSessionStore.setState({ activeSession: null, elapsedSeconds: 0, isLoading: false, isSaving: false });
    useWorkoutStore.setState({ workoutPlans: [], activeAssignmentId: null, loading: false });
  });

  it('incoming realtime plan assignment leaves in-progress active workout session completely untouched', async () => {
    await startPlanRealtime('athlete-test');

    // 1. Athlete starts an active workout session (Old Plan - Bench Press)
    await useSessionStore.getState().startSession({
      userId: 'athlete-test',
      planDayId: 'old-day-1',
      assignmentId: 'assign-old',
      sessionName: 'Old Plan - Bench Press',
      exercises: [
        {
          exerciseId: 'ex-bench',
          exerciseName: 'Barbell Bench Press',
          targetSets: 3,
          targetReps: '10',
          targetWeightKg: 100,
          planExerciseId: 'pe-old-1',
        },
      ],
    });

    await useSessionStore.getState().completeSet(0, 0, 'athlete-test');

    useSessionStore.setState({ elapsedSeconds: 1420 });

    const sessionBefore = JSON.parse(JSON.stringify(useSessionStore.getState().activeSession));
    const elapsedBefore = useSessionStore.getState().elapsedSeconds;

    // 2. Realtime assignment event arrives for a completely new plan (Heavy Deadlifts 5x5)
    const eventHandled = await applyRealtimePlanEvent('athlete-test', 'INSERT', {
      id: 'assign-new',
      athlete_id: 'athlete-test',
      plan_id: 'plan-new',
    });

    expect(eventHandled).toBe(true);

    // 3. Verify useWorkoutStore updated its background plan catalog
    expect(useWorkoutStore.getState().activeAssignmentId).toBe('assign-new');
    expect(useWorkoutStore.getState().workoutPlans[0].name).toBe('Brand New Plan - Heavy Deadlifts');

    // 4. CRITICAL INVARIANT: Verify active session in useSessionStore was NOT mutated or reset
    const sessionAfter = useSessionStore.getState().activeSession;
    const elapsedAfter = useSessionStore.getState().elapsedSeconds;

    expect(sessionAfter).not.toBeNull();
    expect(sessionAfter?.name).toBe('Old Plan - Bench Press');
    expect(sessionAfter?.exercises).toHaveLength(1);
    expect(sessionAfter?.exercises[0].exerciseName).toBe('Barbell Bench Press');
    expect(sessionAfter?.exercises[0].sets[0].isCompleted).toBe(true);
    expect(sessionAfter?.exercises[0].sets[0].weightKg).toBe(100);
    expect(sessionAfter?.exercises[0].sets[1].isCompleted).toBe(false);
    expect(sessionAfter?.planDayId).toBe('old-day-1');
    expect(sessionAfter?.assignmentId).toBe('assign-old');
    expect(elapsedAfter).toBe(elapsedBefore);
    expect(sessionAfter).toEqual(sessionBefore);
  });
});

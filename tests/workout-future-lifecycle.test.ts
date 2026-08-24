import { describe, expect, it, vi, beforeEach } from 'vitest';

const { mockStorage, mockAsyncStorage } = vi.hoisted(() => {
  const mockStorage: Record<string, string> = {};
  const mockAsyncStorage = {
    getItem: vi.fn(async (k: string) => mockStorage[k] || null),
    setItem: vi.fn(async (k: string, v: string) => { mockStorage[k] = v; }),
    removeItem: vi.fn(async (k: string) => { delete mockStorage[k]; }),
    clear: vi.fn(async () => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]); }),
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

vi.mock('../apps/mobile/database', () => ({
  database: null,
  isNativeDbAvailable: false,
}));

vi.mock('../apps/mobile/services/notificationService', () => ({
  sendLocalNotification: vi.fn(),
}));

const mockCache = vi.hoisted(() => ({
  store: {} as Record<string, any>,
  invalidatedKeys: [] as string[],
}));

vi.mock('../apps/mobile/services/screenDataCache', () => ({
  invalidateScreenData: vi.fn((k: string) => { mockCache.invalidatedKeys.push(k); }),
  getScreenData: vi.fn((key: string) => mockCache.store[key] || null),
  setScreenData: vi.fn((key: string, data: any) => { mockCache.store[key] = data; }),
  persistScreenData: vi.fn(async (key: string, data: any) => { mockCache.store[key] = data; }),
  subscribeScreenData: vi.fn(() => vi.fn()),
  dedupeScreenRefresh: vi.fn((key, fn) => fn()),
}));

const mockSupabaseData = vi.hoisted(() => ({
  assignedPlans: [
    {
      id: 'assign-1',
      plan_id: 'plan-1',
      assigned_at: '2026-08-24T10:00:00Z',
      start_date: '2026-08-24',
      plan: {
        id: 'plan-1',
        name: 'Hypertrophy Phase 1',
        coach: { full_name: 'Coach Marcus' },
        days: [
          {
            id: 'day-push',
            day_number: 1,
            name: 'Push Day',
            exercises: [
              { id: 'pe-1', exercise_id: 'ex-bench', sets: '3', reps: '10', weight: '80', exercise: { name: 'Bench Press', muscle_group: 'Chest' } },
            ],
          },
          {
            id: 'day-pull',
            day_number: 2,
            name: 'Pull Day',
            exercises: [
              { id: 'pe-2', exercise_id: 'ex-row', sets: '4', reps: '8', weight: '70', exercise: { name: 'Barbell Row', muscle_group: 'Back' } },
            ],
          },
        ],
      },
    },
  ],
  insertedSessions: [] as any[],
  insertedSets: [] as any[],
}));

vi.mock('../apps/mobile/lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((cb) => { if (cb) cb('SUBSCRIBED'); return {}; }),
    })),
    removeChannel: vi.fn(),
    from: vi.fn((table: string) => {
      if (table === 'assigned_plans' || table === 'workout_plan_assignments') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockSupabaseData.assignedPlans,
              error: null,
            }),
          }),
        };
      }
      if (table === 'workout_sessions') {
        return {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn((row: any) => {
            mockSupabaseData.insertedSessions.push(row);
            return {
              select: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'sess-remote-1', ...row }, error: null }),
              }),
              error: null,
            };
          }),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      if (table === 'session_sets') {
        return {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn((rows: any) => {
            mockSupabaseData.insertedSets.push(...(Array.isArray(rows) ? rows : [rows]));
            return { error: null };
          }),
          eq: vi.fn().mockReturnThis(),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    }),
  },
}));

import { useSessionStore } from '../apps/mobile/store/useSessionStore';
import { useWorkoutStore } from '../apps/mobile/store/useWorkoutStore';
import { useLogStore } from '../apps/mobile/store/useLogStore';
import { buildTodaysPlan, getHomeSnapshot, patchHomeSnapshot } from '../apps/mobile/services/homeSummary';
import { getWorkoutLocalDate } from '../apps/mobile/utils/workoutDate';

describe('Workout Lifecycle: Start, Cancel, Abandon, Complete, and State Reconciliation', () => {
  const athleteId = 'athlete-lifecycle-test';

  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    Object.keys(mockCache.store).forEach((k) => delete mockCache.store[k]);
    mockCache.invalidatedKeys.length = 0;
    mockSupabaseData.insertedSessions.length = 0;
    mockSupabaseData.insertedSets.length = 0;
    useSessionStore.setState({ activeSession: null, elapsedSeconds: 0, isLoading: false, isSaving: false });
    useWorkoutStore.setState({ workoutPlans: [], activeAssignmentId: null, loading: false });
    useLogStore.setState({ logsHistory: [], activeSession: null, loading: false });
    patchHomeSnapshot(athleteId, {
      weeklyWorkoutCount: 0,
      todayPlan: null,
      consumedMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    });
  });

  it('1. Coach assigns workout -> workout appears in Upcoming / Future workouts list', async () => {
    await useWorkoutStore.getState().syncWorkoutPlans(athleteId);
    const plans = useWorkoutStore.getState().workoutPlans;

    expect(plans).toHaveLength(2);
    expect(plans[0].plan_day_id).toBe('day-push');
    expect(plans[0].name).toBe('Hypertrophy Phase 1 - Push Day');
    expect(plans[1].plan_day_id).toBe('day-pull');
    expect(plans[1].name).toBe('Hypertrophy Phase 1 - Pull Day');

    // Home card builds from upcoming plans
    const todayPlan = buildTodaysPlan({ activeSession: null, plans });
    expect(todayPlan).not.toBeNull();
    expect(todayPlan?.kind).toBe('template');
    expect(todayPlan?.name).toBe('Hypertrophy Phase 1 - Push Day');
  });

  it('2. Athlete starts workout -> transitions to active in memory, storage, and Home snapshot', async () => {
    await useWorkoutStore.getState().syncWorkoutPlans(athleteId);
    const plan = useWorkoutStore.getState().workoutPlans[0];

    await useSessionStore.getState().startSession({
      userId: athleteId,
      planDayId: plan.plan_day_id,
      assignmentId: plan.assignment_id,
      sessionName: plan.name,
      exercises: plan.workout_plan_exercises.map((pe: any) => ({
        exerciseId: pe.exercise_id,
        exerciseName: pe.exercise?.name || 'Exercise',
        targetSets: Number(pe.sets) || 3,
        targetReps: String(pe.reps || '10'),
        targetWeightKg: pe.weight ? Number(pe.weight) : undefined,
        planExerciseId: pe.id,
      })),
    });

    const active = useSessionStore.getState().activeSession;
    expect(active).not.toBeNull();
    expect(active?.name).toBe('Hypertrophy Phase 1 - Push Day');
    expect(active?.planDayId).toBe('day-push');
    expect(active?.assignmentId).toBe('assign-1');
    expect(mockStorage['@yeti_active_session']).toBeTruthy();

    const snap = getHomeSnapshot(athleteId);
    expect(snap?.todayPlan?.kind).toBe('session');
    expect(snap?.todayPlan?.name).toBe('Hypertrophy Phase 1 - Push Day');
  });

  it('3. Athlete cancels / abandons in-progress session -> active session clears and coach assignment remains available to retry', async () => {
    await useWorkoutStore.getState().syncWorkoutPlans(athleteId);
    const plan = useWorkoutStore.getState().workoutPlans[0];

    await useSessionStore.getState().startSession({
      userId: athleteId,
      planDayId: plan.plan_day_id,
      assignmentId: plan.assignment_id,
      sessionName: plan.name,
      exercises: [],
    });

    expect(useSessionStore.getState().activeSession).not.toBeNull();

    // Athlete discards / abandons session
    await useSessionStore.getState().abandonSession();

    expect(useSessionStore.getState().activeSession).toBeNull();
    expect(mockStorage['@yeti_active_session']).toBeUndefined();

    // Cache invalidation triggered
    expect(mockCache.invalidatedKeys).toContain(`home:${athleteId}`);
    expect(mockCache.invalidatedKeys).toContain(`workouts:${athleteId}`);

    // Assigned plan is STILL available in workoutPlans and Today's Plan to retry
    const plans = useWorkoutStore.getState().workoutPlans;
    expect(plans).toHaveLength(2);
    const snap = getHomeSnapshot(athleteId);
    expect(snap?.todayPlan?.kind).toBe('template');
    expect(snap?.todayPlan?.name).toBe('Hypertrophy Phase 1 - Push Day');
  });

  it('4. Athlete completes workout -> finishSession publishes log with preserved plan_day_id and assignment_id', async () => {
    await useWorkoutStore.getState().syncWorkoutPlans(athleteId);
    const plan = useWorkoutStore.getState().workoutPlans[0];

    await useSessionStore.getState().startSession({
      userId: athleteId,
      planDayId: plan.plan_day_id,
      assignmentId: plan.assignment_id,
      sessionName: plan.name,
      exercises: [
        {
          exerciseId: 'ex-bench',
          exerciseName: 'Bench Press',
          targetSets: 3,
          targetReps: '10',
          targetWeightKg: 80,
          planExerciseId: 'pe-1',
        },
      ],
    });

    // Complete all 3 sets
    await useSessionStore.getState().completeSet(0, 0, athleteId);
    await useSessionStore.getState().completeSet(0, 1, athleteId);
    await useSessionStore.getState().completeSet(0, 2, athleteId);

    const result = await useSessionStore.getState().finishSession();
    expect(result.totalVolume).toBe(2400); // 3 * 80 * 10

    // Log published immediately in useLogStore
    const logs = useLogStore.getState().logsHistory;
    expect(logs).toHaveLength(1);
    expect(logs[0].plan_day_id).toBe('day-push');
    expect(logs[0].assignment_id).toBe('assign-1');
    expect(logs[0].total_volume).toBe(2400);
    expect(logs[0].name).toBe('Hypertrophy Phase 1 - Push Day');
  });

  it('5. Post-completion detection -> plan_day_id marks the completed workout day as done', async () => {
    const todayKey = getWorkoutLocalDate(new Date());

    useLogStore.getState().prependWorkoutLog({
      id: 'sess-comp-1',
      name: 'Hypertrophy Phase 1 - Push Day',
      plan_day_id: 'day-push',
      assignment_id: 'assign-1',
      completed_at: new Date().toISOString(),
      total_volume: 2400,
      exercises: [],
    });

    const logs = useLogStore.getState().logsHistory;
    const completedPlanDayIdsToday = new Set<string>();
    logs.forEach((log) => {
      if (log.completed_at) {
        const planDayId = log.plan_day_id || log.workout_plan_id;
        if (planDayId && getWorkoutLocalDate(log.completed_at) === todayKey) {
          completedPlanDayIdsToday.add(planDayId);
        }
      }
    });

    expect(completedPlanDayIdsToday.has('day-push')).toBe(true);
    expect(completedPlanDayIdsToday.has('day-pull')).toBe(false);
  });

  it('6. Future workouts advance -> Next uncompleted plan day becomes the primary recommendation', async () => {
    await useWorkoutStore.getState().syncWorkoutPlans(athleteId);
    const plans = useWorkoutStore.getState().workoutPlans;

    // With day-push completed:
    const completedPlanDayIds = new Set(['day-push']);
    const nextPlan = buildTodaysPlan({
      activeSession: null,
      plans,
      completedPlanDayIds,
    });

    expect(nextPlan).not.toBeNull();
    expect(nextPlan?.kind).toBe('template');
    expect(nextPlan?.name).toBe('Hypertrophy Phase 1 - Pull Day');
  });

  it('7. When all assigned plan days are completed today, Today\'s Plan gracefully yields null or clean state', () => {
    const plans = [
      { id: '1', plan_day_id: 'day-push', name: 'Push Day', workout_plan_exercises: [{ sets: 3 }] },
      { id: '2', plan_day_id: 'day-pull', name: 'Pull Day', workout_plan_exercises: [{ sets: 3 }] },
    ];

    const completedPlanDayIds = new Set(['day-push', 'day-pull']);
    const nextPlan = buildTodaysPlan({
      activeSession: null,
      plans,
      completedPlanDayIds,
    });

    expect(nextPlan).toBeNull();
  });

  it('8. Immediate mutation before network -> Home weekly count and snapshot update synchronously', async () => {
    await useWorkoutStore.getState().syncWorkoutPlans(athleteId);
    const plan = useWorkoutStore.getState().workoutPlans[0];

    await useSessionStore.getState().startSession({
      userId: athleteId,
      planDayId: plan.plan_day_id,
      assignmentId: plan.assignment_id,
      sessionName: plan.name,
      exercises: [],
    });

    await useSessionStore.getState().finishSession();

    const snap = getHomeSnapshot(athleteId);
    expect(snap?.weeklyWorkoutCount).toBe(1);
    expect(snap?.todayPlan?.name).toBe('Hypertrophy Phase 1 - Pull Day');
  });

  it('9. Web / PostgREST persistence when offline DB is unavailable', async () => {
    await useSessionStore.getState().startSession({
      userId: athleteId,
      planDayId: 'day-push',
      assignmentId: 'assign-1',
      sessionName: 'Web Push Day',
      exercises: [
        {
          exerciseId: 'ex-bench',
          exerciseName: 'Bench Press',
          targetSets: 1,
          targetReps: '10',
          targetWeightKg: 100,
        },
      ],
    });

    await useSessionStore.getState().completeSet(0, 0, athleteId);
    await useSessionStore.getState().finishSession();

    // Wait a tick for async persistence
    await new Promise((r) => setTimeout(r, 20));

    expect(mockSupabaseData.insertedSessions.length).toBeGreaterThan(0);
    expect(mockSupabaseData.insertedSets.length).toBeGreaterThan(0);
  });

  it('10. Cache invalidation updates screenDataCache for home, workouts, and progress', async () => {
    await useSessionStore.getState().startSession({
      userId: athleteId,
      planDayId: 'day-push',
      sessionName: 'Test Invalidation',
      exercises: [],
    });

    await useSessionStore.getState().finishSession();

    expect(mockCache.invalidatedKeys).toContain(`home:${athleteId}`);
    expect(mockCache.invalidatedKeys).toContain(`workouts:${athleteId}`);
    expect(mockCache.invalidatedKeys).toContain(`progress:${athleteId}`);
  });

  it('11. App restart persistence -> AsyncStorage restores in-progress session if app was killed mid-workout', async () => {
    await useSessionStore.getState().startSession({
      userId: athleteId,
      planDayId: 'day-push',
      sessionName: 'Mid-Workout Push',
      exercises: [
        {
          exerciseId: 'ex-bench',
          exerciseName: 'Bench Press',
          targetSets: 3,
          targetReps: '10',
          targetWeightKg: 90,
        },
      ],
    });

    // Simulate app restart: Zustand resets to null
    useSessionStore.setState({ activeSession: null, elapsedSeconds: 0 });

    // resumeSession reads from AsyncStorage
    await useSessionStore.getState().resumeSession();

    const resumed = useSessionStore.getState().activeSession;
    expect(resumed).not.toBeNull();
    expect(resumed?.name).toBe('Mid-Workout Push');
    expect(resumed?.planDayId).toBe('day-push');
  });

  it('12. Coach assignment integrity -> completing a session does not delete coach assignment template', async () => {
    await useWorkoutStore.getState().syncWorkoutPlans(athleteId);
    expect(useWorkoutStore.getState().workoutPlans).toHaveLength(2);

    await useSessionStore.getState().startSession({
      userId: athleteId,
      planDayId: 'day-push',
      assignmentId: 'assign-1',
      sessionName: 'Push Day',
      exercises: [],
    });

    await useSessionStore.getState().finishSession();

    // The assigned plans array still retains all days for future cycles/tracking
    expect(useWorkoutStore.getState().workoutPlans).toHaveLength(2);
  });

  it('13. repeated finish persists once and discard cannot become completion history', async () => {
    await useSessionStore.getState().startSession({
      userId: athleteId,
      planDayId: 'day-push',
      sessionName: 'Repeated Finish',
      exercises: [],
    });
    await Promise.all([
      useSessionStore.getState().finishSession(),
      useSessionStore.getState().finishSession(),
    ]);
    expect(mockSupabaseData.insertedSessions).toHaveLength(1);

    mockSupabaseData.insertedSessions.length = 0;
    await useSessionStore.getState().startSession({
      userId: athleteId,
      planDayId: 'day-pull',
      sessionName: 'Discard Me',
      exercises: [],
    });
    await useSessionStore.getState().abandonSession();
    await useSessionStore.getState().finishSession();
    expect(mockSupabaseData.insertedSessions).toHaveLength(0);
  });
});

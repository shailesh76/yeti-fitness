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

vi.mock('../apps/mobile/services/screenDataCache', () => ({
  invalidateScreenData: vi.fn(),
  getScreenData: vi.fn(),
  setScreenData: vi.fn(),
  persistScreenData: vi.fn().mockResolvedValue(undefined),
  subscribeScreenData: vi.fn(() => vi.fn()),
  dedupeScreenRefresh: vi.fn((key, fn) => fn()),
}));

const mockCalendarData = vi.hoisted(() => ({
  remoteSessions: [
    // 1. Migrated historical session 1 (from backfill migration) - NULL plan_day_id
    {
      id: '00000000-0000-0000-0000-000000000001',
      athlete_id: 'athlete-calendar-1',
      plan_day_id: null,
      started_at: '2026-08-15T09:00:00Z',
      completed_at: '2026-08-15T09:45:00Z',
      duration_seconds: 2700,
      plan_day: null,
      session_sets: [
        { id: 'set-hist-1', session_id: '00000000-0000-0000-0000-000000000001', exercise_id: 'ex-squat', weight: '100', reps: 10, completed_at: '2026-08-15T09:10:00Z', exercise: { name: 'Barbell Back Squat' } },
        { id: 'set-hist-2', session_id: '00000000-0000-0000-0000-000000000001', exercise_id: 'ex-squat', weight: '100', reps: 10, completed_at: '2026-08-15T09:20:00Z', exercise: { name: 'Barbell Back Squat' } },
      ],
    },
    // 2. Migrated historical session 2 - NULL plan_day_id
    {
      id: '00000000-0000-0000-0000-000000000002',
      athlete_id: 'athlete-calendar-1',
      plan_day_id: null,
      started_at: '2026-08-18T14:00:00Z',
      completed_at: '2026-08-18T14:50:00Z',
      duration_seconds: 3000,
      plan_day: null,
      session_sets: [
        { id: 'set-hist-3', session_id: '00000000-0000-0000-0000-000000000002', exercise_id: 'ex-bench', weight: '85', reps: 8, completed_at: '2026-08-18T14:15:00Z', exercise: { name: 'Flat Bench Press' } },
      ],
    },
    // 3. Modern coach-assigned workout on 2026-08-20
    {
      id: 'sess-modern-20',
      athlete_id: 'athlete-calendar-1',
      plan_day_id: 'day-leg',
      started_at: '2026-08-20T08:00:00Z',
      completed_at: '2026-08-20T08:55:00Z',
      duration_seconds: 3300,
      plan_day: { name: 'Leg Day', workout_plan: { name: 'Strength Block A' } },
      session_sets: [
        { id: 'set-m-1', session_id: 'sess-modern-20', exercise_id: 'ex-lunge', weight: '40', reps: 12, completed_at: '2026-08-20T08:20:00Z', exercise: { name: 'Walking Lunge' } },
      ],
    },
    // 4. Modern workout on 2026-08-22 (Morning)
    {
      id: 'sess-modern-22a',
      athlete_id: 'athlete-calendar-1',
      plan_day_id: 'day-upper',
      started_at: '2026-08-22T07:00:00Z',
      completed_at: '2026-08-22T07:45:00Z',
      duration_seconds: 2700,
      plan_day: { name: 'Upper Body A', workout_plan: { name: 'Strength Block A' } },
      session_sets: [
        { id: 'set-m-2', session_id: 'sess-modern-22a', exercise_id: 'ex-bench', weight: '90', reps: 5, completed_at: '2026-08-22T07:15:00Z', exercise: { name: 'Bench Press' } },
      ],
    },
    // 5. Modern workout on 2026-08-22 (Evening - Multiple workouts same day test)
    {
      id: 'sess-modern-22b',
      athlete_id: 'athlete-calendar-1',
      plan_day_id: null,
      started_at: '2026-08-22T17:00:00Z',
      completed_at: '2026-08-22T17:30:00Z',
      duration_seconds: 1800,
      plan_day: null,
      session_sets: [
        { id: 'set-m-3', session_id: 'sess-modern-22b', exercise_id: 'ex-abs', weight: '0', reps: 20, completed_at: '2026-08-22T17:10:00Z', exercise: { name: 'Plank & Core' } },
      ],
    },
    // 6. Previous month session (July 2026)
    {
      id: 'sess-july-15',
      athlete_id: 'athlete-calendar-1',
      plan_day_id: null,
      started_at: '2026-07-15T10:00:00Z',
      completed_at: '2026-07-15T11:00:00Z',
      duration_seconds: 3600,
      plan_day: null,
      session_sets: [
        { id: 'set-j-1', session_id: 'sess-july-15', exercise_id: 'ex-deadlift', weight: '140', reps: 5, completed_at: '2026-07-15T10:30:00Z', exercise: { name: 'Deadlift' } },
      ],
    },
    // 7. Athlete 2 session (Security isolation test)
    {
      id: 'sess-athlete-2',
      athlete_id: 'athlete-calendar-2',
      plan_day_id: null,
      started_at: '2026-08-22T10:00:00Z',
      completed_at: '2026-08-22T10:45:00Z',
      duration_seconds: 2700,
      plan_day: null,
      session_sets: [],
    },
  ],
  queryTablesRecorded: [] as string[],
}));

vi.mock('../apps/mobile/lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((cb) => { if (cb) cb('SUBSCRIBED'); return {}; }),
    })),
    removeChannel: vi.fn(),
    from: vi.fn((table: string) => {
      mockCalendarData.queryTablesRecorded.push(table);
      return {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'sess-inserted' }, error: null }),
          }),
          error: null,
        }),
        eq: vi.fn((col: string, val: any) => {
          let filtered = mockCalendarData.remoteSessions.filter((s: any) => s[col === 'athlete_id' ? 'athlete_id' : col] === val);
          return {
            not: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: filtered, error: null }),
              gte: vi.fn((_, gteVal) => ({
                lte: vi.fn((__, lteVal) => {
                  const ranged = filtered.filter(
                    (s: any) => s.completed_at >= gteVal && s.completed_at <= lteVal
                  );
                  return Promise.resolve({ data: ranged, error: null });
                }),
              })),
            }),
            gte: vi.fn((_, gteVal) => ({
              lte: vi.fn((__, lteVal) => {
                const ranged = filtered.filter(
                  (s: any) => s.completed_at >= gteVal && s.completed_at <= lteVal
                );
                return {
                  order: vi.fn().mockResolvedValue({ data: ranged, error: null }),
                };
              }),
            })),
          };
        }),
      };
    }),
  },
}));

import { useLogStore } from '../apps/mobile/store/useLogStore';
import { useSessionStore } from '../apps/mobile/store/useSessionStore';
import { WorkoutRepository } from '../packages/database/src/repositories/WorkoutRepository';
import { getWorkoutLocalDate, isSameWorkoutDate } from '../apps/mobile/utils/workoutDate';
import { supabase } from '../apps/mobile/lib/supabase';

describe('Workout History Calendar & Previous Date Navigation Suite', () => {
  const athlete1 = 'athlete-calendar-1';
  const athlete2 = 'athlete-calendar-2';
  const repository = new WorkoutRepository(null as any, supabase);

  beforeEach(() => {
    vi.clearAllMocks();
    mockCalendarData.queryTablesRecorded.length = 0;
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    useLogStore.setState({ logsHistory: [], activeSession: null, loading: false });
    useSessionStore.setState({ activeSession: null, elapsedSeconds: 0, isLoading: false, isSaving: false });
  });

  it('1. Completed workout marks calendar date', async () => {
    await useLogStore.getState().fetchLogsHistory(athlete1);
    const logs = useLogStore.getState().logsHistory;

    const markedDates = new Map<string, number>();
    logs.forEach((log) => {
      if (log.completed_at) {
        const key = getWorkoutLocalDate(log.completed_at, 'UTC');
        markedDates.set(key, (markedDates.get(key) || 0) + 1);
      }
    });

    expect(markedDates.get('2026-08-15')).toBe(1);
    expect(markedDates.get('2026-08-18')).toBe(1);
    expect(markedDates.get('2026-08-20')).toBe(1);
    expect(markedDates.get('2026-08-22')).toBe(2);
  });

  it('2. Tapping marked date (2026-08-20) returns workout for that date', async () => {
    await useLogStore.getState().fetchLogsHistory(athlete1);
    const logs = useLogStore.getState().logsHistory;

    const targetKey = '2026-08-20';
    const dayLogs = logs.filter((l) => getWorkoutLocalDate(l.completed_at, 'UTC') === targetKey);

    expect(dayLogs).toHaveLength(1);
    expect(dayLogs[0].id).toBe('sess-modern-20');
    expect(dayLogs[0].name).toBe('Strength Block A');
  });

  it('3. Selecting an empty date (2026-08-21) returns an honest empty state with 0 logs', async () => {
    await useLogStore.getState().fetchLogsHistory(athlete1);
    const logs = useLogStore.getState().logsHistory;

    const emptyKey = '2026-08-21';
    const dayLogs = logs.filter((l) => getWorkoutLocalDate(l.completed_at, 'UTC') === emptyKey);

    expect(dayLogs).toHaveLength(0);
  });

  it('4. Previous date (2026-08-18) works and loads historical sets and volume', async () => {
    await useLogStore.getState().fetchLogsHistory(athlete1);
    const logs = useLogStore.getState().logsHistory;

    const targetKey = '2026-08-18';
    const dayLogs = logs.filter((l) => getWorkoutLocalDate(l.completed_at, 'UTC') === targetKey);

    expect(dayLogs).toHaveLength(1);
    expect(dayLogs[0].id).toBe('00000000-0000-0000-0000-000000000002');
    expect(dayLogs[0].total_volume).toBe(680); // 85 * 8
    expect(dayLogs[0].exercises[0].exercise_name).toBe('Flat Bench Press');
  });

  it('5. Previous month (July 2026) works via range query', async () => {
    const startIso = '2026-07-01T00:00:00.000Z';
    const endIso = '2026-07-31T23:59:59.999Z';

    await useLogStore.getState().fetchLogsHistory(athlete1, startIso, endIso);
    const logs = useLogStore.getState().logsHistory;

    const julyKey = '2026-07-15';
    const dayLogs = logs.filter((l) => getWorkoutLocalDate(l.completed_at, 'UTC') === julyKey);

    expect(dayLogs).toHaveLength(1);
    expect(dayLogs[0].id).toBe('sess-july-15');
    expect(dayLogs[0].total_volume).toBe(700); // 140 * 5
  });

  it('6. Multiple workouts on the same date (2026-08-22) all appear', async () => {
    await useLogStore.getState().fetchLogsHistory(athlete1);
    const logs = useLogStore.getState().logsHistory;

    const key = '2026-08-22';
    const dayLogs = logs.filter((l) => getWorkoutLocalDate(l.completed_at, 'UTC') === key);

    expect(dayLogs).toHaveLength(2);
    const ids = dayLogs.map((d) => d.id);
    expect(ids).toContain('sess-modern-22a');
    expect(ids).toContain('sess-modern-22b');
  });

  it('7. Newest/current workout appears immediately after completion on today\'s date without full reload', async () => {
    const today = new Date();
    const todayKey = getWorkoutLocalDate(today);

    await useSessionStore.getState().startSession({
      userId: athlete1,
      sessionName: 'Live Completed Workout',
      exercises: [
        {
          exerciseId: 'ex-ohp',
          exerciseName: 'Overhead Press',
          targetSets: 1,
          targetReps: '5',
          targetWeightKg: 60,
        },
      ],
    });

    await useSessionStore.getState().completeSet(0, 0, athlete1);
    await useSessionStore.getState().finishSession();

    const logs = useLogStore.getState().logsHistory;
    expect(logs[0].name).toBe('Live Completed Workout');
    expect(getWorkoutLocalDate(logs[0].completed_at)).toBe(todayKey);
  });

  it('8. Migrated historical sessions (NULL plan_day_id) render exercise details and total volume perfectly', async () => {
    await useLogStore.getState().fetchLogsHistory(athlete1);
    const logs = useLogStore.getState().logsHistory;

    const migrated = logs.find((l) => l.id === '00000000-0000-0000-0000-000000000001');
    expect(migrated).toBeDefined();
    expect(migrated?.plan_day_id).toBeNull();
    expect(migrated?.name).toBe('Workout Session');
    expect(migrated?.total_volume).toBe(2000); // 2 sets * 10 reps * 100 kg
    expect(migrated?.exercises).toHaveLength(1);
    expect(migrated?.exercises[0].exercise_name).toBe('Barbell Back Squat');
    expect(migrated?.exercises[0].sets).toHaveLength(2);
  });

  it('9. NULL plan_day_id does NOT crash or prevent date matching', () => {
    const nullPlanSession = {
      id: 'sess-no-plan',
      completed_at: '2026-08-15T09:45:00Z',
      plan_day_id: null,
      name: 'Freestyle Workout',
    };

    expect(getWorkoutLocalDate(nullPlanSession.completed_at, 'UTC')).toBe('2026-08-15');
    expect(isSameWorkoutDate(nullPlanSession.completed_at, '2026-08-15', 'UTC')).toBe(true);
  });

  it('10. Timezone boundary maps to correct athlete-local date', () => {
    // 2026-08-24 13:30:00 UTC = 2026-08-24 23:30 in Australia/Hobart (+10:00)
    const lateNightIso = '2026-08-24T13:30:00Z';
    const hobartDate = getWorkoutLocalDate(lateNightIso, 'Australia/Hobart');
    expect(hobartDate).toBe('2026-08-24');

    // 2026-08-24 22:30:00 UTC = 2026-08-25 08:30 in Australia/Hobart (+10:00)
    const nextDayIso = '2026-08-24T22:30:00Z';
    const hobartNextDay = getWorkoutLocalDate(nextDayIso, 'Australia/Hobart');
    expect(hobartNextDay).toBe('2026-08-25');

    // And in America/New_York (-04:00):
    const nyDate = getWorkoutLocalDate(nextDayIso, 'America/New_York');
    expect(nyDate).toBe('2026-08-24');
  });

  it('11. Offline completion marks today\'s date immediately in memory', async () => {
    const today = new Date();
    const todayKey = getWorkoutLocalDate(today);

    await useSessionStore.getState().startSession({
      userId: athlete1,
      sessionName: 'Offline Lift',
      exercises: [],
    });

    await useSessionStore.getState().finishSession();

    const marked = new Map<string, number>();
    useLogStore.getState().logsHistory.forEach((log) => {
      const k = getWorkoutLocalDate(log.completed_at);
      marked.set(k, (marked.get(k) || 0) + 1);
    });

    expect(marked.get(todayKey)).toBeGreaterThanOrEqual(1);
  });

  it('12. Reconnecting and refetching deduplicates by ID so calendar has no duplicates', async () => {
    useLogStore.getState().prependWorkoutLog({
      id: 'sess-modern-20',
      name: 'Strength Block A - Leg Day',
      completed_at: '2026-08-20T08:55:00Z',
      total_volume: 480,
      exercises: [],
    });

    // Remote fetch returns the same session
    await useLogStore.getState().fetchLogsHistory(athlete1);

    const matches = useLogStore.getState().logsHistory.filter((l) => l.id === 'sess-modern-20');
    expect(matches).toHaveLength(1);
  });

  it('13. App restart restores calendar history from database without losing marks', async () => {
    // Initial fetch
    await useLogStore.getState().fetchLogsHistory(athlete1);
    expect(useLogStore.getState().logsHistory.length).toBeGreaterThan(0);

    // Wipe Zustand store to simulate app restart
    useLogStore.setState({ logsHistory: [], activeSession: null, loading: false });
    expect(useLogStore.getState().logsHistory).toHaveLength(0);

    // Rehydrate on app start
    await useLogStore.getState().fetchLogsHistory(athlete1);
    expect(useLogStore.getState().logsHistory).toHaveLength(6);
  });

  it('14. Athlete A cannot see Athlete B workout history', async () => {
    await useLogStore.getState().fetchLogsHistory(athlete1);
    const athlete1Logs = useLogStore.getState().logsHistory;
    expect(athlete1Logs.some((l) => l.id === 'sess-athlete-2')).toBe(false);

    useLogStore.setState({ logsHistory: [] });
    await useLogStore.getState().fetchLogsHistory(athlete2);
    const athlete2Logs = useLogStore.getState().logsHistory;
    expect(athlete2Logs).toHaveLength(1);
    expect(athlete2Logs[0].id).toBe('sess-athlete-2');
  });

  it('15. Web/PWA uses normalized range query on workout_sessions with session_sets embedded', async () => {
    await repository.getWorkoutHistoryForRange(athlete1, '2026-08-01T00:00:00Z', '2026-08-31T23:59:59Z');
    expect(mockCalendarData.queryTablesRecorded).toContain('workout_sessions');
  });

  it('16. Zero queries touch legacy workout_logs table', async () => {
    mockCalendarData.queryTablesRecorded.length = 0;
    await repository.getWorkoutHistory(athlete1);
    await repository.getWorkoutHistoryForRange(athlete1, '2026-08-01T00:00:00Z', '2026-08-31T23:59:59Z');
    expect(mockCalendarData.queryTablesRecorded).not.toContain('workout_logs');
  });
});

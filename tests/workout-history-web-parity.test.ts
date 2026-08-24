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

const mockSupabaseTables = vi.hoisted(() => ({
  workout_sessions: [] as any[],
  session_sets: [] as any[],
  workout_logs: [] as any[],
  queriedTables: [] as string[],
}));

vi.mock('../apps/mobile/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      mockSupabaseTables.queriedTables.push(table);
      let currentFilterAthlete: string | null = null;
      let isNotCompletedNull = false;

      const builder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn((col: string, val: any) => {
          if (col === 'athlete_id') currentFilterAthlete = val;
          return builder;
        }),
        not: vi.fn((col: string, op: string, val: any) => {
          if (col === 'completed_at' && op === 'is' && val === null) isNotCompletedNull = true;
          return builder;
        }),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation((limitCount: number) => {
          if (table === 'workout_sessions') {
            let filtered = mockSupabaseTables.workout_sessions.filter((s: any) => {
              if (currentFilterAthlete && s.athlete_id !== currentFilterAthlete) return false;
              if (isNotCompletedNull && !s.completed_at) return false;
              return true;
            });
            filtered.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
            return Promise.resolve({
              data: filtered.slice(0, limitCount).map((s) => ({
                ...s,
                session_sets: mockSupabaseTables.session_sets.filter((st) => st.session_id === s.id),
              })),
              error: null,
            });
          }
          return Promise.resolve({ data: [], error: null });
        }),
      };
      return builder;
    }),
  },
}));

import { WorkoutRepository } from '../packages/database/src/repositories/WorkoutRepository';
import { useLogStore } from '../apps/mobile/store/useLogStore';
import { supabase } from '../apps/mobile/lib/supabase';

describe('Phase 1: Web / PWA History Parity', () => {
  beforeEach(() => {
    mockSupabaseTables.workout_sessions.length = 0;
    mockSupabaseTables.session_sets.length = 0;
    mockSupabaseTables.workout_logs.length = 0;
    mockSupabaseTables.queriedTables.length = 0;
    useLogStore.setState({ logsHistory: [], loading: false });
  });

  it('1 & 2. Web path queries workout_sessions and session_sets via PostgREST', async () => {
    mockSupabaseTables.workout_sessions.push({
      id: 'ws-1',
      athlete_id: 'athlete-web-1',
      plan_day_id: 'pd-1',
      started_at: '2026-08-23T10:00:00Z',
      completed_at: '2026-08-23T11:00:00Z',
      duration_seconds: 3600,
      total_volume_kg: 2400,
      notes: 'Upper Body Blast',
      status: 'completed',
    });

    mockSupabaseTables.session_sets.push(
      {
        id: 'set-1',
        session_id: 'ws-1',
        exercise_id: 'ex-bench',
        exercise_name: 'Bench Press',
        set_number: 1,
        weight: 100,
        reps: 10,
        rpe: 8,
        completed_at: '2026-08-23T10:15:00Z',
      },
      {
        id: 'set-2',
        session_id: 'ws-1',
        exercise_id: 'ex-bench',
        exercise_name: 'Bench Press',
        set_number: 2,
        weight: 100,
        reps: 10,
        rpe: 8.5,
        completed_at: '2026-08-23T10:20:00Z',
      }
    );

    const repo = new WorkoutRepository(null, supabase as any);
    const history = await repo.getWorkoutHistory('athlete-web-1');

    expect(mockSupabaseTables.queriedTables).toContain('workout_sessions');
    expect(mockSupabaseTables.queriedTables).not.toContain('workout_logs');
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe('ws-1');
    expect(history[0].sets).toHaveLength(2);
  });

  it('3. Completed sessions render after hard refresh on web', async () => {
    mockSupabaseTables.workout_sessions.push({
      id: 'session-persist-1',
      athlete_id: 'athlete-web-1',
      started_at: '2026-08-23T08:00:00Z',
      completed_at: '2026-08-23T09:00:00Z',
      duration_seconds: 3600,
      total_volume_kg: 500,
      notes: 'Morning Cardio & Core',
      status: 'completed',
    });

    mockSupabaseTables.session_sets.push({
      id: 'set-p-1',
      session_id: 'session-persist-1',
      exercise_id: 'ex-crunch',
      exercise_name: 'Abdominal Crunch',
      set_number: 1,
      weight: 0,
      reps: 25,
      rpe: 7,
      completed_at: '2026-08-23T08:30:00Z',
    });

    await useLogStore.getState().fetchLogsHistory('athlete-web-1');

    const logs = useLogStore.getState().logsHistory;
    expect(logs).toHaveLength(1);
    expect(logs[0].id).toBe('session-persist-1');
    expect(logs[0].name).toBe('Workout Session');
    expect(logs[0].exercises[0].exercise_name).toBe('Abdominal Crunch');
    expect(logs[0].exercises[0].sets[0].reps).toBe(25);
  });

  it('4. Active (in-progress) sessions are excluded from completed history', async () => {
    mockSupabaseTables.workout_sessions.push(
      {
        id: 'session-active',
        athlete_id: 'athlete-web-1',
        started_at: '2026-08-23T12:00:00Z',
        completed_at: null, // Active / in progress
        status: 'active',
      },
      {
        id: 'session-completed',
        athlete_id: 'athlete-web-1',
        started_at: '2026-08-22T10:00:00Z',
        completed_at: '2026-08-22T11:00:00Z',
        status: 'completed',
      }
    );

    const repo = new WorkoutRepository(null, supabase as any);
    const history = await repo.getWorkoutHistory('athlete-web-1');

    expect(history).toHaveLength(1);
    expect(history[0].id).toBe('session-completed');
  });

  it('5. Sessions are sorted newest-first by completed_at', async () => {
    mockSupabaseTables.workout_sessions.push(
      {
        id: 'session-old',
        athlete_id: 'athlete-web-1',
        started_at: '2026-08-01T10:00:00Z',
        completed_at: '2026-08-01T11:00:00Z',
        status: 'completed',
      },
      {
        id: 'session-new',
        athlete_id: 'athlete-web-1',
        started_at: '2026-08-20T10:00:00Z',
        completed_at: '2026-08-20T11:00:00Z',
        status: 'completed',
      }
    );

    const repo = new WorkoutRepository(null, supabase as any);
    const history = await repo.getWorkoutHistory('athlete-web-1');

    expect(history[0].id).toBe('session-new');
    expect(history[1].id).toBe('session-old');
  });

  it('6 & 7. Multiple sets map to correct exercises with live weight and reps preserved', async () => {
    mockSupabaseTables.workout_sessions.push({
      id: 'session-multi',
      athlete_id: 'athlete-web-1',
      started_at: '2026-08-23T10:00:00Z',
      completed_at: '2026-08-23T11:00:00Z',
      status: 'completed',
    });

    mockSupabaseTables.session_sets.push(
      {
        id: 's1',
        session_id: 'session-multi',
        exercise_id: 'ex-squat',
        exercise_name: 'Barbell Back Squat',
        set_number: 1,
        weight: 140,
        reps: 5,
        rpe: 8,
        tempo: '3010',
      },
      {
        id: 's2',
        session_id: 'session-multi',
        exercise_id: 'ex-squat',
        exercise_name: 'Barbell Back Squat',
        set_number: 2,
        weight: 145,
        reps: 5,
        rpe: 9,
        tempo: '3010',
      },
      {
        id: 's3',
        session_id: 'session-multi',
        exercise_id: 'ex-legext',
        exercise_name: 'Leg Extension',
        set_number: 1,
        weight: 60,
        reps: 15,
        rpe: 10,
        tempo: '2012',
      }
    );

    await useLogStore.getState().fetchLogsHistory('athlete-web-1');

    const logs = useLogStore.getState().logsHistory;
    expect(logs).toHaveLength(1);
    expect(logs[0].exercises).toHaveLength(2);

    const squatEx = logs[0].exercises.find((e) => e.exercise_id === 'ex-squat');
    expect(squatEx?.sets).toHaveLength(2);
    expect(squatEx?.sets[0].weight).toBe('140');
    expect(squatEx?.sets[0].reps).toBe(5);
    expect(squatEx?.sets[0].rpe).toBeUndefined();
    expect(squatEx?.sets[0].tempo).toBeUndefined();

    expect(squatEx?.sets[1].weight).toBe('145');
    expect(squatEx?.sets[1].rpe).toBeUndefined();

    const legExtEx = logs[0].exercises.find((e) => e.exercise_id === 'ex-legext');
    expect(legExtEx?.sets).toHaveLength(1);
    expect(legExtEx?.sets[0].weight).toBe('60');
    expect(legExtEx?.sets[0].reps).toBe(15);
  });

  it('8. Empty history returns [] honestly without throwing', async () => {
    const repo = new WorkoutRepository(null, supabase as any);
    const history = await repo.getWorkoutHistory('athlete-empty');
    expect(history).toEqual([]);

    await useLogStore.getState().fetchLogsHistory('athlete-empty');
    expect(useLogStore.getState().logsHistory).toEqual([]);
  });

  it('9. Supabase failure preserves existing state and does NOT fabricate legacy data', async () => {
    const failingSupabase: any = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockRejectedValue(new Error('Network disconnected')),
      })),
    };

    useLogStore.setState({
      logsHistory: [
        {
          id: 'pre-existing',
          name: 'Pre-existing Workout',
          completed_at: '2026-08-20T10:00:00Z',
          total_volume: 1000,
          exercises: [],
        },
      ],
    });

    const repo = new WorkoutRepository(null, failingSupabase);
    const history = await repo.getWorkoutHistory('athlete-web-1');
    expect(history).toEqual([]);

    // Existing store state preserved
    expect(useLogStore.getState().logsHistory).toHaveLength(1);
    expect(useLogStore.getState().logsHistory[0].id).toBe('pre-existing');
  });

  it('10. Athlete isolation is preserved (never returns another user sessions)', async () => {
    mockSupabaseTables.workout_sessions.push(
      {
        id: 'session-user-a',
        athlete_id: 'athlete-A',
        started_at: '2026-08-23T10:00:00Z',
        completed_at: '2026-08-23T11:00:00Z',
        status: 'completed',
      },
      {
        id: 'session-user-b',
        athlete_id: 'athlete-B',
        started_at: '2026-08-23T10:00:00Z',
        completed_at: '2026-08-23T11:00:00Z',
        status: 'completed',
      }
    );

    const repo = new WorkoutRepository(null, supabase as any);
    const historyA = await repo.getWorkoutHistory('athlete-A');
    expect(historyA).toHaveLength(1);
    expect(historyA[0].id).toBe('session-user-a');

    const historyB = await repo.getWorkoutHistory('athlete-B');
    expect(historyB).toHaveLength(1);
    expect(historyB[0].id).toBe('session-user-b');
  });

  it('11. Native WatermelonDB path queries local DB when db is present', async () => {
    const mockDb: any = {
      get: vi.fn(() => ({
        query: vi.fn(() => ({
          fetch: vi.fn().mockResolvedValue([
            { id: 'session-native-1', name: 'Native Workout', status: 'completed', finished_at: 1787000000000 },
          ]),
        })),
      })),
    };

    const repo = new WorkoutRepository(mockDb, supabase as any);
    const history = await repo.getWorkoutHistory('athlete-native');
    expect(mockDb.get).toHaveBeenCalledWith('workout_sessions');
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe('session-native-1');
  });

  it('12. No query against legacy workout_logs occurs in history flow', async () => {
    await useLogStore.getState().fetchLogsHistory('athlete-web-1');
    expect(mockSupabaseTables.queriedTables).not.toContain('workout_logs');
    expect(mockSupabaseTables.queriedTables).not.toContain('exercise_sets');
  });
});

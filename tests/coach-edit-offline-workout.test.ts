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

vi.mock('../apps/mobile/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'athlete-1' } }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'athlete-1' } } }, error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      upsert: vi.fn(async () => ({ data: [], error: null })),
    })),
  },
}));

import { SyncManager } from '@yeti/sync';
import { useSessionStore } from '../apps/mobile/store/useSessionStore';

function createMockDatabase() {
  const store: Record<string, any[]> = {
    workout_plans: [],
    plan_days: [],
    plan_exercises: [],
    assigned_plans: [],
    workout_sessions: [],
    session_sets: [],
    exercises: [],
  };

  const db: any = {
    store,
    write: async (fn: () => Promise<any>) => fn(),
    get: (tableName: string) => ({
      find: async (id: string) => {
        const item = (store[tableName] || []).find((r) => r.id === id);
        if (!item) throw new Error(`Not found in ${tableName}: ${id}`);
        return {
          ...item,
          _raw: item,
          update: async (mutator: (rec: any) => void) => {
            mutator(item);
            return item;
          },
          markAsDeleted: async () => {
            store[tableName] = store[tableName].filter((r) => r.id !== id);
          },
        };
      },
      create: async (builder: (rec: any) => void) => {
        const row: any = { id: `${tableName}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, _raw: {} };
        builder(row);
        (store[tableName] ||= []).push(row);
        return {
          ...row,
          _raw: row,
          update: async (mutator: (rec: any) => void) => {
            mutator(row);
            return row;
          },
        };
      },
      query: (..._args: any[]) => ({
        fetch: async () => {
          return (store[tableName] || []).map((r) => ({
            ...r,
            _raw: r,
            update: async (mutator: (rec: any) => void) => {
              mutator(r);
              return r;
            },
          }));
        },
      }),
    }),
  };
  return db;
}

describe('Scenario A: Coach Edit While Athlete Offline', () => {
  let localDb: any;
  let remoteTables: Record<string, any[]>;
  let mockSupabase: any;

  beforeEach(() => {
    useSessionStore.setState({ activeSession: null, elapsedSeconds: 0, isLoading: false, isSaving: false });

    localDb = createMockDatabase();
    remoteTables = {
      workout_plans: [],
      plan_days: [],
      plan_exercises: [],
      assigned_plans: [],
      workout_sessions: [],
      session_sets: [],
      workout_plan_sync_deletions: [],
    };

    mockSupabase = {
      from: vi.fn((table: string) => {
        const tableRows = remoteTables[table] ||= [];
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          gt: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockReturnThis(),
          upsert: vi.fn(async (rows: any[]) => {
            const arr = Array.isArray(rows) ? rows : [rows];
            for (const r of arr) {
              const idx = tableRows.findIndex((existing) => existing.id === r.id);
              if (idx >= 0) tableRows[idx] = { ...tableRows[idx], ...r };
              else tableRows.push({ ...r });
            }
            return { data: arr, error: null };
          }),
          delete: vi.fn(async () => ({ error: null })),
        };
      }),
      functions: {
        invoke: vi.fn(),
      },
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'athlete-1' } }, error: null }),
        getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'athlete-1' } } }, error: null }),
      },
    };
  });

  it('preserves active workout snapshot when coach replaces plan_days server-side, syncs cleanly upon reconnect', async () => {
    // 1. Initial State: Athlete is assigned Plan A with Day 1 (Bench Press)
    const planAId = 'plan-a-uuid';
    const day1OldId = 'day-1-old-uuid';
    const planEx1OldId = 'plan-ex-1-old-uuid';
    const exerciseBenchId = 'ex-bench-uuid';

    // Seed local WatermelonDB
    localDb.store.workout_plans.push({ id: planAId, name: 'Hypertrophy Block A', coach_id: 'coach-1', user_id: null, createdAt: Date.now(), updatedAt: Date.now() });
    localDb.store.plan_days.push({ id: day1OldId, plan_id: planAId, day_number: 1, name: 'Chest Day', createdAt: Date.now(), updatedAt: Date.now() });
    localDb.store.plan_exercises.push({
      id: planEx1OldId,
      plan_day_id: day1OldId,
      exercise_id: exerciseBenchId,
      sets: '3',
      reps: '10',
      weight: '80',
      order_index: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    localDb.store.assigned_plans.push({
      id: 'assign-1',
      plan_id: planAId,
      athlete_id: 'athlete-1',
      assigned_at: Date.now() - 100000,
      start_date: '2026-08-20',
      updated_at: Date.now() - 100000,
    });
    localDb.store.exercises.push({
      id: exerciseBenchId,
      name: 'Barbell Bench Press',
      muscle_group: 'Chest',
    });

    // 2. Athlete starts Day 1 workout while online / initially loaded
    await useSessionStore.getState().startSession({
      userId: 'athlete-1',
      planDayId: day1OldId,
      assignmentId: 'assign-1',
      sessionName: 'Chest Day',
      exercises: [
        {
          exerciseId: exerciseBenchId,
          exerciseName: 'Barbell Bench Press',
          targetSets: 3,
          targetReps: '10',
          targetWeightKg: 80,
          planExerciseId: planEx1OldId,
        },
      ],
    });

    const activeSession = useSessionStore.getState().activeSession;
    expect(activeSession).not.toBeNull();
    expect(activeSession?.exercises[0].exerciseName).toBe('Barbell Bench Press');
    expect(activeSession?.planDayId).toBe(day1OldId);

    // 3. Network goes offline.
    // 4. Simultaneously on server, Coach edits Plan A (deletes Day 1, inserts Day 1 with Squats)
    const day1NewId = 'day-1-new-uuid';
    const planEx1NewId = 'plan-ex-1-new-uuid';
    const exerciseSquatId = 'ex-squat-uuid';

    remoteTables.workout_plans = [{ id: planAId, name: 'Hypertrophy Block A - Revised', coach_id: 'coach-1', updated_at: new Date().toISOString() }];
    remoteTables.plan_days = [{ id: day1NewId, plan_id: planAId, day_number: 1, name: 'Leg Day', updated_at: new Date().toISOString() }];
    remoteTables.plan_exercises = [{
      id: planEx1NewId,
      plan_day_id: day1NewId,
      exercise_id: exerciseSquatId,
      sets: '4',
      reps: '8',
      weight: '120',
      updated_at: new Date().toISOString(),
    }];
    remoteTables.workout_plan_sync_deletions = [
      { table_name: 'plan_days', record_id: day1OldId, audience_ids: ['athlete-1'], deleted_at: new Date().toISOString() },
      { table_name: 'plan_exercises', record_id: planEx1OldId, audience_ids: ['athlete-1'], deleted_at: new Date().toISOString() },
    ];

    // 5. Athlete continues workout offline: logs sets
    await useSessionStore.getState().completeSet(0, 0, 'athlete-1');
    useSessionStore.getState().updateSet(0, 0, { weightKg: 80, reps: 10, rpe: 8 });
    await useSessionStore.getState().completeSet(0, 1, 'athlete-1');
    useSessionStore.getState().updateSet(0, 1, { weightKg: 82.5, reps: 10, rpe: 8.5 });

    // Active session snapshot MUST NOT have changed mid-workout
    expect(useSessionStore.getState().activeSession?.exercises[0].exerciseName).toBe('Barbell Bench Press');
    expect(useSessionStore.getState().activeSession?.exercises[0].sets[0].isCompleted).toBe(true);

    // 6. Athlete finishes workout offline
    const finishResult = await useSessionStore.getState().finishSession();
    expect(finishResult.sessionId).not.toBeNull();
    expect(finishResult.persisted).toBe(false);
    expect(finishResult.pendingRetry).toBe(true);
    expect(useSessionStore.getState().activeSession?.id).toBe(activeSession?.id);
    expect(useSessionStore.getState().terminalState).toBe('ACTIVE');
    expect(remoteTables.workout_sessions).toHaveLength(0);
    expect(remoteTables.session_sets).toHaveLength(0);

    // 7. Athlete reconnects and syncs (push changes to server)
    const sessionId = finishResult.sessionId!;
    const pushedSessions = [
      {
        id: sessionId,
        athlete_id: 'athlete-1',
        plan_day_id: day1OldId,
        started_at: Date.now() - 3600000,
        finished_at: Date.now(),
        duration_seconds: 3600,
      },
    ];
    const pushedSets = [
      {
        id: 'set-1',
        session_id: sessionId,
        plan_exercise_id: planEx1OldId,
        exercise_id: exerciseBenchId,
        exercise_name: 'Barbell Bench Press',
        set_number: 1,
        weight_kg: 80,
        reps: 10,
        completed_at: Date.now() - 3000000,
      },
      {
        id: 'set-2',
        session_id: sessionId,
        plan_exercise_id: planEx1OldId,
        exercise_id: exerciseBenchId,
        exercise_name: 'Barbell Bench Press',
        set_number: 2,
        weight_kg: 82.5,
        reps: 10,
        completed_at: Date.now() - 2500000,
      },
    ];

    // Mock sync-push invocation
    mockSupabase.functions.invoke.mockImplementation(async (fnName: string, { body }: any) => {
      if (fnName === 'sync-push') {
        if (body.changes?.workout_sessions) {
          for (const s of body.changes.workout_sessions.created) {
            remoteTables.workout_sessions.push(s);
          }
        }
        if (body.changes?.session_sets) {
          for (const s of body.changes.session_sets.created) {
            remoteTables.session_sets.push(s);
          }
        }
        return { data: { success: true }, error: null };
      }
      if (fnName === 'sync-pull') {
        return {
          data: {
            changes: {
              workout_plans: { created: [], updated: remoteTables.workout_plans, deleted: [] },
              plan_days: { created: remoteTables.plan_days, updated: [], deleted: [day1OldId] },
              plan_exercises: { created: remoteTables.plan_exercises, updated: [], deleted: [planEx1OldId] },
              assigned_plans: { created: [], updated: [], deleted: [] },
              workout_sessions: { created: [], updated: [], deleted: [] },
              session_sets: { created: [], updated: [], deleted: [] },
              meal_logs: { created: [], updated: [], deleted: [] },
              measurements: { created: [], updated: [], deleted: [] },
              exercises: { created: [], updated: [], deleted: [] },
            },
            timestamp: Date.now(),
          },
          error: null,
        };
      }
      return { data: null, error: null };
    });

    const syncManager = new SyncManager(localDb, mockSupabase);
    await syncManager.pushChanges({
      changes: {
        workout_sessions: { created: pushedSessions, updated: [], deleted: [] },
        session_sets: { created: pushedSets, updated: [], deleted: [] },
      } as any,
      lastPulledAt: Date.now() - 200000,
    });

    // Verification: Workout session and sets are safely pushed and persisted
    expect(remoteTables.workout_sessions).toHaveLength(1);
    expect(remoteTables.workout_sessions[0].id).toBe(sessionId);
    expect(remoteTables.session_sets).toHaveLength(2);
    expect(remoteTables.session_sets[0].exercise_name).toBe('Barbell Bench Press');

    // Pull down new plan changes
    const pullResult = await syncManager.pullChanges({
      lastPulledAt: Date.now() - 200000,
      schemaVersion: 8,
      migration: null,
    });

    expect(pullResult.changes.plan_days.deleted).toContain(day1OldId);
    expect(pullResult.changes.plan_days.created[0].id).toBe(day1NewId);
    expect(pullResult.changes.plan_days.created[0].name).toBe('Leg Day');
  });
});

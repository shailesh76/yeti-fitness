import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SyncManager } from '../packages/sync/src/SyncManager';

function createMockDeviceDb() {
  const store: Record<string, any[]> = {
    workout_sessions: [],
    session_sets: [],
  };

  return {
    store,
    write: async (fn: () => Promise<any>) => fn(),
    get: (table: string) => ({
      create: async (builder: (r: any) => void) => {
        const row: any = { _raw: {} };
        builder(row);
        (store[table] ||= []).push(row);
        return row;
      },
      find: async (id: string) => {
        const item = (store[table] || []).find((r) => r.id === id);
        if (!item) throw new Error(`Not found: ${id}`);
        return {
          ...item,
          update: async (mutator: (r: any) => void) => { mutator(item); },
        };
      },
      query: () => ({
        fetch: async () => store[table] || [],
      }),
    }),
  } as any;
}

describe('Scenario C: Cross-Device Workout Completion & Sync', () => {
  let serverSessions: any[];
  let serverSets: any[];
  let mockSupabase: any;

  beforeEach(() => {
    serverSessions = [];
    serverSets = [];

    mockSupabase = {
      functions: {
        invoke: vi.fn(async (fnName: string, { body }: any) => {
          if (fnName === 'sync-push') {
            if (body.changes?.workout_sessions) {
              const toUpsert = [...(body.changes.workout_sessions.created || []), ...(body.changes.workout_sessions.updated || [])];
              for (const s of toUpsert) {
                const idx = serverSessions.findIndex((x) => x.id === s.id);
                if (idx >= 0) serverSessions[idx] = { ...serverSessions[idx], ...s };
                else serverSessions.push({ ...s });
              }
            }
            if (body.changes?.session_sets) {
              const toUpsert = [...(body.changes.session_sets.created || []), ...(body.changes.session_sets.updated || [])];
              for (const st of toUpsert) {
                const idx = serverSets.findIndex((x) => x.id === st.id);
                if (idx >= 0) serverSets[idx] = { ...serverSets[idx], ...st };
                else serverSets.push({ ...st });
              }
            }
            return { data: { success: true }, error: null };
          }
          if (fnName === 'sync-pull') {
            return {
              data: {
                changes: {
                  workout_sessions: { created: serverSessions, updated: [], deleted: [] },
                  session_sets: { created: serverSets, updated: [], deleted: [] },
                  workout_plans: { created: [], updated: [], deleted: [] },
                  plan_days: { created: [], updated: [], deleted: [] },
                  plan_exercises: { created: [], updated: [], deleted: [] },
                  assigned_plans: { created: [], updated: [], deleted: [] },
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
        }),
      },
    };
  });

  it('Phone A pushes completed session offline; Phone B pulls and receives exact duplicate-free session graph', async () => {
    const phoneADb = createMockDeviceDb();
    const phoneBDb = createMockDeviceDb();

    const sessionId = 'session-cross-device-uuid';
    const finishedAt = Date.now() - 600000;

    // 1. Phone A records completed workout offline
    const sessionRecord = {
      id: sessionId,
      athlete_id: 'athlete-1',
      plan_day_id: 'day-1-uuid',
      name: 'Full Body A',
      status: 'completed',
      started_at: finishedAt - 3600000,
      finished_at: finishedAt,
      duration_seconds: 3600,
      total_volume_kg: 2400,
    };
    const setRecords = [
      { id: 'set-cd-1', session_id: sessionId, exercise_id: 'ex-1', set_number: 1, weight_kg: 100, reps: 10, completed_at: finishedAt - 3000000 },
      { id: 'set-cd-2', session_id: sessionId, exercise_id: 'ex-1', set_number: 2, weight_kg: 100, reps: 10, completed_at: finishedAt - 2000000 },
    ];

    phoneADb.store.workout_sessions.push(sessionRecord);
    phoneADb.store.session_sets.push(...setRecords);

    // 2. Phone A reconnects and pushes
    const syncManagerA = new SyncManager(phoneADb, mockSupabase);
    await syncManagerA.pushChanges({
      changes: {
        workout_sessions: { created: [sessionRecord], updated: [], deleted: [] },
        session_sets: { created: setRecords, updated: [], deleted: [] },
      } as any,
      lastPulledAt: 0,
    });

    expect(serverSessions).toHaveLength(1);
    expect(serverSets).toHaveLength(2);

    // 3. Phone B sync-pulls
    const syncManagerB = new SyncManager(phoneBDb, mockSupabase);
    const pullResultB = await syncManagerB.pullChanges({
      lastPulledAt: 0,
      schemaVersion: 8,
      migration: null,
    });

    expect(pullResultB.changes.workout_sessions.created).toHaveLength(1);
    expect(pullResultB.changes.workout_sessions.created[0].id).toBe(sessionId);
    expect(pullResultB.changes.session_sets.created).toHaveLength(2);

    // 4. Repeated sync-pull on Phone B with new timestamp receives 0 duplicates
    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: {
        changes: {
          workout_sessions: { created: [], updated: [], deleted: [] },
          session_sets: { created: [], updated: [], deleted: [] },
          workout_plans: { created: [], updated: [], deleted: [] },
          plan_days: { created: [], updated: [], deleted: [] },
          plan_exercises: { created: [], updated: [], deleted: [] },
          assigned_plans: { created: [], updated: [], deleted: [] },
          meal_logs: { created: [], updated: [], deleted: [] },
          measurements: { created: [], updated: [], deleted: [] },
          exercises: { created: [], updated: [], deleted: [] },
        },
        timestamp: Date.now() + 1000,
      },
      error: null,
    });

    const secondPullResultB = await syncManagerB.pullChanges({
      lastPulledAt: pullResultB.timestamp,
      schemaVersion: 8,
      migration: null,
    });

    expect(secondPullResultB.changes.workout_sessions.created).toHaveLength(0);
    expect(secondPullResultB.changes.session_sets.created).toHaveLength(0);
  });
});

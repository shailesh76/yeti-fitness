import { describe, expect, it, vi } from 'vitest';
import { schema } from '../packages/database/src/schema';
import { WorkoutRepository } from '../packages/database/src/repositories/WorkoutRepository';
import { SyncManager } from '../packages/sync/src/SyncManager';

function offlineDatabase() {
  const rows: Record<string, any[]> = {};
  return {
    rows,
    write: async (work: () => Promise<any>) => work(),
    get: (table: string) => ({
      create: async (prepare: (row: any) => void) => {
        const tableRows = rows[table] ||= [];
        const row: any = { id: `${table}-${tableRows.length + 1}`, _raw: {} };
        prepare(row);
        tableRows.push(row);
        return row;
      },
    }),
  } as any;
}

describe('Step 4.6 offline workout plan sync', () => {
  it('registers the complete plan graph in WatermelonDB schema v7', () => {
    expect(schema.version).toBe(7);
    const names = Object.keys(schema.tables);
    expect(names).toEqual(expect.arrayContaining([
      'workout_plans', 'plan_days', 'plan_exercises', 'assigned_plans',
    ]));
  });

  it('creates an athlete template and its children without connectivity', async () => {
    const db = offlineDatabase();
    const supabase = { from: vi.fn(() => { throw new Error('network must not be used'); }) };
    const repository = new WorkoutRepository(db, supabase);

    const result = await repository.createOwnWorkoutPlan('athlete-1', 'Offline Push', 'airplane mode', [
      { exerciseId: 'exercise-1', sets: '4', reps: '8', targetRpe: 8 },
    ]);

    expect(result).toEqual({ planId: 'workout_plans-1', planDayId: 'plan_days-1' });
    expect(db.rows.workout_plans).toHaveLength(1);
    expect(db.rows.plan_days).toHaveLength(1);
    expect(db.rows.plan_exercises).toHaveLength(1);
    expect(db.rows.plan_exercises[0]).toMatchObject({
      plan_day_id: 'plan_days-1', exercise_id: 'exercise-1', sets: '4', reps: '8', target_rpe: 8,
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('forwards plan changes and the pull timestamp used for server conflict detection', async () => {
    const changes = {
      workout_plans: { created: [], updated: [{ id: 'plan-1', name: 'Local edit' }], deleted: [] },
      plan_days: { created: [], updated: [], deleted: [] },
      plan_exercises: { created: [], updated: [], deleted: [] },
      assigned_plans: { created: [], updated: [], deleted: [] },
    };
    const invoke = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
    const manager = new SyncManager({} as any, { functions: { invoke } } as any);

    await manager.pushChanges({ changes, lastPulledAt: 1234 });

    expect(invoke).toHaveBeenCalledWith('sync-push', { body: { changes, lastPulledAt: 1234 } });
  });

  it('surfaces a server conflict without discarding the local edit', async () => {
    const manager = new SyncManager({} as any, { functions: { invoke: vi.fn().mockResolvedValue({
      data: null, error: { message: 'SYNC_CONFLICT:workout_plans' },
    }) } } as any);
    await expect(manager.pushChanges({ changes: { workout_plans: { created: [], updated: [], deleted: [] } }, lastPulledAt: 1 }))
      .rejects.toThrow('SYNC_CONFLICT:workout_plans');
  });
});

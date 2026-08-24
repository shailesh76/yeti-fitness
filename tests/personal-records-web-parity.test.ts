import { describe, expect, it, vi } from 'vitest';
import { WorkoutRepository } from '../packages/database/src/repositories/WorkoutRepository';
import { currentPersonalRecords } from '../apps/mobile/services/personalRecordPresentation';

describe('personal records web parity', () => {
  it('loads existing remote records with exercise display metadata', async () => {
    const rows = [{ id: 'pr-1', athlete_id: 'athlete', exercise_id: 'ex-1', record_type: 'max_weight', value: 10, achieved_at: '2026-07-08T00:00:00Z', exercises: { name: 'Press', muscle_group: 'Chest' } }];
    const order = vi.fn(async () => ({ data: rows, error: null }));
    const eq = vi.fn(() => ({ order }));
    const client = { from: vi.fn(() => ({ select: vi.fn(() => ({ eq })) })) };
    const repo = new WorkoutRepository(null as any, client as any);
    const result = await repo.getPersonalRecords('athlete');
    expect(result).toHaveLength(1);
    expect((result[0] as any).exercises.name).toBe('Press');
  });

  it('creates only evidence-based improvements from completed sets', async () => {
    const repo = new WorkoutRepository(null as any, {} as any);
    vi.spyOn(repo, 'getPersonalRecords').mockResolvedValue([
      { exercise_id: 'ex-1', record_type: 'max_weight', value: 10 } as any,
    ]);
    const save = vi.spyOn(repo, 'savePersonalRecord').mockResolvedValue({} as any);
    await repo.recordPersonalBests('athlete', [
      { exerciseId: 'ex-1', weight: 8, reps: 12 },
      { exerciseId: 'ex-1', weight: 12, reps: 8 },
    ]);
    expect(save).toHaveBeenCalledWith('athlete', 'ex-1', 'max_weight', 12);
    expect(save).toHaveBeenCalledWith('athlete', 'ex-1', 'max_reps', 12);
  });

  it('deduplicates identical history while retaining separate metrics', () => {
    const records = currentPersonalRecords([
      { id: 'a', exercise_id: 'ex-1', record_type: 'max_weight', value: 10, achieved_at: '2026-08-24T01:00:00Z' },
      { id: 'b', exercise_id: 'ex-1', record_type: 'max_weight', value: 10, achieved_at: '2026-08-24T02:00:00Z' },
      { id: 'c', exercise_id: 'ex-1', record_type: 'max_reps', value: 12, achieved_at: '2026-08-24T03:00:00Z' },
    ]);
    expect(records.map((record) => record.id).sort()).toEqual(['a', 'c']);
  });
});

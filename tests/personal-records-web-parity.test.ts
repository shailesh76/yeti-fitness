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

  it('ignores corrupt sets (>1000 reps, >2000 kg, non-positive) during recordPersonalBests and accepts heavy/high-rep lifts', async () => {
    const repo = new WorkoutRepository(null as any, {} as any);
    vi.spyOn(repo, 'getPersonalRecords').mockResolvedValue([]);
    const save = vi.spyOn(repo, 'savePersonalRecord').mockResolvedValue({} as any);
    await repo.recordPersonalBests('athlete', [
      { exerciseId: 'ex-1', weight: 3000, reps: 1100 }, // corrupt values
      { exerciseId: 'ex-2', weight: 700, reps: 500 },   // valid heavy/high-rep
    ]);
    expect(save).not.toHaveBeenCalledWith('athlete', 'ex-1', expect.anything(), expect.anything());
    expect(save).toHaveBeenCalledWith('athlete', 'ex-2', 'max_weight', 700);
    expect(save).toHaveBeenCalledWith('athlete', 'ex-2', 'max_reps', 500);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { persistWorkoutCompletion } from '../apps/mobile/services/workoutCompletionPersistence';

describe('PWA workout completion persistence', () => {
  it('writes the live session contract before sets and uses the persisted id', async () => {
    const calls: string[] = [];
    const sessionUpsert = vi.fn((row) => {
      calls.push('session');
      expect(Object.keys(row).sort()).toEqual([
        'athlete_id', 'completed_at', 'duration_seconds', 'id', 'plan_day_id', 'started_at',
      ]);
      return { select: () => ({ single: async () => ({ data: { id: row.id }, error: null }) }) };
    });
    const setsUpsert = vi.fn(async (rows) => {
      calls.push('sets');
      expect(rows[0].session_id).toBe('11111111-1111-4111-8111-111111111111');
      expect(Object.keys(rows[0]).sort()).toEqual([
        'completed_at', 'exercise_id', 'id', 'plan_exercise_id', 'reps', 'session_id', 'weight',
      ]);
      return { error: null };
    });
    const client = { from: (table: string) => table === 'workout_sessions'
      ? { upsert: sessionUpsert }
      : { upsert: setsUpsert } };
    const completedAt = '2026-08-24T10:00:00.000Z';
    await persistWorkoutCompletion(client, {
      session: { id: '11111111-1111-4111-8111-111111111111', athlete_id: 'athlete', plan_day_id: 'day', started_at: completedAt, completed_at: completedAt, duration_seconds: 120 },
      sets: [{ id: '22222222-2222-4222-8222-222222222222', session_id: '11111111-1111-4111-8111-111111111111', plan_exercise_id: 'plan-ex', exercise_id: 'exercise', weight: 10, reps: 8, completed_at: completedAt }],
    });
    expect(calls).toEqual(['session', 'sets']);
  });

  it('does not write sets if the session write fails', async () => {
    const setsUpsert = vi.fn();
    const client = { from: (table: string) => table === 'workout_sessions'
      ? { upsert: () => ({ select: () => ({ single: async () => ({ data: null, error: new Error('offline') }) }) }) }
      : { upsert: setsUpsert } };
    await expect(persistWorkoutCompletion(client, { session: { id: 'id', athlete_id: 'a', plan_day_id: null, started_at: 'x', completed_at: 'x', duration_seconds: 1 }, sets: [] })).rejects.toThrow('offline');
    expect(setsUpsert).not.toHaveBeenCalled();
  });
});

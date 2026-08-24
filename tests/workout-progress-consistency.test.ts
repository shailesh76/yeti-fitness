import { describe, expect, it } from 'vitest';
import { workoutDaysInRange } from '../apps/mobile/services/workoutLifecycle';

describe('workout progress consistency', () => {
  it('counts distinct completed local days from normalized sessions', () => {
    const start = new Date(2026, 7, 23).getTime();
    const end = new Date(2026, 7, 30).getTime();
    const history = [
      { id: 'a', completed_at: new Date(2026, 7, 24, 9).toISOString() },
      { id: 'b', completed_at: new Date(2026, 7, 24, 18).toISOString() },
    ];
    expect(workoutDaysInRange(history, start, end).size).toBe(1);
  });
});

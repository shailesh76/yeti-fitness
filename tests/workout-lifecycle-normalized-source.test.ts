import { describe, expect, it } from 'vitest';
import { completedPlanDayIds, nextUncompletedPlanDay } from '../apps/mobile/services/workoutLifecycle';

describe('normalized workout lifecycle', () => {
  it('advances to the first uncompleted day from durable session history', () => {
    const done = completedPlanDayIds([{ id: 'session-1', completed_at: '2026-08-24T01:00:00Z', plan_day_id: 'day-1' }]);
    expect(nextUncompletedPlanDay([{ plan_day_id: 'day-1' }, { plan_day_id: 'day-2' }], done)).toEqual({ plan_day_id: 'day-2' });
  });

  it('reports no current day when a one-day plan is complete', () => {
    expect(nextUncompletedPlanDay([{ plan_day_id: 'day-1' }], new Set(['day-1']))).toBeNull();
  });
});

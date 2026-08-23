import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useCoachStore } from '../apps/coach-dashboard/store/useCoachStore';

const mockState = vi.hoisted(() => ({
  assignedPlans: [] as any[],
  notifications: [] as any[],
  notificationInsertError: null as any,
  workoutPlans: [
    { id: 'plan-1', name: 'Powerbuilding Block 1', coach_id: 'coach-1' },
  ],
  coachClients: [
    { coach_id: 'coach-1', athlete_id: 'athlete-1' },
  ],
}));

vi.mock('../apps/coach-dashboard/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { user: { id: 'coach-1' } } },
        error: null,
      })),
    },
    from: vi.fn((table: string) => {
      if (table === 'coach_clients') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn(async () => ({ data: mockState.coachClients[0], error: null })),
        };
      }
      if (table === 'workout_plans') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn(async () => ({ data: mockState.workoutPlans[0], error: null })),
        };
      }
      if (table === 'assigned_plans') {
        return {
          insert: vi.fn(async (row: any) => {
            mockState.assignedPlans.push(row);
            return { data: row, error: null };
          }),
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
        };
      }
      if (table === 'notifications') {
        return {
          insert: vi.fn(async (row: any) => {
            if (mockState.notificationInsertError) {
              return { data: null, error: mockState.notificationInsertError };
            }
            mockState.notifications.push(row);
            return { data: row, error: null };
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };
    }),
    rpc: vi.fn(async () => ({ data: 100, error: null })),
  },
}));

describe('Scenario D: Notification Failure Resilience on Assignment', () => {
  beforeEach(() => {
    mockState.assignedPlans = [];
    mockState.notifications = [];
    mockState.notificationInsertError = null;
  });

  it('preserves assigned_plans row when notification insert fails, reporting honest outcome to coach', async () => {
    // Simulate notification failure (e.g. push notification service timeout or permission error)
    mockState.notificationInsertError = { message: 'Failed to deliver push notification token' };

    const outcome = await useCoachStore.getState().assignExistingPlan('plan-1', 'athlete-1', '2026-08-24');

    // 1. Assignment MUST NOT be rolled back
    expect(mockState.assignedPlans).toHaveLength(1);
    expect(mockState.assignedPlans[0]).toMatchObject({
      plan_id: 'plan-1',
      athlete_id: 'athlete-1',
      start_date: '2026-08-24',
    });

    // 2. Notification state must be honestly reported
    expect(outcome.notified).toBe(false);
    expect(outcome.notificationError).toBe('Failed to deliver push notification token');
    expect(outcome.duplicateSuppressed).toBe(false);

    // 3. Notification table was not polluted with broken rows
    expect(mockState.notifications).toHaveLength(0);
  });
});

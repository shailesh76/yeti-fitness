import { describe, expect, it, vi, beforeEach } from 'vitest';

const realtime = vi.hoisted(() => {
  const handlers: Array<(payload: any) => void> = [];
  const channels: Record<string, any> = {};
  const removeChannel = vi.fn(async () => 'ok');
  const channel = vi.fn((name: string) => {
    const value: any = {
      topic: name,
      on: vi.fn((_type: string, _filter: any, handler: (payload: any) => void) => {
        handlers.push(handler);
        return value;
      }),
      subscribe: vi.fn((cb?: (status: string) => void) => {
        if (cb) cb('SUBSCRIBED');
        return value;
      }),
    };
    channels[name] = value;
    return value;
  });
  return { handlers, channels, removeChannel, channel };
});

vi.mock('../apps/mobile/lib/supabase', () => ({
  supabase: {
    channel: realtime.channel,
    removeChannel: realtime.removeChannel,
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'assign-rt-1',
            plan_id: 'plan-rt-1',
            assigned_at: '2026-08-23T10:00:00Z',
            plan: {
              id: 'plan-rt-1',
              name: 'Realtime Assigned Plan',
              days: [{ id: 'd-rt', day_number: 1, name: 'Day 1', exercises: [] }],
            },
          },
        ],
        error: null,
      }),
    })),
  },
}));

vi.mock('../apps/mobile/database', () => ({
  database: null,
  isNativeDbAvailable: false,
}));

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

vi.mock('../apps/mobile/services/screenDataCache', () => ({
  invalidateScreenData: vi.fn(),
  getScreenData: vi.fn(),
  setScreenData: vi.fn(),
  persistScreenData: vi.fn(),
}));

vi.mock('../apps/mobile/services/notificationService', () => ({
  sendLocalNotification: vi.fn(),
}));

vi.mock('@yeti/database', () => ({
  WorkoutRepository: vi.fn().mockImplementation(() => ({
    fetchWorkoutPlansRemote: vi.fn(async () => [
      {
        id: 'assign-rt-1',
        plan_id: 'plan-rt-1',
        assigned_at: '2026-08-23T10:00:00Z',
        plan: {
          id: 'plan-rt-1',
          name: 'Realtime Assigned Plan',
          days: [{ id: 'd-rt', day_number: 1, name: 'Day 1', exercises: [] }],
        },
      },
    ]),
    fetchOwnWorkoutPlans: vi.fn(async () => []),
  })),
  ExerciseRepository: vi.fn().mockImplementation(() => ({
    getExercises: vi.fn(async () => []),
  })),
}));

import {
  startPlanRealtime,
  stopPlanRealtime,
  applyRealtimePlanEvent,
  getActivePlanRealtimeUserForTests,
} from '../apps/mobile/services/planRealtime';
import { useWorkoutStore } from '../apps/mobile/store/useWorkoutStore';

describe('Plan Realtime Service & Lifecycle Safety', () => {
  beforeEach(async () => {
    await stopPlanRealtime();
    useWorkoutStore.setState({ workoutPlans: [], activeAssignmentId: null, loading: false });
    realtime.handlers.length = 0;
    vi.clearAllMocks();
  });

  it('subscribes selectively with athlete_id filter', async () => {
    await startPlanRealtime('athlete-100');
    expect(getActivePlanRealtimeUserForTests()).toBe('athlete-100');
    expect(realtime.channel).toHaveBeenCalledWith('athlete-assigned-plans:athlete-100');

    const createdChannel = realtime.channels['athlete-assigned-plans:athlete-100'];
    expect(createdChannel).toBeDefined();
    expect(createdChannel.on).toHaveBeenNthCalledWith(
      1,
      'postgres_changes',
      expect.objectContaining({
        event: 'INSERT',
        schema: 'public',
        table: 'assigned_plans',
        filter: 'athlete_id=eq.athlete-100',
      }),
      expect.any(Function)
    );
    expect(createdChannel.on).toHaveBeenNthCalledWith(
      2,
      'postgres_changes',
      expect.objectContaining({
        event: 'UPDATE',
        schema: 'public',
        table: 'assigned_plans',
        filter: 'athlete_id=eq.athlete-100',
      }),
      expect.any(Function)
    );
  });

  it('cleans up previous subscription on account switch', async () => {
    await startPlanRealtime('athlete-100');
    expect(getActivePlanRealtimeUserForTests()).toBe('athlete-100');

    // Switch to athlete-200
    await startPlanRealtime('athlete-200');
    expect(realtime.removeChannel).toHaveBeenCalled();
    expect(getActivePlanRealtimeUserForTests()).toBe('athlete-200');
    expect(realtime.channel).toHaveBeenCalledWith('athlete-assigned-plans:athlete-200');
  });

  it('cleans up channel and resets state on stopPlanRealtime', async () => {
    await startPlanRealtime('athlete-100');
    await stopPlanRealtime();

    expect(getActivePlanRealtimeUserForTests()).toBeNull();
    expect(realtime.removeChannel).toHaveBeenCalled();
  });

  it('suppresses events intended for a different/stale user', async () => {
    await startPlanRealtime('athlete-current');

    const result = await applyRealtimePlanEvent('athlete-other', 'INSERT', {
      id: 'assign-evil',
      athlete_id: 'athlete-other',
      plan_id: 'plan-evil',
    });

    expect(result).toBe(false);
    expect(useWorkoutStore.getState().workoutPlans).toHaveLength(0);
  });

  it('applies realtime event and triggers targeted store reconciliation without full reload', async () => {
    await startPlanRealtime('athlete-current');

    const result = await applyRealtimePlanEvent('athlete-current', 'INSERT', {
      id: 'assign-rt-1',
      athlete_id: 'athlete-current',
      plan_id: 'plan-rt-1',
    });

    expect(result).toBe(true);
    expect(useWorkoutStore.getState().activeAssignmentId).toBe('assign-rt-1');
    expect(useWorkoutStore.getState().workoutPlans).toHaveLength(1);
    expect(useWorkoutStore.getState().workoutPlans[0].name).toBe('Realtime Assigned Plan - Day 1');
  });
});

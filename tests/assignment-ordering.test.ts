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

const mockRemotePlans = vi.hoisted(() => [] as any[]);

vi.mock('../apps/mobile/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockRemotePlans,
        error: null,
      }),
    })),
  },
}));

vi.mock('../apps/mobile/database', () => ({
  database: null,
  isNativeDbAvailable: false,
}));

vi.mock('../apps/mobile/services/notificationService', () => ({
  sendLocalNotification: vi.fn().mockResolvedValue(undefined),
}));

import { useWorkoutStore } from '../apps/mobile/store/useWorkoutStore';

describe('Scenario B: Assignment Ordering & Resolution', () => {
  beforeEach(() => {
    mockRemotePlans.length = 0;
    useWorkoutStore.setState({
      workoutPlans: [],
      activeAssignmentId: null,
      activePlanId: null,
      assignedAt: null,
      loading: false,
    });
  });

  it('resolves active plan by highest assigned_at when Plan A -> Plan B -> Plan A assigned over time', async () => {
    const t1 = new Date('2026-08-01T10:00:00Z').toISOString();
    const t2 = new Date('2026-08-10T10:00:00Z').toISOString();
    const t3 = new Date('2026-08-20T10:00:00Z').toISOString();

    const planA = {
      id: 'plan-a',
      name: 'Plan Alpha',
      coach: { full_name: 'Coach Sarah' },
      days: [{ id: 'd1', day_number: 1, name: 'Upper', exercises: [{ id: 'pe1', exercise_id: 'e1', sets: '3', reps: '10' }] }],
    };

    const planB = {
      id: 'plan-b',
      name: 'Plan Beta',
      coach: { full_name: 'Coach Sarah' },
      days: [{ id: 'd2', day_number: 1, name: 'Lower', exercises: [{ id: 'pe2', exercise_id: 'e2', sets: '4', reps: '8' }] }],
    };

    // Simulated remote database state with history:
    // Assignment 1: Plan A (T1)
    // Assignment 2: Plan B (T2)
    // Assignment 3: Plan A again (T3)
    mockRemotePlans.push(
      { id: 'assign-1', plan_id: 'plan-a', athlete_id: 'athlete-1', assigned_at: t1, plan: planA },
      { id: 'assign-2', plan_id: 'plan-b', athlete_id: 'athlete-1', assigned_at: t2, plan: planB },
      { id: 'assign-3', plan_id: 'plan-a', athlete_id: 'athlete-1', assigned_at: t3, plan: planA },
    );

    await useWorkoutStore.getState().syncWorkoutPlans('athlete-1');

    const state = useWorkoutStore.getState();
    // Most recent assignment (T3 -> assign-3, Plan Alpha) must be active
    expect(state.activeAssignmentId).toBe('assign-3');
    expect(state.activePlanId).toBe('plan-a');
    expect(state.assignedAt).toBe(t3);

    // Only the deterministic newest assignment drives the athlete's active
    // lifecycle. Historical assignments remain remote history, not startable days.
    expect(state.workoutPlans).toHaveLength(1);
    expect(state.workoutPlans[0].assignment_id).toBe('assign-3');
    expect(state.workoutPlans[0].name).toBe('Plan Alpha - Upper');
  });

  it('uses deterministic secondary tie-breaker when assigned_at timestamps are identical', async () => {
    const sameTime = new Date('2026-08-20T12:00:00Z').toISOString();

    const planX = {
      id: 'plan-x',
      name: 'Plan X',
      coach: { full_name: 'Coach Dave' },
      days: [{ id: 'dx', day_number: 1, name: 'Day X', exercises: [] }],
    };

    const planY = {
      id: 'plan-y',
      name: 'Plan Y',
      coach: { full_name: 'Coach Dave' },
      days: [{ id: 'dy', day_number: 1, name: 'Day Y', exercises: [] }],
    };

    // Two assignments created at identical millisecond
    mockRemotePlans.push(
      { id: 'assign-aaa', plan_id: 'plan-x', athlete_id: 'athlete-1', assigned_at: sameTime, plan: planX },
      { id: 'assign-zzz', plan_id: 'plan-y', athlete_id: 'athlete-1', assigned_at: sameTime, plan: planY },
    );

    await useWorkoutStore.getState().syncWorkoutPlans('athlete-1');

    const state = useWorkoutStore.getState();
    // Deterministic tie-breaker selects higher ID ('assign-zzz')
    expect(state.activeAssignmentId).toBe('assign-zzz');
    expect(state.activePlanId).toBe('plan-y');
  });
});

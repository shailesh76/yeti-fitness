import { beforeEach, describe, expect, it, vi } from 'vitest';

type Result = { data: any; error: any };
type Insert = { table: string; payload: any };

const mocks = vi.hoisted(() => ({
  authResult: { data: { session: { user: { id: 'coach-1' } } }, error: null } as Result,
  tableResults: new Map<string, Result>(),
  rpcResult: { data: 77, error: null } as Result,
  inserts: [] as Insert[],
  filterCalls: [] as { table: string; method: string; args: any[] }[],
}));

function queryFor(table: string) {
  const query: any = {};
  for (const method of ['select', 'eq', 'in', 'gte', 'order', 'limit', 'update']) {
    query[method] = (...args: any[]) => {
      mocks.filterCalls.push({ table, method, args });
      return query;
    };
  }
  const settle = () => Promise.resolve(mocks.tableResults.get(table) || { data: [], error: null });
  query.single = settle;
  query.maybeSingle = settle;
  query.insert = (payload: any) => {
    mocks.inserts.push({ table, payload });
    const res = mocks.tableResults.get(`${table}:insert`) || { data: null, error: null };
    const chain: any = Promise.resolve(res);
    chain.select = () => ({ single: () => Promise.resolve(res), maybeSingle: () => Promise.resolve(res) });
    return chain;
  };
  query.then = (resolve: (v: Result) => unknown, reject: (r: unknown) => unknown) => settle().then(resolve, reject);
  return query;
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn(async () => mocks.authResult) },
    from: vi.fn((table: string) => queryFor(table)),
    rpc: vi.fn(async () => mocks.rpcResult),
  },
}));

import { useCoachStore } from '../../store/useCoachStore';

const linkedAthlete = () => {
  mocks.tableResults.set('coach_clients', { data: { athlete_id: 'athlete-1' }, error: null });
  mocks.tableResults.set('profiles', {
    data: {
      id: 'athlete-1',
      full_name: 'Real Athlete',
      age: 28,
      gender: 'Female',
      goal: 'LOSE_FAT',
      height_cm: 165,
      weight_kg: 61,
      body_fat_percent: 22,
      daily_calorie_target: 1900,
    },
    error: null,
  });
};

beforeEach(() => {
  mocks.authResult = { data: { session: { user: { id: 'coach-1' } } }, error: null };
  mocks.tableResults.clear();
  mocks.rpcResult = { data: 77, error: null };
  mocks.inserts.length = 0;
  mocks.filterCalls.length = 0;
  useCoachStore.setState({ clients: [] });
});

describe('getClientDetail authorization', () => {
  it('refuses an athlete who is not linked to this coach', async () => {
    mocks.tableResults.set('coach_clients', { data: null, error: null });
    const result = await useCoachStore.getState().getClientDetail('someone-elses-athlete');
    expect(result.status).toBe('unauthorized');
    expect(result.client).toBeNull();
    expect(result.logs).toEqual([]);
  });

  it('scopes the ownership check to the authenticated coach and requested athlete', async () => {
    linkedAthlete();
    await useCoachStore.getState().getClientDetail('athlete-1');
    const ownership = mocks.filterCalls.filter((c) => c.table === 'coach_clients' && c.method === 'eq');
    expect(ownership).toEqual([
      { table: 'coach_clients', method: 'eq', args: ['coach_id', 'coach-1'] },
      { table: 'coach_clients', method: 'eq', args: ['athlete_id', 'athlete-1'] },
    ]);
  });

  it('reports an unauthenticated session distinctly', async () => {
    mocks.authResult = { data: { session: null }, error: null };
    const result = await useCoachStore.getState().getClientDetail('athlete-1');
    expect(result.status).toBe('unauthenticated');
  });

  it('reports a missing profile distinctly from an unauthorized one', async () => {
    mocks.tableResults.set('coach_clients', { data: { athlete_id: 'athlete-1' }, error: null });
    mocks.tableResults.set('profiles', { data: null, error: null });
    const result = await useCoachStore.getState().getClientDetail('athlete-1');
    expect(result.status).toBe('not_found');
  });
});

describe('getClientDetail returns real profile data with no mock fallbacks', () => {
  it('maps the real profile columns', async () => {
    linkedAthlete();
    const { client, status } = await useCoachStore.getState().getClientDetail('athlete-1');
    expect(status).toBe('ok');
    expect(client).toMatchObject({
      id: 'athlete-1',
      name: 'Real Athlete',
      age: 28,
      gender: 'Female',
      goal: 'LOSE_FAT',
      heightCm: 165,
      weight: 61,
      bodyFatPercent: 22,
      calorieTarget: 1900,
    });
  });

  it('never falls back to the retired fabricated values', async () => {
    linkedAthlete();
    mocks.tableResults.set('profiles', { data: { id: 'athlete-1', full_name: 'Sparse Athlete' }, error: null });
    mocks.rpcResult = { data: null, error: null };
    const { client } = await useCoachStore.getState().getClientDetail('athlete-1');
    // Previously: adherenceScore 80, planName 'Current Plan', weight 170, calorieTarget 2000.
    expect(client?.adherenceScore).toBeNull();
    expect(client?.planName).toBeNull();
    expect(client?.weight).toBeNull();
    expect(client?.calorieTarget).toBeNull();
    expect(client?.avgHeartRate).toBeNull();
  });

  it('represents genuinely absent optional fields as null, not zero', async () => {
    linkedAthlete();
    mocks.tableResults.set('profiles', { data: { id: 'athlete-1', full_name: 'Sparse Athlete' }, error: null });
    const { client } = await useCoachStore.getState().getClientDetail('athlete-1');
    expect(client?.age).toBeNull();
    expect(client?.gender).toBeNull();
    expect(client?.heightCm).toBeNull();
    expect(client?.bodyFatPercent).toBeNull();
  });
});

describe('assignExistingPlan', () => {
  const okAssignment = () => {
    mocks.tableResults.set('coach_clients', { data: { athlete_id: 'athlete-1' }, error: null });
    mocks.tableResults.set('workout_plans', { data: { id: 'plan-1', name: 'Push Pull Legs' }, error: null });
  };

  it('writes assigned_plans and notifies the athlete', async () => {
    okAssignment();
    await useCoachStore.getState().assignExistingPlan('plan-1', 'athlete-1', '2026-09-01');

    const assignment = mocks.inserts.find((i) => i.table === 'assigned_plans');
    expect(assignment?.payload).toMatchObject({
      plan_id: 'plan-1',
      athlete_id: 'athlete-1',
      start_date: '2026-09-01',
    });

    const notification = mocks.inserts.find((i) => i.table === 'notifications');
    expect(notification?.payload).toMatchObject({ user_id: 'athlete-1', type: 'coach' });
  });

  it('defaults the start date to today when none is given', async () => {
    okAssignment();
    await useCoachStore.getState().assignExistingPlan('plan-1', 'athlete-1');
    const assignment = mocks.inserts.find((i) => i.table === 'assigned_plans');
    expect(assignment?.payload.start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('refuses an athlete who is not on this coach roster', async () => {
    mocks.tableResults.set('coach_clients', { data: null, error: null });
    await expect(useCoachStore.getState().assignExistingPlan('plan-1', 'other-athlete'))
      .rejects.toThrow(/not on your roster/i);
    expect(mocks.inserts.find((i) => i.table === 'assigned_plans')).toBeUndefined();
  });

  it('refuses a plan that does not belong to this coach', async () => {
    mocks.tableResults.set('coach_clients', { data: { athlete_id: 'athlete-1' }, error: null });
    mocks.tableResults.set('workout_plans', { data: null, error: null });
    await expect(useCoachStore.getState().assignExistingPlan('someone-elses-plan', 'athlete-1'))
      .rejects.toThrow(/not found on your account/i);
    expect(mocks.inserts.find((i) => i.table === 'assigned_plans')).toBeUndefined();
  });

  it('scopes the plan lookup to the authenticated coach', async () => {
    okAssignment();
    await useCoachStore.getState().assignExistingPlan('plan-1', 'athlete-1');
    expect(mocks.filterCalls).toContainEqual({ table: 'workout_plans', method: 'eq', args: ['coach_id', 'coach-1'] });
  });

  it('requires an authenticated coach', async () => {
    mocks.authResult = { data: { session: null }, error: null };
    await expect(useCoachStore.getState().assignExistingPlan('plan-1', 'athlete-1'))
      .rejects.toThrow(/not authenticated/i);
  });

  it('surfaces an assigned_plans write failure instead of reporting success', async () => {
    okAssignment();
    mocks.tableResults.set('assigned_plans:insert', { data: null, error: { message: 'insert denied' } });
    await expect(useCoachStore.getState().assignExistingPlan('plan-1', 'athlete-1'))
      .rejects.toMatchObject({ message: 'insert denied' });
  });

  it('adds a new assignment without deleting the athlete history', async () => {
    okAssignment();
    await useCoachStore.getState().assignExistingPlan('plan-1', 'athlete-1');
    const destructive = mocks.filterCalls.filter((c) => c.table === 'assigned_plans' && ['delete', 'update'].includes(c.method));
    expect(destructive).toEqual([]);
  });
});

describe('assignNutritionTargets', () => {
  it('writes the canonical targets through the scoped RPC, not a direct profiles update', async () => {
    const { supabase } = await import('@/lib/supabase');
    const rpcSpy = vi.mocked(supabase.rpc);
    rpcSpy.mockClear();

    await useCoachStore.getState().assignNutritionTargets('athlete-1', {
      calories: 2100, protein: 160, carbs: 200, fat: 60,
    });

    expect(rpcSpy).toHaveBeenCalledWith('assign_client_nutrition_targets', {
      p_athlete_id: 'athlete-1',
      p_calorie_target: 2100,
      p_protein_target: 160,
      p_carb_target: 200,
      p_fat_target: 60,
      p_locked: true,
    });
    // No table-wide profiles UPDATE is issued any more; the coach has no such
    // privilege by design and updated_by is set server-side from auth.uid().
    expect(mocks.filterCalls.find((c) => c.table === 'profiles' && c.method === 'update')).toBeUndefined();
  });

  it('requires an authenticated coach', async () => {
    mocks.authResult = { data: { session: null }, error: null };
    await expect(useCoachStore.getState().assignNutritionTargets('athlete-1', {
      calories: 2100, protein: 160, carbs: 200, fat: 60,
    })).rejects.toThrow(/not authenticated/i);
  });

  it('propagates the RPC authorization failure rather than reporting success', async () => {
    const { supabase } = await import('@/lib/supabase');
    vi.mocked(supabase.rpc).mockResolvedValueOnce(
      { data: null, error: { message: 'This athlete is not on your roster' } } as any,
    );
    await expect(useCoachStore.getState().assignNutritionTargets('not-my-athlete', {
      calories: 2100, protein: 160, carbs: 200, fat: 60,
    })).rejects.toMatchObject({ message: expect.stringMatching(/not on your roster/i) });
  });
});

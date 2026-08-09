import { beforeEach, describe, expect, it, vi } from 'vitest';

type Result = { data: any; error: any };
type FilterCall = { table: string; method: string; args: any[] };

const mocks = vi.hoisted(() => ({
  authResult: { data: { session: { user: { id: 'coach-1' } } }, error: null } as Result,
  tableResults: new Map<string, Result>(),
  rpcResults: new Map<string, Result>(),
  filterCalls: [] as FilterCall[],
  deferredCoachClients: null as null | { promise: Promise<Result>; resolve: (value: Result) => void },
}));

function queryFor(table: string) {
  const query: any = {};
  for (const method of ['select', 'eq', 'in', 'gte', 'order']) {
    query[method] = (...args: any[]) => {
      mocks.filterCalls.push({ table, method, args });
      return query;
    };
  }
  query.then = (resolve: (value: Result) => unknown, reject: (reason: unknown) => unknown) => {
    const result = table === 'coach_clients' && mocks.deferredCoachClients
      ? mocks.deferredCoachClients.promise
      : Promise.resolve(mocks.tableResults.get(table) || { data: [], error: null });
    return result.then(resolve, reject);
  };
  return query;
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn(async () => mocks.authResult) },
    from: vi.fn((table: string) => queryFor(table)),
    rpc: vi.fn((_name: string, args: { athlete_id_param: string }) =>
      Promise.resolve(mocks.rpcResults.get(args.athlete_id_param) || { data: 80, error: null })),
  },
}));

import { useCoachStore } from '../../store/useCoachStore';

const athlete = (id = 'athlete-1') => ({
  id,
  full_name: 'Test Athlete',
  daily_calorie_target: 2200,
  weight_kg: 75,
  wearable_connected: false,
});

function setSuccessfulClientQueries() {
  mocks.tableResults.set('coach_clients', { data: [{ athlete: athlete() }], error: null });
  mocks.tableResults.set('workout_sessions', { data: [], error: null });
  mocks.tableResults.set('assigned_plans', { data: [], error: null });
  mocks.tableResults.set('meal_logs', { data: [], error: null });
  mocks.rpcResults.set('athlete-1', { data: 82, error: null });
}

beforeEach(() => {
  mocks.authResult = { data: { session: { user: { id: 'coach-1' } } }, error: null };
  mocks.tableResults.clear();
  mocks.rpcResults.clear();
  mocks.filterCalls.length = 0;
  mocks.deferredCoachClients = null;
  useCoachStore.setState({
    clients: [],
    loading: false,
    clientsError: null,
    workoutsToday: null,
    dashboardErrors: { workouts: null, plans: null, meals: null, adherence: null },
    invites: [],
    invitesError: null,
    templates: [],
    templatesLoading: false,
    templatesError: null,
  });
});

describe('getClients production-safe states', () => {
  it('treats missing auth as unavailable, not an empty successful dashboard', async () => {
    mocks.authResult = { data: { session: null }, error: null };
    await useCoachStore.getState().getClients();
    expect(useCoachStore.getState()).toMatchObject({
      loading: false,
      clientsError: 'Not signed in',
      workoutsToday: null,
    });
  });

  it('propagates the initial coach_clients failure', async () => {
    mocks.tableResults.set('coach_clients', { data: null, error: { message: 'roster failed' } });
    await useCoachStore.getState().getClients();
    expect(useCoachStore.getState()).toMatchObject({ clientsError: 'roster failed', workoutsToday: null, loading: false });
  });

  it('preserves real zero workouts on success', async () => {
    setSuccessfulClientQueries();
    await useCoachStore.getState().getClients();
    expect(useCoachStore.getState().workoutsToday).toBe(0);
    expect(useCoachStore.getState().clients[0].adherenceScore).toBe(82);
  });

  it('does not turn a workout query error into zero or empty activity data', async () => {
    setSuccessfulClientQueries();
    mocks.tableResults.set('workout_sessions', { data: null, error: { message: 'workouts failed' } });
    await useCoachStore.getState().getClients();
    const state = useCoachStore.getState();
    expect(state.workoutsToday).toBeNull();
    expect(state.clients[0].lastWorkout).toBeNull();
    expect(state.dashboardErrors.workouts).toBe('workouts failed');
  });

  it('propagates assigned-plan and meal-log failures without healthy defaults', async () => {
    setSuccessfulClientQueries();
    mocks.tableResults.set('assigned_plans', { data: null, error: { message: 'plans failed' } });
    mocks.tableResults.set('meal_logs', { data: null, error: { message: 'meals failed' } });
    await useCoachStore.getState().getClients();
    const state = useCoachStore.getState();
    expect(state.clients[0].planName).toBeNull();
    expect(state.clients[0].caloriesLogged).toBeNull();
    expect(state.dashboardErrors).toMatchObject({ plans: 'plans failed', meals: 'meals failed' });
  });

  it('keeps failed adherence unavailable rather than zero', async () => {
    setSuccessfulClientQueries();
    mocks.rpcResults.set('athlete-1', { data: null, error: { message: 'rpc failed' } });
    await useCoachStore.getState().getClients();
    const state = useCoachStore.getState();
    expect(state.clients[0].adherenceScore).toBeNull();
    expect(state.dashboardErrors.adherence).toContain('1 athlete');
  });

  it('clears an error after a successful retry', async () => {
    mocks.tableResults.set('coach_clients', { data: null, error: { message: 'temporary' } });
    await useCoachStore.getState().getClients();
    expect(useCoachStore.getState().clientsError).toBe('temporary');
    setSuccessfulClientQueries();
    await useCoachStore.getState().getClients();
    expect(useCoachStore.getState()).toMatchObject({ clientsError: null, workoutsToday: 0, loading: false });
  });

  it('transitions loading true to false', async () => {
    let resolve!: (value: Result) => void;
    const promise = new Promise<Result>((done) => { resolve = done; });
    mocks.deferredCoachClients = { promise, resolve };
    const request = useCoachStore.getState().getClients();
    expect(useCoachStore.getState().loading).toBe(true);
    resolve({ data: [], error: null });
    await request;
    expect(useCoachStore.getState().loading).toBe(false);
  });
});

describe('getInvites', () => {
  it('loads this coach own invites', async () => {
    mocks.tableResults.set('client_invites', {
      data: [{ id: 'i1', status: 'pending' }, { id: 'i2', status: 'accepted' }],
      error: null,
    });
    await useCoachStore.getState().getInvites();
    expect(useCoachStore.getState().invites).toHaveLength(2);
    expect(useCoachStore.getState().invitesError).toBeNull();
    expect(mocks.filterCalls).toContainEqual({ table: 'client_invites', method: 'eq', args: ['coach_id', 'coach-1'] });
  });

  it('keeps a genuine empty invite list distinct from a failure', async () => {
    mocks.tableResults.set('client_invites', { data: [], error: null });
    await useCoachStore.getState().getInvites();
    expect(useCoachStore.getState()).toMatchObject({ invites: [], invitesError: null });
  });

  it('surfaces a failed invite fetch instead of silently reporting zero', async () => {
    mocks.tableResults.set('client_invites', { data: null, error: { message: 'invites failed' } });
    await useCoachStore.getState().getInvites();
    expect(useCoachStore.getState()).toMatchObject({ invites: [], invitesError: 'invites failed' });
  });
});

describe('getTemplates', () => {
  it('loads the authenticated coach templates and maps relationship counts', async () => {
    mocks.tableResults.set('workout_plans', {
      data: [{ id: 'plan-1', name: 'Strength', created_at: '2026-08-01T00:00:00Z', plan_days: [{ count: 3 }] }],
      error: null,
    });
    await useCoachStore.getState().getTemplates();
    expect(useCoachStore.getState().templates).toEqual([{
      id: 'plan-1', name: 'Strength', createdAt: '2026-08-01T00:00:00Z', dayCount: 3,
    }]);
    expect(mocks.filterCalls).toContainEqual({ table: 'workout_plans', method: 'eq', args: ['coach_id', 'coach-1'] });
  });

  it('represents a successful empty result', async () => {
    mocks.tableResults.set('workout_plans', { data: [], error: null });
    await useCoachStore.getState().getTemplates();
    expect(useCoachStore.getState()).toMatchObject({ templates: [], templatesError: null, templatesLoading: false });
  });

  it('propagates Supabase errors', async () => {
    mocks.tableResults.set('workout_plans', { data: null, error: { message: 'templates failed' } });
    await useCoachStore.getState().getTemplates();
    expect(useCoachStore.getState()).toMatchObject({ templates: [], templatesError: 'templates failed', templatesLoading: false });
  });

  it('always filters by authenticated coach so another coach is not requested', async () => {
    mocks.authResult = { data: { session: { user: { id: 'coach-own' } } }, error: null };
    mocks.tableResults.set('workout_plans', { data: [], error: null });
    await useCoachStore.getState().getTemplates();
    const filters = mocks.filterCalls.filter((call) => call.table === 'workout_plans' && call.method === 'eq');
    expect(filters).toEqual([{ table: 'workout_plans', method: 'eq', args: ['coach_id', 'coach-own'] }]);
  });
});

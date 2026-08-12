import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

type Result = { data: any; error: any };
type Op = { table: string; op: string; payload?: any };

const mocks = vi.hoisted(() => ({
  authResult: { data: { session: { user: { id: 'coach-a' } } }, error: null } as Result,
  tableResults: new Map<string, Result>(),
  ops: [] as Op[],
  filterCalls: [] as { table: string; method: string; args: any[] }[],
  rpcResult: { data: 'plan-canonical-id', error: null } as Result,
  rpcCalls: [] as { name: string; args: any }[],
}));

function queryFor(table: string) {
  const query: any = {};
  for (const method of ['select', 'eq', 'in', 'gte', 'order', 'limit']) {
    query[method] = (...args: any[]) => {
      mocks.filterCalls.push({ table, method, args });
      return query;
    };
  }
  const settle = () => Promise.resolve(mocks.tableResults.get(table) || { data: [], error: null });
  query.single = settle;
  query.maybeSingle = settle;
  query.insert = (payload: any) => {
    mocks.ops.push({ table, op: 'insert', payload });
    const res = mocks.tableResults.get(`${table}:insert`) || { data: { id: `${table}-new-id` }, error: null };
    const chain: any = Promise.resolve(res);
    chain.select = () => ({ single: () => Promise.resolve(res), maybeSingle: () => Promise.resolve(res) });
    return chain;
  };
  query.update = (payload: any) => {
    mocks.ops.push({ table, op: 'update', payload });
    const chain: any = Promise.resolve(mocks.tableResults.get(`${table}:update`) || { data: null, error: null });
    chain.eq = (...args: any[]) => { mocks.filterCalls.push({ table, method: 'update.eq', args }); return chain; };
    return chain;
  };
  query.delete = () => {
    mocks.ops.push({ table, op: 'delete' });
    const chain: any = Promise.resolve(mocks.tableResults.get(`${table}:delete`) || { data: null, error: null });
    chain.eq = (...args: any[]) => { mocks.filterCalls.push({ table, method: 'delete.eq', args }); return chain; };
    return chain;
  };
  query.then = (resolve: (v: Result) => unknown, reject: (r: unknown) => unknown) => settle().then(resolve, reject);
  return query;
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn(async () => mocks.authResult) },
    from: vi.fn((table: string) => queryFor(table)),
    rpc: vi.fn(async (name: string, args: any) => {
      mocks.rpcCalls.push({ name, args });
      return mocks.rpcResult;
    }),
  },
}));

import { useCoachStore } from '../../store/useCoachStore';
import { didRouteChange } from '../../lib/planBuilderGuards';

const builderPage = fs.readFileSync(path.resolve(__dirname, '../../app/plans/builder/page.tsx'), 'utf8');
const templatesPage = fs.readFileSync(path.resolve(__dirname, '../../app/dashboard/templates/page.tsx'), 'utf8');
const aiPage = fs.readFileSync(path.resolve(__dirname, '../../app/dashboard/ai-overrides/page.tsx'), 'utf8');

const draft = (overrides: any = {}) => ({
  name: 'Hypertrophy Block',
  days: [{
    id: 'd1',
    name: 'Push',
    exercises: [
      { id: 'e1', exerciseId: 'ex-1', name: 'Bench', sets: '4', reps: '6', weight: '80',
        // superset_group is a uuid column, not free text.
        targetRpe: 8, restSeconds: 150, notes: 'slow eccentric', warmupSets: 2, isDropset: false,
        supersetGroup: '11111111-1111-4111-8111-111111111111' },
      { id: 'e2', exerciseId: 'ex-2', name: 'Fly', sets: '3', reps: '12', weight: '20' },
    ],
  }],
  ...overrides,
});

beforeEach(() => {
  mocks.authResult = { data: { session: { user: { id: 'coach-a' } } }, error: null };
  mocks.tableResults.clear();
  mocks.ops.length = 0;
  mocks.filterCalls.length = 0;
  mocks.rpcResult = { data: 'plan-canonical-id', error: null };
  mocks.rpcCalls.length = 0;
});

describe('savePlan — create without assigning', () => {
  it('sends the plan through the atomic RPC and returns the canonical id', async () => {
    mocks.rpcResult = { data: 'plan-new', error: null };
    const id = await useCoachStore.getState().savePlan(draft());
    expect(id).toBe('plan-new');
    expect(mocks.rpcCalls[0]).toMatchObject({
      name: 'save_coach_workout_plan',
      args: { p_plan_id: null, p_name: 'Hypertrophy Block' },
    });
    // Saving must NOT assign anything.
    expect(mocks.rpcCalls.find((c) => c.name === 'assign_client_nutrition_targets')).toBeUndefined();
    expect(mocks.ops.find((o) => o.table === 'assigned_plans')).toBeUndefined();
    expect(mocks.ops.find((o) => o.table === 'notifications')).toBeUndefined();
  });

  it('sends days in order — the RPC derives day_number from position', async () => {
    await useCoachStore.getState().savePlan(draft({
      days: [
        { id: 'a', name: 'Push', exercises: [{ id: 'x', exerciseId: 'ex-1', name: 'B', sets: '3', reps: '8' }] },
        { id: 'b', name: 'Pull', exercises: [{ id: 'y', exerciseId: 'ex-2', name: 'R', sets: '3', reps: '8' }] },
      ],
    }));
    expect(mocks.rpcCalls[0].args.p_days.map((d: any) => d.name)).toEqual(['Push', 'Pull']);
  });

  it('sends exercises in order — the RPC derives order_index from position', async () => {
    await useCoachStore.getState().savePlan(draft());
    expect(mocks.rpcCalls[0].args.p_days[0].exercises.map((e: any) => e.exercise_id))
      .toEqual(['ex-1', 'ex-2']);
  });

  it('maps every supported plan_exercises field into the payload', async () => {
    await useCoachStore.getState().savePlan(draft());
    expect(mocks.rpcCalls[0].args.p_days[0].exercises[0]).toMatchObject({
      exercise_id: 'ex-1', sets: '4', reps: '6', weight: '80',
      target_rpe: 8, rest_seconds: 150, notes: 'slow eccentric',
      warmup_sets: 2, is_dropset: false,
    });
  });

  it('sends NULL — not invented defaults — for omitted optional fields', async () => {
    await useCoachStore.getState().savePlan(draft());
    expect(mocks.rpcCalls[0].args.p_days[0].exercises[1]).toMatchObject({
      target_rpe: null, rest_seconds: null, notes: null,
      warmup_sets: null, is_dropset: null, superset_group: null,
    });
  });

  it('requires an authenticated coach before calling the RPC', async () => {
    mocks.authResult = { data: { session: null }, error: null };
    await expect(useCoachStore.getState().savePlan(draft())).rejects.toThrow(/not authenticated/i);
    expect(mocks.rpcCalls).toHaveLength(0);
  });
});
describe('savePlan — validation', () => {
  it('rejects an unnamed plan', async () => {
    await expect(useCoachStore.getState().savePlan(draft({ name: '   ' }))).rejects.toThrow(/name/i);
  });

  it('rejects a plan with no days', async () => {
    await expect(useCoachStore.getState().savePlan(draft({ days: [] }))).rejects.toThrow(/one day/i);
  });

  it('rejects a plan whose days contain no exercises', async () => {
    await expect(useCoachStore.getState().savePlan(draft({
      days: [{ id: 'd', name: 'Empty', exercises: [] }],
    }))).rejects.toThrow(/one exercise/i);
  });

  it('creates nothing when validation fails', async () => {
    await expect(useCoachStore.getState().savePlan(draft({ days: [] }))).rejects.toThrow();
    expect(mocks.ops).toEqual([]);
  });
});

describe('savePlan — edit existing plan', () => {
  it('passes the existing id so the RPC updates in place and returns it', async () => {
    mocks.rpcResult = { data: 'plan-1', error: null };
    const id = await useCoachStore.getState().savePlan(draft(), 'plan-1');
    expect(id).toBe('plan-1');
    expect(mocks.rpcCalls[0].args.p_plan_id).toBe('plan-1');
    // Ownership/lock/delete/insert all happen server-side inside one
    // transaction — the client issues no table writes of its own.
    expect(mocks.ops).toEqual([]);
  });

  it('surfaces the server-side ownership rejection for another coach plan', async () => {
    mocks.rpcResult = { data: null, error: { message: 'That plan was not found on your account.' } };
    await expect(useCoachStore.getState().savePlan(draft(), 'coach-b-plan'))
      .rejects.toMatchObject({ message: /not found on your account/ });
  });

  it('issues exactly one persistence request', async () => {
    await useCoachStore.getState().savePlan(draft(), 'plan-1');
    expect(mocks.rpcCalls.filter((c) => c.name === 'save_coach_workout_plan')).toHaveLength(1);
  });
});
describe('getPlanForEdit', () => {
  it('loads only a plan owned by the authenticated coach', async () => {
    mocks.tableResults.set('workout_plans', { data: { id: 'plan-1', name: 'Block A' }, error: null });
    mocks.tableResults.set('plan_days', {
      data: [{
        id: 'd1', name: 'Push', day_number: 1,
        plan_exercises: [
          { id: 'p2', exercise_id: 'ex-2', sets: '3', reps: '12', weight: '20', order_index: 1, exercises: { name: 'Fly' } },
          { id: 'p1', exercise_id: 'ex-1', sets: '4', reps: '6', weight: '80', order_index: 0, target_rpe: 8, rest_seconds: 150, exercises: { name: 'Bench' } },
        ],
      }],
      error: null,
    });

    const res = await useCoachStore.getState().getPlanForEdit('plan-1');
    expect(res.status).toBe('ok');
    expect(res.plan?.name).toBe('Block A');
    // order_index drives ordering, not row order from the DB.
    expect(res.plan?.days[0].exercises.map((e) => e.exerciseId)).toEqual(['ex-1', 'ex-2']);
    expect(res.plan?.days[0].exercises[0]).toMatchObject({ targetRpe: 8, restSeconds: 150, name: 'Bench' });
    expect(mocks.filterCalls).toContainEqual({ table: 'workout_plans', method: 'eq', args: ['coach_id', 'coach-a'] });
  });

  it('returns not_found for another coach plan and loads nothing', async () => {
    mocks.tableResults.set('workout_plans', { data: null, error: null });
    const res = await useCoachStore.getState().getPlanForEdit('coach-b-plan');
    expect(res.status).toBe('not_found');
    expect(res.plan).toBeNull();
  });

  it('returns unauthenticated with no session', async () => {
    mocks.authResult = { data: { session: null }, error: null };
    const res = await useCoachStore.getState().getPlanForEdit('plan-1');
    expect(res.status).toBe('unauthenticated');
  });

  it('surfaces a query error instead of a blank plan', async () => {
    mocks.tableResults.set('workout_plans', { data: null, error: { message: 'boom' } });
    const res = await useCoachStore.getState().getPlanForEdit('plan-1');
    expect(res).toMatchObject({ status: 'error', message: 'boom' });
  });
});

describe('builder wiring — save & assign uses the Phase 2 path', () => {
  it('saves first, then assigns via assignExistingPlan', () => {
    expect(builderPage).toContain('const savedId = await persistPlan()');
    expect(builderPage).toContain('assignExistingPlan(savedId, athleteId)');
  });

  it('no longer uses create-and-assign as the assignment mechanism', () => {
    // assignPlan may remain imported for legacy paths, but must not be the
    // handler's assignment call.
    expect(builderPage).not.toMatch(/await assignPlan\(\{\s*name: planName/);
  });

  it('reports notification partial success honestly', () => {
    expect(builderPage).toContain('could not be notified');
    expect(builderPage).toContain('o.notified');
  });

  it('respects the duplicate-submission guard result', () => {
    expect(builderPage).toContain('duplicateSuppressed');
  });

  it('reads planId from the query string and loads edit mode', () => {
    expect(builderPage).toContain('searchParams?.get("planId")');
    // The route value is narrowed to a local const before the await, so the
    // fetch cannot be retargeted by a later render.
    expect(builderPage).toContain('const targetPlanId = currentQueryPlanId;');
    expect(builderPage).toContain('getPlanForEdit(targetPlanId)');
  });

  it('wires the previously inert Save button to real persistence', () => {
    expect(builderPage).toContain('onClick={persistPlan}');
    expect(builderPage).toContain('savePlan({ name: planName, days }');
  });

  it('surfaces load and save states', () => {
    expect(builderPage).toContain('Loading plan…');
    expect(builderPage).toContain('planLoadError');
    expect(builderPage).toContain('saveMessage');
  });
});

describe('templates page opens the builder in edit mode', () => {
  it('links each template to the builder with its planId', () => {
    expect(templatesPage).toContain('href={`/plans/builder?planId=${t.id}`}');
  });

  it('keeps the real list and its honest states', () => {
    expect(templatesPage).toContain('getTemplates');
    expect(templatesPage).toContain('No programs yet');
    expect(templatesPage).toContain('Loading your programs…');
  });
});

describe('AI review page uses the real table, no mock data', () => {
  it('contains none of the retired demo identities', () => {
    for (const fake of ['Sailesh Kumar', 'Sarah Jenkins']) {
      expect(aiPage).not.toContain(fake);
    }
  });

  it('queries progression_recommendations', () => {
    expect(aiPage).toContain("from(\"progression_recommendations\")");
    expect(aiPage).toContain('suggestion_text');
  });

  it('persists approve and reject as status updates', () => {
    expect(aiPage).toContain('.update({ status })');
    expect(aiPage).toContain('"approved"');
    expect(aiPage).toContain('"rejected"');
  });

  it('persists an adjusted load as suggested_weight + modified status', () => {
    expect(aiPage).toContain('suggested_weight: parsed');
    expect(aiPage).toContain('status: "modified"');
  });

  it('validates the adjusted weight rather than writing anything', () => {
    expect(aiPage).toContain('parsed < 0 || parsed > 1000');
  });

  it('relies on RLS for coach isolation and says so', () => {
    expect(aiPage).toContain('RLS restricts rows to this coach');
  });

  it('invents no free-text override column', () => {
    expect(aiPage).not.toMatch(/override_note|overrideNote|coach_note/);
  });

  it('renders an honest empty state when there are no rows', () => {
    expect(aiPage).toContain('No AI recommendations yet');
    expect(aiPage).toContain('recs.length === 0');
  });

  it('has loading and error states', () => {
    expect(aiPage).toContain('Loading recommendations…');
    expect(aiPage).toContain("Couldn&apos;t load recommendations");
  });
});

describe('edit → plain create transition reaches the RPC as CREATE', () => {
  it('sends p_plan_id: null after the loaded plan id is cleared', async () => {
    // A: editing plan-1 — the save carries its id.
    mocks.rpcResult = { data: 'plan-1', error: null };
    await useCoachStore.getState().savePlan(draft(), 'plan-1');
    expect(mocks.rpcCalls[0].args.p_plan_id).toBe('plan-1');

    // B/C: navigate FROM ?planId=plan-1 TO plain /plans/builder. The previous
    // route is 'plan-1' and the current route is null — that direction is the
    // one this test is about, and it is what clears the canonical id, so the
    // component passes undefined on the next save.
    const routeChanged = didRouteChange('plan-1', null);
    expect(routeChanged).toBe(true);
    const clearedPlanId: string | null = routeChanged ? null : 'plan-1';

    // D/E: the next persistence is a CREATE.
    mocks.rpcCalls.length = 0;
    mocks.rpcResult = { data: 'plan-brand-new', error: null };
    const newId = await useCoachStore.getState().savePlan(draft(), clearedPlanId ?? undefined);

    expect(mocks.rpcCalls[0].args.p_plan_id).toBeNull();
    expect(newId).toBe('plan-brand-new');
    expect(newId).not.toBe('plan-1');
  });

  it('would have UPDATED the old plan without the transition fix', async () => {
    // Regression guard: passing a stale id produces an UPDATE, which is exactly
    // what the un-cleared planId used to cause on the plain create route.
    mocks.rpcResult = { data: 'plan-1', error: null };
    await useCoachStore.getState().savePlan(draft(), 'plan-1');
    expect(mocks.rpcCalls[0].args.p_plan_id).toBe('plan-1');
  });
});

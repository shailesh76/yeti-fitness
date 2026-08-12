import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

type Result = { data: any; error: any };

const mocks = vi.hoisted(() => ({
  authResult: { data: { session: { user: { id: 'coach-a' } } }, error: null } as Result,
  rpcResult: { data: 'plan-canonical-id', error: null } as Result,
  rpcCalls: [] as { name: string; args: any }[],
  tableOps: [] as { table: string; op: string }[],
}));

function queryFor(table: string) {
  const query: any = {};
  for (const m of ['select', 'eq', 'in', 'gte', 'order', 'limit']) query[m] = () => query;
  const settle = () => Promise.resolve({ data: [], error: null });
  query.single = settle;
  query.maybeSingle = settle;
  for (const op of ['insert', 'update', 'delete']) {
    query[op] = () => {
      mocks.tableOps.push({ table, op });
      const chain: any = Promise.resolve({ data: null, error: null });
      chain.eq = () => chain;
      chain.select = () => ({ single: settle, maybeSingle: settle });
      return chain;
    };
  }
  query.then = (res: any, rej: any) => settle().then(res, rej);
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

const migrationsDir = path.resolve(__dirname, '../../../../supabase/migrations');
const migrationRaw = fs.readFileSync(
  path.join(migrationsDir, '20260811000000_atomic_coach_plan_save.sql'),
  'utf8',
);
/** Executable SQL only — the header comment discusses the old multi-request
 * behaviour, which would otherwise trip the "no client-side delete" assertions. */
const migration = migrationRaw.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
const builderPage = fs.readFileSync(path.resolve(__dirname, '../../app/plans/builder/page.tsx'), 'utf8');
const storeSrc = fs.readFileSync(path.resolve(__dirname, '../../store/useCoachStore.ts'), 'utf8');

const draft = (overrides: any = {}) => ({
  name: 'Block A',
  days: [{
    id: 'd1',
    name: 'Push',
    exercises: [{ id: 'e1', exerciseId: 'ex-1', name: 'Bench', sets: '4', reps: '6', weight: '80' }],
  }],
  ...overrides,
});

beforeEach(() => {
  mocks.authResult = { data: { session: { user: { id: 'coach-a' } } }, error: null };
  mocks.rpcResult = { data: 'plan-canonical-id', error: null };
  mocks.rpcCalls.length = 0;
  mocks.tableOps.length = 0;
});

// ── P1: one atomic request ────────────────────────────────────────────────
describe('savePlan issues exactly one persistence request', () => {
  it('create goes through the RPC and returns the canonical id', async () => {
    const id = await useCoachStore.getState().savePlan(draft());
    expect(id).toBe('plan-canonical-id');
    expect(mocks.rpcCalls).toHaveLength(1);
    expect(mocks.rpcCalls[0].name).toBe('save_coach_workout_plan');
    expect(mocks.rpcCalls[0].args.p_plan_id).toBeNull();
  });

  it('edit passes the existing id and preserves it in the result', async () => {
    mocks.rpcResult = { data: 'plan-1', error: null };
    const id = await useCoachStore.getState().savePlan(draft(), 'plan-1');
    expect(id).toBe('plan-1');
    expect(mocks.rpcCalls[0].args.p_plan_id).toBe('plan-1');
  });

  it('performs NO client-side table writes — no compensating delete/insert', async () => {
    await useCoachStore.getState().savePlan(draft(), 'plan-1');
    expect(mocks.tableOps).toEqual([]);
  });

  it('never issues a client-side delete of plan_days', async () => {
    await useCoachStore.getState().savePlan(draft(), 'plan-1');
    expect(mocks.tableOps.find((o) => o.table === 'plan_days' && o.op === 'delete')).toBeUndefined();
  });

  it('propagates an RPC failure instead of reporting success', async () => {
    mocks.rpcResult = { data: null, error: { message: 'That plan was not found on your account.' } };
    await expect(useCoachStore.getState().savePlan(draft(), 'coach-b-plan'))
      .rejects.toMatchObject({ message: /not found on your account/ });
  });

  it('rejects an unauthenticated caller before calling the RPC', async () => {
    mocks.authResult = { data: { session: null }, error: null };
    await expect(useCoachStore.getState().savePlan(draft())).rejects.toThrow(/not authenticated/i);
    expect(mocks.rpcCalls).toHaveLength(0);
  });

  it('sends no caller-supplied coach id', async () => {
    await useCoachStore.getState().savePlan(draft());
    expect(Object.keys(mocks.rpcCalls[0].args).sort()).toEqual(['p_days', 'p_name', 'p_plan_id']);
  });

  it('round-trips omitted optional fields as null, not invented defaults', async () => {
    await useCoachStore.getState().savePlan(draft({
      days: [{ id: 'd', name: null, exercises: [{ id: 'e', exerciseId: 'ex-1', name: null, sets: null, reps: null }] }],
    }));
    const ex = mocks.rpcCalls[0].args.p_days[0].exercises[0];
    expect(ex).toMatchObject({
      sets: null, reps: null, weight: null, target_rpe: null,
      rest_seconds: null, notes: null, warmup_sets: null,
      is_dropset: null, superset_group: null,
    });
    expect(mocks.rpcCalls[0].args.p_days[0].name).toBeNull();
  });
});

// ── P1: the SQL contract that makes rollback possible ─────────────────────
describe('atomic save migration', () => {
  it('is a single transactional function, not a script of statements', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.save_coach_workout_plan');
    expect(migration).toContain('RETURNS uuid');
    expect(migration).toContain('LANGUAGE plpgsql');
  });

  it('is SECURITY DEFINER with an empty search_path and no pg_temp', () => {
    expect(migration).toContain('SECURITY DEFINER');
    expect(migration).toContain("SET search_path = ''");
    expect(migration).not.toMatch(/SET search_path[^\n]*pg_temp/);
  });

  it('derives the coach only from auth.uid() and takes no coach parameter', () => {
    expect(migration).toContain('v_coach_id pg_catalog.uuid := auth.uid()');
    expect(migration).not.toMatch(/p_coach_id/);
    expect(migration).toContain("RAISE EXCEPTION 'Not authenticated'");
  });

  it('uses static SQL only — no dynamic EXECUTE', () => {
    const body = migration.split('AS $$')[1].split('$$;')[0];
    expect(body).not.toMatch(/\bEXECUTE\b/);
    expect(body).not.toMatch(/format\s*\(/);
    expect(body).not.toMatch(/quote_ident|quote_literal/);
  });

  it('verifies ownership under a row lock before mutating an existing plan', () => {
    const body = migration.split('AS $$')[1].split('$$;')[0];
    const ownership = body.split('FOR UPDATE')[0];
    expect(ownership).toContain('wp.coach_id = v_coach_id');
    expect(body).toContain('FOR UPDATE');
    // The ownership failure is raised before the UPDATE/DELETE.
    const guardIdx = body.indexOf('not found on your account');
    expect(guardIdx).toBeGreaterThan(-1);
    expect(guardIdx).toBeLessThan(body.indexOf('DELETE FROM public.plan_days'));
  });

  it('validates the whole payload before any destructive statement', () => {
    const body = migration.split('AS $$')[1].split('$$;')[0];
    const firstDestructive = Math.min(
      ...['INSERT INTO public.workout_plans', 'DELETE FROM public.plan_days']
        .map((s) => body.indexOf(s))
        .filter((i) => i > -1),
    );
    for (const guard of [
      'Give the plan a name before saving.',
      'Add at least one day before saving.',
      'Every day must have at least one exercise.',
      'Every exercise must reference an exercise.',
    ]) {
      expect(body.indexOf(guard)).toBeGreaterThan(-1);
      expect(body.indexOf(guard)).toBeLessThan(firstDestructive);
    }
  });

  it('never deletes the workout_plans row during an edit', () => {
    const body = migration.split('AS $$')[1].split('$$;')[0];
    expect(body).not.toMatch(/DELETE\s+FROM\s+public\.workout_plans/);
    expect(body).toContain('UPDATE public.workout_plans');
  });

  it('returns the same plan id it resolved', () => {
    const body = migration.split('AS $$')[1].split('$$;')[0];
    expect(body).toContain('RETURN v_plan_id');
  });

  it('writes every supported plan_exercises column and no invented ones', () => {
    const insert = migration.split('INSERT INTO public.plan_exercises (')[1].split(') VALUES')[0];
    const cols = insert.split(',').map((c) => c.trim()).filter(Boolean).sort();
    expect(cols).toEqual([
      'exercise_id', 'is_dropset', 'notes', 'order_index', 'plan_day_id',
      'reps', 'rest_seconds', 'sets', 'superset_group', 'target_rpe',
      'warmup_sets', 'weight',
    ]);
  });

  it('casts superset_group to uuid, matching the real column type', () => {
    expect(migration).toContain("(v_ex ->> 'superset_group')::pg_catalog.uuid");
  });

  it('enforces non-negativity without inventing fitness maxima', () => {
    expect(migration).toContain('Rest seconds cannot be negative.');
    expect(migration).toContain('Warm-up sets cannot be negative.');
    expect(migration).toContain('Target RPE cannot be negative.');
    // No arbitrary upper bound on reps/sets/rpe was invented.
    expect(migration).not.toMatch(/target_rpe[^\n]*>\s*10/);
  });

  it('restricts EXECUTE to authenticated only', () => {
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION public\.save_coach_workout_plan\(uuid, text, jsonb\) FROM PUBLIC;/);
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION public\.save_coach_workout_plan\(uuid, text, jsonb\) FROM anon;/);
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION public\.save_coach_workout_plan\(uuid, text, jsonb\) FROM service_role;/);
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION public\.save_coach_workout_plan\(uuid, text, jsonb\) TO authenticated;/);
    expect(migration).not.toMatch(/GRANT[^;]*TO anon;/);
    expect(migration).not.toMatch(/GRANT[^;]*TO service_role;/);
  });

  it('reuses the Phase 2 ownership helper rather than redefining one', () => {
    expect(migration).not.toContain('CREATE OR REPLACE FUNCTION public.coach_owns_workout_plan');
  });
});

// ── P2: no fabricated hydration ───────────────────────────────────────────
describe('getPlanForEdit returns persisted state, not invented prescriptions', () => {
  it('does not substitute defaults for NULL sets/reps/weight', () => {
    const fn = storeSrc.split('getPlanForEdit: async')[1].split('assignExistingPlan:')[0];
    expect(fn).not.toMatch(/sets:\s*ex\.sets[^\n]*\?\?\s*'3'/);
    expect(fn).not.toMatch(/reps:\s*ex\.reps[^\n]*\?\?\s*'10'/);
    expect(fn).not.toMatch(/weight:[^\n]*\?\?\s*''/);
    expect(fn).toContain('sets: ex.sets ?? null');
    expect(fn).toContain('reps: ex.reps ?? null');
    expect(fn).toContain('weight: ex.weight ?? null');
  });

  it('does not fabricate plan, day or exercise names', () => {
    const fn = storeSrc.split('getPlanForEdit: async')[1].split('assignExistingPlan:')[0];
    expect(fn).not.toContain("'Untitled Plan'");
    expect(fn).not.toMatch(/`Day \$\{d\.day_number\}`/);
    expect(fn).not.toContain("|| 'Exercise'");
    expect(fn).toContain('name: d.name ?? null');
    expect(fn).toContain('name: catalog?.name ?? null');
  });

  it('keeps display placeholders in the component, where they cannot persist', () => {
    expect(builderPage).toContain('value={item.sets ?? ""}');
    expect(builderPage).toContain('value={item.reps ?? ""}');
    expect(builderPage).toContain('day.name ?? `Day ${dayIndex + 1}`');
  });
});

// ── Preservation ──────────────────────────────────────────────────────────
describe('builder still uses the Phase 2 assignment path', () => {
  it('assigns via assignExistingPlan with the saved canonical id', () => {
    expect(builderPage).toContain('const savedId = await persistPlan()');
    expect(builderPage).toContain('assignExistingPlan(savedId, athleteId)');
  });

  it('does not reintroduce assignPlan into the builder', () => {
    expect(builderPage).not.toMatch(/await assignPlan\(/);
    // dead destructuring removed
    expect(builderPage).not.toMatch(/^\s*assignPlan,\s*$/m);
  });
});

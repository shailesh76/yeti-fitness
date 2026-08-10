import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

type Result = { data: any; error: any };
type Insert = { table: string; payload: any };

const mocks = vi.hoisted(() => ({
  authResult: { data: { session: { user: { id: 'coach-a' } } }, error: null } as Result,
  tableResults: new Map<string, Result>(),
  inserts: [] as Insert[],
  insertDelayMs: 0,
}));

function queryFor(table: string) {
  const query: any = {};
  for (const method of ['select', 'eq', 'in', 'gte', 'order', 'limit', 'update']) {
    query[method] = () => query;
  }
  const settle = () => Promise.resolve(mocks.tableResults.get(table) || { data: [], error: null });
  query.single = settle;
  query.maybeSingle = settle;
  query.insert = (payload: any) => {
    const res = mocks.tableResults.get(`${table}:insert`) || { data: null, error: null };
    const run = new Promise<Result>((resolve) => {
      setTimeout(() => {
        mocks.inserts.push({ table, payload });
        resolve(res);
      }, mocks.insertDelayMs);
    });
    const chain: any = run;
    chain.select = () => ({ single: () => run, maybeSingle: () => run });
    return chain;
  };
  query.then = (resolve: (v: Result) => unknown, reject: (r: unknown) => unknown) => settle().then(resolve, reject);
  return query;
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn(async () => mocks.authResult) },
    from: vi.fn((table: string) => queryFor(table)),
    rpc: vi.fn(async () => ({ data: null, error: null })),
  },
}));

import { useCoachStore } from '../../store/useCoachStore';

const migrationsDir = path.resolve(__dirname, '../../../../supabase/migrations');
const rlsMigrationRaw = fs.readFileSync(
  path.join(migrationsDir, '20260810230000_assigned_plans_plan_ownership_rls.sql'),
  'utf8',
);
const nutritionMigrationRaw = fs.readFileSync(
  path.join(migrationsDir, '20260810230100_coach_nutrition_targets_reconcile.sql'),
  'utf8',
);
const nutritionMigration = nutritionMigrationRaw
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n');
/** Executable SQL only — the header comment quotes the old policy verbatim, which
 * would otherwise trip the "no FOR ALL" and "no UNIQUE" assertions below. */
const rlsMigration = rlsMigrationRaw
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n');
const detailPage = fs.readFileSync(path.resolve(__dirname, '../../app/dashboard/[userId]/page.tsx'), 'utf8');
const nutritionCard = fs.readFileSync(path.resolve(__dirname, '../../components/NutritionTargetCard.tsx'), 'utf8');

/** Coach A owns athlete-a and plan-a. Anything else belongs to Coach B. */
function scenario(opts: { athleteLinked: boolean; planOwned: boolean }) {
  mocks.tableResults.set('coach_clients', { data: opts.athleteLinked ? { athlete_id: 'athlete-a' } : null, error: null });
  mocks.tableResults.set('workout_plans', { data: opts.planOwned ? { id: 'plan-a', name: 'Plan A' } : null, error: null });
}

beforeEach(() => {
  mocks.authResult = { data: { session: { user: { id: 'coach-a' } } }, error: null };
  mocks.tableResults.clear();
  mocks.inserts.length = 0;
  mocks.insertDelayMs = 0;
  useCoachStore.setState({ clients: [] });
});

describe('assigned_plans RLS migration semantics', () => {
  it('replaces the permissive FOR ALL policy instead of stacking on it', () => {
    // Policies for the same command are OR-ed, so the old one must be dropped.
    expect(rlsMigrationRaw).toContain('DROP POLICY IF EXISTS "Coaches manage assigned plans"');
    expect(rlsMigration).not.toMatch(/CREATE POLICY[\s\S]*?FOR ALL/);
  });

  it('requires BOTH athlete linkage and plan ownership on INSERT', () => {
    const insertPolicy = rlsMigration.split('FOR INSERT')[1].split(';')[0];
    expect(insertPolicy).toContain('coach_clients');
    expect(insertPolicy).toContain('public.coach_owns_workout_plan(assigned_plans.plan_id)');
  });

  it('applies the same pair of checks to UPDATE, in USING and WITH CHECK', () => {
    const updatePolicy = rlsMigration.split('FOR UPDATE')[1].split('DROP POLICY')[0];
    expect(updatePolicy).toContain('USING');
    expect(updatePolicy).toContain('WITH CHECK');
    expect((updatePolicy.match(/public\.coach_owns_workout_plan\(/g) || []).length).toBe(2);
    expect((updatePolicy.match(/cc\.coach_id = auth\.uid\(\)/g) || []).length).toBe(2);
  });

  it('checks plan ownership through a helper, never an inline workout_plans EXISTS', () => {
    // An inline `EXISTS (SELECT ... FROM public.workout_plans ...)` inside an
    // assigned_plans policy triggers workout_plans' own RLS, whose SELECT
    // policy queries assigned_plans back — Postgres aborts that cycle with
    // "infinite recursion detected in policy", which blocked EVERY assignment.
    const policySection = rlsMigration.split('DROP POLICY IF EXISTS "Coaches manage assigned plans"')[1];
    expect(policySection).not.toContain('FROM public.workout_plans');
    expect((policySection.match(/public\.coach_owns_workout_plan\(/g) || []).length).toBe(3);
  });

  it('hardens the ownership helper exactly like the nutrition RPC', () => {
    const helper = rlsMigration
      .split('CREATE OR REPLACE FUNCTION public.coach_owns_workout_plan')[1]
      .split('$$;')[0];
    expect(helper).toContain('RETURNS boolean');
    expect(helper).toContain('STABLE');
    expect(helper).toContain('SECURITY DEFINER');
    expect(helper).toContain("SET search_path = ''");
    expect(helper).toContain('FROM public.workout_plans wp');
    expect(helper).toContain('wp.coach_id = auth.uid()');
    // no dynamic SQL, and no caller-supplied coach identity
    expect(helper).not.toMatch(/EXECUTE\s/);
    expect(helper).not.toMatch(/p_coach_id/);

    expect(rlsMigration).toMatch(/REVOKE ALL ON FUNCTION public\.coach_owns_workout_plan\(uuid\) FROM PUBLIC;/);
    expect(rlsMigration).toMatch(/REVOKE ALL ON FUNCTION public\.coach_owns_workout_plan\(uuid\) FROM anon;/);
    expect(rlsMigration).toMatch(/REVOKE ALL ON FUNCTION public\.coach_owns_workout_plan\(uuid\) FROM service_role;/);
    expect(rlsMigration).toMatch(/GRANT EXECUTE ON FUNCTION public\.coach_owns_workout_plan\(uuid\) TO authenticated;/);
  });

  it('leaves the athlete SELECT policy alone and adds no unique constraint', () => {
    // History must stay writable, so no permanent uniqueness on (athlete, plan).
    expect(rlsMigrationRaw).not.toContain('DROP POLICY IF EXISTS "Athletes view assigned plans"');
    expect(rlsMigration).not.toMatch(/\bUNIQUE\b/i);
  });
});

describe('nutrition targets go through a narrowly scoped RPC, not a table-wide policy', () => {
  it('creates no generic coach UPDATE policy on profiles', () => {
    expect(nutritionMigration).not.toMatch(/CREATE POLICY[\s\S]*?ON public\.profiles/);
    // and actively removes one if a partial 20260728 ever landed
    expect(nutritionMigrationRaw).toContain('DROP POLICY IF EXISTS "Coaches update client nutrition targets" ON public.profiles');
  });

  it('leaves the athlete own-profile policy untouched', () => {
    expect(nutritionMigrationRaw).not.toContain('DROP POLICY IF EXISTS "Users update own profile"');
  });

  it('derives the coach from auth.uid() and never from a parameter', () => {
    expect(nutritionMigration).toMatch(/v_coach_id\s+pg_catalog\.uuid\s+:=\s+auth\.uid\(\)/);
    expect(nutritionMigration).toContain('nutrition_targets_updated_by = v_coach_id');
    // no p_coach_id / p_updated_by parameter exists at all
    expect(nutritionMigration).not.toMatch(/p_(coach_id|updated_by)/);
  });

  it('verifies the coach_clients link before updating', () => {
    const body = nutritionMigration.split('UPDATE public.profiles')[0];
    expect(body).toContain('FROM public.coach_clients cc');
    expect(body).toContain('cc.coach_id = v_coach_id');
    expect(body).toContain('not on your roster');
  });

  it('updates ONLY the seven nutrition columns', () => {
    const setClause = nutritionMigration
      .split('UPDATE public.profiles')[1]
      .split('WHERE')[0];
    // Column names are whatever appears immediately left of an "=" in the SET
    // clause; none of the assigned expressions contain "=" themselves.
    const assigned = (setClause.match(/(\w+)\s*=/g) || [])
      .map((s) => s.trim().replace(/\s*=$/, ''))
      .sort();
    expect(assigned).toEqual([
      'daily_calorie_target',
      'daily_carb_target',
      'daily_fat_target',
      'daily_protein_target',
      'nutrition_targets_locked',
      'nutrition_targets_updated_at',
      'nutrition_targets_updated_by',
    ]);
    for (const forbidden of ['full_name', 'role', 'weight_kg', 'goal', 'age', 'gender', 'height_cm']) {
      expect(setClause).not.toContain(forbidden);
    }
  });

  it('validates every target for non-negative, plausible ranges', () => {
    for (const guard of [
      'p_calorie_target < 0 OR p_calorie_target > 20000',
      'p_protein_target < 0 OR p_protein_target > 2000',
      'p_carb_target < 0 OR p_carb_target > 2000',
      'p_fat_target < 0 OR p_fat_target > 2000',
    ]) {
      expect(nutritionMigration).toContain(guard);
    }
    // NULL is explicitly permitted (clears a target) rather than rejected
    expect(nutritionMigration).toContain('IS NOT NULL AND (p_calorie_target < 0');
  });

  it('is hardened as SECURITY DEFINER with an empty search_path', () => {
    expect(nutritionMigration).toContain('SECURITY DEFINER');
    expect(nutritionMigration).toContain("SET search_path = ''");
    // pg_temp must NOT be on the path — it would let a caller shadow an object.
    expect(nutritionMigration).not.toMatch(/SET search_path[^\n]*pg_temp/);
  });

  it('schema-qualifies every non-built-in reference in the function body', () => {
    const body = nutritionMigration.split('AS $$')[1].split('$$;')[0];
    expect(body).toContain('auth.uid()');
    expect(body).toContain('public.coach_clients');
    expect(body).toContain('public.profiles');
    expect(body).toContain('pg_catalog.now()');
    expect(body).toContain('pg_catalog.round(');
    expect(body).toContain('pg_catalog.uuid');
    expect(body).toContain('pg_catalog.timestamptz');

    // No bare table reference can survive: every FROM/JOIN/UPDATE/INTO target
    // must carry a schema prefix.
    const unqualified = body.match(/\b(?:FROM|JOIN|UPDATE|INTO)\s+(?!public\.|auth\.|pg_catalog\.)([a-z_][\w]*)/gi) || [];
    expect(unqualified).toEqual([]);

    // And no bare built-in call that the empty path would have to resolve.
    expect(body).not.toMatch(/(?<!pg_catalog\.)\bnow\(\)/);
    expect(body).not.toMatch(/(?<!pg_catalog\.)\bround\(/);
  });

  it('grants EXECUTE only to authenticated — not PUBLIC, anon, or service_role', () => {
    expect(nutritionMigration).toContain('REVOKE ALL ON FUNCTION public.assign_client_nutrition_targets');
    expect(nutritionMigration).toMatch(/REVOKE ALL ON FUNCTION[^;]*FROM PUBLIC;/);
    expect(nutritionMigration).toMatch(/REVOKE ALL ON FUNCTION[^;]*FROM anon;/);
    // Supabase default privileges grant service_role EXECUTE at CREATE time,
    // so it needs its own REVOKE — revoking PUBLIC does not remove it.
    expect(nutritionMigration).toMatch(/REVOKE ALL ON FUNCTION[^;]*FROM service_role;/);
    expect(nutritionMigration).toMatch(/GRANT EXECUTE ON FUNCTION[^;]*TO authenticated;/);
    expect(nutritionMigration).not.toMatch(/GRANT[^;]*TO anon;/);
    expect(nutritionMigration).not.toMatch(/GRANT[^;]*TO service_role;/);
  });

  it('rejects an unauthenticated caller server-side', () => {
    expect(nutritionMigration).toContain("IF v_coach_id IS NULL THEN");
    expect(nutritionMigration).toContain('Not authenticated');
  });

  it('both migrations run in a single transaction', () => {
    for (const sql of [rlsMigration, nutritionMigration]) {
      expect(sql).toContain('BEGIN;');
      expect(sql).toContain('COMMIT;');
    }
  });

  it('the dashboard calls the RPC instead of updating profiles directly', async () => {
    const store = fs.readFileSync(path.resolve(__dirname, '../../store/useCoachStore.ts'), 'utf8');
    expect(store).toContain("supabase.rpc('assign_client_nutrition_targets'");
    expect(store).not.toContain('nutrition_targets_updated_by: coachId');

    const rpcSpy = vi.mocked((await import('@/lib/supabase')).supabase.rpc);
    rpcSpy.mockClear();
    await useCoachStore.getState().assignNutritionTargets('athlete-a', {
      calories: 2000, protein: 150, carbs: 200, fat: 60,
    });
    expect(rpcSpy).toHaveBeenCalledWith('assign_client_nutrition_targets', {
      p_athlete_id: 'athlete-a',
      p_calorie_target: 2000,
      p_protein_target: 150,
      p_carb_target: 200,
      p_fat_target: 60,
      p_locked: true,
    });
  });

  it('propagates an RPC authorization failure instead of reporting success', async () => {
    const rpcSpy = vi.mocked((await import('@/lib/supabase')).supabase.rpc);
    rpcSpy.mockResolvedValueOnce({ data: null, error: { message: 'This athlete is not on your roster' } } as any);
    await expect(useCoachStore.getState().assignNutritionTargets('other-coach-athlete', {
      calories: 2000, protein: 150, carbs: 200, fat: 60,
    })).rejects.toMatchObject({ message: /not on your roster/ });
  });
});

describe('cross-coach assignment is refused before any write', () => {
  it('Coach A CAN assign Coach A plan to Coach A athlete', async () => {
    scenario({ athleteLinked: true, planOwned: true });
    await useCoachStore.getState().assignExistingPlan('plan-a', 'athlete-a');
    expect(mocks.inserts.filter((i) => i.table === 'assigned_plans')).toHaveLength(1);
  });

  it('Coach A CANNOT assign Coach B plan to Coach A athlete', async () => {
    scenario({ athleteLinked: true, planOwned: false });
    await expect(useCoachStore.getState().assignExistingPlan('plan-b', 'athlete-a'))
      .rejects.toThrow(/not found on your account/i);
    expect(mocks.inserts.filter((i) => i.table === 'assigned_plans')).toHaveLength(0);
  });

  it('Coach B CANNOT assign Coach A plan to Coach A athlete', async () => {
    mocks.authResult = { data: { session: { user: { id: 'coach-b' } } }, error: null };
    scenario({ athleteLinked: false, planOwned: true });
    await expect(useCoachStore.getState().assignExistingPlan('plan-a', 'athlete-a'))
      .rejects.toThrow(/not on your roster/i);
    expect(mocks.inserts.filter((i) => i.table === 'assigned_plans')).toHaveLength(0);
  });
});

describe('notification failures are reported, not swallowed', () => {
  it('reports notified:false when the assignment notification insert errors', async () => {
    scenario({ athleteLinked: true, planOwned: true });
    mocks.tableResults.set('notifications:insert', { data: null, error: { message: 'notify denied' } });
    const outcome = await useCoachStore.getState().assignExistingPlan('plan-a', 'athlete-a');
    expect(outcome.notified).toBe(false);
    expect(outcome.notificationError).toBe('notify denied');
    // The primary write is NOT rolled back.
    expect(mocks.inserts.filter((i) => i.table === 'assigned_plans')).toHaveLength(1);
  });

  it('reports notified:true when the notification succeeds', async () => {
    scenario({ athleteLinked: true, planOwned: true });
    const outcome = await useCoachStore.getState().assignExistingPlan('plan-a', 'athlete-a');
    expect(outcome).toMatchObject({ notified: true, notificationError: null });
  });

  it('reports a failed nutrition notification without discarding the saved targets', async () => {
    mocks.tableResults.set('notifications:insert', { data: null, error: { message: 'notify denied' } });
    const outcome = await useCoachStore.getState().assignNutritionTargets('athlete-a', {
      calories: 2000, protein: 150, carbs: 200, fat: 60,
    });
    expect(outcome).toMatchObject({ notified: false, notificationError: 'notify denied' });
  });

  it('surfaces the partial-success state in both UIs', () => {
    expect(detailPage).toContain("couldn't notify the athlete");
    expect(detailPage).toContain('outcome.notified');
    expect(nutritionCard).toContain("couldn't notify the athlete");
    expect(nutritionCard).toContain('outcome.notified');
  });
});

describe('duplicate assignment protection', () => {
  it('two rapid submissions for the same athlete+plan create one assignment', async () => {
    scenario({ athleteLinked: true, planOwned: true });
    mocks.insertDelayMs = 20;

    const [first, second] = await Promise.all([
      useCoachStore.getState().assignExistingPlan('plan-a', 'athlete-a'),
      useCoachStore.getState().assignExistingPlan('plan-a', 'athlete-a'),
    ]);

    expect(mocks.inserts.filter((i) => i.table === 'assigned_plans')).toHaveLength(1);
    const suppressed = [first, second].filter((r) => r.duplicateSuppressed);
    expect(suppressed).toHaveLength(1);
  });

  it('does not block a different plan for the same athlete', async () => {
    scenario({ athleteLinked: true, planOwned: true });
    mocks.insertDelayMs = 20;
    await Promise.all([
      useCoachStore.getState().assignExistingPlan('plan-a', 'athlete-a'),
      useCoachStore.getState().assignExistingPlan('plan-other', 'athlete-a'),
    ]);
    expect(mocks.inserts.filter((i) => i.table === 'assigned_plans')).toHaveLength(2);
  });

  it('releases the guard so the same pair can be reassigned later', async () => {
    scenario({ athleteLinked: true, planOwned: true });
    await useCoachStore.getState().assignExistingPlan('plan-a', 'athlete-a');
    const second = await useCoachStore.getState().assignExistingPlan('plan-a', 'athlete-a');
    expect(second.duplicateSuppressed).toBe(false);
    expect(mocks.inserts.filter((i) => i.table === 'assigned_plans')).toHaveLength(2);
  });
});

describe('nullable athlete stats never render as null', () => {
  it('guards every nullable stat on the detail page', () => {
    expect(detailPage).toContain('client.weight ?? ');
    expect(detailPage).toContain('client.caloriesLogged ?? ');
    expect(detailPage).toContain('client.calorieTarget ?? ');
    expect(detailPage).toContain('client.adherenceScore !== null');
    expect(detailPage).toContain('client.avgHeartRate !== null');
  });

  it('never renders a bare nullable as a JSX expression', () => {
    // Only unguarded JSX interpolation is a defect. `${client.x}` inside a
    // template literal is already null-checked at the call site, and the
    // lookbehind keeps it from being flagged.
    expect(detailPage).not.toMatch(/(?<!\$)\{client\.adherenceScore\}/);
    expect(detailPage).not.toMatch(/(?<!\$)\{client\.weight\}/);
    expect(detailPage).not.toMatch(/(?<!\$)\{client\.caloriesLogged\}/);
    expect(detailPage).not.toMatch(/(?<!\$)\{client\.calorieTarget\}/);
  });
});

import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  createSaveGuard, canPersistPlan, persistBlockedReason,
} from '../../lib/planBuilderGuards';

const migrationsDir = path.resolve(__dirname, '../../../../supabase/migrations');
const followupRaw = fs.readFileSync(
  path.join(migrationsDir, '20260811010000_prevalidate_plan_exercise_casts.sql'),
  'utf8',
);
const followup = followupRaw.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
const builderPage = fs.readFileSync(path.resolve(__dirname, '../../app/plans/builder/page.tsx'), 'utf8');

/**
 * Behavioural model of the builder's persist path. Mirrors persistPlan():
 * check canPersistPlan, then claim the guard synchronously BEFORE the first
 * await, release in finally. Lets us drive real concurrent calls without a DOM.
 */
function makePersister(opts: {
  guard: ReturnType<typeof createSaveGuard>;
  state: Parameters<typeof canPersistPlan>[0];
  savePlan: (...a: any[]) => Promise<string>;
}) {
  const calls = { blocked: 0, suppressed: 0 };
  return {
    calls,
    async persist(): Promise<string | null> {
      if (!canPersistPlan(opts.state)) { calls.blocked++; return null; }
      if (!opts.guard.tryAcquire()) { calls.suppressed++; return null; }
      try {
        return await opts.savePlan();
      } finally {
        opts.guard.release();
      }
    },
  };
}

const okState = { queryPlanId: null, loadedPlanId: null, loadFailed: false, loading: false };

describe('P1 — synchronous duplicate-save guard (behavioural)', () => {
  it('two same-tick saves produce exactly ONE savePlan call', async () => {
    const savePlan = vi.fn(() => new Promise<string>((r) => setTimeout(() => r('plan-1'), 25)));
    const p = makePersister({ guard: createSaveGuard(), state: okState, savePlan });

    // Both invoked before the first promise resolves — the real race.
    const [a, b] = await Promise.all([p.persist(), p.persist()]);

    expect(savePlan).toHaveBeenCalledTimes(1);
    expect([a, b].filter((r) => r === 'plan-1')).toHaveLength(1);
    expect([a, b].filter((r) => r === null)).toHaveLength(1);
    expect(p.calls.suppressed).toBe(1);
  });

  it('a new-plan race cannot create two distinct plans', async () => {
    let created = 0;
    const savePlan = vi.fn(() => new Promise<string>((r) => {
      setTimeout(() => { created++; r(`plan-${created}`); }, 20);
    }));
    const p = makePersister({ guard: createSaveGuard(), state: okState, savePlan });

    await Promise.all([p.persist(), p.persist(), p.persist()]);
    expect(created).toBe(1);
    expect(savePlan).toHaveBeenCalledTimes(1);
  });

  it('releases after completion so a later save works normally', async () => {
    const savePlan = vi.fn(async () => 'plan-1');
    const guard = createSaveGuard();
    const p = makePersister({ guard, state: okState, savePlan });

    await p.persist();
    expect(guard.isInFlight).toBe(false);
    await p.persist();
    expect(savePlan).toHaveBeenCalledTimes(2);
  });

  it('releases even when the save rejects', async () => {
    const savePlan = vi.fn(async () => { throw new Error('boom'); });
    const guard = createSaveGuard();
    const p = makePersister({ guard, state: okState, savePlan });

    await expect(p.persist()).rejects.toThrow('boom');
    expect(guard.isInFlight).toBe(false);
    // guard is reusable
    expect(guard.tryAcquire()).toBe(true);
  });

  it('Save and Save & Assign share one guard, so they cannot both persist', async () => {
    const savePlan = vi.fn(() => new Promise<string>((r) => setTimeout(() => r('plan-1'), 25)));
    const guard = createSaveGuard();
    const standaloneSave = makePersister({ guard, state: okState, savePlan });
    const saveAndAssign = makePersister({ guard, state: okState, savePlan });

    await Promise.all([standaloneSave.persist(), saveAndAssign.persist()]);
    expect(savePlan).toHaveBeenCalledTimes(1);
  });

  it('is synchronous — a second tryAcquire fails with no await in between', () => {
    const guard = createSaveGuard();
    expect(guard.tryAcquire()).toBe(true);
    expect(guard.tryAcquire()).toBe(false);
  });
});

describe('P2 — failed edit load blocks persistence (behavioural)', () => {
  it('unauthorized / missing plan blocks Save and never creates', async () => {
    const savePlan = vi.fn(async () => 'should-not-happen');
    const p = makePersister({
      guard: createSaveGuard(),
      state: { queryPlanId: 'plan-x', loadedPlanId: null, loadFailed: true, loading: false },
      savePlan,
    });
    expect(await p.persist()).toBeNull();
    expect(savePlan).not.toHaveBeenCalled();
    expect(p.calls.blocked).toBe(1);
  });

  it('invalid plan id blocks Save & Assign', async () => {
    const savePlan = vi.fn(async () => 'should-not-happen');
    const p = makePersister({
      guard: createSaveGuard(),
      state: { queryPlanId: 'not-a-uuid', loadedPlanId: null, loadFailed: true, loading: false },
      savePlan,
    });
    expect(await p.persist()).toBeNull();
    expect(savePlan).not.toHaveBeenCalled();
  });

  it('an edit route that has not finished loading cannot fall through to create', () => {
    expect(canPersistPlan({ queryPlanId: 'plan-x', loadedPlanId: null, loadFailed: false, loading: true })).toBe(false);
    // loaded id must match the requested id
    expect(canPersistPlan({ queryPlanId: 'plan-x', loadedPlanId: 'stale-plan', loadFailed: false, loading: false })).toBe(false);
  });

  it('plain /plans/builder create route still permits saving', async () => {
    const savePlan = vi.fn(async () => 'plan-new');
    const p = makePersister({ guard: createSaveGuard(), state: okState, savePlan });
    expect(await p.persist()).toBe('plan-new');
    expect(savePlan).toHaveBeenCalledTimes(1);
  });

  it('recovers once a valid plan loads after a previous failure', async () => {
    const savePlan = vi.fn(async () => 'plan-x');
    const state = { queryPlanId: 'plan-x', loadedPlanId: null as string | null, loadFailed: true, loading: false };
    const p = makePersister({ guard: createSaveGuard(), state, savePlan });

    expect(await p.persist()).toBeNull();

    // Navigating to a valid plan: load succeeds, error cleared, id hydrated.
    state.loadFailed = false;
    state.loadedPlanId = 'plan-x';
    expect(await p.persist()).toBe('plan-x');
    expect(savePlan).toHaveBeenCalledTimes(1);
  });

  it('gives an honest blocked reason instead of failing silently', () => {
    expect(persistBlockedReason({ queryPlanId: 'p', loadedPlanId: null, loadFailed: true, loading: false }))
      .toMatch(/couldn't be loaded/i);
    expect(persistBlockedReason(okState)).toBeNull();
  });
});

describe('builder wires both guards', () => {
  it('holds the guard in a ref and claims it before awaiting', () => {
    expect(builderPage).toContain('useRef(createSaveGuard())');
    expect(builderPage).toContain('saveGuardRef.current.tryAcquire()');
    expect(builderPage).toContain('saveGuardRef.current.release()');
  });

  it('blocks persistence and disables both buttons when the edit load failed', () => {
    expect(builderPage).toContain('if (!persistAllowed)');
    expect((builderPage.match(/disabled=\{saving \|\| planLoading \|\| !persistAllowed\}/g) || []).length).toBe(2);
  });

  it('clears on route change before any fetch, and gates loading on the tracker', () => {
    expect(builderPage).toContain('didRouteChange(prevQueryPlanIdRef.current, currentQueryPlanId)');
    const effect = builderPage.split('didRouteChange(prevQueryPlanIdRef.current, currentQueryPlanId)')[1];
    // Clearing happens before the early return, so an edit -> create navigation
    // drops the canonical id even though no load is started.
    const clearIdx = effect.indexOf('setPlanId(null)');
    const returnIdx = effect.indexOf('if (!currentQueryPlanId) return;');
    const claimIdx = effect.indexOf('tracker.claim(currentQueryPlanId)');
    expect(clearIdx).toBeGreaterThan(-1);
    expect(clearIdx).toBeLessThan(returnIdx);
    // Route identity must NOT be the load gate — the tracker is, so the same
    // route can reload after a Strict Mode cleanup cancels the first request.
    expect(claimIdx).toBeGreaterThan(returnIdx);
    expect(effect).toContain('if (token === null) return;');
    // The effect must NOT depend on planId — persistence is not navigation.
    expect(builderPage).toContain('}, [queryPlanId, getPlanForEdit]);');
    expect(builderPage).not.toContain('[queryPlanId, planId, getPlanForEdit]');
  });

  it('resets route-owned loading on a genuine route change, before the early return', () => {
    const effect = builderPage.split('didRouteChange(prevQueryPlanIdRef.current, currentQueryPlanId)')[1];
    // Must sit inside the routeChanged branch, ahead of the no-query return —
    // leaving an in-flight edit for /plans/builder cancels that request, and a
    // cancelled request can never clear planLoading on the way out.
    const resetIdx = effect.indexOf('setPlanLoading(false);');
    const returnIdx = effect.indexOf('if (!currentQueryPlanId) return;');
    const claimIdx = effect.indexOf('tracker.claim(currentQueryPlanId)');
    expect(resetIdx).toBeGreaterThan(-1);
    expect(resetIdx).toBeLessThan(returnIdx);
    expect(returnIdx).toBeLessThan(claimIdx);
  });

  it('releases the tracker claim on cleanup and ignores stale responses', () => {
    expect(builderPage).toContain('useRef(createPlanLoadTracker())');
    // Cleanup must both cancel and release, or the same route can never restart.
    expect(builderPage).toContain('cancelled = true;');
    expect(builderPage).toContain('tracker.release(token);');
    expect(builderPage).toContain('const isStale = () => cancelled || !tracker.isLive(token);');
    // Every completed request settles, so a re-render cannot refetch it.
    expect((builderPage.match(/tracker\.settle\(token\);/g) || []).length).toBe(2);
    // A real navigation voids the previous route's completion record.
    expect(builderPage).toContain('tracker.forget();');
  });

  it('still saves then assigns through the Phase 2 path', () => {
    expect(builderPage).toContain('const savedId = await persistPlan()');
    expect(builderPage).toContain('assignExistingPlan(savedId, athleteId)');
  });
});

describe('P2 SQL — is_dropset / superset_group prevalidated before destructive work', () => {
  it('casts both fields inside the validation loop', () => {
    expect(followup).toContain("PERFORM (v_ex ->> 'is_dropset')::pg_catalog.bool;");
    expect(followup).toContain("PERFORM (v_ex ->> 'superset_group')::pg_catalog.uuid;");
  });

  it('both prevalidations precede every destructive statement', () => {
    const body = followup.split('AS $$')[1].split('$$;')[0];
    const firstDestructive = Math.min(
      ...['INSERT INTO public.workout_plans', 'UPDATE public.workout_plans', 'DELETE FROM public.plan_days']
        .map((s) => body.indexOf(s)).filter((i) => i > -1),
    );
    expect(body.indexOf("PERFORM (v_ex ->> 'is_dropset')")).toBeLessThan(firstDestructive);
    expect(body.indexOf("PERFORM (v_ex ->> 'superset_group')")).toBeLessThan(firstDestructive);
  });

  it('preserves every security property of the original function', () => {
    expect(followup).toContain('SECURITY DEFINER');
    expect(followup).toContain("SET search_path = ''");
    expect(followup).not.toMatch(/SET search_path[^\n]*pg_temp/);
    expect(followup).toContain('v_coach_id pg_catalog.uuid := auth.uid()');
    expect(followup).not.toMatch(/p_coach_id/);
    const body = followup.split('AS $$')[1].split('$$;')[0];
    expect(body).not.toMatch(/\bEXECUTE\b/);
    expect(body).toContain('FOR UPDATE');
    expect(body).not.toMatch(/DELETE\s+FROM\s+public\.workout_plans/);
    expect(body).toContain('RETURN v_plan_id');
  });

  it('re-asserts the exact ACL', () => {
    expect(followup).toMatch(/REVOKE ALL ON FUNCTION[^;]*FROM PUBLIC;/);
    expect(followup).toMatch(/REVOKE ALL ON FUNCTION[^;]*FROM anon;/);
    expect(followup).toMatch(/REVOKE ALL ON FUNCTION[^;]*FROM service_role;/);
    expect(followup).toMatch(/GRANT EXECUTE ON FUNCTION[^;]*TO authenticated;/);
  });

  it('replaces rather than rewriting the applied migration', () => {
    expect(followup).toContain('CREATE OR REPLACE FUNCTION public.save_coach_workout_plan');
    expect(followup).toContain('BEGIN;');
    expect(followup).toContain('COMMIT;');
  });
});

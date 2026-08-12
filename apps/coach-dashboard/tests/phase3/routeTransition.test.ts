import { describe, expect, it, vi } from 'vitest';
import {
  canPersistPlan, createPlanLoadTracker, didRouteChange,
} from '../../lib/planBuilderGuards';

/**
 * Behavioural model of the builder's load effect + persist cycle.
 *
 * `setup()` mirrors one effect setup and RETURNS ITS CLEANUP, so tests can
 * drive the real React lifecycle — including Strict Mode's
 * setup → cleanup → setup double-invocation on a single mount.
 *
 * Two regressions are pinned here:
 *
 *  1. The effect used to depend on the loaded planId, so setPlanId(savedId)
 *     after a create re-ran it, the comparison saw "route has no plan but an
 *     id is loaded", cleared the id, and the next Save created a SECOND plan.
 *
 *  2. The effect then gated loading on route identity alone. Under Strict Mode
 *     the second setup saw the same route, skipped the load, and the request
 *     cancelled by the cleanup could neither hydrate nor clear planLoading —
 *     a direct /plans/builder?planId=A visit hung on "Loading plan…" forever.
 */

type LoadResult =
  | { status: 'ok'; plan: { id: string } }
  | { status: 'not_found' }
  | { status: 'error'; message?: string };

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

/** Lets every already-resolved microtask in the model run. */
const flush = () => new Promise((r) => setTimeout(r, 0));

function makeBuilderModel(deps: {
  getPlanForEdit: (id: string) => Promise<LoadResult>;
  savePlan?: (planId?: string) => Promise<string>;
}) {
  const savePlan = deps.savePlan ?? (async (planId?: string) => planId ?? 'plan-new');
  let planId: string | null = null;
  let planLoadError: string | null = null;
  let planLoading = false;
  let prevQueryRoute: string | null | undefined = undefined;
  const tracker = createPlanLoadTracker();
  const requests: string[] = [];
  const saveArgs: (string | undefined)[] = [];

  return {
    get planId() { return planId; },
    get planLoadError() { return planLoadError; },
    get planLoading() { return planLoading; },
    get requests() { return requests; },
    get saveArgs() { return saveArgs; },
    get canPersist() {
      return canPersistPlan({
        queryPlanId: prevQueryRoute ?? null,
        loadedPlanId: planId,
        loadFailed: planLoadError !== null,
        loading: planLoading,
      });
    },

    /** One effect setup. Returns the cleanup React would call. */
    setup(queryPlanId: string | null): () => void {
      const routeChanged = didRouteChange(prevQueryRoute, queryPlanId);
      prevQueryRoute = queryPlanId;
      if (routeChanged) {
        planId = null;
        planLoadError = null;
        // Route-owned, so the ROUTE clears it — a cancelled request cannot.
        planLoading = false;
        tracker.forget();
      }
      if (!queryPlanId) return () => {};

      const token = tracker.claim(queryPlanId);
      if (token === null) return () => {};

      const target = queryPlanId;
      let cancelled = false;
      const isStale = () => cancelled || !tracker.isLive(token);
      requests.push(target);
      void (async () => {
        planLoading = true;
        try {
          const res = await deps.getPlanForEdit(target);
          if (isStale()) return;
          if (res.status === 'ok') planId = res.plan.id;
          else if (res.status === 'not_found') planLoadError = 'That plan was not found on your account.';
          else planLoadError = res.message || "Couldn't load that plan.";
          tracker.settle(token);
          planLoading = false;
        } catch (e: any) {
          if (isStale()) return;
          planLoadError = e?.message || "Couldn't load that plan.";
          tracker.settle(token);
          planLoading = false;
        }
      })();
      return () => { cancelled = true; tracker.release(token); };
    },

    async persist() {
      if (!this.canPersist) return null;
      const arg = planId ?? undefined;
      saveArgs.push(arg);
      const returned = await savePlan(arg);
      planId = returned;
      return returned;
    },
  };
}

const okOnce = (id: string) => vi.fn(async (): Promise<LoadResult> => ({ status: 'ok', plan: { id } }));

describe('CASE A — React Strict Mode direct edit-route mount (P2 regression)', () => {
  it('restarts the cancelled load and finishes hydrating', async () => {
    const d1 = deferred<LoadResult>();
    const d2 = deferred<LoadResult>();
    const pending = [d1, d2];
    let n = 0;
    const m = makeBuilderModel({ getPlanForEdit: () => pending[n++].promise });

    // Strict Mode: setup, immediate cleanup, setup again — same mount, same route.
    const cleanup = m.setup('A');
    expect(m.requests).toEqual(['A']);
    expect(m.planLoading).toBe(true);

    cleanup();
    m.setup('A');

    // The whole point: the SAME route must load again after cancellation.
    expect(m.requests).toEqual(['A', 'A']);

    // The cancelled first response must not hydrate and must not end loading.
    d1.resolve({ status: 'ok', plan: { id: 'A-from-cancelled-request' } });
    await flush();
    expect(m.planId).toBeNull();
    expect(m.planLoading).toBe(true);

    // The live second response does both.
    d2.resolve({ status: 'ok', plan: { id: 'A' } });
    await flush();
    expect(m.planId).toBe('A');
    expect(m.planLoading).toBe(false);
    expect(m.planLoadError).toBeNull();
    expect(m.canPersist).toBe(true);
  });

  it('leaves the builder usable, not stuck behind a permanent loading flag', async () => {
    const d1 = deferred<LoadResult>();
    const d2 = deferred<LoadResult>();
    const pending = [d1, d2];
    let n = 0;
    const savePlan = vi.fn(async (planId?: string) => planId ?? 'should-not-create');
    const m = makeBuilderModel({ getPlanForEdit: () => pending[n++].promise, savePlan });

    const cleanup = m.setup('A');
    cleanup();
    m.setup('A');
    d1.resolve({ status: 'ok', plan: { id: 'A' } });
    d2.resolve({ status: 'ok', plan: { id: 'A' } });
    await flush();

    // Loading cleared → canPersistPlan no longer blocks → Save updates plan A.
    expect(m.planLoading).toBe(false);
    expect(await m.persist()).toBe('A');
    expect(savePlan).toHaveBeenCalledWith('A');
  });

  it('a Strict Mode restart of a FAILING route still settles instead of hanging', async () => {
    const d1 = deferred<LoadResult>();
    const d2 = deferred<LoadResult>();
    const pending = [d1, d2];
    let n = 0;
    const m = makeBuilderModel({ getPlanForEdit: () => pending[n++].promise });

    const cleanup = m.setup('bad');
    cleanup();
    m.setup('bad');
    d1.resolve({ status: 'not_found' });
    d2.resolve({ status: 'not_found' });
    await flush();

    expect(m.planLoading).toBe(false);
    expect(m.planLoadError).toMatch(/not found/i);
    expect(m.canPersist).toBe(false); // still write-blocked, but not hung
  });
});

describe('CASE B — same route already loaded does not reload', () => {
  it('a repeated setup on a settled route starts no second request', async () => {
    const getPlanForEdit = okOnce('A');
    const m = makeBuilderModel({ getPlanForEdit });

    const cleanup = m.setup('A');
    await flush();
    expect(m.planId).toBe('A');
    expect(m.requests).toEqual(['A']);

    // Effect re-evaluates (e.g. getPlanForEdit identity changed) — no refetch.
    cleanup();
    const cleanup2 = m.setup('A');
    cleanup2();
    m.setup('A');
    await flush();

    expect(m.requests).toEqual(['A']);
    expect(getPlanForEdit).toHaveBeenCalledTimes(1);
    expect(m.planId).toBe('A');
  });

  it('a settled ERROR does not retry forever', async () => {
    const getPlanForEdit = vi.fn(async (): Promise<LoadResult> => ({ status: 'error', message: 'boom' }));
    const m = makeBuilderModel({ getPlanForEdit });

    const cleanup = m.setup('A');
    await flush();
    cleanup();
    m.setup('A');
    await flush();

    expect(getPlanForEdit).toHaveBeenCalledTimes(1);
    expect(m.planLoadError).toBe('boom');
  });
});

describe('CASE C — edit A → plain create', () => {
  it('clears the canonical id so the next save is a CREATE', async () => {
    const savePlan = vi.fn(async (planId?: string) => planId ?? 'plan-brand-new');
    const m = makeBuilderModel({ getPlanForEdit: okOnce('A'), savePlan });

    const cleanup = m.setup('A');
    await flush();
    expect(m.planId).toBe('A');
    await m.persist();
    expect(m.saveArgs[0]).toBe('A');

    cleanup();
    m.setup(null); // navigate to /plans/builder
    expect(m.planId).toBeNull();

    expect(await m.persist()).toBe('plan-brand-new');
    expect(m.saveArgs[1]).toBeUndefined();
  });

  it('re-opening the same plan afterwards loads it again', async () => {
    const getPlanForEdit = okOnce('A');
    const m = makeBuilderModel({ getPlanForEdit });

    const cleanup = m.setup('A');
    await flush();
    cleanup();

    const cleanup2 = m.setup(null); // A → create clears the completion record
    cleanup2();
    m.setup('A'); // create → A is a real navigation, so it must load
    await flush();

    expect(getPlanForEdit).toHaveBeenCalledTimes(2);
    expect(m.planId).toBe('A');
  });
});

describe('CASE D — plain create → save keeps the canonical id', () => {
  it('second save UPDATES plan-new instead of creating a second plan', async () => {
    let created = 0;
    const savePlan = vi.fn(async (planId?: string) => {
      if (!planId) { created++; return 'plan-new'; }
      return planId;
    });
    const getPlanForEdit = vi.fn(async (): Promise<LoadResult> => ({ status: 'not_found' }));
    const m = makeBuilderModel({ getPlanForEdit, savePlan });

    const cleanup = m.setup(null);
    expect(await m.persist()).toBe('plan-new');
    expect(m.saveArgs[0]).toBeUndefined();

    // Effect re-evaluations on the SAME (absent) route must not clear the id.
    cleanup();
    for (let i = 0; i < 5; i++) m.setup(null)();
    expect(m.planId).toBe('plan-new');

    expect(await m.persist()).toBe('plan-new');
    expect(m.saveArgs).toEqual([undefined, 'plan-new']);
    expect(created).toBe(1);
    expect(getPlanForEdit).not.toHaveBeenCalled();
  });
});

describe('CASE E — edit A → edit B', () => {
  it('clears A, loads B, and a stale A response cannot overwrite B', async () => {
    const dA = deferred<LoadResult>();
    const dB = deferred<LoadResult>();
    const byId: Record<string, Promise<LoadResult>> = { A: dA.promise, B: dB.promise };
    const m = makeBuilderModel({ getPlanForEdit: (id) => byId[id] });

    const cleanupA = m.setup('A');
    cleanupA();
    m.setup('B');
    expect(m.requests).toEqual(['A', 'B']);
    expect(m.planId).toBeNull();

    // A answers LATE, after B is already the live route.
    dB.resolve({ status: 'ok', plan: { id: 'B' } });
    dA.resolve({ status: 'ok', plan: { id: 'A' } });
    await flush();

    expect(m.planId).toBe('B');
    await m.persist();
    expect(m.saveArgs[0]).toBe('B');
  });

  it('a stale A ERROR cannot block writes on B', async () => {
    const dA = deferred<LoadResult>();
    const dB = deferred<LoadResult>();
    const byId: Record<string, Promise<LoadResult>> = { A: dA.promise, B: dB.promise };
    const m = makeBuilderModel({ getPlanForEdit: (id) => byId[id] });

    const cleanupA = m.setup('A');
    cleanupA();
    m.setup('B');

    dB.resolve({ status: 'ok', plan: { id: 'B' } });
    dA.resolve({ status: 'not_found' });
    await flush();

    expect(m.planLoadError).toBeNull();
    expect(m.canPersist).toBe(true);
  });
});

describe('CASE G — edit A → create DURING an active load (P2 regression)', () => {
  it('clears loading immediately, and the stale A response changes nothing', async () => {
    const dA = deferred<LoadResult>();
    const savePlan = vi.fn(async (planId?: string) => planId ?? 'plan-new');
    const m = makeBuilderModel({ getPlanForEdit: () => dA.promise, savePlan });

    // 1–3: A is loading, and its request is deliberately left unresolved.
    const cleanupA = m.setup('A');
    expect(m.planLoading).toBe(true);
    expect(m.requests).toEqual(['A']);
    expect(m.canPersist).toBe(false);

    // 4–5: navigate to plain /plans/builder while A is still in flight.
    cleanupA();
    m.setup(null);

    // 6–7: writable immediately, without waiting on A. This is the regression:
    // A was cancelled, so nothing else can ever clear planLoading.
    expect(m.planLoading).toBe(false);
    expect(m.planId).toBeNull();
    expect(m.planLoadError).toBeNull();
    expect(m.canPersist).toBe(true);

    // 8–9: the stale A response must not resurrect any of it.
    dA.resolve({ status: 'ok', plan: { id: 'A' } });
    await flush();
    expect(m.planLoading).toBe(false);
    expect(m.planId).toBeNull();
    expect(m.planLoadError).toBeNull();
    expect(m.canPersist).toBe(true);
    expect(m.requests).toEqual(['A']); // no refetch was triggered either

    // 10–11: saving on the create route is a CREATE — no stale A id supplied.
    expect(await m.persist()).toBe('plan-new');
    expect(m.saveArgs).toEqual([undefined]);
    expect(savePlan).toHaveBeenCalledWith(undefined);
  });

  it('a stale A not_found cannot block the create route', async () => {
    const dA = deferred<LoadResult>();
    const m = makeBuilderModel({ getPlanForEdit: () => dA.promise });

    const cleanupA = m.setup('A');
    cleanupA();
    m.setup(null);
    expect(m.planLoading).toBe(false);

    dA.resolve({ status: 'not_found' });
    await flush();

    expect(m.planLoadError).toBeNull();
    expect(m.planLoading).toBe(false);
    expect(m.canPersist).toBe(true);
    expect(await m.persist()).toBe('plan-new');
    expect(m.saveArgs).toEqual([undefined]);
  });

  it('a stale A rejection cannot block the create route', async () => {
    const dA = deferred<LoadResult>();
    const m = makeBuilderModel({ getPlanForEdit: () => dA.promise });

    const cleanupA = m.setup('A');
    cleanupA();
    m.setup(null);

    dA.reject(new Error('network died'));
    await flush();

    expect(m.planLoadError).toBeNull();
    expect(m.planLoading).toBe(false);
    expect(m.canPersist).toBe(true);
  });

  it('leaving an active load for a DIFFERENT plan still shows B loading', async () => {
    const dA = deferred<LoadResult>();
    const dB = deferred<LoadResult>();
    const byId: Record<string, Promise<LoadResult>> = { A: dA.promise, B: dB.promise };
    const m = makeBuilderModel({ getPlanForEdit: (id) => byId[id] });

    const cleanupA = m.setup('A');
    cleanupA();
    m.setup('B');

    // The route reset clears loading, but B's own request re-raises it in the
    // same effect run — so A -> B must not flash as "not loading".
    expect(m.planLoading).toBe(true);
    expect(m.canPersist).toBe(false);

    dA.resolve({ status: 'ok', plan: { id: 'A' } });
    await flush();
    expect(m.planLoading).toBe(true); // still waiting on B, not on stale A
    expect(m.planId).toBeNull();

    dB.resolve({ status: 'ok', plan: { id: 'B' } });
    await flush();
    expect(m.planLoading).toBe(false);
    expect(m.planId).toBe('B');
  });
});

describe('CASE F — an incomplete attempt leaves the same route eligible', () => {
  it('cancelling before completion allows the identical route to load again', () => {
    const tracker = createPlanLoadTracker();

    const t1 = tracker.claim('A');
    expect(t1).not.toBeNull();
    expect(tracker.inFlightFor).toBe('A');

    tracker.release(t1!); // cancelled before it ever completed
    expect(tracker.settledFor).toBeNull();

    const t2 = tracker.claim('A');
    expect(t2).not.toBeNull(); // eligible again — this is the Strict Mode fix
    expect(t2).not.toBe(t1);
    expect(tracker.isLive(t1!)).toBe(false);
  });

  it('a completed route is not eligible until the route changes', () => {
    const tracker = createPlanLoadTracker();
    const t1 = tracker.claim('A')!;
    tracker.settle(t1);
    expect(tracker.settledFor).toBe('A');
    expect(tracker.claim('A')).toBeNull();

    tracker.forget(); // route changed away and back
    expect(tracker.claim('A')).not.toBeNull();
  });

  it('a superseded token can neither settle nor report itself live', () => {
    const tracker = createPlanLoadTracker();
    const stale = tracker.claim('A')!;
    tracker.release(stale);
    const live = tracker.claim('B')!;

    tracker.settle(stale); // must be ignored
    expect(tracker.settledFor).toBeNull();
    expect(tracker.isLive(stale)).toBe(false);
    expect(tracker.isLive(live)).toBe(true);

    tracker.settle(live);
    expect(tracker.settledFor).toBe('B');
  });

  it('release from a superseded token cannot cancel the live request', () => {
    const tracker = createPlanLoadTracker();
    const stale = tracker.claim('A')!;
    const live = tracker.claim('B')!;
    tracker.release(stale);
    expect(tracker.isLive(live)).toBe(true);
    expect(tracker.inFlightFor).toBe('B');
  });
});

describe('failed-edit write blocking survives', () => {
  it('stays blocked and creates nothing', async () => {
    const savePlan = vi.fn(async (planId?: string) => planId ?? 'should-not-happen');
    const m = makeBuilderModel({
      getPlanForEdit: async () => ({ status: 'not_found' }),
      savePlan,
    });

    m.setup('bad');
    await flush();
    expect(m.planId).toBeNull();
    expect(await m.persist()).toBeNull();
    expect(savePlan).not.toHaveBeenCalled();
  });

  it('recovers when a valid plan is opened afterwards', async () => {
    const byId: Record<string, LoadResult> = {
      bad: { status: 'not_found' },
      A: { status: 'ok', plan: { id: 'A' } },
    };
    const m = makeBuilderModel({ getPlanForEdit: async (id) => byId[id] });

    const cleanup = m.setup('bad');
    await flush();
    expect(await m.persist()).toBeNull();

    cleanup();
    m.setup('A');
    await flush();

    expect(m.planLoadError).toBeNull();
    expect(await m.persist()).toBe('A');
    expect(m.saveArgs[0]).toBe('A');
  });
});

describe('didRouteChange answers route identity only', () => {
  it('is false for an unchanged route, whatever is loaded', () => {
    expect(didRouteChange(null, null)).toBe(false);
    expect(didRouteChange('A', 'A')).toBe(false);
  });

  it('is true for every real navigation', () => {
    expect(didRouteChange('A', null)).toBe(true);   // edit → create
    expect(didRouteChange(null, 'A')).toBe(true);   // create → edit
    expect(didRouteChange('A', 'B')).toBe(true);    // edit → edit
  });

  it('treats mounting straight onto an edit route as a change', () => {
    expect(didRouteChange(undefined, 'A')).toBe(true);
    expect(didRouteChange(undefined, null)).toBe(false); // nothing to clear
  });
});

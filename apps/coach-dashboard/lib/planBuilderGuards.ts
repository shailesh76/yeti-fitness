/**
 * Concurrency and edit-state guards for the plan builder.
 *
 * These live outside the component so they can be exercised directly: React
 * state updates are asynchronous and batched, so `saving`/`assignSubmitting`
 * cannot stop two handlers that fire in the same tick from both reaching
 * savePlan(). For a NEW plan that raced into two distinct workout_plans rows,
 * because Phase 2's assignExistingPlan guard only engages after a plan id
 * exists. The guard below flips a plain boolean synchronously, before any
 * await, which is the actual concurrency boundary; React state is kept purely
 * for spinners and disabled attributes.
 */

export interface SaveGuard {
  /** Synchronously claims the slot. False means a save is already in flight. */
  tryAcquire(): boolean;
  release(): void;
  readonly isInFlight: boolean;
}

export function createSaveGuard(): SaveGuard {
  let inFlight = false;
  return {
    tryAcquire() {
      if (inFlight) return false;
      inFlight = true;
      return true;
    },
    release() {
      inFlight = false;
    },
    get isInFlight() {
      return inFlight;
    },
  };
}

export interface EditLoadState {
  /** planId from the query string, if any. */
  queryPlanId: string | null;
  /** Plan id actually hydrated into the builder. */
  loadedPlanId: string | null;
  /** True when a load for queryPlanId failed (missing/unauthorized/error). */
  loadFailed: boolean;
  /** True while a load is in progress. */
  loading: boolean;
}

/**
 * Whether persistence may proceed.
 *
 * The important case: the URL names a plan but it could not be loaded
 * (malformed id, deleted, another coach's, or a query error). Previously
 * `planId` simply stayed null and a save would silently fall through into
 * CREATE mode, minting a brand-new plan the coach never asked for. That route
 * is now blocked until a real plan is loaded or the coach navigates to a clean
 * /plans/builder.
 */
export function canPersistPlan(state: EditLoadState): boolean {
  if (state.loading) return false;
  if (state.queryPlanId) {
    if (state.loadFailed) return false;
    // Edit route that has not produced a plan id yet must not create one.
    if (state.loadedPlanId !== state.queryPlanId) return false;
  }
  return true;
}

/**
 * Whether the ROUTE changed between two evaluations of the load effect.
 *
 * It deliberately does NOT look at the loaded planId: the canonical id
 * returned by savePlan() is local persistence state, not navigation. An
 * earlier version keyed off the loaded id and regressed hard — on the plain
 * create route, saving set planId to the new canonical id, the effect re-ran
 * because that id was a dependency, the comparison saw "route has no plan but
 * an id is loaded", cleared it, and the next Save created a SECOND plan
 * instead of updating the first.
 *
 * This answers route identity ONLY. Whether a load must actually run is a
 * separate question owned by the load tracker below, because the same route
 * can need to load more than once (see createPlanLoadTracker).
 *
 * Pass `undefined` as `previousQueryPlanId` on the first evaluation (mount);
 * mounting straight onto an edit route counts as a change, mounting onto the
 * plain create route does not (there is nothing to clear).
 */
export function didRouteChange(
  previousQueryPlanId: string | null | undefined,
  currentQueryPlanId: string | null,
): boolean {
  if (previousQueryPlanId === undefined) return currentQueryPlanId !== null;
  return previousQueryPlanId !== currentQueryPlanId;
}

export interface PlanLoadTracker {
  /**
   * Claim the right to load `queryPlanId`. Returns a request token when a load
   * must start, or null when this exact route has already completed or a live
   * request for it is already running.
   */
  claim(queryPlanId: string): number | null;
  /**
   * Effect cleanup. Drops the claim if `token` still owns it, so the very same
   * route becomes eligible to load again — this is what makes the effect
   * survive React Strict Mode's setup → cleanup → setup double-invocation.
   */
  release(token: number): void;
  /** A request finished (hydrated OR errored) without being cancelled. */
  settle(token: number): void;
  /** A route change voids whatever the previous route recorded. */
  forget(): void;
  /** False once a newer request has superseded or cleanup has dropped `token`. */
  isLive(token: number): boolean;
  /** Route whose load ran to completion, or null. */
  readonly settledFor: string | null;
  /** Route with a live request in flight, or null. */
  readonly inFlightFor: string | null;
}

/**
 * Tracks the load LIFECYCLE of the ?planId= route, separately from route
 * identity.
 *
 * Route identity alone is not enough. Under React Strict Mode the load effect
 * runs setup → cleanup → setup on the same mount with the same route. The
 * first request is cancelled by that cleanup, so it can neither hydrate the
 * builder nor clear `planLoading`; if the second setup skips the load merely
 * because the route is unchanged, the builder stays stuck on "Loading plan…"
 * forever and canPersistPlan() blocks every write. The distinction that fixes
 * it is "same route" vs "same route already loaded to completion".
 *
 * The token doubles as a generation counter: a response may only touch state
 * while its token is still live, so a slow response for plan A can never
 * overwrite plan B.
 */
export function createPlanLoadTracker(): PlanLoadTracker {
  let settledFor: string | null = null;
  let inFlightFor: string | null = null;
  let inFlightToken: number | null = null;
  let nextToken = 1;

  return {
    claim(queryPlanId) {
      // Already ran to completion for this exact route — ok or error, either
      // way re-running would be a pointless refetch (and, on the error path,
      // an infinite retry loop).
      if (settledFor === queryPlanId) return null;
      // A live request for this route is already running. After cleanup this
      // is null again, which is precisely what lets Strict Mode restart it.
      if (inFlightToken !== null && inFlightFor === queryPlanId) return null;
      const token = nextToken++;
      inFlightFor = queryPlanId;
      inFlightToken = token;
      return token;
    },
    release(token) {
      if (inFlightToken !== token) return; // a newer request owns the slot
      inFlightFor = null;
      inFlightToken = null;
    },
    settle(token) {
      if (inFlightToken !== token) return; // stale or cancelled — ignore
      settledFor = inFlightFor;
      inFlightFor = null;
      inFlightToken = null;
    },
    forget() {
      settledFor = null;
    },
    isLive(token) {
      return inFlightToken === token;
    },
    get settledFor() {
      return settledFor;
    },
    get inFlightFor() {
      return inFlightFor;
    },
  };
}

/** Human-readable reason persistence is blocked, or null when allowed. */
export function persistBlockedReason(state: EditLoadState): string | null {
  if (state.loading) return 'Loading this plan…';
  if (state.queryPlanId && state.loadFailed) {
    return "This plan couldn't be loaded, so saving is disabled. Open a plan from Programs, or start a new plan.";
  }
  if (state.queryPlanId && state.loadedPlanId !== state.queryPlanId) {
    return 'Waiting for this plan to load before saving.';
  }
  return null;
}

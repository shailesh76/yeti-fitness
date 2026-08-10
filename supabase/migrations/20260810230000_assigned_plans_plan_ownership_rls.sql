-- ============================================================================
-- 20260810230000_assigned_plans_plan_ownership_rls.sql
-- ============================================================================
-- Hardens assigned_plans RLS so a coach cannot assign a workout plan they do
-- not own.
--
-- BEFORE (20260702_shared_backend_integration.sql):
--   CREATE POLICY "Coaches manage assigned plans" ON public.assigned_plans
--     FOR ALL USING (EXISTS (SELECT 1 FROM coach_clients cc
--                            WHERE cc.coach_id = auth.uid()
--                              AND cc.athlete_id = assigned_plans.athlete_id));
--
-- That proves the ATHLETE belongs to the coach but says nothing about
-- plan_id. A coach could therefore insert an assigned_plans row pointing at
-- another coach's workout_plans row, for their own athlete — leaking the other
-- coach's programming (the athlete app resolves plan_id -> plan_days ->
-- plan_exercises).
--
-- Note on policy composition: policies for the same command are OR-ed, so
-- simply ADDING a stricter policy alongside the old permissive one would not
-- close the hole — the permissive one would still pass. The old policy is
-- therefore DROPPED and replaced with explicit per-command policies.
--
-- Effective semantics after this migration:
--   SELECT (coach)  : athlete linked via coach_clients
--                     (unchanged; historical rows stay readable even if the
--                      referenced plan later changes hands)
--   INSERT          : athlete linked via coach_clients
--                     AND workout_plans.coach_id = auth.uid()
--   UPDATE          : same as INSERT, enforced on both the existing row
--                     (USING) and the resulting row (WITH CHECK)
--   DELETE          : athlete linked via coach_clients
--                     (lets a coach clean up an assignment even if the plan
--                      is no longer theirs; no cross-coach data is exposed)
--   Athlete SELECT  : unchanged, still auth.uid() = athlete_id
--
-- assigned_plans intentionally keeps NO status/active column: the product
-- treats the most recent assigned_at as the athlete's current plan and retains
-- earlier rows as history. Nothing here adds a uniqueness constraint, so
-- legitimate reassignment (including re-assigning the same plan later) stays
-- possible.
-- ============================================================================

-- Single transaction: the old permissive policy is dropped before the
-- replacements are created, so a partial apply must never be able to leave
-- assigned_plans with no coach policy at all.
BEGIN;

ALTER TABLE public.assigned_plans ENABLE ROW LEVEL SECURITY;

-- ── Plan-ownership check, via SECURITY DEFINER to avoid RLS recursion ───────
-- A plain `EXISTS (SELECT 1 FROM public.workout_plans ...)` inside an
-- assigned_plans policy deadlocks: evaluating it applies workout_plans' own
-- RLS, and the policy "Users can view their own workout plans." contains an
-- EXISTS against assigned_plans — so assigned_plans -> workout_plans ->
-- assigned_plans, which Postgres aborts with
--   "infinite recursion detected in policy for relation \"assigned_plans\"".
-- That made every coach assignment fail, not just cross-coach ones.
--
-- Running the lookup as the function owner bypasses workout_plans' RLS and
-- breaks the cycle. It is STABLE and reads exactly one row; it discloses only
-- a boolean about a plan id the caller already supplied, and only ever
-- compares against auth.uid(), so it cannot be used to enumerate other
-- coaches' plans.
CREATE OR REPLACE FUNCTION public.coach_owns_workout_plan(p_plan_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workout_plans wp
    WHERE wp.id = p_plan_id
      AND wp.coach_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.coach_owns_workout_plan(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.coach_owns_workout_plan(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.coach_owns_workout_plan(uuid) FROM service_role;
GRANT EXECUTE ON FUNCTION public.coach_owns_workout_plan(uuid) TO authenticated;

-- Replace the over-permissive FOR ALL policy.
DROP POLICY IF EXISTS "Coaches manage assigned plans" ON public.assigned_plans;

DROP POLICY IF EXISTS "Coaches view assigned plans" ON public.assigned_plans;
CREATE POLICY "Coaches view assigned plans"
  ON public.assigned_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_clients cc
      WHERE cc.coach_id = auth.uid()
        AND cc.athlete_id = assigned_plans.athlete_id
    )
  );

DROP POLICY IF EXISTS "Coaches assign own plans" ON public.assigned_plans;
CREATE POLICY "Coaches assign own plans"
  ON public.assigned_plans FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_clients cc
      WHERE cc.coach_id = auth.uid()
        AND cc.athlete_id = assigned_plans.athlete_id
    )
    AND public.coach_owns_workout_plan(assigned_plans.plan_id)
  );

DROP POLICY IF EXISTS "Coaches update own plan assignments" ON public.assigned_plans;
CREATE POLICY "Coaches update own plan assignments"
  ON public.assigned_plans FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_clients cc
      WHERE cc.coach_id = auth.uid()
        AND cc.athlete_id = assigned_plans.athlete_id
    )
    AND public.coach_owns_workout_plan(assigned_plans.plan_id)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_clients cc
      WHERE cc.coach_id = auth.uid()
        AND cc.athlete_id = assigned_plans.athlete_id
    )
    AND public.coach_owns_workout_plan(assigned_plans.plan_id)
  );

DROP POLICY IF EXISTS "Coaches delete assigned plans" ON public.assigned_plans;
CREATE POLICY "Coaches delete assigned plans"
  ON public.assigned_plans FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_clients cc
      WHERE cc.coach_id = auth.uid()
        AND cc.athlete_id = assigned_plans.athlete_id
    )
  );

-- "Athletes view assigned plans" (20260702) is deliberately left untouched.

COMMIT;

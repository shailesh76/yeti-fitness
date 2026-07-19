-- ============================================================================
-- 20260723_athlete_workout_builder.sql — Step 4.5 prerequisite
-- ============================================================================
-- Two independent, additive fixes needed before an athlete can build their own
-- workout templates using the canonical workout_plans -> plan_days ->
-- plan_exercises hierarchy (as opposed to the legacy workout_plan_exercises
-- table, which stays untouched — no new writes to it going forward).
--
-- 1. RLS gap (confirmed live, not just read from migration files): athletes
--    can already INSERT their own workout_plans row (user_id = self, no
--    coach) — that policy has existed since 20240627. But plan_days and
--    plan_exercises only ever got a "coach manages via wp.coach_id" policy
--    (20260702) plus an "athlete views via assigned_plans" SELECT policy
--    (20260703) — there was never a policy letting an athlete manage
--    plan_days/plan_exercises for a plan THEY own directly (wp.user_id).
--    Verified live: an authenticated athlete inserting a workout_plans row
--    succeeds, then inserting a plan_days row under it fails with 42501.
--    This adds the missing "own plan" policies, mirroring the existing
--    coach policies exactly but keyed on wp.user_id instead of wp.coach_id.
--
-- 2. Schema gap: plan_exercises only has sets/reps/weight (all TEXT). There's
--    no column for RPE, rest time, per-exercise notes, warm-up set count,
--    drop-set flag, or superset grouping — all needed to satisfy Step 4.5's
--    "configure sets, reps, weight target, RPE and rest time" / "notes" /
--    "warm-up sets, drop sets, supersets" requirements. workout_plans has no
--    notes column either. All additive, all nullable — no existing row is
--    affected. True circuit support (ordered rotation through stations) has
--    no equivalent anywhere in this schema and is out of scope here; the
--    superset_group column is reused for that when useful, but this
--    migration does not claim to model circuits specifically.
-- ============================================================================

-- 1. RLS: athlete-owned plans (no coach) can manage their own plan_days/plan_exercises
DROP POLICY IF EXISTS "Athletes manage own plan days" ON public.plan_days;
CREATE POLICY "Athletes manage own plan days" ON public.plan_days FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workout_plans wp WHERE wp.id = plan_id AND wp.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Athletes manage own plan exercises" ON public.plan_exercises;
CREATE POLICY "Athletes manage own plan exercises" ON public.plan_exercises FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.plan_days pd
    JOIN public.workout_plans wp ON wp.id = pd.plan_id
    WHERE pd.id = plan_day_id AND wp.user_id = auth.uid()
  )
);

-- 2. Schema: exercise-level prescription fields + workout-level notes
ALTER TABLE public.plan_exercises ADD COLUMN IF NOT EXISTS target_rpe NUMERIC;
ALTER TABLE public.plan_exercises ADD COLUMN IF NOT EXISTS rest_seconds INTEGER;
ALTER TABLE public.plan_exercises ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.plan_exercises ADD COLUMN IF NOT EXISTS warmup_sets INTEGER DEFAULT 0;
ALTER TABLE public.plan_exercises ADD COLUMN IF NOT EXISTS is_dropset BOOLEAN DEFAULT false;
ALTER TABLE public.plan_exercises ADD COLUMN IF NOT EXISTS superset_group UUID;

ALTER TABLE public.workout_plans ADD COLUMN IF NOT EXISTS notes TEXT;

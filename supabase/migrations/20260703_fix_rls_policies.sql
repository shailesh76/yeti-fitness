-- 20260703_fix_rls_policies.sql
-- Fix athlete RLS on plan_days: the old policy checked wp.user_id which no longer
-- exists after the schema refactor. Athletes access plans via assigned_plans.
DROP POLICY IF EXISTS "Athletes view assigned plan days" ON public.plan_days;
CREATE POLICY "Athletes view assigned plan days" ON public.plan_days FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.assigned_plans ap
    WHERE ap.plan_id = plan_days.plan_id
      AND ap.athlete_id = auth.uid()
  )
);

-- Fix athlete RLS on plan_exercises for the same reason.
DROP POLICY IF EXISTS "Athletes view assigned plan exercises" ON public.plan_exercises;
CREATE POLICY "Athletes view assigned plan exercises" ON public.plan_exercises FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.plan_days pd
    JOIN public.assigned_plans ap ON ap.plan_id = pd.plan_id
    WHERE pd.id = plan_exercises.plan_day_id
      AND ap.athlete_id = auth.uid()
  )
);

-- Ensure profiles RLS: users can only read their own profile
-- (required for middleware role check via anon client)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Coaches need to read athlete profiles for the roster.
-- Scope this narrowly: only profiles the coach has in coach_clients.
DROP POLICY IF EXISTS "Coaches read client profiles" ON public.profiles;
CREATE POLICY "Coaches read client profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.coach_clients cc
      WHERE cc.coach_id = auth.uid()
        AND cc.athlete_id = profiles.id
    )
  );

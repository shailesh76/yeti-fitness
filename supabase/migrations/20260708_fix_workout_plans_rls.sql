-- Migration: Fix workout_plans RLS select policy to allow athletes to view assigned plans
DROP POLICY IF EXISTS "Users can view their own workout plans." ON public.workout_plans;

CREATE POLICY "Users can view their own workout plans."
  ON public.workout_plans FOR SELECT
  USING (
    auth.uid() = user_id 
    OR auth.uid() = coach_id
    OR EXISTS (
      SELECT 1 FROM public.assigned_plans ap
      WHERE ap.plan_id = workout_plans.id
        AND ap.athlete_id = auth.uid()
    )
  );

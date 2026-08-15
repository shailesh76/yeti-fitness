-- Migration: Add select policy to allow coaches to read client meal logs
DROP POLICY IF EXISTS "Coaches view client meal logs" ON public.meal_logs;

CREATE POLICY "Coaches view client meal logs"
  ON public.meal_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_clients cc
      WHERE cc.athlete_id = meal_logs.user_id
        AND cc.coach_id = auth.uid()
    )
  );

-- Migration: Add select policy to allow athletes to read their coach's profile
DROP POLICY IF EXISTS "Athletes can view their coaches' profiles" ON public.profiles;

CREATE POLICY "Athletes can view their coaches' profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_clients cc
      WHERE cc.athlete_id = auth.uid()
        AND cc.coach_id = profiles.id
    )
  );

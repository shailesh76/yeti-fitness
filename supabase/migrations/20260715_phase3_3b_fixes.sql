-- ============================================================
-- Phase 3.3B: RLS and Edge Function Security Hardening
-- ============================================================

-- 1. progression_recommendations UPDATE policy for coaches
-- Drops any existing coach update policy to prevent conflict
DROP POLICY IF EXISTS "Coaches can update client recommendations" ON public.progression_recommendations;

-- Adds the policy allowing assigned coaches to update client suggestions (e.g. approve/reject)
CREATE POLICY "Coaches can update client recommendations" ON public.progression_recommendations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.coach_clients cc
      WHERE cc.coach_id = auth.uid() AND cc.athlete_id = progression_recommendations.user_id
    )
  );

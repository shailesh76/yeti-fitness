-- ============================================================================
-- 20260728_coach_nutrition_targets.sql
-- ============================================================================
-- Lets a coach assign an athlete's nutrition targets, using the CANONICAL target
-- columns that already exist on public.profiles (added 2024):
--   daily_calorie_target, daily_protein_target, daily_carb_target, daily_fat_target
--
-- This migration is ADDITIVE ONLY — it adds a lock + audit trail and an RLS
-- policy. It does NOT touch existing target values, so every athlete's current
-- targets are preserved.
--
-- `nutrition_targets_locked = true` means a coach set the targets and the athlete
-- app must treat them as read-only (enforced in the mobile UI and re-checked in
-- saveNutritionTargets before any athlete self-write).
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nutrition_targets_locked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nutrition_targets_updated_by UUID;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nutrition_targets_updated_at TIMESTAMPTZ;

-- Allow a coach to UPDATE the profile row of an athlete they are assigned to.
-- Additive to the existing "users update their own profile" policy (policies for
-- the same command are OR-ed), so athletes keep editing their own row.
--
-- NOTE: Postgres RLS is row-level, not column-level. This grants the coach UPDATE
-- on the assigned athlete's profile row; the application only ever writes the
-- daily_*_target + lock/audit columns from the coach path. If tighter isolation
-- is required later, move the coach write behind a SECURITY DEFINER edge function
-- (validate coach_clients, update only the target columns) and drop this policy.
DROP POLICY IF EXISTS "Coaches update client nutrition targets" ON public.profiles;
CREATE POLICY "Coaches update client nutrition targets"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_clients cc
      WHERE cc.athlete_id = profiles.id AND cc.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coach_clients cc
      WHERE cc.athlete_id = profiles.id AND cc.coach_id = auth.uid()
    )
  );

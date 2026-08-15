-- ============================================================================
-- 20260727_exercises_sync_columns.sql
-- ============================================================================
-- Adds the two missing columns to the exercises table that the spec requires
-- (created_at, default_rest_period_sec) and attaches the shared updated_at
-- trigger so exercises can participate in incremental WatermelonDB sync.
--
-- The exercises table already has:
--   - updated_at (added in 20260719_exercise_catalog_enrichment.sql)
--   - idx_exercises_updated_at index (same migration)
-- So we only need the two new columns + the trigger attachment.
-- ============================================================================

-- 1. Add missing columns ------------------------------------------------------

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS default_rest_period_sec INTEGER DEFAULT 90;

-- 2. Backfill created_at for existing rows ------------------------------------
-- Use updated_at as the best available proxy; fall back to NOW() for any nulls.
UPDATE public.exercises
  SET created_at = COALESCE(created_at, updated_at, NOW())
  WHERE created_at IS NULL;

-- 3. Attach the shared updated_at trigger -------------------------------------
-- The function set_workout_plan_sync_updated_at() already exists from
-- 20260724_offline_workout_plan_sync.sql — reuse it here.
DROP TRIGGER IF EXISTS set_sync_updated_at ON public.exercises;
CREATE TRIGGER set_sync_updated_at
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW
  EXECUTE FUNCTION public.set_workout_plan_sync_updated_at();

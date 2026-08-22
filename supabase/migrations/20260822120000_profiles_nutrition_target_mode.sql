-- ============================================================================
-- 20260822120000_profiles_nutrition_target_mode.sql
-- ============================================================================
-- Persists whether an athlete's nutrition targets are dynamically auto-calculated
-- ('AUTO') or manually overridden ('MANUAL') by the athlete.
--
-- Why: Ensures target provenance survives cross-device login, local cache clearing,
-- and app reinstallation without reverting manual targets to auto-calculated defaults.
--
-- Backfill strategy: Defaults new and unassigned rows to 'AUTO'. Coach locked targets
-- (nutrition_targets_locked = true) remain protected by lock flag unconditionally.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nutrition_target_mode TEXT
  CHECK (nutrition_target_mode IN ('AUTO', 'MANUAL'))
  DEFAULT 'AUTO';

-- Comment on column
COMMENT ON COLUMN public.profiles.nutrition_target_mode IS 'Target provenance: AUTO (recalculates with body changes) vs MANUAL (athlete explicit custom values).';

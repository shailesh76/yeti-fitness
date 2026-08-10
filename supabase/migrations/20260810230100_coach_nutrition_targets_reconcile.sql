-- ============================================================================
-- 20260810230100_coach_nutrition_targets_reconcile.sql
-- ============================================================================
-- Reconciliation for the coach nutrition-targets feature, plus a narrowly
-- scoped write path that replaces the rejected table-wide UPDATE policy.
--
-- WHY THIS EXISTS
-- `supabase migration list --linked` reports 20260728 as applied remotely, but
-- a direct catalog check against production on 2026-08-10 found NONE of its
-- objects present:
--
--   select attname from pg_attribute
--    where attrelid = 'public.profiles'::regclass
--      and attname like 'nutrition_targets%';                       -> 0 rows
--
--   select policyname, cmd from pg_policies
--    where schemaname='public' and tablename='profiles' and cmd='UPDATE';
--                                            -> only "Users update own profile"
--
-- The 20260728 ledger row is therefore false. Root cause: schema_migrations has
-- PRIMARY KEY (version), and this repo has many migration files sharing one
-- 8-digit version prefix — recording any one of them marks the whole group
-- applied. This file uses a unique full 14-digit timestamp to avoid repeating
-- that mistake.
--
-- Consequence while unapplied: the coach nutrition feature is dead in
-- production — it writes columns that do not exist, and no write path exists.
--
-- WHY AN RPC INSTEAD OF AN RLS POLICY
-- 20260728 proposed:
--   CREATE POLICY "Coaches update client nutrition targets"
--     ON public.profiles FOR UPDATE USING (<coach_clients link>);
--
-- That was rejected in review, correctly: Postgres RLS is row-level, not
-- column-level, so such a policy lets a coach update EVERY column of a linked
-- athlete's profile row — full_name, role, weight_kg, goal, and so on. Nothing
-- but application discipline would keep the write to the target columns.
--
-- Instead the write goes through assign_client_nutrition_targets(), which
-- touches exactly seven columns and derives the coach from auth.uid(). No
-- generic coach UPDATE policy on public.profiles is created, and the athlete's
-- own "Users update own profile" policy is left exactly as it is.
--
-- WHY SECURITY DEFINER IS REQUIRED
-- With no coach UPDATE policy on public.profiles, a coach's own privileges
-- cannot update the athlete's row at all — RLS would reject it. The function
-- must therefore run with the privileges of its owner to perform the write,
-- and carries its own authorization check (coach_clients) plus a fixed column
-- list. Hardening applied per Postgres guidance:
--   * SET search_path = ''  — the narrowest possible setting. Nothing is
--     resolved through a caller-influenced path. pg_catalog remains implicitly
--     searched (Postgres always searches it first unless it is named
--     explicitly elsewhere in the path), so built-ins still resolve; they are
--     schema-qualified below anyway so resolution never depends on that.
--     pg_temp is deliberately NOT in the path: leaving it out prevents a
--     caller from shadowing an object with a temporary one of the same name.
--   * every table and function reference schema-qualified, including
--     auth.uid(), public.coach_clients, public.profiles, pg_catalog.now()
--     and pg_catalog.round(); PL/pgSQL DECLARE types are qualified too,
--     because those are resolved at first execution under this search_path,
--     not at CREATE time like the signature.
--   * EXECUTE revoked from PUBLIC, anon AND service_role, granted only to
--     authenticated. Supabase's default privileges on schema public hand
--     EXECUTE to anon/authenticated/service_role at CREATE time, so each
--     unwanted grantee needs its own REVOKE — revoking PUBLIC does not strip
--     them. The coach dashboard authenticates end users with the anon key + a
--     user JWT, so every real caller arrives as `authenticated`; service_role
--     has no need for this function (and, bypassing RLS, could already write
--     the table directly — so this is about an accurate least-privilege
--     surface, not about blocking an escalation path).
--   * coach identity read only from auth.uid(); never a client-supplied value
-- ============================================================================

BEGIN;

-- ── 1. Columns 20260728 was supposed to add (idempotent) ────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nutrition_targets_locked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nutrition_targets_updated_by UUID;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nutrition_targets_updated_at TIMESTAMPTZ;

-- ── 2. Make sure no table-wide coach UPDATE policy is left behind ───────────
-- Defensive: if 20260728 is ever partially applied by another path, this keeps
-- the rejected broad policy from surviving alongside the RPC.
DROP POLICY IF EXISTS "Coaches update client nutrition targets" ON public.profiles;

-- ── 3. Narrowly scoped write path ──────────────────────────────────────────
-- Macro parameters are numeric for caller convenience; the live columns are
-- integer (verified against production), so validated values are rounded on
-- write. NULL clears a target, which the columns already allow.
CREATE OR REPLACE FUNCTION public.assign_client_nutrition_targets(
  p_athlete_id      uuid,
  p_calorie_target  integer,
  p_protein_target  numeric,
  p_carb_target     numeric,
  p_fat_target      numeric,
  p_locked          boolean DEFAULT true
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  -- Types are qualified because PL/pgSQL compiles DECLARE at first execution,
  -- under this empty search_path — unlike the signature above, which is
  -- resolved at CREATE time.
  v_coach_id pg_catalog.uuid        := auth.uid();
  v_now      pg_catalog.timestamptz := pg_catalog.now();
BEGIN
  IF v_coach_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = '28000';
  END IF;

  IF p_athlete_id IS NULL THEN
    RAISE EXCEPTION 'An athlete must be specified'
      USING ERRCODE = '22023';
  END IF;

  -- Authorization: the caller must be linked to this athlete. This is the only
  -- thing standing in for RLS while running as definer, so it comes first.
  IF NOT EXISTS (
    SELECT 1
    FROM public.coach_clients cc
    WHERE cc.coach_id = v_coach_id
      AND cc.athlete_id = p_athlete_id
  ) THEN
    RAISE EXCEPTION 'This athlete is not on your roster'
      USING ERRCODE = '42501';
  END IF;

  -- Validation: reject negatives and implausible values. NULL is allowed and
  -- means "no target set".
  IF p_calorie_target IS NOT NULL AND (p_calorie_target < 0 OR p_calorie_target > 20000) THEN
    RAISE EXCEPTION 'Calorie target must be between 0 and 20000'
      USING ERRCODE = '22023';
  END IF;

  IF p_protein_target IS NOT NULL AND (p_protein_target < 0 OR p_protein_target > 2000) THEN
    RAISE EXCEPTION 'Protein target must be between 0 and 2000'
      USING ERRCODE = '22023';
  END IF;

  IF p_carb_target IS NOT NULL AND (p_carb_target < 0 OR p_carb_target > 2000) THEN
    RAISE EXCEPTION 'Carb target must be between 0 and 2000'
      USING ERRCODE = '22023';
  END IF;

  IF p_fat_target IS NOT NULL AND (p_fat_target < 0 OR p_fat_target > 2000) THEN
    RAISE EXCEPTION 'Fat target must be between 0 and 2000'
      USING ERRCODE = '22023';
  END IF;

  -- Exactly seven columns. Anything else on the row (full_name, role,
  -- weight_kg, goal, age, gender, …) is untouched by construction.
  UPDATE public.profiles
  SET daily_calorie_target        = p_calorie_target,
      daily_protein_target        = pg_catalog.round(p_protein_target)::pg_catalog.int4,
      daily_carb_target           = pg_catalog.round(p_carb_target)::pg_catalog.int4,
      daily_fat_target            = pg_catalog.round(p_fat_target)::pg_catalog.int4,
      nutrition_targets_locked    = COALESCE(p_locked, true),
      nutrition_targets_updated_by = v_coach_id,   -- never client-supplied
      nutrition_targets_updated_at = v_now
  WHERE profiles.id = p_athlete_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Athlete profile not found'
      USING ERRCODE = 'P0002';
  END IF;

  RETURN v_now;
END;
$$;

-- ── 4. Execute privileges ──────────────────────────────────────────────────
-- Supabase's default privileges on schema public grant EXECUTE to anon,
-- authenticated AND service_role at CREATE time, so each unwanted grantee must
-- be revoked explicitly — a REVOKE FROM PUBLIC alone does not remove them.
REVOKE ALL ON FUNCTION public.assign_client_nutrition_targets(uuid, integer, numeric, numeric, numeric, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assign_client_nutrition_targets(uuid, integer, numeric, numeric, numeric, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.assign_client_nutrition_targets(uuid, integer, numeric, numeric, numeric, boolean) FROM service_role;
GRANT EXECUTE ON FUNCTION public.assign_client_nutrition_targets(uuid, integer, numeric, numeric, numeric, boolean) TO authenticated;

COMMENT ON FUNCTION public.assign_client_nutrition_targets(uuid, integer, numeric, numeric, numeric, boolean) IS
  'Coach-only nutrition target write. Derives the coach from auth.uid(), requires a coach_clients link to the athlete, validates ranges, and updates only the daily_*_target + nutrition_targets_* columns. SECURITY DEFINER because no coach UPDATE policy exists on public.profiles by design.';

COMMIT;

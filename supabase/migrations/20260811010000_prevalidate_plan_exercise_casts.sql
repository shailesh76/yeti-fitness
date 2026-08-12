-- ============================================================================
-- 20260811010000_prevalidate_plan_exercise_casts.sql
-- ============================================================================
-- Follow-up to 20260811000000_atomic_coach_plan_save.sql, which is already
-- applied and recorded in migration history. That file is NOT edited — this
-- migration CREATE OR REPLACEs the same function with one correction, so the
-- applied history stays truthful and the change is auditable on its own.
--
-- WHAT CHANGED
-- The RPC's contract is that the COMPLETE payload is validated before any
-- destructive edit work (the UPDATE of workout_plans and the DELETE of the day
-- tree). Four castable fields already met that contract — exercise_id,
-- rest_seconds, warmup_sets, target_rpe — but two did not:
--
--   * is_dropset      (boolean)
--   * superset_group  (uuid)
--
-- Both were first cast during the INSERT phase, i.e. after the destructive
-- statements had already run. Atomic rollback meant this was never a
-- data-corruption bug — a malformed value aborted the whole transaction and
-- the original plan was restored intact — but it broke the stated
-- validate-then-mutate ordering, and produced a late, less specific error.
-- They are now cast inside the existing validation loop alongside the others.
--
-- Everything else is byte-identical to 20260811000000: SECURITY DEFINER,
-- SET search_path = '', static SQL only, coach identity from auth.uid() with
-- no coach parameter, ownership verified under FOR UPDATE, the workout_plans
-- row updated in place so assigned_plans references stay valid, and the same
-- canonical id returned.
--
-- Privileges are re-asserted after CREATE OR REPLACE. Note CREATE OR REPLACE
-- preserves the existing ACL, but Supabase's default privileges would re-grant
-- EXECUTE to anon/service_role if the function were ever dropped and recreated,
-- so the REVOKE/GRANT block is repeated to keep the intended ACL explicit.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.save_coach_workout_plan(
  p_plan_id uuid,      -- NULL creates a new plan; otherwise replaces this plan's tree
  p_name    text,
  p_days    jsonb      -- [{ "name": text|null, "exercises": [ { ... } ] }, ...]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_coach_id pg_catalog.uuid := auth.uid();
  v_plan_id  pg_catalog.uuid;
  v_name     pg_catalog.text;
  v_day      pg_catalog.jsonb;
  v_ex       pg_catalog.jsonb;
  v_day_id   pg_catalog.uuid;
  v_day_no   pg_catalog.int4 := 0;
  v_ex_no    pg_catalog.int4;
  v_ex_count pg_catalog.int4;
BEGIN
  -- ── Authentication ────────────────────────────────────────────────────────
  IF v_coach_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  -- ── Payload validation, BEFORE anything destructive ──────────────────────
  v_name := pg_catalog.btrim(coalesce(p_name, ''));
  IF v_name = '' THEN
    RAISE EXCEPTION 'Give the plan a name before saving.' USING ERRCODE = '22023';
  END IF;

  IF p_days IS NULL OR pg_catalog.jsonb_typeof(p_days) <> 'array'
     OR pg_catalog.jsonb_array_length(p_days) = 0 THEN
    RAISE EXCEPTION 'Add at least one day before saving.' USING ERRCODE = '22023';
  END IF;

  FOR v_day IN SELECT * FROM pg_catalog.jsonb_array_elements(p_days) LOOP
    IF pg_catalog.jsonb_typeof(v_day -> 'exercises') <> 'array' THEN
      RAISE EXCEPTION 'Every day must contain an exercises list.' USING ERRCODE = '22023';
    END IF;

    v_ex_count := pg_catalog.jsonb_array_length(v_day -> 'exercises');
    IF v_ex_count = 0 THEN
      RAISE EXCEPTION 'Every day must have at least one exercise.' USING ERRCODE = '22023';
    END IF;

    FOR v_ex IN SELECT * FROM pg_catalog.jsonb_array_elements(v_day -> 'exercises') LOOP
      -- exercise_id is the only genuinely required exercise field; the cast
      -- also rejects malformed uuids before any write happens.
      IF (v_ex ->> 'exercise_id') IS NULL THEN
        RAISE EXCEPTION 'Every exercise must reference an exercise.' USING ERRCODE = '22023';
      END IF;
      PERFORM (v_ex ->> 'exercise_id')::pg_catalog.uuid;

      -- Only non-negativity is enforced. The schema declares no CHECK
      -- constraints on these columns and the application defines no maxima, so
      -- no arbitrary ceiling is invented here.
      IF (v_ex ->> 'rest_seconds') IS NOT NULL
         AND (v_ex ->> 'rest_seconds')::pg_catalog.int4 < 0 THEN
        RAISE EXCEPTION 'Rest seconds cannot be negative.' USING ERRCODE = '22023';
      END IF;
      IF (v_ex ->> 'warmup_sets') IS NOT NULL
         AND (v_ex ->> 'warmup_sets')::pg_catalog.int4 < 0 THEN
        RAISE EXCEPTION 'Warm-up sets cannot be negative.' USING ERRCODE = '22023';
      END IF;
      IF (v_ex ->> 'target_rpe') IS NOT NULL
         AND (v_ex ->> 'target_rpe')::pg_catalog.numeric < 0 THEN
        RAISE EXCEPTION 'Target RPE cannot be negative.' USING ERRCODE = '22023';
      END IF;

      -- Added in this migration: cast-validate the remaining two typed fields
      -- here rather than at insert time, so the whole payload is proven
      -- castable before any destructive statement runs.
      IF (v_ex ->> 'is_dropset') IS NOT NULL THEN
        PERFORM (v_ex ->> 'is_dropset')::pg_catalog.bool;
      END IF;
      IF (v_ex ->> 'superset_group') IS NOT NULL THEN
        PERFORM (v_ex ->> 'superset_group')::pg_catalog.uuid;
      END IF;
    END LOOP;
  END LOOP;

  -- ── Resolve the target plan ──────────────────────────────────────────────
  IF p_plan_id IS NULL THEN
    INSERT INTO public.workout_plans (coach_id, name)
    VALUES (v_coach_id, v_name)
    RETURNING id INTO v_plan_id;
  ELSE
    -- Lock the row so a concurrent save cannot interleave with the
    -- delete/re-insert below, and confirm ownership while holding the lock.
    SELECT wp.id INTO v_plan_id
    FROM public.workout_plans wp
    WHERE wp.id = p_plan_id
      AND wp.coach_id = v_coach_id
    FOR UPDATE;

    IF v_plan_id IS NULL THEN
      RAISE EXCEPTION 'That plan was not found on your account.' USING ERRCODE = '42501';
    END IF;

    UPDATE public.workout_plans
    SET name = v_name
    WHERE workout_plans.id = v_plan_id;

    -- Replaces the tree. plan_exercises cascades from plan_days. The
    -- workout_plans row itself is untouched, so assigned_plans.plan_id stays
    -- valid.
    DELETE FROM public.plan_days WHERE plan_days.plan_id = v_plan_id;
  END IF;

  -- ── Insert the replacement tree ──────────────────────────────────────────
  FOR v_day IN SELECT * FROM pg_catalog.jsonb_array_elements(p_days) LOOP
    v_day_no := v_day_no + 1;

    INSERT INTO public.plan_days (plan_id, day_number, name)
    VALUES (v_plan_id, v_day_no, nullif(pg_catalog.btrim(coalesce(v_day ->> 'name', '')), ''))
    RETURNING id INTO v_day_id;

    v_ex_no := 0;
    FOR v_ex IN SELECT * FROM pg_catalog.jsonb_array_elements(v_day -> 'exercises') LOOP
      -- Every optional field stays NULL when absent or JSON null. Nothing is
      -- coerced into an invented prescription: the table's own defaults only
      -- apply to omitted columns, and these columns are always supplied.
      INSERT INTO public.plan_exercises (
        plan_day_id, exercise_id, order_index,
        sets, reps, weight,
        target_rpe, rest_seconds, notes,
        warmup_sets, is_dropset, superset_group
      ) VALUES (
        v_day_id,
        (v_ex ->> 'exercise_id')::pg_catalog.uuid,
        v_ex_no,
        v_ex ->> 'sets',
        v_ex ->> 'reps',
        v_ex ->> 'weight',
        (v_ex ->> 'target_rpe')::pg_catalog.numeric,
        (v_ex ->> 'rest_seconds')::pg_catalog.int4,
        v_ex ->> 'notes',
        (v_ex ->> 'warmup_sets')::pg_catalog.int4,
        (v_ex ->> 'is_dropset')::pg_catalog.bool,
        (v_ex ->> 'superset_group')::pg_catalog.uuid
      );
      v_ex_no := v_ex_no + 1;
    END LOOP;
  END LOOP;

  RETURN v_plan_id;
END;
$$;

-- ── Privileges (re-asserted explicitly) ────────────────────────────────────
REVOKE ALL ON FUNCTION public.save_coach_workout_plan(uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_coach_workout_plan(uuid, text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.save_coach_workout_plan(uuid, text, jsonb) FROM service_role;
GRANT EXECUTE ON FUNCTION public.save_coach_workout_plan(uuid, text, jsonb) TO authenticated;

COMMENT ON FUNCTION public.save_coach_workout_plan(uuid, text, jsonb) IS
  'Atomically creates or replaces a coach workout plan tree in one transaction. Coach derived from auth.uid(); edits verify ownership under FOR UPDATE and preserve the workout_plans id so assigned_plans references stay valid. Full payload — including is_dropset and superset_group casts — is validated before any destructive statement. SECURITY DEFINER, empty search_path, EXECUTE limited to authenticated.';

COMMIT;

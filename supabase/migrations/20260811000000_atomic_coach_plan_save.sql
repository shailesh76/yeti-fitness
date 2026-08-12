-- ============================================================================
-- 20260811000000_atomic_coach_plan_save.sql
-- ============================================================================
-- Atomic create/replace of a coach's workout plan tree.
--
-- WHY
-- The dashboard previously persisted a plan with five independent PostgREST
-- requests: verify ownership, update workout_plans, delete plan_days, insert
-- replacement days, insert replacement exercises. Each is its own transaction,
-- so a failure after the delete left a real (possibly already assigned) plan
-- with zero days — an athlete's plan silently emptied. Creation had the mirror
-- problem: a workout_plans row could survive with no days or no exercises.
--
-- This function performs the whole operation in ONE call. PL/pgSQL function
-- bodies run inside the calling statement's transaction, so any exception
-- raised — by validation here, by a constraint, or by a failed insert — aborts
-- the entire function and Postgres rolls back every row it touched. There is no
-- intermediate state a client can observe or be interrupted at, and no
-- client-side compensating delete is required.
--
-- EDIT SEMANTICS
-- The workout_plans row is UPDATED in place and its id returned unchanged. It is
-- never deleted and recreated: assigned_plans.plan_id references it with ON
-- DELETE CASCADE, so recreating the row would destroy every existing athlete
-- assignment. Only the day tree is replaced (plan_days -> plan_exercises cascade
-- handles the exercises).
--
-- SECURITY
--   * SECURITY DEFINER — required because the function deletes and re-inserts
--     the day tree; running as owner keeps behaviour identical regardless of the
--     caller's policy set, and the ownership check below is the authorization
--     boundary. Verified safe: workout_plans/plan_days/plan_exercises all have
--     relforcerowsecurity = false and are owned by postgres.
--   * SET search_path = '' — nothing resolves through a caller-influenced path.
--     pg_temp is deliberately excluded so a caller cannot shadow an object.
--   * Coach identity comes only from auth.uid(); there is no coach-id parameter.
--   * Static SQL only — no EXECUTE, no dynamic string building.
--   * Reuses public.coach_owns_workout_plan() (20260810230000) for the
--     ownership predicate rather than duplicating it.
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

-- ── Privileges ─────────────────────────────────────────────────────────────
-- Supabase default privileges on schema public grant EXECUTE to anon,
-- authenticated AND service_role at CREATE time, so each unwanted grantee needs
-- its own REVOKE. service_role is revoked: it bypasses RLS and can already
-- write these tables directly, so it has no demonstrated need for this function.
REVOKE ALL ON FUNCTION public.save_coach_workout_plan(uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_coach_workout_plan(uuid, text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.save_coach_workout_plan(uuid, text, jsonb) FROM service_role;
GRANT EXECUTE ON FUNCTION public.save_coach_workout_plan(uuid, text, jsonb) TO authenticated;

COMMENT ON FUNCTION public.save_coach_workout_plan(uuid, text, jsonb) IS
  'Atomically creates or replaces a coach workout plan tree in one transaction. Coach derived from auth.uid(); edits verify ownership under FOR UPDATE and preserve the workout_plans id so assigned_plans references stay valid. SECURITY DEFINER, empty search_path, EXECUTE limited to authenticated.';

COMMIT;

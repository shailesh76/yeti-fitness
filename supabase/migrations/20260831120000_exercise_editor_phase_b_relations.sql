-- Exercise Editor Phase B: Normalized relation management, child table security, and atomic v2 RPC.

BEGIN;

-- 1. Child-Table Security Hardening -------------------------------------------
-- Direct mutations are revoked so all relational modifications must execute
-- through the authorized atomic save_exercise_editor_v2 RPC.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.exercise_aliases FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.exercise_tags FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.exercise_muscles FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.exercise_alternatives FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.exercise_progressions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.exercise_regressions FROM anon, authenticated;

GRANT SELECT ON public.exercise_aliases TO anon, authenticated;
GRANT SELECT ON public.exercise_tags TO anon, authenticated;
GRANT SELECT ON public.exercise_muscles TO anon, authenticated;
GRANT SELECT ON public.exercise_alternatives TO anon, authenticated;
GRANT SELECT ON public.exercise_progressions TO anon, authenticated;
GRANT SELECT ON public.exercise_regressions TO anon, authenticated;

-- 2. Versioned Atomic RPC: save_exercise_editor_v2 -----------------------------
CREATE OR REPLACE FUNCTION public.save_exercise_editor_v2(
  p_payload jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id pg_catalog.uuid := auth.uid();
  v_role pg_catalog.text;
  v_existing public.exercises%ROWTYPE;
  v_id pg_catalog.uuid;
  v_exercise_id_raw pg_catalog.text;
  v_exercise_id pg_catalog.uuid;

  -- Core fields
  v_name pg_catalog.text;
  v_primary_muscle pg_catalog.text;
  v_equipment pg_catalog.text;
  v_category pg_catalog.text;
  v_movement_pattern pg_catalog.text;
  v_difficulty pg_catalog.text;
  v_unilateral pg_catalog.bool;
  v_setup_instructions pg_catalog.text;
  v_execution_instructions pg_catalog.text;
  v_breathing pg_catalog.text;
  v_coaching_cues pg_catalog.jsonb;
  v_common_mistakes pg_catalog.jsonb;
  v_safety_notes pg_catalog.text;
  v_default_sets pg_catalog.int4;
  v_default_reps pg_catalog.int4;
  v_default_reps_prescription pg_catalog.text;
  v_tempo pg_catalog.text;
  v_archived pg_catalog.bool;

  -- Relation JSON payloads
  v_aliases pg_catalog.jsonb;
  v_tags pg_catalog.jsonb;
  v_muscles pg_catalog.jsonb;
  v_alternatives pg_catalog.jsonb;
  v_progressions pg_catalog.jsonb;
  v_regressions pg_catalog.jsonb;

  -- Iteration variables & validation helpers
  v_item pg_catalog.jsonb;
  v_alias_text pg_catalog.text;
  v_tag_text pg_catalog.text;
  v_tag_type pg_catalog.text;
  v_muscle_text pg_catalog.text;
  v_muscle_role pg_catalog.text;
  v_primary_count pg_catalog.int4 := 0;
  v_calc_primary pg_catalog.text := NULL;
  v_secondary_arr pg_catalog.text[] := ARRAY[]::pg_catalog.text[];
  v_target_id pg_catalog.uuid;
  v_reason pg_catalog.text;
  v_delta pg_catalog.int4;

  -- Duplicate tracking sets
  v_seen_aliases pg_catalog.text[] := ARRAY[]::pg_catalog.text[];
  v_seen_tags pg_catalog.text[] := ARRAY[]::pg_catalog.text[];
  v_seen_muscles pg_catalog.text[] := ARRAY[]::pg_catalog.text[];
  v_seen_alts pg_catalog.uuid[] := ARRAY[]::pg_catalog.uuid[];
  v_seen_progs pg_catalog.uuid[] := ARRAY[]::pg_catalog.uuid[];
  v_seen_regs pg_catalog.uuid[] := ARRAY[]::pg_catalog.uuid[];

BEGIN
  -- 1. Authentication
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  -- 2. Resolve protected profile role
  SELECT role INTO v_role FROM public.profiles WHERE id = v_user_id;
  IF v_role NOT IN ('coach', 'admin') THEN
    RAISE EXCEPTION 'Exercise editing is restricted to coaches and admins' USING ERRCODE = '42501';
  END IF;

  IF p_payload IS NULL OR pg_catalog.jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'Payload must be a JSON object' USING ERRCODE = '22023';
  END IF;

  -- Extract exercise_id if updating
  v_exercise_id_raw := p_payload ->> 'exercise_id';
  IF v_exercise_id_raw IS NOT NULL AND pg_catalog.btrim(v_exercise_id_raw) <> '' THEN
    BEGIN
      v_exercise_id := v_exercise_id_raw::pg_catalog.uuid;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Invalid exercise_id format' USING ERRCODE = '22023';
    END;
  ELSE
    v_exercise_id := NULL;
  END IF;

  -- Extract core fields
  v_name := pg_catalog.btrim(COALESCE(p_payload ->> 'name', ''));
  v_primary_muscle := NULLIF(pg_catalog.btrim(COALESCE(p_payload ->> 'primary_muscle', '')), '');
  v_equipment := NULLIF(pg_catalog.btrim(COALESCE(p_payload ->> 'equipment', '')), '');
  v_category := NULLIF(pg_catalog.btrim(COALESCE(p_payload ->> 'category', '')), '');
  v_movement_pattern := NULLIF(pg_catalog.btrim(COALESCE(p_payload ->> 'movement_pattern', '')), '');
  v_difficulty := NULLIF(pg_catalog.btrim(COALESCE(p_payload ->> 'difficulty', '')), '');
  v_unilateral := COALESCE((p_payload ->> 'unilateral')::pg_catalog.bool, false);
  v_setup_instructions := NULLIF(pg_catalog.btrim(COALESCE(p_payload ->> 'setup_instructions', '')), '');
  v_execution_instructions := NULLIF(pg_catalog.btrim(COALESCE(p_payload ->> 'execution_instructions', '')), '');
  v_breathing := NULLIF(pg_catalog.btrim(COALESCE(p_payload ->> 'breathing', '')), '');
  v_coaching_cues := p_payload -> 'coaching_cues';
  v_common_mistakes := p_payload -> 'common_mistakes';
  v_safety_notes := NULLIF(pg_catalog.btrim(COALESCE(p_payload ->> 'safety_notes', '')), '');
  v_default_sets := (p_payload ->> 'default_sets')::pg_catalog.int4;
  v_default_reps := (p_payload ->> 'default_reps')::pg_catalog.int4;
  v_default_reps_prescription := NULLIF(pg_catalog.btrim(COALESCE(p_payload ->> 'default_reps_prescription', '')), '');
  v_tempo := NULLIF(pg_catalog.btrim(COALESCE(p_payload ->> 'tempo', '')), '');
  v_archived := COALESCE((p_payload ->> 'archived')::pg_catalog.bool, false);

  -- Extract relation groups (can be NULL to preserve existing, or JSON array to replace)
  v_aliases := p_payload -> 'aliases';
  v_tags := p_payload -> 'tags';
  v_muscles := p_payload -> 'muscles';
  v_alternatives := p_payload -> 'alternatives';
  v_progressions := p_payload -> 'progressions';
  v_regressions := p_payload -> 'regressions';

  -- 3. Core validation
  IF pg_catalog.length(v_name) = 0 OR pg_catalog.length(v_name) > 160 THEN
    RAISE EXCEPTION 'Exercise name is required and must not exceed 160 characters' USING ERRCODE = '22023';
  END IF;
  IF v_default_sets IS NULL OR v_default_sets < 1 OR v_default_sets > 100 THEN
    RAISE EXCEPTION 'Default sets must be between 1 and 100' USING ERRCODE = '22023';
  END IF;
  IF v_default_reps IS NOT NULL AND (v_default_reps < 0 OR v_default_reps > 10000) THEN
    RAISE EXCEPTION 'Default reps must be between 0 and 10000' USING ERRCODE = '22023';
  END IF;
  IF pg_catalog.length(COALESCE(v_tempo, '')) > 40 THEN
    RAISE EXCEPTION 'Tempo must not exceed 40 characters' USING ERRCODE = '22023';
  END IF;

  IF v_coaching_cues IS NOT NULL AND pg_catalog.jsonb_typeof(v_coaching_cues) NOT IN ('array', 'null') THEN
    RAISE EXCEPTION 'Coaching cues must be a JSON array' USING ERRCODE = '22023';
  END IF;
  IF v_common_mistakes IS NOT NULL AND pg_catalog.jsonb_typeof(v_common_mistakes) NOT IN ('array', 'null') THEN
    RAISE EXCEPTION 'Common mistakes must be a JSON array' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.jsonb_array_elements(COALESCE(v_coaching_cues, '[]'::pg_catalog.jsonb)) AS cue
    WHERE pg_catalog.jsonb_typeof(cue) <> 'string' OR pg_catalog.length(cue #>> '{}') > 500
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.jsonb_array_elements(COALESCE(v_common_mistakes, '[]'::pg_catalog.jsonb)) AS mistake
    WHERE pg_catalog.jsonb_typeof(mistake) <> 'string' OR pg_catalog.length(mistake #>> '{}') > 500
  ) THEN
    RAISE EXCEPTION 'Coaching cues and common mistakes must contain strings no longer than 500 characters' USING ERRCODE = '22023';
  END IF;

  -- 4. Authorization & Row Locking
  IF v_exercise_id IS NULL THEN
    IF v_role <> 'coach' THEN
      RAISE EXCEPTION 'This path creates coach-owned custom exercises only' USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.exercises (
      name, primary_muscle, target_muscle, equipment, category, movement_pattern, difficulty,
      unilateral, setup_instructions, execution_instructions, breathing,
      coaching_cues, common_mistakes, safety_notes, default_sets, default_reps,
      default_reps_prescription, tempo, source_type, source,
      created_by_coach_id, archived_at
    ) VALUES (
      v_name, v_primary_muscle, v_primary_muscle, v_equipment, v_category, v_movement_pattern, v_difficulty,
      v_unilateral, v_setup_instructions, v_execution_instructions, v_breathing,
      ARRAY(SELECT pg_catalog.jsonb_array_elements_text(COALESCE(v_coaching_cues, '[]'::pg_catalog.jsonb))),
      ARRAY(SELECT pg_catalog.jsonb_array_elements_text(COALESCE(v_common_mistakes, '[]'::pg_catalog.jsonb))),
      v_safety_notes, v_default_sets, v_default_reps,
      v_default_reps_prescription, v_tempo, 'custom', 'coach',
      v_user_id,
      CASE WHEN v_archived THEN pg_catalog.now() ELSE NULL END
    ) RETURNING id INTO v_id;
  ELSE
    SELECT * INTO v_existing
    FROM public.exercises
    WHERE id = v_exercise_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Exercise not found' USING ERRCODE = 'P0002';
    END IF;

    IF v_role = 'coach' AND NOT (
      v_existing.source_type = 'custom' AND v_existing.created_by_coach_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'Coaches may edit only their own custom exercises' USING ERRCODE = '42501';
    END IF;

    v_id := v_exercise_id;

    UPDATE public.exercises
    SET name = v_name,
        primary_muscle = COALESCE(v_primary_muscle, primary_muscle),
        target_muscle = COALESCE(v_primary_muscle, target_muscle),
        equipment = v_equipment,
        category = v_category,
        movement_pattern = v_movement_pattern,
        difficulty = v_difficulty,
        unilateral = v_unilateral,
        setup_instructions = v_setup_instructions,
        execution_instructions = v_execution_instructions,
        breathing = v_breathing,
        coaching_cues = ARRAY(SELECT pg_catalog.jsonb_array_elements_text(COALESCE(v_coaching_cues, '[]'::pg_catalog.jsonb))),
        common_mistakes = ARRAY(SELECT pg_catalog.jsonb_array_elements_text(COALESCE(v_common_mistakes, '[]'::pg_catalog.jsonb))),
        safety_notes = v_safety_notes,
        default_sets = v_default_sets,
        default_reps = v_default_reps,
        default_reps_prescription = v_default_reps_prescription,
        tempo = v_tempo,
        archived_at = CASE
          WHEN v_archived THEN COALESCE(archived_at, pg_catalog.now())
          ELSE NULL
        END
    WHERE id = v_id;
  END IF;

  -- 5. Relation Group Validations & Replacements ------------------------------

  -- A. Aliases (if supplied)
  IF v_aliases IS NOT NULL AND pg_catalog.jsonb_typeof(v_aliases) <> 'null' THEN
    IF pg_catalog.jsonb_typeof(v_aliases) <> 'array' THEN
      RAISE EXCEPTION 'aliases must be a JSON array' USING ERRCODE = '22023';
    END IF;
    IF pg_catalog.jsonb_array_length(v_aliases) > 50 THEN
      RAISE EXCEPTION 'aliases cannot exceed 50 items' USING ERRCODE = '22023';
    END IF;

    DELETE FROM public.exercise_aliases WHERE exercise_id = v_id;

    FOR v_item IN SELECT * FROM pg_catalog.jsonb_array_elements(v_aliases)
    LOOP
      IF pg_catalog.jsonb_typeof(v_item) = 'string' THEN
        v_alias_text := pg_catalog.btrim(v_item #>> '{}');
      ELSIF pg_catalog.jsonb_typeof(v_item) = 'object' AND v_item ? 'alias' THEN
        v_alias_text := pg_catalog.btrim(COALESCE(v_item ->> 'alias', ''));
      ELSE
        RAISE EXCEPTION 'Each alias must be a string or an object with an alias property' USING ERRCODE = '22023';
      END IF;

      IF pg_catalog.length(v_alias_text) = 0 OR pg_catalog.length(v_alias_text) > 160 THEN
        RAISE EXCEPTION 'Alias cannot be blank and must not exceed 160 characters' USING ERRCODE = '22023';
      END IF;

      -- Duplicate check (case-insensitive)
      IF pg_catalog.lower(v_alias_text) = ANY(v_seen_aliases) THEN
        RAISE EXCEPTION 'Duplicate alias "%" found in payload', v_alias_text USING ERRCODE = '22023';
      END IF;
      v_seen_aliases := v_seen_aliases || pg_catalog.lower(v_alias_text);

      INSERT INTO public.exercise_aliases (exercise_id, alias)
      VALUES (v_id, v_alias_text);
    END LOOP;
  END IF;

  -- B. Tags (if supplied)
  IF v_tags IS NOT NULL AND pg_catalog.jsonb_typeof(v_tags) <> 'null' THEN
    IF pg_catalog.jsonb_typeof(v_tags) <> 'array' THEN
      RAISE EXCEPTION 'tags must be a JSON array' USING ERRCODE = '22023';
    END IF;
    IF pg_catalog.jsonb_array_length(v_tags) > 50 THEN
      RAISE EXCEPTION 'tags cannot exceed 50 items' USING ERRCODE = '22023';
    END IF;

    DELETE FROM public.exercise_tags WHERE exercise_id = v_id;

    FOR v_item IN SELECT * FROM pg_catalog.jsonb_array_elements(v_tags)
    LOOP
      IF pg_catalog.jsonb_typeof(v_item) = 'string' THEN
        v_tag_text := pg_catalog.btrim(v_item #>> '{}');
        v_tag_type := 'coach';
      ELSIF pg_catalog.jsonb_typeof(v_item) = 'object' AND v_item ? 'tag' THEN
        v_tag_text := pg_catalog.btrim(COALESCE(v_item ->> 'tag', ''));
        v_tag_type := pg_catalog.btrim(COALESCE(v_item ->> 'tag_type', 'coach'));
      ELSE
        RAISE EXCEPTION 'Each tag must be a string or object with a tag property' USING ERRCODE = '22023';
      END IF;

      IF pg_catalog.length(v_tag_text) = 0 OR pg_catalog.length(v_tag_text) > 100 THEN
        RAISE EXCEPTION 'Tag cannot be blank and must not exceed 100 characters' USING ERRCODE = '22023';
      END IF;

      IF pg_catalog.lower(v_tag_text) = ANY(v_seen_tags) THEN
        RAISE EXCEPTION 'Duplicate tag "%" found in payload', v_tag_text USING ERRCODE = '22023';
      END IF;
      v_seen_tags := v_seen_tags || pg_catalog.lower(v_tag_text);

      INSERT INTO public.exercise_tags (exercise_id, tag, tag_type)
      VALUES (v_id, v_tag_text, v_tag_type);
    END LOOP;
  END IF;

  -- C. Muscles (if supplied)
  IF v_muscles IS NOT NULL AND pg_catalog.jsonb_typeof(v_muscles) <> 'null' THEN
    IF pg_catalog.jsonb_typeof(v_muscles) <> 'array' THEN
      RAISE EXCEPTION 'muscles must be a JSON array' USING ERRCODE = '22023';
    END IF;
    IF pg_catalog.jsonb_array_length(v_muscles) > 30 THEN
      RAISE EXCEPTION 'muscles cannot exceed 30 items' USING ERRCODE = '22023';
    END IF;

    DELETE FROM public.exercise_muscles WHERE exercise_id = v_id;

    FOR v_item IN SELECT * FROM pg_catalog.jsonb_array_elements(v_muscles)
    LOOP
      IF pg_catalog.jsonb_typeof(v_item) <> 'object' OR NOT (v_item ? 'muscle') OR NOT (v_item ? 'role') THEN
        RAISE EXCEPTION 'Each muscle entry must be an object with muscle and role properties' USING ERRCODE = '22023';
      END IF;

      v_muscle_text := pg_catalog.btrim(COALESCE(v_item ->> 'muscle', ''));
      v_muscle_role := pg_catalog.lower(pg_catalog.btrim(COALESCE(v_item ->> 'role', '')));

      IF pg_catalog.length(v_muscle_text) = 0 OR pg_catalog.length(v_muscle_text) > 100 THEN
        RAISE EXCEPTION 'Muscle name cannot be blank and must not exceed 100 characters' USING ERRCODE = '22023';
      END IF;

      IF v_muscle_role NOT IN ('primary', 'secondary', 'stabilizer') THEN
        RAISE EXCEPTION 'Muscle role must be one of: primary, secondary, stabilizer' USING ERRCODE = '22023';
      END IF;

      IF (pg_catalog.lower(v_muscle_text) || ':' || v_muscle_role) = ANY(v_seen_muscles) THEN
        RAISE EXCEPTION 'Duplicate muscle role combination for "%" (%)', v_muscle_text, v_muscle_role USING ERRCODE = '22023';
      END IF;
      v_seen_muscles := v_seen_muscles || (pg_catalog.lower(v_muscle_text) || ':' || v_muscle_role);

      IF v_muscle_role = 'primary' THEN
        v_primary_count := v_primary_count + 1;
        IF v_primary_count > 1 THEN
          RAISE EXCEPTION 'Only one primary muscle is permitted per exercise' USING ERRCODE = '22023';
        END IF;
        v_calc_primary := v_muscle_text;
      ELSIF v_muscle_role = 'secondary' THEN
        IF NOT (v_muscle_text = ANY(v_secondary_arr)) THEN
          v_secondary_arr := v_secondary_arr || v_muscle_text;
        END IF;
      END IF;

      INSERT INTO public.exercise_muscles (exercise_id, muscle, role)
      VALUES (v_id, v_muscle_text, v_muscle_role);
    END LOOP;

    -- Synchronize flat compatibility columns on public.exercises
    UPDATE public.exercises
    SET primary_muscle = v_calc_primary,
        target_muscle = v_calc_primary,
        secondary_muscles = CASE WHEN pg_catalog.cardinality(v_secondary_arr) > 0 THEN v_secondary_arr ELSE NULL END
    WHERE id = v_id;
  END IF;

  -- D. Alternatives (if supplied)
  IF v_alternatives IS NOT NULL AND pg_catalog.jsonb_typeof(v_alternatives) <> 'null' THEN
    IF pg_catalog.jsonb_typeof(v_alternatives) <> 'array' THEN
      RAISE EXCEPTION 'alternatives must be a JSON array' USING ERRCODE = '22023';
    END IF;
    IF pg_catalog.jsonb_array_length(v_alternatives) > 50 THEN
      RAISE EXCEPTION 'alternatives cannot exceed 50 items' USING ERRCODE = '22023';
    END IF;

    DELETE FROM public.exercise_alternatives WHERE exercise_id = v_id;

    FOR v_item IN SELECT * FROM pg_catalog.jsonb_array_elements(v_alternatives)
    LOOP
      IF pg_catalog.jsonb_typeof(v_item) <> 'object' OR NOT (v_item ? 'alternative_exercise_id') THEN
        RAISE EXCEPTION 'Each alternative entry must be an object with alternative_exercise_id' USING ERRCODE = '22023';
      END IF;

      BEGIN
        v_target_id := (v_item ->> 'alternative_exercise_id')::pg_catalog.uuid;
      EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid UUID format in alternatives' USING ERRCODE = '22023';
      END;

      IF v_target_id = v_id THEN
        RAISE EXCEPTION 'An exercise cannot be an alternative to itself' USING ERRCODE = '22023';
      END IF;

      IF v_target_id = ANY(v_seen_alts) THEN
        RAISE EXCEPTION 'Duplicate alternative exercise ID "%"', v_target_id USING ERRCODE = '22023';
      END IF;
      v_seen_alts := v_seen_alts || v_target_id;

      IF NOT EXISTS (SELECT 1 FROM public.exercises WHERE id = v_target_id) THEN
        RAISE EXCEPTION 'Referenced alternative exercise "%" does not exist', v_target_id USING ERRCODE = '23503';
      END IF;

      v_reason := NULLIF(pg_catalog.btrim(COALESCE(v_item ->> 'reason', '')), '');
      IF pg_catalog.length(COALESCE(v_reason, '')) > 300 THEN
        RAISE EXCEPTION 'Alternative reason must not exceed 300 characters' USING ERRCODE = '22023';
      END IF;

      INSERT INTO public.exercise_alternatives (exercise_id, alternative_exercise_id, reason)
      VALUES (v_id, v_target_id, v_reason);
    END LOOP;
  END IF;

  -- E. Progressions (if supplied)
  IF v_progressions IS NOT NULL AND pg_catalog.jsonb_typeof(v_progressions) <> 'null' THEN
    IF pg_catalog.jsonb_typeof(v_progressions) <> 'array' THEN
      RAISE EXCEPTION 'progressions must be a JSON array' USING ERRCODE = '22023';
    END IF;
    IF pg_catalog.jsonb_array_length(v_progressions) > 50 THEN
      RAISE EXCEPTION 'progressions cannot exceed 50 items' USING ERRCODE = '22023';
    END IF;

    DELETE FROM public.exercise_progressions WHERE exercise_id = v_id;

    FOR v_item IN SELECT * FROM pg_catalog.jsonb_array_elements(v_progressions)
    LOOP
      IF pg_catalog.jsonb_typeof(v_item) <> 'object' OR NOT (v_item ? 'progression_exercise_id') THEN
        RAISE EXCEPTION 'Each progression entry must be an object with progression_exercise_id' USING ERRCODE = '22023';
      END IF;

      BEGIN
        v_target_id := (v_item ->> 'progression_exercise_id')::pg_catalog.uuid;
      EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid UUID format in progressions' USING ERRCODE = '22023';
      END;

      IF v_target_id = v_id THEN
        RAISE EXCEPTION 'An exercise cannot be a progression of itself' USING ERRCODE = '22023';
      END IF;

      IF v_target_id = ANY(v_seen_progs) THEN
        RAISE EXCEPTION 'Duplicate progression exercise ID "%"', v_target_id USING ERRCODE = '22023';
      END IF;
      v_seen_progs := v_seen_progs || v_target_id;

      IF NOT EXISTS (SELECT 1 FROM public.exercises WHERE id = v_target_id) THEN
        RAISE EXCEPTION 'Referenced progression exercise "%" does not exist', v_target_id USING ERRCODE = '23503';
      END IF;

      v_delta := COALESCE((v_item ->> 'difficulty_delta')::pg_catalog.int4, 1);
      IF v_delta < -10 OR v_delta > 10 THEN
        RAISE EXCEPTION 'Difficulty delta must be between -10 and 10' USING ERRCODE = '22023';
      END IF;

      INSERT INTO public.exercise_progressions (exercise_id, progression_exercise_id, difficulty_delta)
      VALUES (v_id, v_target_id, v_delta);
    END LOOP;
  END IF;

  -- F. Regressions (if supplied)
  IF v_regressions IS NOT NULL AND pg_catalog.jsonb_typeof(v_regressions) <> 'null' THEN
    IF pg_catalog.jsonb_typeof(v_regressions) <> 'array' THEN
      RAISE EXCEPTION 'regressions must be a JSON array' USING ERRCODE = '22023';
    END IF;
    IF pg_catalog.jsonb_array_length(v_regressions) > 50 THEN
      RAISE EXCEPTION 'regressions cannot exceed 50 items' USING ERRCODE = '22023';
    END IF;

    DELETE FROM public.exercise_regressions WHERE exercise_id = v_id;

    FOR v_item IN SELECT * FROM pg_catalog.jsonb_array_elements(v_regressions)
    LOOP
      IF pg_catalog.jsonb_typeof(v_item) <> 'object' OR NOT (v_item ? 'regression_exercise_id') THEN
        RAISE EXCEPTION 'Each regression entry must be an object with regression_exercise_id' USING ERRCODE = '22023';
      END IF;

      BEGIN
        v_target_id := (v_item ->> 'regression_exercise_id')::pg_catalog.uuid;
      EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid UUID format in regressions' USING ERRCODE = '22023';
      END;

      IF v_target_id = v_id THEN
        RAISE EXCEPTION 'An exercise cannot be a regression of itself' USING ERRCODE = '22023';
      END IF;

      IF v_target_id = ANY(v_seen_regs) THEN
        RAISE EXCEPTION 'Duplicate regression exercise ID "%"', v_target_id USING ERRCODE = '22023';
      END IF;
      v_seen_regs := v_seen_regs || v_target_id;

      -- Progression / Regression Contradiction check:
      -- An exercise cannot simultaneously be an explicit progression and explicit regression of this exercise.
      IF v_target_id = ANY(v_seen_progs) THEN
        RAISE EXCEPTION 'Exercise "%" cannot simultaneously be both a progression and a regression', v_target_id USING ERRCODE = '22023';
      END IF;

      IF NOT EXISTS (SELECT 1 FROM public.exercises WHERE id = v_target_id) THEN
        RAISE EXCEPTION 'Referenced regression exercise "%" does not exist', v_target_id USING ERRCODE = '23503';
      END IF;

      v_delta := COALESCE((v_item ->> 'difficulty_delta')::pg_catalog.int4, -1);
      IF v_delta < -10 OR v_delta > 10 THEN
        RAISE EXCEPTION 'Difficulty delta must be between -10 and 10' USING ERRCODE = '22023';
      END IF;

      INSERT INTO public.exercise_regressions (exercise_id, regression_exercise_id, difficulty_delta)
      VALUES (v_id, v_target_id, v_delta);
    END LOOP;
  END IF;

  RETURN v_id;
END;
$$;

-- 3. Manage RPC Execution Grants ----------------------------------------------
REVOKE ALL ON FUNCTION public.save_exercise_editor_v2(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_exercise_editor_v2(jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.save_exercise_editor_v2(jsonb) FROM service_role;
GRANT EXECUTE ON FUNCTION public.save_exercise_editor_v2(jsonb) TO authenticated;

COMMENT ON FUNCTION public.save_exercise_editor_v2(jsonb) IS
  'Atomic Phase B Exercise Editor RPC. Persists core fields and normalized child relations (aliases, tags, muscles, alternatives, progressions, regressions) in one transaction.';

COMMIT;

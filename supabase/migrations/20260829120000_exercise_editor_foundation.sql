-- Exercise Editor Phase A: ownership hardening, archive support, and atomic writes.

BEGIN;

-- profiles.role is an authorization input for the editor RPC. Existing
-- self-update RLS covers the whole profile row, so protect this trusted field
-- without blocking ordinary athlete profile updates.
CREATE OR REPLACE FUNCTION public.prevent_untrusted_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND current_user NOT IN ('postgres', 'service_role', 'supabase_admin')
     AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Profile role may be changed only by an authorized server process'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_untrusted_profile_role_change ON public.profiles;
CREATE TRIGGER prevent_untrusted_profile_role_change
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_untrusted_profile_role_change();

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.exercises
    WHERE source_type NOT IN ('yeti_first_party', 'legacy_catalog', 'custom')
       OR source_type IS NULL
       OR (source_type = 'custom' AND created_by_coach_id IS NULL)
       OR (source_type IN ('yeti_first_party', 'legacy_catalog') AND created_by_coach_id IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'exercise ownership data violates the Phase A ownership contract';
  END IF;
END
$$;

ALTER TABLE public.exercises
  ALTER COLUMN source_type SET NOT NULL;

ALTER TABLE public.exercises
  DROP CONSTRAINT IF EXISTS exercises_ownership_check;
ALTER TABLE public.exercises
  ADD CONSTRAINT exercises_ownership_check CHECK (
    (source_type = 'custom' AND created_by_coach_id IS NOT NULL)
    OR
    (source_type IN ('yeti_first_party', 'legacy_catalog') AND created_by_coach_id IS NULL)
  );

CREATE OR REPLACE FUNCTION public.prevent_exercise_provenance_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.source_type IS DISTINCT FROM OLD.source_type
     OR NEW.source IS DISTINCT FROM OLD.source
     OR NEW.source_id IS DISTINCT FROM OLD.source_id
     OR NEW.created_by_coach_id IS DISTINCT FROM OLD.created_by_coach_id THEN
    RAISE EXCEPTION 'Exercise provenance fields are immutable'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_exercise_provenance_change ON public.exercises;
CREATE TRIGGER prevent_exercise_provenance_change
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_exercise_provenance_change();

-- Remove every known historical mutation policy, including the live drifted
-- policy whose auth.role() check allowed every authenticated athlete to insert.
DROP POLICY IF EXISTS "Coaches can insert exercises." ON public.exercises;
DROP POLICY IF EXISTS "Coaches can insert their own exercises" ON public.exercises;
DROP POLICY IF EXISTS "Coaches can update their own exercises" ON public.exercises;
DROP POLICY IF EXISTS "Coaches can delete their own exercises" ON public.exercises;

CREATE POLICY "Coaches can insert their own custom exercises"
  ON public.exercises FOR INSERT TO authenticated
  WITH CHECK (
    source_type = 'custom'
    AND created_by_coach_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'coach'
    )
  );

CREATE POLICY "Coaches can update their own custom exercises"
  ON public.exercises FOR UPDATE TO authenticated
  USING (
    source_type = 'custom'
    AND created_by_coach_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'coach'
    )
  )
  WITH CHECK (
    source_type = 'custom'
    AND created_by_coach_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'coach'
    )
  );

CREATE POLICY "Coaches can delete their own custom exercises"
  ON public.exercises FOR DELETE TO authenticated
  USING (
    source_type = 'custom'
    AND created_by_coach_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'coach'
    )
  );

-- Browser clients use the RPCs below for create/update/archive. Revoking direct
-- INSERT/UPDATE means a future permissive RLS policy cannot reopen the old hole.
REVOKE INSERT, UPDATE, TRUNCATE, REFERENCES, TRIGGER ON public.exercises FROM anon;
REVOKE INSERT, UPDATE, TRUNCATE, REFERENCES, TRIGGER ON public.exercises FROM authenticated;
REVOKE DELETE ON public.exercises FROM anon;
GRANT SELECT ON public.exercises TO anon, authenticated;
GRANT DELETE ON public.exercises TO authenticated;

CREATE OR REPLACE FUNCTION public.save_exercise_editor(
  p_exercise_id uuid,
  p_name text,
  p_primary_muscle text,
  p_equipment text,
  p_category text,
  p_movement_pattern text,
  p_difficulty text,
  p_unilateral boolean,
  p_setup_instructions text,
  p_execution_instructions text,
  p_breathing text,
  p_coaching_cues jsonb,
  p_common_mistakes jsonb,
  p_safety_notes text,
  p_default_sets integer,
  p_default_reps integer,
  p_default_reps_prescription text,
  p_tempo text,
  p_archived boolean DEFAULT false
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
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_user_id;
  IF v_role NOT IN ('coach', 'admin') THEN
    RAISE EXCEPTION 'Exercise editing is restricted to coaches and admins' USING ERRCODE = '42501';
  END IF;

  IF pg_catalog.length(pg_catalog.btrim(COALESCE(p_name, ''))) = 0
     OR pg_catalog.length(pg_catalog.btrim(p_name)) > 160 THEN
    RAISE EXCEPTION 'Exercise name is required and must not exceed 160 characters' USING ERRCODE = '22023';
  END IF;
  IF p_default_sets IS NULL OR p_default_sets < 1 OR p_default_sets > 100 THEN
    RAISE EXCEPTION 'Default sets must be between 1 and 100' USING ERRCODE = '22023';
  END IF;
  IF p_default_reps IS NOT NULL AND (p_default_reps < 0 OR p_default_reps > 10000) THEN
    RAISE EXCEPTION 'Default reps must be between 0 and 10000' USING ERRCODE = '22023';
  END IF;
  IF pg_catalog.length(COALESCE(p_tempo, '')) > 40 THEN
    RAISE EXCEPTION 'Tempo must not exceed 40 characters' USING ERRCODE = '22023';
  END IF;
  IF pg_catalog.jsonb_typeof(COALESCE(p_coaching_cues, '[]'::pg_catalog.jsonb)) <> 'array'
     OR pg_catalog.jsonb_typeof(COALESCE(p_common_mistakes, '[]'::pg_catalog.jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'Coaching cues and common mistakes must be JSON arrays'
      USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
       SELECT 1 FROM pg_catalog.jsonb_array_elements(COALESCE(p_coaching_cues, '[]'::pg_catalog.jsonb)) AS cue
       WHERE pg_catalog.jsonb_typeof(cue) <> 'string'
          OR pg_catalog.length(cue #>> '{}') > 500
     )
     OR EXISTS (
       SELECT 1 FROM pg_catalog.jsonb_array_elements(COALESCE(p_common_mistakes, '[]'::pg_catalog.jsonb)) AS mistake
       WHERE pg_catalog.jsonb_typeof(mistake) <> 'string'
          OR pg_catalog.length(mistake #>> '{}') > 500
     ) THEN
    RAISE EXCEPTION 'Coaching cues and common mistakes must contain strings no longer than 500 characters'
      USING ERRCODE = '22023';
  END IF;

  IF p_exercise_id IS NULL THEN
    IF v_role <> 'coach' THEN
      RAISE EXCEPTION 'This path creates coach-owned custom exercises only' USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.exercises (
      name, primary_muscle, equipment, category, movement_pattern, difficulty,
      unilateral, setup_instructions, execution_instructions, breathing,
      coaching_cues, common_mistakes, safety_notes, default_sets, default_reps,
      default_reps_prescription, tempo, source_type, source,
      created_by_coach_id, archived_at
    ) VALUES (
      pg_catalog.btrim(p_name), NULLIF(pg_catalog.btrim(p_primary_muscle), ''),
      NULLIF(pg_catalog.btrim(p_equipment), ''), NULLIF(pg_catalog.btrim(p_category), ''),
      NULLIF(pg_catalog.btrim(p_movement_pattern), ''), NULLIF(pg_catalog.btrim(p_difficulty), ''),
      COALESCE(p_unilateral, false), NULLIF(pg_catalog.btrim(p_setup_instructions), ''),
      NULLIF(pg_catalog.btrim(p_execution_instructions), ''), NULLIF(pg_catalog.btrim(p_breathing), ''),
      ARRAY(SELECT pg_catalog.jsonb_array_elements_text(COALESCE(p_coaching_cues, '[]'::pg_catalog.jsonb))),
      ARRAY(SELECT pg_catalog.jsonb_array_elements_text(COALESCE(p_common_mistakes, '[]'::pg_catalog.jsonb))),
      NULLIF(pg_catalog.btrim(p_safety_notes), ''), p_default_sets, p_default_reps,
      NULLIF(pg_catalog.btrim(p_default_reps_prescription), ''), NULLIF(pg_catalog.btrim(p_tempo), ''),
      'custom', 'coach', v_user_id,
      CASE WHEN COALESCE(p_archived, false) THEN pg_catalog.now() ELSE NULL END
    ) RETURNING id INTO v_id;
    RETURN v_id;
  END IF;

  SELECT * INTO v_existing
  FROM public.exercises
  WHERE id = p_exercise_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exercise not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_role = 'coach' AND NOT (
    v_existing.source_type = 'custom' AND v_existing.created_by_coach_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Coaches may edit only their own custom exercises' USING ERRCODE = '42501';
  END IF;

  UPDATE public.exercises
  SET name = pg_catalog.btrim(p_name),
      primary_muscle = NULLIF(pg_catalog.btrim(p_primary_muscle), ''),
      equipment = NULLIF(pg_catalog.btrim(p_equipment), ''),
      category = NULLIF(pg_catalog.btrim(p_category), ''),
      movement_pattern = NULLIF(pg_catalog.btrim(p_movement_pattern), ''),
      difficulty = NULLIF(pg_catalog.btrim(p_difficulty), ''),
      unilateral = COALESCE(p_unilateral, false),
      setup_instructions = NULLIF(pg_catalog.btrim(p_setup_instructions), ''),
      execution_instructions = NULLIF(pg_catalog.btrim(p_execution_instructions), ''),
      breathing = NULLIF(pg_catalog.btrim(p_breathing), ''),
      coaching_cues = ARRAY(SELECT pg_catalog.jsonb_array_elements_text(COALESCE(p_coaching_cues, '[]'::pg_catalog.jsonb))),
      common_mistakes = ARRAY(SELECT pg_catalog.jsonb_array_elements_text(COALESCE(p_common_mistakes, '[]'::pg_catalog.jsonb))),
      safety_notes = NULLIF(pg_catalog.btrim(p_safety_notes), ''),
      default_sets = p_default_sets,
      default_reps = p_default_reps,
      default_reps_prescription = NULLIF(pg_catalog.btrim(p_default_reps_prescription), ''),
      tempo = NULLIF(pg_catalog.btrim(p_tempo), ''),
      archived_at = CASE
        WHEN COALESCE(p_archived, false) THEN COALESCE(archived_at, pg_catalog.now())
        ELSE NULL
      END
  WHERE id = p_exercise_id
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_exercise_editor(uuid, text, text, text, text, text, text, boolean, text, text, text, jsonb, jsonb, text, integer, integer, text, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_exercise_editor(uuid, text, text, text, text, text, text, boolean, text, text, text, jsonb, jsonb, text, integer, integer, text, text, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.save_exercise_editor(uuid, text, text, text, text, text, text, boolean, text, text, text, jsonb, jsonb, text, integer, integer, text, text, boolean) FROM service_role;
GRANT EXECUTE ON FUNCTION public.save_exercise_editor(uuid, text, text, text, text, text, text, boolean, text, text, text, jsonb, jsonb, text, integer, integer, text, text, boolean) TO authenticated;

COMMENT ON FUNCTION public.save_exercise_editor(uuid, text, text, text, text, text, text, boolean, text, text, text, jsonb, jsonb, text, integer, integer, text, text, boolean) IS
  'Atomic Phase A exercise editor write. Admins may maintain existing global rows; coaches may create or update only their own custom rows. Provenance is never accepted from the caller.';

COMMIT;

-- Phase C2C: make primary media deterministic. Primary selection is
-- independent of publication status; zero or one primary row is valid.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.exercise_media
    WHERE is_primary IS TRUE
    GROUP BY exercise_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce primary media uniqueness: duplicate primary rows exist';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS exercise_media_one_primary_per_exercise_idx
  ON public.exercise_media (exercise_id)
  WHERE is_primary IS TRUE;

CREATE OR REPLACE FUNCTION public.set_exercise_media_primary(
  p_exercise_id uuid,
  p_media_id uuid
)
RETURNS public.exercise_media
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_media public.exercise_media;
BEGIN
  -- Serialize competing primary selections for this exercise. Locking only
  -- the selected media row would not coordinate callers choosing two
  -- different rows at the same time.
  PERFORM 1
  FROM public.exercises
  WHERE id = p_exercise_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exercise not found';
  END IF;

  SELECT * INTO v_media
  FROM public.exercise_media
  WHERE id = p_media_id
    AND exercise_id = p_exercise_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Media row does not belong to the exercise';
  END IF;

  UPDATE public.exercise_media
  SET is_primary = false,
      updated_at = now()
  WHERE exercise_id = p_exercise_id
    AND is_primary IS TRUE
    AND id <> p_media_id;

  UPDATE public.exercise_media
  SET is_primary = true,
      updated_at = now()
  WHERE id = p_media_id
  RETURNING * INTO v_media;

  RETURN v_media;
END;
$$;

REVOKE ALL ON FUNCTION public.set_exercise_media_primary(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_exercise_media_primary(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.set_exercise_media_primary(uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.set_exercise_media_primary(uuid, uuid) TO service_role;

COMMIT;

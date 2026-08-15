-- Add unique constraint to exercise_media for idempotent upserts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'exercise_media_exercise_id_r2_key'
  ) THEN
    ALTER TABLE public.exercise_media ADD CONSTRAINT exercise_media_exercise_id_r2_key UNIQUE (exercise_id, r2_key);
  END IF;
END $$;

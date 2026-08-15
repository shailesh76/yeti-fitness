-- Phase 1 V2 Dataset Extensions: Add explicit destination fields for all Yeti dataset attributes
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'yeti_v2',
  ADD COLUMN IF NOT EXISTS license TEXT DEFAULT 'Yeti Proprietary',
  ADD COLUMN IF NOT EXISTS recommended_rest_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS hypertrophy_reps TEXT,
  ADD COLUMN IF NOT EXISTS strength_reps TEXT,
  ADD COLUMN IF NOT EXISTS endurance_reps TEXT,
  ADD COLUMN IF NOT EXISTS media_status TEXT DEFAULT 'TO_CREATE',
  ADD COLUMN IF NOT EXISTS media_notes TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.exercise_media
  ADD COLUMN IF NOT EXISTS media_status TEXT DEFAULT 'TO_CREATE',
  ADD COLUMN IF NOT EXISTS media_notes TEXT;

-- Create index on source_type to isolate Yeti v2 dataset from legacy catalog records
CREATE INDEX IF NOT EXISTS idx_exercises_source_type ON public.exercises(source_type);

-- ============================================================================
-- 20260802_exercise_library_phase1.sql
-- ============================================================================
-- Phase 1: Exercise Library Infrastructure Migration
-- Adds extended schema fields to public.exercises and creates normalized sub-tables:
--   - exercise_media
--   - exercise_aliases
--   - exercise_tags
--   - exercise_muscles
--   - exercise_alternatives
--   - exercise_progressions
--   - exercise_regressions
-- All tables include RLS policies, indexing, and updated_at triggers for WatermelonDB sync.
-- ============================================================================

-- 1. Extend public.exercises table --------------------------------------------

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS primary_muscle TEXT,
  ADD COLUMN IF NOT EXISTS movement_pattern TEXT,
  ADD COLUMN IF NOT EXISTS unilateral BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS setup_instructions TEXT,
  ADD COLUMN IF NOT EXISTS execution_instructions TEXT,
  ADD COLUMN IF NOT EXISTS breathing TEXT,
  ADD COLUMN IF NOT EXISTS coaching_cues TEXT[],
  ADD COLUMN IF NOT EXISTS common_mistakes TEXT[],
  ADD COLUMN IF NOT EXISTS safety_notes TEXT,
  ADD COLUMN IF NOT EXISTS default_sets INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS default_reps INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS tempo TEXT DEFAULT '2-0-2-0';

-- Backfill slug for existing rows with unique suffix for duplicates
WITH numbered_slugs AS (
  SELECT id,
         TRIM(BOTH '-' FROM LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))) AS base_slug,
         ROW_NUMBER() OVER (
           PARTITION BY TRIM(BOTH '-' FROM LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g')))
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM public.exercises
)
UPDATE public.exercises e
SET slug = CASE
  WHEN ns.rn = 1 THEN ns.base_slug
  ELSE ns.base_slug || '-' || ns.rn
END
FROM numbered_slugs ns
WHERE e.id = ns.id AND (e.slug IS NULL OR e.slug = '');

-- Unique constraint on slug
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'exercises_slug_key'
  ) THEN
    ALTER TABLE public.exercises ADD CONSTRAINT exercises_slug_key UNIQUE (slug);
  END IF;
END $$;

-- Synchronize primary_muscle with target_muscle/muscle_group if null
UPDATE public.exercises
SET primary_muscle = COALESCE(primary_muscle, target_muscle, muscle_group)
WHERE primary_muscle IS NULL;

-- 2. Create sub-tables --------------------------------------------------------

-- exercise_media
CREATE TABLE IF NOT EXISTS public.exercise_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('video', 'gif', 'thumbnail', 'image')),
  file_format TEXT NOT NULL CHECK (file_format IN ('mp4', 'gif', 'webp', 'jpg', 'png')),
  r2_bucket TEXT NOT NULL DEFAULT 'dude-media',
  r2_key TEXT NOT NULL,
  url TEXT,
  thumbnail_url TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- exercise_aliases
CREATE TABLE IF NOT EXISTS public.exercise_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT exercise_aliases_exercise_id_alias_key UNIQUE (exercise_id, alias)
);

-- exercise_tags
CREATE TABLE IF NOT EXISTS public.exercise_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  tag_type TEXT DEFAULT 'ai',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT exercise_tags_exercise_id_tag_key UNIQUE (exercise_id, tag)
);

-- exercise_muscles
CREATE TABLE IF NOT EXISTS public.exercise_muscles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  muscle TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('primary', 'secondary', 'stabilizer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT exercise_muscles_exercise_id_muscle_role_key UNIQUE (exercise_id, muscle, role)
);

-- exercise_alternatives
CREATE TABLE IF NOT EXISTS public.exercise_alternatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  alternative_exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT exercise_alternatives_pair_key UNIQUE (exercise_id, alternative_exercise_id)
);

-- exercise_progressions
CREATE TABLE IF NOT EXISTS public.exercise_progressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  progression_exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  difficulty_delta INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT exercise_progressions_pair_key UNIQUE (exercise_id, progression_exercise_id)
);

-- exercise_regressions
CREATE TABLE IF NOT EXISTS public.exercise_regressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  regression_exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  difficulty_delta INTEGER DEFAULT -1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT exercise_regressions_pair_key UNIQUE (exercise_id, regression_exercise_id)
);

-- 3. Enable RLS ---------------------------------------------------------------

ALTER TABLE public.exercise_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_muscles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_alternatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_progressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_regressions ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies ------------------------------------------------------

DROP POLICY IF EXISTS "Public read access for exercise_media" ON public.exercise_media;
CREATE POLICY "Public read access for exercise_media" ON public.exercise_media FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access for exercise_aliases" ON public.exercise_aliases;
CREATE POLICY "Public read access for exercise_aliases" ON public.exercise_aliases FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access for exercise_tags" ON public.exercise_tags;
CREATE POLICY "Public read access for exercise_tags" ON public.exercise_tags FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access for exercise_muscles" ON public.exercise_muscles;
CREATE POLICY "Public read access for exercise_muscles" ON public.exercise_muscles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access for exercise_alternatives" ON public.exercise_alternatives;
CREATE POLICY "Public read access for exercise_alternatives" ON public.exercise_alternatives FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access for exercise_progressions" ON public.exercise_progressions;
CREATE POLICY "Public read access for exercise_progressions" ON public.exercise_progressions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access for exercise_regressions" ON public.exercise_regressions;
CREATE POLICY "Public read access for exercise_regressions" ON public.exercise_regressions FOR SELECT USING (true);

-- 5. Create Indexes -----------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_exercises_slug ON public.exercises(slug);
CREATE INDEX IF NOT EXISTS idx_exercises_movement_pattern ON public.exercises(movement_pattern);
CREATE INDEX IF NOT EXISTS idx_exercises_primary_muscle ON public.exercises(primary_muscle);

CREATE INDEX IF NOT EXISTS idx_exercise_media_exercise_id ON public.exercise_media(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_aliases_exercise_id ON public.exercise_aliases(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_aliases_alias ON public.exercise_aliases(alias);
CREATE INDEX IF NOT EXISTS idx_exercise_tags_exercise_id ON public.exercise_tags(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_tags_tag ON public.exercise_tags(tag);
CREATE INDEX IF NOT EXISTS idx_exercise_muscles_exercise_id ON public.exercise_muscles(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_muscles_muscle ON public.exercise_muscles(muscle);
CREATE INDEX IF NOT EXISTS idx_exercise_alternatives_exercise_id ON public.exercise_alternatives(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_progressions_exercise_id ON public.exercise_progressions(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_regressions_exercise_id ON public.exercise_regressions(exercise_id);

-- Trigram / FTS indexes for sub-100ms fast search
CREATE INDEX IF NOT EXISTS idx_exercises_name_fts ON public.exercises USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_exercise_aliases_fts ON public.exercise_aliases USING gin(to_tsvector('english', alias));

-- 6. Attach WatermelonDB sync triggers ----------------------------------------

DROP TRIGGER IF EXISTS set_sync_updated_at ON public.exercise_media;
CREATE TRIGGER set_sync_updated_at
  BEFORE UPDATE ON public.exercise_media
  FOR EACH ROW
  EXECUTE FUNCTION public.set_workout_plan_sync_updated_at();

-- Done

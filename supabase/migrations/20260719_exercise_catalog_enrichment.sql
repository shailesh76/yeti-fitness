-- ============================================================================
-- 20260719_exercise_catalog_enrichment.sql — Step 4.2a
-- ============================================================================
-- Enriches the existing flat `exercises` catalog (2,140 rows already imported
-- from FOUR merged free sources: omercotkd-gifs (1,201 animated), free-exercise-db
-- (773 stills), ExerciseGymGifsDB (164 animated), and 2 coach/other) rather than
-- adopting the never-used normalized phase2 model. Idempotent and additive —
-- no existing column or row is dropped here.
--
-- Design decision (approved): keep ONE denormalized catalog table + one small
-- self-referential relations table for variations/alternatives, instead of the
-- 6 FK-normalized tables that 20260714_phase2_schema.sql created but never
-- populated (those are dropped in a separate cleanup migration, 4.2e).
--
-- The set-based backfills at the bottom derive source / source_id / media_type /
-- body_part purely from the gif_url already present on each row — no external
-- data needed. Rich per-row fields (equipment, secondary_muscles, difficulty,
-- category, target_muscle) are backfilled separately by the 4.2b/4.2d script
-- from the free-exercise-db JSON.
-- ============================================================================

-- 1. Enrich the catalog table -------------------------------------------------
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS body_part         TEXT;
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS target_muscle     TEXT;
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS secondary_muscles TEXT[];
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS equipment         TEXT;
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS category          TEXT;   -- strength/stretching/cardio/plyometrics/…
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS difficulty        TEXT;   -- beginner/intermediate/expert
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS media_type        TEXT;   -- 'gif' (animated) | 'image' (still) | 'video'
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS thumbnail_url     TEXT;
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS source            TEXT;   -- 'omercotkd-gifs' | 'free-exercise-db' | 'exercisegymgifsdb' | 'coach' | 'other'
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS source_id         TEXT;   -- stable key from the source dataset (idempotent re-import)
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS is_public         BOOLEAN DEFAULT true;
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ DEFAULT NOW();

-- 2. Variations + alternatives in one lightweight self-referential table -------
CREATE TABLE IF NOT EXISTS public.exercise_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id         UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  related_exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  relation_type       TEXT NOT NULL CHECK (relation_type IN ('variation', 'alternative')),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (exercise_id, related_exercise_id, relation_type),
  CHECK (exercise_id <> related_exercise_id)
);

ALTER TABLE public.exercise_relations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read exercise relations" ON public.exercise_relations;
CREATE POLICY "Authenticated users can read exercise relations"
  ON public.exercise_relations FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 3. Small taxonomy lookup to power filter dropdowns (NOT hot-path FK normalization)
CREATE TABLE IF NOT EXISTS public.exercise_taxonomy (
  kind  TEXT NOT NULL,   -- 'muscle' | 'equipment' | 'body_part' | 'category'
  value TEXT NOT NULL,
  PRIMARY KEY (kind, value)
);

ALTER TABLE public.exercise_taxonomy ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read exercise taxonomy" ON public.exercise_taxonomy;
CREATE POLICY "Authenticated users can read exercise taxonomy"
  ON public.exercise_taxonomy FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 4. Indexes for search + filtering -------------------------------------------
CREATE INDEX IF NOT EXISTS idx_exercises_name        ON public.exercises (lower(name));
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON public.exercises (muscle_group);
CREATE INDEX IF NOT EXISTS idx_exercises_body_part   ON public.exercises (body_part);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment   ON public.exercises (equipment);
CREATE INDEX IF NOT EXISTS idx_exercises_coach       ON public.exercises (created_by_coach_id);
CREATE INDEX IF NOT EXISTS idx_exercises_updated_at  ON public.exercises (updated_at);
-- NON-unique on purpose: the catalog is a merge of 4 free sources and already
-- contains real (source, source_id) collisions (e.g. two ExerciseGymGifsDB
-- rows both keyed 'barbell-bench-press'). Idempotent re-import is enforced in
-- the import script's logic instead of by a DB constraint that would fail here.
CREATE INDEX IF NOT EXISTS idx_exercises_source_id ON public.exercises (source, source_id);
CREATE INDEX IF NOT EXISTS idx_exercise_relations_exercise ON public.exercise_relations (exercise_id);

-- 5. Set-based backfill of fields derivable from the existing gif_url ----------
--    (no external data required — pure string parsing of what's already stored)

-- 5a. source: which of the four merged datasets each row came from.
--     omercotkd/exercises-gifs is the largest (1,201 animated gifs), then
--     free-exercise-db (773 stills), ExerciseGymGifsDB (164 gifs), and a
--     couple of coach/R2 rows.
UPDATE public.exercises SET source = 'omercotkd-gifs'
  WHERE source IS NULL AND gif_url LIKE '%omercotkd/exercises-gifs%';
UPDATE public.exercises SET source = 'free-exercise-db'
  WHERE source IS NULL AND gif_url LIKE '%free-exercise-db%';
UPDATE public.exercises SET source = 'exercisegymgifsdb'
  WHERE source IS NULL AND gif_url LIKE '%ExerciseGymGifsDB%';
UPDATE public.exercises SET source = 'coach'
  WHERE source IS NULL AND created_by_coach_id IS NOT NULL;
-- Anything still unattributed (e.g. the R2-hosted upload, or the null-gif test
-- row) is tagged 'other' so no row is left with a NULL source.
UPDATE public.exercises SET source = 'other' WHERE source IS NULL;

-- 5b. media_type: fix the misnamed gif_url column — .gif is animated, .jpg/.png are stills
UPDATE public.exercises SET media_type = 'gif'
  WHERE media_type IS NULL AND gif_url ILIKE '%.gif';
UPDATE public.exercises SET media_type = 'image'
  WHERE media_type IS NULL AND (gif_url ILIKE '%.jpg' OR gif_url ILIKE '%.jpeg' OR gif_url ILIKE '%.png');
UPDATE public.exercises SET media_type = 'video'
  WHERE media_type IS NULL AND video_url IS NOT NULL;

-- 5c. source_id: stable key from each source's path (validated against live
--     data — 0 extraction failures across all 2,137 rows that have a URL).
--     free-exercise-db:   .../exercises/<ID>/0.jpg              →  <ID>
UPDATE public.exercises
  SET source_id = substring(gif_url from '/exercises/([^/]+)/[0-9]+\.')
  WHERE source_id IS NULL AND source = 'free-exercise-db';
--     ExerciseGymGifsDB:  .../<bodypart>/<slug>.gif             →  <slug>
UPDATE public.exercises
  SET source_id = substring(gif_url from '/([^/]+)\.gif$')
  WHERE source_id IS NULL AND source = 'exercisegymgifsdb';
--     omercotkd-gifs:     .../assets/<NNNN>.gif                 →  <NNNN>
UPDATE public.exercises
  SET source_id = substring(gif_url from '/assets/([^/]+)\.gif$')
  WHERE source_id IS NULL AND source = 'omercotkd-gifs';

-- 5d. body_part for ExerciseGymGifsDB rows: the folder segment before the filename
--     .../ExerciseGymGifsDB@vX.Y.Z/<bodypart>/<slug>.gif  →  <bodypart>
UPDATE public.exercises
  SET body_part = substring(gif_url from '/ExerciseGymGifsDB@[^/]+/([^/]+)/')
  WHERE body_part IS NULL AND source = 'exercisegymgifsdb';

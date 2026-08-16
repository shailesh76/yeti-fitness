-- Allow reviewed external HTTPS media while preserving existing R2-backed rows.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class t ON t.oid = c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'exercise_media'
      AND c.conname = 'exercise_media_exercise_id_r2_key'
      AND c.contype = 'u'
  ) THEN
    RAISE EXCEPTION 'expected exercise_media R2 uniqueness constraint is missing';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class t ON t.oid = p.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'exercise_media'
      AND p.polcmd IN ('a', 'i', 'u', 'd')
  ) THEN
    RAISE EXCEPTION 'exercise_media has an unreviewed mutation policy';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.exercise_media
    WHERE r2_key IS NULL
      AND (url IS NULL OR url !~* '^https://[^[:space:]]+$')
  ) THEN
    RAISE EXCEPTION 'exercise_media contains rows without an R2 key or valid HTTPS URL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.exercise_media
    WHERE r2_key IS NOT NULL
    GROUP BY exercise_id, r2_key
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'exercise_media contains duplicate R2 keys for an exercise';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.exercise_media
    WHERE url IS NOT NULL
    GROUP BY exercise_id, url
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'exercise_media contains duplicate URLs for an exercise';
  END IF;
END
$$;

ALTER TABLE public.exercise_media
  ALTER COLUMN r2_key DROP NOT NULL;

ALTER TABLE public.exercise_media
  DROP CONSTRAINT IF EXISTS exercise_media_locator_check,
  ADD CONSTRAINT exercise_media_locator_check CHECK (
    r2_key IS NOT NULL
    OR (url IS NOT NULL AND url ~* '^https://[^[:space:]]+$')
  );

-- exercise_media_exercise_id_r2_key continues to protect non-null R2 keys.
CREATE UNIQUE INDEX IF NOT EXISTS exercise_media_exercise_id_url_key
  ON public.exercise_media (exercise_id, url)
  WHERE url IS NOT NULL;

DROP POLICY IF EXISTS "Coach and admin insert exercise media" ON public.exercise_media;
CREATE POLICY "Coach and admin insert exercise media"
  ON public.exercise_media FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('coach', 'admin'))
  );

DROP POLICY IF EXISTS "Coach and admin update exercise media" ON public.exercise_media;
CREATE POLICY "Coach and admin update exercise media"
  ON public.exercise_media FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('coach', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('coach', 'admin'))
  );

DROP POLICY IF EXISTS "Coach and admin delete exercise media" ON public.exercise_media;
CREATE POLICY "Coach and admin delete exercise media"
  ON public.exercise_media FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('coach', 'admin'))
  );

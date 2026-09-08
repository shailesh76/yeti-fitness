-- Phase C2A: constrain media lifecycle state and align mutation ownership with
-- the Exercise Editor authorization contract.

BEGIN;

-- The live database contains one historical invalid test value. Treat every
-- null or unsupported value as unpublished rather than guessing that it is
-- ready. This is the only data normalization performed by this migration.
UPDATE public.exercise_media
SET media_status = 'TO_CREATE',
    updated_at = now()
WHERE media_status IS NULL
   OR media_status NOT IN ('TO_CREATE', 'READY');

ALTER TABLE public.exercise_media
  ALTER COLUMN media_status SET DEFAULT 'TO_CREATE',
  ALTER COLUMN media_status SET NOT NULL;

ALTER TABLE public.exercise_media
  ADD COLUMN IF NOT EXISTS idempotency_actor_id uuid,
  ADD COLUMN IF NOT EXISTS idempotency_fingerprint text;

ALTER TABLE public.exercise_media
  DROP CONSTRAINT IF EXISTS exercise_media_idempotency_binding_check,
  ADD CONSTRAINT exercise_media_idempotency_binding_check CHECK (
    (idempotency_actor_id IS NULL AND idempotency_fingerprint IS NULL)
    OR (
      idempotency_actor_id IS NOT NULL
      AND idempotency_fingerprint ~ '^[0-9a-f]{64}$'
    )
  );

ALTER TABLE public.exercise_media
  DROP CONSTRAINT IF EXISTS exercise_media_status_check,
  ADD CONSTRAINT exercise_media_status_check
    CHECK (media_status IN ('TO_CREATE', 'READY'));

ALTER TABLE public.exercise_media
  DROP CONSTRAINT IF EXISTS exercise_media_ready_locator_check,
  ADD CONSTRAINT exercise_media_ready_locator_check CHECK (
    media_status <> 'READY'
    OR NULLIF(btrim(r2_key), '') IS NOT NULL
    OR (url IS NOT NULL AND url ~* '^https://[^[:space:]]+$')
  );

DROP POLICY IF EXISTS "Coach and admin insert exercise media" ON public.exercise_media;
DROP POLICY IF EXISTS "Authorized editors insert exercise media" ON public.exercise_media;
CREATE POLICY "Authorized editors insert exercise media"
  ON public.exercise_media FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.exercises e ON e.id = exercise_media.exercise_id
      WHERE p.id = auth.uid()
        AND (
          p.role = 'admin'
          OR (
            p.role = 'coach'
            AND e.source_type = 'custom'
            AND e.created_by_coach_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS "Coach and admin update exercise media" ON public.exercise_media;
DROP POLICY IF EXISTS "Authorized editors update exercise media" ON public.exercise_media;
CREATE POLICY "Authorized editors update exercise media"
  ON public.exercise_media FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.exercises e ON e.id = exercise_media.exercise_id
      WHERE p.id = auth.uid()
        AND (
          p.role = 'admin'
          OR (
            p.role = 'coach'
            AND e.source_type = 'custom'
            AND e.created_by_coach_id = auth.uid()
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.exercises e ON e.id = exercise_media.exercise_id
      WHERE p.id = auth.uid()
        AND (
          p.role = 'admin'
          OR (
            p.role = 'coach'
            AND e.source_type = 'custom'
            AND e.created_by_coach_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS "Coach and admin delete exercise media" ON public.exercise_media;
DROP POLICY IF EXISTS "Authorized editors delete exercise media" ON public.exercise_media;
CREATE POLICY "Authorized editors delete exercise media"
  ON public.exercise_media FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.exercises e ON e.id = exercise_media.exercise_id
      WHERE p.id = auth.uid()
        AND (
          p.role = 'admin'
          OR (
            p.role = 'coach'
            AND e.source_type = 'custom'
            AND e.created_by_coach_id = auth.uid()
          )
        )
    )
  );

-- Browser clients use the authorized Edge Function for mutations. These
-- ownership policies remain defense in depth if a trusted role is granted
-- table mutation privileges in the future.
REVOKE INSERT, UPDATE, DELETE ON public.exercise_media FROM authenticated;
GRANT SELECT ON public.exercise_media TO authenticated;

COMMIT;

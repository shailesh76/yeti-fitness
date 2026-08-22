-- ============================================================================
-- 20260822230000_profiles_realtime_publication.sql
-- ============================================================================
-- Enables Supabase Realtime postgres_changes publication on public.profiles.
--
-- Why: Allows athlete clients to receive live profile updates (e.g. nutrition targets,
-- goal, activity level, weight) without polling or screen reloads.
--
-- Safety: Adds ONLY public.profiles to supabase_realtime publication. Idempotent check
-- ensures safe execution across environments.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_class c ON pr.prrelid = c.oid
    JOIN pg_publication p ON pr.prpubid = p.oid
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;

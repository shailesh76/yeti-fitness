-- ============================================================================
-- 20260824000000_assigned_plans_realtime_publication.sql
-- ============================================================================
-- Enables Supabase Realtime postgres_changes publication on public.assigned_plans.
--
-- Why: Allows athlete clients to receive live coach workout plan assignments
-- without polling, manual refresh, or screen reloads.
--
-- Safety: Adds ONLY public.assigned_plans to supabase_realtime publication.
-- Idempotent check ensures safe execution across environments.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_class c ON pr.prrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    JOIN pg_publication p ON pr.prpubid = p.oid
    WHERE p.pubname = 'supabase_realtime'
      AND n.nspname = 'public'
      AND c.relname = 'assigned_plans'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.assigned_plans;
  END IF;
END $$;

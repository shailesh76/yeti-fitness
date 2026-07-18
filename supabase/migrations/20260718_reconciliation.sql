-- ============================================================================
-- 20260718_reconciliation.sql — Phase 1 Schema & RLS Reconciliation
-- ============================================================================
-- SINGLE, SELF-CONTAINED REPAIR MIGRATION.
--
-- Idempotent. Non-destructive: no historical migrations are removed, no data is
-- deleted. Safe to run repeatedly. Applying this migration on top of the current
-- historical migrations produces the correct known-good state for a fresh env.
--
-- Motivation:
--   The live remote database drifted from the migration files because DDL was
--   hand-applied via the SQL editor. Three RLS bugs shipped as a result:
--     1. activity_logs        — RLS enabled, no INSERT policy → 42501 spam
--     2. error_logs           — table missing entirely       → PGRST205
--     3. conversation_members — self-referential SELECT      → 42P17 recursion
--   This file restores the intended state and locks it down so any environment
--   is reproducible from the migration files going forward. See the AGENTS.md
--   "Database schema changes" rule.
--
-- Scope:
--   1. activity_logs          — RLS + own-row SELECT/INSERT policies
--   2. error_logs             — table + auth-insert / coach-admin-read policies
--   3. conversations          — INSERT (athlete↔assigned coach) + SELECT (members)
--                             + coach-manage-clients
--   4. conversation_members   — NON-recursive SELECT, own-row INSERT, coach-view
--   5. exercises / foods      — gate reference catalogs behind `authenticated`
--   6. Indexes                — ensure declared perf indexes exist
--   7. ai_request_logs        — add provider / model / token / cost columns
--
-- The `user_entitlements` duplicate-definition drift is a CODE issue (a page
-- queried non-existent legacy columns) and is fixed in the application layer,
-- not here — the live table already has the canonical schema (user_id, plan_id,
-- status, source, expires_at, created_at, updated_at).
-- ============================================================================

-- 1. activity_logs -----------------------------------------------------------
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own activity logs" ON public.activity_logs;
CREATE POLICY "Users read own activity logs" ON public.activity_logs
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own activity logs" ON public.activity_logs;
CREATE POLICY "Users insert own activity logs" ON public.activity_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 2. error_logs (create table if missing, then policies) ---------------------
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  context TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated inserts to error logs" ON public.error_logs;
CREATE POLICY "Allow authenticated inserts to error logs" ON public.error_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR user_id IS NULL);

DROP POLICY IF EXISTS "Coaches and Admins view all error logs" ON public.error_logs;
CREATE POLICY "Coaches and Admins view all error logs" ON public.error_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

-- 3. conversations -----------------------------------------------------------
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Athletes create coach conversations" ON public.conversations;
CREATE POLICY "Athletes create coach conversations" ON public.conversations
  FOR INSERT WITH CHECK (
    auth.uid() = athlete_id AND
    EXISTS (
      SELECT 1 FROM public.coach_clients cc
      WHERE cc.athlete_id = auth.uid() AND cc.coach_id = conversations.coach_id
    )
  );

DROP POLICY IF EXISTS "Members can view conversations" ON public.conversations;
CREATE POLICY "Members can view conversations" ON public.conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = id AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Coaches can manage client conversations" ON public.conversations;
CREATE POLICY "Coaches can manage client conversations" ON public.conversations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.conversation_members cm
      JOIN public.coach_clients cc ON cc.athlete_id = cm.user_id
      WHERE cm.conversation_id = id AND cc.coach_id = auth.uid()
    )
  );

-- 4. conversation_members (non-recursive SELECT) -----------------------------
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can join conversations" ON public.conversation_members;
DROP POLICY IF EXISTS "Members can join their own conversations" ON public.conversation_members;
CREATE POLICY "Members can join their own conversations" ON public.conversation_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.athlete_id = auth.uid() OR c.coach_id = auth.uid())
    )
  );

-- The phase2 version of this policy self-referenced conversation_members inside
-- its own USING clause, which causes "42P17 infinite recursion". A user only
-- needs to see their OWN membership rows here — that is sufficient for the
-- "Members can view conversations" policy above (which checks for the caller's
-- own row). Coaches see client rows via the separate coach policy below.
DROP POLICY IF EXISTS "Users can view members of their conversations" ON public.conversation_members;
CREATE POLICY "Users can view members of their conversations" ON public.conversation_members
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Coaches can view members of client conversations" ON public.conversation_members;
CREATE POLICY "Coaches can view members of client conversations" ON public.conversation_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.coach_clients cc
      WHERE cc.coach_id = auth.uid() AND cc.athlete_id = conversation_members.user_id
    )
  );

-- 5. exercises + foods: authenticated-only reference reads -------------------
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Exercises are viewable by everyone." ON public.exercises;
DROP POLICY IF EXISTS "Authenticated users can view exercises" ON public.exercises;
CREATE POLICY "Authenticated users can view exercises"
  ON public.exercises FOR SELECT
  USING (auth.uid() IS NOT NULL);

ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read foods" ON public.foods;
CREATE POLICY "Authenticated users can read foods"
  ON public.foods FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 6. Ensure declared perf indexes exist --------------------------------------
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_event   ON public.activity_logs(user_id, event_name);
CREATE INDEX IF NOT EXISTS idx_error_logs_user            ON public.error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_request_logs_athlete    ON public.ai_request_logs(athlete_id, requested_at);
CREATE INDEX IF NOT EXISTS idx_ai_memory_athlete          ON public.ai_memory(athlete_id);
CREATE INDEX IF NOT EXISTS idx_user_entitlements_user_id  ON public.user_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_athlete      ON public.conversations(athlete_id);
CREATE INDEX IF NOT EXISTS idx_conversations_coach        ON public.conversations(coach_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user  ON public.conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_system_errors_created      ON public.system_errors(created_at);

-- 7. AI usage & cost tracking columns on ai_request_logs ---------------------
--    Populated by the shared AI provider service (supabase/functions/_shared/ai).
ALTER TABLE public.ai_request_logs ADD COLUMN IF NOT EXISTS provider      TEXT;
ALTER TABLE public.ai_request_logs ADD COLUMN IF NOT EXISTS model         TEXT;
ALTER TABLE public.ai_request_logs ADD COLUMN IF NOT EXISTS input_tokens  INTEGER;
ALTER TABLE public.ai_request_logs ADD COLUMN IF NOT EXISTS output_tokens INTEGER;
ALTER TABLE public.ai_request_logs ADD COLUMN IF NOT EXISTS cost_usd      NUMERIC(10,6);

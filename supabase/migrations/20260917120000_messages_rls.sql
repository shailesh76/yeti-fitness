-- ============================================================================
-- 20260917120000_messages_rls.sql — Remediate public.messages RLS & Grants
-- ============================================================================
-- SINGLE, SELF-CONTAINED MIGRATION.
-- Idempotent. Safe to run repeatedly.
--
-- Target table: public.messages (id, conversation_id, sender_id, content, created_at)
--
-- Starting state:
--   Staging:    RLS disabled, 0 policies, excessive anon & authenticated grants
--   Production: RLS enabled, 0 policies (effectively closed off)
--
-- Authorization contract:
--   1. SELECT: Authenticated users can view messages ONLY IF they are a member
--      of the corresponding conversation (tracked in public.conversation_members).
--   2. INSERT: Authenticated users can insert messages ONLY IF:
--      - sender_id matches auth.uid() (no sender spoofing)
--      - caller is a member of the corresponding conversation
--   3. UPDATE: Authenticated users can update messages ONLY IF:
--      - sender_id matches auth.uid() (own messages only)
--      - caller is a member of the corresponding conversation
--      (Required for upsert-based duplicate prevention on network retries).
--   4. DELETE: Intentionally unsupported for ordinary clients (no policies).
--   5. ANON/PUBLIC: Anonymous messaging is not supported. All privileges revoked.
--   6. AUTHENTICATED: Only SELECT, INSERT, UPDATE privileges retained.
--   7. SERVICE_ROLE: Retains full administrative access.
-- ============================================================================

-- 1. Enable Row Level Security (idempotent)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any
DROP POLICY IF EXISTS "Users view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users insert messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users insert messages into their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users update own messages in their conversations" ON public.messages;

-- 3. SELECT policy: authenticated conversation members can read messages
CREATE POLICY "Users view messages in their conversations"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = messages.conversation_id
        AND cm.user_id = (SELECT auth.uid())
    )
  );

-- 4. INSERT policy: authenticated conversation members can send messages as themselves
CREATE POLICY "Users insert messages into their conversations"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = messages.conversation_id
        AND cm.user_id = (SELECT auth.uid())
    )
  );

-- 5. UPDATE policy: sender-only message update for retry deduplication / upserts
CREATE POLICY "Users update own messages in their conversations"
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (
    sender_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = messages.conversation_id
        AND cm.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = messages.conversation_id
        AND cm.user_id = (SELECT auth.uid())
    )
  );

-- 6. Role & Grant lockdown
-- Revoke all privileges from anon and public
REVOKE ALL ON TABLE public.messages FROM anon;
REVOKE ALL ON TABLE public.messages FROM public;

-- Revoke dangerous/unsupported privileges from authenticated
REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.messages FROM authenticated;

-- Grant only required privileges to authenticated
GRANT SELECT, INSERT, UPDATE ON TABLE public.messages TO authenticated;

-- Ensure service_role has full administrative access
GRANT ALL ON TABLE public.messages TO service_role;

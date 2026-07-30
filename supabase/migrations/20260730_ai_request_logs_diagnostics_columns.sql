-- QA-audit fix (Fix 10): restore ai_request_logs diagnostics.
--
-- 20260727_add_latency_ms_to_ai_request_logs.sql is a no-op placeholder — its
-- entire content is a comment, with no ALTER TABLE at all. ai-coach/index.ts's
-- success-path insert has referenced `latency_ms` since that date, so every
-- successful request's log row has been silently failing to write (confirmed
-- live: no ai_request_logs rows since 2026-07-27 for the test athlete). This
-- migration adds the column that file was supposed to add, plus the
-- additional diagnostic columns needed for intent/engine/response-contract
-- observability (added in the same QA-audit pass as this file).
--
-- Columns already covering part of the requested diagnostics field list under
-- different, pre-existing names (not duplicated here):
--   request_id -> id, user_id -> athlete_id, intent -> coach_type,
--   status/error_code -> success + error_reason, created_at -> requested_at.

ALTER TABLE public.ai_request_logs ADD COLUMN IF NOT EXISTS latency_ms         INTEGER;
ALTER TABLE public.ai_request_logs ADD COLUMN IF NOT EXISTS conversation_id    TEXT;
ALTER TABLE public.ai_request_logs ADD COLUMN IF NOT EXISTS engine             TEXT;
ALTER TABLE public.ai_request_logs ADD COLUMN IF NOT EXISTS fallback_triggered BOOLEAN;
ALTER TABLE public.ai_request_logs ADD COLUMN IF NOT EXISTS response_type      TEXT;
ALTER TABLE public.ai_request_logs ADD COLUMN IF NOT EXISTS action_types       TEXT[];

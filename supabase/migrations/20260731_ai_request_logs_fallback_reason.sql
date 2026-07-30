-- Objective 1 (provider fallback investigation): adds a compact, queryable
-- reason for why a fallback occurred, e.g. "gemini:rate_limited:429". Purely
-- additive, nullable — safe on an existing table with live traffic.
ALTER TABLE public.ai_request_logs ADD COLUMN IF NOT EXISTS fallback_reason TEXT;

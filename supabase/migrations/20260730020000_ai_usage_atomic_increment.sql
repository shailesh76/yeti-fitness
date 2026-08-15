-- ============================================================================
-- 20260730_ai_usage_atomic_increment.sql
-- ============================================================================
-- Fixes a genuine race condition in the AI Coach's daily free-tier cap: the
-- edge function was reading ai_usage.requests_count, then writing back
-- `currentRequests + 1` in a separate statement. Two concurrent requests from
-- the same athlete on the same day can both read the same count and both
-- write the same incremented value — one increment is silently lost, AND
-- (more importantly) several concurrent requests can all pass the `< 5` check
-- before any of them commits their write, bypassing the free-tier cap
-- entirely. Every LLM call has a real $ cost, so this is a cost-control bug,
-- not just a cosmetic counter drift.
--
-- Fix: a single SECURITY DEFINER function that does the upsert-and-increment
-- as ONE atomic statement. Postgres serializes concurrent upserts to the same
-- (athlete_id, date) row (the existing `unique_athlete_date` constraint), so
-- concurrent callers are safely queued and each gets a distinct, correct
-- `new_count`. The edge function calls this ONCE per request, before doing any
-- other work, and rejects the request if new_count exceeds the free-tier cap
-- — so even N simultaneous requests can only ever let exactly 5 through.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_ai_usage(
  p_athlete_id UUID,
  p_date DATE,
  p_tier TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO public.ai_usage (athlete_id, date, requests_count, subscription_tier, last_request_at)
  VALUES (p_athlete_id, p_date, 1, p_tier, NOW())
  ON CONFLICT (athlete_id, date)
  DO UPDATE SET
    requests_count = public.ai_usage.requests_count + 1,
    subscription_tier = EXCLUDED.subscription_tier,
    last_request_at = NOW()
  RETURNING requests_count INTO new_count;

  RETURN new_count;
END;
$$;

-- Only the service role should be able to increment usage counters (matches
-- the existing "no INSERT/UPDATE via API" comment on ai_usage's RLS policy —
-- the edge function calls this via its service-role client, never the
-- athlete's own session).
REVOKE ALL ON FUNCTION public.increment_ai_usage(UUID, DATE, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_ai_usage(UUID, DATE, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.increment_ai_usage(UUID, DATE, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.increment_ai_usage(UUID, DATE, TEXT) TO service_role;

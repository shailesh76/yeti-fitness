> **DEPRECATED / ASPIRATIONAL.** `analytics_events`, `analytics_consents`, and
> `ai_cost_tracking` were never applied to the live database (see
> `docs/migration-audit.md` — part of the same speculative migration burst as
> the never-applied `organizations`/`domain_events` tables referenced by
> other deprecated docs in this directory). Real, live logging tables are
> `ai_request_logs` (token usage + USD cost per request, written by
> `supabase/functions/_shared/ai`), `activity_logs`, and `system_errors`.
> There is no `correlation_id` convention or mandatory structured-JSON logging
> enforced anywhere in the Edge Functions. Kept below for historical
> reference only.
>
> ---

# Observability & AI Cost Tracking

## Telemetry
All Edge Functions must inject the `correlation_id` into their logs. 
Structured logging (JSON) is mandatory.

## Database Tables
We explicitly separate operational tables from analytics to prevent expensive aggregations:
- `analytics_events` (Optimized for time-series inserts)
- `analytics_consents` (Ensures GDPR/CCPA compliance before tracking)
- `ai_cost_tracking` (Tracks exact token usage and USD cost per user, organization, and feature).

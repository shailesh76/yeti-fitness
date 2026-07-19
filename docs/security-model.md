> **DEPRECATED / ASPIRATIONAL.** `audit_logs`, `organizations`, and
> `organization_members` were never applied to the live database (see
> `docs/migration-audit.md`). There is no org-hierarchy-scoped RLS model —
> real RLS policies key directly on `auth.uid()` per table (see
> `docs/database-schema.md`, which documents the live schema and is kept
> current). AI usage is tracked in `ai_request_logs`, not `ai_cost_tracking`.
> Kept below for historical reference only.
>
> ---

# Security Model

## API Abuse Protection
- **Audit Logs**: Every mutation (Update/Delete) across critical resources (Programs, Subscriptions) writes a strict Insert-Only record to `audit_logs` tracking the exact old/new value delta, IP, and device.
- **AI Quotas**: We track usage via `ai_cost_tracking` to prevent abuse, coupled with the `EntitlementsService`.

## Database Isolation
We enforce Row Level Security (RLS) on every table, tying visibility strictly to `auth.uid()` and the `organization_members` hierarchy.

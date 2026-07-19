# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# Database schema changes

All database schema changes must be made through Supabase migrations
(`supabase/migrations/<timestamp>_<name>.sql`) applied with `supabase db push`.
Direct SQL editor schema changes on the live project are not allowed except for
emergency recovery. Any emergency change must be back-filled into a migration
file in the same working day.

Why: the live remote database previously drifted from the migration files
because DDL was hand-applied via the SQL editor — three separate RLS bugs
(activity_logs, error_logs, conversations) shipped as a result. See
[20260718_reconciliation.sql](supabase/migrations/20260718_reconciliation.sql)
for the repair.

## Rules for writing new migrations

- **Never create a duplicate table/column definition for something that
  might already exist.** Before writing `CREATE TABLE`, grep
  `supabase/migrations/` and check [docs/database-schema.md](docs/database-schema.md)
  for whether it's already there. A 2026-07-14 burst of ~10 speculative
  "phase" migration files defined ~50 tables (organizations, program
  templates, a domain-events layer, an AI coaching-intelligence loop, etc.)
  that were never actually applied, because nobody checked production first.
  Those files are still in the repo as an object lesson — see
  [migration-audit.md](docs/migration-audit.md).
- **Always verify a migration against the live schema before writing it, and
  again after applying it.** Query the actual table/columns (or ask for the
  live check to be run) rather than trusting a migration file's presence as
  proof it was applied. This whole audit exists because "the file is there"
  turned out not to mean "the table exists."
- **Never hand-apply schema changes in the SQL Editor** except real emergency
  recovery, per the rule above — and never re-run
  [deploy_to_supabase_dashboard.sql](supabase/migrations/deploy_to_supabase_dashboard.sql)
  for any reason; it's a dead hand-assembled snapshot with a known RLS
  regression (see migration-audit.md finding #2).
- **Update [docs/database-schema.md](docs/database-schema.md) in the same
  change** whenever a migration adds, drops, or repurposes a table/column —
  it documents the live schema, not the aspirational one, and it only stays
  trustworthy if it's kept current.

# AI provider service

Edge Functions that call an LLM must go through the shared provider service
at [supabase/functions/_shared/ai](supabase/functions/_shared/ai) — never call
`fetch()` against a provider URL directly. The service enforces:

- Free-tier-first provider order (Gemini → OpenAI → Anthropic).
- Explicit `AI_PROVIDER_NOT_CONFIGURED` error instead of silent mock fallbacks.
- Token usage + cost logging to `ai_request_logs`.
- Retry + provider fallback on transient failures.

# AI responsibilities (cost + accuracy)

The AI is for coaching, recommendations, personalisation, explanations, and
progress analysis. It must NOT be used to compute deterministic reference
values — calories, macros, exercise metadata. Those come from the appropriate
databases (USDA/AFCD/Open Food Facts for food, ExerciseDB/WGER for exercises).

# Archived migrations

These 10 files were never applied to production — confirmed by directly checking every table they
define against the live database. They were part of a 2026-07-14 burst of speculative SaaS-platform
schema design (multi-tenant organizations, versioned program templates, a domain-events/queue layer,
an AI coaching-intelligence loop, a training-engine progression system) that was drafted but never run.

They are moved here, not deleted, so the history is preserved but `supabase db push`/`db reset` against a
fresh database no longer tries to create the ~50 phantom tables they define. **Do not move these back into
`supabase/migrations/` or apply them.**

Full detail on how this was determined: [docs/migration-audit.md](../../../docs/migration-audit.md).

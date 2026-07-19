> **DEPRECATED / ASPIRATIONAL.** `@yeti/events` and its `EventDispatcher` exist
> under `packages/events/src` but are never imported anywhere in
> `apps/mobile`, `apps/coach-dashboard`, or `supabase/functions` (confirmed by
> grep, 2026-07-19 documentation audit). The `domain_events` table it's meant
> to persist to was never applied to the live database (see
> `docs/migration-audit.md`), and the dispatcher's own source comments admit
> the DB-write half was never implemented ("we are simulating the in-memory
> dispatch portion here"). There is no domain-event system in the running
> app. Kept below for historical reference only.
>
> ---

# Event Architecture

Yeti uses an asynchronous Domain Event Architecture via the `@yeti/events` package.

## Principles
1. **Database is Dumb**: We do not use PostgreSQL Webhooks or Triggers to execute business logic. The DB only stores state.
2. **Immutability**: Domain events (e.g., `WorkoutCompletedEvent`) are strictly immutable and contain full telemetry (correlation_id, user_id, organization_id).
3. **Persisted Dispatching**: The `domain_events` table acts as the source of truth for the event history.
4. **Decoupled Handlers**: Handlers (AI, Analytics, Notifications) execute concurrently without blocking the main thread.

## Flow
`Application Action -> Store Event in DB -> EventDispatcher.dispatch() -> Handlers Execute -> Handlers Mark Success/Failure`

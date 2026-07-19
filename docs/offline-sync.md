# Offline Sync Architecture (WatermelonDB + SyncManager)

> Rewritten to match the actual implementation. The previous version of this
> file claimed 100% WatermelonDB access with no direct Supabase calls, and a
> per-domain server-side conflict-resolution system backed by a
> `sync_conflicts` table. Neither was ever built — see `docs/architecture.md`
> for the broader pattern of docs describing an unbuilt architecture. This
> version describes the code that actually runs.

## What's actually offline-first

Only the tables covered by `sync-pull`/`sync-push` are local-first via
WatermelonDB: `workout_sessions`, `session_sets`, `meal_logs`, `measurements`
(original set), and `workout_plans`, `plan_days`, `plan_exercises`,
`assigned_plans` (added for athlete-authored workout templates). Repositories
for these tables read/write WatermelonDB directly and rely on background sync
for remote propagation.

Everything else in the app — the coach dashboard entirely, and many mobile
screens for one-off actions (profile fetches, AI coach/exercise-guidance
calls, admin operations, entitlements) — calls Supabase directly via
`supabase.from()` / `supabase.functions.invoke()`. There is no rule against
this in the actual codebase, despite what `docs/repository-pattern.md`
(also flagged as inaccurate) claims.

## Platform constraint: web has no local database

WatermelonDB's SQLite adapter is native-only. `apps/mobile/database/index.ts`
tries to construct it and falls back to `database = null` on failure (which
is every web session), exporting `isNativeDbAvailable` for call sites to
check. Repositories generally follow the pattern: write methods throw a
`LOCAL_DB_UNAVAILABLE` error on a null database (or, for the plan tables,
fall back to a direct Supabase call — see `WorkoutRepository.hasLocalPlanDb()`);
read methods that feed a screen's primary render return an empty/zero default
instead of throwing.

`SyncManager.sync()` itself also no-ops when `this.db` is falsy, so calling it
on web is safe — it used to crash inside WatermelonDB's own `synchronize()`
with a raw null-deref (fixed in the Step 4.6 checkpoint).

## Sync flow

`packages/sync/src/SyncManager.ts` wraps WatermelonDB's `synchronize()`,
providing `pullChanges`/`pushChanges` that call the `sync-pull`/`sync-push`
Supabase Edge Functions. Triggered from `apps/mobile/hooks/useSyncManager.ts`,
invoked on Home screen mount.

1. **Pull (`sync-pull`)**: sends `lastPulledAt`; the function queries each
   table with `updated_at >= lastPulledAt`, maps remote rows to the local
   shape, and classifies each as `created` or `updated` by comparing a
   business timestamp (row creation time) against `lastPulledAt`. For the
   plan tables specifically, it also queries `workout_plan_sync_deletions` —
   a tombstone table capturing `{table_name, record_id, audience_ids}` at
   delete time — and adds matching IDs to each table's `deleted` array. The
   original four tables (workout_sessions, session_sets, meal_logs,
   measurements) have no equivalent: their `deleted` arrays are always empty
   on pull, so a remote deletion of one of those rows never removes the
   local copy on another device.
2. **Push (`sync-push`)**: sends WatermelonDB's tracked local changes. For
   the plan tables, each write first checks whether the remote row changed
   since the client's `lastPulledAt` and throws `SYNC_CONFLICT:<table>` if
   so — the client is expected to pull again and retry, not silently
   overwrite. The original four tables upsert directly with no conflict
   check (last write wins). `assigned_plans` is pull-only; only coaches
   assign plans, athletes never push changes to it.

There is no `sync_conflicts` table, no per-domain conflict strategy
(workout sessions / nutrition / measurements / profiles do not each have
their own resolution rule), and no user-facing conflict-confirmation flow.

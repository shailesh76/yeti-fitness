# Architecture

## Monorepo Structure (Turborepo + pnpm)
The project is divided into distinct apps and reusable shared packages.

### Apps
*   `apps/mobile`: React Native (Expo) app. Serves as the primary athlete client.
*   `apps/coach-dashboard`: Next.js web application. Used by coaches for planning, analyzing, and communicating with athletes.

### Shared packages actually in use
*   `@yeti/database`: WatermelonDB models, migrations, schemas, and repository implementations.
*   `@yeti/sync`: Background synchronization engine (SyncManager) wrapping WatermelonDB's sync protocol against the `sync-pull`/`sync-push` Edge Functions.
*   `@yeti/training-engine`: Pure functions for progression suggestions (`ProgressionEngine`) and the Yeti Score (`HealthScoreEngine`).

### Packages that exist but are not wired into the app
`@yeti/ui`, `@yeti/api`, `@yeti/types`, `@yeti/utils`, `@yeti/ai`, `@yeti/entitlements`,
`@yeti/events`, and `@yeti/jobs` all have real source files under `packages/`, but grepping
the app code (`apps/mobile`, `apps/coach-dashboard`, `supabase/functions`) turns up zero
imports of any of them. The actual app instead calls Supabase directly, uses inline types,
and (for AI) goes through `supabase/functions/_shared/ai` rather than `@yeti/ai`. Treat
these as an earlier architecture direction that was superseded, not as documentation of
current behavior — see the equivalent note on the affected docs in this directory.

## Repository Pattern

To keep components clean and independent of the database implementation, all data access flows through Repositories.

`Component -> Hook -> Repository -> Database/API`

Example:
`screens/WorkoutScreen` -> `useWorkout()` -> `WorkoutRepository.getWorkouts()` -> `WatermelonDB`

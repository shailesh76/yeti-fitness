# Database Schema

Reflects the **live production schema** as of 2026-07-18, verified table-by-table against the real
database (not just the migration files — see [migration-audit.md](migration-audit.md) for how much of the
migration history turned out to be speculative and never applied). The canonical source of truth for any
future change is `supabase/migrations/`, applied via `supabase db push` — see the rule in
[AGENTS.md](../AGENTS.md).

## Architecture

- **Monorepo**: pnpm workspace — `apps/mobile` (Expo/React Native + expo-router), `apps/coach-dashboard`
  (Next.js 14), 12 shared `packages/*`.
- **Backend**: Supabase — Postgres + Auth + Edge Functions (Deno) + Storage. All access from clients goes
  through Row Level Security; there is no client-side table the anon/authenticated key can read or write
  outside of an RLS policy.
- **Offline-first mobile**: WatermelonDB caches a subset of tables locally (SQLite on native; unavailable
  on web — see `apps/mobile/database/index.ts`). Sync is client-driven: `sync-pull`/`sync-push` Edge
  Functions exchange changes keyed by a `lastPulledAt` timestamp the client tracks itself. There is no
  server-side sync-bookkeeping table (`sync_metadata`/`sync_conflicts`/`device_sessions` were drafted at
  one point but never applied — see the audit).
- **AI**: All LLM calls go through the shared provider service (`supabase/functions/_shared/ai`),
  Gemini-primary for cost, with token/cost logging to `ai_request_logs`.

## Tables by feature area

### Identity & coaching relationship
- **`profiles`** — one row per `auth.users` row (auto-created by a trigger on signup, see
  `20260719_auto_create_profile_on_signup.sql`). Holds `role` (`athlete`/`coach`/`admin`), body metrics,
  nutrition targets, push token. RLS: a user reads/updates only their own row; a coach can additionally
  read a profile if `coach_clients` links them to that athlete (exact match on both `coach_id` and
  `athlete_id` — see audit finding #2 for a regression that must never be reintroduced here).
- **`coach_clients`** — `(coach_id, athlete_id)` pair, the source of truth for every coach-athlete
  relationship. Nearly every other coach-facing RLS policy in the schema is an `EXISTS` check against this
  table.
- **`client_invites`** — a coach invites an athlete by email; the athlete accepts by matching their JWT
  email (case-insensitive) and the row becomes a `coach_clients` insert.

### Exercise catalog
- **`exercises`** — single denormalized catalog, 2,126 rows merged from 3 free sources
  (`omercotkd-gifs`, `free-exercise-db`, `exercisegymgifsdb`). Columns: `name`, `muscle_group`,
  `body_part`, `target_muscle`, `secondary_muscles`, `equipment`, `category`, `difficulty`,
  `instructions`, `gif_url`/`video_url`/`media_type`/`thumbnail_url`, `source`/`source_id`, `is_public`,
  `created_by_coach_id` (custom coach-authored exercises), `default_rest_period_sec` (default 90),
  `created_at`, `updated_at`. `UNIQUE(name)` (case-sensitive). RLS: any
  authenticated user reads all; a coach can insert/update/delete only exercises where
  `created_by_coach_id = auth.uid()`. Synced to mobile via WatermelonDB `sync-pull` (pull-only).
- **`exercise_relations`** — self-referential `(exercise_id, related_exercise_id, relation_type)` where
  `relation_type` is `variation` or `alternative`.
- **`exercise_taxonomy`** — `(kind, value)` lookup powering filter dropdowns (`kind` ∈ `muscle`,
  `equipment`, `body_part`, `category`).
- **`workout_plan_exercises`** — the *original* (2024) join table between `workout_plans` and `exercises`.
  Still live, RLS intact, but 0 rows and no app code references it — superseded in practice by
  `plan_exercises` (below) and never dropped. Not touched by this audit; flagged for awareness.

### Workout planning (offline-synced plans)
- **`workout_plans`** — top-level plan, owned by `coach_id` or authored by an athlete through `user_id`.
- **`plan_days`** → **`plan_exercises`** — the current hierarchy: a plan has days, each day has exercises
  (`sets`, `reps`, `weight`, prescription fields, `order_index`). These three tables and
  `workout_plans` have indexed `updated_at` timestamps maintained by triggers for incremental sync.
  Note `plan_exercises.superset_group` is a **uuid**, not free text, and `sets`/`reps` are nullable
  text whose column defaults (`'3'`/`'10'`) apply only when the column is omitted — a persisted NULL
  means "no prescription recorded" and must not be hydrated into a value that could be saved back.
- **Coach plan persistence** goes through
  `public.save_coach_workout_plan(p_plan_id uuid, p_name text, p_days jsonb)`
  Both migrations behind it are **applied live and recorded in migration history**:
  `supabase/migrations/20260811000000_atomic_coach_plan_save.sql` created the function, and
  `supabase/migrations/20260811010000_prevalidate_plan_exercise_casts.sql` is a follow-up that
  `CREATE OR REPLACE`s the same function so `is_dropset` and `superset_group` are cast-validated
  before the destructive edit statements rather than at insert time. (`CREATE OR REPLACE` leaves no
  trace in migration history by itself, so `md5(prosrc)` is the reliable way to confirm which
  definition is deployed.) The dashboard previously wrote a plan with five independent PostgREST requests
  (verify, update, delete days, insert days, insert exercises); a failure after the delete left a
  real — possibly already assigned — plan with no days. The RPC performs the whole create-or-replace
  in **one call, inside one transaction**, so any failure rolls the entire operation back and no
  partially-written plan can be observed.
  - **Create**: validates the full payload, inserts `workout_plans`, then the day/exercise tree, and
    returns the new id. A failed insert leaves no orphan plan row.
  - **Edit**: locks the plan `FOR UPDATE`, verifies `coach_id = auth.uid()`, updates the name,
    deletes the day tree (`plan_days` cascades to `plan_exercises`) and re-inserts it. The
    `workout_plans` row is **updated in place and its id returned unchanged** — it is never deleted
    and recreated, because `assigned_plans.plan_id` references it `ON DELETE CASCADE` and recreating
    it would destroy every existing athlete assignment.
  - Coach identity comes only from `auth.uid()`; there is no coach-id parameter. `SECURITY DEFINER`
    with `SET search_path = ''`, static SQL only, and `EXECUTE` granted to `authenticated` only
    (`PUBLIC`, `anon` and `service_role` revoked). Optional exercise fields are written as NULL when
    unset rather than as invented prescriptions.
- **`assigned_plans`** — decouples athlete assignment from `workout_plans.user_id`, so a plan can be
  assigned to an athlete without being "owned" by them. It is pull-only for athlete clients and has
  `updated_at` tracking for incremental sync. There is deliberately **no** status/active column: the
  most recent `assigned_at` is the athlete's current plan and earlier rows are retained as history,
  so nothing enforces uniqueness on `(athlete_id, plan_id)` and re-assignment stays possible.
  RLS (see [20260810230000_assigned_plans_plan_ownership_rls.sql](../supabase/migrations/20260810230000_assigned_plans_plan_ownership_rls.sql)):
  - **INSERT / UPDATE (coach)** require *both* that the athlete is linked to `auth.uid()` through
    `coach_clients` *and* that `workout_plans.coach_id = auth.uid()`. The original 20260702 policy
    was `FOR ALL` and only checked the athlete, which let a coach assign another coach's plan to
    their own athlete — exposing that coach's `plan_days`/`plan_exercises` through the athlete app.
    Because policies for the same command are OR-ed, the permissive policy had to be **dropped**,
    not merely supplemented.
  - **SELECT / DELETE (coach)** check athlete linkage only, so historical rows stay readable and
    removable even if the referenced plan later changes hands.
  - **SELECT (athlete)** is unchanged: `auth.uid() = athlete_id`.
- The mobile WatermelonDB schema mirrors `workout_plans`, `plan_days`, `plan_exercises`,
  `assigned_plans`, and `exercises` (pull-only catalog). Athlete-authored templates are local-first;
  coach assignments are read-only locally.
- **`workout_plan_sync_deletions`** — RLS-scoped tombstones for hard deletes, allowing other devices to
  remove deleted plan records during incremental pull without retaining soft-deleted domain rows.
- **`exercise_bundles`** → **`bundle_exercises`** — reusable named groups of exercises a coach can drop
  into a plan.
- **`coach_exercise_notes`** / **`trainer_notes`** — per-exercise and freeform per-athlete coach notes.

### Workout logging (two coexisting systems)
- **`workout_logs`** (2024) — simple log: `started_at`/`completed_at`/`total_volume`, plus a
  `logged_exercises` JSONB blob. Still actively read (rendered in `apps/mobile/app/workouts.tsx`).
- **`exercise_sets`** — individual sets tied to a `workout_log_id` (the 2024 system's set-level detail).
- **`workout_sessions`** → **`session_sets`** — the current, richer system: a session optionally links to
  `plan_day_id`/`assignment_id`, tracks `status`/`duration_seconds`/`total_volume_kg`/
  `progression_suggestion`; each set records `exercise_id`, `weight_kg`, `reps`, `rpe`, `tempo`, warmup/
  dropset flags. This is what `sync-pull`/`sync-push` and the offline mobile cache actually use.
- **`personal_records`** — per-athlete PR history (`max_weight`/`max_reps`/`best_time`), one row per
  achievement, not a single "current PR" row.
- **`progression_recommendations`** — AI-generated suggestions (`INCREASE_WEIGHT`/`DELOAD`/etc.) an athlete
  can acknowledge and a coach can approve/reject.

### Nutrition
- **`foods`** — shared food library with barcode lookup. RLS: any authenticated user reads all and can
  insert; only the original `created_by` can update their own row; nobody can delete except `service_role`.
- **`meal_logs`** — per-athlete logged meals (`meal_type`, `servings`, `source`, `raw_response` for
  AI-parsed entries). A coach can read their clients' logs. `meal_type` is free text; the app uses
  `BREAKFAST`/`LUNCH`/`DINNER`/`SNACK`/`PRE_WORKOUT`/`POST_WORKOUT`.
- **`food_favorites`** — per-user favorite foods (`user_id`, `food_id`, unique per pair). RLS restricts
  every row to its owner (`auth.uid() = user_id`) for select/insert/delete. `food_id` has no FK (custom
  foods can be favorited offline before they sync). Added in
  [20260727_add_food_favorites.sql](../supabase/migrations/20260727_add_food_favorites.sql); the mobile
  app is offline-first (per-user AsyncStorage list) and best-effort mirrors here. **NOTE: file not yet
  applied to the live DB** (see migration ledger drift) — apply with
  `supabase db query --linked -f supabase/migrations/20260727_add_food_favorites.sql`.

- **Nutrition targets** live on `profiles` as the **canonical** columns `daily_calorie_target`,
  `daily_protein_target`, `daily_carb_target`, `daily_fat_target` (INT, added 2024). The mobile app
  reads/writes these directly via `services/nutritionTargets.ts` (offline-cached). ⚠️ The mobile
  WatermelonDB `target_*` columns are a legacy phantom — never present server-side and not synced;
  do not use them. Production also carries the coach lock/audit columns
  `nutrition_targets_locked`, `nutrition_targets_updated_by`, `nutrition_targets_updated_at`, added by
  [20260810230100_coach_nutrition_targets_reconcile.sql](../supabase/migrations/20260810230100_coach_nutrition_targets_reconcile.sql)
  — **applied live and recorded in migration history**. (Its predecessor `20260728` appears in the
  ledger but none of its objects ever existed in production; the reconcile migration supersedes it.)

  Coaches do **not** get a general UPDATE policy on `profiles`. RLS is row-level, not column-level, so
  such a policy would let a coach rewrite every column of a linked athlete's row — `full_name`, `role`,
  `weight_kg`, `goal`. Instead coaches write targets through
  `public.assign_client_nutrition_targets(p_athlete_id, p_calorie_target, p_protein_target, p_carb_target, p_fat_target, p_locked)`:
  - `SECURITY DEFINER` with `SET search_path = ''`, required because no coach UPDATE policy exists on
    `profiles`, so a coach's own privileges cannot perform the write.
  - Coach identity is derived solely from `auth.uid()` — there is no coach-id parameter to spoof, and
    `nutrition_targets_updated_by` is always set server-side from it.
  - Ownership is verified against `coach_clients` before any write; an unlinked athlete is rejected.
  - Only the seven nutrition/audit columns can change: the four `daily_*_target` values plus
    `nutrition_targets_locked` / `_updated_by` / `_updated_at`. Targets are range-validated.
  - `EXECUTE` is granted to `authenticated` only; `PUBLIC`, `anon` and `service_role` are revoked.
  - The athlete's own `Users update own profile` policy is unchanged, so athletes keep editing their
    own row (the lock flag is what makes coach-set targets read-only in the athlete app).

### Progress tracking
- **`measurements`** — generic typed measurement log (`type` + `value` — weight, body fat %, circumference,
  etc.), the primary progress-tracking table used by the mobile app and sync.
- **`weight_logs`** — a narrower, weight-only log consumed specifically by
  `calculate-adaptive-nutrition`'s trend calculation. Coexists with `measurements`; not a duplicate to
  remove without checking that Edge Function first.
- **`progress_photos`** — R2-hosted photo metadata (`photo_key`, not the image itself).

### Messaging & notifications
- **`conversations`** (direct `athlete_id`/`coach_id` pairing, `UNIQUE(athlete_id, coach_id)`) →
  **`conversation_members`** → **`messages`**. RLS on `conversation_members` is intentionally
  **non-recursive** (checks only the caller's own row) after a real `42P17` infinite-recursion bug — see
  `20260718_reconciliation.sql`. Do not reintroduce a policy that queries `conversation_members` from
  within its own `USING` clause.
- **`notifications`** — per-user, coach-sendable-to-client, `read_at` timestamp.

### AI coach system
- **`ai_memory`** — persistent per-athlete key/value memory (`category`, `memory_key`, `memory_value`).
  Athletes have SELECT only; INSERT/UPDATE happen exclusively via the Edge Function's service-role client.
- **`ai_usage`** — per-athlete-per-day request counter, used for tier rate-limiting. Written only via
  `increment_ai_usage(athlete_id, date, tier)` (SECURITY DEFINER, service_role only — see
  [20260730_ai_usage_atomic_increment.sql](../supabase/migrations/20260730_ai_usage_atomic_increment.sql)),
  an atomic upsert-and-increment; do not read-then-write `requests_count` from application code — that
  was a real race allowing concurrent requests to bypass the free-tier cap.
- **`ai_safety_logs`** — flags risky AI conversations (`MEDICAL_ADVICE`/`INJURY_REPORT`/etc.); athlete
  INSERT is deliberately not allowed (service-role only), so clients can't fabricate/suppress records.
- **`ai_request_logs`** — token usage + cost per request (`provider`, `model`, `input_tokens`,
  `output_tokens`, `cost_usd`) from the shared AI provider service. Also `latency_ms`,
  `conversation_id`, `engine` (which deterministic engine, if any, backed the reply), `fallback_triggered`,
  `response_type`, `action_types` — added in `20260730_ai_request_logs_diagnostics_columns.sql` after
  discovering `20260727_add_latency_ms_to_ai_request_logs.sql` was a no-op placeholder (comment-only, no
  `ALTER TABLE`) that had silently broken success-path logging since that date. `request_id`/`user_id`/
  `status`/`error_code`/`created_at` in the QA-audit spec map to the pre-existing `id`/`athlete_id`/
  `success`+`error_reason`/`requested_at` columns rather than being duplicated under new names.

### Challenges & live metrics
- **`challenges`** / **`challenge_participants`** — time-boxed step/workout/calorie challenges with a
  leaderboard.
- **`live_metrics`** — one row per user, heart rate + active calories, realtime-published.

### Analytics & insights
- **`weekly_analytics`** — per-user weekly rollup (calories, protein, workout count, volume, weight
  change).
- **`health_insights`** — AI-generated free-text insights, consumed by `generate-health-insights`.
- **`activity_logs`** — product analytics events, restricted to an explicit allowlist
  (`activity_logs_event_name_check`) of 13 known event names — inserting an arbitrary event name is
  rejected at the DB level.

### Observability (two coexisting, both-active logging tables)
- **`error_logs`** — general context-tagged error log, written via `EventRepository.logError()` from
  several app screens.
- **`system_errors`** — crash-boundary / auth-failure / sync-failure log, written directly from
  `_layout.tsx`, `auth.tsx`, `useSyncManager.ts`, and the coach-dashboard's `global-error.tsx`. Powers the
  admin diagnostics tab.

### Subscriptions & beta program
- **`user_entitlements`** — `(user_id, plan_id)`, `source` (`beta_grant`/`revenuecat`/`stripe`/`admin`).
  Athletes have SELECT only; all writes are service-role-only (RevenueCat webhook / admin tooling).
- **`beta_consents`** — versioned consent acceptance (`BETA_TESTING`/`DATA_COLLECTION`/etc.).
- **`beta_user_feedback`** — in-app feedback submissions, readable by coach/admin roles.

## Deprecated / non-existent tables

These appear in `supabase/migrations/` but **do not exist in production** — confirmed by direct query, not
inferred. Full detail and per-file breakdown in [migration-audit.md](migration-audit.md). Do not write code
that queries any of these:

`roles`, `permissions`, `coach_profiles`, `athlete_profiles`, `coach_athletes`, `coach_notes`,
`exercise_categories`, `muscle_groups`, `equipment` *(table)*, `exercise_media`, `exercise_variations`,
`exercise_library`, `programs`, `program_phases`, `program_weeks`, `program_days` *(the old phase2 names —
not to be confused with the real, live `plan_days`)*, `workouts` *(server-side)*, `workout_exercises`,
`workout_history`, `food_nutrients`, `recipes`, `nutrition_targets`, `ai_conversations`, `ai_messages`,
`ai_insights`, `subscriptions`, `entitlements`, `payments`, `sync_metadata`, `sync_conflicts`,
`device_sessions`, `organizations`, `organization_members`, `program_templates` + its whole hierarchy,
`athlete_programs`, `athlete_program_progress`, `athlete_exercise_progress`, `check_ins`, `attachments`,
`message_read_receipts`, `domain_events`, `domain_event_handlers`, `notification_queue`,
`analytics_consents`, `analytics_events`, `feature_flags`, `ai_cost_tracking`, `media_files`, `audit_logs`,
`exercise_progression_history`, `plateau_events`, `athlete_performance_profiles`, `weekly_reviews`,
`muscle_volume_logs`, `ai_coach_memory`, `subscription_plans`, `features`, `plan_features`,
`beta_mode_config`, `beta_users`, `entitlement_history`, `beta_feedback` *(old version — not to be confused
with the real, live `beta_user_feedback`)*, `coach_adjustments`, `system_settings`, `admin_actions`.

Two currently-broken code paths reference tables from this list —
`supabase/functions/manage-entitlements` (`subscription_plans`) and `ai-coach`/`analyze-food-image`'s
global beta-mode check (`beta_mode_config`, fails safe). See migration-audit.md finding #4.

## Active Edge Functions

| Function | Purpose | Primary tables |
|---|---|---|
| `ai-coach` | Chat with the AI coach; tier/rate-limit gated. Deterministic engines decide progression/nutrition-remaining/plan edits (LLM only explains); writes plan_exercises for workout_plan_edit | ai_memory, ai_usage, ai_safety_logs, ai_request_logs, personal_records, workout_sessions, session_sets, plan_exercises, plan_days, workout_plans, meal_logs, profiles, user_entitlements |
| `analyze-food-image` | Vision-based food logging | ai_request_logs, user_entitlements |
| `calculate-adaptive-nutrition` | Adjusts nutrition targets from weight trend | profiles, weight_logs |
| `exercise-guidance` | On-demand AI coaching text for a single exercise (form, mistakes, breathing, variants) | exercises, ai_usage, ai_request_logs, user_entitlements |
| `generate-health-insights` | Produces free-text health insights | health_insights, live_metrics, meal_logs, workout_logs, profiles |
| `generate-workout-plan` | AI-generated hypertrophy program from target muscles, equipment, experience | ai_usage, ai_request_logs, user_entitlements |
| `generate-workout-summary` | Post-workout performance analysis (deterministic volume + AI coaching) | ai_usage, ai_request_logs, user_entitlements |
| `get-client-exercise-history` | Coach view of a client's history for one exercise | exercise_sets, profiles |
| `get-client-last-workout` | Coach view of a client's most recent workout | exercise_sets, workout_logs, profiles |
| `get-r2-signed-url` | Signed upload URL for R2 media | workout_plans |
| `manage-entitlements` | Admin grant/revoke of subscription plans | profiles, user_entitlements, subscription_plans *(broken — see above)* |
| `suggest-exercise-swap` | AI-powered exercise alternative recommendations (3 biomechanical alternatives) | ai_usage, ai_request_logs, user_entitlements |
| `sync-live-metrics` | Realtime heart-rate/calorie push | live_metrics |
| `sync-pull` | WatermelonDB pull side of sync | exercises (pull-only catalog), meal_logs, measurements, session_sets, workout_sessions, workout_plans, plan_days, plan_exercises, assigned_plans, workout_plan_sync_deletions (tombstones, read-only) |
| `sync-push` | WatermelonDB push side of sync | meal_logs, measurements, session_sets, workout_sessions, workout_plans, plan_days, plan_exercises (assigned_plans is pull-only — coaches assign, athletes don't push it) |
| `update-challenge-standings` | Recomputes challenge leaderboard | challenges, challenge_participants |
| `upload-to-r2` | Proxy upload to Cloudflare R2 | — (storage only) |
| `admin-data` | Coach-dashboard admin data feed (diagnostics, AI logs, etc.) | activity_logs, ai_request_logs, beta_consents, beta_user_feedback, coach_clients, meal_logs, profiles, system_errors, user_entitlements, workout_sessions |
| `_shared/ai` | Not a callable function — shared LLM provider abstraction (Gemini→OpenAI→Anthropic fallback, cost logging) used by `ai-coach` and others | ai_request_logs |

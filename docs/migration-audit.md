# Migration Audit — 2026-07-18

Full audit of every file in [supabase/migrations/](../supabase/migrations/) (51 files) against the live
production database. Every table name that appears anywhere in the migration history was checked for
live existence via the anon/authenticated REST API; ambiguous cases were cross-checked against actual
app-code usage (grep) and, for one RLS policy, live behavioral testing with real seeded accounts.

**No files were deleted or modified as part of this audit.** This is a read-only report. See
[Recommended Actions](#recommended-actions) at the bottom for what to do with it.

## How to read this

- **Active** — defines/alters something that is live in production today, and is the current source of
  truth for it (no later file overrides it).
- **Superseded** — defines/alters something real, but a *later* file replaced part or all of it. The
  table still exists; this file is no longer the authoritative definition for the parts that were
  replaced.
- **Duplicate** — re-states a definition that already exists from an earlier file, as a defensive
  `IF NOT EXISTS`/`IF EXISTS` no-op. Harmless, not authoritative.
- **Dead** — defines tables/columns that were never actually applied to production. Confirmed via direct
  query (`PGRST205 — table not found`), not inferred.

## Migration Status

| Migration | Status | Action |
|---|---|---|
| `20240626_init.sql` | Active | Keep |
| `20240626_storage.sql` | Active | Keep |
| `20240626_workout_schema.sql` | Active (table live, 0 rows — see [Notes](#notable-findings) #1) | Keep |
| `20240627_seed_exercises.sql` | Superseded (seed data long since replaced) | Keep |
| `20240627_workout_logging.sql` | Active (`logged_exercises` still rendered in `workouts.tsx`) | Keep |
| `20240627_workout_plans_rls.sql` | Active | Keep |
| `20240628_fix_old_exercises.sql` | Superseded (data replaced by full catalog import) | Keep |
| `20240628_food_schema.sql` | Active | Keep |
| `20240628_seed_rich_exercises.sql` | Active (the `UNIQUE(name)` constraint it adds is still live) + superseded seed data | Keep |
| `20240629_analytics_insights.sql` | Active (`weight_logs` used by `calculate-adaptive-nutrition`; `weekly_analytics`/`health_insights` used by `generate-health-insights`) | Keep |
| `20240629_realtime_challenges.sql` | Active (`live_metrics`, `exercise_sets`, `challenges`, `challenge_participants`) | Keep |
| `20240629_workout_logs_rls_fix.sql` | Active | Keep |
| `20240630_coach_plan_builder.sql` | Active | Keep |
| `20240630_r2_migration.sql` | Active (`progress_photos`) | Keep |
| `20240701_coach_notes_sync.sql` | Active | Keep |
| `20240701_history_indexes.sql` | Active | Keep |
| `20260701_add_meal_log_source.sql` | Active | Keep |
| `20260702_shared_backend_integration.sql` | **Active — foundational.** The real "phase 2" (coach_clients, plan_days, plan_exercises, assigned_plans, workout_sessions, session_sets, notifications, `calculate_adherence()`) | Keep |
| `20260703_fix_rls_policies.sql` | Active | Keep |
| `20260704_fix_profiles_rls.sql` | Active (real security fix) | Keep |
| `20260705_fix_delete_cascade.sql` | Active | Keep |
| `20260706_add_new_features.sql` | Active (personal_records, client_invites, exercise_bundles, bundle_exercises, trainer_notes) | Keep |
| `20260707_fix_invites_rls.sql` | Active | Keep |
| `20260708_fix_workout_plans_rls.sql` | Active | Keep |
| `20260709_add_weight_to_plan_exercises.sql` | Active | Keep |
| `20260710_athlete_view_coach_profile.sql` | Active | Keep |
| `20260711_coach_view_client_meal_logs.sql` | Active | Keep |
| `20260711_normalise_muscle_groups.sql` | Active (one-time data cleanup) | Keep |
| `20260712_add_exercise_id_to_session_sets.sql` | Active | Keep |
| `deploy_to_supabase_dashboard.sql` | **Dead / Duplicate — contains a security regression.** See [Notes](#notable-findings) #2 | **Archive, with warning** |
| `20260714_phase2_schema.sql` | Dead (~30 of 32 tables never applied) | **Archive, with warning** |
| `20260714_sync_metadata.sql` | Dead (all 3 tables missing) | Archive |
| `20260714_saas_phase_6a.sql` | Dead (13 of 16 tables missing; `conversations`/`conversation_members`/`messages` survive only because later files re-created them) | **Archive, with warning** |
| `20260714_saas_events_and_readiness.sql` | Dead (all 9 tables missing) | Archive |
| `20260714_training_engine.sql` | Dead (both tables missing) | Archive |
| `20260714_coaching_loop.sql` | Dead (all 4 tables missing) | Archive |
| `20260714_entitlements_beta.sql` | Dead (3 of 4 tables missing; `user_entitlements` shape superseded by `phase3_2_security_fixes.sql`) | Archive |
| `20260714_beta_management.sql` | Dead (all 3 tables missing) | Archive |
| `20260714_beta_safety.sql` | Dead as a file (its `ALTER TABLE workouts` targets a table that never existed; everything else it defines that IS live now was re-created by later files) | Archive |
| `20260714_phase_7_stabilization.sql` | Dead (`exercise_library` missing; alters 2 nonexistent tables) | Archive |
| `20260715_add_progression_suggestion.sql` | **Active.** Creates `measurements` (real, used everywhere) | Keep |
| `20260715_phase2_3_ai_intelligence.sql` | Active | Keep |
| `20260715_phase2_4_messaging_notifications.sql` | Active | Keep |
| `20260715_phase2_experience_intelligence.sql` | Superseded in part — its `conversation_members` SELECT policy caused the 42P17 recursion bug, replaced by `20260718_reconciliation.sql` | Keep |
| `20260715_phase3_2_security_fixes.sql` | **Active — the real security-hardening milestone.** ai_usage, progression_recommendations, ai_safety_logs, foods, ai_memory, user_entitlements, conversations, conversation_members, system_errors, activity_logs, ai_request_logs | Keep |
| `20260715_phase3_3_performance_tuning.sql` | Active | Keep |
| `20260715_phase3_3b_fixes.sql` | Active | Keep |
| `20260715_phase3_3c_beta_onboarding.sql` | Active (beta_consents, beta_user_feedback) | Keep |
| `20260715_phase3_hardening.sql` | Superseded in part — its `error_logs`/`activity_logs` RLS didn't survive; re-applied by `20260718_reconciliation.sql` | Keep |
| `20260718_reconciliation.sql` | **Active — canonical repair migration.** Current source of truth for activity_logs/error_logs/conversations/conversation_members RLS | Keep |
| `20260719_auto_create_profile_on_signup.sql` | **Active — critical fix.** | Keep |
| `20260719_exercise_catalog_enrichment.sql` | **Active.** | Keep |
| `20260720_exercise_dedup.sql` | **Active.** | Keep |

**Summary: 39 active, 2 superseded-in-part (both already have a canonical replacement — see above), 10 dead/archive-candidates (1 of which — `deploy_to_supabase_dashboard.sql` — additionally contains a security regression).**

## Notable findings

0. **Every migration dated 2026-07-14 or later — 23 files — has never been committed to git.**
   `git ls-files supabase/migrations/` stops at `20260712_add_exercise_id_to_session_sets.sql` and
   `deploy_to_supabase_dashboard.sql`; everything from `20260714_beta_management.sql` through
   `20260720_exercise_dedup.sql` shows as untracked (`??`) in `git status`. This cuts both ways:
   - It includes all 10 dead "phase" files from finding #3 below — arguably fine to leave uncommitted,
     since they were never real.
   - It **also includes migrations this audit confirmed are live and load-bearing in production**:
     `20260715_add_progression_suggestion.sql` (creates `measurements` — used by the mobile app and both
     sync Edge Functions), `20260715_phase3_2_security_fixes.sql` (the main security-hardening migration —
     `ai_usage`, `ai_safety_logs`, hardened `foods`/`ai_memory`/`conversations`, `system_errors`,
     `activity_logs`, `ai_request_logs`), `20260718_reconciliation.sql` (the canonical RLS repair),
     `20260719_auto_create_profile_on_signup.sql` (the profile-creation trigger every signup depends on),
     and this week's exercise-catalog work.

   **This means a fresh `git clone` of this repository today, followed by `supabase db push` against an
   empty database, would silently fail to reproduce production** — it would be missing the `measurements`
   table, the security hardening, the profile-creation trigger, and the current exercise catalog schema,
   while *also* picking up none of the dead phantom tables (which is the one upside). This is a bigger and
   more urgent drift risk than finding #3's phantom-table risk, because it means the migration history
   in version control and the migration history that actually produced production have already diverged —
   today, not hypothetically. See [Recommended Actions](#recommended-actions).

1. **`workout_plan_exercises` (from `20240626_workout_schema.sql`) still exists live with 0 rows.** It's
   the *original* workout-plan-to-exercise join table, from before `20260702_shared_backend_integration.sql`
   introduced the `plan_days` → `plan_exercises` hierarchy. Nothing references it anymore in app code —
   it was superseded in practice, just never dropped. Not urgent; flagged for awareness only, since this
   audit was told not to change schema.

2. **`deploy_to_supabase_dashboard.sql` contains a security regression, currently inert.** It's a
   hand-assembled bundle of `20260702_shared_backend_integration.sql` + `20260703_fix_rls_policies.sql` +
   `20260712_add_exercise_id_to_session_sets.sql` — apparently a "paste this whole thing into the SQL
   Editor" convenience snapshot from the hand-applied-migrations era. Its copy of the
   **"Coaches read client profiles"** policy is missing the `AND cc.athlete_id = profiles.id` clause that
   the real `20260703_fix_rls_policies.sql` has:

   ```sql
   -- deploy_to_supabase_dashboard.sql (buggy — matches ANY coach with at least one client)
   CREATE POLICY "Coaches read client profiles" ON public.profiles
     FOR SELECT USING (
       EXISTS (SELECT 1 FROM public.coach_clients cc WHERE cc.coach_id = auth.uid())
     );
   ```

   If this file were ever re-run (e.g. someone finds it and pastes it into the SQL Editor thinking it's a
   convenient "redeploy everything" script), **every coach with at least one client would be able to read
   every athlete's profile in the entire app**, not just their own clients'. I verified live behavior with
   two real seeded accounts (`coach-a@dude.com`, which has 4 real clients, against `athlete-2@dude.com`,
   who is not one of them): the correct, narrow policy is what's actually live today — `coach-a` sees
   exactly 5 profiles (itself + its 4 clients), not `athlete-2`'s. **The bug is not currently exploitable**,
   but the file is a live landmine and should never be run again as-is.

3. **~50 tables across 10 "phase" migration files (all dated 2026-07-14) were drafted but never applied
   to production.** This looks like a burst of ambitious, speculative SaaS-platform schema design
   (multi-tenant organizations, versioned program templates, a domain-events/queue layer, feature flags,
   an AI coaching-intelligence loop, a training-engine progression system) that was never actually run —
   most likely because later, more careful files (`20260715_phase3_2_security_fixes.sql` and siblings)
   explicitly say *"creates table if prior migration was not applied"*, i.e. their own author already knew
   the earlier phase files hadn't landed and defensively re-created only the pieces that were still
   needed. The tables that **did** end up real (`ai_memory`, `ai_usage`, `ai_safety_logs`,
   `progression_recommendations`, `conversations`/`conversation_members`/`messages`, `system_errors`,
   `user_entitlements`, `beta_consents`, `beta_user_feedback`) all trace to those later, careful files —
   not to the original speculative ones.

   **Risk:** if anyone ever runs the full migration history against a genuinely fresh database (a new dev
   environment, CI test DB, or disaster recovery), these ~50 phantom tables **would** actually get created
   this time, because `IF NOT EXISTS` only no-ops against *already-existing* tables — on an empty DB there's
   nothing to no-op against. That fresh environment would then diverge from production on day one, which
   is the exact class of drift this whole reconciliation effort exists to eliminate.

4. **Two currently-broken/inert code paths were found as a byproduct of checking table existence** (not
   modified — flagged only, since this audit is documentation/read-only):
   - `supabase/functions/manage-entitlements/index.ts`'s `"grant"` action validates the requested plan
     against `subscription_plans` — a table that does not exist. Every call to grant a plan currently
     returns `400 Invalid Plan` unconditionally.
   - `supabase/functions/ai-coach/index.ts` and `analyze-food-image/index.ts` both check a global beta-mode
     toggle via `beta_mode_config` — also missing. Both call sites use a safe `?? false` fallback, so this
     fails quietly rather than erroring; the toggle is just permanently off.

5. **`error_logs` and `system_errors` are two separate, both-active error-logging tables** with
   overlapping purpose. `error_logs` is written via `EventRepository.logError()` (called from several
   screens for general context-tagged errors); `system_errors` is written directly from crash boundaries,
   failed logins, and sync failures (added this session). Not a bug, just a minor duplication worth
   knowing about — not touched here since it's a working, active pattern.

## Recommended Actions

Per this review's constraints, nothing below was executed — these are recommendations only.

- **Commit the migrations that are confirmed active but untracked** (`20260715_add_progression_suggestion.sql`,
  `20260715_phase2_3_ai_intelligence.sql`, `20260715_phase2_4_messaging_notifications.sql`,
  `20260715_phase2_experience_intelligence.sql`, `20260715_phase3_2_security_fixes.sql`,
  `20260715_phase3_3_performance_tuning.sql`, `20260715_phase3_3b_fixes.sql`,
  `20260715_phase3_3c_beta_onboarding.sql`, `20260715_phase3_hardening.sql`,
  `20260718_reconciliation.sql`, `20260719_auto_create_profile_on_signup.sql`,
  `20260719_exercise_catalog_enrichment.sql`, `20260720_exercise_dedup.sql`) so a fresh clone's migration
  history actually matches production. This is the single highest-priority item in this report — ask
  before running the `git add`/`git commit`, since committing wasn't part of this review's scope.
- **Do not re-run or reference `deploy_to_supabase_dashboard.sql` for anything.** It should be moved to an
  `archive/` subfolder (or clearly renamed) so it's never mistaken for a deploy script again. This is the
  single highest-priority item in this report.
- **Move the 9 confirmed-dead "phase" files to an archive folder** (`supabase/migrations/archive/` or
  similar) so `supabase db push`/`db reset` against a fresh database stops trying to create ~50 phantom
  tables. This eliminates the drift risk described in finding #3 without deleting any history.
- **Fix `manage-entitlements`'s broken grant action and the two inert beta-mode checks** — separate task,
  not part of this review (would touch application/edge-function code, not schema).
- Going forward, follow the new rules added to [AGENTS.md](../AGENTS.md) (verify a migration against the
  live schema before writing it; never draft speculative multi-table schemas without applying them
  immediately) to prevent a repeat of finding #3.

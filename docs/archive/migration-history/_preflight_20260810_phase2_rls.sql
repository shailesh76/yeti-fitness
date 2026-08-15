-- ============================================================================
-- PREFLIGHT / POSTFLIGHT — read-only. Safe to run at any time.
-- Not a migration: the leading underscore keeps it out of the migration set.
--
--   npx supabase db query --linked -f supabase/migrations/_preflight_20260810_phase2_rls.sql
--
-- Run BEFORE and AFTER applying:
--   20260810230000_assigned_plans_plan_ownership_rls.sql
--   20260810230100_coach_nutrition_targets_reconcile.sql
--
-- Written as ONE query with UNION ALL on purpose: `supabase db query -f`
-- returns only the final result set, so separate statements would silently
-- hide every check but the last.
-- ============================================================================

-- 1. assigned_plans policies.
--    BEFORE: "Coaches manage assigned plans"/ALL + "Athletes view assigned plans"/SELECT
--    AFTER : 4 coach policies split by command + the untouched athlete SELECT policy
SELECT '1_assigned_plans_policy' AS check,
       policyname || ' [' || cmd || ']'
         || ' using=' || CASE WHEN qual IS NULL THEN 'none' ELSE 'yes' END
         || ' check=' || CASE WHEN with_check IS NULL THEN 'none' ELSE 'yes' END
         || CASE WHEN coalesce(qual, '') || coalesce(with_check, '') LIKE '%workout_plans%'
                 THEN ' PLAN_OWNERSHIP=yes' ELSE ' PLAN_OWNERSHIP=no' END AS detail
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'assigned_plans'

UNION ALL

-- 2. profiles UPDATE policies.
--    BEFORE and AFTER: only "Users update own profile". A coach policy appearing
--    here is a REGRESSION — the coach write path is the RPC, by design.
SELECT '2_profiles_update_policy', policyname || ' [' || cmd || ']'
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd IN ('UPDATE', 'ALL')

UNION ALL

-- 3. Nutrition target columns. BEFORE: 4 daily_*_target. AFTER: 7.
SELECT '3_nutrition_column', a.attname
FROM pg_attribute a
WHERE a.attrelid = 'public.profiles'::regclass
  AND a.attnum > 0 AND NOT a.attisdropped
  AND (a.attname LIKE 'daily_%target' OR a.attname LIKE 'nutrition_targets%')

UNION ALL

-- 4. The narrowly scoped nutrition RPC. BEFORE: absent. AFTER: 1 row,
--    security_definer=t, search_path pinned, EXECUTE only for authenticated.
SELECT '4_nutrition_rpc',
       p.proname
         || ' security_definer=' || p.prosecdef
         || ' config=' || coalesce(array_to_string(p.proconfig, ','), 'none')
         || ' acl=' || coalesce(array_to_string(p.proacl::text[], ' '), 'default')
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'assign_client_nutrition_targets'

UNION ALL

-- 5. Migration history. NOTE 20260728 is recorded but its objects do not exist —
--    a false ledger row, which is why checks 2-4 are the authority, not this.
SELECT '5_migration_history', version || ' ' || name
FROM supabase_migrations.schema_migrations
WHERE version IN ('20260702', '20260728', '20260810230000', '20260810230100')

UNION ALL

-- 6. Collision guard: version is the PRIMARY KEY of schema_migrations, so two
--    files sharing a version can only ever record one row — which is how this
--    repo's ledger drifted. Expect 0 rows for the versions being added.
SELECT '6_version_collision', version || ' recorded x' || count(*)::text
FROM supabase_migrations.schema_migrations
WHERE version IN ('20260810230000', '20260810230100')
GROUP BY version
HAVING count(*) > 1

ORDER BY 1, 2;

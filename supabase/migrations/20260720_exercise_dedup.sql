-- ============================================================================
-- 20260720_exercise_dedup.sql — Step 4.2c
-- ============================================================================
-- Removes 13 duplicate exercise pairs left over from merging free-exercise-db
-- (stills) and omercotkd-gifs (animated) — both sources contained the same
-- 13 bodyweight exercises. For each pair we keep the animated 'gif' row
-- (better UX, matches the majority of the catalog) and delete the still
-- 'image' row.
--
-- Only ONE of the 13 pairs ("3/4 Sit-Up") is actually referenced elsewhere —
-- 1 row in plan_exercises, 3 in session_sets, 3 in personal_records, all
-- pointing at the loser. Those are re-pointed to the survivor before delete
-- so no real workout/PR history is orphaned. Checked against every table in
-- the schema with an exercise_id-shaped column (workout_plan_exercises,
-- exercise_sets, coach_exercise_notes, plan_exercises, session_sets,
-- personal_records, bundle_exercises, progression_recommendations) — the
-- other 12 losers have zero references anywhere and can be deleted directly.
--
-- Also drops the one junk test row ("Temp Cascade Lift yugq9", null gif_url,
-- source='other') confirmed to have no references in any of those tables.
-- ============================================================================

-- 1. Re-point the only pair with real references: 3/4 Sit-Up
--    loser 4dae4a05-a797-4711-91dc-c829a01d3304 -> survivor a45ea3f6-aee0-4fdb-ada0-7483c9b3f1d1
UPDATE public.plan_exercises SET exercise_id = 'a45ea3f6-aee0-4fdb-ada0-7483c9b3f1d1'
  WHERE exercise_id = '4dae4a05-a797-4711-91dc-c829a01d3304';
UPDATE public.session_sets SET exercise_id = 'a45ea3f6-aee0-4fdb-ada0-7483c9b3f1d1'
  WHERE exercise_id = '4dae4a05-a797-4711-91dc-c829a01d3304';
UPDATE public.personal_records SET exercise_id = 'a45ea3f6-aee0-4fdb-ada0-7483c9b3f1d1'
  WHERE exercise_id = '4dae4a05-a797-4711-91dc-c829a01d3304';

-- 2. Delete the 13 loser (still-image) rows now that none are referenced
DELETE FROM public.exercises WHERE id IN (
  '4dae4a05-a797-4711-91dc-c829a01d3304', -- 3/4 Sit-Up
  'f7f001db-f4dc-40b3-8ddd-54166731a54d', -- Band Assisted Pull-Up
  '27d316c9-7454-43b0-b4b7-87b5170052be', -- Body-Up
  'fb019095-eb21-4b3d-b116-3b22edf41517', -- Butt-Ups
  '11318cf6-1a80-490f-8ba2-7b5098c27564', -- Chin-Up
  '080a387d-6ea5-42ab-853a-bc1ebba0054d', -- Clock Push-Up
  'eed039ab-7f2a-4e7f-9ff3-34fd3c84f539', -- Decline Push-Up
  'b31c0455-6da7-4213-821d-3d33fa624681', -- Incline Push-Up
  '8ea450ee-54a2-4f62-9f30-9600677784b9', -- Jackknife Sit-Up
  'a1b71928-bc71-49bb-a887-a777a2aae0a3', -- Janda Sit-Up
  'bfbf8d4d-8b2f-470a-838c-3d892cad0a24', -- One Arm Chin-Up
  '4d5d7ee6-0b36-43b7-9eaa-be9e80947474', -- Scapular Pull-Up
  'f7e5050d-fc51-4cd5-bbb1-c8a48c32ce3a'  -- Suspended Push-Up
);

-- 3. Delete the junk test row (no references anywhere)
DELETE FROM public.exercises WHERE id = '3c4788c6-974d-43df-be08-0fc0ddbee2ae';

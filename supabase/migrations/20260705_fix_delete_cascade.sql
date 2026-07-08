-- 20260705_fix_delete_cascade.sql
-- Fix FK constraints that block user deletion from Supabase Auth.
-- workout_logs.user_id, workout_plans.coach_id, workout_plans.user_id all had
-- NO ACTION, which prevents cascading deletes from auth.users → profiles → these tables.

-- Fix workout_logs.user_id
ALTER TABLE public.workout_logs
  DROP CONSTRAINT workout_logs_user_id_fkey,
  ADD CONSTRAINT workout_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Fix workout_plans.coach_id (set null so orphaned plans aren't deleted, just unassigned)
ALTER TABLE public.workout_plans
  DROP CONSTRAINT workout_plans_coach_id_fkey,
  ADD CONSTRAINT workout_plans_coach_id_fkey
    FOREIGN KEY (coach_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Fix workout_plans.user_id (set null — the plan stays but is unassigned)
ALTER TABLE public.workout_plans
  DROP CONSTRAINT workout_plans_user_id_fkey,
  ADD CONSTRAINT workout_plans_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

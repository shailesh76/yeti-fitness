-- ============================================================================
-- 20260719_auto_create_profile_on_signup.sql
-- ============================================================================
-- Root-cause fix for FK violations (23503) on activity_logs and, more broadly,
-- on every table that references public.profiles(id) — including
-- workout_sessions and measurements, i.e. the app's core logging/sync path.
--
-- Root cause: no code path, client or server, ever inserted a public.profiles
-- row for a newly signed-up user.
--   - Onboarding writes profile fields (name/age/goals/body metrics) to LOCAL
--     WatermelonDB only, via UserRepository.updateProfile — never synced remotely.
--   - sync-push only upserts workout_sessions / session_sets / meal_logs /
--     measurements — it never touches profiles.
-- So a freshly signed-up user has an auth.users row but no public.profiles row,
-- ever. Any insert that FKs to profiles(id) then fails — reproduced live for
-- both activity_logs and workout_sessions with a throwaway signup.
--
-- Fix: the standard Supabase pattern — a trigger on auth.users that creates a
-- minimal public.profiles row automatically on signup. Idempotent, safe to
-- rerun. A one-time backfill also repairs accounts already affected (e.g. the
-- account that hit the reported activity_logs error).
--
-- Out of scope (flagged separately, not fixed here): onboarding-collected
-- profile data (name/age/goals/body metrics) still only lands in local
-- WatermelonDB and is never synced to public.profiles remotely. This
-- migration only guarantees the row EXISTS; it does not populate those
-- fields. See conversation notes — needs a product decision before fixing.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: create profiles for any existing auth.users missing one.
insert into public.profiles (id)
select u.id
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

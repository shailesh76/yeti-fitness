-- 20260704_fix_profiles_rls.sql
-- The original init migration created an overly permissive profiles SELECT policy:
--   "(auth.uid() = id) OR (auth.role() = 'authenticated')"
-- This allows any authenticated user to read any profile row, defeating RLS isolation.
-- Drop it and rely solely on the two correct narrowly-scoped policies from 20260703.

DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;

-- Also drop the old UPDATE duplicate from the init migration
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;

-- Verify what remains (for audit purposes — will appear in query output):
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

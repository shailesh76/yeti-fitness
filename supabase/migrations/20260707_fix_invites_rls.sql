-- Migration: Fix client_invites RLS policies to be secure and case-insensitive
-- Drop any existing versions of the policies we are about to create
DROP POLICY IF EXISTS "Anyone can read invites" ON public.client_invites;
DROP POLICY IF EXISTS "Coaches can view invites they sent" ON public.client_invites;
DROP POLICY IF EXISTS "Athletes can view matching invites" ON public.client_invites;
DROP POLICY IF EXISTS "Athletes can update matching invites" ON public.client_invites;

-- Create correct narrow-scope SELECT policies
CREATE POLICY "Coaches can view invites they sent"
  ON public.client_invites FOR SELECT
  USING (auth.uid() = coach_id);

CREATE POLICY "Athletes can view matching invites"
  ON public.client_invites FOR SELECT
  USING (lower(email) = lower(auth.jwt() ->> 'email'));

-- Create correct narrow-scope UPDATE policy
CREATE POLICY "Athletes can update matching invites"
  ON public.client_invites FOR UPDATE
  USING (lower(email) = lower(auth.jwt() ->> 'email'))
  WITH CHECK (lower(email) = lower(auth.jwt() ->> 'email'));


-- Drop any existing version of the coach_clients insert policy for athletes
DROP POLICY IF EXISTS "Athletes can insert client links for accepted invites" ON public.coach_clients;

-- Allow athletes to insert coach_clients relationship when they accept an invite (covers pending & accepted states)
CREATE POLICY "Athletes can insert client links for accepted invites"
  ON public.coach_clients FOR INSERT
  WITH CHECK (
    auth.uid() = athlete_id
    AND EXISTS (
      SELECT 1 FROM public.client_invites ci
      WHERE ci.coach_id = coach_clients.coach_id
        AND lower(ci.email) = lower(auth.jwt() ->> 'email')
        AND ci.status IN ('pending', 'accepted')
    )
  );

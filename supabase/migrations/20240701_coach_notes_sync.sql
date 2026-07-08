-- Migration: Coach Exercise Notes Synced Table
-- Date: 2024-07-01

CREATE TABLE IF NOT EXISTS public.coach_exercise_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE NOT NULL,
  notes TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, exercise_id)
);

-- Enable RLS
ALTER TABLE public.coach_exercise_notes ENABLE ROW LEVEL SECURITY;

-- Select policy: Allow coaches and clients assigned to see notes
CREATE POLICY "Enable read access for involved coach and client"
  ON public.coach_exercise_notes FOR SELECT
  USING (auth.uid() = coach_id OR auth.uid() = client_id);

-- Insert/Update/Delete policy: Allow coaches to manage notes
CREATE POLICY "Enable all access for coach"
  ON public.coach_exercise_notes FOR ALL
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

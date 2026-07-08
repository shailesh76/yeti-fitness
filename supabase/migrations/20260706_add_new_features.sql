-- Migration: Add Personal Records, Client Invites, Exercise Bundles, and Trainer Notes

-- 1. Personal Records (PRs) Table
CREATE TABLE IF NOT EXISTS public.personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE NOT NULL,
  record_type TEXT CHECK (record_type IN ('max_weight', 'max_reps', 'best_time')) NOT NULL,
  value NUMERIC NOT NULL,
  achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own PRs" 
  ON public.personal_records FOR ALL 
  USING (auth.uid() = athlete_id) 
  WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Coaches can read client PRs" 
  ON public.personal_records FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_clients cc 
      WHERE cc.coach_id = auth.uid() AND cc.athlete_id = personal_records.athlete_id
    )
  );

CREATE INDEX IF NOT EXISTS idx_personal_records_athlete ON public.personal_records(athlete_id, exercise_id);


-- 2. Client Invites Table
CREATE TABLE IF NOT EXISTS public.client_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.client_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage client invites" 
  ON public.client_invites FOR ALL 
  USING (auth.uid() = coach_id) 
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Anyone can read invites" 
  ON public.client_invites FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Athletes can update matching invites" 
  ON public.client_invites FOR UPDATE 
  USING (email = (SELECT email FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (email = (SELECT email FROM public.profiles WHERE id = auth.uid()));

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_invites_coach_email_pending 
  ON public.client_invites (coach_id, email) 
  WHERE status = 'pending';


-- 3. Exercise Bundles Tables
CREATE TABLE IF NOT EXISTS public.exercise_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.bundle_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID REFERENCES public.exercise_bundles(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE NOT NULL,
  sets INTEGER NOT NULL DEFAULT 3,
  reps TEXT NOT NULL DEFAULT '10',
  order_index INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.exercise_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage their own bundles" 
  ON public.exercise_bundles FOR ALL 
  USING (auth.uid() = coach_id) 
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can manage their bundle exercises" 
  ON public.bundle_exercises FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.exercise_bundles eb 
      WHERE eb.id = bundle_id AND eb.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.exercise_bundles eb 
      WHERE eb.id = bundle_id AND eb.coach_id = auth.uid()
    )
  );


-- 4. Trainer Notes Table
CREATE TABLE IF NOT EXISTS public.trainer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  athlete_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.trainer_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage trainer notes" 
  ON public.trainer_notes FOR ALL 
  USING (
    auth.uid() = coach_id 
    AND EXISTS (
      SELECT 1 FROM public.coach_clients cc 
      WHERE cc.coach_id = auth.uid() AND cc.athlete_id = trainer_notes.athlete_id
    )
  )
  WITH CHECK (
    auth.uid() = coach_id 
    AND EXISTS (
      SELECT 1 FROM public.coach_clients cc 
      WHERE cc.coach_id = auth.uid() AND cc.athlete_id = trainer_notes.athlete_id
    )
  );

CREATE INDEX IF NOT EXISTS idx_trainer_notes_athlete ON public.trainer_notes(athlete_id);

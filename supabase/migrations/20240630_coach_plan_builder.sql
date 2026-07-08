-- 1. Update exercises table for custom coach exercises
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS created_by_coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Update workout_plans table to track updates
ALTER TABLE public.workout_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Update workout_plan_exercises table with rich targets and notes
ALTER TABLE public.workout_plan_exercises ADD COLUMN IF NOT EXISTS target_sets INTEGER DEFAULT 3;
ALTER TABLE public.workout_plan_exercises ADD COLUMN IF NOT EXISTS target_reps TEXT DEFAULT '10';
ALTER TABLE public.workout_plan_exercises ADD COLUMN IF NOT EXISTS target_weight_kg NUMERIC;
ALTER TABLE public.workout_plan_exercises ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================
-- STORAGE BUCKET CONFIGURATION
-- ============================================================

-- Create workout-media storage bucket for exercise GIFs and videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('workout-media', 'workout-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
DROP POLICY IF EXISTS "Allow public read access to workout-media" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to workout-media" ON storage.objects;
DROP POLICY IF EXISTS "Allow coaches to delete workout-media" ON storage.objects;

CREATE POLICY "Allow public read access to workout-media" ON storage.objects
  FOR SELECT USING (bucket_id = 'workout-media');

CREATE POLICY "Allow authenticated uploads to workout-media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'workout-media' AND auth.role() = 'authenticated');

CREATE POLICY "Allow coaches to delete workout-media" ON storage.objects
  FOR DELETE USING (bucket_id = 'workout-media' AND auth.role() = 'authenticated');

-- ============================================================
-- UPDATED RLS POLICIES FOR WORKOUT PLANS & EXERCISES
-- ============================================================

-- Exercises policies
DROP POLICY IF EXISTS "Exercises are viewable by everyone." ON public.exercises;
DROP POLICY IF EXISTS "Coaches can insert their own exercises" ON public.exercises;
DROP POLICY IF EXISTS "Coaches can update their own exercises" ON public.exercises;
DROP POLICY IF EXISTS "Coaches can delete their own exercises" ON public.exercises;

CREATE POLICY "Exercises are viewable by everyone."
  ON public.exercises FOR SELECT
  USING (true);

CREATE POLICY "Coaches can insert their own exercises"
  ON public.exercises FOR INSERT
  WITH CHECK (auth.uid() = created_by_coach_id);

CREATE POLICY "Coaches can update their own exercises"
  ON public.exercises FOR UPDATE
  USING (auth.uid() = created_by_coach_id);

CREATE POLICY "Coaches can delete their own exercises"
  ON public.exercises FOR DELETE
  USING (auth.uid() = created_by_coach_id);


-- Workout Plans policies
DROP POLICY IF EXISTS "Users can view their own workout plans." ON public.workout_plans;
DROP POLICY IF EXISTS "Coaches can manage workout plans." ON public.workout_plans;

CREATE POLICY "Users can view their own workout plans."
  ON public.workout_plans FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = coach_id);

CREATE POLICY "Coaches can manage workout plans."
  ON public.workout_plans FOR ALL
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);


-- Workout Plan Exercises policies
DROP POLICY IF EXISTS "Users can view exercises of their plans." ON public.workout_plan_exercises;
DROP POLICY IF EXISTS "Coaches can manage workout plan exercises" ON public.workout_plan_exercises;

CREATE POLICY "Users can view exercises of their plans."
  ON public.workout_plan_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_plans wp
      WHERE wp.id = workout_plan_exercises.workout_plan_id
      AND (wp.user_id = auth.uid() OR wp.coach_id = auth.uid())
    )
  );

CREATE POLICY "Coaches can manage workout plan exercises"
  ON public.workout_plan_exercises FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_plans wp
      WHERE wp.id = workout_plan_exercises.workout_plan_id
      AND wp.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_plans wp
      WHERE wp.id = workout_plan_exercises.workout_plan_id
      AND wp.coach_id = auth.uid()
    )
  );

-- ============================================================
-- SUPABASE REALTIME CONFIGURATION
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_class c ON pr.prrelid = c.oid 
    JOIN pg_publication p ON pr.prpubid = p.oid 
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'workout_plans'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE workout_plans;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_class c ON pr.prrelid = c.oid 
    JOIN pg_publication p ON pr.prpubid = p.oid 
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'workout_plan_exercises'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE workout_plan_exercises;
  END IF;
END $$;

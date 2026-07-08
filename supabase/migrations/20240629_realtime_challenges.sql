-- Create live_metrics table
CREATE TABLE IF NOT EXISTS live_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  heart_rate INT DEFAULT 0,
  active_calories INT DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create exercise_sets table
CREATE TABLE IF NOT EXISTS public.exercise_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_log_id UUID REFERENCES public.workout_logs(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE NOT NULL,
  reps INTEGER NOT NULL,
  weight_kg NUMERIC NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create challenges table
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('STEPS', 'WORKOUTS', 'CALORIES')),
  target_value FLOAT DEFAULT 0.0,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create challenge_participants table
CREATE TABLE IF NOT EXISTS challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  current_value FLOAT DEFAULT 0.0,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(challenge_id, user_id)
);

-- Update profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS expo_push_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_reminder_time TIME DEFAULT '08:00:00';

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- live_metrics: users own their row; coaches can view all
ALTER TABLE live_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can upsert their own metrics"
  ON live_metrics FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "All authenticated users can view live metrics"
  ON live_metrics FOR SELECT
  USING (auth.role() = 'authenticated');

-- exercise_sets: users can insert their own sets; all authenticated can read
ALTER TABLE exercise_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own exercise sets"
  ON exercise_sets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_logs wl
      WHERE wl.id = exercise_sets.workout_log_id
      AND wl.user_id = auth.uid()
    )
  );

CREATE POLICY "All authenticated users can view exercise sets"
  ON exercise_sets FOR SELECT
  USING (auth.role() = 'authenticated');

-- challenges: readable by all authenticated users
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Challenges are viewable by all authenticated users"
  ON challenges FOR SELECT
  USING (auth.role() = 'authenticated');

-- challenge_participants: users manage their own; all can view for leaderboard
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can join challenges"
  ON challenge_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "All authenticated users can view challenge participants"
  ON challenge_participants FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own challenge progress"
  ON challenge_participants FOR UPDATE
  USING (auth.uid() = user_id);

-- profiles: allow authenticated users to read all profiles (for roster/leaderboard)
DROP POLICY IF EXISTS "Users can view their own profile." ON profiles;

CREATE POLICY "Users can view their own profile."
  ON profiles FOR SELECT
  USING (auth.uid() = id OR auth.role() = 'authenticated');

-- ============================================================
-- SUPABASE REALTIME PUBLICATION
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_class c ON pr.prrelid = c.oid 
    JOIN pg_publication p ON pr.prpubid = p.oid 
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'live_metrics'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE live_metrics;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_class c ON pr.prrelid = c.oid 
    JOIN pg_publication p ON pr.prpubid = p.oid 
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'workout_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE workout_logs;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_class c ON pr.prrelid = c.oid 
    JOIN pg_publication p ON pr.prpubid = p.oid 
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'exercise_sets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE exercise_sets;
  END IF;
END $$;

-- ============================================================
-- SEED SAMPLE CHALLENGES (optional - remove if not needed)
-- ============================================================
INSERT INTO challenges (title, description, type, target_value, start_date, end_date)
VALUES
  (
    '7-Day Step Blitz',
    'Walk or run 70,000 total steps across the week. Every step counts, dude!',
    'STEPS',
    70000,
    NOW(),
    NOW() + INTERVAL '7 days'
  ),
  (
    'Workout Warrior',
    'Complete 5 full workout sessions this week. No skipping leg day.',
    'WORKOUTS',
    5,
    NOW(),
    NOW() + INTERVAL '7 days'
  ),
  (
    'Calorie Inferno',
    'Burn 3,500 active calories this week. Push the limit.',
    'CALORIES',
    3500,
    NOW(),
    NOW() + INTERVAL '7 days'
  )
ON CONFLICT DO NOTHING;

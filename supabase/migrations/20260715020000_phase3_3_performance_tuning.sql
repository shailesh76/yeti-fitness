-- ============================================================
-- Phase 3.3: Production Load Testing & Index Tuning
-- ============================================================

-- Ensure required columns exist (handles cases where prior migrations were skipped)
ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.session_sets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.meal_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.measurements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Ensure messages table exists
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1. Workout & Sets Progression Indexes
-- Accelerates getWorkoutHistory and client detail queries by athlete_id, sorted by started_at/completed_at
CREATE INDEX IF NOT EXISTS idx_workout_sessions_athlete_completed 
  ON public.workout_sessions(athlete_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_athlete_started
  ON public.workout_sessions(athlete_id, started_at DESC);

-- Accelerates sync-pull query fetching recent sessions
CREATE INDEX IF NOT EXISTS idx_workout_sessions_athlete_updated
  ON public.workout_sessions(athlete_id, updated_at DESC);

-- Accelerates sync-pull query fetching sets details per session
CREATE INDEX IF NOT EXISTS idx_session_sets_session_updated
  ON public.session_sets(session_id, updated_at DESC);

-- 2. Nutrition Log Indexes
-- Accelerates calculateDailyNutrition and dashboard calorie sum queries
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_logged_at
  ON public.meal_logs(user_id, logged_at DESC);

-- Accelerates sync-pull query fetching recent meal logs
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_updated
  ON public.meal_logs(user_id, updated_at DESC);

-- 3. Measurement Indexes
-- Accelerates client detail weight history query (type + logged_at)
CREATE INDEX IF NOT EXISTS idx_measurements_user_type_logged
  ON public.measurements(user_id, type, logged_at ASC);

-- Accelerates sync-pull query fetching recent measurements
CREATE INDEX IF NOT EXISTS idx_measurements_user_updated
  ON public.measurements(user_id, updated_at DESC);

-- 4. Messaging & Notifications Indexes
-- Accelerates chat messages chronological query
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON public.messages(conversation_id, created_at ASC);

-- Accelerates notification tray fetches
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

-- 5. RLS Joint Optimization Index
-- Accelerates athlete-coach association checks in RLS policies across shared tables
CREATE INDEX IF NOT EXISTS idx_coach_clients_athlete_id
  ON public.coach_clients(athlete_id);

-- 6. Progression Recommendations Index
-- Accelerates dashboard recommendations list ordered by date
CREATE INDEX IF NOT EXISTS idx_progression_recs_user_created
  ON public.progression_recommendations(user_id, created_at DESC);

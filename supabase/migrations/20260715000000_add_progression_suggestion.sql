-- Migration: Add progression_suggestion and updated_at columns to public.workout_sessions
ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS progression_suggestion TEXT;
ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS total_volume_kg NUMERIC;
ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE public.session_sets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.meal_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;

-- Drop policies if they already exist
DROP POLICY IF EXISTS "Users can view their own measurements" ON public.measurements;
DROP POLICY IF EXISTS "Users can insert their own measurements" ON public.measurements;
DROP POLICY IF EXISTS "Users can update their own measurements" ON public.measurements;
DROP POLICY IF EXISTS "Users can delete their own measurements" ON public.measurements;
DROP POLICY IF EXISTS "Coaches can view their clients' measurements" ON public.measurements;

-- Create policies
CREATE POLICY "Users can view their own measurements"
  ON public.measurements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own measurements"
  ON public.measurements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own measurements"
  ON public.measurements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own measurements"
  ON public.measurements FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Coaches can view their clients' measurements"
  ON public.measurements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_clients cc
      WHERE cc.coach_id = auth.uid() AND cc.athlete_id = public.measurements.user_id
    )
  );

-- Create timestamp trigger function
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS trigger_workout_sessions_updated_at ON public.workout_sessions;
CREATE TRIGGER trigger_workout_sessions_updated_at
BEFORE UPDATE ON public.workout_sessions
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trigger_session_sets_updated_at ON public.session_sets;
CREATE TRIGGER trigger_session_sets_updated_at
BEFORE UPDATE ON public.session_sets
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trigger_meal_logs_updated_at ON public.meal_logs;
CREATE TRIGGER trigger_meal_logs_updated_at
BEFORE UPDATE ON public.meal_logs
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trigger_measurements_updated_at ON public.measurements;
CREATE TRIGGER trigger_measurements_updated_at
BEFORE UPDATE ON public.measurements
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();



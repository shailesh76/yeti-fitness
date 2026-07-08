-- 20260702_shared_backend_integration.sql

-- 1. Extend profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('athlete', 'coach')) DEFAULT 'athlete';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wearable_connected BOOLEAN DEFAULT false;

-- 2. Coach Clients
CREATE TABLE IF NOT EXISTS public.coach_clients (
  coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  athlete_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (coach_id, athlete_id)
);

ALTER TABLE public.coach_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches can manage their clients" ON public.coach_clients FOR ALL USING (auth.uid() = coach_id);
CREATE POLICY "Athletes can view their coaches" ON public.coach_clients FOR SELECT USING (auth.uid() = athlete_id);

-- 3. Plan Days
CREATE TABLE IF NOT EXISTS public.plan_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.plan_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches manage plan days" ON public.plan_days FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workout_plans wp WHERE wp.id = plan_id AND wp.coach_id = auth.uid())
);
CREATE POLICY "Athletes view assigned plan days" ON public.plan_days FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.workout_plans wp WHERE wp.id = plan_id AND wp.user_id = auth.uid())
);

-- 4. Plan Exercises
CREATE TABLE IF NOT EXISTS public.plan_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_day_id UUID REFERENCES public.plan_days(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE,
  sets TEXT DEFAULT '3',
  reps TEXT DEFAULT '10',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.plan_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches manage plan exercises" ON public.plan_exercises FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.plan_days pd 
    JOIN public.workout_plans wp ON wp.id = pd.plan_id
    WHERE pd.id = plan_day_id AND wp.coach_id = auth.uid()
  )
);
CREATE POLICY "Athletes view assigned plan exercises" ON public.plan_exercises FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.plan_days pd 
    JOIN public.workout_plans wp ON wp.id = pd.plan_id
    WHERE pd.id = plan_day_id AND wp.user_id = auth.uid()
  )
);

-- 5. Assigned Plans (if plan_id separates from direct user_id assignment in the future, we create it)
CREATE TABLE IF NOT EXISTS public.assigned_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  athlete_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  start_date DATE
);

ALTER TABLE public.assigned_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches manage assigned plans" ON public.assigned_plans FOR ALL USING (
  EXISTS (SELECT 1 FROM public.coach_clients cc WHERE cc.coach_id = auth.uid() AND cc.athlete_id = assigned_plans.athlete_id)
);
CREATE POLICY "Athletes view assigned plans" ON public.assigned_plans FOR SELECT USING (auth.uid() = athlete_id);


-- 6. Workout Sessions
CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_day_id UUID REFERENCES public.plan_days(id) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER
);

ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Athletes manage their sessions" ON public.workout_sessions FOR ALL USING (auth.uid() = athlete_id);
CREATE POLICY "Coaches view client sessions" ON public.workout_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.coach_clients cc WHERE cc.coach_id = auth.uid() AND cc.athlete_id = workout_sessions.athlete_id)
);

-- 7. Session Sets
CREATE TABLE IF NOT EXISTS public.session_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  plan_exercise_id UUID REFERENCES public.plan_exercises(id) ON DELETE SET NULL,
  weight NUMERIC,
  reps INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.session_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Athletes manage their session sets" ON public.session_sets FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.id = session_id AND ws.athlete_id = auth.uid())
);
CREATE POLICY "Coaches view client session sets" ON public.session_sets FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.workout_sessions ws 
    JOIN public.coach_clients cc ON cc.athlete_id = ws.athlete_id
    WHERE ws.id = session_id AND cc.coach_id = auth.uid()
  )
);

-- 8. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  deep_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);
-- Allow coaches to insert notifications for their athletes
CREATE POLICY "Coaches can send notifications to clients" ON public.notifications FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.coach_clients cc WHERE cc.coach_id = auth.uid() AND cc.athlete_id = notifications.user_id)
);

-- 9. Adherence Calculation RPC
CREATE OR REPLACE FUNCTION calculate_adherence(athlete_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  completed_count INTEGER;
  assigned_count INTEGER;
BEGIN
  -- Count sessions completed in last 7 days
  SELECT COUNT(*)
  INTO completed_count
  FROM public.workout_sessions
  WHERE athlete_id = athlete_id_param
    AND completed_at IS NOT NULL
    AND completed_at > NOW() - INTERVAL '7 days';

  -- This assumes the athlete should be doing, for instance, 4 sessions a week.
  -- In a fully dynamic setup, we'd query assigned_plans + plan_days to find exact dates.
  -- For now, default baseline to 4 sessions / week. If completed > 4, max 100%.
  assigned_count := 4;
  
  IF assigned_count = 0 THEN
    RETURN 0;
  END IF;

  RETURN LEAST(ROUND((completed_count::NUMERIC / assigned_count::NUMERIC) * 100), 100);
END;
$$ LANGUAGE plpgsql;

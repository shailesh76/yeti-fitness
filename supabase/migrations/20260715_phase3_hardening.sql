-- Phase 3 Hardening: Analytics, Centralized Logging & Indexes

-- 1. Create activity_logs for product event analytics
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  event_name TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS for activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own activity logs" ON public.activity_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users insert own activity logs" ON public.activity_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 2. Create error_logs for production visibility
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  context TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS for error_logs
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Allow inserts from authenticated users, read only allowed for coaches/admins
CREATE POLICY "Allow authenticated inserts to error logs" ON public.error_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR user_id IS NULL);

CREATE POLICY "Coaches and Admins view all error logs" ON public.error_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

-- 3. High Performance Indexes on Key Tables
CREATE INDEX IF NOT EXISTS idx_workout_sessions_athlete_id ON public.workout_sessions(athlete_id);
CREATE INDEX IF NOT EXISTS idx_session_sets_session_id ON public.session_sets(session_id);
CREATE INDEX IF NOT EXISTS idx_measurements_user_type ON public.measurements(user_id, type);
CREATE INDEX IF NOT EXISTS idx_user_entitlements_user_id ON public.user_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_event ON public.activity_logs(user_id, event_name);

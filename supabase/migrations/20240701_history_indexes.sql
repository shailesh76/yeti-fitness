-- Migration: Performance Indexes for Workout Logs and Exercise Sets History Analysis
-- Date: 2024-07-01

-- Index for exercise history queries: filter by exercise_id and join with workout_log_id
CREATE INDEX IF NOT EXISTS idx_exercise_sets_exercise_log 
ON public.exercise_sets(exercise_id, workout_log_id);

-- Index for last workout queries: fetch most recent logs for a specific user
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_completed 
ON public.workout_logs(user_id, completed_at DESC);

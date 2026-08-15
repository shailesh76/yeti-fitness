-- Add logged_exercises JSONB column to workout_logs
alter table public.workout_logs 
add column if not exists logged_exercises jsonb default '[]'::jsonb;

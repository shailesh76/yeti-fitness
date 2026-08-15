-- Phase 2.3 AI Memory & Intelligence Constraints and Setup

-- 1. Alter ai_memory to add unique constraint on athlete_id + memory_key for UPSERT safety
ALTER TABLE public.ai_memory DROP CONSTRAINT IF EXISTS unique_athlete_memory_key;
ALTER TABLE public.ai_memory ADD CONSTRAINT unique_athlete_memory_key UNIQUE (athlete_id, memory_key);

-- 2. Alter ai_safety_logs to add category column if missing
ALTER TABLE public.ai_safety_logs ADD COLUMN IF NOT EXISTS category TEXT;

-- 3. Add indexes for faster query performance
CREATE INDEX IF NOT EXISTS idx_ai_memory_athlete_id ON public.ai_memory(athlete_id);
CREATE INDEX IF NOT EXISTS idx_ai_safety_logs_user_id ON public.ai_safety_logs(user_id);

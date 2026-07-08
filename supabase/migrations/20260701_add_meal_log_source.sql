-- Migration to add source and raw_response to meal_logs table
ALTER TABLE public.meal_logs ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE public.meal_logs ADD COLUMN IF NOT EXISTS raw_response JSONB;

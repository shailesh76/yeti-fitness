-- Add weight column to plan_exercises and bundle_exercises tables
ALTER TABLE public.plan_exercises ADD COLUMN IF NOT EXISTS weight TEXT;
ALTER TABLE public.bundle_exercises ADD COLUMN IF NOT EXISTS weight TEXT;

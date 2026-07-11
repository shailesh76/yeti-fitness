-- Migration: Add exercise_id column to session_sets table to support quick workouts and manually added exercises
ALTER TABLE public.session_sets ADD COLUMN IF NOT EXISTS exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL;

-- Normalise stray muscle-group values to canonical labels used by the exercise library filters
UPDATE public.exercises SET muscle_group = 'Arms'  WHERE muscle_group IN ('Biceps', 'Triceps');
UPDATE public.exercises SET muscle_group = 'Legs'  WHERE muscle_group IN ('Quads', 'Hamstrings/Glutes');

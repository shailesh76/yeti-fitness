-- Migration to update original basic exercises with instructions and GIF URLs
-- This ensures that any existing workout plans immediately get their form demonstration GIFs and instructions.

-- 1. Bench Press
update public.exercises 
set instructions = 'Lie flat on a bench, grip the barbell slightly wider than shoulder-width, lower the bar to your chest, and push it back up.',
    gif_url = 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/pectorals/barbell-bench-press.gif',
    muscle_group = 'Chest'
where name = 'Bench Press';

-- 2. Squat
update public.exercises 
set instructions = 'Place the barbell on your upper back, stand with feet shoulder-width apart, lower your hips by bending your knees until thighs are parallel to floor, and stand back up.',
    gif_url = 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/glutes/barbell-full-squat.gif',
    muscle_group = 'Quads'
where name = 'Squat';

-- 3. Deadlift
update public.exercises 
set instructions = 'Stand with feet mid-foot under the bar, bend over and grab the bar with a shoulder-width grip, bend your knees until your shins touch the bar, lift the chest, and stand up with the weight.',
    gif_url = 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/glutes/barbell-deadlift.gif',
    muscle_group = 'Back'
where name = 'Deadlift';

-- 4. Overhead Press
update public.exercises 
set instructions = 'Stand with feet shoulder-width apart, grip the barbell at shoulder height, press the bar directly overhead until arms are locked out, and lower it back to shoulders.',
    gif_url = 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/delts/barbell-seated-overhead-press.gif',
    muscle_group = 'Shoulders'
where name = 'Overhead Press';

-- 5. Pull-up
update public.exercises 
set instructions = 'Hang from a pull-up bar with palms facing away, pull your body up until your chin clears the bar, and lower yourself back down with control.',
    gif_url = 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/lats/pull-up.gif',
    muscle_group = 'Back'
where name = 'Pull-up';

-- 6. Bicep Curl
update public.exercises 
set instructions = 'Stand holding dumbbells at your sides, keep elbows close to your torso, curl the weights up while contracting biceps, and slowly lower them back down.',
    gif_url = 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/biceps/barbell-curl.gif',
    muscle_group = 'Biceps'
where name = 'Bicep Curl';

-- 7. Tricep Pushdown
update public.exercises 
set instructions = 'Attach a rope to a cable pulley, grip the rope, keep elbows tucked in at your sides, push the rope down until arms are fully extended, and return to starting position.',
    gif_url = 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/triceps/cable-pushdown.gif',
    muscle_group = 'Triceps'
where name = 'Tricep Pushdown';

-- 8. Lateral Raise
update public.exercises 
set instructions = 'Stand holding dumbbells, raise your arms out to the sides with a slight bend in your elbows until arms are parallel to the floor, and lower them with control.',
    gif_url = 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/delts/dumbbell-lateral-raise.gif',
    muscle_group = 'Shoulders'
where name = 'Lateral Raise';

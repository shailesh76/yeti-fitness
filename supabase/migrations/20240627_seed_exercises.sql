-- Seed default exercises into public.exercises
insert into public.exercises (name, muscle_group, instructions)
values 
  ('Bench Press', 'Chest', 'Lie flat on a bench, grip the barbell slightly wider than shoulder-width, lower the bar to your chest, and push it back up.'),
  ('Squat', 'Quads', 'Place the barbell on your upper back, stand with feet shoulder-width apart, lower your hips by bending your knees until thighs are parallel to floor, and stand back up.'),
  ('Deadlift', 'Back', 'Stand with feet mid-foot under the bar, bend over and grab the bar with a shoulder-width grip, bend your knees until your shins touch the bar, lift the chest, and stand up with the weight.'),
  ('Overhead Press', 'Shoulders', 'Stand with feet shoulder-width apart, grip the barbell at shoulder height, press the bar directly overhead until arms are locked out, and lower it back to shoulders.'),
  ('Pull-up', 'Lats', 'Hang from a pull-up bar with palms facing away, pull your body up until your chin clears the bar, and lower yourself back down with control.'),
  ('Bicep Curl', 'Biceps', 'Stand holding dumbbells at your sides, keep elbows close to your torso, curl the weights up while contracting biceps, and slowly lower them back down.'),
  ('Tricep Pushdown', 'Triceps', 'Attach a rope to a cable pulley, grip the rope, keep elbows tucked in at your sides, push the rope down until arms are fully extended, and return to starting position.'),
  ('Lateral Raise', 'Shoulders', 'Stand holding dumbbells, raise your arms out to the sides with a slight bend in your elbows until arms are parallel to the floor, and lower them with control.')
on conflict do nothing;

-- Import exercises from GitHub repo

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('3/4 Sit-up', 'Core', '1. Lie flat on your back with your knees bent and feet flat on the ground.
2. Place your hands behind your head with your elbows pointing outwards.
3. Engaging your abs, slowly lift your upper body off the ground, curling forward until your torso is at a 45-degree angle.
4. Pause for a moment at the top, then slowly lower your upper body back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0001.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('45° Side Bend', 'Core', '1. Stand with your feet shoulder-width apart and your arms extended straight down by your sides.
2. Keeping your back straight and your core engaged, slowly bend your torso to one side, lowering your hand towards your knee.
3. Pause for a moment at the bottom, then slowly return to the starting position.
4. Repeat on the other side.
5. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0002.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Air Bike', 'Core', '1. Lie flat on your back with your hands placed behind your head.
2. Lift your legs off the ground and bend your knees at a 90-degree angle.
3. Bring your right elbow towards your left knee while simultaneously straightening your right leg.
4. Return to the starting position and repeat the movement on the opposite side, bringing your left elbow towards your right knee while straightening your left leg.
5. Continue alternating sides in a pedaling motion for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0003.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('All Fours Squad Stretch', 'Legs', '1. Start on all fours with your hands directly under your shoulders and your knees directly under your hips.
2. Extend one leg straight back, keeping your knee bent and your foot flexed.
3. Slowly lower your hips towards the ground, feeling a stretch in your quads.
4. Hold this position for 20-30 seconds.
5. Switch legs and repeat the stretch on the other side.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1512.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Alternate Heel Touchers', 'Core', '1. Lie flat on your back with your knees bent and feet flat on the ground.
2. Extend your arms straight out to the sides, parallel to the ground.
3. Engaging your abs, lift your shoulders off the ground and reach your right hand towards your right heel.
4. Return to the starting position and repeat on the left side, reaching your left hand towards your left heel.
5. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0006.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Alternate Lateral Pulldown', 'Back', '1. Sit on the cable machine with your back straight and feet flat on the ground.
2. Grasp the handles with an overhand grip, slightly wider than shoulder-width apart.
3. Lean back slightly and pull the handles towards your chest, squeezing your shoulder blades together.
4. Pause for a moment at the peak of the movement, then slowly release the handles back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0007.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Ankle Circles', 'Legs', '1. Sit on the ground with your legs extended in front of you.
2. Lift one leg off the ground and rotate your ankle in a circular motion.
3. Perform the desired number of circles in one direction, then switch to the other direction.
4. Repeat with the other leg.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1368.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Archer Pull Up', 'Back', '1. Start by hanging from a pull-up bar with an overhand grip, slightly wider than shoulder-width apart.
2. Engage your core and pull your shoulder blades down and back.
3. As you pull yourself up, bend one arm and bring your elbow towards your side, while keeping the other arm straight.
4. Continue pulling until your chin is above the bar and your bent arm is fully flexed.
5. Lower yourself back down with control, straightening the bent arm and repeating the movement on the other side.
6. Alternate sides with each repetition.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3293.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Archer Push Up', 'Chest', '1. Start in a push-up position with your hands slightly wider than shoulder-width apart.
2. Extend one arm straight out to the side, parallel to the ground.
3. Lower your body by bending your elbows, keeping your back straight and core engaged.
4. Push back up to the starting position.
5. Repeat on the other side, extending the opposite arm out to the side.
6. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3294.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Arm Slingers Hanging Bent Knee Legs', 'Core', '1. Hang from a pull-up bar with your arms fully extended and your knees bent at a 90-degree angle.
2. Engage your core and lift your knees towards your chest, bringing them as close to your elbows as possible.
3. Slowly lower your legs back down to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2355.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Arm Slingers Hanging Straight Legs', 'Core', '1. Hang from a pull-up bar with your arms fully extended and your legs straight down.
2. Engage your core and lift your legs up in front of you until they are parallel to the ground.
3. Hold for a moment at the top, then slowly lower your legs back down to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2333.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Arms Apart Circular Toe Touch (male)', 'Legs', '1. Stand with your feet shoulder-width apart and arms extended to the sides.
2. Keeping your legs straight, bend forward at the waist and reach down towards your toes with your right hand.
3. As you reach down, simultaneously lift your left leg straight up behind you, maintaining balance.
4. Return to the starting position and repeat the movement with your left hand reaching towards your toes and your right leg lifting up behind you.
5. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3214.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Arms Overhead Full Sit-up (male)', 'Core', '1. Lie flat on your back with your knees bent and feet flat on the ground.
2. Extend your arms overhead, keeping them straight.
3. Engaging your abs, slowly lift your upper body off the ground, curling forward until your torso is upright.
4. Pause for a moment at the top, then slowly lower your upper body back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3204.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Assisted Chest Dip (kneeling)', 'Chest', '1. Adjust the machine to your desired height and secure your knees on the pad.
2. Grasp the handles with your palms facing down and your arms fully extended.
3. Lower your body by bending your elbows until your upper arms are parallel to the floor.
4. Pause for a moment, then push yourself back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0009.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Assisted Hanging Knee Raise', 'Core', '1. Hang from a pull-up bar with your arms fully extended and your palms facing away from you.
2. Engage your core muscles and lift your knees towards your chest, bending at the hips and knees.
3. Pause for a moment at the top of the movement, squeezing your abs.
4. Slowly lower your legs back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0011.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Assisted Hanging Knee Raise With Throw Down', 'Core', '1. Hang from a pull-up bar with your arms fully extended and your palms facing away from you.
2. Engage your core and lift your knees towards your chest, keeping your legs together.
3. Once your knees are at chest level, explosively throw your legs down towards the ground, extending them fully.
4. Allow your legs to swing back up and repeat the movement for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0010.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Assisted Lying Calves Stretch', 'Legs', '1. Lie on your back with your legs extended.
2. Bend one knee and place your foot flat on the ground.
3. Using your hands or a towel, gently pull your toes towards your body, feeling a stretch in your calf.
4. Hold the stretch for 20-30 seconds.
5. Release the stretch and repeat on the other leg.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1708.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Assisted Lying Glutes Stretch', 'Legs', '1. Lie on your back with your legs extended.
2. Bend your right knee and place your right ankle on your left thigh, just above the knee.
3. Grasp your left thigh with both hands and gently pull it towards your chest.
4. Hold the stretch for 20-30 seconds.
5. Release and repeat on the other side.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1709.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Assisted Lying Gluteus And Piriformis Stretch', 'Legs', '1. Lie on your back with your legs extended.
2. Bend your right knee and place your right ankle on your left thigh, just above the knee.
3. Grasp your left thigh with both hands and gently pull it towards your chest.
4. Hold the stretch for 20-30 seconds.
5. Release the stretch and repeat on the other side.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1710.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Assisted Lying Leg Raise With Lateral Throw Down', 'Core', '1. Lie flat on your back with your legs extended and your arms by your sides.
2. Place your hands under your glutes for support.
3. Engage your abs and lift your legs off the ground, keeping them straight.
4. While keeping your legs together, lower them to one side until they are a few inches above the ground.
5. Pause for a moment, then lift your legs back to the starting position.
6. Repeat the movement to the other side.
7. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0012.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Assisted Lying Leg Raise With Throw Down', 'Core', '1. Lie flat on your back with your legs extended and your arms by your sides.
2. Place your hands under your glutes for support.
3. Engage your core and lift your legs off the ground, keeping them straight.
4. Raise your legs until they are perpendicular to the ground.
5. Lower your legs back down to the starting position.
6. Simultaneously, throw your legs down towards the ground, keeping them straight.
7. Raise your legs back up to the starting position.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0013.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Assisted Motion Russian Twist', 'Core', '1. Sit on the ground with your knees bent and feet flat on the floor.
2. Hold the medicine ball with both hands in front of your chest.
3. Lean back slightly, engaging your abs and keeping your back straight.
4. Slowly twist your torso to the right, bringing the medicine ball towards the right side of your body.
5. Pause for a moment, then twist your torso to the left, bringing the medicine ball towards the left side of your body.
6. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0014.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Assisted Parallel Close Grip Pull-up', 'Back', '1. Adjust the machine to your desired weight and height.
2. Place your hands on the parallel bars with a close grip, palms facing each other.
3. Hang from the bars with your arms fully extended and your feet off the ground.
4. Engage your back muscles and pull your body up towards the bars, keeping your elbows close to your body.
5. Continue pulling until your chin is above the bars.
6. Pause for a moment at the top, then slowly lower your body back down to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0015.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Assisted Prone Hamstring', 'Legs', '1. Lie face down on a mat or bench with your legs fully extended.
2. Have a partner or use a resistance band to secure your ankles.
3. Engage your hamstrings and lift your legs towards your glutes, keeping your knees straight.
4. Pause for a moment at the top, then slowly lower your legs back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0016.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Assisted Prone Lying Quads Stretch', 'Legs', '1. Lie face down on the ground with your legs extended.
2. Bend your left knee and reach back with your left hand to grab your left foot or ankle.
3. Gently pull your left foot towards your glutes, feeling a stretch in your left quad.
4. Hold the stretch for 20-30 seconds, then release.
5. Repeat with your right leg.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1713.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Assisted Prone Rectus Femoris Stretch', 'Core', '1. Lie face down on the ground with your legs straight.
2. Bend your right knee and reach back with your right hand to grab your right foot or ankle.
3. Gently pull your right foot or ankle towards your glutes, feeling a stretch in the front of your right thigh.
4. Hold the stretch for 20-30 seconds.
5. Release and repeat on the other side.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1714.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Assisted Pull-up', 'Back', '1. Adjust the machine to your desired weight and height settings.
2. Grasp the handles with an overhand grip, slightly wider than shoulder-width apart.
3. Hang with your arms fully extended and your feet off the ground.
4. Engage your back muscles and pull your body up towards the handles, keeping your elbows close to your body.
5. Continue pulling until your chin is above the handles.
6. Pause for a moment at the top, then slowly lower your body back down to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0017.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Assisted Seated Pectoralis Major Stretch With Stability Ball', 'Chest', '1. Sit on a stability ball with your feet flat on the ground and your back straight.
2. Hold a stability ball with both hands and extend your arms straight out in front of you.
3. Slowly lower the stability ball towards your chest, feeling a stretch in your pectoral muscles.
4. Hold the stretch for a few seconds, then slowly return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1716.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Assisted Side Lying Adductor Stretch', 'Legs', '1. Lie on your side with your legs straight and stacked on top of each other.
2. Bend your bottom leg slightly for stability.
3. Place your top foot on a stable surface, such as a bench or step.
4. Keeping your top leg straight, slowly lower it towards the ground, feeling a stretch in your inner thigh.
5. Hold the stretch for 20-30 seconds.
6. Return to the starting position and repeat on the other side.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1712.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Assisted Sit-up', 'Core', '1. Sit on the edge of a bench or have someone hold your feet down.
2. Lie flat on your back with your knees bent and feet flat on the ground.
3. Place your hands behind your head with your elbows pointing outwards.
4. Engaging your abs, slowly lift your upper body off the ground, curling forward until your torso is at a 45-degree angle.
5. Pause for a moment at the top, then slowly lower your upper body back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1758.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Assisted Standing Chin-up', 'Back', '1. Adjust the machine to your desired assistance level.
2. Stand on the foot platform and grip the handles with an overhand grip, slightly wider than shoulder-width apart.
3. Keep your chest up and shoulders back, engage your core, and slightly bend your knees.
4. Pull your body up by flexing your elbows and driving your elbows down towards your sides.
5. Continue pulling until your chin is above the bar.
6. Pause for a moment at the top, then slowly lower your body back down to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1431.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Assisted Standing Pull-up', 'Back', '1. Adjust the machine to your desired weight and height settings.
2. Stand facing the machine with your feet shoulder-width apart.
3. Grasp the handles with an overhand grip, slightly wider than shoulder-width apart.
4. Engage your lats and biceps, and pull yourself up towards the handles.
5. Pause for a moment at the top, squeezing your back muscles.
6. Slowly lower yourself back down to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1432.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Assisted Standing Triceps Extension (with Towel)', 'Arms', '1. Stand with your feet shoulder-width apart and hold a towel with both hands behind your head.
2. Keep your elbows close to your ears and your upper arms stationary.
3. Slowly extend your forearms upward, squeezing your triceps at the top.
4. Pause for a moment, then slowly lower the towel back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0018.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Assisted Triceps Dip (kneeling)', 'Arms', '1. Adjust the machine to your desired weight and height.
2. Kneel down on the pad facing the machine, with your hands gripping the handles.
3. Lower your body by bending your elbows, keeping your back straight and close to the machine.
4. Pause for a moment at the bottom, then push yourself back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0019.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Assisted Wide-grip Chest Dip (kneeling)', 'Chest', '1. Adjust the machine to your desired height and secure your knees on the pad.
2. Grasp the handles with a wide grip and keep your elbows slightly bent.
3. Lower your body by bending your elbows until your upper arms are parallel to the floor.
4. Push yourself back up to the starting position by extending your arms.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2364.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Astride Jumps (male)', 'Cardio', '1. Stand with your feet shoulder-width apart.
2. Bend your knees and lower your body into a squat position.
3. Jump explosively upwards, extending your legs and arms.
4. While in the air, spread your legs apart and bring your arms out to the sides.
5. Land softly with your feet shoulder-width apart, bending your knees to absorb the impact.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3220.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Back And Forth Step', 'Cardio', '1. Stand with your feet shoulder-width apart.
2. Step forward with your right foot, bending your knee and lowering your body into a lunge position.
3. Push off with your right foot and step back to the starting position.
4. Repeat the movement with your left foot, alternating legs with each step.
5. Continue stepping back and forth, maintaining a steady pace.
6. Repeat for the desired duration or number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3672.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Back Extension On Exercise Ball', 'Back', '1. Place the stability ball on the ground and lie face down on top of it, with your hips resting on the ball and your feet against a wall or other stable surface.
2. Position your hands behind your head or crossed over your chest.
3. Engage your core and slowly lift your upper body off the ball, extending your back until your body forms a straight line from your head to your heels.
4. Pause for a moment at the top, then slowly lower your upper body back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1314.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Back Lever', 'Back', '1. Start by hanging from a pull-up bar with an overhand grip, hands slightly wider than shoulder-width apart.
2. Engage your core and pull your shoulder blades down and back.
3. Bend your knees and tuck them towards your chest.
4. Slowly lift your legs up, keeping them straight, until your body is parallel to the ground.
5. Hold this position for a few seconds, then slowly lower your legs back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3297.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Back Pec Stretch', 'Back', '1. Stand tall with your feet shoulder-width apart.
2. Extend your arms straight out in front of you, parallel to the ground.
3. Cross your arms in front of your body, with your right arm over your left arm.
4. Interlock your fingers and rotate your palms away from your body.
5. Slowly raise your arms up and away from your body, feeling a stretch in your back and chest.
6. Hold the stretch for 15-30 seconds, then release.
7. Repeat on the opposite side.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1405.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Backward Jump', 'Legs', '1. Stand with your feet shoulder-width apart.
2. Bend your knees slightly and jump backwards, pushing off with both feet.
3. Land softly on the balls of your feet, bending your knees to absorb the impact.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1473.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Balance Board', 'Legs', '1. Place the balance board on a flat surface.
2. Step onto the balance board with one foot, ensuring it is centered.
3. Slowly shift your weight onto the foot on the balance board, keeping your core engaged.
4. Maintain your balance and stability as you hold the position for a desired amount of time.
5. Repeat the exercise with the other foot.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0020.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Alternating Biceps Curl', 'Arms', '1. Stand with your feet shoulder-width apart and hold the band with an underhand grip, palms facing up.
2. Keep your elbows close to your sides and slowly curl one arm up towards your shoulder, squeezing your biceps at the top.
3. Lower the arm back down to the starting position and repeat with the other arm.
4. Continue alternating arms for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0968.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Alternating V-up', 'Core', '1. Lie flat on your back with your legs straight and your arms extended overhead, holding the band.
2. Engage your abs and lift your legs and upper body off the ground simultaneously, reaching your hands towards your toes.
3. As you lower your legs and upper body back down, switch the position of your legs, crossing one over the other.
4. Repeat the movement, alternating the position of your legs with each repetition.
5. Continue for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0969.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Assisted Pull-up', 'Back', '1. Attach the band to a pull-up bar or sturdy anchor point.
2. Step onto the band and grip the bar with your palms facing away from you, hands slightly wider than shoulder-width apart.
3. Hang with your arms fully extended, keeping your core engaged and your shoulders down and back.
4. Pull your body up towards the bar by squeezing your shoulder blades together and driving your elbows down towards your hips.
5. Continue pulling until your chin is above the bar, then slowly lower yourself back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0970.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Assisted Wheel Rollerout', 'Core', '1. Kneel on the floor and hold the handles of the band with both hands, palms facing down.
2. Place the band on the ground in front of you and position your hands shoulder-width apart.
3. Engage your core and slowly roll the wheel forward, extending your body as far as you can while maintaining control.
4. Pause for a moment at the furthest point, then slowly roll the wheel back towards your knees to return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0971.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Bench Press', 'Chest', '1. Lie flat on a bench with your feet flat on the ground and your back pressed against the bench.
2. Grasp the band handles with an overhand grip, slightly wider than shoulder-width apart.
3. Extend your arms fully, pushing the bands away from your chest.
4. Slowly lower the bands back down to your chest, keeping your elbows at a 90-degree angle.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1254.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Bent-over Hip Extension', 'Legs', '1. Attach the band to a sturdy anchor point at ankle height.
2. Stand facing away from the anchor point with your feet shoulder-width apart.
3. Step back to create tension in the band, keeping your knees slightly bent.
4. Hinge at the hips and lean forward, maintaining a neutral spine.
5. Extend your right leg straight back, squeezing your glutes at the top.
6. Lower your right leg back down and repeat with the left leg.
7. Continue alternating legs for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0980.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Bicycle Crunch', 'Core', '1. Lie flat on your back with your hands behind your head and your knees bent.
2. Lift your feet off the ground and bring your right knee towards your chest while simultaneously twisting your torso to bring your left elbow towards your right knee.
3. Straighten your right leg while bringing your left knee towards your chest and twisting your torso to bring your right elbow towards your left knee.
4. Continue alternating the twisting motion, as if you are pedaling a bicycle, while keeping your core engaged throughout the movement.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0972.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Close-grip Pulldown', 'Back', '1. Attach the band to a high anchor point, such as a pull-up bar or sturdy beam.
2. Stand facing the anchor point and grab the band with an underhand grip, hands shoulder-width apart.
3. Step back to create tension in the band, keeping your feet hip-width apart.
4. Engage your core and keep your back straight as you pull the band down towards your chest, squeezing your shoulder blades together.
5. Pause for a moment at the bottom of the movement, then slowly release the band back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0974.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Close-grip Push-up', 'Arms', '1. Place a band around your upper arms, just above the elbows.
2. Assume a push-up position with your hands directly under your shoulders and your body in a straight line from head to heels.
3. Bend your elbows and lower your chest towards the ground, keeping your elbows close to your sides.
4. Push through your palms to extend your arms and return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0975.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Concentration Curl', 'Arms', '1. Sit on a bench or chair with your legs spread apart and your feet flat on the ground.
2. Hold one end of the band in your hand and step on the other end with your foot on the same side.
3. Lean forward slightly and rest your elbow on the inside of your thigh, just above the knee.
4. With your palm facing up, slowly curl your hand towards your shoulder, keeping your upper arm stationary.
5. Pause for a moment at the top, then slowly lower your hand back down to the starting position.
6. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0976.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Fixed Back Close Grip Pulldown', 'Back', '1. Attach the band to a fixed point above you, such as a pull-up bar or sturdy beam.
2. Sit down on a bench or chair facing the band, with your feet flat on the ground and your knees bent.
3. Grasp the band with a close grip, palms facing towards you.
4. Keep your back straight and engage your core.
5. Pull the band down towards your chest, squeezing your shoulder blades together.
6. Pause for a moment at the bottom of the movement, feeling the contraction in your lats.
7. Slowly release the band back to the starting position, maintaining control throughout the movement.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3117.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Fixed Back Underhand Pulldown', 'Back', '1. Attach the band to a sturdy anchor point above your head.
2. Stand facing the anchor point with your feet shoulder-width apart.
3. Grasp the band with an underhand grip, hands slightly wider than shoulder-width apart.
4. Step back to create tension in the band, keeping your arms fully extended.
5. Engage your core and squeeze your shoulder blades together.
6. Pull the band down towards your chest, leading with your elbows.
7. Pause for a moment at the bottom of the movement, feeling the contraction in your lats.
8. Slowly release the tension in the band and return to the starting position.
9. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3116.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Front Lateral Raise', 'Shoulders', '1. Stand with your feet shoulder-width apart and hold the band in front of your thighs with your palms facing down.
2. Keep your arms straight and lift the band up in front of you until your arms are parallel to the ground.
3. Pause for a moment at the top, then slowly lower the band back down to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0977.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Front Raise', 'Shoulders', '1. Stand with your feet shoulder-width apart and hold the band in front of your thighs with your palms facing down.
2. Keep your arms straight and slowly raise them forward until they are parallel to the ground.
3. Pause for a moment at the top, then slowly lower your arms back down to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0978.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Hip Lift', 'Legs', '1. Lie on your back with your knees bent and feet flat on the ground.
2. Place a resistance band just above your knees.
3. Engage your glutes and core muscles.
4. Press your heels into the ground and lift your hips off the floor, squeezing your glutes at the top.
5. Pause for a moment at the top, then slowly lower your hips back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1408.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Horizontal Pallof Press', 'Core', '1. Attach the band to a sturdy anchor point at waist height.
2. Stand perpendicular to the anchor point with your feet shoulder-width apart.
3. Grasp the band handle with both hands and step away from the anchor point to create tension in the band.
4. Bring your hands to your chest, keeping your elbows bent and close to your body.
5. Engage your core and maintain a stable stance.
6. Extend your arms straight out in front of you, pushing the band away from your body.
7. Hold the extended position for a few seconds, focusing on maintaining tension in your core.
8. Slowly bring your hands back to your chest, resisting the pull of the band.
9. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0979.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Jack Knife Sit-up', 'Core', '1. Lie flat on your back with your legs straight and your arms extended overhead, holding the band.
2. Engage your abs and lift your legs and upper body simultaneously, bringing your hands towards your feet.
3. Pause for a moment at the top, then slowly lower your legs and upper body back down to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0981.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Kneeling One Arm Pulldown', 'Back', '1. Attach the band to a sturdy anchor point above your head.
2. Kneel down and hold the band with one hand, palm facing down.
3. Extend your arm fully overhead, keeping your elbow slightly bent.
4. Engage your lat muscles and pull the band down towards your side, bringing your elbow towards your ribcage.
5. Pause for a moment at the bottom, then slowly release the tension and return to the starting position.
6. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0983.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Kneeling Twisting Crunch', 'Core', '1. Attach the band to a sturdy anchor point at waist height.
2. Kneel down facing away from the anchor point and hold the band with both hands, keeping your elbows bent and close to your sides.
3. Engage your abs and slowly twist your torso to one side, bringing your hands towards your opposite hip.
4. Pause for a moment, then slowly return to the starting position.
5. Repeat on the other side.
6. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0985.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Lying Hip Internal Rotation', 'Legs', '1. Lie on your back with your legs straight and a resistance band looped around your feet.
2. Bend your knees and bring them towards your chest, keeping your feet together.
3. Slowly rotate your knees outwards, away from each other, while keeping your feet together.
4. Pause for a moment at the end of the rotation, then slowly return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0984.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Lying Straight Leg Raise', 'Core', '1. Lie flat on your back with your legs straight and your feet together.
2. Place the band around the arches of your feet and hold the ends of the band with your hands.
3. Engaging your abs, lift both legs off the ground until they are perpendicular to the floor.
4. Pause for a moment at the top, then slowly lower your legs back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1002.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band One Arm Overhead Biceps Curl', 'Arms', '1. Stand with your feet shoulder-width apart and place one end of the band under your foot.
2. Hold the other end of the band with your arm fully extended overhead, palm facing forward.
3. Keeping your upper arm stationary, curl your forearm towards your shoulder, squeezing your biceps.
4. Pause for a moment at the top, then slowly lower your forearm back to the starting position.
5. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0986.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band One Arm Single Leg Split Squat', 'Legs', '1. Stand with your feet hip-width apart and place a resistance band around your ankles.
2. Extend one leg forward and rest the top of your foot on a bench or step behind you.
3. Hold onto a support with one hand for balance.
4. Bend your standing leg and lower your body down into a squat position, keeping your knee in line with your toes.
5. Push through your heel to return to the starting position.
6. Repeat for the desired number of repetitions, then switch legs.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0987.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band One Arm Standing Low Row', 'Back', '1. Attach the band to a stable anchor point at waist height.
2. Stand facing the anchor point with your feet shoulder-width apart.
3. Hold the band with one hand, palm facing inward, and step back to create tension in the band.
4. Bend your knees slightly and hinge forward at the hips, keeping your back straight.
5. Pull the band towards your waist, squeezing your shoulder blades together.
6. Pause for a moment at the top of the movement, then slowly release the band back to the starting position.
7. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0988.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band One Arm Twisting Chest Press', 'Chest', '1. Attach the band to a sturdy anchor point at chest height.
2. Stand with your side facing the anchor point and grab the band with one hand.
3. Step away from the anchor point to create tension in the band.
4. Position your feet shoulder-width apart and slightly bend your knees.
5. Bring your hand holding the band across your body, towards the opposite shoulder.
6. While maintaining tension in the band, push your hand forward and away from your body, extending your arm.
7. Slowly return to the starting position and repeat for the desired number of repetitions.
8. Switch sides and repeat the exercise with the other hand.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0989.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band One Arm Twisting Seated Row', 'Back', '1. Sit on a bench or chair with your feet flat on the ground and your back straight.
2. Hold the band with one hand and extend your arm fully in front of you.
3. Keeping your back straight, pull the band towards your body by bending your elbow and squeezing your shoulder blades together.
4. At the same time, twist your torso towards the side of the pulling arm.
5. Pause for a moment at the top, then slowly release the tension in the band and return to the starting position.
6. Repeat for the desired number of repetitions, then switch to the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0990.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Pull Through', 'Legs', '1. Attach a resistance band to a sturdy anchor point at ground level.
2. Stand facing away from the anchor point with your feet shoulder-width apart.
3. Step forward to create tension in the band, keeping your knees slightly bent.
4. Hinge at the hips and push your glutes back, maintaining a slight bend in your knees.
5. Lower your torso until it is parallel to the ground, feeling a stretch in your hamstrings.
6. Drive your hips forward and squeeze your glutes to return to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0991.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Push Sit-up', 'Core', '1. Attach the band securely to a stable anchor point.
2. Lie flat on your back with your knees bent and feet flat on the ground.
3. Hold the band with both hands and extend your arms straight up towards the ceiling.
4. Engaging your abs, slowly lift your upper body off the ground, curling forward until your torso is at a 45-degree angle.
5. Pause for a moment at the top, then slowly lower your upper body back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0992.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Reverse Fly', 'Shoulders', '1. Attach the band to a stationary object at chest height.
2. Stand with your feet shoulder-width apart and hold the band with both hands in front of you.
3. Keep your arms straight and lift them out to the sides until they are parallel to the ground.
4. Squeeze your shoulder blades together at the top of the movement.
5. Slowly lower your arms back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0993.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Reverse Wrist Curl', 'Arms', '1. Sit on a bench or chair with your feet flat on the ground.
2. Hold the band with an overhand grip, palms facing down, and wrap it around your fingers.
3. Rest your forearms on your thighs, with your wrists hanging off the edge.
4. Slowly curl your wrists upward, squeezing your forearms.
5. Pause for a moment at the top, then slowly lower your wrists back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0994.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Seated Hip Internal Rotation', 'Legs', '1. Sit on a chair or bench with your back straight and feet flat on the ground.
2. Place a resistance band around your thighs, just above your knees.
3. Keep your knees bent at a 90-degree angle and your feet shoulder-width apart.
4. Engage your glutes and slowly rotate your knees outward, pushing against the resistance of the band.
5. Pause for a moment at the end of the movement, then slowly return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0996.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Seated Twist', 'Core', '1. Sit on the ground with your legs extended in front of you and your back straight.
2. Wrap the band around your waist and hold the ends with both hands.
3. Engage your abs and slowly twist your torso to one side, keeping your back straight and your feet on the ground.
4. Pause for a moment at the end of the twist, then slowly return to the starting position.
5. Repeat the twist to the other side.
6. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1011.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Shoulder Press', 'Shoulders', '1. Stand with your feet shoulder-width apart and place the band under your feet.
2. Hold the band with your palms facing forward and raise your hands to shoulder height, elbows bent.
3. Press the band overhead, fully extending your arms.
4. Pause for a moment at the top, then slowly lower the band back to shoulder height.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0997.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Shrug', 'Back', '1. Stand with your feet shoulder-width apart and place the band under your feet, holding the ends with your hands.
2. Keep your arms straight and relaxed, and let the band hang in front of your thighs.
3. Engage your traps by shrugging your shoulders upward, lifting the band as high as possible.
4. Hold the contraction for a moment, then slowly lower your shoulders back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1018.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Side Triceps Extension', 'Arms', '1. Stand with your feet shoulder-width apart and hold the band with both hands, palms facing down.
2. Extend your arms straight out to the sides, keeping them parallel to the ground.
3. Slowly bend your elbows and bring your hands towards your shoulders, keeping your upper arms still.
4. Pause for a moment, then slowly extend your arms back out to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0998.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Single Leg Calf Raise', 'Legs', '1. Stand with your feet hip-width apart and place the band around the ball of your left foot.
2. Hold onto a stable object for balance if needed.
3. Slowly raise your left heel off the ground, lifting your body weight onto the ball of your foot.
4. Pause for a moment at the top, then slowly lower your left heel back down to the starting position.
5. Repeat for the desired number of repetitions, then switch to the right leg.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0999.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Single Leg Reverse Calf Raise', 'Legs', '1. Stand with your feet hip-width apart and place the band around the ball of your foot.
2. Hold onto a stable object for balance.
3. Slowly raise your heel off the ground, lifting your body weight onto the ball of your foot.
4. Pause for a moment at the top, then slowly lower your heel back down to the starting position.
5. Repeat for the desired number of repetitions, then switch to the other leg.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1000.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Single Leg Split Squat', 'Legs', '1. Stand with your feet hip-width apart and place a resistance band around your ankles.
2. Take a big step forward with your right foot and a smaller step back with your left foot.
3. Bend your knees and lower your body until your right thigh is parallel to the ground, keeping your left knee slightly above the ground.
4. Push through your right heel to return to the starting position.
5. Repeat on the other side.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1001.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Squat', 'Legs', '1. Stand with your feet shoulder-width apart, with the band placed just above your knees.
2. Keeping your chest up and core engaged, push your hips back and bend your knees to lower into a squat position.
3. Make sure your knees are tracking over your toes and your weight is in your heels.
4. Pause for a moment at the bottom, then push through your heels to return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1004.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Squat Row', 'Legs', '1. Attach the band to a sturdy anchor point at waist height.
2. Stand facing the anchor point with your feet shoulder-width apart.
3. Hold the band handles with your palms facing each other and your arms extended in front of you.
4. Bend your knees and lower into a squat position, keeping your back straight and chest lifted.
5. From the squat position, pull the band handles towards your body, squeezing your shoulder blades together.
6. Pause for a moment at the top, then slowly release the tension and return to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1003.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Standing Crunch', 'Core', '1. Attach the band to a sturdy anchor point at waist height.
2. Stand facing away from the anchor point with your feet shoulder-width apart.
3. Hold the band with both hands and bring it up to your chest, keeping your elbows bent and close to your body.
4. Engage your abs and slowly crunch forward, bringing your chest towards your knees.
5. Pause for a moment at the top of the crunch, then slowly return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1005.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Standing Rear Delt Row', 'Shoulders', '1. Stand with your feet shoulder-width apart and place the band under your feet.
2. Hold the band handles with your palms facing each other and your arms extended in front of you.
3. Bend your knees slightly and hinge forward at the hips, keeping your back straight.
4. Pull the band towards your chest, squeezing your shoulder blades together.
5. Pause for a moment at the top, then slowly release the tension and return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1022.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Standing Twisting Crunch', 'Core', '1. Stand with your feet shoulder-width apart and place the band around your upper back, crossing it in front of your chest.
2. Hold the ends of the band with your hands, keeping your elbows bent and close to your sides.
3. Engage your abs and twist your torso to one side, bringing your elbow towards the opposite knee.
4. Pause for a moment, then return to the starting position.
5. Repeat on the other side.
6. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1007.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Step-up', 'Legs', '1. Place a band around your thighs, just above your knees.
2. Stand facing a step or platform with your feet hip-width apart.
3. Step up onto the platform with your right foot, pushing through your heel.
4. Extend your left leg behind you, keeping it straight.
5. Lower your left foot back down to the ground.
6. Repeat with your left foot stepping up onto the platform.
7. Continue alternating legs for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1008.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Stiff Leg Deadlift', 'Legs', '1. Stand with your feet shoulder-width apart and place the band around your ankles.
2. Hold the band with both hands in front of your thighs, palms facing your body.
3. Keeping your back straight and your core engaged, hinge at the hips and slowly lower your upper body towards the ground.
4. As you lower, push your hips back and allow your knees to bend slightly.
5. Lower the band towards the ground, feeling a stretch in your hamstrings.
6. Pause for a moment at the bottom, then engage your glutes and hamstrings to lift your upper body back up to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1009.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Straight Back Stiff Leg Deadlift', 'Legs', '1. Stand with your feet shoulder-width apart and place the band around your upper legs.
2. Hold the band with both hands in front of your thighs, palms facing your body.
3. Keeping your back straight and your knees slightly bent, hinge at the hips and lower the band towards the ground.
4. Feel the stretch in your hamstrings as you lower the band.
5. Engage your glutes and hamstrings to lift your body back up to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1023.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Straight Leg Deadlift', 'Back', '1. Stand with your feet shoulder-width apart and place the band around your feet.
2. Hold the band with both hands, palms facing your body, and keep your arms straight.
3. Engage your core and maintain a slight bend in your knees.
4. Slowly hinge forward at your hips, keeping your back straight and chest lifted.
5. Lower the band towards the ground while keeping your legs straight.
6. Pause for a moment at the bottom, then squeeze your glutes and hamstrings to return to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1010.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Twisting Overhead Press', 'Shoulders', '1. Stand with your feet shoulder-width apart and place the band under your feet.
2. Hold the band handles at shoulder height with your palms facing forward.
3. Engage your core and press the band overhead, fully extending your arms.
4. As you press, twist your torso to one side, keeping your hips stable.
5. Pause for a moment at the top, then return to the starting position.
6. Repeat the press and twist on the opposite side.
7. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1012.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Two Legs Calf Raise - (band Under Both Legs) V. 2', 'Legs', '1. Stand with your feet shoulder-width apart and place a resistance band under both feet.
2. Hold the ends of the band with your hands for stability.
3. Raise your heels off the ground as high as possible, using your calves.
4. Pause for a moment at the top, then slowly lower your heels back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1369.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Underhand Pulldown', 'Back', '1. Attach the band to a high anchor point, such as a pull-up bar or sturdy beam.
2. Stand facing the anchor point with your feet shoulder-width apart.
3. Grasp the band with an underhand grip, hands slightly wider than shoulder-width apart.
4. Extend your arms fully overhead, keeping your elbows slightly bent.
5. Engage your lats and pull the band down towards your chest, squeezing your shoulder blades together.
6. Pause for a moment at the bottom of the movement, then slowly release the tension and return to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1013.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band V-up', 'Core', '1. Lie flat on your back with your legs straight and your arms extended overhead, holding the band.
2. Engaging your abs, lift your legs and upper body off the ground simultaneously, reaching your hands towards your toes.
3. Pause for a moment at the top, then slowly lower your legs and upper body back down to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1014.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Vertical Pallof Press', 'Core', '1. Stand with your feet shoulder-width apart and wrap the band around a sturdy object at chest height.
2. Hold the band with both hands and step away from the anchor point, creating tension in the band.
3. Position yourself perpendicular to the anchor point, with your side facing the band.
4. Extend your arms straight out in front of you, keeping your hands at chest height.
5. Engage your core and press the band away from your chest, fully extending your arms.
6. Hold the position for a few seconds, then slowly bring the band back towards your chest.
7. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1015.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Wrist Curl', 'Arms', '1. Sit on a bench or chair with your feet flat on the ground.
2. Hold the band with both hands, palms facing up, and rest your forearms on your thighs.
3. Slowly curl your wrists upward, squeezing your forearms.
4. Pause for a moment at the top, then slowly lower your wrists back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1016.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Band Y-raise', 'Shoulders', '1. Stand with your feet shoulder-width apart and hold the band in front of your thighs with your palms facing inwards.
2. Keep your arms straight and lift them up and out to the sides, forming a ''Y'' shape with your body.
3. Squeeze your shoulder blades together at the top of the movement.
4. Slowly lower your arms back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1017.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Alternate Biceps Curl', 'Arms', '1. Stand up straight with your feet shoulder-width apart and hold a barbell in each hand, palms facing forward.
2. Keep your upper arms stationary and exhale as you curl the weights while contracting your biceps.
3. Continue to raise the barbells until your biceps are fully contracted and the barbells are at shoulder level.
4. Hold the contracted position for a brief pause as you squeeze your biceps.
5. Inhale as you slowly begin to lower the barbells back to the starting position.
6. Repeat for the desired number of repetitions, alternating arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0023.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Bench Front Squat', 'Legs', '1. Start by standing with your feet shoulder-width apart and the barbell resting on your upper chest, just below your collarbone.
2. Hold the barbell with an overhand grip, keeping your elbows up and your upper arms parallel to the ground.
3. Lower your body down into a squat position by bending at the knees and hips, keeping your back straight and your chest up.
4. Pause for a moment at the bottom of the squat, then push through your heels to return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0024.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Bench Press', 'Chest', '1. Lie flat on a bench with your feet flat on the ground and your back pressed against the bench.
2. Grasp the barbell with an overhand grip slightly wider than shoulder-width apart.
3. Lift the barbell off the rack and hold it directly above your chest with your arms fully extended.
4. Lower the barbell slowly towards your chest, keeping your elbows tucked in.
5. Pause for a moment when the barbell touches your chest.
6. Push the barbell back up to the starting position by extending your arms.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0025.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Bench Squat', 'Legs', '1. Set up a barbell on a squat rack at chest height.
2. Stand facing away from the rack, with your feet shoulder-width apart.
3. Bend your knees and lower your body down into a squat position, keeping your back straight and chest up.
4. Grasp the barbell with an overhand grip, slightly wider than shoulder-width apart.
5. Lift the barbell off the rack and step back, ensuring your feet are still shoulder-width apart.
6. Lower your body down into a squat, keeping your knees in line with your toes.
7. Pause for a moment at the bottom, then push through your heels to return to the starting position.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0026.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Bent Arm Pullover', 'Back', '1. Lie flat on a bench with your head at one end and your feet on the floor.
2. Hold a barbell with a shoulder-width grip and extend your arms straight above your chest.
3. Lower the barbell behind your head while keeping your arms slightly bent.
4. Pause for a moment, then raise the barbell back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1316.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Bent Over Row', 'Back', '1. Stand with your feet shoulder-width apart and knees slightly bent.
2. Bend forward at the hips while keeping your back straight and chest up.
3. Grasp the barbell with an overhand grip, hands slightly wider than shoulder-width apart.
4. Pull the barbell towards your lower chest by retracting your shoulder blades and squeezing your back muscles.
5. Pause for a moment at the top, then slowly lower the barbell back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0027.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Biceps Curl (with Arm Blaster)', 'Arms', '1. Stand up straight with your feet shoulder-width apart and hold a barbell with an underhand grip, palms facing up.
2. Place your upper arms against the arm blaster, keeping your elbows close to your torso.
3. Keeping your upper arms stationary, exhale and curl the weights while contracting your biceps.
4. Continue to raise the barbell until your biceps are fully contracted and the bar is at shoulder level.
5. Hold the contracted position for a brief pause as you squeeze your biceps.
6. Inhale and slowly begin to lower the barbell back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2407.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Clean And Press', 'Legs', '1. Stand with your feet shoulder-width apart and the barbell on the floor in front of you.
2. Bend your knees and hinge at the hips to lower down and grip the barbell with an overhand grip, hands slightly wider than shoulder-width apart.
3. Drive through your heels and extend your hips and knees to lift the barbell off the floor, keeping it close to your body.
4. As the barbell reaches your thighs, explosively extend your hips, shrug your shoulders, and pull the barbell up towards your chest.
5. As the barbell reaches chest height, quickly drop under it and catch it at shoulder level, with your elbows pointing forward and your palms facing up.
6. From the catch position, press the barbell overhead by extending your arms and pushing the barbell straight up.
7. Lower the barbell back down to the starting position and repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0028.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Clean-grip Front Squat', 'Legs', '1. Start by standing with your feet shoulder-width apart and the barbell resting on your upper chest, with your elbows pointing forward.
2. Lower your body by bending your knees and pushing your hips back, as if you are sitting back into a chair.
3. Keep your chest up and your back straight as you lower down, making sure your knees do not go past your toes.
4. Continue lowering until your thighs are parallel to the ground, or as low as you can comfortably go.
5. Pause for a moment at the bottom, then push through your heels to stand back up, extending your hips and knees.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0029.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Close-grip Bench Press', 'Arms', '1. Lie flat on a bench with your feet flat on the ground and your back pressed against the bench.
2. Grasp the barbell with a close grip, slightly narrower than shoulder-width apart.
3. Unrack the barbell and lower it slowly towards your chest, keeping your elbows close to your body.
4. Pause for a moment when the barbell touches your chest.
5. Push the barbell back up to the starting position, fully extending your arms.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0030.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Curl', 'Arms', '1. Stand up straight with your feet shoulder-width apart and hold a barbell with an underhand grip, palms facing forward.
2. Keep your elbows close to your torso and exhale as you curl the weights while contracting your biceps.
3. Continue to raise the bar until your biceps are fully contracted and the bar is at shoulder level.
4. Hold the contracted position for a brief pause as you squeeze your biceps.
5. Inhale as you slowly begin to lower the bar back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0031.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Deadlift', 'Legs', '1. Stand with your feet shoulder-width apart and the barbell on the ground in front of you.
2. Bend your knees and hinge at the hips to lower your torso and grip the barbell with an overhand grip, hands slightly wider than shoulder-width apart.
3. Keep your back straight and chest lifted as you drive through your heels to lift the barbell off the ground, extending your hips and knees.
4. As you stand up straight, squeeze your glutes and keep your core engaged.
5. Lower the barbell back down to the ground by bending at the hips and knees, keeping your back straight.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0032.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Decline Bench Press', 'Chest', '1. Lie on a decline bench with your feet secured and your head lower than your hips.
2. Grasp the barbell with an overhand grip slightly wider than shoulder-width apart.
3. Unrack the barbell and lower it slowly towards your chest, keeping your elbows tucked in.
4. Pause for a moment at the bottom, then push the barbell back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0033.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Decline Bent Arm Pullover', 'Back', '1. Lie down on a decline bench with your head lower than your hips and your feet secured.
2. Hold a barbell with a pronated grip (palms facing away from you) and extend your arms straight above your chest.
3. Lower the barbell behind your head in a controlled manner, keeping your arms slightly bent.
4. Pause for a moment, then raise the barbell back to the starting position by contracting your lats.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0034.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Decline Close Grip To Skull Press', 'Arms', '1. Lie on a decline bench with your head lower than your feet and hold a barbell with a close grip.
2. Lower the barbell towards your forehead by bending your elbows, keeping your upper arms stationary.
3. Pause for a moment, then extend your arms to press the barbell back up to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0035.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Decline Pullover', 'Chest', '1. Lie down on a decline bench with your head lower than your hips and your feet secured.
2. Hold the barbell with a pronated grip (palms facing away from you) and your hands slightly wider than shoulder-width apart.
3. Extend your arms above your chest, keeping a slight bend in your elbows.
4. Lower the barbell in an arc motion behind your head, feeling a stretch in your chest and shoulders.
5. Pause for a moment, then return the barbell to the starting position by reversing the motion.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1255.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Decline Wide-grip Press', 'Chest', '1. Lie on a decline bench with your feet secured and your head lower than your hips.
2. Grasp the barbell with a wide grip, slightly wider than shoulder-width apart.
3. Lower the barbell to your chest, keeping your elbows out to the sides.
4. Push the barbell back up to the starting position, fully extending your arms.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0036.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Decline Wide-grip Pullover', 'Back', '1. Lie on a decline bench with your head lower than your hips and your feet secured.
2. Hold a barbell with a wide grip and extend your arms straight above your chest.
3. Lower the barbell behind your head in a controlled manner, keeping your arms straight.
4. Pause for a moment, then raise the barbell back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0037.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Drag Curl', 'Arms', '1. Stand with your feet shoulder-width apart and hold a barbell with an underhand grip, palms facing up.
2. Let the barbell hang at arm''s length in front of your thighs.
3. Keeping your upper arms stationary, curl the barbell up towards your chest by contracting your biceps.
4. Pause for a moment at the top, then slowly lower the barbell back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0038.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Floor Calf Raise', 'Legs', '1. Place a barbell on the floor in front of you.
2. Stand with the balls of your feet on the edge of the barbell, with your heels hanging off.
3. Hold onto a stable object for balance if needed.
4. Raise your heels as high as possible, using your calves to lift your body.
5. Pause for a moment at the top, then slowly lower your heels back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1370.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Front Chest Squat', 'Legs', '1. Start by standing with your feet shoulder-width apart, toes slightly turned out.
2. Hold the barbell in front of your chest with your hands shoulder-width apart, elbows pointing forward.
3. Engage your core and keep your chest up as you lower your body down into a squat position, pushing your hips back and bending your knees.
4. Lower until your thighs are parallel to the ground, or as low as you can comfortably go.
5. Pause for a moment at the bottom, then push through your heels to return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0039.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Front Raise', 'Shoulders', '1. Stand with your feet shoulder-width apart and hold a barbell in front of your thighs with an overhand grip.
2. Keep your arms straight and lift the barbell forward and upward until it reaches shoulder level.
3. Pause for a moment at the top, then slowly lower the barbell back down to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0041.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Front Raise And Pullover', 'Chest', '1. Stand with your feet shoulder-width apart and hold a barbell with an overhand grip, palms facing down.
2. Keep your arms straight and raise the barbell in front of you until it reaches shoulder height.
3. Pause for a moment at the top, then slowly lower the barbell back down to the starting position.
4. Next, lower the barbell behind your head, keeping your arms straight.
5. Pause for a moment at the bottom, then raise the barbell back up to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0040.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Front Squat', 'Legs', '1. Start by standing with your feet shoulder-width apart, toes slightly turned out.
2. Hold the barbell in front of your shoulders, resting it on your collarbone and shoulders.
3. Engage your core and keep your chest up as you lower your body down into a squat position, pushing your hips back and bending your knees.
4. Lower until your thighs are parallel to the ground, or as low as you can comfortably go.
5. Pause for a moment at the bottom, then push through your heels to return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0042.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Full Squat', 'Legs', '1. Stand with your feet shoulder-width apart, toes slightly turned out.
2. Hold the barbell across your upper back, resting it on your traps or rear delts.
3. Engage your core and keep your chest up as you begin to lower your body down.
4. Bend at the knees and hips, pushing your hips back and down as if sitting into a chair.
5. Lower yourself until your thighs are parallel to the ground or slightly below.
6. Keep your knees in line with your toes and your weight in your heels.
7. Drive through your heels to stand back up, extending your hips and knees.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0043.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Full Squat (back Pov)', 'Legs', '1. Stand with your feet shoulder-width apart, toes slightly turned out.
2. Hold the barbell across your upper back, resting it on your traps or rear delts.
3. Engage your core and keep your chest up as you begin to lower your body down.
4. Bend at the knees and hips, pushing your hips back and down as if sitting into a chair.
5. Lower your body until your thighs are parallel to the ground or slightly below.
6. Keep your knees in line with your toes and your weight in your heels.
7. Drive through your heels to stand back up, extending your hips and knees.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1461.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Full Squat (side Pov)', 'Legs', '1. Stand with your feet shoulder-width apart, toes slightly turned out.
2. Hold the barbell across your upper back, resting it on your traps or rear delts.
3. Engage your core and keep your chest up as you begin to lower your body down.
4. Bend at the knees and hips, pushing your hips back and down as if sitting into a chair.
5. Lower your body until your thighs are parallel to the ground or slightly below.
6. Keep your knees in line with your toes and your weight in your heels.
7. Drive through your heels to stand back up, extending your hips and knees.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1462.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Full Zercher Squat', 'Legs', '1. Stand with your feet shoulder-width apart and toes slightly turned out.
2. Hold the barbell in the crooks of your elbows, with your hands gripping the barbell for stability.
3. Engage your core and keep your chest lifted as you lower your hips back and down into a squat position.
4. Keep your knees in line with your toes and your weight in your heels.
5. Lower until your thighs are parallel to the ground, or as low as you can comfortably go.
6. Drive through your heels to stand back up, squeezing your glutes at the top of the movement.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1545.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Glute Bridge', 'Legs', '1. Start by lying flat on your back on the ground with your knees bent and feet flat on the floor.
2. Place a barbell across your hips, holding it securely with both hands.
3. Engage your glutes and core muscles, then lift your hips off the ground until your body forms a straight line from your knees to your shoulders.
4. Pause for a moment at the top, squeezing your glutes.
5. Slowly lower your hips back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1409.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Glute Bridge Two Legs On Bench (male)', 'Legs', '1. Start by sitting on the edge of a bench with your upper back resting against it and your feet flat on the ground, hip-width apart.
2. Place a barbell across your hips, holding it securely with both hands.
3. Engage your glutes and core muscles, then press through your heels to lift your hips off the bench, creating a straight line from your knees to your shoulders.
4. Pause for a moment at the top, squeezing your glutes.
5. Slowly lower your hips back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3562.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Good Morning', 'Legs', '1. Start by standing with your feet shoulder-width apart and the barbell resting on your upper back.
2. Keeping your back straight and your core engaged, hinge forward at the hips, pushing your buttocks back as if you were trying to touch the wall behind you with your glutes.
3. Lower your torso until it is parallel to the ground, feeling a stretch in your hamstrings.
4. Pause for a moment, then return to the starting position by squeezing your glutes and pushing your hips forward.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0044.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Guillotine Bench Press', 'Chest', '1. Lie flat on a bench with your feet flat on the ground and your back pressed against the bench.
2. Grasp the barbell with an overhand grip, slightly wider than shoulder-width apart.
3. Lower the barbell slowly towards your neck, keeping your elbows pointed outwards.
4. Pause for a moment when the barbell is just above your neck.
5. Push the barbell back up to the starting position, fully extending your arms.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0045.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Hack Squat', 'Legs', '1. Start by standing with your feet shoulder-width apart and your toes slightly turned out.
2. Hold the barbell behind your legs, resting it on your upper thighs.
3. Lower your body by bending at the knees and hips, keeping your back straight and your chest up.
4. Continue lowering until your thighs are parallel to the ground, or as low as you can comfortably go.
5. Pause for a moment, then push through your heels to return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0046.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell High Bar Squat', 'Legs', '1. Stand with your feet shoulder-width apart, toes slightly turned out.
2. Place the barbell on your upper back, resting it on your traps.
3. Engage your core and keep your chest up as you begin to squat down, pushing your hips back and bending your knees.
4. Lower yourself until your thighs are parallel to the ground, or as low as you can comfortably go.
5. Drive through your heels to stand back up, extending your hips and knees.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1436.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Incline Bench Press', 'Chest', '1. Set up an incline bench at a 45-degree angle.
2. Lie down on the bench with your feet flat on the ground.
3. Grasp the barbell with an overhand grip, slightly wider than shoulder-width apart.
4. Unrack the barbell and lower it slowly towards your chest, keeping your elbows at a 45-degree angle.
5. Pause for a moment at the bottom, then push the barbell back up to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0047.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Incline Close Grip Bench Press', 'Arms', '1. Set up an incline bench at a 45-degree angle.
2. Lie down on the bench with your feet flat on the ground.
3. Grasp the barbell with a close grip, slightly narrower than shoulder-width apart.
4. Unrack the barbell and lower it slowly towards your chest, keeping your elbows close to your body.
5. Pause for a moment when the barbell touches your chest.
6. Push the barbell back up to the starting position, fully extending your arms.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1719.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Incline Reverse-grip Press', 'Arms', '1. Set up an incline bench at a 45-degree angle.
2. Lie back on the bench and grasp the barbell with a reverse grip, hands slightly wider than shoulder-width apart.
3. Unrack the barbell and lower it towards your upper chest, keeping your elbows tucked in.
4. Pause for a moment at the bottom, then push the barbell back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0048.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Incline Row', 'Back', '1. Set up an incline bench at a 45-degree angle.
2. Lie face down on the bench with your chest against the pad and your feet flat on the ground.
3. Grasp the barbell with an overhand grip, slightly wider than shoulder-width apart.
4. Keep your back straight and your core engaged.
5. Pull the barbell towards your chest, squeezing your shoulder blades together.
6. Pause for a moment at the top, then slowly lower the barbell back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0049.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Incline Shoulder Raise', 'Chest', '1. Set up an incline bench at a 45-degree angle.
2. Sit on the bench with your back against the pad and feet flat on the ground.
3. Hold a barbell with an overhand grip, slightly wider than shoulder-width apart.
4. Lift the barbell up to shoulder height, keeping your elbows slightly bent.
5. Slowly raise the barbell overhead, extending your arms fully.
6. Pause for a moment at the top, then slowly lower the barbell back to shoulder height.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0050.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Jefferson Squat', 'Legs', '1. Stand with your feet shoulder-width apart and toes slightly turned out.
2. Hold the barbell with an overhand grip, resting it on the front of your body, just below your waist.
3. Step your left foot forward and your right foot back, keeping your feet shoulder-width apart.
4. Bend your knees and lower your body down into a squat position, keeping your back straight and chest up.
5. Push through your heels to stand back up to the starting position.
6. Repeat the movement, alternating your forward and back foot with each repetition.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0051.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Jm Bench Press', 'Arms', '1. Lie flat on a bench with your feet flat on the ground and your back pressed against the bench.
2. Grasp the barbell with an overhand grip, slightly wider than shoulder-width apart.
3. Lower the barbell to your chest, keeping your elbows tucked in close to your body.
4. Push the barbell back up to the starting position, fully extending your arms.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0052.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Jump Squat', 'Legs', '1. Start by standing with your feet shoulder-width apart, holding a barbell across your upper back.
2. Lower your body into a squat position by bending your knees and pushing your hips back.
3. Once you reach the bottom of the squat, explode upwards by jumping off the ground.
4. As you jump, extend your hips, knees, and ankles, pushing through your toes.
5. Land softly back into the squat position and immediately repeat the movement for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0053.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Lateral Lunge', 'Legs', '1. Stand with your feet shoulder-width apart, holding a barbell across your upper back.
2. Take a big step to the side with your right foot, keeping your left foot planted.
3. Bend your right knee and lower your body down into a lunge position, keeping your left leg straight.
4. Push off with your right foot and return to the starting position.
5. Repeat on the other side, stepping with your left foot.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1410.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Low Bar Squat', 'Legs', '1. Stand with your feet shoulder-width apart and the barbell resting on your upper back.
2. Keeping your chest up and core engaged, slowly lower your body by bending your knees and pushing your hips back.
3. Continue lowering until your thighs are parallel to the ground or slightly below.
4. Pause for a moment, then push through your heels to return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1435.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Lunge', 'Legs', '1. Start by standing with your feet shoulder-width apart and a barbell resting on your upper back.
2. Take a step forward with your right foot, keeping your torso upright.
3. Lower your body by bending your right knee until your thigh is parallel to the ground.
4. Push through your right heel to return to the starting position.
5. Repeat with your left leg, alternating legs for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0054.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Lying Back Of The Head Tricep Extension', 'Arms', '1. Lie flat on a bench with your feet flat on the ground and your head at the end of the bench.
2. Hold a barbell with an overhand grip, hands shoulder-width apart, and extend your arms straight up over your chest.
3. Keeping your upper arms stationary, slowly lower the barbell behind your head by bending your elbows.
4. Pause for a moment, then extend your arms back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1720.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Lying Close-grip Press', 'Arms', '1. Lie flat on a bench with your feet flat on the ground and your back pressed against the bench.
2. Grasp the barbell with a close grip, hands shoulder-width apart, palms facing towards your feet.
3. Lift the barbell off the rack and hold it directly above your chest with your arms fully extended.
4. Slowly lower the barbell towards your chest, keeping your elbows close to your body.
5. Pause for a moment when the barbell touches your chest, then push it back up to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0055.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Lying Close-grip Triceps Extension', 'Arms', '1. Lie flat on a bench with your feet flat on the ground and your head at the end of the bench.
2. Grasp the barbell with a close grip, hands shoulder-width apart, palms facing up.
3. Extend your arms fully, lifting the barbell above your chest.
4. Keeping your upper arms stationary, slowly lower the barbell towards your forehead by bending your elbows.
5. Pause for a moment at the bottom, then extend your arms back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0056.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Lying Extension', 'Arms', '1. Lie flat on a bench with your feet flat on the ground and your head at the end of the bench.
2. Hold the barbell with an overhand grip, hands shoulder-width apart, and extend your arms straight up over your chest.
3. Keeping your upper arms stationary, slowly lower the barbell towards your forehead by bending your elbows.
4. Pause for a moment, then extend your arms back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0057.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Lying Lifting (on Hip)', 'Legs', '1. Lie flat on your back on a bench with your feet flat on the ground and your knees bent.
2. Hold the barbell with an overhand grip and position it on your hips.
3. Engaging your glutes, lift your hips off the bench until your body forms a straight line from your knees to your shoulders.
4. Pause for a moment at the top, then slowly lower your hips back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0058.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Lying Preacher Curl', 'Arms', '1. Sit on a preacher bench with your chest against the pad and your arms extended over the edge, holding a barbell with an underhand grip.
2. Keeping your upper arms stationary, exhale and curl the weights while contracting your biceps.
3. Continue to raise the bar until your biceps are fully contracted and the bar is at shoulder level.
4. Hold the contracted position for a brief pause as you squeeze your biceps.
5. Inhale and slowly begin to lower the barbell back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0059.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Lying Triceps Extension', 'Arms', '1. Lie flat on a bench with your feet flat on the ground and your head at the end of the bench.
2. Hold the barbell with an overhand grip, hands shoulder-width apart, and extend your arms straight up over your chest.
3. Keeping your upper arms stationary, slowly lower the barbell towards your forehead by bending your elbows.
4. Pause for a moment at the bottom, then extend your arms back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0061.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Lying Triceps Extension Skull Crusher', 'Arms', '1. Lie flat on a bench with your feet flat on the ground and your head at the end of the bench.
2. Hold the barbell with an overhand grip, hands shoulder-width apart, and extend your arms straight up over your chest.
3. Keeping your upper arms stationary, slowly lower the barbell towards your forehead by bending your elbows.
4. Pause for a moment when the barbell is just above your forehead, then extend your arms back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0060.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Narrow Stance Squat', 'Legs', '1. Stand with your feet shoulder-width apart and toes pointing slightly outward.
2. Hold the barbell across your upper back, resting it on your traps or rear delts.
3. Engage your core and keep your chest up as you slowly lower your body by bending your knees and pushing your hips back.
4. Continue lowering until your thighs are parallel to the ground or slightly below.
5. Pause for a moment, then push through your heels to return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0063.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell One Arm Bent Over Row', 'Back', '1. Stand with your feet shoulder-width apart, knees slightly bent, and hold a barbell with one hand using an overhand grip.
2. Bend forward at the hips, keeping your back straight and your head in a neutral position.
3. Pull the barbell up towards your chest, keeping your elbow close to your body and squeezing your shoulder blades together.
4. Lower the barbell back down to the starting position in a controlled manner.
5. Repeat for the desired number of repetitions, then switch to the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0064.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell One Arm Floor Press', 'Arms', '1. Lie flat on your back on the floor with your knees bent and feet flat on the ground.
2. Hold the barbell with one hand, palm facing up, and extend your arm straight up over your chest.
3. Slowly lower the barbell towards your chest, keeping your elbow close to your body.
4. Pause for a moment at the bottom, then push the barbell back up to the starting position.
5. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0065.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell One Arm Side Deadlift', 'Legs', '1. Stand with your feet shoulder-width apart, holding a barbell in one hand with an overhand grip.
2. Keep your back straight and your core engaged.
3. Bend at the hips and lower the barbell towards the outside of your leg, keeping your arm straight and your chest up.
4. Lower the barbell as far as you can while maintaining good form.
5. Pause for a moment, then slowly return to the starting position.
6. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0066.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell One Arm Snatch', 'Shoulders', '1. Stand with your feet shoulder-width apart, toes pointing slightly outwards.
2. Hold the barbell with an overhand grip, hands slightly wider than shoulder-width apart.
3. Bend your knees and lower your hips into a squat position, keeping your back straight and chest up.
4. Explosively extend your hips, knees, and ankles, driving the barbell upwards.
5. As the barbell reaches chest level, pull it upwards with your arm, keeping it close to your body.
6. Rotate your elbow under the barbell and extend your arm fully overhead, locking out your elbow.
7. Lower the barbell back down to the starting position in a controlled manner.
8. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0067.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell One Leg Squat', 'Legs', '1. Stand with your feet shoulder-width apart and hold a barbell across your upper back.
2. Lift one foot off the ground and extend it forward, keeping it parallel to the ground.
3. Bend your standing leg and lower your body down as if sitting back into a chair, keeping your chest up and your back straight.
4. Lower yourself until your thigh is parallel to the ground, then push through your heel to return to the starting position.
5. Repeat for the desired number of repetitions, then switch legs and repeat.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0068.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Overhead Squat', 'Legs', '1. Stand with your feet shoulder-width apart and toes slightly turned out.
2. Hold the barbell with a wide grip, positioning it overhead with your arms fully extended.
3. Engage your core and lower your body down into a squat position, keeping your chest up and knees tracking over your toes.
4. Pause for a moment at the bottom, then push through your heels to return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0069.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Palms Down Wrist Curl Over A Bench', 'Arms', '1. Sit on a bench with your feet flat on the ground and your forearms resting on your thighs, palms facing down.
2. Hold a barbell with an overhand grip, hands shoulder-width apart.
3. Lower the barbell towards the ground by flexing your wrists, keeping your forearms stationary.
4. Pause for a moment at the bottom, then slowly raise the barbell back up by extending your wrists.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1411.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Palms Up Wrist Curl Over A Bench', 'Arms', '1. Sit on a bench with your feet flat on the ground and hold a barbell with an underhand grip, palms facing up.
2. Rest your forearms on the bench, allowing your wrists to hang off the edge.
3. Keeping your forearms stationary, exhale and curl your wrists upwards as far as possible.
4. Hold the contracted position for a brief pause, then inhale and slowly lower the barbell back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1412.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Pendlay Row', 'Back', '1. Stand with your feet shoulder-width apart and your knees slightly bent.
2. Bend forward at the hips, keeping your back straight and your chest up.
3. Grasp the barbell with an overhand grip, slightly wider than shoulder-width apart.
4. Pull the barbell towards your upper abdomen, squeezing your shoulder blades together.
5. Lower the barbell back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3017.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Pin Presses', 'Arms', '1. Set up a barbell on a power rack at chest height.
2. Stand facing the barbell and position yourself underneath it, with your feet shoulder-width apart.
3. Grip the barbell with an overhand grip, slightly wider than shoulder-width apart.
4. Lift the barbell off the rack and hold it directly above your chest, with your arms fully extended.
5. Lower the barbell down towards your chest, keeping your elbows tucked in close to your body.
6. Pause for a moment when the barbell touches your chest.
7. Push the barbell back up to the starting position, fully extending your arms.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1751.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Preacher Curl', 'Arms', '1. Sit on a preacher bench with your upper arms resting on the pad and your chest against the support.
2. Grasp the barbell with an underhand grip, slightly wider than shoulder-width apart.
3. Keeping your upper arms stationary, exhale and curl the barbell up towards your shoulders.
4. Pause for a moment at the top, squeezing your biceps.
5. Inhale and slowly lower the barbell back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0070.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Press Sit-up', 'Core', '1. Lie flat on your back on a mat with your knees bent and feet flat on the ground.
2. Hold the barbell with an overhand grip, resting it on your chest.
3. Engaging your abs, slowly lift your upper body off the ground, curling forward until your torso is at a 45-degree angle.
4. Pause for a moment at the top, then slowly lower your upper body back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0071.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Prone Incline Curl', 'Arms', '1. Set up an incline bench at a 45-degree angle.
2. Lie face down on the bench with your chest and stomach resting against it.
3. Hold a barbell with an underhand grip, shoulder-width apart.
4. Extend your arms fully, allowing the barbell to hang down towards the floor.
5. Keeping your upper arms stationary, exhale and curl the weights while contracting your biceps.
6. Continue to raise the barbell until your biceps are fully contracted and the bar is at shoulder level.
7. Hold the contracted position for a brief pause as you squeeze your biceps.
8. Inhale and slowly begin to lower the barbell back to the starting position.
9. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0072.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Pullover', 'Back', '1. Lie flat on a bench with your head at one end and your feet on the floor.
2. Hold a barbell with a shoulder-width grip and extend your arms straight above your chest.
3. Keeping your arms straight, lower the barbell behind your head in a controlled manner until you feel a stretch in your lats.
4. Pause for a moment, then raise the barbell back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0073.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Pullover To Press', 'Back', '1. Lie flat on a bench with your head at one end and your feet on the ground.
2. Hold the barbell with a pronated grip (palms facing away from you) and extend your arms straight above your chest.
3. Keeping your arms straight, lower the barbell behind your head in an arc-like motion until you feel a stretch in your lats.
4. Pause for a moment, then reverse the motion and press the barbell back to the starting position above your chest.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0022.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Rack Pull', 'Legs', '1. Set up a barbell on a rack at knee height.
2. Stand with your feet shoulder-width apart, toes pointing slightly outwards.
3. Bend at the hips and knees to lower yourself down and grip the barbell with an overhand grip, hands shoulder-width apart.
4. Engage your core and lift the barbell by extending your hips and knees, pulling your shoulders back and squeezing your glutes at the top.
5. Lower the barbell back down to the starting position by bending at the hips and knees.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0074.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Rear Delt Raise', 'Shoulders', '1. Stand with your feet shoulder-width apart and hold a barbell with an overhand grip, palms facing down.
2. Bend your knees slightly and hinge forward at the hips, keeping your back straight.
3. Raise the barbell out to the sides, keeping your arms straight, until they are parallel to the ground.
4. Pause for a moment at the top, then slowly lower the barbell back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0075.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Rear Delt Row', 'Shoulders', '1. Stand with your feet shoulder-width apart and knees slightly bent.
2. Hold a barbell with an overhand grip, hands slightly wider than shoulder-width apart.
3. Bend forward at the hips, keeping your back straight and chest up.
4. Pull the barbell towards your chest, squeezing your shoulder blades together.
5. Pause for a moment at the top, then slowly lower the barbell back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0076.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Rear Lunge', 'Legs', '1. Start by standing with your feet shoulder-width apart and a barbell resting on your upper back.
2. Take a step backward with your right foot, landing on the ball of your foot.
3. Bend both knees to lower your body until your left thigh is parallel to the ground.
4. Push through your left heel to return to the starting position.
5. Repeat with the other leg.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0078.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Rear Lunge V. 2', 'Legs', '1. Stand with your feet shoulder-width apart and hold a barbell across your upper back.
2. Take a step backward with your right foot, landing on the ball of your foot.
3. Bend both knees to lower your body until your left thigh is parallel to the ground.
4. Push through your left heel to return to the starting position.
5. Repeat with the other leg.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0077.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Revers Wrist Curl V. 2', 'Arms', '1. Sit on a bench with your feet flat on the ground and your knees bent.
2. Hold a barbell with an overhand grip, palms facing down, and your hands shoulder-width apart.
3. Rest your forearms on your thighs, allowing your wrists to hang off the edge.
4. Keeping your forearms stationary, exhale and curl your wrists upward as far as possible.
5. Hold the contracted position for a brief pause, then inhale and slowly lower the barbell back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0079.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Reverse Close-grip Bench Press', 'Arms', '1. Lie flat on a bench with your feet flat on the ground and your back pressed against the bench.
2. Grasp the barbell with a reverse grip, hands shoulder-width apart.
3. Lift the barbell off the rack and hold it directly above your chest with your arms fully extended.
4. Slowly lower the barbell down towards your chest, keeping your elbows close to your body.
5. Pause for a moment when the barbell is just above your chest.
6. Push the barbell back up to the starting position, fully extending your arms.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2187.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Reverse Curl', 'Arms', '1. Stand up straight with your feet shoulder-width apart and hold a barbell with an overhand grip, palms facing down.
2. Keep your upper arms stationary and exhale as you curl the barbell upward, contracting your biceps.
3. Continue to raise the barbell until your biceps are fully contracted and the barbell is at shoulder level.
4. Hold the contracted position for a brief pause as you squeeze your biceps.
5. Inhale as you slowly lower the barbell back to the starting position, keeping your upper arms stationary.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0080.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Reverse Grip Bent Over Row', 'Back', '1. Stand with your feet shoulder-width apart and knees slightly bent.
2. Hold a barbell with an overhand grip, palms facing down, and hands slightly wider than shoulder-width apart.
3. Bend forward at the hips, keeping your back straight and chest up, until your torso is almost parallel to the floor.
4. Pull the barbell towards your lower chest, squeezing your shoulder blades together.
5. Pause for a moment at the top, then slowly lower the barbell back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0118.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Reverse Grip Decline Bench Press', 'Chest', '1. Lie on a decline bench with your feet secured and your head lower than your hips.
2. Grasp the barbell with a reverse grip, slightly wider than shoulder-width apart.
3. Unrack the barbell and lower it slowly towards your chest, keeping your elbows tucked in.
4. Pause for a moment at the bottom, then push the barbell back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1256.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Reverse Grip Incline Bench Press', 'Chest', '1. Set up an incline bench at a 45-degree angle.
2. Lie down on the bench with your feet flat on the ground.
3. Grasp the barbell with a reverse grip, hands slightly wider than shoulder-width apart.
4. Unrack the barbell and lower it slowly towards your chest, keeping your elbows tucked in.
5. Pause for a moment when the barbell touches your chest.
6. Push the barbell back up to the starting position, fully extending your arms.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1257.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Reverse Grip Incline Bench Row', 'Back', '1. Set up an incline bench at a 45-degree angle.
2. Sit on the bench facing the backrest with your chest against it.
3. Grab the barbell with a reverse grip (palms facing down) and hands slightly wider than shoulder-width apart.
4. Keep your back straight and core engaged.
5. Pull the barbell towards your upper abdomen, squeezing your shoulder blades together.
6. Pause for a moment at the top of the movement.
7. Slowly lower the barbell back to the starting position.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1317.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Reverse Grip Skullcrusher', 'Arms', '1. Lie flat on a bench with your feet flat on the ground and your head at the end of the bench.
2. Hold the barbell with a reverse grip, palms facing towards your face, and your hands shoulder-width apart.
3. Extend your arms straight up over your chest, keeping your elbows in and your wrists straight.
4. Slowly lower the barbell towards your forehead by bending your elbows, keeping your upper arms stationary.
5. Pause for a moment at the bottom, then extend your arms back up to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1721.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Reverse Preacher Curl', 'Arms', '1. Sit on a preacher bench with your chest against the pad and your arms extended straight down, holding a barbell with an overhand grip.
2. Keeping your upper arms stationary, exhale and curl the barbell upward while contracting your biceps.
3. Continue to raise the barbell until your biceps are fully contracted and the barbell is at shoulder level.
4. Hold the contracted position for a brief pause as you squeeze your biceps.
5. Inhale and slowly lower the barbell back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0081.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Reverse Wrist Curl', 'Arms', '1. Sit on a bench with your feet flat on the ground and hold a barbell with an overhand grip, palms facing down.
2. Rest your forearms on your thighs, allowing your wrists to hang off the edge.
3. Slowly curl your wrists upward, bringing the barbell towards your body.
4. Pause for a moment at the top, then slowly lower the barbell back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0082.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Rollerout', 'Core', '1. Kneel on the floor and hold a barbell with both hands, shoulder-width apart.
2. Roll the barbell forward, extending your arms and keeping your core engaged.
3. Continue rolling forward until your body is fully extended and your arms are overhead.
4. Pause for a moment, then slowly roll the barbell back towards your knees, maintaining control.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0084.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Rollerout From Bench', 'Core', '1. Start by kneeling on the floor with a barbell placed on a bench in front of you.
2. Grasp the barbell with an overhand grip, slightly wider than shoulder-width apart.
3. Keeping your core engaged and your back straight, slowly roll the barbell forward, extending your arms in front of you.
4. Continue rolling the barbell forward until your body is fully extended and your arms are overhead.
5. Pause for a moment at the fully extended position, then slowly roll the barbell back towards your body, returning to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0083.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Romanian Deadlift', 'Legs', '1. Stand with your feet shoulder-width apart and your toes pointing forward.
2. Hold the barbell with an overhand grip, hands slightly wider than shoulder-width apart.
3. Bend at the hips, keeping your back straight and your knees slightly bent.
4. Lower the barbell towards the ground, keeping it close to your body.
5. Feel the stretch in your hamstrings as you lower the barbell.
6. Once you feel a stretch in your hamstrings, push your hips forward and stand up straight.
7. Squeeze your glutes at the top of the movement.
8. Lower the barbell back down to the starting position and repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0085.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Seated Behind Head Military Press', 'Shoulders', '1. Sit on a bench with your back straight and feet flat on the ground.
2. Hold the barbell with an overhand grip, slightly wider than shoulder-width apart.
3. Lift the barbell off the rack and bring it down to shoulder level, behind your head.
4. Press the barbell upward until your arms are fully extended.
5. Lower the barbell back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0086.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Seated Bradford Rocky Press', 'Shoulders', '1. Sit on a bench with your back straight and feet flat on the ground.
2. Hold the barbell with an overhand grip, slightly wider than shoulder-width apart.
3. Lift the barbell to shoulder height, keeping your elbows slightly bent and pointing forward.
4. Press the barbell overhead, fully extending your arms.
5. Lower the barbell back to shoulder height and repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0087.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Seated Calf Raise', 'Legs', '1. Sit on a bench with your feet flat on the floor and a barbell resting on your thighs.
2. Place the balls of your feet on a raised platform, such as a block or step.
3. Position the barbell across your thighs and hold it securely with your hands.
4. Keeping your back straight and your core engaged, lift your heels off the ground by extending your ankles.
5. Pause for a moment at the top, then slowly lower your heels back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0088.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Seated Calf Raise', 'Legs', '1. Sit on a bench with your feet flat on the floor and a barbell resting on your thighs.
2. Place the balls of your feet on a raised platform, such as a block or step.
3. Lower your heels as far as possible, feeling a stretch in your calves.
4. Raise your heels as high as possible, contracting your calves.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1371.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Seated Close Grip Behind Neck Triceps Extension', 'Arms', '1. Sit on a bench with your back straight and feet flat on the ground.
2. Hold the barbell with a close grip behind your neck, palms facing forward.
3. Keep your elbows close to your head and slowly lower the barbell towards the back of your head.
4. Pause for a moment, then extend your arms back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1718.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Seated Close-grip Concentration Curl', 'Arms', '1. Sit on a bench with your feet flat on the floor and hold a barbell with an underhand grip, hands shoulder-width apart.
2. Rest your upper arms against your inner thighs, just above your knees, and let the barbell hang down in front of you.
3. Keeping your upper arms stationary, exhale and curl the barbell up towards your shoulders, contracting your biceps.
4. Hold the contracted position for a brief pause, then inhale and slowly lower the barbell back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0089.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Seated Good Morning', 'Legs', '1. Sit on a bench with your feet flat on the ground and a barbell resting on your upper back.
2. Keep your back straight and your chest up.
3. Slowly hinge forward at the hips, lowering your torso towards the ground.
4. Pause for a moment at the bottom, then push through your heels to return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0090.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Seated Overhead Press', 'Shoulders', '1. Sit on a bench with your back straight and feet flat on the ground.
2. Hold the barbell with an overhand grip, slightly wider than shoulder-width apart.
3. Lift the barbell off the rack and bring it to shoulder level, with your elbows bent and palms facing forward.
4. Press the barbell overhead by extending your arms fully.
5. Pause for a moment at the top, then slowly lower the barbell back to shoulder level.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0091.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Seated Overhead Triceps Extension', 'Arms', '1. Sit on a bench with your back straight and feet flat on the ground.
2. Hold a barbell with an overhand grip, hands shoulder-width apart, and raise it overhead.
3. Lower the barbell behind your head by bending your elbows, keeping your upper arms close to your head.
4. Pause for a moment, then extend your arms to raise the barbell back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0092.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Seated Twist', 'Core', '1. Sit on a flat bench with your feet flat on the ground and your knees bent.
2. Hold a barbell with both hands in front of your chest, keeping your elbows slightly bent.
3. Engage your core and slowly twist your torso to one side, keeping your back straight.
4. Pause for a moment at the end of the twist, then slowly rotate back to the starting position.
5. Repeat the twist to the other side.
6. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0094.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Shrug', 'Back', '1. Stand with your feet shoulder-width apart and hold a barbell in front of you with an overhand grip.
2. Keep your arms straight and your back straight throughout the exercise.
3. Lift your shoulders up towards your ears as high as possible, squeezing your traps at the top.
4. Hold for a moment, then slowly lower your shoulders back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0095.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Side Bent V. 2', 'Core', '1. Stand with your feet shoulder-width apart and hold a barbell with both hands, palms facing down.
2. Keep your back straight and core engaged throughout the exercise.
3. Slowly bend your torso to the right side, lowering the barbell towards your right knee.
4. Pause for a moment, then return to the starting position.
5. Repeat the movement on the left side.
6. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0096.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Side Split Squat', 'Legs', '1. Stand with your feet wider than shoulder-width apart, toes pointing slightly outward.
2. Hold a barbell across your upper back, resting it on your traps.
3. Engage your core and keep your chest up as you lower your body down into a squat position, bending at the knees and hips.
4. As you lower, push your knees out to the sides and keep your weight on your heels.
5. Lower until your thighs are parallel to the ground, then push through your heels to return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0098.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Side Split Squat V. 2', 'Legs', '1. Stand with your feet wider than shoulder-width apart, toes pointing slightly outwards.
2. Hold a barbell across your upper back, resting it on your shoulders.
3. Take a big step to the side with your right foot, keeping your left foot planted.
4. Bend your right knee and lower your body down into a squat position, keeping your chest up and your back straight.
5. Push through your right heel to return to the starting position.
6. Repeat on the other side, stepping out with your left foot.
7. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0097.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Single Leg Deadlift', 'Legs', '1. Stand with your feet hip-width apart, holding a barbell in front of your thighs with an overhand grip.
2. Shift your weight onto your left foot and lift your right foot slightly off the ground.
3. Hinge forward at the hips, keeping your back straight and your right leg extended behind you for balance.
4. Lower the barbell towards the ground, keeping it close to your body and your left leg slightly bent.
5. Pause for a moment at the bottom, then engage your glutes and hamstrings to lift your torso back up to the starting position.
6. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1756.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Single Leg Split Squat', 'Legs', '1. Stand with your feet shoulder-width apart, holding a barbell across your upper back.
2. Take a large step forward with one leg, keeping your torso upright.
3. Lower your body by bending your front knee and hip, while keeping your back leg straight.
4. Continue lowering until your front thigh is parallel to the ground.
5. Pause for a moment, then push through your front heel to return to the starting position.
6. Repeat for the desired number of repetitions, then switch legs.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0099.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Sitted Alternate Leg Raise', 'Core', '1. Sit on a bench with your back straight and hold a barbell across your thighs.
2. Keeping your legs straight, lift one leg up as high as possible while keeping the other leg on the ground.
3. Lower the raised leg back down and repeat with the other leg.
4. Continue alternating legs for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2799.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Sitted Alternate Leg Raise (female)', 'Core', '1. Sit on a bench with your back straight and hold a barbell across your thighs.
2. Place your hands on the sides of the bench for support.
3. Keeping your legs straight, lift one leg up as high as possible while keeping it parallel to the ground.
4. Lower the leg back down and repeat with the other leg.
5. Continue alternating legs for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2800.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Skier', 'Shoulders', '1. Stand with your feet shoulder-width apart and hold a barbell in front of your thighs with an overhand grip.
2. Bend your knees slightly and hinge forward at the hips, keeping your back straight and chest up.
3. Simultaneously lift the barbell up towards your shoulders while jumping slightly off the ground.
4. As you reach the top of the movement, quickly reverse the motion and lower the barbell back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0100.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Speed Squat', 'Legs', '1. Stand with your feet shoulder-width apart, toes slightly turned out.
2. Hold the barbell across your upper back, resting it on your traps or rear delts.
3. Engage your core and keep your chest up as you lower your hips back and down, as if sitting into a chair.
4. Lower until your thighs are parallel to the ground, or as low as you can comfortably go.
5. Drive through your heels to stand back up, squeezing your glutes at the top.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0101.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Split Squat V. 2', 'Legs', '1. Start by standing with your feet shoulder-width apart, holding a barbell across your upper back.
2. Take a large step forward with your right foot, keeping your torso upright.
3. Lower your body by bending your knees and hips until your right thigh is parallel to the ground.
4. Pause for a moment, then push through your right heel to return to the starting position.
5. Repeat with your left leg forward for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2810.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Squat (on Knees)', 'Legs', '1. Start by kneeling on the ground with your knees hip-width apart and your toes pointing forward.
2. Place a barbell across your shoulders, gripping it with an overhand grip and your hands slightly wider than shoulder-width apart.
3. Engage your core and keep your chest lifted as you slowly lower your body down by bending your knees, keeping your back straight.
4. Continue lowering until your thighs are parallel to the ground, or as low as you can comfortably go.
5. Pause for a moment at the bottom, then push through your heels to return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0102.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Squat Jump Step Rear Lunge', 'Legs', '1. Start by standing with your feet shoulder-width apart, holding a barbell across your upper back.
2. Lower your body into a squat position by bending your knees and pushing your hips back.
3. Explode upwards, jumping off the ground as high as you can.
4. Land softly on your feet and immediately step back with one leg into a reverse lunge.
5. Lower your body down until your front thigh is parallel to the ground, keeping your back straight.
6. Push through your front heel to return to the starting position.
7. Repeat the jump and lunge sequence on the other leg.
8. Continue alternating legs for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2798.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Standing Ab Rollerout', 'Core', '1. Stand upright with your feet shoulder-width apart and hold the barbell with both hands in front of your thighs.
2. Engage your core and slowly roll the barbell down towards the ground, keeping your back straight and your arms extended.
3. Continue rolling the barbell forward until your body is fully extended and your hands are directly above your head.
4. Pause for a moment, then slowly roll the barbell back towards your thighs, maintaining control and keeping your core engaged.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0103.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Standing Back Wrist Curl', 'Arms', '1. Stand up straight with your feet shoulder-width apart and hold a barbell with an overhand grip.
2. Rest the barbell on the back of your hands with your palms facing down and your fingers pointing towards your body.
3. Keeping your upper arms stationary, exhale and curl your wrists upwards as far as possible.
4. Hold the contracted position for a brief pause, then inhale and slowly lower the barbell back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0104.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Standing Bradford Press', 'Shoulders', '1. Stand with your feet shoulder-width apart and hold the barbell in front of your shoulders with an overhand grip.
2. Press the barbell overhead, fully extending your arms.
3. Lower the barbell back down to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0105.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Standing Calf Raise', 'Legs', '1. Stand with your feet shoulder-width apart and place a barbell across your upper back.
2. Raise your heels off the ground as high as possible, using only your toes.
3. Pause for a moment at the top, then slowly lower your heels back down to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1372.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Standing Close Grip Curl', 'Arms', '1. Stand up straight with your feet shoulder-width apart and hold a barbell with an underhand grip, hands close together.
2. Keep your elbows close to your torso and your upper arms stationary throughout the movement.
3. Exhale as you curl the weights while contracting your biceps. Continue to raise the bar until your biceps are fully contracted and the bar is at shoulder level.
4. Hold the contracted position for a brief pause as you squeeze your biceps.
5. Inhale as you slowly begin to bring the barbell back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0106.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Standing Close Grip Military Press', 'Shoulders', '1. Stand with your feet shoulder-width apart and hold the barbell with an overhand grip, hands slightly closer than shoulder-width apart.
2. Lift the barbell to shoulder height, keeping your elbows close to your body.
3. Press the barbell overhead, extending your arms fully.
4. Lower the barbell back to shoulder height.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1456.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Standing Concentration Curl', 'Arms', '1. Stand with your feet shoulder-width apart and hold a barbell in one hand, palm facing up.
2. Rest your opposite hand on your thigh for support.
3. Keeping your upper arm stationary, exhale and curl the weight up towards your shoulder.
4. Pause for a moment at the top, squeezing your biceps.
5. Inhale and slowly lower the weight back down to the starting position.
6. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2414.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Standing Front Raise Over Head', 'Shoulders', '1. Stand with your feet shoulder-width apart, holding a barbell in front of your thighs with an overhand grip.
2. Keep your back straight and engage your core.
3. Slowly raise the barbell in front of you, keeping your arms straight and your palms facing down.
4. Continue lifting until the barbell is slightly above shoulder level.
5. Pause for a moment at the top, then slowly lower the barbell back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0107.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Standing Leg Calf Raise', 'Legs', '1. Stand with your feet shoulder-width apart and place a barbell across your upper back.
2. Raise your heels off the ground as high as possible, using your calves.
3. Pause for a moment at the top, then slowly lower your heels back down to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0108.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Standing Overhead Triceps Extension', 'Arms', '1. Stand with your feet shoulder-width apart and hold a barbell with an overhand grip.
2. Raise the barbell overhead, fully extending your arms.
3. Keeping your upper arms close to your head, slowly lower the barbell behind your head by bending your elbows.
4. Pause for a moment, then raise the barbell back to the starting position by extending your arms.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0109.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Standing Reverse Grip Curl', 'Arms', '1. Stand up straight with your feet shoulder-width apart and hold a barbell with an underhand grip, palms facing up.
2. Keep your elbows close to your torso and your upper arms stationary.
3. Exhale and curl the weights while contracting your biceps, bringing the barbell as close to your shoulders as possible.
4. Hold the contracted position for a brief pause as you squeeze your biceps.
5. Inhale and slowly lower the barbell back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0110.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Standing Rocking Leg Calf Raise', 'Legs', '1. Stand with your feet shoulder-width apart and hold a barbell across your upper back.
2. Raise your heels off the ground as high as possible, balancing on the balls of your feet.
3. Slowly lower your heels back down to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0111.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Standing Twist', 'Core', '1. Stand with your feet shoulder-width apart and hold a barbell in front of your chest with both hands, palms facing down.
2. Engage your core and keep your back straight throughout the exercise.
3. Slowly twist your torso to the right, pivoting on your feet and hips, while keeping your lower body stable.
4. Pause for a moment at the end of the twist, then slowly return to the starting position.
5. Repeat the twist to the left side.
6. Continue alternating twists for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0112.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Standing Wide Grip Biceps Curl', 'Arms', '1. Stand with your feet shoulder-width apart and hold a barbell with an underhand grip, hands wider than shoulder-width apart.
2. Keep your back straight and your elbows close to your torso.
3. Exhale and curl the barbell up towards your shoulders, keeping your upper arms stationary.
4. Pause for a moment at the top, squeezing your biceps.
5. Inhale and slowly lower the barbell back to the starting position, fully extending your arms.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1629.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Standing Wide Military Press', 'Shoulders', '1. Stand with your feet shoulder-width apart and hold the barbell with an overhand grip, slightly wider than shoulder-width.
2. Lift the barbell to shoulder height, keeping your elbows slightly in front of the bar.
3. Press the barbell overhead, extending your arms fully.
4. Lower the barbell back to shoulder height and repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1457.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Standing Wide-grip Curl', 'Arms', '1. Stand up straight with your feet shoulder-width apart and hold a barbell with an overhand grip, hands wider than shoulder-width apart.
2. Let the barbell hang at arm''s length in front of your thighs, with your palms facing away from your body.
3. Keeping your upper arms stationary, exhale and curl the barbell upward by contracting your biceps.
4. Continue to raise the barbell until your biceps are fully contracted and the barbell is at shoulder level.
5. Hold the contracted position for a brief pause as you squeeze your biceps.
6. Inhale and slowly begin to lower the barbell back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0113.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Step-up', 'Legs', '1. Stand in front of a bench or step with a barbell resting on your upper back.
2. Place one foot on the bench or step, ensuring your entire foot is in contact with the surface.
3. Push through your heel and step up onto the bench or step, fully extending your hip and knee.
4. Pause briefly at the top, then lower yourself back down to the starting position.
5. Repeat with the opposite leg.
6. Continue alternating legs for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0114.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Stiff Leg Good Morning', 'Legs', '1. Stand with your feet shoulder-width apart and your knees slightly bent.
2. Hold the barbell across your upper back, resting it on your traps.
3. Keeping your back straight, hinge forward at the hips, pushing your glutes back.
4. Lower your torso until it is parallel to the ground, feeling a stretch in your hamstrings.
5. Engage your glutes and hamstrings to return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0115.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Straight Leg Deadlift', 'Legs', '1. Stand with your feet shoulder-width apart and your toes pointing forward.
2. Hold the barbell with an overhand grip, hands slightly wider than shoulder-width apart.
3. Bend at your hips and lower the barbell towards the ground, keeping your back straight and your knees slightly bent.
4. Lower the barbell until you feel a stretch in your hamstrings.
5. Engage your hamstrings and glutes to lift the barbell back up to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0116.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Sumo Deadlift', 'Legs', '1. Stand with your feet wider than shoulder-width apart, toes pointing outwards.
2. Place a barbell on the ground in front of you, centered between your feet.
3. Bend your knees and lower your hips, keeping your back straight and chest up, to grip the barbell with an overhand grip.
4. Engage your core and drive through your heels to lift the barbell off the ground, extending your hips and knees simultaneously.
5. As you lift, keep your chest up and back straight, and push your hips forward to fully engage your glutes.
6. Pause for a moment at the top, then slowly lower the barbell back down to the starting position, maintaining control throughout the movement.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0117.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Thruster', 'Shoulders', '1. Start by standing with your feet shoulder-width apart, holding a barbell at shoulder height with an overhand grip.
2. Lower into a squat position by bending your knees and pushing your hips back.
3. As you reach the bottom of the squat, explosively drive through your heels to stand up, simultaneously pressing the barbell overhead.
4. Lower the barbell back to shoulder height as you lower back into the squat position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3305.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Upright Row', 'Shoulders', '1. Stand with your feet shoulder-width apart and hold a barbell with an overhand grip, hands slightly wider than shoulder-width apart.
2. Let the barbell hang in front of your thighs, arms fully extended.
3. Keeping your back straight and core engaged, exhale and lift the barbell straight up towards your chin, leading with your elbows.
4. Pause for a moment at the top, then inhale and slowly lower the barbell back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0120.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Upright Row V. 2', 'Shoulders', '1. Stand with your feet shoulder-width apart and hold a barbell with an overhand grip, hands slightly wider than shoulder-width apart.
2. Let the barbell hang in front of your thighs, arms fully extended.
3. Keeping your back straight, exhale and lift the barbell straight up towards your chin, leading with your elbows.
4. Pause for a moment at the top, then inhale and slowly lower the barbell back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0119.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Upright Row V. 3', 'Shoulders', '1. Stand with your feet shoulder-width apart and hold a barbell with an overhand grip, hands slightly wider than shoulder-width apart.
2. Let the barbell hang in front of your thighs, arms fully extended.
3. Keeping your core engaged and back straight, exhale as you lift the barbell straight up towards your chin, leading with your elbows.
4. Pause for a moment at the top, then inhale as you slowly lower the barbell back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0121.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Wide Bench Press', 'Chest', '1. Lie flat on a bench with your feet flat on the ground and your back pressed against the bench.
2. Grasp the barbell with a wide grip, slightly wider than shoulder-width apart.
3. Lift the barbell off the rack and hold it directly above your chest with your arms fully extended.
4. Lower the barbell slowly towards your chest, keeping your elbows slightly flared out.
5. Pause for a moment when the barbell touches your chest, then push it back up to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0122.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Wide Reverse Grip Bench Press', 'Chest', '1. Lie flat on a bench with your feet flat on the ground and your back pressed against the bench.
2. Grasp the barbell with a wide reverse grip, slightly wider than shoulder-width apart.
3. Lift the barbell off the rack and hold it directly above your chest with your arms fully extended.
4. Lower the barbell slowly towards your chest, keeping your elbows tucked in and your wrists straight.
5. Pause for a moment when the barbell touches your chest, then push it back up to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1258.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Wide Squat', 'Legs', '1. Stand with your feet wider than shoulder-width apart, toes pointing slightly outward.
2. Hold the barbell across your upper back, resting it on your traps or rear delts.
3. Engage your core and keep your chest up as you lower your body down into a squat, pushing your hips back and bending your knees.
4. Lower until your thighs are parallel to the ground, or as low as you can comfortably go.
5. Pause for a moment at the bottom, then push through your heels to return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0124.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Wide-grip Upright Row', 'Shoulders', '1. Stand with your feet shoulder-width apart and hold a barbell with an overhand grip, hands wider than shoulder-width apart.
2. Let the barbell hang in front of your thighs, arms fully extended.
3. Keeping your back straight, exhale and lift the barbell straight up towards your chin, leading with your elbows.
4. Pause for a moment at the top, then inhale and slowly lower the barbell back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0123.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Wrist Curl', 'Arms', '1. Sit on a bench with your feet flat on the ground and your forearms resting on your thighs, holding a barbell with an underhand grip.
2. Allow the barbell to roll down to your fingertips, keeping your wrists straight.
3. Slowly curl the barbell up towards your forearms by flexing your wrists.
4. Pause for a moment at the top, then slowly lower the barbell back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0126.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Wrist Curl V. 2', 'Arms', '1. Sit on a bench with your feet flat on the ground and your knees bent.
2. Hold a barbell with an underhand grip, palms facing up, and your hands shoulder-width apart.
3. Rest your forearms on your thighs, allowing your wrists to hang off the edge.
4. Slowly curl your wrists upward, bringing the barbell towards your forearms.
5. Pause for a moment at the top, then slowly lower the barbell back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0125.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Barbell Zercher Squat', 'Legs', '1. Stand with your feet shoulder-width apart and toes slightly turned out.
2. Hold the barbell in the crooks of your elbows, with your hands gripping the bar for stability.
3. Engage your core and keep your chest lifted as you lower your hips back and down into a squat position.
4. Keep your knees in line with your toes and your weight in your heels.
5. Pause for a moment at the bottom of the squat, then push through your heels to return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0127.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Basic Toe Touch (male)', 'Legs', '1. Stand with your feet shoulder-width apart and your arms by your sides.
2. Bend forward at the waist, keeping your back straight and your knees slightly bent.
3. Reach down towards your toes with your hands, keeping your legs as straight as possible.
4. Pause for a moment at the bottom, then slowly return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3212.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Battling Ropes', 'Shoulders', '1. Stand with your feet shoulder-width apart and knees slightly bent.
2. Hold one end of the rope in each hand, with your palms facing each other.
3. Raise your arms to shoulder height, keeping your elbows slightly bent.
4. Begin making alternating waves with the ropes by rapidly raising and lowering each arm.
5. Continue for the desired duration or number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0128.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Bear Crawl', 'Cardio', '1. Start on all fours with your hands directly under your shoulders and your knees directly under your hips.
2. Lift your knees slightly off the ground, keeping your back flat and your core engaged.
3. Move your right hand and left foot forward simultaneously, followed by your left hand and right foot.
4. Continue crawling forward, alternating your hand and foot movements.
5. Maintain a steady pace and keep your core tight throughout the exercise.
6. Continue for the desired distance or time.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3360.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Behind Head Chest Stretch', 'Chest', '1. Stand tall with your feet shoulder-width apart.
2. Interlace your fingers behind your head with your elbows pointing outwards.
3. Slowly squeeze your shoulder blades together and push your chest forward.
4. Hold the stretch for 15-30 seconds.
5. Release the stretch and repeat as desired.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1259.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Bench Dip (knees Bent)', 'Arms', '1. Sit on the edge of a bench or chair with your hands gripping the edge next to your hips.
2. Slide your butt off the bench and straighten your legs in front of you, keeping your heels on the ground.
3. Bend your elbows and lower your body towards the ground, keeping your back close to the bench.
4. Pause for a moment at the bottom, then push yourself back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0129.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Bench Dip On Floor', 'Arms', '1. Sit on the edge of a bench or chair with your hands gripping the edge, fingers pointing forward.
2. Slide your butt off the bench, supporting your weight with your hands.
3. Lower your body by bending your elbows until your upper arms are parallel to the floor.
4. Push yourself back up to the starting position by straightening your arms.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1399.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Bench Hip Extension', 'Legs', '1. Sit on a bench with your back against the bench and your feet flat on the ground.
2. Place your hands on the bench for support.
3. Engage your glutes and hamstrings, then lift your hips off the bench until your body forms a straight line from your knees to your shoulders.
4. Pause for a moment at the top, then slowly lower your hips back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0130.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Bench Pull-ups', 'Back', '1. Position yourself under a bar or a sturdy horizontal surface that is at chest height.
2. Grab the bar or surface with an overhand grip, slightly wider than shoulder-width apart.
3. Hang with your arms fully extended and your body straight.
4. Pull your chest towards the bar or surface by squeezing your shoulder blades together and bending your elbows.
5. Continue pulling until your chin is above the bar or surface.
6. Lower yourself back down to the starting position with control.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3019.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Bent Knee Lying Twist (male)', 'Legs', '1. Lie flat on your back with your knees bent and feet flat on the ground.
2. Extend your arms out to the sides, perpendicular to your body.
3. Keeping your knees together, slowly lower them to one side, aiming to touch the ground with your knees.
4. Pause for a moment, then engage your core and slowly lift your knees back to the starting position.
5. Repeat the movement to the other side.
6. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3639.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Biceps Leg Concentration Curl', 'Arms', '1. Sit on a bench with your legs spread apart and your feet flat on the ground.
2. Hold a dumbbell in one hand and place your elbow on the inside of your thigh, just above the knee.
3. With your palm facing up, curl the dumbbell towards your shoulder while keeping your upper arm stationary.
4. Squeeze your biceps at the top of the movement, then slowly lower the dumbbell back to the starting position.
5. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1770.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Biceps Narrow Pull-ups', 'Arms', '1. Hang from a pull-up bar with your palms facing towards you and your hands shoulder-width apart.
2. Engage your core and pull yourself up towards the bar, focusing on using your biceps to lift your body.
3. Pause for a moment at the top, then slowly lower yourself back down to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0139.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Biceps Pull-up', 'Arms', '1. Hang from a pull-up bar with your palms facing away from you and your hands shoulder-width apart.
2. Engage your core and pull yourself up by bending your elbows, bringing your chest towards the bar.
3. Pause at the top of the movement, then slowly lower yourself back down to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0140.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Body-up', 'Arms', '1. Start by placing your hands on a raised surface, such as a bench or parallel bars, with your palms facing down and fingers pointing forward.
2. Extend your legs out in front of you, keeping your heels on the ground and your body straight.
3. Lower your body by bending your elbows, keeping them close to your sides, until your upper arms are parallel to the ground.
4. Pause for a moment, then push through your palms to straighten your arms and lift your body back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0137.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Bodyweight Drop Jump Squat', 'Legs', '1. Stand with your feet shoulder-width apart.
2. Lower your body into a squat position by bending your knees and pushing your hips back.
3. Jump up explosively, extending your hips, knees, and ankles.
4. While in mid-air, quickly bring your feet together.
5. Land softly on the balls of your feet and immediately drop back into a squat position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3543.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Bodyweight Incline Side Plank', 'Core', '1. Start by lying on your side with your legs extended and stacked on top of each other.
2. Place your forearm on the ground directly below your shoulder, with your elbow bent at a 90-degree angle.
3. Engage your core and lift your hips off the ground, creating a straight line from your head to your feet.
4. Hold this position for the desired amount of time.
5. Lower your hips back down to the ground and repeat on the other side.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3544.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Bodyweight Kneeling Triceps Extension', 'Arms', '1. Kneel down on the ground with your knees hip-width apart.
2. Place your hands on the ground in front of you, shoulder-width apart, fingers pointing forward.
3. Extend your legs straight behind you, balancing on your toes and hands, forming a straight line from head to heels.
4. Bend your elbows and lower your upper body towards the ground, keeping your elbows close to your sides.
5. Pause for a moment at the bottom, then push through your hands to straighten your arms and return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1771.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Bodyweight Side Lying Biceps Curl', 'Arms', '1. Lie on your side with your legs extended and your head supported by your arm.
2. Hold your upper arm against your side and bend your elbow to curl your forearm towards your shoulder.
3. Pause for a moment at the top, then slowly lower your forearm back down to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1769.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Bodyweight Squatting Row', 'Back', '1. Stand with your feet shoulder-width apart, holding onto a sturdy object or suspension trainer with your arms extended.
2. Lower your body into a squat position, keeping your back straight and your knees behind your toes.
3. From the squat position, pull your body up towards the object or suspension trainer, squeezing your shoulder blades together.
4. Pause for a moment at the top, then slowly lower your body back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3168.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Bodyweight Squatting Row (with Towel)', 'Back', '1. Stand with your feet shoulder-width apart, holding a towel in front of you with your palms facing down.
2. Bend your knees and lower your body into a squat position, keeping your back straight and your chest up.
3. As you lower into the squat, simultaneously pull the towel towards your chest, squeezing your shoulder blades together.
4. Pause for a moment at the bottom of the squat, then slowly return to the starting position while extending your arms.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3167.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Bodyweight Standing Calf Raise', 'Legs', '1. Stand with your feet shoulder-width apart, toes pointing forward.
2. Place your hands on a wall or stable surface for balance.
3. Slowly raise your heels off the ground, lifting your body weight onto the balls of your feet.
4. Pause for a moment at the top, then slowly lower your heels back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1373.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Bodyweight Standing Close-grip One Arm Row', 'Back', '1. Stand with your feet shoulder-width apart, knees slightly bent, and hold a dumbbell in one hand with a neutral grip.
2. Bend forward at the hips, keeping your back straight and your core engaged.
3. Pull the dumbbell up towards your chest, keeping your elbow close to your body and squeezing your shoulder blades together.
4. Pause for a moment at the top, then slowly lower the dumbbell back down to the starting position.
5. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3156.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Bodyweight Standing Close-grip Row', 'Back', '1. Stand with your feet shoulder-width apart and knees slightly bent.
2. Bend forward at the waist, keeping your back straight and your core engaged.
3. Extend your arms straight in front of you, gripping the bar or handles with a close grip.
4. Pull the bar or handles towards your body, squeezing your shoulder blades together.
5. Pause for a moment at the top of the movement, then slowly release and return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3158.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Bodyweight Standing One Arm Row', 'Back', '1. Stand with your feet shoulder-width apart, knees slightly bent, and hold a dumbbell in one hand.
2. Bend forward at the hips, keeping your back straight and your core engaged.
3. Let the dumbbell hang straight down in front of you, with your arm fully extended.
4. Pull the dumbbell up towards your chest, keeping your elbow close to your body.
5. Squeeze your shoulder blades together at the top of the movement.
6. Lower the dumbbell back down to the starting position.
7. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3162.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Bodyweight Standing One Arm Row (with Towel)', 'Back', '1. Stand with your feet shoulder-width apart, knees slightly bent, and hold a towel with one hand.
2. Bend forward at the hips, keeping your back straight and your core engaged.
3. Pull the towel towards your chest, squeezing your shoulder blades together.
4. Pause for a moment at the top, then slowly lower the towel back to the starting position.
5. Repeat for the desired number of repetitions, then switch to the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3161.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Bodyweight Standing Row', 'Back', '1. Stand with your feet shoulder-width apart and knees slightly bent.
2. Grasp a bar or handles with an overhand grip, palms facing down.
3. Keep your back straight and core engaged.
4. Pull the bar or handles towards your body, squeezing your shoulder blades together.
5. Pause for a moment at the top of the movement.
6. Slowly release and extend your arms back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3166.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Bodyweight Standing Row (with Towel)', 'Back', '1. Stand with your feet shoulder-width apart and hold a towel in front of you with both hands.
2. Bend your knees slightly and hinge forward at the hips, keeping your back straight.
3. Pull the towel towards your chest, squeezing your shoulder blades together.
4. Pause for a moment at the top, then slowly release the tension and return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3165.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Bottoms-up', 'Core', '1. Lie flat on your back with your legs extended and your arms by your sides.
2. Bend your knees and bring them towards your chest, keeping your feet off the ground.
3. Engaging your abs, lift your hips off the ground, bringing your knees towards your head.
4. Pause for a moment at the top, then slowly lower your hips back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0138.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Box Jump Down With One Leg Stabilization', 'Legs', '1. Stand in front of a box or platform with your feet shoulder-width apart.
2. Bend your knees and jump onto the box, landing softly with one foot on the box and the other foot hanging off the edge.
3. Stabilize yourself on the box with the foot that is on it, while keeping the other foot off the ground.
4. Hold this position for a few seconds, engaging your calf muscles to maintain balance.
5. Slowly step down with the foot that is on the box, returning to the starting position.
6. Repeat the exercise with the other leg.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1374.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Bridge - Mountain Climber (cross Body)', 'Core', '1. Start in a high plank position with your hands directly under your shoulders and your body in a straight line.
2. Engage your core and lift your right foot off the ground, bringing your right knee towards your left elbow.
3. Return your right foot to the starting position and repeat the movement with your left foot towards your right elbow.
4. Continue alternating sides, moving at a controlled pace.
5. Keep your hips level and avoid lifting your hips too high or sagging them too low.
6. Maintain a steady breathing pattern throughout the exercise.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2466.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Burpee', 'Cardio', '1. Start in a standing position with your feet shoulder-width apart.
2. Lower your body into a squat position by bending your knees and placing your hands on the floor in front of you.
3. Kick your feet back into a push-up position.
4. Perform a push-up, keeping your body in a straight line.
5. Jump your feet back into the squat position.
6. Jump up explosively, reaching your arms overhead.
7. Land softly and immediately lower back into a squat position to begin the next repetition.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1160.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Butt-ups', 'Core', '1. Lie flat on your back with your knees bent and feet flat on the ground.
2. Place your hands by your sides, palms facing down.
3. Engaging your abs, lift your legs off the ground, bringing your knees towards your chest.
4. At the top of the movement, squeeze your abs and pause for a moment.
5. Slowly lower your legs back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0870.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Butterfly Yoga Pose', 'Legs', '1. Sit on the floor with your legs extended in front of you.
2. Bend your knees and bring the soles of your feet together, allowing your knees to fall out to the sides.
3. Hold onto your ankles or feet with your hands.
4. Sit up tall and lengthen your spine.
5. Gently press your knees down towards the floor, feeling a stretch in your inner thighs.
6. Hold this position for a few breaths.
7. To release, slowly bring your knees back up and extend your legs.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1494.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Alternate Shoulder Press', 'Shoulders', '1. Stand with your feet shoulder-width apart and grasp the handles of the cable machine with an overhand grip.
2. Position your hands at shoulder height, with your palms facing forward.
3. Keep your core engaged and your back straight.
4. Press one handle up and forward until your arm is fully extended.
5. Pause for a moment at the top, then slowly lower the handle back to the starting position.
6. Repeat with the other arm.
7. Alternate between arms for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0148.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Alternate Triceps Extension', 'Arms', '1. Stand facing the cable machine with your feet shoulder-width apart.
2. Hold the cable handle with your right hand and bring your arm up so that your upper arm is parallel to the ground and your elbow is bent at a 90-degree angle.
3. Keep your upper arm stationary and extend your forearm backward, fully straightening your arm.
4. Pause for a moment, then slowly return to the starting position.
5. Repeat with your left arm.
6. Continue alternating arms for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0149.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Assisted Inverse Leg Curl', 'Legs', '1. Adjust the cable machine so that the ankle attachment is at the lowest setting.
2. Lie face down on the bench with your legs straight and the ankle attachment secured to your ankles.
3. Hold onto the handles of the bench for stability.
4. Keeping your upper body stationary, exhale and curl your legs up towards your glutes by flexing your knees.
5. Pause for a moment at the top of the movement, squeezing your hamstrings.
6. Inhale and slowly lower your legs back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3235.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Bar Lateral Pulldown', 'Back', '1. Adjust the cable pulley to a high position and attach a straight bar.
2. Sit facing the cable machine with your feet flat on the ground and your knees slightly bent.
3. Grasp the bar with an overhand grip, slightly wider than shoulder-width apart.
4. Lean back slightly and keep your chest up, maintaining a slight arch in your lower back.
5. Pull the bar down towards your chest, leading with your elbows and squeezing your shoulder blades together.
6. Pause for a moment at the bottom of the movement, then slowly return the bar to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0150.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Bench Press', 'Chest', '1. Adjust the cable machine to chest height and attach the handles.
2. Stand facing away from the machine with your feet shoulder-width apart.
3. Grasp the handles with an overhand grip and step forward to create tension in the cables.
4. Position your feet firmly on the ground and engage your core.
5. Bend your elbows and bring your hands to shoulder level, keeping your elbows at a 90-degree angle.
6. Push the handles forward, extending your arms fully in front of you.
7. Pause for a moment, then slowly reverse the movement, bringing your hands back to shoulder level.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0151.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Close Grip Curl', 'Arms', '1. Attach a straight bar to a low pulley cable machine.
2. Stand facing the machine with your feet shoulder-width apart and your knees slightly bent.
3. Grasp the bar with an underhand grip, hands shoulder-width apart.
4. Keep your elbows close to your sides and your upper arms stationary throughout the exercise.
5. Exhale and curl the bar up towards your shoulders, contracting your biceps.
6. Pause for a moment at the top of the movement, squeezing your biceps.
7. Inhale and slowly lower the bar back to the starting position, fully extending your arms.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1630.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Concentration Curl', 'Arms', '1. Sit on a bench or chair with your feet flat on the floor and your knees slightly bent.
2. Hold the cable handle with an underhand grip and rest your elbow against the inside of your thigh.
3. Keeping your upper arm stationary, exhale and curl the cable handle towards your shoulder while contracting your biceps.
4. Pause for a moment at the top of the movement, then inhale and slowly lower the cable handle back to the starting position.
5. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1631.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Concentration Extension (on Knee)', 'Arms', '1. Sit on a bench or chair with your knees bent and feet flat on the ground.
2. Hold the cable handle with your right hand and place your elbow on the inside of your right knee.
3. Extend your arm fully, keeping your elbow stationary and close to your knee.
4. Pause for a moment at the top, then slowly lower your arm back to the starting position.
5. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0152.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Cross-over Lateral Pulldown', 'Back', '1. Attach a cable handle to each side of a cable machine at shoulder height.
2. Stand in the middle of the machine with your feet shoulder-width apart.
3. Grasp the handles with an overhand grip and step back to create tension in the cables.
4. Lean forward slightly from the hips, keeping your back straight and your chest up.
5. Pull the handles down and across your body, squeezing your shoulder blades together.
6. Pause for a moment at the bottom of the movement, then slowly return to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0153.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Cross-over Revers Fly', 'Shoulders', '1. Attach a D-handle to each low pulley cable and stand in the middle of the cable crossover machine.
2. Grasp the handles with a pronated grip (palms facing down) and take a step forward, positioning your feet shoulder-width apart.
3. Bend your knees slightly and lean forward at the waist, keeping your back straight and your abs engaged.
4. With your arms extended out to the sides and slightly bent at the elbows, exhale and squeeze your shoulder blades together as you pull the cables back and upward in a reverse fly motion.
5. Pause for a moment at the peak contraction, then inhale and slowly return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0154.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Cross-over Variation', 'Chest', '1. Adjust the cable pulleys to chest height.
2. Stand in the center of the cable machine with one foot in front of the other.
3. Grasp the handles with your palms facing down and your arms extended out to the sides.
4. Take a step forward, keeping your arms slightly bent.
5. With a slight bend in your elbows, bring your hands together in front of your chest.
6. Pause for a moment, then slowly return your arms back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0155.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Curl', 'Arms', '1. Stand facing the cable machine with your feet shoulder-width apart.
2. Grasp the cable attachment with an underhand grip, palms facing up.
3. Keep your elbows close to your sides and your upper arms stationary.
4. Exhale and curl the cable attachment towards your shoulders, contracting your biceps.
5. Pause for a moment at the top of the movement, squeezing your biceps.
6. Inhale and slowly lower the cable attachment back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0868.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Deadlift', 'Legs', '1. Stand facing the cable machine with your feet shoulder-width apart.
2. Bend at the hips and knees, lowering your torso until your back is parallel to the ground.
3. Grasp the cable handles with an overhand grip, keeping your arms straight and your shoulders back.
4. Engage your glutes and hamstrings to lift the cable handles, extending your hips and standing up straight.
5. Pause for a moment at the top, then slowly lower the cable handles back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0157.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Decline Fly', 'Chest', '1. Adjust the cable machine to a decline position.
2. Stand facing away from the machine with your feet shoulder-width apart.
3. Hold the handles with your palms facing forward and your arms extended straight out in front of you.
4. Keeping a slight bend in your elbows, open your arms out to the sides in a controlled motion.
5. Pause for a moment at the fully extended position, then slowly return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0158.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Decline One Arm Press', 'Chest', '1. Adjust the cable machine to a decline position.
2. Stand facing away from the machine and grab the handle with one hand.
3. Position yourself with your back against the decline bench and your arm extended straight in front of you.
4. Bend your elbow and lower the handle towards your chest while keeping your upper arm stationary.
5. Pause for a moment at the bottom, then push the handle back up to the starting position.
6. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1260.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Decline Press', 'Chest', '1. Adjust the cable machine to a decline position.
2. Sit on the decline bench facing the cable machine.
3. Grasp the handles with an overhand grip and position them at chest level.
4. Keep your feet flat on the ground and your back firmly against the bench.
5. Exhale and push the handles away from your body, extending your arms fully.
6. Pause for a moment at the end of the movement, squeezing your chest muscles.
7. Inhale and slowly return the handles back to the starting position.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1261.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Decline Seated Wide-grip Row', 'Back', '1. Sit on the decline bench facing the cable machine with your feet securely placed on the footrests.
2. Grasp the cable attachment with a wide overhand grip, palms facing down.
3. Lean back slightly, keeping your back straight and your core engaged.
4. Pull the cable towards your lower chest, squeezing your shoulder blades together.
5. Pause for a moment at the peak of the contraction, then slowly release the cable back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0159.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Drag Curl', 'Arms', '1. Stand facing a cable machine with your feet shoulder-width apart.
2. Grasp the cable attachment with an underhand grip, palms facing up, and arms fully extended.
3. Keeping your upper arms stationary, exhale and curl the cable attachment towards your shoulders by contracting your biceps.
4. Pause for a moment at the top of the movement, squeezing your biceps.
5. Inhale and slowly lower the cable attachment back to the starting position, fully extending your arms.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1632.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Floor Seated Wide-grip Row', 'Back', '1. Sit on the floor with your legs extended and your back straight.
2. Attach a cable handle to a low pulley and position the cable machine behind you.
3. Grasp the handle with a wide overhand grip, palms facing down.
4. Lean back slightly, keeping your back straight and your chest lifted.
5. Pull the handle towards your waist, squeezing your shoulder blades together.
6. Pause for a moment at the top of the movement, then slowly release the handle back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0160.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Forward Raise', 'Shoulders', '1. Stand with your feet shoulder-width apart and your knees slightly bent.
2. Hold the cable handle with an overhand grip, palms facing down, and your arms fully extended in front of you.
3. Keeping your arms straight, raise the cable handle up to shoulder level.
4. Pause for a moment at the top, then slowly lower the cable handle back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0161.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Front Raise', 'Shoulders', '1. Stand with your feet shoulder-width apart and grasp the cable handle with an overhand grip.
2. Keep your back straight and your core engaged.
3. Raise the cable handle in front of you, keeping your arms straight and your palms facing down.
4. Continue lifting until your arms are parallel to the floor.
5. Pause for a moment at the top, then slowly lower the cable handle back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0162.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Front Shoulder Raise', 'Shoulders', '1. Stand with your feet shoulder-width apart and grasp the cable handle with an overhand grip.
2. Keep your back straight and your core engaged.
3. Raise the cable handle in front of you, keeping your arms straight and your palms facing down.
4. Continue lifting until your arms are parallel to the floor.
5. Pause for a moment at the top, then slowly lower the cable handle back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0164.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Hammer Curl (with Rope)', 'Arms', '1. Stand upright with your feet shoulder-width apart and a slight bend in your knees.
2. Hold the cable rope attachment with an underhand grip, palms facing each other, and your arms fully extended.
3. Keeping your upper arms stationary, exhale and curl the weights while contracting your biceps.
4. Continue to raise the cable rope attachment until your biceps are fully contracted and the rope is at shoulder level.
5. Hold the contracted position for a brief pause as you squeeze your biceps.
6. Inhale and slowly begin to lower the cable rope attachment back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0165.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable High Pulley Overhead Tricep Extension', 'Arms', '1. Attach a rope to a high pulley and stand facing away from the machine.
2. Grasp the rope with both hands and extend your arms overhead.
3. Keep your elbows close to your head and your upper arms stationary.
4. Slowly lower the rope behind your head by bending your elbows.
5. Pause for a moment, then extend your arms back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1722.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable High Row (kneeling)', 'Back', '1. Attach a straight bar to a cable machine at chest height.
2. Kneel down in front of the cable machine and grab the bar with an overhand grip, hands shoulder-width apart.
3. Sit back on your heels, keeping your back straight and your core engaged.
4. Pull the bar towards your upper abdomen, squeezing your shoulder blades together.
5. Pause for a moment at the top of the movement, then slowly release the bar back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0167.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Hip Adduction', 'Legs', '1. Attach the ankle cuff to your ankle and stand facing the cable machine.
2. Position yourself far enough away from the machine so that there is tension on the cable.
3. Place your hands on the machine for support.
4. Keeping your leg straight, slowly move your leg across your body towards the midline.
5. Pause for a moment at the end of the movement, then slowly return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0168.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Incline Bench Press', 'Chest', '1. Adjust the bench to a 45-degree incline.
2. Attach the cable handles to the high pulleys.
3. Sit on the bench facing the cable machine with your feet flat on the ground.
4. Grasp the handles with an overhand grip and bring them to shoulder height.
5. Push the handles forward and upward until your arms are fully extended.
6. Pause for a moment, then slowly lower the handles back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0169.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Incline Bench Row', 'Back', '1. Set up an incline bench at a 45-degree angle and attach a cable handle to the low pulley.
2. Sit on the bench facing the cable machine with your feet flat on the floor and your knees slightly bent.
3. Grasp the cable handle with an overhand grip and extend your arms fully in front of you.
4. Lean forward from your hips while keeping your back straight and your core engaged.
5. Pull the cable handle towards your chest by retracting your shoulder blades and bending your elbows.
6. Squeeze your back muscles at the top of the movement, then slowly extend your arms back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1318.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Incline Fly', 'Chest', '1. Adjust the cable machine to a low position and attach the handles.
2. Sit on an incline bench with your back against the pad and feet flat on the floor.
3. Grasp the handles with an overhand grip and extend your arms straight out in front of you.
4. Keeping a slight bend in your elbows, open your arms out to the sides in a controlled motion.
5. Pause for a moment at the fully extended position, then slowly return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0171.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Incline Fly (on Stability Ball)', 'Chest', '1. Set up a stability ball at an incline angle.
2. Attach the cable handles to the high pulleys of a cable machine.
3. Sit on the stability ball facing away from the machine, with your feet firmly planted on the ground.
4. Grasp the cable handles with an overhand grip, palms facing forward.
5. Lean forward slightly, keeping your back straight and core engaged.
6. With a controlled motion, bring your arms out to the sides, keeping a slight bend in your elbows.
7. Continue the motion until your arms are parallel to the ground.
8. Pause for a moment, then slowly return to the starting position.
9. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0170.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Incline Pushdown', 'Back', '1. Attach a straight bar to a high pulley cable machine.
2. Stand facing away from the machine with your feet shoulder-width apart.
3. Grasp the bar with an overhand grip, hands slightly wider than shoulder-width apart.
4. Lean forward slightly and keep your back straight.
5. Pull the bar down towards your thighs by extending your elbows.
6. Pause for a moment at the bottom, then slowly return the bar to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0172.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Incline Triceps Extension', 'Arms', '1. Adjust the cable machine to a low pulley position.
2. Attach a straight bar to the cable.
3. Stand facing away from the machine with your feet shoulder-width apart.
4. Grasp the bar with an overhand grip and extend your arms straight overhead.
5. Lean forward slightly, keeping your back straight and core engaged.
6. Bend your elbows and lower the bar behind your head, keeping your upper arms close to your ears.
7. Pause for a moment, then extend your arms back to the starting position.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0173.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Judo Flip', 'Core', '1. Stand facing the cable machine with your feet shoulder-width apart.
2. Hold the cable handle with both hands at chest level, palms facing down.
3. Engage your core and rotate your torso to the right, pulling the cable across your body.
4. As you rotate, pivot your back foot and allow your hips to rotate naturally.
5. Extend your arms fully and finish the movement by flipping the cable handle over your shoulder.
6. Return to the starting position by reversing the movement, rotating your torso back to the center.
7. Repeat the movement on the opposite side.
8. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0174.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Kickback', 'Arms', '1. Stand facing a cable machine with your feet shoulder-width apart.
2. Hold the cable handle with your right hand and step back to create tension in the cable.
3. Bend your knees slightly and hinge forward at the hips, keeping your back straight.
4. Keep your upper arm close to your body and your elbow bent at a 90-degree angle.
5. Extend your forearm backward, straightening your arm fully.
6. Pause for a moment, then slowly return to the starting position.
7. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0860.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Kneeling Crunch', 'Core', '1. Attach a rope handle to a high pulley and kneel down facing away from the machine.
2. Hold the rope handle with both hands and place it behind your head, keeping your elbows out to the sides.
3. Keeping your hips stationary, flex your waist and crunch your torso down towards your thighs.
4. Pause for a moment at the bottom, then slowly return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0175.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Kneeling Rear Delt Row (with Rope) (male)', 'Shoulders', '1. Attach a rope handle to a low cable pulley and kneel down facing the machine.
2. Grasp the rope with a neutral grip (palms facing each other) and extend your arms fully in front of you.
3. Keeping your back straight and core engaged, pull the rope towards your body by retracting your shoulder blades.
4. Squeeze your shoulder blades together at the end of the movement and hold for a brief pause.
5. Slowly release the tension and return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3697.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Kneeling Triceps Extension', 'Arms', '1. Attach a rope handle to a high pulley and kneel down facing the cable machine.
2. Grasp the rope with a neutral grip (palms facing each other) and bring your hands to the sides of your head.
3. Keep your elbows close to your head and your upper arms stationary throughout the exercise.
4. Extend your forearms by contracting your triceps until your arms are fully extended.
5. Pause for a moment, then slowly return to the starting position by bending your elbows.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0176.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Lat Pulldown Full Range Of Motion', 'Back', '1. Sit on the lat pulldown machine with your knees positioned under the pads.
2. Grasp the cable bar with an overhand grip, slightly wider than shoulder-width apart.
3. Lean back slightly and keep your chest up, maintaining a slight arch in your lower back.
4. Pull the bar down towards your upper chest, squeezing your shoulder blades together.
5. Pause for a moment at the bottom of the movement, then slowly release the bar back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2330.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Lateral Pulldown (with Rope Attachment)', 'Back', '1. Attach a rope attachment to the cable machine at a high position.
2. Stand facing the machine with your feet shoulder-width apart.
3. Grasp the rope with an overhand grip, palms facing each other.
4. Keep your back straight and lean slightly back.
5. Pull the rope down towards your sides, squeezing your shoulder blades together.
6. Pause for a moment at the bottom of the movement.
7. Slowly release the tension and allow the rope to return to the starting position.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0177.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Lateral Pulldown With V-bar', 'Back', '1. Sit down on the cable pulldown machine and grab the v-bar attachment with an overhand grip.
2. Adjust the knee pad so that your thighs are secured under it.
3. Keep your back straight and lean back slightly.
4. Pull the v-bar down towards your upper chest while keeping your elbows close to your body.
5. Squeeze your back muscles at the bottom of the movement.
6. Slowly return the v-bar to the starting position and repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2616.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Lateral Raise', 'Shoulders', '1. Stand with your feet shoulder-width apart and grasp the cable handles with an overhand grip.
2. Keep your arms straight and your core engaged.
3. Raise your arms out to the sides until they are parallel to the floor.
4. Pause for a moment at the top, then slowly lower your arms back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0178.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Low Fly', 'Chest', '1. Attach the handles to the low pulleys of a cable machine and select an appropriate weight.
2. Stand in the middle of the machine with your feet shoulder-width apart and a slight bend in your knees.
3. Grasp the handles with an overhand grip and extend your arms out to the sides, keeping a slight bend in your elbows.
4. Maintaining control, slowly bring your arms forward in a sweeping motion, crossing them in front of your body.
5. Pause for a moment at the peak of the movement, feeling the stretch in your chest muscles.
6. Reverse the motion and slowly return your arms to the starting position, keeping tension on your chest muscles throughout.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0179.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Low Seated Row', 'Back', '1. Sit on the machine with your feet flat on the footrests and your knees slightly bent.
2. Grasp the handles with an overhand grip, palms facing down.
3. Keep your back straight and lean slightly forward, maintaining a slight bend in your elbows.
4. Pull the handles towards your body, squeezing your shoulder blades together.
5. Pause for a moment at the peak of the movement, then slowly release the handles back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0180.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Lying Bicep Curl', 'Arms', '1. Attach a straight bar to a low pulley cable machine.
2. Lie face up on a flat bench with your feet flat on the ground.
3. Grasp the bar with an underhand grip, hands shoulder-width apart.
4. Extend your arms fully, keeping your elbows close to your sides.
5. Keeping your upper arms stationary, exhale and curl the bar up towards your shoulders.
6. Pause for a moment at the top, squeezing your biceps.
7. Inhale and slowly lower the bar back to the starting position, fully extending your arms.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1634.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Lying Close-grip Curl', 'Arms', '1. Attach a straight bar to a low pulley cable machine.
2. Lie face up on a flat bench with your feet flat on the ground.
3. Grasp the bar with an underhand grip, hands shoulder-width apart.
4. Extend your arms fully, keeping your elbows close to your sides.
5. Keeping your upper arms stationary, curl the bar towards your chest by contracting your biceps.
6. Pause for a moment at the top, squeezing your biceps.
7. Slowly lower the bar back to the starting position, fully extending your arms.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0182.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Lying Extension Pullover (with Rope Attachment)', 'Back', '1. Attach a rope to a cable machine and set the pulley at the highest position.
2. Lie down on a bench with your head towards the cable machine.
3. Hold the rope with both hands and extend your arms straight up above your chest.
4. Keeping your arms straight, slowly lower the rope behind your head while maintaining control.
5. Pause for a moment at the bottom, then slowly raise the rope back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0184.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Lying Fly', 'Chest', '1. Attach the handles to the cables and lie flat on a bench with your feet flat on the ground.
2. Hold the handles with your palms facing each other and your arms extended straight above your chest.
3. Keeping a slight bend in your elbows, lower your arms out to the sides in a wide arc until you feel a stretch in your chest.
4. Pause for a moment, then squeeze your chest muscles to bring your arms back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0185.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Lying Triceps Extension V. 2', 'Arms', '1. Attach a rope handle to a low pulley cable machine.
2. Lie down on a flat bench facing up, with your head towards the cable machine.
3. Grasp the rope handle with both hands, palms facing each other, and extend your arms straight up over your chest.
4. Keeping your upper arms stationary, slowly lower the rope handle towards your forehead by bending your elbows.
5. Pause for a moment at the bottom, then extend your arms back up to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0186.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Middle Fly', 'Chest', '1. Attach cables to both sides of a cable machine at chest height.
2. Stand in the center of the machine with one foot slightly in front of the other.
3. Grasp the handles with an overhand grip and extend your arms out to the sides.
4. Keep a slight bend in your elbows and maintain a slight forward lean.
5. Engage your chest muscles and bring your arms forward in a sweeping motion.
6. Pause for a moment at the center, then slowly return your arms back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0188.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable One Arm Bent Over Row', 'Back', '1. Stand facing a cable machine with your feet shoulder-width apart.
2. Bend your knees slightly and hinge forward at the hips, keeping your back straight.
3. Grasp the cable handle with one hand, palm facing inward, and extend your arm fully.
4. Pull the cable handle towards your body, keeping your elbow close to your side, until your hand reaches your lower chest.
5. Pause for a moment, then slowly extend your arm back to the starting position.
6. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0189.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable One Arm Curl', 'Arms', '1. Stand facing the cable machine with your feet shoulder-width apart.
2. Grasp the cable handle with an underhand grip, palm facing up.
3. Keep your elbow close to your side and slowly curl your forearm up towards your shoulder.
4. Pause for a moment at the top, then slowly lower your forearm back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0190.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable One Arm Decline Chest Fly', 'Chest', '1. Attach a D-handle to a low pulley cable machine and set the bench to a decline angle.
2. Lie down on the bench with your head towards the machine and grab the handle with your right hand.
3. Extend your arm straight up above your chest, keeping a slight bend in your elbow.
4. With a controlled motion, lower your arm out to the side until your hand is in line with your shoulder.
5. Pause for a moment, then reverse the motion and bring your arm back to the starting position.
6. Repeat for the desired number of repetitions, then switch to your left arm and repeat the exercise.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1262.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable One Arm Fly On Exercise Ball', 'Chest', '1. Sit on an exercise ball with your feet flat on the ground and your back straight.
2. Hold a cable handle in one hand and extend your arm out to the side, parallel to the ground.
3. Keep your elbow slightly bent and your palm facing forward.
4. Slowly bring your arm across your body, squeezing your chest muscles.
5. Pause for a moment at the end of the movement, then slowly return to the starting position.
6. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1263.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable One Arm Incline Fly On Exercise Ball', 'Chest', '1. Sit on an exercise ball with your feet flat on the ground and your back against an incline bench.
2. Hold a cable handle in one hand with your arm extended and palm facing inward.
3. Keeping a slight bend in your elbow, slowly lower your arm out to the side until your hand is in line with your shoulder.
4. Pause for a moment, then squeeze your chest muscles to bring your arm back to the starting position.
5. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1264.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable One Arm Incline Press', 'Chest', '1. Adjust the cable machine to a low pulley position.
2. Sit on an incline bench facing away from the cable machine.
3. Grasp the handle with one hand and bring it up to shoulder height.
4. Position your feet firmly on the ground and maintain a stable position.
5. Press the handle forward and upward, extending your arm fully.
6. Pause for a moment at the top, then slowly lower the handle back to the starting position.
7. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1265.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable One Arm Incline Press On Exercise Ball', 'Chest', '1. Sit on an exercise ball with your feet flat on the ground and your back resting against an incline bench.
2. Hold a cable handle in one hand and position your arm at a 90-degree angle with your elbow bent.
3. Press the cable handle forward and upward, extending your arm fully.
4. Pause for a moment at the top, then slowly lower the cable handle back to the starting position.
5. Repeat for the desired number of repetitions, then switch to the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1266.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable One Arm Lateral Bent-over', 'Chest', '1. Stand with your feet shoulder-width apart, facing a cable machine.
2. Grasp the handle with one hand and step back to create tension on the cable.
3. Bend forward at the waist, keeping your back straight and your core engaged.
4. Extend your arm out to the side, parallel to the ground, with a slight bend in your elbow.
5. Slowly bring your arm back to the starting position, maintaining control throughout the movement.
6. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0191.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable One Arm Lateral Raise', 'Shoulders', '1. Stand with your feet shoulder-width apart, facing the cable machine.
2. Hold the cable handle with one hand, palm facing down, and stand far enough away from the machine so that there is tension on the cable.
3. Keep your arm straight and slowly raise it out to the side until it is parallel to the ground.
4. Pause for a moment at the top, then slowly lower your arm back down to the starting position.
5. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0192.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable One Arm Preacher Curl', 'Arms', '1. Adjust the cable machine so that the preacher curl pad is at chest height.
2. Stand facing the cable machine with your feet shoulder-width apart.
3. Grasp the cable handle with an underhand grip and position your upper arm against the preacher curl pad.
4. Keep your back straight and your core engaged.
5. Slowly curl the cable handle towards your shoulder, keeping your upper arm against the pad.
6. Pause for a moment at the top of the movement, squeezing your biceps.
7. Slowly lower the cable handle back to the starting position.
8. Repeat for the desired number of repetitions.
9. Switch arms and repeat the exercise.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1633.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable One Arm Press On Exercise Ball', 'Chest', '1. Sit on an exercise ball with your feet flat on the ground and your back straight.
2. Hold a cable handle in one hand and position your arm at chest height, elbow bent.
3. Place your other hand on your hip for stability.
4. Press the cable handle forward, extending your arm fully.
5. Pause for a moment, then slowly return to the starting position.
6. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1267.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable One Arm Pulldown', 'Back', '1. Attach a single handle to a high pulley cable machine.
2. Stand facing the machine with your feet shoulder-width apart.
3. Grasp the handle with an overhand grip and extend your arm fully.
4. Keep your back straight and your core engaged.
5. Pull the handle down towards your side while keeping your elbow close to your body.
6. Pause for a moment at the bottom of the movement, squeezing your lat muscle.
7. Slowly release the handle back to the starting position.
8. Repeat for the desired number of repetitions.
9. Switch sides and repeat the exercise with the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3563.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable One Arm Reverse Preacher Curl', 'Arms', '1. Adjust the cable machine so that the pulley is at the lowest position.
2. Stand facing the cable machine with your feet shoulder-width apart.
3. Grasp the cable handle with an underhand grip and position your upper arm against the preacher bench pad.
4. Keep your back straight and your core engaged throughout the exercise.
5. Slowly curl your forearm towards your bicep, keeping your upper arm stationary against the pad.
6. Pause for a moment at the top of the movement, squeezing your bicep.
7. Slowly lower the cable handle back to the starting position.
8. Repeat for the desired number of repetitions.
9. Switch arms and repeat the exercise.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1635.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable One Arm Straight Back High Row (kneeling)', 'Back', '1. Attach a handle to a cable machine at waist height.
2. Kneel down facing the cable machine and grab the handle with one hand.
3. Keep your back straight and your core engaged.
4. Pull the handle towards your chest, squeezing your shoulder blades together.
5. Pause for a moment at the top of the movement.
6. Slowly release the handle back to the starting position.
7. Repeat for the desired number of repetitions.
8. Switch sides and repeat the exercise with the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0193.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable One Arm Tricep Pushdown', 'Arms', '1. Stand facing a cable machine with a straight bar attachment at chest height.
2. Grasp the bar with an overhand grip and step back to create tension in the cable.
3. Position your feet shoulder-width apart and slightly bend your knees.
4. Keep your back straight and core engaged throughout the exercise.
5. Start with your arm fully extended and perpendicular to the floor.
6. Keeping your upper arm stationary, exhale and push the bar down until your arm is fully extended.
7. Pause for a moment, then inhale and slowly return to the starting position.
8. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1723.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Overhead Curl', 'Arms', '1. Attach a straight bar to a high pulley cable machine.
2. Stand facing the machine with your feet shoulder-width apart.
3. Grasp the bar with an underhand grip, hands shoulder-width apart.
4. Keep your elbows close to your sides and your upper arms stationary.
5. Exhale and curl the bar down towards your forehead, keeping your upper arms stationary.
6. Pause for a moment at the bottom of the movement, squeezing your biceps.
7. Inhale and slowly return the bar to the starting position, fully extending your arms.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1636.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Overhead Curl On Exercise Ball', 'Arms', '1. Sit on an exercise ball and hold the cable handle with an underhand grip.
2. Extend your arms fully overhead, keeping your elbows close to your ears.
3. Slowly curl the cable down towards your forehead, keeping your upper arms stationary.
4. Pause for a moment at the bottom of the movement, then slowly return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1637.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Overhead Triceps Extension (rope Attachment)', 'Arms', '1. Attach a rope to a cable machine at a high position.
2. Stand facing away from the machine with your feet shoulder-width apart.
3. Grasp the rope with both hands, palms facing each other, and bring your hands above your head.
4. Keep your upper arms close to your head and your elbows pointing forward.
5. Slowly lower the rope behind your head by bending your elbows.
6. Pause for a moment, then extend your arms back up to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0194.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Palm Rotational Row', 'Back', '1. Attach a handle to a cable machine at waist height.
2. Stand facing the machine with your feet shoulder-width apart.
3. Grasp the handle with an overhand grip, palms facing down.
4. Step back to create tension on the cable, keeping your back straight and knees slightly bent.
5. Pull the handle towards your body, rotating your palms to face upwards as you do so.
6. Squeeze your shoulder blades together at the end of the movement.
7. Slowly release the handle back to the starting position.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1319.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Preacher Curl', 'Arms', '1. Adjust the cable machine so that the preacher curl pad is at chest height.
2. Sit on the preacher curl bench and place your upper arms on the pad, gripping the cable attachment with an underhand grip.
3. Keep your back straight and your elbows tucked in at your sides.
4. Slowly curl the cable attachment up towards your shoulders, squeezing your biceps at the top of the movement.
5. Pause for a moment, then slowly lower the cable attachment back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0195.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Press On Exercise Ball', 'Chest', '1. Sit on an exercise ball with your feet flat on the ground and your knees at a 90-degree angle.
2. Hold the cable handles at chest height with your palms facing down and your elbows bent.
3. Engage your core and press the cable handles forward until your arms are fully extended.
4. Pause for a moment, then slowly release the tension and bring the cable handles back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1268.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Pull Through (with Rope)', 'Legs', '1. Stand facing away from the cable machine with your feet shoulder-width apart.
2. Grab the rope attachment with both hands and step forward, creating tension in the cable.
3. Bend at the hips and lower your upper body until it is parallel to the ground, keeping your back straight.
4. Engage your glutes and hamstrings to pull your body back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0196.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Pulldown', 'Back', '1. Adjust the cable pulldown machine so that the seat is at a comfortable height and the knee pad is secured.
2. Sit on the seat with your back straight and your feet flat on the ground.
3. Grasp the cable bar with an overhand grip, slightly wider than shoulder-width apart.
4. Lean back slightly and engage your core.
5. Pull the cable bar down towards your chest, squeezing your shoulder blades together.
6. Pause for a moment at the bottom of the movement, then slowly release the bar back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0198.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Pulldown (pro Lat Bar)', 'Back', '1. Adjust the seat height so that your thighs are parallel to the ground and your feet are flat on the floor.
2. Grasp the lat bar with an overhand grip, slightly wider than shoulder-width apart.
3. Sit down and lean back slightly, keeping your chest up and your back straight.
4. Pull the bar down towards your chest, squeezing your shoulder blades together.
5. Pause for a moment at the bottom of the movement, then slowly release the bar back up to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0197.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Pulldown Bicep Curl', 'Arms', '1. Attach a straight bar to the cable machine at the highest setting.
2. Stand facing the machine with your feet shoulder-width apart.
3. Grasp the bar with an underhand grip, hands shoulder-width apart.
4. Keep your elbows close to your sides and your upper arms stationary.
5. Exhale and slowly curl the bar down towards your thighs, keeping your wrists straight.
6. Pause for a moment at the bottom of the movement, squeezing your biceps.
7. Inhale and slowly return the bar to the starting position, fully extending your arms.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1638.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Pushdown', 'Arms', '1. Attach a straight bar to a high pulley cable machine.
2. Stand facing the machine with your feet shoulder-width apart and a slight bend in your knees.
3. Grasp the bar with an overhand grip, hands shoulder-width apart.
4. Keep your elbows close to your sides and your upper arms stationary.
5. Exhale and push the bar down until your elbows are fully extended.
6. Pause for a moment, then inhale and slowly return the bar to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0201.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Pushdown (straight Arm) V. 2', 'Back', '1. Attach a straight bar to a high pulley cable machine.
2. Stand facing the machine with your feet shoulder-width apart and a slight bend in your knees.
3. Grasp the bar with an overhand grip, keeping your arms straight and your palms facing down.
4. Engage your core and keep your back straight as you exhale and push the bar down towards your thighs.
5. Pause for a moment at the bottom, then slowly return the bar to the starting position while inhaling.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0199.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Pushdown (with Rope Attachment)', 'Arms', '1. Attach a rope attachment to a high pulley on a cable machine.
2. Stand facing the machine with your feet shoulder-width apart and a slight bend in your knees.
3. Grasp the rope with an overhand grip, palms facing each other.
4. Keep your elbows close to your sides and your upper arms stationary throughout the exercise.
5. Exhale and push the rope downward by extending your elbows until your arms are fully extended.
6. Pause for a moment, then inhale and slowly return to the starting position by allowing your elbows to flex.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0200.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Rear Delt Row (stirrups)', 'Shoulders', '1. Attach a stirrup handle to a low cable pulley and stand facing the machine.
2. Grasp the handle with your left hand and take a step back with your right foot, positioning your body at a slight angle.
3. Bend your knees slightly and hinge forward at the hips, keeping your back straight and your core engaged.
4. With your left arm extended and your palm facing down, pull the handle towards your chest by retracting your shoulder blade.
5. Pause for a moment at the top of the movement, squeezing your shoulder blade.
6. Slowly release the handle back to the starting position and repeat for the desired number of repetitions.
7. Switch sides and repeat the exercise with your right arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0202.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Rear Delt Row (with Rope)', 'Shoulders', '1. Attach a rope handle to a low pulley cable machine.
2. Stand facing the machine with your feet shoulder-width apart.
3. Grasp the rope handle with an overhand grip, palms facing each other.
4. Bend your knees slightly and hinge forward at the hips, keeping your back straight.
5. Keep your elbows slightly bent and pull the rope towards your chest, squeezing your shoulder blades together.
6. Pause for a moment at the top of the movement, then slowly release the tension and return to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0203.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Rear Drive', 'Arms', '1. Attach a handle to a low pulley cable machine and stand facing away from the machine.
2. Grasp the handle with an overhand grip and extend your arms straight out in front of you.
3. Keeping your elbows stationary, pull the handle back towards your body, squeezing your triceps at the end of the movement.
4. Slowly return the handle to the starting position and repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0204.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Rear Pulldown', 'Back', '1. Adjust the cable machine so that the pulley is at the highest position.
2. Sit facing the machine with your feet flat on the ground and your knees slightly bent.
3. Grasp the cable attachment with an overhand grip, hands slightly wider than shoulder-width apart.
4. Lean back slightly, keeping your back straight and your chest up.
5. Pull the cable attachment down towards your chest, squeezing your shoulder blades together.
6. Pause for a moment at the bottom of the movement, then slowly release the cable back up to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0205.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Reverse Crunch', 'Core', '1. Attach a cable to a low pulley and lie down facing up on a mat.
2. Hold the cable with both hands and extend your arms straight up towards the ceiling.
3. Bend your knees and lift your legs up, bringing your thighs towards your chest.
4. While keeping your upper body stable, curl your pelvis up towards your chest, lifting your hips off the mat.
5. Pause for a moment at the top, then slowly lower your hips back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0873.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Reverse Curl', 'Arms', '1. Attach a straight bar to a low pulley cable machine.
2. Stand facing the machine with your feet shoulder-width apart and your knees slightly bent.
3. Grasp the bar with an underhand grip, hands shoulder-width apart.
4. Keep your elbows close to your sides and your upper arms stationary throughout the exercise.
5. Exhale and curl the bar up towards your shoulders, contracting your biceps.
6. Pause for a moment at the top, squeezing your biceps.
7. Inhale and slowly lower the bar back to the starting position, fully extending your arms.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0206.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Reverse Grip Triceps Pushdown (sz-bar) (with Arm Blaster)', 'Arms', '1. Attach a straight bar to the cable machine at the highest setting.
2. Stand facing the cable machine with your feet shoulder-width apart.
3. Grasp the bar with an underhand grip, palms facing up, and your hands shoulder-width apart.
4. Keep your elbows close to your sides and your upper arms stationary throughout the exercise.
5. Engage your triceps and slowly push the bar down until your arms are fully extended.
6. Pause for a moment at the bottom, then slowly return the bar to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2406.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Reverse One Arm Curl', 'Arms', '1. Stand facing a cable machine with your feet shoulder-width apart.
2. Grasp the cable handle with an underhand grip, palm facing down.
3. Keep your elbow close to your side and slowly curl your forearm up towards your shoulder.
4. Pause for a moment at the top, then slowly lower your forearm back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1413.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Reverse Preacher Curl', 'Arms', '1. Adjust the cable machine so that the preacher curl pad is at chest height.
2. Sit on the preacher curl bench and place your upper arms on the pad, with your palms facing down and your elbows fully extended.
3. Grab the cable handles with an underhand grip, shoulder-width apart.
4. Keeping your upper arms stationary, exhale and curl the handles towards your shoulders, contracting your biceps.
5. Pause for a moment at the top of the movement, squeezing your biceps.
6. Inhale and slowly lower the handles back to the starting position, fully extending your elbows.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0209.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Reverse Wrist Curl', 'Arms', '1. Attach a cable to a low pulley and sit on a bench facing the cable machine.
2. Grasp the cable handle with an overhand grip, palms facing down.
3. Rest your forearms on your thighs, with your wrists hanging off the edge.
4. Keeping your forearms stationary, exhale and curl your wrists upward as far as possible.
5. Pause for a moment at the top, then inhale and slowly lower your wrists back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0210.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Reverse-grip Pushdown', 'Arms', '1. Attach a straight bar to a high pulley cable machine.
2. Stand facing the machine with your feet shoulder-width apart.
3. Grasp the bar with an underhand grip, palms facing up, and your hands shoulder-width apart.
4. Keep your elbows close to your sides and your upper arms stationary throughout the exercise.
5. Using your triceps, push the bar down until your arms are fully extended and your triceps are contracted.
6. Pause for a moment, then slowly return the bar to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0207.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Reverse-grip Straight Back Seated High Row', 'Back', '1. Sit on the seat facing the cable machine with your feet flat on the floor.
2. Grasp the cable attachment with an underhand grip, palms facing up, and your hands shoulder-width apart.
3. Keep your back straight and lean slightly forward from your hips.
4. Pull the cable towards your torso by retracting your shoulder blades and squeezing your back muscles.
5. Pause for a moment at the peak of the contraction, then slowly release the cable back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0208.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Rope Crossover Seated Row', 'Back', '1. Sit on the rowing machine with your feet flat on the footrests and your knees slightly bent.
2. Grasp the cable ropes with an overhand grip, palms facing each other.
3. Lean back slightly, keeping your back straight and your core engaged.
4. Pull the cable ropes towards your chest, squeezing your shoulder blades together.
5. Pause for a moment at the peak of the movement, then slowly release the tension and return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1320.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Rope Elevated Seated Row', 'Back', '1. Sit on the elevated seat facing the cable machine.
2. Grab the cable rope handles with an overhand grip, palms facing each other.
3. Keep your back straight and lean slightly back, maintaining a slight bend in your knees.
4. Pull the cable towards your body by retracting your shoulder blades and squeezing your back muscles.
5. Pause for a moment at the fully contracted position.
6. Slowly release the tension and extend your arms back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1321.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Rope Extension Incline Bench Row', 'Back', '1. Set up an incline bench at a 45-degree angle and attach a cable machine to the low pulley.
2. Attach a rope handle to the cable machine and sit on the incline bench facing the machine.
3. Grab the rope handle with an overhand grip and lean forward, keeping your back straight.
4. Extend your arms fully, pulling the rope towards your upper chest while keeping your elbows close to your body.
5. Squeeze your shoulder blades together at the end of the movement.
6. Slowly release the tension and return to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1322.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Rope Hammer Preacher Curl', 'Arms', '1. Attach a rope attachment to a low pulley cable machine.
2. Stand facing the machine with your feet shoulder-width apart.
3. Grasp the rope with a neutral grip (palms facing each other).
4. Position your upper arms against the preacher bench pad, keeping your elbows slightly bent.
5. Keeping your upper arms stationary, exhale and curl the rope towards your shoulders by contracting your biceps.
6. Hold the contracted position for a brief pause as you squeeze your biceps.
7. Inhale and slowly lower the rope back to the starting position.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1639.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Rope High Pulley Overhead Tricep Extension', 'Arms', '1. Attach a rope to a high pulley and adjust the weight accordingly.
2. Stand facing away from the pulley machine with your feet shoulder-width apart.
3. Grasp the rope with both hands, palms facing down, and bring your hands above your head.
4. Keep your upper arms close to your head and perpendicular to the floor.
5. Slowly lower the rope behind your head by bending your elbows.
6. Pause for a moment, then extend your arms back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1724.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Rope Incline Tricep Extension', 'Arms', '1. Attach a rope to a high pulley and adjust the incline bench to a comfortable angle.
2. Stand facing away from the pulley with your feet shoulder-width apart.
3. Grasp the rope with an overhand grip and extend your arms straight overhead.
4. Keep your elbows close to your head and your upper arms stationary throughout the exercise.
5. Lower the rope behind your head by bending your elbows until your forearms touch your biceps.
6. Pause for a moment, then extend your arms back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1725.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Rope Lying On Floor Tricep Extension', 'Arms', '1. Attach a rope to a cable machine and set it to the lowest position.
2. Lie on the floor facing up, with your head towards the cable machine.
3. Hold the rope with both hands, palms facing each other, and extend your arms straight up towards the ceiling.
4. Keep your upper arms stationary and slowly lower the rope towards your forehead, bending your elbows.
5. Pause for a moment, then extend your arms back up to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1726.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Rope One Arm Hammer Preacher Curl', 'Arms', '1. Attach a rope handle to a low pulley cable machine.
2. Stand facing the machine with your feet shoulder-width apart.
3. Grasp the rope handle with an underhand grip, palms facing up.
4. Position your upper arm against the preacher bench pad, keeping your elbow slightly bent.
5. Keep your back straight and your core engaged throughout the exercise.
6. Slowly curl the rope handle towards your shoulder, keeping your upper arm stationary.
7. Squeeze your biceps at the top of the movement, then slowly lower the rope handle back to the starting position.
8. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1640.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Rope Seated Row', 'Back', '1. Sit on the rowing machine with your feet flat on the footrests and knees slightly bent.
2. Grasp the cable ropes with an overhand grip, palms facing each other.
3. Keep your back straight and lean slightly forward, maintaining a slight bend in your elbows.
4. Pull the cable ropes towards your body, squeezing your shoulder blades together.
5. Pause for a moment at the peak of the movement, then slowly release the tension and return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1323.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Russian Twists (on Stability Ball)', 'Core', '1. Sit on a stability ball with your feet flat on the ground and your knees bent at a 90-degree angle.
2. Hold the cable handle with both hands and extend your arms straight out in front of you.
3. Lean back slightly while keeping your back straight and your core engaged.
4. Twist your torso to the right, bringing the cable handle towards your right hip.
5. Pause for a moment, then twist your torso to the left, bringing the cable handle towards your left hip.
6. Continue alternating twists for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0211.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Seated Chest Press', 'Chest', '1. Adjust the seat height and cable handles to a comfortable position.
2. Sit on the bench with your back straight and feet flat on the floor.
3. Grasp the cable handles with an overhand grip at shoulder height.
4. Push the handles forward and away from your body, extending your arms fully.
5. Pause for a moment, then slowly bring the handles back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2144.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Seated Crunch', 'Core', '1. Sit on a cable machine with your feet flat on the ground and your knees bent.
2. Hold the cable handle with both hands and position it behind your head.
3. Engage your abs and slowly curl your upper body forward, bringing your chest towards your knees.
4. Pause for a moment at the top, then slowly return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0212.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Seated Curl', 'Arms', '1. Sit on a cable machine with your feet flat on the ground and your back straight.
2. Grasp the cable attachment with an underhand grip, palms facing up, and your arms fully extended.
3. Keeping your upper arms stationary, exhale and curl the cable attachment towards your shoulders, contracting your biceps.
4. Pause for a moment at the top of the movement, squeezing your biceps.
5. Inhale and slowly lower the cable attachment back to the starting position, fully extending your arms.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1641.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Seated High Row (v-bar)', 'Back', '1. Sit on the cable machine with your feet flat on the floor and your knees slightly bent.
2. Grasp the v-bar attachment with an overhand grip, palms facing each other, and your hands shoulder-width apart.
3. Keep your back straight and lean slightly forward from the hips.
4. Pull the v-bar towards your torso by retracting your shoulder blades and squeezing your back muscles.
5. Pause for a moment at the peak of the contraction, then slowly release the tension and return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0213.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Seated One Arm Alternate Row', 'Back', '1. Sit on a bench facing a cable machine with your feet flat on the ground and knees slightly bent.
2. Grasp the handle with one hand and keep your arm fully extended in front of you.
3. Pull the handle towards your body, retracting your shoulder blade and keeping your elbow close to your side.
4. Pause for a moment at the top of the movement, squeezing your back muscles.
5. Slowly release the handle back to the starting position.
6. Repeat with the other arm.
7. Alternate between arms for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0214.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Seated One Arm Concentration Curl', 'Arms', '1. Sit on a bench with your feet flat on the floor and your back straight.
2. Hold a cable handle with one hand and place your elbow on the inside of your thigh, just above the knee.
3. Keep your upper arm stationary and curl the cable handle towards your shoulder while exhaling.
4. Pause for a moment at the top of the movement, squeezing your biceps.
5. Slowly lower the cable handle back to the starting position while inhaling.
6. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1642.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Seated Overhead Curl', 'Arms', '1. Sit on a bench facing the cable machine with your feet flat on the ground.
2. Grasp the cable attachment with an underhand grip, palms facing up, and your hands shoulder-width apart.
3. Keep your upper arms stationary and your elbows close to your sides.
4. Exhale and curl the cable attachment towards your shoulders, contracting your biceps.
5. Pause for a moment at the top of the movement, squeezing your biceps.
6. Inhale and slowly lower the cable attachment back to the starting position, fully extending your arms.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1643.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Seated Rear Lateral Raise', 'Shoulders', '1. Sit on a bench facing the cable machine with your feet flat on the ground.
2. Grasp the cable handles with an overhand grip and extend your arms straight in front of you.
3. Keeping your arms straight, slowly raise them out to the sides until they are parallel to the floor.
4. Pause for a moment at the top, then slowly lower your arms back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0215.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Seated Row', 'Back', '1. Sit on the cable row machine with your feet flat on the footrests and your knees slightly bent.
2. Grasp the handles with an overhand grip, keeping your back straight and your shoulders relaxed.
3. Pull the handles towards your body, squeezing your shoulder blades together.
4. Pause for a moment at the peak of the movement, then slowly release the handles back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0861.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Seated Shoulder Internal Rotation', 'Shoulders', '1. Sit on a bench or chair facing the cable machine with your feet flat on the ground.
2. Hold the cable handle with your arm extended straight out in front of you, parallel to the ground.
3. Keep your elbow slightly bent and your shoulder blades pulled back and down.
4. Slowly rotate your arm inward, bringing the cable handle towards the center of your body.
5. Pause for a moment at the end of the movement, then slowly return to the starting position.
6. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0216.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Seated Twist', 'Core', '1. Sit on a cable machine with your feet flat on the ground and your knees slightly bent.
2. Hold the cable handle with both hands and extend your arms straight in front of you.
3. Keeping your core engaged, slowly rotate your torso to one side, pulling the cable across your body.
4. Pause for a moment at the end of the range of motion, then slowly rotate back to the starting position.
5. Repeat on the other side.
6. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2399.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Seated Wide-grip Row', 'Back', '1. Sit on the cable row machine with your feet flat on the footrests and your knees slightly bent.
2. Grasp the handle with a wide overhand grip, palms facing down.
3. Keep your back straight and lean slightly forward from the hips.
4. Pull the handle towards your lower chest, squeezing your shoulder blades together.
5. Pause for a moment at the peak of the contraction.
6. Slowly release the handle back to the starting position, fully extending your arms.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0218.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Shoulder Press', 'Shoulders', '1. Adjust the cable machine so that the handles are at shoulder height.
2. Stand facing away from the machine with your feet shoulder-width apart.
3. Grasp the handles with an overhand grip and bring them up to shoulder level, with your elbows bent and pointing outwards.
4. Press the handles upwards until your arms are fully extended overhead.
5. Pause for a moment at the top, then slowly lower the handles back down to shoulder level.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0219.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Shrug', 'Back', '1. Stand facing the cable machine with your feet shoulder-width apart.
2. Grasp the cable handles with an overhand grip and let your arms hang down in front of you.
3. Keeping your arms straight, shrug your shoulders up towards your ears.
4. Hold the contraction for a moment, then slowly lower your shoulders back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0220.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Side Bend', 'Core', '1. Stand with your feet shoulder-width apart and grasp the cable handle with one hand.
2. Keep your back straight and your core engaged.
3. Slowly bend sideways at the waist, lowering the cable handle towards your knee.
4. Pause for a moment, then return to the starting position.
5. Repeat on the other side.
6. Alternate sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0222.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Side Bend Crunch (bosu Ball)', 'Core', '1. Stand with your feet shoulder-width apart, holding a cable handle in one hand.
2. Place the other hand on your hip.
3. Engage your core and slowly bend sideways towards the hand holding the cable, keeping your back straight.
4. Pause for a moment at the bottom of the movement, then slowly return to the starting position.
5. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0221.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Side Crunch', 'Core', '1. Attach a cable handle to a low pulley and stand sideways to the machine.
2. Grasp the handle with the hand furthest from the machine and place your other hand on your hip.
3. Keep your feet shoulder-width apart and your knees slightly bent.
4. With your abs engaged, bend sideways at the waist, bringing your elbow down towards your hip.
5. Pause for a moment at the bottom, then slowly return to the starting position.
6. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0223.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Squat Row (with Rope Attachment)', 'Back', '1. Attach a rope to a cable machine at waist height.
2. Stand facing the cable machine with your feet shoulder-width apart.
3. Bend your knees and lower your body into a squat position, keeping your back straight and chest up.
4. Grasp the rope with an overhand grip, with your hands shoulder-width apart.
5. Engage your core and pull the rope towards your body, squeezing your shoulder blades together.
6. Keep your elbows close to your body and continue pulling until your hands reach your chest.
7. Pause for a moment at the top of the movement, then slowly release the rope and extend your arms back to the starting position.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1717.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Squatting Curl', 'Arms', '1. Attach a cable handle to the lowest setting on a cable machine.
2. Stand facing the machine with your feet shoulder-width apart.
3. Hold the cable handle with an underhand grip, palms facing up, and arms fully extended.
4. Lower your body into a squat position, keeping your back straight and knees behind your toes.
5. As you squat down, curl the cable handle towards your shoulders, keeping your elbows close to your sides.
6. Pause for a moment at the top of the curl, squeezing your biceps.
7. Slowly lower the cable handle back to the starting position, fully extending your arms.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1644.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Standing Back Wrist Curl', 'Arms', '1. Stand facing a cable machine with your feet shoulder-width apart.
2. Hold the cable handle with an overhand grip, palms facing down.
3. Keep your arms straight and your elbows close to your sides.
4. Slowly curl your wrists upward, bringing the cable handle towards your body.
5. Pause for a moment at the top, then slowly lower the cable handle back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0224.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Standing Calf Raise', 'Legs', '1. Stand facing a cable machine with your feet shoulder-width apart.
2. Hold onto the cable machine handles or attach a cable ankle strap to your ankles.
3. Raise your heels off the ground by extending your ankles as high as possible.
4. Pause for a moment at the top, then slowly lower your heels back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1375.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Standing Cross-over High Reverse Fly', 'Shoulders', '1. Attach a D-handle to each side of a cable machine at shoulder height.
2. Stand in the middle of the cable machine with your feet shoulder-width apart.
3. Grasp the handles with an overhand grip and extend your arms out to the sides, palms facing forward.
4. Keep a slight bend in your elbows and maintain a straight back throughout the exercise.
5. Engage your shoulder muscles and squeeze your shoulder blades together as you pull the handles towards the front of your body.
6. Pause for a moment at the peak of the movement, then slowly return to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0225.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Standing Crunch', 'Core', '1. Attach a cable handle to a high pulley and stand facing away from the machine.
2. Hold the handle with both hands and place it behind your head, keeping your elbows bent.
3. Stand with your feet shoulder-width apart and your knees slightly bent.
4. Keeping your abs engaged, exhale and crunch your torso down towards your knees, bringing your elbows towards your thighs.
5. Pause for a moment at the bottom of the movement, then slowly return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0226.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Standing Crunch (with Rope Attachment)', 'Core', '1. Attach a rope to a cable machine at chest height.
2. Stand facing away from the machine with your feet shoulder-width apart.
3. Hold the rope with both hands and bring it behind your head, keeping your elbows bent.
4. Engage your abs and slowly crunch your torso forward, bringing your elbows towards your knees.
5. Pause for a moment at the top of the crunch, then slowly return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0874.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Standing Fly', 'Chest', '1. Attach the handles to the cables at chest height.
2. Stand with your feet shoulder-width apart, facing away from the cable machine.
3. Grasp the handles with an overhand grip, palms facing forward.
4. Step forward slightly to create tension in the cables.
5. Keep your core engaged and your back straight throughout the exercise.
6. With a slight bend in your elbows, slowly bring your arms forward and together in front of your chest.
7. Squeeze your chest muscles at the peak of the movement.
8. Slowly reverse the movement, returning your arms to the starting position.
9. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0227.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Standing Hip Extension', 'Legs', '1. Attach a cable to a low pulley and stand facing away from the machine.
2. Place the cable around your ankle and stand with your feet shoulder-width apart.
3. Keep your core engaged and your back straight throughout the exercise.
4. Slowly extend your leg straight back, squeezing your glutes at the top of the movement.
5. Pause for a moment, then return to the starting position.
6. Repeat for the desired number of repetitions.
7. Switch sides and repeat with the other leg.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0228.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Standing Inner Curl', 'Arms', '1. Stand facing a cable machine with your feet shoulder-width apart.
2. Grasp the cable handle with an underhand grip, palms facing up.
3. Keep your elbows close to your sides and your upper arms stationary.
4. Exhale and curl the cable handle towards your shoulders, contracting your biceps.
5. Pause for a moment at the top of the movement, squeezing your biceps.
6. Inhale and slowly lower the cable handle back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0229.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Standing Lift', 'Core', '1. Stand facing the cable machine with your feet shoulder-width apart.
2. Hold the cable handle with both hands and position it at waist height.
3. Engage your core and maintain a straight back throughout the exercise.
4. Keeping your arms straight, exhale and lift the cable handle up towards your opposite shoulder, rotating your torso.
5. Pause for a moment at the top, then inhale and slowly lower the cable handle back to the starting position.
6. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0230.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Standing One Arm Triceps Extension', 'Arms', '1. Stand with your feet shoulder-width apart, facing the cable machine.
2. Hold the cable handle with your right hand, palm facing down, and position your arm so that it is fully extended and parallel to the ground.
3. Keep your elbow stationary and close to your body.
4. Slowly bend your elbow, lowering the cable handle towards the back of your head.
5. Pause for a moment at the bottom of the movement, then extend your arm back to the starting position.
6. Repeat for the desired number of repetitions, then switch sides and perform the exercise with your left arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0231.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Standing One Leg Calf Raise', 'Legs', '1. Stand facing a cable machine with your feet shoulder-width apart.
2. Hold onto the cable machine for support.
3. Lift one leg off the ground and balance on the other leg.
4. Slowly raise your heel off the ground, lifting your body up onto your toes.
5. Pause for a moment at the top, then slowly lower your heel back down to the starting position.
6. Repeat for the desired number of repetitions, then switch legs.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1376.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Standing Pulldown (with Rope)', 'Arms', '1. Attach a rope to the cable machine at the highest setting.
2. Stand facing the machine with your feet shoulder-width apart.
3. Grasp the rope with an overhand grip, palms facing down.
4. Keep your back straight and core engaged throughout the exercise.
5. Pull the rope down towards your thighs, squeezing your biceps.
6. Pause for a moment at the bottom, then slowly release the rope back up.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0232.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Standing Rear Delt Row (with Rope)', 'Shoulders', '1. Stand facing a cable machine with your feet shoulder-width apart.
2. Hold the cable attachment with both hands, palms facing each other, and step back to create tension in the cable.
3. Keep your back straight and your core engaged.
4. Pull the cable towards your body, squeezing your shoulder blades together.
5. Pause for a moment at the peak of the movement, then slowly release the cable back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0233.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Standing Reverse Grip One Arm Overhead Tricep Extension', 'Arms', '1. Stand facing away from the cable machine with your feet shoulder-width apart.
2. Hold the cable handle with an underhand grip and extend your arm overhead, keeping your elbow close to your head.
3. Keep your upper arm stationary and slowly lower the cable handle behind your head by bending your elbow.
4. Pause for a moment at the bottom, then extend your arm back to the starting position.
5. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1727.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Standing Row (v-bar)', 'Back', '1. Stand facing the cable machine with your feet shoulder-width apart.
2. Grasp the v-bar attachment with an overhand grip, palms facing down.
3. Keep your back straight and your core engaged.
4. Pull the v-bar towards your body, squeezing your shoulder blades together.
5. Pause for a moment at the peak of the movement, then slowly release the tension and return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0234.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Standing Shoulder External Rotation', 'Shoulders', '1. Stand with your feet shoulder-width apart and your knees slightly bent.
2. Hold the cable handle with your arm extended in front of you, parallel to the ground.
3. Keep your elbow slightly bent and your shoulder blades pulled back.
4. Slowly rotate your arm outward, away from your body, while keeping your elbow in the same position.
5. Pause for a moment at the end of the movement, then slowly return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0235.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Standing Twist Row (v-bar)', 'Back', '1. Attach a v-bar attachment to a cable machine at chest height.
2. Stand facing the cable machine with your feet shoulder-width apart.
3. Grasp the v-bar with an overhand grip, palms facing down.
4. Take a step back to create tension in the cable.
5. Keep your back straight and core engaged throughout the exercise.
6. Pull the v-bar towards your torso by retracting your shoulder blades and bending your elbows.
7. As you pull, twist your torso to one side, squeezing your shoulder blades together.
8. Pause for a moment at the top of the movement, feeling the contraction in your upper back.
9. Slowly release the tension and return to the starting position, untwisting your torso.
10. Repeat the movement for the desired number of repetitions, alternating the twisting direction with each rep.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0236.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Standing Up Straight Crossovers', 'Chest', '1. Stand in the middle of a cable machine with your feet shoulder-width apart.
2. Hold the handles of the cables with your palms facing down and your arms extended straight out to the sides.
3. Keeping your arms straight, bring your hands together in front of your body, crossing them over each other.
4. Pause for a moment, then slowly return to the starting position, keeping your arms extended.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1269.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Straight Arm Pulldown', 'Back', '1. Attach a straight bar to the high pulley of a cable machine.
2. Stand facing the machine with your feet shoulder-width apart.
3. Grasp the bar with an overhand grip, keeping your arms straight and your palms facing down.
4. Engage your lats and pull the bar down towards your thighs, keeping your arms straight throughout the movement.
5. Pause for a moment at the bottom, then slowly return the bar to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0238.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Straight Arm Pulldown (with Rope)', 'Back', '1. Attach a rope to the cable machine at the highest setting.
2. Stand facing the machine with your feet shoulder-width apart.
3. Grasp the rope with both hands, palms facing down.
4. Extend your arms fully in front of you, keeping your elbows slightly bent.
5. Engage your lats and slowly pull the rope down towards your thighs, keeping your arms straight.
6. Pause for a moment at the bottom, then slowly release the tension and return to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0237.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Straight Back Seated Row', 'Back', '1. Sit on the cable row machine with your feet flat on the footrests and your knees slightly bent.
2. Grasp the cable handles with an overhand grip, palms facing down.
3. Keep your back straight and lean slightly forward from the hips.
4. Pull the cable handles towards your body, squeezing your shoulder blades together.
5. Pause for a moment at the peak of the movement, then slowly release the handles back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0239.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Supine Reverse Fly', 'Shoulders', '1. Attach a D-handle to a low pulley cable machine and lie face down on a flat bench.
2. Grasp the D-handle with each hand, palms facing down, and extend your arms straight out in front of you.
3. Keeping your arms straight, raise them out to the sides until they are parallel to the floor.
4. Pause for a moment at the top, then slowly lower your arms back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0240.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Thibaudeau Kayak Row', 'Back', '1. Attach a cable handle to a low pulley and sit facing the machine with your feet flat on the floor.
2. Grasp the handle with your right hand and extend your arm fully, keeping a slight bend in your elbow.
3. Lean forward from your hips, keeping your back straight and your abs engaged.
4. Pull the handle towards your torso by retracting your shoulder blade and bending your elbow, keeping your arm close to your body.
5. Squeeze your back muscles at the top of the movement, then slowly return to the starting position.
6. Repeat for the desired number of repetitions, then switch sides and perform with your left arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2464.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Triceps Pushdown (v-bar)', 'Arms', '1. Attach a v-bar attachment to the cable machine at the highest setting.
2. Stand facing the cable machine with your feet shoulder-width apart.
3. Grasp the v-bar with an overhand grip, palms facing down, and your hands shoulder-width apart.
4. Keep your elbows close to your sides and your upper arms stationary throughout the exercise.
5. Engage your triceps and exhale as you push the v-bar down until your arms are fully extended.
6. Pause for a moment at the bottom of the movement, squeezing your triceps.
7. Inhale as you slowly return the v-bar to the starting position, maintaining control.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0241.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Triceps Pushdown (v-bar) (with Arm Blaster)', 'Arms', '1. Attach a v-bar attachment to the cable machine at the highest setting.
2. Stand facing the cable machine with your feet shoulder-width apart.
3. Grasp the v-bar with an overhand grip, palms facing down, and your hands shoulder-width apart.
4. Keep your elbows close to your sides and your upper arms stationary throughout the exercise.
5. Engage your triceps and exhale as you push the v-bar down until your arms are fully extended.
6. Pause for a moment at the bottom of the movement, squeezing your triceps.
7. Inhale as you slowly return the v-bar to the starting position, maintaining control.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2405.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Tuck Reverse Crunch', 'Core', '1. Attach a cable to a low pulley and lie down on a mat facing up.
2. Hold the cable with both hands and extend your arms straight up above your chest.
3. Bend your knees and lift your legs up, bringing your knees towards your chest.
4. At the same time, curl your pelvis up towards your chest, lifting your hips off the ground.
5. Pause for a moment at the top, then slowly lower your legs and hips back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0242.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Twist', 'Core', '1. Stand with your feet shoulder-width apart, facing the cable machine.
2. Hold the cable handle with both hands in front of your chest, keeping your arms slightly bent.
3. Engage your core and twist your torso to the right, pulling the cable across your body.
4. Pause for a moment at the end of the movement, feeling the contraction in your abs and obliques.
5. Slowly return to the starting position, resisting the cable''s pull.
6. Repeat the movement to the left side.
7. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0243.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Twist (up-down)', 'Core', '1. Stand with your feet shoulder-width apart, facing the cable machine.
2. Hold the cable handle with both hands in front of your chest, keeping your arms slightly bent.
3. Engage your core and slowly rotate your torso to one side, keeping your hips and legs stable.
4. Pause for a moment at the end of the rotation, then slowly return to the starting position.
5. Repeat the rotation to the opposite side.
6. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0862.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Twisting Pull', 'Back', '1. Attach a cable handle to a low pulley and stand facing the machine.
2. Grasp the handle with your left hand and step away from the machine, extending your arm fully.
3. Position your feet shoulder-width apart, with your knees slightly bent.
4. Keep your back straight and your core engaged throughout the exercise.
5. Pull the handle towards your body, rotating your torso to the right as you do so.
6. Squeeze your back muscles at the end of the movement.
7. Slowly return to the starting position, keeping tension on the cable.
8. Repeat for the desired number of repetitions, then switch sides and perform with your right hand.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0244.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Two Arm Curl On Incline Bench', 'Arms', '1. Sit on an incline bench with your back against the pad and your feet flat on the ground.
2. Grasp the cable handles with an underhand grip, palms facing up, and your arms fully extended.
3. Keeping your upper arms stationary, exhale and curl the handles towards your shoulders while contracting your biceps.
4. Pause for a moment at the top of the movement, squeezing your biceps.
5. Inhale and slowly lower the handles back to the starting position, fully extending your arms.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1645.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Two Arm Tricep Kickback', 'Arms', '1. Stand with your feet shoulder-width apart and knees slightly bent.
2. Hold the cable handle in each hand with your palms facing inwards and your arms bent at a 90-degree angle.
3. Keeping your upper arms stationary, extend your forearms backwards until your arms are fully extended.
4. Pause for a moment, then slowly return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1728.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Underhand Pulldown', 'Back', '1. Adjust the cable machine so that the pulldown bar is at a height above your head.
2. Sit down on the seat and grab the pulldown bar with an underhand grip, hands slightly wider than shoulder-width apart.
3. Keep your back straight and lean back slightly.
4. Pull the bar down towards your chest, squeezing your shoulder blades together.
5. Pause for a moment at the bottom of the movement, then slowly release the bar back up to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0245.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Upper Chest Crossovers', 'Chest', '1. Attach the handles to the cables at chest height.
2. Stand in the center of the cable machine with one foot slightly in front of the other.
3. Grasp the handles with your palms facing down and your arms extended out to the sides.
4. Keep a slight bend in your elbows and engage your core.
5. Pull the cables together in front of your chest, crossing them over each other.
6. Squeeze your chest muscles at the peak of the movement.
7. Slowly release the cables back to the starting position.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1270.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Upper Row', 'Back', '1. Attach a straight bar to a cable machine at chest height.
2. Stand facing the machine with your feet shoulder-width apart.
3. Grasp the bar with an overhand grip, hands slightly wider than shoulder-width apart.
4. Keep your back straight and your core engaged.
5. Pull the bar towards your upper chest, squeezing your shoulder blades together.
6. Pause for a moment at the top of the movement.
7. Slowly release the bar back to the starting position.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1324.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Upright Row', 'Shoulders', '1. Stand with your feet shoulder-width apart, knees slightly bent, and hold the cable attachment with an overhand grip.
2. Keep your back straight and your core engaged throughout the exercise.
3. Pull the cable attachment straight up towards your chin, leading with your elbows.
4. Pause for a moment at the top, squeezing your shoulder blades together.
5. Slowly lower the cable attachment back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0246.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Wide Grip Rear Pulldown Behind Neck', 'Back', '1. Adjust the cable machine so that the pulldown bar is at a height above your head.
2. Sit down on the seat and grab the pulldown bar with a wide overhand grip.
3. Keep your back straight and your chest up as you lean back slightly.
4. Pull the bar down towards your upper chest, squeezing your shoulder blades together.
5. Pause for a moment at the bottom of the movement, then slowly release the bar back up to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1325.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cable Wrist Curl', 'Arms', '1. Attach a straight bar to a low pulley cable machine.
2. Stand facing the machine with your feet shoulder-width apart.
3. Grasp the bar with an underhand grip, palms facing up, and your hands shoulder-width apart.
4. Rest your forearms on a bench or pad, with your wrists hanging off the edge.
5. Keeping your forearms stationary, exhale and curl your wrists upward as far as possible.
6. Pause for a moment at the top, then inhale and slowly lower the bar back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0247.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Calf Push Stretch With Hands Against Wall', 'Legs', '1. Stand facing a wall with your feet hip-width apart.
2. Place your hands against the wall at shoulder height.
3. Step back with one foot, keeping your heel on the ground and your leg straight.
4. Bend your front knee slightly and lean forward, feeling a stretch in your calf.
5. Hold the stretch for 20-30 seconds.
6. Switch legs and repeat the stretch.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1407.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Calf Stretch With Hands Against Wall', 'Legs', '1. Stand facing a wall with your feet hip-width apart.
2. Place your hands against the wall at shoulder height.
3. Step your right foot back, keeping your heel on the ground and your leg straight.
4. Bend your left knee and lean forward, keeping your back leg straight and your heel on the ground.
5. Hold the stretch for 20-30 seconds.
6. Switch legs and repeat the stretch.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1377.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Calf Stretch With Rope', 'Legs', '1. Stand facing a wall or sturdy object with your feet hip-width apart.
2. Hold the ends of the rope in each hand and place the middle of the rope around the ball of your right foot.
3. Step back with your left foot, keeping your heel on the ground and your leg straight.
4. Lean forward, keeping your back straight, and gently pull on the rope to stretch your calf.
5. Hold the stretch for 20-30 seconds, then release.
6. Repeat on the other leg.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1378.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cambered Bar Lying Row', 'Back', '1. Set up a barbell on the floor and lie face down on a bench with your chest just off the edge.
2. Reach down and grab the barbell with an overhand grip, slightly wider than shoulder-width apart.
3. With your legs straight and feet on the ground, lift the barbell off the floor by extending your arms.
4. Pull the barbell towards your chest, squeezing your shoulder blades together.
5. Lower the barbell back down to the starting position and repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0248.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Captains Chair Straight Leg Raise', 'Core', '1. Sit on the captain''s chair with your back against the backrest and your forearms resting on the arm pads.
2. Keep your upper body stable and your back straight.
3. Engage your abs and lift your legs up in front of you, keeping them straight.
4. Continue lifting until your legs are parallel to the ground or as high as you can comfortably go.
5. Pause for a moment at the top, then slowly lower your legs back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2963.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Chair Leg Extended Stretch', 'Legs', '1. Sit on the edge of a chair with your back straight and feet flat on the ground.
2. Extend one leg straight out in front of you, keeping your heel on the ground.
3. Lean forward slightly, feeling a stretch in your quadriceps.
4. Hold this position for 20-30 seconds.
5. Switch legs and repeat the stretch.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1548.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Chest And Front Of Shoulder Stretch', 'Chest', '1. Stand tall with your feet shoulder-width apart.
2. Extend your arms straight out in front of you at shoulder height.
3. Cross your arms in front of your body, with your right arm on top of your left arm.
4. Interlace your fingers and press your palms together.
5. Gently squeeze your shoulder blades together and push your hands forward, feeling a stretch in your chest and front of your shoulders.
6. Hold the stretch for 20-30 seconds, then release.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1271.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Chest Dip', 'Chest', '1. Position yourself on parallel bars with your arms fully extended and your body straight.
2. Lower your body by bending your elbows until your shoulders are below your elbows.
3. Push yourself back up to the starting position by straightening your arms.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0251.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Chest Dip (on Dip-pull-up Cage)', 'Chest', '1. Adjust the dip bars to a height that allows you to comfortably grip them.
2. Stand between the bars and place your hands on each bar, slightly wider than shoulder-width apart.
3. Jump up and straighten your arms, supporting your body weight on the bars.
4. Bend your knees and cross your ankles behind you.
5. Lower your body by bending your elbows, keeping your chest up and your shoulders down.
6. Continue lowering until your shoulders are below your elbows or until you feel a stretch in your chest.
7. Push through your palms and extend your elbows to raise your body back up to the starting position.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1430.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Chest Dip On Straight Bar', 'Chest', '1. Grab the parallel bars with your palms facing down and your arms fully extended.
2. Bend your knees and cross your ankles.
3. Lower your body by bending your arms until your shoulders are below your elbows.
4. Push yourself back up to the starting position by straightening your arms.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2462.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Chest Stretch With Exercise Ball', 'Chest', '1. Sit on the stability ball with your feet flat on the ground and your back straight.
2. Hold the exercise ball with both hands and extend your arms straight out in front of you.
3. Slowly bring the exercise ball towards your chest, feeling a stretch in your chest muscles.
4. Hold the stretch for a few seconds, then slowly return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1272.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Chest Tap Push-up (male)', 'Chest', '1. Start in a high plank position with your hands slightly wider than shoulder-width apart and your body in a straight line.
2. Lower your body towards the ground by bending your elbows, keeping them close to your sides.
3. As you lower yourself, tap your chest with your right hand.
4. Push yourself back up to the starting position.
5. Repeat the movement, this time tapping your chest with your left hand.
6. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3216.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Chin-up', 'Back', '1. Hang from a pull-up bar with your palms facing towards you and your hands shoulder-width apart.
2. Engage your core and pull your body up towards the bar, leading with your chest.
3. Continue pulling until your chin is above the bar.
4. Pause for a moment at the top, then slowly lower your body back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1326.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Chin-ups (narrow Parallel Grip)', 'Back', '1. Hang from a pull-up bar with a narrow parallel grip, palms facing towards you.
2. Engage your back muscles and pull your body up towards the bar, keeping your elbows close to your body.
3. Continue pulling until your chin is above the bar.
4. Pause for a moment at the top, then slowly lower your body back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0253.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Circles Knee Stretch', 'Legs', '1. Stand with your feet shoulder-width apart and your hands on your hips.
2. Bend your knees slightly and lift your heels off the ground, balancing on the balls of your feet.
3. Keeping your knees bent, rotate your knees in a circular motion, first clockwise and then counterclockwise.
4. Perform the movement for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0257.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Clap Push Up', 'Chest', '1. Start in a high plank position with your hands slightly wider than shoulder-width apart.
2. Lower your body towards the ground by bending your elbows, keeping your core engaged.
3. Push through your palms explosively to propel your body off the ground.
4. While in mid-air, clap your hands together before landing back in the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1273.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Clock Push-up', 'Chest', '1. Start in a high plank position with your hands directly under your shoulders and your body in a straight line.
2. Lower your body towards the ground by bending your elbows, keeping them close to your sides.
3. As you lower, rotate your body to the left, extending your left arm straight out to the side.
4. Push back up to the starting position, while rotating your body to the center.
5. Repeat the push-up, this time rotating your body to the right and extending your right arm out to the side.
6. Continue alternating sides with each repetition.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0258.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Close Grip Chin-up', 'Back', '1. Grab the pull-up bar with your palms facing towards you and your hands shoulder-width apart.
2. Hang from the bar with your arms fully extended and your feet off the ground.
3. Engage your back muscles and pull your body up towards the bar, keeping your elbows close to your body.
4. Continue pulling until your chin is above the bar.
5. Pause for a moment at the top, then slowly lower your body back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1327.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Close-grip Push-up', 'Arms', '1. Start in a high plank position with your hands placed close together, directly under your shoulders.
2. Engage your core and lower your body towards the ground, keeping your elbows close to your sides.
3. Push through your palms to extend your arms and return to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0259.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Close-grip Push-up (on Knees)', 'Arms', '1. Start by getting on your hands and knees, with your hands shoulder-width apart and your knees hip-width apart.
2. Lower your upper body towards the ground by bending your elbows, keeping them close to your sides.
3. Pause for a moment when your chest is just above the ground.
4. Push through your palms to straighten your arms and return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2398.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cocoons', 'Core', '1. Lie flat on your back with your knees bent and feet flat on the ground.
2. Place your hands behind your head with your elbows pointing outwards.
3. Engaging your abs, slowly lift your upper body off the ground, curling forward until your torso is at a 45-degree angle.
4. Pause for a moment at the top, then slowly lower your upper body back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0260.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Crab Twist Toe Touch', 'Core', '1. Start by sitting on the ground with your knees bent and feet flat on the floor.
2. Place your hands behind you, fingers pointing towards your feet, and lift your hips off the ground.
3. Extend one leg straight out in front of you while simultaneously reaching your opposite hand towards your toes.
4. Return to the starting position and repeat on the other side.
5. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1468.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cross Body Crunch', 'Core', '1. Lie flat on your back with your knees bent and feet flat on the ground.
2. Place your hands behind your head with your elbows pointing outwards.
3. Engaging your abs, lift your upper body off the ground and twist to bring your right elbow towards your left knee.
4. Pause for a moment at the top, then slowly lower your upper body back down to the starting position.
5. Repeat on the other side, bringing your left elbow towards your right knee.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0262.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Crunch (hands Overhead)', 'Core', '1. Lie flat on your back with your knees bent and feet flat on the ground.
2. Extend your arms straight above your head.
3. Engaging your abs, lift your upper body off the ground, curling forward towards your knees.
4. Pause for a moment at the top, then slowly lower your upper body back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0267.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Crunch (on Stability Ball)', 'Core', '1. Sit on the stability ball with your feet flat on the ground and your knees bent at a 90-degree angle.
2. Lie back on the ball until your lower back is supported and your upper body is parallel to the floor.
3. Place your hands behind your head or across your chest.
4. Engage your abs and lift your upper body towards your knees, curling your torso forward.
5. Pause for a moment at the top of the movement, then slowly lower your upper body back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0271.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Crunch (on Stability Ball, Arms Straight)', 'Core', '1. Sit on the stability ball with your feet flat on the ground and your knees bent at a 90-degree angle.
2. Lie back on the ball until your lower back is supported and your upper body is parallel to the floor.
3. Place your hands behind your head or cross them over your chest.
4. Engage your abs and lift your upper body off the ball, curling your shoulders towards your hips.
5. Pause for a moment at the top, then slowly lower your upper body back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0272.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Crunch Floor', 'Core', '1. Lie flat on your back with your knees bent and feet flat on the ground.
2. Place your hands behind your head with your elbows pointing outwards.
3. Engage your abs and lift your shoulders off the ground, curling forward towards your knees.
4. Pause for a moment at the top, then slowly lower your shoulders back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0274.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Curl-up', 'Core', '1. Lie flat on your back with your knees bent and feet flat on the ground.
2. Place your hands behind your head with your elbows pointing outwards.
3. Engaging your abs, slowly lift your upper body off the ground, curling forward until your torso is at a 45-degree angle.
4. Pause for a moment at the top, then slowly lower your upper body back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3016.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Curtsey Squat', 'Legs', '1. Stand with your feet shoulder-width apart.
2. Take a step diagonally behind and across your body with your right foot, crossing it behind your left leg.
3. Bend both knees as if you were curtsying, lowering your body towards the ground.
4. Keep your torso upright and your weight on your front foot.
5. Push through your front foot to return to the starting position.
6. Repeat on the other side, stepping diagonally behind and across your body with your left foot.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3769.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Cycle Cross Trainer', 'Cardio', '1. Adjust the seat height and position yourself on the cycle cross trainer.
2. Place your feet on the pedals and grip the handlebars.
3. Start pedaling in a smooth and controlled motion.
4. Maintain a steady pace and increase the resistance if desired.
5. Continue pedaling for the desired duration of your cardio workout.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2331.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dead Bug', 'Core', '1. Lie flat on your back with your arms extended towards the ceiling.
2. Bend your knees and lift your legs off the ground, creating a 90-degree angle at your hips and knees.
3. Engage your core and lower back to press your lower back into the ground.
4. Slowly lower your right arm and left leg towards the ground, keeping them straight and hovering just above the floor.
5. Pause for a moment, then return to the starting position.
6. Repeat the movement with your left arm and right leg.
7. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0276.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Decline Crunch', 'Core', '1. Lie on a decline bench with your feet secured and your knees bent at a 90-degree angle.
2. Place your hands behind your head or across your chest.
3. Engage your abs and lift your upper body towards your knees, curling your torso.
4. Pause for a moment at the top, then slowly lower your upper body back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0277.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Decline Push-up', 'Chest', '1. Place your hands on the ground slightly wider than shoulder-width apart, with your feet elevated on a stable surface.
2. Keep your body in a straight line from head to toe, engaging your core muscles.
3. Lower your chest towards the ground by bending your elbows, keeping them close to your body.
4. Push through your palms to extend your arms and return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0279.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Decline Sit-up', 'Core', '1. Lie on a decline bench with your feet secured and your knees bent.
2. Place your hands behind your head or across your chest.
3. Engage your abs and lift your upper body off the bench, curling forward towards your knees.
4. Pause for a moment at the top, then slowly lower your upper body back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0282.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Deep Push Up', 'Chest', '1. Start in a high plank position with your hands slightly wider than shoulder-width apart and your body in a straight line.
2. Lower your chest towards the ground by bending your elbows, keeping them close to your body.
3. Push through your palms to extend your arms and return to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1274.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Diamond Push-up', 'Arms', '1. Start in a high plank position with your hands close together, forming a diamond shape with your thumbs and index fingers.
2. Keep your body in a straight line from head to toe, engaging your core and glutes.
3. Lower your chest towards the diamond shape formed by your hands, keeping your elbows close to your body.
4. Pause for a moment at the bottom, then push yourself back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0283.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Donkey Calf Raise', 'Legs', '1. Stand with your toes on an elevated surface, such as a step or block.
2. Place your hands on a stable support, such as a wall or railing, for balance.
3. Raise your heels as high as possible, lifting your body weight onto the balls of your feet.
4. Pause for a moment at the top, then slowly lower your heels back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0284.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Drop Push Up', 'Chest', '1. Start in a high plank position with your hands slightly wider than shoulder-width apart.
2. Lower your chest towards the ground, keeping your elbows close to your body.
3. Once your chest is just above the ground, quickly drop your knees to the ground.
4. Push yourself back up to the starting position by extending your arms.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1275.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Alternate Biceps Curl', 'Arms', '1. Stand up straight with a dumbbell in each hand, palms facing forward and arms fully extended.
2. Keeping your upper arms stationary, exhale and curl the weights while contracting your biceps.
3. Continue to raise the dumbbells until your biceps are fully contracted and the dumbbells are at shoulder level.
4. Hold the contracted position for a brief pause as you squeeze your biceps.
5. Inhale and slowly begin to lower the dumbbells back to the starting position.
6. Repeat for the desired number of repetitions, alternating arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0285.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Alternate Biceps Curl (with Arm Blaster)', 'Arms', '1. Stand up straight with your feet shoulder-width apart and hold a dumbbell in each hand, palms facing forward.
2. Place the arm blaster on your upper arms, ensuring a secure fit.
3. Keeping your upper arms stationary, exhale and curl one dumbbell up towards your shoulder while contracting your biceps.
4. Continue to raise the dumbbell until your biceps are fully contracted and the dumbbell is at shoulder level.
5. Hold the contracted position for a brief pause as you squeeze your biceps.
6. Inhale and slowly lower the dumbbell back to the starting position.
7. Repeat the movement with the opposite arm.
8. Continue alternating arms for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2403.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Alternate Hammer Preacher Curl', 'Arms', '1. Sit on a preacher bench with a dumbbell in each hand, palms facing your torso and arms fully extended.
2. Keep your upper arms stationary and exhale as you curl the weights while contracting your biceps.
3. Continue to raise the dumbbells until your biceps are fully contracted and the dumbbells are at shoulder level.
4. Hold the contracted position for a brief pause as you squeeze your biceps.
5. Inhale and slowly begin to lower the dumbbells back to the starting position.
6. Repeat for the recommended amount of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1646.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Alternate Preacher Curl', 'Arms', '1. Sit on a preacher bench with a dumbbell in each hand, palms facing up.
2. Rest your upper arms on the pad of the preacher bench, allowing your arms to fully extend.
3. Keeping your upper arms stationary, exhale and curl the dumbbell in your right hand as you contract your biceps.
4. Continue to curl the dumbbell until your biceps are fully contracted and the dumbbell is at shoulder level.
5. Pause for a moment, then inhale and slowly lower the dumbbell back to the starting position.
6. Repeat the movement with your left arm.
7. Continue alternating arms for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1647.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Alternate Seated Hammer Curl', 'Arms', '1. Sit on a bench with a dumbbell in each hand, palms facing your torso and arms extended down.
2. Keep your back straight and your elbows close to your torso.
3. Exhale and curl the dumbbell in your right hand towards your shoulder, keeping your upper arm stationary.
4. Continue to raise the dumbbell until your biceps are fully contracted and the dumbbell is at shoulder level.
5. Pause for a brief moment, then inhale and slowly lower the dumbbell back to the starting position.
6. Repeat the movement with your left arm.
7. Continue alternating arms for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1648.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Alternate Side Press', 'Shoulders', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand at shoulder height.
2. Press one dumbbell overhead while keeping the other dumbbell at shoulder height.
3. Lower the pressed dumbbell back to shoulder height while pressing the other dumbbell overhead.
4. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0286.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Alternating Bicep Curl With Leg Raised On Exercise Ball', 'Arms', '1. Stand with your feet shoulder-width apart and hold a dumbbell in each hand, palms facing forward.
2. Place an exercise ball behind you and position one foot on top of it, keeping your balance.
3. With your arms fully extended and elbows close to your sides, curl one dumbbell towards your shoulder while keeping your upper arm stationary.
4. Lower the dumbbell back down to the starting position and repeat with the other arm.
5. Continue alternating arms for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1649.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Alternating Seated Bicep Curl On Exercise Ball', 'Arms', '1. Sit on an exercise ball with your feet flat on the ground and your back straight.
2. Hold a dumbbell in each hand with your palms facing forward and your arms fully extended.
3. Keeping your upper arms stationary, exhale and curl one dumbbell while rotating your forearm until your palm is facing your shoulder.
4. Inhale and slowly lower the dumbbell back to the starting position.
5. Repeat the curl with the other arm.
6. Continue alternating curls for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1650.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Arnold Press', 'Shoulders', '1. Sit on a bench with back support and hold a dumbbell in each hand at shoulder level, palms facing your body and elbows bent.
2. Press the dumbbells upward until your arms are fully extended and your palms are facing forward.
3. Rotate your wrists as you lift, so that your palms are facing forward at the top of the movement.
4. Pause for a moment at the top, then slowly lower the dumbbells back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2137.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Arnold Press V. 2', 'Shoulders', '1. Sit on a bench with back support and hold a dumbbell in each hand at shoulder level, palms facing your body and elbows bent.
2. Press the dumbbells upward until your arms are fully extended and your palms are facing forward.
3. Rotate your wrists as you lift, so that your palms end up facing forward at the top of the movement.
4. Pause for a moment at the top, then slowly lower the dumbbells back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0287.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Around Pullover', 'Chest', '1. Lie flat on a bench with your head at one end and your feet firmly on the ground.
2. Hold a dumbbell with both hands and extend your arms straight above your chest.
3. Keeping your arms straight, slowly lower the dumbbell behind your head in an arc motion.
4. Pause for a moment at the bottom, then raise the dumbbell back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0288.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Bench Press', 'Chest', '1. Lie flat on a bench with your feet flat on the ground and your back pressed against the bench.
2. Hold a dumbbell in each hand, with your palms facing forward and your arms extended above your chest.
3. Lower the dumbbells slowly to the sides of your chest, keeping your elbows at a 90-degree angle.
4. Pause for a moment, then push the dumbbells back up to the starting position, fully extending your arms.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0289.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Bench Seated Press', 'Shoulders', '1. Sit on a bench with a dumbbell in each hand, resting on your thighs.
2. Lean back and position the dumbbells to the sides of your chest, palms facing forward.
3. Press the dumbbells upward until your arms are fully extended.
4. Pause for a moment at the top, then slowly lower the dumbbells back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0290.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Bench Squat', 'Legs', '1. Place a dumbbell on the ground in front of a bench.
2. Stand facing away from the bench with your feet shoulder-width apart.
3. Bend at the knees and hips to lower yourself down towards the bench, keeping your chest up and back straight.
4. Once your glutes touch the bench, push through your heels to stand back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0291.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Bent Over Row', 'Back', '1. Stand with your feet shoulder-width apart, knees slightly bent, and hold a dumbbell in each hand with your palms facing your body.
2. Bend forward at the hips, keeping your back straight and your core engaged.
3. Let your arms hang straight down towards the floor, with your elbows slightly bent.
4. Pull the dumbbells up towards your chest, squeezing your shoulder blades together.
5. Pause for a moment at the top, then slowly lower the dumbbells back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0293.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Bicep Curl Lunge With Bowling Motion', 'Arms', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand with your palms facing forward.
2. Take a step forward with your right foot, bending your right knee and lowering your body into a lunge position.
3. As you lunge forward, curl the dumbbells up towards your shoulders, keeping your elbows close to your body.
4. At the bottom of the lunge, rotate your torso to the right, as if you were bowling a ball.
5. Reverse the motion, stepping back with your right foot and returning to the starting position while lowering the dumbbells back down.
6. Repeat the lunge and curl motion, this time rotating your torso to the left.
7. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1651.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Bicep Curl On Exercise Ball With Leg Raised', 'Arms', '1. Sit on an exercise ball with your feet flat on the ground and your back straight.
2. Hold a dumbbell in each hand with your palms facing forward and your arms fully extended.
3. Slowly curl the dumbbells towards your shoulders, keeping your elbows close to your sides.
4. Pause for a moment at the top of the movement, then slowly lower the dumbbells back to the starting position.
5. While performing the bicep curl, raise one leg off the ground and hold it in the air for the duration of the exercise.
6. Repeat for the desired number of repetitions, then switch legs and repeat.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1652.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Bicep Curl With Stork Stance', 'Arms', '1. Stand with your feet shoulder-width apart and hold a dumbbell in each hand, palms facing forward.
2. Extend one leg behind you, balancing on the toes of that foot.
3. Keeping your upper arms stationary, exhale and curl the weights while contracting your biceps.
4. Continue to raise the weights until your biceps are fully contracted and the dumbbells are at shoulder level.
5. Hold the contracted position for a brief pause as you squeeze your biceps.
6. Inhale and slowly begin to lower the dumbbells back to the starting position.
7. Repeat for the desired number of repetitions, then switch legs and repeat.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1653.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Biceps Curl', 'Arms', '1. Stand up straight with a dumbbell in each hand, palms facing forward and arms fully extended.
2. Keeping your upper arms stationary, exhale and curl the weights while contracting your biceps.
3. Continue to raise the weights until your biceps are fully contracted and the dumbbells are at shoulder level.
4. Hold the contracted position for a brief pause as you squeeze your biceps.
5. Inhale and slowly begin to lower the dumbbells back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0294.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Biceps Curl (with Arm Blaster)', 'Arms', '1. Stand up straight with a dumbbell in each hand, palms facing forward.
2. Keep your elbows close to your torso and your upper arms stationary.
3. Exhale and curl the weights while contracting your biceps.
4. Continue to raise the weights until your biceps are fully contracted and the dumbbells are at shoulder level.
5. Hold the contracted position for a brief pause as you squeeze your biceps.
6. Inhale and slowly begin to lower the dumbbells back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2401.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Biceps Curl Reverse', 'Arms', '1. Stand up straight with a dumbbell in each hand, palms facing down and arms fully extended.
2. Keeping your upper arms stationary, exhale and curl the weights while contracting your biceps.
3. Continue to raise the dumbbells until your biceps are fully contracted and the dumbbells are at shoulder level.
4. Hold the contracted position for a brief pause as you squeeze your biceps.
5. Inhale and slowly begin to lower the dumbbells back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1654.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Biceps Curl Squat', 'Arms', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand with your palms facing forward.
2. Keeping your back straight and your elbows close to your sides, exhale and curl the dumbbells up towards your shoulders.
3. Pause for a moment at the top, squeezing your biceps.
4. Inhale and slowly lower the dumbbells back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1655.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Biceps Curl V Sit On Bosu Ball', 'Arms', '1. Sit on a bosu ball with your feet flat on the ground and your knees bent at a 90-degree angle.
2. Hold a dumbbell in each hand with your palms facing forward and your arms fully extended down by your sides.
3. Keeping your upper arms stationary, exhale and curl the weights while contracting your biceps.
4. Continue to raise the dumbbells until your biceps are fully contracted and the dumbbells are at shoulder level.
5. Hold the contracted position for a brief pause as you squeeze your biceps.
6. Inhale and slowly begin to lower the dumbbells back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1656.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Burpee', 'Cardio', '1. Start in a standing position with your feet shoulder-width apart and a dumbbell in each hand.
2. Lower your body into a squat position, placing the dumbbells on the ground in front of you.
3. Kick your feet back into a push-up position, keeping your body in a straight line.
4. Perform a push-up, bending your elbows and lowering your chest towards the ground.
5. Jump your feet back towards your hands, landing in a squat position.
6. Stand up explosively, lifting the dumbbells off the ground and bringing them to your shoulders.
7. Press the dumbbells overhead, fully extending your arms.
8. Lower the dumbbells back to your shoulders and repeat the entire sequence for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1201.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Clean', 'Legs', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand with an overhand grip.
2. Bend your knees and lower your hips into a squat position, keeping your back straight and chest up.
3. Explosively extend your hips and knees, driving through your heels to jump off the ground.
4. As you jump, shrug your shoulders and pull the dumbbells up towards your shoulders, keeping them close to your body.
5. Catch the dumbbells at shoulder height, with your elbows pointing forward and your palms facing up.
6. Lower the dumbbells back down to the starting position by reversing the movement.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0295.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Close Grip Press', 'Arms', '1. Sit on a flat bench with a dumbbell in each hand, resting on your thighs.
2. Using your thighs to help raise the dumbbells, lift the dumbbells one at a time so that you can hold them in front of you at shoulder width.
3. Once at shoulder width, rotate your wrists forward so that the palms of your hands are facing away from you. This will be your starting position.
4. As you breathe in, slowly lower the dumbbells to your side until they are about level with your chest.
5. As you exhale, use your triceps to lift the dumbbells back to the starting position. Make sure to use only your triceps and do not use your forearms or biceps to help lift the dumbbells.
6. After a second pause at the contracted position, repeat the movement for the prescribed amount of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1731.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Close-grip Press', 'Arms', '1. Sit on a flat bench with a dumbbell in each hand, resting on your thighs.
2. Using your thighs to help raise the dumbbells, lift the dumbbells one at a time so that you can hold them in front of you at shoulder width.
3. Once at shoulder width, rotate your wrists forward so that the palms of your hands are facing away from you. This will be your starting position.
4. As you breathe in, slowly lower the dumbbells to your side until they are about level with your chest.
5. As you exhale, use your triceps to lift the dumbbells back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0296.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Concentration Curl', 'Arms', '1. Sit on a bench with your legs spread apart and a dumbbell in one hand, resting your elbow on the inside of your thigh.
2. Fully extend your arm and hold the dumbbell with an underhand grip.
3. Keeping your upper arm stationary, exhale and curl the weight up towards your shoulder while contracting your biceps.
4. Continue to raise the dumbbell until your biceps are fully contracted and the dumbbell is at shoulder level.
5. Hold the contracted position for a brief pause as you squeeze your biceps.
6. Inhale and slowly lower the dumbbell back to the starting position.
7. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0297.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Contralateral Forward Lunge', 'Legs', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand.
2. Take a step forward with your right foot, keeping your back straight and core engaged.
3. Lower your body by bending both knees until your right thigh is parallel to the ground.
4. Push through your right heel to return to the starting position.
5. Repeat with your left leg.
6. Alternate legs for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3635.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Cross Body Hammer Curl', 'Arms', '1. Stand up straight with a dumbbell in each hand, palms facing your body.
2. Keep your elbows close to your torso and your upper arms stationary.
3. Exhale and curl the weights while contracting your biceps, bringing the dumbbells across your body towards your opposite shoulder.
4. Continue to raise the dumbbells until your biceps are fully contracted and the dumbbells are at shoulder level.
5. Hold the contracted position for a brief pause as you squeeze your biceps.
6. Inhale and slowly begin to lower the dumbbells back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0298.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Cross Body Hammer Curl V. 2', 'Arms', '1. Stand up straight with a dumbbell in each hand, palms facing your body.
2. Keep your elbows close to your torso and your upper arms stationary.
3. Exhale and curl the weights while contracting your biceps, bringing the dumbbells as close to your opposite shoulder as possible.
4. Hold the contracted position for a brief pause as you squeeze your biceps.
5. Inhale and slowly begin to lower the dumbbells back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1657.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Cuban Press', 'Shoulders', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand at shoulder height with your palms facing down.
2. Keeping your core engaged and your elbows slightly bent, press the dumbbells up and overhead until your arms are fully extended.
3. Rotate your wrists so that your palms are facing forward.
4. Slowly lower the dumbbells back to the starting position, rotating your wrists back to the starting position as you do so.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0299.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Cuban Press V. 2', 'Shoulders', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand at shoulder height with your palms facing down.
2. Keeping your core engaged and your back straight, press the dumbbells straight up overhead until your arms are fully extended.
3. Rotate your wrists so that your palms are facing forward.
4. Lower the dumbbells back down to shoulder height, rotating your wrists back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2136.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Deadlift', 'Legs', '1. Stand with your feet shoulder-width apart, toes pointing forward.
2. Hold a dumbbell in each hand, palms facing your body, arms extended downwards.
3. Bend at your hips and knees, lowering the dumbbells towards the ground while keeping your back straight.
4. Push through your heels and extend your hips and knees, lifting the dumbbells back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0300.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Decline Bench Press', 'Chest', '1. Lie down on a decline bench with your feet secured and your head lower than your hips.
2. Hold a dumbbell in each hand and extend your arms straight up above your chest, palms facing forward.
3. Lower the dumbbells slowly to the sides of your chest, keeping your elbows at a 90-degree angle.
4. Push the dumbbells back up to the starting position, fully extending your arms.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0301.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Decline Fly', 'Chest', '1. Lie on a decline bench with your feet secured and your head lower than your hips.
2. Hold a dumbbell in each hand with your palms facing each other and your arms extended above your chest.
3. Lower the dumbbells out to the sides in a wide arc until you feel a stretch in your chest.
4. Pause for a moment, then squeeze your chest muscles to bring the dumbbells back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0302.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Decline Hammer Press', 'Chest', '1. Lie on a decline bench with your feet secured and your head lower than your hips.
2. Hold a dumbbell in each hand with your palms facing each other and your arms extended above your chest.
3. Lower the dumbbells to the sides of your chest, keeping your elbows slightly bent.
4. Press the dumbbells back up to the starting position, fully extending your arms.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0303.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Decline One Arm Fly', 'Chest', '1. Lie down on a decline bench with a dumbbell in one hand, resting it on your thigh.
2. Using your thigh to help raise the dumbbell, lift it up to shoulder width with your palm facing your torso.
3. Rotate your wrist so that the palm of your hand is facing forward.
4. As you breathe in, lower the dumbbell slowly to the side until you feel a stretch in your chest.
5. Exhale and use your chest muscles to bring the dumbbell back up to the starting position.
6. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1276.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Decline One Arm Hammer Press', 'Arms', '1. Lie on a decline bench with a dumbbell in one hand, resting on your chest.
2. Extend your arm straight up, keeping your elbow slightly bent.
3. Lower the dumbbell down towards your shoulder, keeping your elbow close to your body.
4. Press the dumbbell back up to the starting position.
5. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1617.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Decline Shrug', 'Back', '1. Set up a decline bench at a 45-degree angle.
2. Lie face down on the bench with your chest and stomach resting against it.
3. Hold a dumbbell in each hand with your arms fully extended towards the floor.
4. Keeping your arms straight, raise your shoulders towards your ears as high as possible.
5. Hold the contraction for a moment, then slowly lower the dumbbells back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0305.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Decline Shrug V. 2', 'Back', '1. Set up a decline bench at a 45-degree angle.
2. Lie face down on the bench with your chest and stomach resting on it.
3. Hold a dumbbell in each hand with your palms facing each other and your arms fully extended.
4. Keeping your arms straight, raise your shoulders as high as possible while squeezing your shoulder blades together.
5. Hold the contraction for a brief pause, then lower the dumbbells back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0304.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Decline Triceps Extension', 'Arms', '1. Lie on a decline bench with your head lower than your feet and hold a dumbbell in each hand, palms facing each other.
2. Extend your arms fully, keeping your elbows close to your head.
3. Lower the dumbbells slowly behind your head, bending your elbows.
4. Pause for a moment, then raise the dumbbells back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0306.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Decline Twist Fly', 'Chest', '1. Lie down on a decline bench with your head lower than your hips.
2. Hold a dumbbell in each hand with your palms facing each other and your arms extended straight up over your chest.
3. Lower the dumbbells out to the sides in a wide arc until you feel a stretch in your chest.
4. As you lower the dumbbells, twist your wrists so that your palms face forward at the bottom of the movement.
5. Reverse the motion and bring the dumbbells back up to the starting position, squeezing your chest muscles at the top.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0307.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Finger Curls', 'Arms', '1. Sit on a bench or chair with your feet flat on the ground and your back straight.
2. Hold a dumbbell in one hand with an underhand grip, resting your forearm on your thigh, palm facing up.
3. Allow the dumbbell to roll down to your fingertips, then curl it back up by flexing your fingers.
4. Repeat for the desired number of repetitions, then switch to the other hand.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1437.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Fly', 'Chest', '1. Lie flat on a bench with a dumbbell in each hand, palms facing each other.
2. Extend your arms straight up over your chest, with a slight bend in your elbows.
3. Keeping a slight bend in your elbows, lower your arms out to the sides in a wide arc until you feel a stretch in your chest.
4. Pause for a moment, then reverse the movement and bring the dumbbells back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0308.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Fly On Exercise Ball', 'Chest', '1. Sit on an exercise ball and hold a dumbbell in each hand.
2. Walk your feet forward and roll your body down until your head, neck, and upper back are supported by the ball.
3. Extend your arms straight up above your chest, palms facing each other.
4. Bend your elbows slightly and lower your arms out to the sides in a wide arc until you feel a stretch in your chest.
5. Pause for a moment, then reverse the movement and squeeze your chest muscles as you bring the dumbbells back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1277.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Forward Lunge Triceps Extension', 'Arms', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand.
2. Take a step forward with your right foot, lowering your body into a lunge position.
3. Keep your back straight and your chest up.
4. Extend your arms straight overhead, keeping your elbows close to your ears.
5. Lower the dumbbells behind your head by bending your elbows.
6. Pause for a moment, then straighten your arms to return to the starting position.
7. Repeat the movement for the desired number of repetitions, then switch legs and repeat.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1732.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Front Raise', 'Shoulders', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand with your palms facing your thighs.
2. Keeping your arms straight, exhale and lift the dumbbells in front of you until they are at shoulder level.
3. Pause for a moment at the top, then inhale and slowly lower the dumbbells back down to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0310.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Front Raise V. 2', 'Shoulders', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand with your palms facing your thighs.
2. Keep your back straight and engage your core.
3. Slowly lift the dumbbells in front of you, with your arms straight, until they are at shoulder level.
4. Pause for a moment at the top, then slowly lower the dumbbells back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0309.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Full Can Lateral Raise', 'Shoulders', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand with your palms facing your body.
2. Keep your back straight and engage your core.
3. Raise your arms out to the sides, keeping a slight bend in your elbows, until they are parallel to the ground.
4. Pause for a moment at the top, then slowly lower your arms back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0311.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Goblet Squat', 'Legs', '1. Stand with your feet shoulder-width apart, holding a dumbbell vertically against your chest with both hands.
2. Keeping your chest up and core engaged, lower your body down into a squat position by pushing your hips back and bending your knees.
3. Continue lowering until your thighs are parallel to the ground, or as low as you can comfortably go.
4. Pause for a moment at the bottom, then push through your heels to return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1760.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Hammer Curl', 'Arms', '1. Stand up straight with a dumbbell in each hand, palms facing your torso.
2. Keep your elbows close to your torso and rotate the palms of your hands until they are facing forward.
3. This will be your starting position.
4. Now, keeping the upper arms stationary, exhale and curl the weights while contracting your biceps.
5. Continue to raise the weights until your biceps are fully contracted and the dumbbells are at shoulder level.
6. Hold the contracted position for a brief pause as you squeeze your biceps.
7. Then, inhale and slowly begin to lower the dumbbells back to the starting position.
8. Repeat for the recommended amount of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0313.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Hammer Curl On Exercise Ball', 'Arms', '1. Sit on an exercise ball with your feet flat on the ground and your back straight.
2. Hold a dumbbell in each hand with your palms facing your body and your arms fully extended.
3. Keeping your upper arms stationary, exhale and curl the dumbbells while contracting your biceps.
4. Continue to raise the dumbbells until your biceps are fully contracted and the dumbbells are at shoulder level.
5. Hold the contracted position for a brief pause as you squeeze your biceps.
6. Inhale and slowly begin to lower the dumbbells back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1659.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Hammer Curl V. 2', 'Arms', '1. Stand up straight with a dumbbell in each hand, palms facing your torso.
2. Keep your elbows close to your torso and rotate the palms of your hands until they are facing forward.
3. This will be your starting position.
4. Now, keeping the upper arms stationary, exhale and curl the weights while contracting your biceps.
5. Continue to raise the weights until your biceps are fully contracted and the dumbbells are at shoulder level.
6. Hold the contracted position for a brief pause as you squeeze your biceps.
7. Then, inhale and slowly begin to lower the dumbbells back to the starting position.
8. Repeat for the recommended amount of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0312.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Hammer Curls (with Arm Blaster)', 'Arms', '1. Stand up straight with a dumbbell in each hand, palms facing your torso.
2. Keep your elbows close to your torso and rotate the palms of your hands until they are facing forward.
3. This will be your starting position.
4. Now, while holding your upper arm stationary, exhale and curl the weights while contracting your biceps.
5. Continue to raise the weights until your biceps are fully contracted and the dumbbells are at shoulder level.
6. Hold the contracted position for a brief pause as you squeeze your biceps.
7. Then, inhale and slowly begin to lower the dumbbells back to the starting position.
8. Repeat for the recommended amount of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2402.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell High Curl', 'Arms', '1. Stand up straight with a dumbbell in each hand, palms facing forward.
2. Keep your upper arms stationary and curl the dumbbells as high as possible while contracting your biceps.
3. Pause for a moment at the top, then slowly lower the dumbbells back to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1664.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Incline Alternate Press', 'Chest', '1. Sit on an incline bench with a dumbbell in each hand, resting on your thighs.
2. Lean back on the bench and use your thighs to help raise the dumbbells to shoulder height, palms facing forward.
3. Once at shoulder height, rotate your wrists so that the palms of your hands are facing forward.
4. Push the dumbbells up with your chest and shoulders, extending your arms fully.
5. Lower the dumbbells back down to the starting position, keeping your elbows slightly bent.
6. Repeat for the desired number of repetitions, alternating arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3545.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Incline Bench Press', 'Chest', '1. Set up an incline bench at a 45-degree angle.
2. Sit on the bench with your feet flat on the ground and your back pressed firmly against the bench.
3. Hold a dumbbell in each hand, palms facing forward, and lift them to shoulder height.
4. Slowly lower the dumbbells to the sides of your chest, keeping your elbows at a 90-degree angle.
5. Push the dumbbells back up to the starting position, fully extending your arms.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0314.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Incline Biceps Curl', 'Arms', '1. Sit on an incline bench with a dumbbell in each hand, palms facing forward, and arms fully extended.
2. Keeping your upper arms stationary, exhale and curl the weights while contracting your biceps.
3. Continue to raise the dumbbells until your biceps are fully contracted and the dumbbells are at shoulder level.
4. Hold the contracted position for a brief pause as you squeeze your biceps.
5. Inhale and slowly begin to lower the dumbbells back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0315.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Incline Breeding', 'Chest', '1. Set up an incline bench at a 45-degree angle.
2. Sit on the bench with your back against the pad and feet flat on the ground.
3. Hold a dumbbell in each hand with an overhand grip, palms facing forward.
4. Start with your arms fully extended, perpendicular to the ground.
5. Lower the dumbbells slowly to the sides of your chest, keeping your elbows at a 90-degree angle.
6. Pause for a moment at the bottom, then push the dumbbells back up to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0316.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Incline Curl', 'Arms', '1. Set an incline bench to a 45-degree angle and sit on it with a dumbbell in each hand, palms facing forward.
2. Rest your upper arms on the incline bench and let your elbows hang down, fully extending your arms.
3. Keeping your upper arms stationary, exhale and curl the weights while contracting your biceps.
4. Continue to raise the dumbbells until your biceps are fully contracted and the dumbbells are at shoulder level.
5. Hold the contracted position for a brief pause as you squeeze your biceps.
6. Inhale and slowly begin to lower the dumbbells back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0318.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Incline Curl V. 2', 'Arms', '1. Sit on an incline bench with a dumbbell in each hand, palms facing forward and arms fully extended.
2. Keeping your upper arms stationary, exhale and curl the weights while contracting your biceps.
3. Continue to raise the dumbbells until your biceps are fully contracted and the dumbbells are at shoulder level.
4. Hold the contracted position for a brief pause as you squeeze your biceps.
5. Inhale and slowly begin to lower the dumbbells back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0317.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Incline Fly', 'Chest', '1. Set an incline bench to a 45-degree angle.
2. Sit on the bench with a dumbbell in each hand, palms facing each other.
3. Lie back on the bench and press the dumbbells up to the starting position, directly above your chest.
4. Lower the dumbbells out to the sides in a wide arc until you feel a stretch in your chest.
5. Pause for a moment, then squeeze your chest muscles to bring the dumbbells back up to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0319.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Incline Fly On Exercise Ball', 'Chest', '1. Set up an incline bench at a 45-degree angle.
2. Sit on an exercise ball and roll forward until your upper back is resting on the incline bench.
3. Hold a dumbbell in each hand with your palms facing each other and your arms extended above your chest.
4. Lower the dumbbells out to the sides in a wide arc until you feel a stretch in your chest.
5. Pause for a moment, then squeeze your chest muscles to bring the dumbbells back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1278.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Incline Hammer Curl', 'Arms', '1. Sit on an incline bench with a dumbbell in each hand, palms facing your torso and arms fully extended.
2. Keep your back against the bench and your feet flat on the floor.
3. While keeping your upper arms stationary, exhale and curl the weights while contracting your biceps.
4. Continue to raise the weights until your biceps are fully contracted and the dumbbells are at shoulder level.
5. Hold the contracted position for a brief pause as you squeeze your biceps.
6. Inhale and slowly begin to lower the dumbbells back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0320.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Incline Hammer Press', 'Chest', '1. Set an incline bench to a 45-degree angle and sit on it with a dumbbell in each hand, resting on your thighs.
2. Lie back on the bench and position the dumbbells at shoulder level with your palms facing each other.
3. Press the dumbbells up and away from your body until your arms are fully extended.
4. Pause for a moment at the top, then slowly lower the dumbbells back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0321.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Incline Hammer Press On Exercise Ball', 'Arms', '1. Sit on an exercise ball with a dumbbell in each hand, palms facing each other.
2. Walk your feet forward and roll your body down the ball until your head, neck, and upper back are supported on the ball.
3. Hold the dumbbells at shoulder level, elbows bent and pointing out to the sides.
4. Press the dumbbells up and slightly inward, keeping your palms facing each other.
5. Extend your arms fully, squeezing your triceps at the top of the movement.
6. Slowly lower the dumbbells back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1618.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Incline Inner Biceps Curl', 'Arms', '1. Sit on an incline bench with a dumbbell in each hand, palms facing each other.
2. Rest your upper arms on the bench, allowing your elbows to hang down and your palms to face forward.
3. Keeping your upper arms stationary, exhale and curl the weights while contracting your biceps.
4. Continue to raise the dumbbells until your biceps are fully contracted and the dumbbells are at shoulder level.
5. Hold the contracted position for a brief pause as you squeeze your biceps.
6. Inhale and slowly begin to lower the dumbbells back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0322.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Incline One Arm Fly', 'Chest', '1. Adjust the incline bench to a 30-45 degree angle.
2. Sit on the bench with a dumbbell in one hand, resting it on your thigh.
3. Lie back on the bench, keeping your feet flat on the ground.
4. Hold the dumbbell with your arm extended straight up over your chest.
5. Lower the dumbbell out to the side in a wide arc, keeping a slight bend in your elbow.
6. Pause when your arm is parallel to the ground, then reverse the motion to bring the dumbbell back to the starting position.
7. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1279.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Incline One Arm Fly On Exercise Ball', 'Chest', '1. Sit on an exercise ball with a dumbbell in one hand.
2. Walk your feet forward and roll your body down until your head, neck, and upper back are supported on the ball.
3. Hold the dumbbell with your arm extended straight up over your chest, palm facing inwards.
4. Slowly lower the dumbbell out to the side, keeping a slight bend in your elbow.
5. Pause for a moment when your arm is parallel to the ground.
6. Engage your chest muscles to bring the dumbbell back up to the starting position.
7. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1280.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Incline One Arm Hammer Press', 'Arms', '1. Sit on an incline bench with a dumbbell in one hand, resting on your thigh.
2. Lean back on the bench and use your thigh to help raise the dumbbell to shoulder height.
3. Rotate your wrist so that your palm is facing inward, towards your body.
4. Press the dumbbell up and away from your body, extending your arm fully.
5. Pause for a moment at the top, then slowly lower the dumbbell back down to the starting position.
6. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1619.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Incline One Arm Hammer Press On Exercise Ball', 'Arms', '1. Sit on an exercise ball with a dumbbell in one hand.
2. Walk your feet forward and roll your body down until your head, neck, and upper back are supported on the ball.
3. Hold the dumbbell with your palm facing inward and your elbow bent at a 90-degree angle.
4. Press the dumbbell up towards the ceiling, straightening your arm.
5. Lower the dumbbell back down to the starting position.
6. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1620.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Incline One Arm Lateral Raise', 'Shoulders', '1. Sit on an incline bench with a dumbbell in one hand, resting it on your thigh.
2. Lean forward and position your upper arm against the inside of your thigh.
3. Raise the dumbbell to the side, keeping your arm slightly bent and your palm facing down.
4. Continue lifting until your arm is parallel to the floor.
5. Pause for a moment at the top, then slowly lower the dumbbell back to the starting position.
6. Repeat for the desired number of repetitions, then switch to the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0323.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Incline One Arm Press', 'Chest', '1. Sit on an incline bench with a dumbbell in one hand, resting on your thigh.
2. Lie back on the bench and position the dumbbell at shoulder level, palm facing forward.
3. Press the dumbbell upward and slightly inward, extending your arm fully.
4. Pause for a moment at the top, then slowly lower the dumbbell back to the starting position.
5. Repeat for the desired number of repetitions, then switch to the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1281.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Incline One Arm Press On Exercise Ball', 'Chest', '1. Sit on an exercise ball with a dumbbell in one hand, feet flat on the ground.
2. Slowly walk your feet forward, rolling the ball until your head, neck, and upper back are supported on the ball.
3. Hold the dumbbell at shoulder height with your palm facing forward.
4. Press the dumbbell upward until your arm is fully extended.
5. Pause for a moment at the top, then slowly lower the dumbbell back to the starting position.
6. Repeat for the desired number of repetitions, then switch to the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1282.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Incline Palm-in Press', 'Chest', '1. Set up an incline bench at a 45-degree angle.
2. Sit on the bench with a dumbbell in each hand, palms facing each other.
3. Plant your feet firmly on the ground and keep your back straight against the bench.
4. Start with the dumbbells at shoulder level, elbows bent and palms facing each other.
5. Press the dumbbells up and away from your body, extending your arms fully.
6. Pause for a moment at the top, then slowly lower the dumbbells back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0324.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Incline Press On Exercise Ball', 'Chest', '1. Sit on an exercise ball with a dumbbell in each hand, palms facing forward.
2. Slowly walk your feet forward, rolling your body down the ball until your head, neck, and upper back are supported on the ball.
3. Hold the dumbbells at shoulder level, elbows bent and pointing out to the sides.
4. Press the dumbbells upward, extending your arms fully.
5. Pause for a moment at the top, then slowly lower the dumbbells back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1283.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Incline Raise', 'Shoulders', '1. Sit on an incline bench with a dumbbell in each hand, resting on your thighs.
2. Lean back on the bench and raise the dumbbells to shoulder height, palms facing forward.
3. Keeping your back against the bench, exhale and raise the dumbbells above your head, fully extending your arms.
4. Pause for a moment at the top, then inhale and slowly lower the dumbbells back to shoulder height.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0325.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Incline Rear Lateral Raise', 'Shoulders', '1. Set up an incline bench at a 45-degree angle.
2. Sit on the bench with your chest against the backrest and hold a dumbbell in each hand.
3. Extend your arms straight down with your palms facing each other.
4. Keeping a slight bend in your elbows, raise your arms out to the sides until they are parallel to the ground.
5. Pause for a moment at the top, then slowly lower your arms back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0326.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Incline Row', 'Back', '1. Set up an incline bench at a 45-degree angle.
2. Grab a dumbbell in each hand and sit on the bench with your chest against the incline.
3. Extend your arms fully, allowing the dumbbells to hang straight down from your shoulders.
4. Pull the dumbbells up towards your chest, squeezing your shoulder blades together.
5. Pause for a moment at the top, then slowly lower the dumbbells back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0327.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Incline Shoulder Raise', 'Chest', '1. Set an incline bench to a 45-degree angle and sit on it with a dumbbell in each hand, palms facing down.
2. Rest the dumbbells on your thighs and lean back onto the bench.
3. Use your thighs to help raise the dumbbells to shoulder height, then rotate your wrists so that your palms are facing forward.
4. Exhale and slowly raise the dumbbells above your head, keeping a slight bend in your elbows.
5. Pause for a moment at the top, then inhale and slowly lower the dumbbells back to shoulder height.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0328.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Incline Shrug', 'Back', '1. Set an incline bench to a 45-degree angle and sit on it with a dumbbell in each hand.
2. Place your feet flat on the ground and let your arms hang straight down with your palms facing your body.
3. Keeping your arms straight, shrug your shoulders up towards your ears as high as possible.
4. Hold the contraction for a moment, then slowly lower your shoulders back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0329.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Incline T-raise', 'Shoulders', '1. Set an incline bench to a 45-degree angle and sit on it with a dumbbell in each hand, palms facing inwards.
2. Lean forward and let your arms hang straight down, perpendicular to the floor.
3. Keeping your arms straight, raise them out to the sides until they are parallel to the floor, forming a ''T'' shape with your body.
4. Pause for a moment at the top, then slowly lower your arms back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3542.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Incline Triceps Extension', 'Arms', '1. Sit on an incline bench with a dumbbell in each hand, palms facing inwards.
2. Extend your arms fully overhead, keeping your elbows close to your head.
3. Lower the dumbbells behind your head by bending your elbows, keeping your upper arms stationary.
4. Pause for a moment, then raise the dumbbells back to the starting position by extending your arms.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0330.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Incline Twisted Flyes', 'Chest', '1. Set an incline bench to a 45-degree angle and sit on it with a dumbbell in each hand, palms facing each other.
2. Lie back on the bench and press the dumbbells up to the starting position, directly above your chest, with your arms extended.
3. Lower the dumbbells out to the sides in a wide arc until you feel a stretch in your chest.
4. As you lower the dumbbells, rotate your wrists so that your palms face forward at the bottom of the movement.
5. Reverse the motion and bring the dumbbells back up to the starting position, squeezing your chest muscles together at the top.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0331.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Incline Two Arm Extension', 'Arms', '1. Sit on an incline bench with a dumbbell in each hand, resting on your thighs.
2. Slowly lie back on the bench, keeping the dumbbells close to your chest.
3. Once you are fully lying down, extend your arms straight up towards the ceiling, keeping your elbows slightly bent.
4. Pause for a moment at the top, then slowly lower the dumbbells back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1733.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Incline Y-raise', 'Back', '1. Set an incline bench to a 45-degree angle and sit on it with a dumbbell in each hand, palms facing inwards.
2. Lean forward slightly and let your arms hang straight down, keeping a slight bend in your elbows.
3. Raise your arms out to the sides and up in a Y shape until they are parallel to the ground.
4. Pause for a moment at the top, then slowly lower your arms back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3541.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Iron Cross', 'Shoulders', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand at your sides.
2. Raise your arms out to the sides until they are parallel to the ground, forming a T shape with your body.
3. Pause for a moment, then slowly lower your arms back down to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0332.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Kickback', 'Arms', '1. Stand with your feet shoulder-width apart and hold a dumbbell in each hand.
2. Bend your knees slightly and hinge forward at the hips, keeping your back straight.
3. Bring your upper arms close to your sides, with your elbows bent at a 90-degree angle.
4. Extend your arms straight back, squeezing your triceps at the top of the movement.
5. Pause for a moment, then slowly lower the dumbbells back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0333.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Kickbacks On Exercise Ball', 'Arms', '1. Sit on an exercise ball with your feet flat on the ground and your back straight.
2. Hold a dumbbell in each hand with your palms facing inwards and your arms bent at a 90-degree angle.
3. Extend your arms straight back, squeezing your triceps at the top of the movement.
4. Pause for a moment, then slowly lower the dumbbells back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1734.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Kneeling Bicep Curl Exercise Ball', 'Arms', '1. Kneel on the floor with an exercise ball in front of you.
2. Place your elbows on top of the exercise ball, holding a dumbbell in each hand with your palms facing up.
3. Keeping your upper arms stationary, exhale and curl the dumbbells while contracting your biceps.
4. Continue to raise the dumbbells until your biceps are fully contracted and the dumbbells are at shoulder level.
5. Hold the contracted position for a brief pause as you squeeze your biceps.
6. Inhale and slowly begin to lower the dumbbells back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1660.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Lateral Raise', 'Shoulders', '1. Stand with your feet shoulder-width apart and hold a dumbbell in each hand, palms facing your body.
2. Keep your back straight and engage your core.
3. Raise your arms out to the sides until they are parallel to the floor, keeping a slight bend in your elbows.
4. Pause for a moment at the top, then slowly lower your arms back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0334.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Lateral To Front Raise', 'Shoulders', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand with your palms facing your body.
2. Keep your back straight and engage your core.
3. Raise your arms out to the sides until they are parallel to the ground, keeping a slight bend in your elbows.
4. Pause for a moment at the top, then slowly lower your arms back down to the starting position.
5. Next, raise your arms in front of you until they are parallel to the ground, again keeping a slight bend in your elbows.
6. Pause for a moment at the top, then slowly lower your arms back down to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0335.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Lunge', 'Legs', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand.
2. Take a step forward with your right foot, lowering your body into a lunge position.
3. Keep your back straight and your chest up as you lower your body.
4. Push through your right heel to return to the starting position.
5. Repeat with your left leg.
6. Alternate legs for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0336.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Lunge With Bicep Curl', 'Arms', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand with your palms facing forward.
2. Take a step forward with your right foot, lowering your body into a lunge position. Your right knee should be bent at a 90-degree angle and your left knee should be hovering just above the ground.
3. As you lunge forward, simultaneously curl the dumbbells towards your shoulders, keeping your elbows close to your body.
4. Pause for a moment at the bottom of the lunge, then push through your right heel to return to the starting position, lowering the dumbbells back down to your sides.
5. Repeat the lunge and bicep curl on the opposite side, stepping forward with your left foot.
6. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1658.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Lying Extension (across Face)', 'Arms', '1. Lie flat on a bench with your feet flat on the ground and your head at the end of the bench.
2. Hold a dumbbell with both hands and extend your arms straight up above your chest, palms facing each other.
3. Keeping your upper arms stationary, slowly lower the dumbbell in an arc behind your head until your forearms are parallel to the ground.
4. Pause for a moment, then contract your triceps to bring the dumbbell back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0337.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Lying Alternate Extension', 'Arms', '1. Lie flat on a bench with a dumbbell in each hand, palms facing each other.
2. Extend your arms straight up over your chest, keeping a slight bend in your elbows.
3. Lower one dumbbell down towards your head, bending at the elbow, while keeping the other arm extended.
4. Pause for a moment at the bottom, then raise the dumbbell back up to the starting position.
5. Repeat with the other arm, alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1729.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Lying Elbow Press', 'Arms', '1. Lie flat on a bench with a dumbbell in each hand, palms facing each other and arms extended straight up over your chest.
2. Lower the dumbbells towards your shoulders by bending your elbows, keeping your upper arms stationary.
3. Pause for a moment at the bottom, then press the dumbbells back up to the starting position by extending your elbows.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0338.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Lying External Shoulder Rotation', 'Shoulders', '1. Lie on your side on a flat bench with your upper arm against your side and your elbow bent 90 degrees.
2. Hold a dumbbell in your hand with your palm facing down.
3. Keeping your upper arm against your side, slowly rotate your forearm upward as far as possible.
4. Pause for a moment at the top, then slowly lower your forearm back down to the starting position.
5. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0863.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Lying Femoral', 'Legs', '1. Lie flat on your back with your legs extended and a dumbbell resting on your lower abdomen.
2. Bend your knees and bring the dumbbell towards your glutes, keeping your feet flat on the ground.
3. Pause for a moment at the top, then slowly lower the dumbbell back to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0339.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Lying Hammer Press', 'Chest', '1. Lie flat on a bench with a dumbbell in each hand, palms facing each other and arms extended straight up.
2. Lower the dumbbells to the sides of your chest, keeping your elbows at a 90-degree angle.
3. Press the dumbbells back up to the starting position, fully extending your arms.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0340.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Lying On Floor Rear Delt Raise', 'Shoulders', '1. Lie face down on the floor with a dumbbell in each hand, palms facing each other.
2. Extend your arms straight out in front of you, keeping a slight bend in your elbows.
3. Engaging your shoulder muscles, lift your arms up and out to the sides, squeezing your shoulder blades together.
4. Pause for a moment at the top, then slowly lower your arms back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2470.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Lying One Arm Deltoid Rear', 'Shoulders', '1. Lie face down on a flat bench with a dumbbell in one hand, palm facing inwards.
2. Extend your arm straight down towards the floor, keeping it close to your body.
3. Raise your arm up and back, squeezing your shoulder blade towards your spine.
4. Pause for a moment at the top, then slowly lower your arm back down to the starting position.
5. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0341.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Lying One Arm Press', 'Chest', '1. Lie flat on a bench with a dumbbell in one hand and your feet flat on the ground.
2. Hold the dumbbell at shoulder level with your palm facing forward.
3. Press the dumbbell upward until your arm is fully extended.
4. Pause for a moment at the top, then slowly lower the dumbbell back to the starting position.
5. Repeat for the desired number of repetitions, then switch to the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0343.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Lying One Arm Press V. 2', 'Chest', '1. Lie flat on a bench with your back supported and feet flat on the ground.
2. Hold a dumbbell in one hand with your palm facing towards your feet.
3. Extend your arm straight up towards the ceiling, keeping your elbow slightly bent.
4. Slowly lower the dumbbell down towards your chest, keeping your elbow close to your body.
5. Pause for a moment at the bottom, then push the dumbbell back up to the starting position.
6. Repeat for the desired number of repetitions, then switch to the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0342.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Lying One Arm Pronated Triceps Extension', 'Arms', '1. Lie flat on a bench with your back and head supported, and your feet flat on the ground.
2. Hold a dumbbell in one hand with your palm facing down, and extend your arm straight up above your shoulder.
3. Keeping your upper arm stationary, slowly lower the dumbbell behind your head by bending your elbow.
4. Pause for a moment at the bottom, then extend your arm back up to the starting position.
5. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0344.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Lying One Arm Rear Lateral Raise', 'Shoulders', '1. Lie face down on a flat bench with a dumbbell in one hand, hanging towards the floor.
2. Keep your arm straight and lift the dumbbell out to the side, away from your body.
3. Pause for a moment at the top, then slowly lower the dumbbell back down to the starting position.
4. Repeat for the desired number of repetitions, then switch to the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0345.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Lying One Arm Supinated Triceps Extension', 'Arms', '1. Lie flat on a bench with your back and head supported, and your feet flat on the ground.
2. Hold a dumbbell in one hand with an underhand grip, and extend your arm straight up above your shoulder.
3. Keeping your upper arm stationary, slowly lower the dumbbell behind your head by bending your elbow.
4. Pause for a moment at the bottom, then extend your arm back up to the starting position.
5. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0346.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Lying Pronation', 'Arms', '1. Lie flat on a bench with your chest facing down and your arms extended straight down, holding a dumbbell in each hand.
2. Rotate your palms so they are facing up.
3. Keeping your upper arms stationary, exhale and curl the dumbbells as you rotate your palms to face down.
4. Inhale and slowly lower the dumbbells back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0347.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Lying Pronation On Floor', 'Arms', '1. Lie flat on the floor with your face down and your arms extended straight out in front of you, holding a dumbbell in each hand.
2. Rotate your palms so they are facing down towards the floor.
3. Keeping your arms straight, lift the dumbbells off the floor by contracting your forearms.
4. Continue lifting until your forearms are fully contracted and the dumbbells are at shoulder level.
5. Hold for a moment, then slowly lower the dumbbells back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2705.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Lying Pullover On Exercise Ball', 'Chest', '1. Sit on an exercise ball and roll forward until your upper back is resting on the ball.
2. Hold a dumbbell with both hands and extend your arms straight up over your chest.
3. Slowly lower the dumbbell behind your head while keeping your arms straight.
4. Pause for a moment, then raise the dumbbell back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1284.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Lying Rear Delt Row', 'Back', '1. Lie face down on a flat bench with a dumbbell in each hand, palms facing inwards.
2. Extend your arms straight down towards the floor, keeping a slight bend in your elbows.
3. Engaging your back muscles, lift the dumbbells up towards your chest, squeezing your shoulder blades together.
4. Pause for a moment at the top, then slowly lower the dumbbells back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1328.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Lying Rear Lateral Raise', 'Shoulders', '1. Lie face down on a flat bench with a dumbbell in each hand, palms facing each other.
2. Extend your arms straight down towards the floor, keeping a slight bend in your elbows.
3. Engaging your shoulder muscles, lift your arms out to the sides until they are parallel to the floor.
4. Pause for a moment at the top, then slowly lower your arms back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0348.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Lying Single Extension', 'Arms', '1. Lie flat on a bench with a dumbbell in one hand and your arm fully extended above your chest.
2. Lower the dumbbell in a controlled manner towards your forehead, keeping your upper arm stationary.
3. Pause briefly at the bottom of the movement, then extend your arm back to the starting position.
4. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1735.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Lying Supination', 'Arms', '1. Lie flat on a bench with your feet flat on the ground.
2. Hold a dumbbell in each hand with your palms facing up and your arms fully extended.
3. Keeping your upper arms stationary, curl the dumbbells towards your shoulders by contracting your forearms.
4. Pause for a moment at the top, then slowly lower the dumbbells back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0349.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Lying Supination On Floor', 'Arms', '1. Lie flat on your back on the floor with your legs extended and your arms by your sides, holding a dumbbell in each hand.
2. Rotate your palms to face up, keeping your elbows close to your sides.
3. Slowly curl the dumbbells towards your shoulders, squeezing your forearms.
4. Pause for a moment at the top, then slowly lower the dumbbells back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2706.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Lying Supine Biceps Curl', 'Arms', '1. Lie flat on a bench with your back and head supported, and your feet flat on the ground.
2. Hold a dumbbell in each hand with your palms facing up and your arms fully extended.
3. Keeping your upper arms stationary, exhale and curl the weights while contracting your biceps.
4. Continue to raise the weights until your biceps are fully contracted and the dumbbells are at shoulder level.
5. Hold the contracted position for a brief pause as you squeeze your biceps.
6. Inhale and slowly begin to lower the dumbbells back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1661.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Lying Supine Curl', 'Arms', '1. Lie flat on a bench with a dumbbell in each hand, palms facing up and arms fully extended.
2. Keeping your upper arms stationary, exhale and curl the weights while contracting your biceps.
3. Continue to raise the dumbbells until your biceps are fully contracted and the dumbbells are at shoulder level.
4. Hold the contracted position for a brief pause as you squeeze your biceps.
5. Inhale and slowly begin to lower the dumbbells back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0350.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Lying Triceps Extension', 'Arms', '1. Lie flat on a bench with a dumbbell in each hand, palms facing each other.
2. Extend your arms straight up over your chest, keeping your elbows close to your body.
3. Lower the dumbbells down towards your forehead, bending your elbows.
4. Pause for a moment, then extend your arms back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0351.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Lying Wide Curl', 'Arms', '1. Lie flat on a bench with a dumbbell in each hand, palms facing up and arms fully extended.
2. Keeping your upper arms stationary, exhale and curl the weights while contracting your biceps.
3. Continue to raise the weights until your biceps are fully contracted and the dumbbells are at shoulder level.
4. Hold the contracted position for a brief pause as you squeeze your biceps.
5. Inhale and slowly begin to lower the dumbbells back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1662.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Neutral Grip Bench Press', 'Arms', '1. Lie flat on a bench with your feet flat on the ground and your back pressed against the bench.
2. Hold a dumbbell in each hand with a neutral grip (palms facing each other) and your arms extended straight up over your chest.
3. Slowly lower the dumbbells down towards your chest, keeping your elbows close to your body.
4. Pause for a moment at the bottom, then push the dumbbells back up to the starting position, fully extending your arms.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0352.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Arm Bench Fly', 'Chest', '1. Sit on a flat bench with a dumbbell in one hand, resting it on top of your thigh.
2. Lie back on the bench, keeping the dumbbell pressed against your thigh.
3. Using your free hand, help lift the dumbbell up to the starting position.
4. Hold the dumbbell directly above your shoulder with your arm extended and palm facing inward.
5. Lower the dumbbell out to the side in a wide arc, keeping a slight bend in your elbow.
6. Pause when your arm is parallel to the ground, then reverse the movement and bring the dumbbell back to the starting position.
7. Repeat for the desired number of repetitions, then switch arms and repeat.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1285.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Arm Bent-over Row', 'Back', '1. Stand with your feet shoulder-width apart, holding a dumbbell in one hand with your palm facing your body.
2. Bend your knees slightly and hinge forward at the hips, keeping your back straight and your core engaged.
3. Let the dumbbell hang straight down towards the floor, with your arm fully extended.
4. Pull the dumbbell up towards your chest, keeping your elbow close to your body and squeezing your shoulder blades together.
5. Pause for a moment at the top, then slowly lower the dumbbell back down to the starting position.
6. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0292.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Arm Chest Fly On Exercise Ball', 'Chest', '1. Sit on an exercise ball with a dumbbell in one hand and your feet flat on the ground.
2. Walk your feet forward, rolling the ball until your upper back is supported on the ball and your head, neck, and shoulders are off the ball.
3. Extend your arm with the dumbbell straight up above your chest, palm facing inward.
4. Slowly lower the dumbbell out to the side, keeping a slight bend in your elbow.
5. Pause for a moment when your arm is parallel to the ground.
6. Engage your chest muscles to bring the dumbbell back up to the starting position.
7. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1286.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Arm Concentration Curl (on Stability Ball)', 'Arms', '1. Sit on a stability ball with your feet flat on the ground and your knees bent at a 90-degree angle.
2. Hold a dumbbell in one hand with your palm facing up and your arm extended down towards the floor.
3. Rest your elbow on the inside of your thigh, just above the knee.
4. Keeping your upper arm stationary, exhale and curl the dumbbell up towards your shoulder while contracting your biceps.
5. Pause for a moment at the top of the movement, then inhale and slowly lower the dumbbell back down to the starting position.
6. Repeat for the desired number of repetitions, then switch arms and repeat.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0353.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Arm Decline Chest Press', 'Chest', '1. Lie on a decline bench with a dumbbell in one hand, resting on your chest.
2. Place your feet flat on the ground and keep your back pressed against the bench.
3. Extend your arm and push the dumbbell up towards the ceiling, fully extending your elbow.
4. Pause for a moment at the top, then slowly lower the dumbbell back down to the starting position.
5. Repeat for the desired number of repetitions, then switch to the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1287.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Arm Fly On Exercise Ball', 'Chest', '1. Sit on an exercise ball with a dumbbell in one hand and your feet flat on the ground.
2. Walk your feet forward and roll your body down until your upper back is resting on the exercise ball.
3. Extend your arm with the dumbbell straight up above your chest, palm facing inwards.
4. Slowly lower the dumbbell out to the side, keeping a slight bend in your elbow.
5. Pause for a moment, then squeeze your chest muscles to bring the dumbbell back to the starting position.
6. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1288.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Arm French Press On Exercise Ball', 'Arms', '1. Sit on an exercise ball with your feet flat on the ground and your back straight.
2. Hold a dumbbell in one hand with your palm facing up and your elbow bent at a 90-degree angle.
3. Extend your arm straight up towards the ceiling, keeping your elbow stationary.
4. Slowly lower the dumbbell back down to the starting position.
5. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1736.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Arm Hammer Preacher Curl', 'Arms', '1. Sit on a preacher bench with a dumbbell in one hand and your upper arm resting on the pad.
2. Hold the dumbbell with a neutral grip (palms facing your body).
3. Keeping your upper arm stationary, exhale and curl the dumbbell up towards your shoulder.
4. Pause for a moment at the top, squeezing your biceps.
5. Inhale and slowly lower the dumbbell back to the starting position.
6. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1663.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Arm Hammer Press On Exercise Ball', 'Arms', '1. Sit on an exercise ball with your feet flat on the ground and your back straight.
2. Hold a dumbbell in one hand with your palm facing inwards and your elbow bent at a 90-degree angle.
3. Place your other hand on your hip for stability.
4. Press the dumbbell upwards, extending your arm fully.
5. Pause for a moment at the top, then slowly lower the dumbbell back to the starting position.
6. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1621.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Arm Incline Chest Press', 'Chest', '1. Adjust the incline bench to a 45-degree angle.
2. Sit on the bench with your back against the pad and feet flat on the ground.
3. Hold a dumbbell in one hand with an overhand grip, resting it on your shoulder.
4. Push the dumbbell up and away from your body, extending your arm fully.
5. Pause for a moment at the top, then slowly lower the dumbbell back down to the starting position.
6. Repeat for the desired number of repetitions, then switch to the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1289.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Arm Kickback', 'Arms', '1. Stand with your feet shoulder-width apart and hold a dumbbell in your right hand.
2. Bend your knees slightly and hinge forward at the hips, keeping your back straight.
3. Bring your right elbow up to your side, keeping it bent at a 90-degree angle.
4. Extend your right arm straight back, squeezing your triceps at the top of the movement.
5. Slowly lower the dumbbell back to the starting position.
6. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0354.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Arm Lateral Raise', 'Shoulders', '1. Stand with your feet shoulder-width apart, holding a dumbbell in one hand with your palm facing your body.
2. Keep your back straight and your core engaged throughout the exercise.
3. Raise the dumbbell to the side, keeping your arm straight and your palm facing down.
4. Continue lifting until your arm is parallel to the ground.
5. Pause for a moment at the top, then slowly lower the dumbbell back to the starting position.
6. Repeat for the desired number of repetitions, then switch to the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0355.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Arm Lateral Raise With Support', 'Shoulders', '1. Stand with your feet shoulder-width apart and hold a dumbbell in one hand, with your palm facing your body.
2. Place your other hand on a stable surface, such as a bench or wall, for support.
3. Keep your back straight and engage your core.
4. Raise the dumbbell out to the side, keeping your arm straight and your palm facing down.
5. Continue lifting until your arm is parallel to the ground.
6. Pause for a moment at the top, then slowly lower the dumbbell back down to the starting position.
7. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0356.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Arm Press On Exercise Ball', 'Chest', '1. Sit on an exercise ball with your feet flat on the ground and your knees bent at a 90-degree angle.
2. Hold a dumbbell in one hand and position it at shoulder height, with your elbow bent and palm facing forward.
3. Slowly press the dumbbell upward until your arm is fully extended, while keeping your core engaged and maintaining balance on the exercise ball.
4. Pause for a moment at the top, then slowly lower the dumbbell back to the starting position.
5. Repeat for the desired number of repetitions, then switch to the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1290.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Arm Prone Curl', 'Arms', '1. Lie face down on a flat bench with a dumbbell in one hand, palm facing down.
2. Extend your arm fully, letting it hang straight down towards the floor.
3. Keeping your upper arm stationary, curl the dumbbell up towards your shoulder by contracting your biceps.
4. Pause for a moment at the top, then slowly lower the dumbbell back down to the starting position.
5. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1665.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Arm Prone Hammer Curl', 'Arms', '1. Lie face down on a flat bench with a dumbbell in one hand, palm facing your body and arm fully extended.
2. Keep your upper arm stationary and curl the dumbbell towards your shoulder, contracting your biceps.
3. Pause for a moment at the top, then slowly lower the dumbbell back to the starting position.
4. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1666.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Arm Pullover On Exercise Ball', 'Chest', '1. Sit on an exercise ball with your feet flat on the ground and your knees bent at a 90-degree angle.
2. Hold a dumbbell with one hand and extend your arm straight up above your chest.
3. Slowly lower the dumbbell behind your head while keeping your arm straight.
4. Pause for a moment, then raise the dumbbell back to the starting position.
5. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1291.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Arm Reverse Wrist Curl', 'Arms', '1. Sit on a bench or chair with your feet flat on the ground.
2. Hold a dumbbell in one hand with an overhand grip, palm facing down.
3. Rest your forearm on your thigh, with your wrist hanging off the edge.
4. Slowly lower the dumbbell towards the ground by flexing your wrist.
5. Pause for a moment at the bottom, then slowly curl your wrist back up towards your body.
6. Repeat for the desired number of repetitions, then switch to the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0358.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Arm Reverse Fly (with Support)', 'Shoulders', '1. Sit on a bench with your feet flat on the ground and your back straight.
2. Hold a dumbbell in one hand with your palm facing inwards.
3. Lean forward and place your free hand on the bench for support.
4. Keep your arm slightly bent and raise it out to the side until it is parallel to the ground.
5. Pause for a moment at the top, then slowly lower your arm back down to the starting position.
6. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0359.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Arm Reverse Grip Press', 'Chest', '1. Sit on a flat bench with a dumbbell in one hand, palm facing towards your body.
2. Place your feet flat on the ground and keep your back straight.
3. Raise the dumbbell to shoulder height, keeping your elbow close to your body.
4. Press the dumbbell upwards until your arm is fully extended.
5. Pause for a moment at the top, then slowly lower the dumbbell back to the starting position.
6. Repeat for the desired number of repetitions, then switch to the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1622.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Arm Reverse Preacher Curl', 'Arms', '1. Sit on a preacher bench with your chest against the pad and your arm extended over the edge of the bench, holding a dumbbell with an underhand grip.
2. Lower the dumbbell slowly until your arm is fully extended.
3. Curl the dumbbell back up towards your shoulder, keeping your upper arm stationary.
4. Squeeze your biceps at the top of the movement, then slowly lower the dumbbell back down to the starting position.
5. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1414.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Arm Reverse Spider Curl', 'Arms', '1. Stand up straight with a dumbbell in one hand, palm facing down and arm fully extended.
2. Keeping your upper arm stationary, curl the dumbbell towards your shoulder by flexing your elbow.
3. Pause for a moment at the top, then slowly lower the dumbbell back to the starting position.
4. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1667.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Arm Seated Bicep Curl On Exercise Ball', 'Arms', '1. Sit on an exercise ball with your feet flat on the ground and your back straight.
2. Hold a dumbbell in one hand with your palm facing up and your arm fully extended.
3. Keeping your upper arm stationary, curl the dumbbell towards your shoulder by contracting your biceps.
4. Pause for a moment at the top, then slowly lower the dumbbell back to the starting position.
5. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1668.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Arm Seated Hammer Curl', 'Arms', '1. Sit on a bench with your back straight and feet flat on the ground.
2. Hold a dumbbell in one hand with a neutral grip (palms facing each other).
3. Rest your elbow on the inside of your thigh, just above the knee.
4. Keeping your upper arm stationary, exhale and curl the dumbbell up towards your shoulder.
5. Pause for a moment at the top, squeezing your biceps.
6. Inhale and slowly lower the dumbbell back to the starting position.
7. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1669.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Arm Seated Neutral Wrist Curl', 'Arms', '1. Sit on a bench with your feet flat on the ground and hold a dumbbell in one hand, palm facing up.
2. Rest your forearm on your thigh, allowing your wrist to hang off the edge.
3. Keeping your forearm stationary, curl your wrist upward as far as possible.
4. Pause for a moment at the top, then slowly lower your wrist back down to the starting position.
5. Repeat for the desired number of repetitions, then switch to the other hand.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1415.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Arm Shoulder Press', 'Shoulders', '1. Stand with your feet shoulder-width apart and hold a dumbbell in one hand at shoulder level, palm facing forward.
2. Press the dumbbell upward until your arm is fully extended overhead.
3. Pause for a moment at the top, then slowly lower the dumbbell back to the starting position.
4. Repeat for the desired number of repetitions, then switch to the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0361.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Arm Shoulder Press V. 2', 'Shoulders', '1. Stand with your feet shoulder-width apart and hold a dumbbell in one hand at shoulder level, palm facing forward.
2. Engage your core and press the dumbbell straight up overhead, fully extending your arm.
3. Pause for a moment at the top, then slowly lower the dumbbell back to shoulder level.
4. Repeat for the desired number of repetitions, then switch to the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0360.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Arm Snatch', 'Legs', '1. Stand with your feet shoulder-width apart, holding a dumbbell in one hand with an overhand grip.
2. Bend your knees slightly and hinge forward at the hips, keeping your back straight and chest up.
3. Lower the dumbbell towards the ground, keeping it close to your body.
4. Explosively extend your hips, knees, and ankles, driving the dumbbell upwards in a straight line.
5. As the dumbbell reaches shoulder height, quickly rotate your hand and punch it overhead, fully extending your arm.
6. Catch the dumbbell overhead with a slight bend in your knees and hips.
7. Lower the dumbbell back down to the starting position in a controlled manner.
8. Repeat for the desired number of repetitions, then switch to the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3888.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Arm Standing Curl', 'Arms', '1. Stand up straight with a dumbbell in one hand, palm facing forward and arm fully extended.
2. Keeping your upper arm stationary, exhale and curl the weight upward while contracting your biceps.
3. Continue to raise the dumbbell until your biceps are fully contracted and the dumbbell is at shoulder level.
4. Hold the contracted position for a brief pause as you squeeze your biceps.
5. Inhale and slowly lower the dumbbell back to the starting position.
6. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1670.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Arm Standing Hammer Curl', 'Arms', '1. Stand up straight with a dumbbell in each hand, palms facing your torso.
2. Keep your elbows close to your torso and your upper arms stationary.
3. Exhale and curl the weights while contracting your biceps.
4. Continue to raise the weights until your biceps are fully contracted and the dumbbells are at shoulder level.
5. Hold the contracted position for a brief pause as you squeeze your biceps.
6. Inhale and slowly begin to lower the dumbbells back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1671.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Arm Triceps Extension (on Bench)', 'Arms', '1. Sit on a bench with your back straight and feet flat on the ground.
2. Hold a dumbbell in one hand and place your other hand on the bench for support.
3. Raise the dumbbell overhead, keeping your upper arm close to your head and your elbow pointing forward.
4. Lower the dumbbell behind your head by bending your elbow, keeping your upper arm stationary.
5. Extend your arm back up to the starting position, fully straightening your elbow.
6. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0362.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Arm Upright Row', 'Shoulders', '1. Stand with your feet shoulder-width apart, holding a dumbbell in one hand with an overhand grip.
2. Let the dumbbell hang at arm''s length in front of your thighs, with your palm facing your body.
3. Keeping your back straight and your core engaged, exhale and lift the dumbbell straight up towards your chin, leading with your elbow.
4. Pause for a moment at the top, then inhale and slowly lower the dumbbell back down to the starting position.
5. Repeat for the desired number of repetitions, then switch to the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0363.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Arm Wrist Curl', 'Arms', '1. Sit on a bench or chair with your feet flat on the ground.
2. Hold a dumbbell in one hand with an underhand grip, resting your forearm on your thigh.
3. Allow your wrist to extend, letting the dumbbell roll down towards your fingers.
4. Slowly curl your wrist back up, bringing the dumbbell towards your forearm.
5. Repeat for the desired number of repetitions, then switch to the other hand.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0364.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Arm Zottman Preacher Curl', 'Arms', '1. Sit on a preacher curl bench and hold a dumbbell in one hand with an underhand grip.
2. Rest your upper arm on the preacher bench pad, allowing your arm to fully extend.
3. Curl the dumbbell up towards your shoulder, keeping your upper arm stationary.
4. At the top of the curl, rotate your wrist so that your palm faces up.
5. Slowly lower the dumbbell back down to the starting position, rotating your wrist back to the starting position.
6. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1672.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell One Leg Fly On Exercise Ball', 'Chest', '1. Sit on an exercise ball with a dumbbell in each hand, palms facing each other.
2. Place one foot on the ground and extend the other leg straight out in front of you.
3. Lean forward slightly and bring your arms out to the sides, keeping a slight bend in your elbows.
4. Slowly lower the dumbbells down and out to the sides, feeling a stretch in your chest.
5. Pause for a moment at the bottom, then squeeze your chest muscles to bring the dumbbells back up to the starting position.
6. Repeat for the desired number of repetitions, then switch legs and repeat.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1292.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Over Bench Neutral Wrist Curl', 'Arms', '1. Sit on a bench with your feet flat on the ground and hold a dumbbell in each hand, palms facing up.
2. Rest your forearms on the bench, allowing your wrists to hang off the edge.
3. Keeping your upper arms stationary, exhale and curl the dumbbells up towards your shoulders.
4. Pause for a moment at the top, then inhale and slowly lower the dumbbells back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0365.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Over Bench One Arm Neutral Wrist Curl', 'Arms', '1. Sit on a bench with a dumbbell in one hand and your arm extended over the bench, palm facing up.
2. Keep your upper arm stationary and curl the dumbbell towards your shoulder, keeping your wrist in a neutral position.
3. Pause for a moment at the top, then slowly lower the dumbbell back to the starting position.
4. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0366.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Over Bench One Arm Reverse Wrist Curl', 'Arms', '1. Sit on a bench with your feet flat on the ground and hold a dumbbell in one hand, palm facing down.
2. Rest your forearm on the bench with your wrist hanging off the edge.
3. Slowly curl your wrist upwards, bringing the dumbbell towards your forearm.
4. Pause for a moment at the top, then slowly lower the dumbbell back down to the starting position.
5. Repeat for the desired number of repetitions, then switch to the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1441.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Over Bench One Arm Wrist Curl', 'Arms', '1. Sit on a bench with your feet flat on the ground and hold a dumbbell in one hand, palm facing down.
2. Rest your forearm on the bench with your wrist hanging off the edge.
3. Slowly curl your wrist upwards, bringing the dumbbell towards your forearm.
4. Pause for a moment at the top, then slowly lower the dumbbell back down to the starting position.
5. Repeat for the desired number of repetitions, then switch to the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0367.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Over Bench Revers Wrist Curl', 'Arms', '1. Sit on a bench with your feet flat on the ground and hold a dumbbell in each hand, palms facing down.
2. Rest your forearms on the bench, allowing your wrists to hang off the edge.
3. Slowly curl your wrists upward, bringing the dumbbells towards your body.
4. Pause for a moment at the top, then slowly lower the dumbbells back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0368.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Over Bench Wrist Curl', 'Arms', '1. Sit on a bench with your forearms resting on the bench and your palms facing up, holding a dumbbell in each hand.
2. Allow your wrists to hang over the edge of the bench.
3. Slowly curl your wrists upward, squeezing your forearms at the top of the movement.
4. Pause for a moment, then slowly lower your wrists back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0369.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Palm Rotational Bent Over Row', 'Back', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand with an overhand grip.
2. Bend forward at the hips, keeping your back straight and your knees slightly bent.
3. Let your arms hang straight down, palms facing your body.
4. Engage your core and pull the dumbbells up towards your chest, keeping your elbows close to your body.
5. As you pull the dumbbells up, rotate your palms so they face away from your body.
6. Squeeze your shoulder blades together at the top of the movement.
7. Slowly lower the dumbbells back down to the starting position, rotating your palms back to the starting position.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1329.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Palms In Incline Bench Press', 'Arms', '1. Set up an incline bench at a 45-degree angle.
2. Sit on the bench with your back against the backrest and feet flat on the ground.
3. Hold a dumbbell in each hand with an overhand grip, palms facing inwards.
4. Extend your arms straight up above your chest, keeping a slight bend in your elbows.
5. Lower the dumbbells slowly towards your shoulders, keeping your elbows close to your body.
6. Pause for a moment at the bottom, then press the dumbbells back up to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1623.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Peacher Hammer Curl', 'Arms', '1. Stand up straight with a dumbbell in each hand, palms facing your torso.
2. Keep your elbows close to your torso and rotate the palms of your hands until they are facing forward.
3. This will be your starting position.
4. Now, keeping the upper arms stationary, exhale and curl the weights while contracting your biceps.
5. Continue to raise the weights until your biceps are fully contracted and the dumbbells are at shoulder level.
6. Hold the contracted position for a brief pause as you squeeze your biceps.
7. Then, inhale and slowly begin to lower the dumbbells back to the starting position.
8. Repeat for the recommended amount of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0370.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Plyo Squat', 'Legs', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand at your sides.
2. Lower your body into a squat position by bending your knees and pushing your hips back.
3. As you reach the bottom of the squat, explode upward, jumping off the ground.
4. While in the air, quickly switch the position of your feet, landing with your opposite foot forward.
5. Immediately lower your body back into a squat position and repeat the jump, switching your feet again.
6. Continue alternating the position of your feet with each jump for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0371.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Preacher Curl', 'Arms', '1. Sit on a preacher curl bench with your upper arms resting on the pad and your chest against it.
2. Hold a dumbbell in each hand with your palms facing up and your arms fully extended.
3. Keeping your upper arms stationary, exhale and curl the weights while contracting your biceps.
4. Continue to raise the dumbbells until your biceps are fully contracted and the dumbbells are at shoulder level.
5. Hold the contracted position for a brief pause as you squeeze your biceps.
6. Inhale and slowly begin to lower the dumbbells back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0372.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Preacher Curl Over Exercise Ball', 'Arms', '1. Sit on an exercise ball with your feet flat on the ground and your back straight.
2. Hold a dumbbell in one hand with an underhand grip, resting your elbow on the exercise ball.
3. Keeping your upper arm stationary, exhale and curl the dumbbell up towards your shoulder.
4. Pause for a moment at the top, then inhale and slowly lower the dumbbell back to the starting position.
5. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1673.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Press On Exercise Ball', 'Chest', '1. Sit on an exercise ball with your feet flat on the ground and dumbbells in each hand, resting on your thighs.
2. Slowly walk your feet forward, rolling the exercise ball until your lower back is supported on the ball and your knees are at a 90-degree angle.
3. Raise the dumbbells to shoulder height, palms facing forward.
4. Press the dumbbells upward until your arms are fully extended.
5. Pause for a moment at the top, then slowly lower the dumbbells back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1293.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Pronate-grip Triceps Extension', 'Arms', '1. Sit on a bench or chair with your back straight and feet flat on the ground.
2. Hold a dumbbell with both hands, palms facing down, and extend your arms straight up overhead.
3. Keeping your upper arms close to your head and elbows pointing forward, slowly lower the dumbbell behind your head by bending your elbows.
4. Pause for a moment, then extend your arms back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0373.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Prone Incline Curl', 'Arms', '1. Adjust the bench to a 45-degree incline.
2. Lie face down on the bench with your chest and stomach resting against it.
3. Hold a dumbbell in each hand with your palms facing down and your arms fully extended.
4. Keeping your upper arms stationary, exhale and curl the weights while contracting your biceps.
5. Continue to raise the weights until your biceps are fully contracted and the dumbbells are at shoulder level.
6. Hold the contracted position for a brief pause as you squeeze your biceps.
7. Inhale and slowly begin to lower the dumbbells back to the starting position.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0374.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Prone Incline Hammer Curl', 'Arms', '1. Adjust the bench to a 45-degree incline.
2. Lie face down on the bench with a dumbbell in each hand, palms facing each other.
3. Allow your arms to hang straight down towards the floor, keeping your elbows slightly bent.
4. Keeping your upper arms stationary, exhale and curl the weights while contracting your biceps.
5. Continue to raise the dumbbells until your biceps are fully contracted and the dumbbells are at shoulder level.
6. Hold the contracted position for a brief pause as you squeeze your biceps.
7. Inhale and slowly begin to lower the dumbbells back to the starting position.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1674.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Pullover', 'Chest', '1. Lie flat on a bench with your head at one end and your feet on the floor.
2. Hold a dumbbell with both hands and extend your arms straight above your chest.
3. Keeping a slight bend in your elbows, slowly lower the dumbbell behind your head until you feel a stretch in your chest and shoulders.
4. Pause for a moment, then raise the dumbbell back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0375.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Pullover Hip Extension On Exercise Ball', 'Chest', '1. Sit on an exercise ball with your feet flat on the ground and the dumbbell resting on your thighs.
2. Slowly walk your feet forward, rolling the exercise ball down your back until your head, neck, and upper back are supported on the ball.
3. Hold the dumbbell with both hands and extend your arms straight up over your chest, keeping a slight bend in your elbows.
4. Lower the dumbbell behind your head, keeping your arms straight and maintaining control.
5. Pause for a moment, then raise the dumbbell back to the starting position.
6. While keeping your arms extended, lift your hips off the ground, squeezing your glutes and engaging your core.
7. Lower your hips back down to the starting position.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1294.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Pullover On Exercise Ball', 'Chest', '1. Sit on an exercise ball and hold a dumbbell with both hands above your chest, arms extended.
2. Slowly lower the dumbbell behind your head while keeping your arms straight.
3. Pause for a moment, then raise the dumbbell back to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1295.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Push Press', 'Shoulders', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand at shoulder level.
2. Bend your knees slightly and dip your body down, then explosively extend your legs and press the dumbbells overhead.
3. Lock out your arms at the top of the movement, then lower the dumbbells back to shoulder level.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1700.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Raise', 'Shoulders', '1. Stand with your feet shoulder-width apart and hold a dumbbell in each hand, palms facing your body.
2. Keep your back straight and engage your core.
3. Raise your arms out to the sides until they are parallel to the floor, keeping a slight bend in your elbows.
4. Pause for a moment at the top, then slowly lower your arms back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0376.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Rear Delt Raise', 'Shoulders', '1. Stand with your feet shoulder-width apart and hold a dumbbell in each hand, palms facing your body.
2. Bend your knees slightly and hinge forward at the hips, keeping your back straight.
3. Raise your arms out to the sides, keeping a slight bend in your elbows, until they are parallel to the floor.
4. Pause for a moment at the top, then slowly lower your arms back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2292.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Rear Delt Row_shoulder', 'Shoulders', '1. Stand with your feet shoulder-width apart and knees slightly bent.
2. Hold a dumbbell in each hand with your palms facing your body.
3. Bend forward at the waist, keeping your back straight and your core engaged.
4. Extend your arms straight down towards the floor, with a slight bend in your elbows.
5. Raise the dumbbells out to the sides, squeezing your shoulder blades together.
6. Pause for a moment at the top, then slowly lower the dumbbells back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0377.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Rear Fly', 'Shoulders', '1. Stand with your feet shoulder-width apart and hold a dumbbell in each hand.
2. Bend your knees slightly and hinge forward at the hips, keeping your back straight.
3. Extend your arms straight down towards the ground, palms facing each other.
4. Keeping a slight bend in your elbows, lift your arms out to the sides and squeeze your shoulder blades together.
5. Pause for a moment at the top, then slowly lower your arms back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0378.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Rear Lateral Raise', 'Shoulders', '1. Stand with your feet shoulder-width apart and hold a dumbbell in each hand, palms facing your body.
2. Bend your knees slightly and hinge forward at the hips, keeping your back straight and core engaged.
3. Raise your arms out to the sides, keeping a slight bend in your elbows, until they are parallel to the floor.
4. Pause for a moment at the top, then slowly lower your arms back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0380.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Rear Lateral Raise (support Head)', 'Shoulders', '1. Stand with your feet shoulder-width apart and hold a dumbbell in each hand.
2. Bend your knees slightly and hinge forward at the hips, keeping your back straight.
3. Raise your arms out to the sides, keeping a slight bend in your elbows, until they are parallel to the ground.
4. Pause for a moment at the top, then slowly lower your arms back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0379.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Rear Lunge', 'Legs', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand.
2. Take a step backward with your right foot, lowering your body into a lunge position.
3. Bend your left knee and lower your body until your left thigh is parallel to the ground.
4. Pause for a moment, then push through your left heel to return to the starting position.
5. Repeat on the other side, stepping back with your left foot.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0381.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Revers Grip Biceps Curl', 'Arms', '1. Stand up straight with a dumbbell in each hand, palms facing down and arms fully extended.
2. Keeping your upper arms stationary, exhale and curl the weights while contracting your biceps.
3. Continue to raise the weights until your biceps are fully contracted and the dumbbells are at shoulder level.
4. Hold the contracted position for a brief pause as you squeeze your biceps.
5. Inhale and slowly begin to lower the dumbbells back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0382.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Reverse Bench Press', 'Chest', '1. Lie flat on a bench with your feet flat on the ground and your knees bent.
2. Hold a dumbbell in each hand with an overhand grip, palms facing towards your feet.
3. Extend your arms straight up towards the ceiling, keeping a slight bend in your elbows.
4. Slowly lower the dumbbells towards your chest, allowing your elbows to flare out to the sides.
5. Pause for a moment at the bottom, then push the dumbbells back up to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1624.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Reverse Fly', 'Shoulders', '1. Stand with your feet shoulder-width apart and hold a dumbbell in each hand.
2. Bend your knees slightly and hinge forward at the hips, keeping your back straight.
3. Extend your arms straight down in front of you, palms facing each other.
4. Keeping a slight bend in your elbows, raise your arms out to the sides until they are parallel to the ground.
5. Pause for a moment at the top, then slowly lower your arms back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0383.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Reverse Grip Incline Bench One Arm Row', 'Back', '1. Set up an incline bench at a 45-degree angle.
2. Place a dumbbell on the floor next to the bench.
3. Stand facing the bench with your feet shoulder-width apart.
4. Bend at the waist and place your left knee and left hand on the bench for support.
5. Pick up the dumbbell with your right hand using a reverse grip (palm facing down).
6. Keep your back straight and your core engaged.
7. Pull the dumbbell up towards your chest, keeping your elbow close to your body.
8. Squeeze your back muscles at the top of the movement.
9. Lower the dumbbell back down to the starting position in a controlled manner.
10. Repeat for the desired number of repetitions.
11. Switch sides and repeat the exercise with your left arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1330.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Reverse Grip Incline Bench Two Arm Row', 'Back', '1. Set up an incline bench at a 45-degree angle.
2. Sit on the bench with your chest against the backrest and your feet flat on the ground.
3. Hold a dumbbell in each hand with an underhand grip.
4. Lean forward and let your arms hang straight down, fully extended.
5. Pull the dumbbells up towards your chest, squeezing your shoulder blades together.
6. Pause for a moment at the top, then slowly lower the dumbbells back down to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1331.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Reverse Grip Row (female)', 'Back', '1. Stand with your feet shoulder-width apart and knees slightly bent.
2. Hold a dumbbell in each hand with an overhand grip, palms facing your body.
3. Bend forward at the waist, keeping your back straight and your core engaged.
4. Let your arms hang straight down, fully extended, with a slight bend in your elbows.
5. Pull the dumbbells up towards your chest, squeezing your shoulder blades together.
6. Pause for a moment at the top, then slowly lower the dumbbells back down to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2327.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Reverse Preacher Curl', 'Arms', '1. Sit on a preacher bench with your upper arms resting on the pad and your chest against the support.
2. Hold a dumbbell in each hand with an underhand grip, palms facing up.
3. Keeping your upper arms stationary, exhale and curl the dumbbells as you contract your biceps.
4. Continue to curl the dumbbells until your biceps are fully contracted and the dumbbells are at shoulder level.
5. Hold the contracted position for a brief pause as you squeeze your biceps.
6. Inhale and slowly lower the dumbbells back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0384.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Reverse Spider Curl', 'Arms', '1. Stand up straight with a dumbbell in each hand, palms facing your body and arms fully extended.
2. Keeping your upper arms stationary, exhale and curl the weights while contracting your biceps.
3. Continue to raise the dumbbells until your biceps are fully contracted and the dumbbells are at shoulder level.
4. Hold the contracted position for a brief pause as you squeeze your biceps.
5. Inhale and slowly begin to lower the dumbbells back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1675.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Reverse Wrist Curl', 'Arms', '1. Sit on a bench or chair with your feet flat on the ground.
2. Hold a dumbbell in each hand with an overhand grip, palms facing down.
3. Rest your forearms on your thighs, allowing your wrists to hang off the edge.
4. Slowly curl your wrists upward, bringing the dumbbells towards your body.
5. Pause for a moment at the top, then slowly lower the dumbbells back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0385.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Romanian Deadlift', 'Legs', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand with an overhand grip.
2. Keeping your back straight and your core engaged, hinge at the hips and lower the dumbbells towards the ground, allowing your knees to bend slightly.
3. Lower the dumbbells until you feel a stretch in your hamstrings, then push through your heels and engage your glutes to return to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1459.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Rotation Reverse Fly', 'Shoulders', '1. Stand with your feet shoulder-width apart and hold a dumbbell in each hand, palms facing inwards.
2. Bend your knees slightly and hinge forward at the hips, keeping your back straight and chest up.
3. Raise your arms out to the sides, keeping a slight bend in your elbows, until they are parallel to the floor.
4. Rotate your arms so that your palms are facing downwards.
5. Slowly lower your arms back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0386.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Scott Press', 'Shoulders', '1. Sit on a bench with a dumbbell in each hand, palms facing forward.
2. Raise the dumbbells to shoulder height, with your elbows bent and palms facing forward.
3. Press the dumbbells upward until your arms are fully extended.
4. Pause for a moment at the top, then slowly lower the dumbbells back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2397.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Seated Alternate Front Raise', 'Shoulders', '1. Sit on a bench with your back straight and feet flat on the ground.
2. Hold a dumbbell in each hand with your palms facing your body and arms extended down by your sides.
3. Keeping your arms straight, raise one dumbbell in front of you until it is parallel to the ground.
4. Pause for a moment at the top, then slowly lower the dumbbell back down to the starting position.
5. Repeat with the other arm.
6. Alternate between arms for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0387.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Seated Alternate Hammer Curl On Exercise Ball', 'Arms', '1. Sit on an exercise ball with your feet flat on the ground and your back straight.
2. Hold a dumbbell in each hand with your palms facing your body and your arms fully extended.
3. Keeping your upper arms stationary, exhale and curl one dumbbell up towards your shoulder while keeping your palm facing your body.
4. Continue to raise the dumbbell until your biceps are fully contracted and the dumbbell is at shoulder level.
5. Hold the contracted position for a brief pause as you squeeze your biceps.
6. Inhale and slowly lower the dumbbell back to the starting position.
7. Repeat the movement with the opposite arm.
8. Continue alternating arms for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1676.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Seated Alternate Press', 'Shoulders', '1. Sit on a bench with a dumbbell in each hand, palms facing forward.
2. Raise the dumbbells to shoulder height, with your elbows bent and palms facing forward.
3. Press one dumbbell up overhead, fully extending your arm.
4. Lower the dumbbell back down to shoulder height.
5. Repeat with the other arm.
6. Continue alternating arms for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0388.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Seated Alternate Shoulder', 'Shoulders', '1. Sit on a bench with your back straight and feet flat on the ground.
2. Hold a dumbbell in each hand, palms facing inwards, and raise them to shoulder height.
3. Press one dumbbell up overhead while keeping the other dumbbell at shoulder height.
4. Lower the raised dumbbell back to shoulder height while simultaneously pressing the other dumbbell up overhead.
5. Continue alternating between arms for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3546.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Seated Bench Extension', 'Arms', '1. Sit on a bench with your back straight and feet flat on the ground.
2. Hold a dumbbell with both hands and extend your arms straight up above your head.
3. Slowly lower the dumbbell behind your head, keeping your elbows close to your ears.
4. Pause for a moment, then raise the dumbbell back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0389.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Seated Bent Arm Lateral Raise', 'Shoulders', '1. Sit on a bench with your back straight and feet flat on the ground.
2. Hold a dumbbell in each hand with your palms facing your body and your arms bent at a 90-degree angle.
3. Keeping your elbows bent, raise your arms out to the sides until they are parallel to the ground.
4. Pause for a moment at the top, then slowly lower your arms back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2317.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Seated Bent Over Alternate Kickback', 'Arms', '1. Sit on a bench with a dumbbell in each hand, palms facing inwards.
2. Bend forward at the waist, keeping your back straight and parallel to the ground.
3. Extend one arm straight back, keeping it close to your body, until your arm is fully extended.
4. Pause for a moment, then slowly lower the dumbbell back to the starting position.
5. Repeat with the other arm.
6. Continue alternating arms for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1730.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Seated Bent Over Triceps Extension', 'Arms', '1. Sit on a bench with your feet flat on the ground and hold a dumbbell in each hand.
2. Bend forward at the waist, keeping your back straight and your head up.
3. Extend your arms straight back, keeping your elbows close to your head.
4. Pause for a moment, then slowly lower the dumbbells back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1737.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Seated Bicep Curl', 'Arms', '1. Sit on a bench with your feet flat on the ground and hold a dumbbell in each hand, palms facing up.
2. Keep your back straight and your elbows close to your torso.
3. Exhale and curl the dumbbells up towards your shoulders, contracting your biceps.
4. Pause for a moment at the top, then inhale and slowly lower the dumbbells back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1677.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Seated Biceps Curl (on Stability Ball)', 'Arms', '1. Sit on a stability ball with your feet flat on the ground and your back straight.
2. Hold a dumbbell in each hand with your palms facing forward and your arms fully extended.
3. Keeping your upper arms stationary, exhale and curl the dumbbells while contracting your biceps.
4. Continue to raise the dumbbells until your biceps are fully contracted and the dumbbells are at shoulder level.
5. Hold the contracted position for a brief pause as you squeeze your biceps.
6. Inhale and slowly begin to lower the dumbbells back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0390.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Seated Biceps Curl To Shoulder Press', 'Arms', '1. Sit on a bench with your back straight and feet flat on the ground.
2. Hold a dumbbell in each hand with your palms facing forward and arms fully extended.
3. Keeping your elbows close to your sides, curl the dumbbells up towards your shoulders.
4. Once your forearms are vertical, rotate your wrists so that your palms are facing forward.
5. Press the dumbbells overhead until your arms are fully extended.
6. Lower the dumbbells back down to the starting position by reversing the movement.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3547.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Seated Calf Raise', 'Legs', '1. Sit on a bench or chair with your feet flat on the ground and a dumbbell resting on your thighs.
2. Place the balls of your feet on a raised surface such as a step or block, with your heels hanging off the edge.
3. Hold onto the dumbbell for stability.
4. Raise your heels as high as possible, lifting your body weight onto the balls of your feet.
5. Pause for a moment at the top, then slowly lower your heels back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1379.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Seated Curl', 'Arms', '1. Sit on a bench with your feet flat on the ground and a dumbbell in each hand, palms facing forward.
2. Keep your back straight and your elbows close to your torso.
3. Exhale and curl the dumbbells up towards your shoulders, contracting your biceps.
4. Pause for a moment at the top, then inhale and slowly lower the dumbbells back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0391.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Seated Front Raise', 'Shoulders', '1. Sit on a bench with your feet flat on the ground and a dumbbell in each hand, resting on your thighs.
2. Keep your back straight and core engaged.
3. Raise the dumbbells in front of you, with your palms facing down, until they are at shoulder level.
4. Pause for a moment at the top, then slowly lower the dumbbells back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0392.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Seated Hammer Curl', 'Arms', '1. Sit on a bench with a dumbbell in each hand, palms facing your torso and arms extended straight down.
2. Keeping your upper arms stationary, exhale and curl the weights while contracting your biceps.
3. Continue to raise the dumbbells until your biceps are fully contracted and the dumbbells are at shoulder level.
4. Hold the contracted position for a brief pause as you squeeze your biceps.
5. Inhale and slowly begin to lower the dumbbells back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1678.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Seated Inner Biceps Curl', 'Arms', '1. Sit on a bench with your feet flat on the ground and hold a dumbbell in each hand, palms facing up.
2. Rest your upper arms on your thighs, allowing the dumbbells to hang down.
3. Keeping your upper arms stationary, curl the dumbbells up towards your shoulders by contracting your biceps.
4. Pause for a moment at the top, then slowly lower the dumbbells back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0393.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Seated Kickback', 'Arms', '1. Sit on a bench with your feet flat on the ground and hold a dumbbell in each hand.
2. Bend your knees slightly and lean forward from your hips, keeping your back straight.
3. Bring your upper arms close to your sides and keep your elbows bent at a 90-degree angle.
4. Extend your arms straight back, squeezing your triceps at the top of the movement.
5. Pause for a moment, then slowly lower the dumbbells back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0394.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Seated Lateral Raise', 'Shoulders', '1. Sit on a bench with your feet flat on the ground and a dumbbell in each hand, resting on your thighs.
2. Keep your back straight and core engaged.
3. Raise the dumbbells to your sides with a slight bend in your elbows, until your arms are parallel to the ground.
4. Pause for a moment at the top, then slowly lower the dumbbells back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0396.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Seated Lateral Raise V. 2', 'Shoulders', '1. Sit on a bench with your feet flat on the ground and a dumbbell in each hand, resting on your thighs.
2. Keep your back straight and core engaged.
3. Raise the dumbbells to your sides with a slight bend in your elbows, until your arms are parallel to the ground.
4. Pause for a moment at the top, then slowly lower the dumbbells back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0395.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Seated Neutral Wrist Curl', 'Arms', '1. Sit on a bench with your feet flat on the ground and hold a dumbbell in each hand, palms facing each other.
2. Rest your forearms on your thighs, allowing the dumbbells to hang down.
3. Keeping your wrists in a neutral position, curl the dumbbells up towards your shoulders.
4. Pause for a moment at the top, then slowly lower the dumbbells back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0397.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Seated One Arm Bicep Curl On Exercise Ball With Leg Raised', 'Arms', '1. Sit on an exercise ball with your feet flat on the ground and your back straight.
2. Hold a dumbbell in one hand with your palm facing up and your arm fully extended.
3. Place your other hand on your hip for stability.
4. Slowly curl the dumbbell towards your shoulder, keeping your upper arm stationary.
5. Pause for a moment at the top of the movement, squeezing your bicep.
6. Slowly lower the dumbbell back to the starting position.
7. Repeat for the desired number of repetitions.
8. Switch arms and repeat the exercise.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1679.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Seated One Arm Kickback', 'Arms', '1. Sit on a bench with your feet flat on the ground and hold a dumbbell in one hand.
2. Bend your torso forward at the waist, keeping your back straight and parallel to the ground.
3. Extend your arm straight back, keeping your elbow close to your body.
4. Pause for a moment at the top, then slowly lower the dumbbell back to the starting position.
5. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0398.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Seated One Arm Rotate', 'Arms', '1. Sit on a bench with your back straight and hold a dumbbell in one hand, resting it on your thigh.
2. Raise the dumbbell up to shoulder height, keeping your elbow close to your body.
3. Rotate your forearm outward, away from your body, while keeping your upper arm stationary.
4. Pause for a moment at the top, then slowly rotate your forearm back to the starting position.
5. Repeat for the desired number of repetitions, then switch to the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0399.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Seated One Leg Calf Raise', 'Legs', '1. Sit on a bench or chair with your feet flat on the ground and a dumbbell resting on your right thigh.
2. Extend your left leg straight out in front of you, keeping your foot flexed.
3. Place the ball of your right foot on an elevated surface, such as a step or weight plate.
4. Using your calf muscles, raise your right heel as high as possible.
5. Pause for a moment at the top, then slowly lower your heel back down to the starting position.
6. Repeat for the desired number of repetitions, then switch legs.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0400.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Seated One Leg Calf Raise - Hammer Grip', 'Legs', '1. Sit on a bench or chair with your feet flat on the ground and a dumbbell resting on your thighs.
2. Place one foot on a raised surface, such as a step or block, with your heel hanging off the edge.
3. Hold the dumbbell with a hammer grip, meaning your palms are facing each other and your fingers are wrapped around the handle.
4. Keeping your core engaged and your back straight, slowly raise your heel as high as possible by pushing through the ball of your foot.
5. Pause for a moment at the top, then slowly lower your heel back down to the starting position.
6. Repeat for the desired number of repetitions, then switch to the other leg.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1380.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Seated One Leg Calf Raise - Palm Up', 'Legs', '1. Sit on a bench or chair with your back straight and your feet flat on the ground.
2. Hold a dumbbell in one hand and place it on top of your thigh, palm facing up.
3. Lift one leg off the ground and extend it in front of you, keeping your knee slightly bent.
4. Raise your heel as high as possible by pushing through the ball of your foot.
5. Pause for a moment at the top, then slowly lower your heel back down.
6. Repeat for the desired number of repetitions, then switch legs and repeat.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1381.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Seated Palms Up Wrist Curl', 'Arms', '1. Sit on a bench with your feet flat on the ground and hold a dumbbell in each hand, palms facing up.
2. Rest your forearms on your thighs, allowing your wrists to hang off the edge.
3. Slowly curl your wrists upward, squeezing your forearms at the top of the movement.
4. Pause for a moment, then lower your wrists back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0401.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Seated Preacher Curl', 'Arms', '1. Sit on a preacher curl bench with your feet flat on the floor.
2. Hold a dumbbell in one hand with an underhand grip, resting your upper arm against the preacher pad.
3. Keeping your upper arm stationary, exhale and curl the dumbbell up towards your shoulder.
4. Pause for a moment at the top, then inhale and slowly lower the dumbbell back down to the starting position.
5. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0402.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Seated Revers Grip Concentration Curl', 'Arms', '1. Sit on a bench with your feet flat on the ground and hold a dumbbell in one hand, palm facing up.
2. Rest your elbow on the inside of your thigh, just above the knee.
3. Keeping your upper arm stationary, exhale and curl the dumbbell towards your shoulder.
4. Pause for a moment at the top, squeezing your biceps.
5. Inhale and slowly lower the dumbbell back to the starting position.
6. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0403.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Seated Reverse Grip One Arm Overhead Tricep Extension', 'Arms', '1. Sit on a bench with your back straight and feet flat on the ground.
2. Hold a dumbbell with an underhand grip and extend your arm straight up overhead.
3. Lower the dumbbell behind your head by bending your elbow, keeping your upper arm stationary.
4. Pause for a moment, then extend your arm back up to the starting position.
5. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1738.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Seated Shoulder Press', 'Shoulders', '1. Sit on a bench with a dumbbell in each hand, resting on your thighs.
2. Raise the dumbbells to shoulder height, palms facing forward.
3. Press the dumbbells upward until your arms are fully extended overhead.
4. Pause for a moment at the top, then slowly lower the dumbbells back to shoulder height.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0405.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Seated Shoulder Press (parallel Grip)', 'Shoulders', '1. Sit on a bench with a dumbbell in each hand, palms facing inward.
2. Raise the dumbbells to shoulder height, elbows bent and palms facing forward.
3. Press the dumbbells upward until your arms are fully extended overhead.
4. Pause for a moment at the top, then slowly lower the dumbbells back to shoulder height.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0404.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Seated Triceps Extension', 'Arms', '1. Sit on a bench with your back straight and feet flat on the ground.
2. Hold a dumbbell with both hands and extend your arms straight up overhead.
3. Bend your elbows and lower the dumbbell behind your head, keeping your upper arms close to your ears.
4. Pause for a moment, then straighten your arms and return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2188.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Shrug', 'Back', '1. Stand with your feet shoulder-width apart and hold a dumbbell in each hand with your palms facing your body.
2. Keep your arms straight and let the dumbbells hang by your sides.
3. Raise your shoulders as high as possible, as if you are trying to touch your ears with your shoulders.
4. Hold the contraction for a second, then slowly lower your shoulders back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0406.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Side Bend', 'Core', '1. Stand up straight with your feet shoulder-width apart and hold a dumbbell in one hand, letting it hang down by your side.
2. Keeping your back straight and your core engaged, slowly bend sideways at the waist towards the opposite side of the dumbbell, lowering the weight as far as you comfortably can.
3. Pause for a moment, then slowly return to the starting position.
4. Repeat for the desired number of repetitions, then switch sides and repeat.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0407.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Side Lying One Hand Raise', 'Shoulders', '1. Lie on your side with your legs extended and your head supported by your arm.
2. Hold a dumbbell in your top hand with your palm facing down.
3. Keeping your arm straight, raise the dumbbell up to shoulder height.
4. Pause for a moment at the top, then slowly lower the dumbbell back down to the starting position.
5. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0408.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Side Plank With Rear Fly', 'Back', '1. Start by lying on your side with your legs extended and stacked on top of each other.
2. Place your forearm on the ground directly below your shoulder, keeping your elbow bent at a 90-degree angle.
3. Hold a dumbbell in your top hand, with your arm extended straight down towards the ground.
4. Engage your core and lift your hips off the ground, creating a straight line from your head to your heels.
5. While maintaining the side plank position, lift the dumbbell up towards the ceiling, squeezing your shoulder blades together.
6. Lower the dumbbell back down to the starting position.
7. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3664.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Single Arm Overhead Carry', 'Shoulders', '1. Stand tall with your feet shoulder-width apart, holding a dumbbell in one hand.
2. Raise the dumbbell overhead, fully extending your arm.
3. Engage your core and keep your back straight as you walk forward, maintaining the dumbbell overhead.
4. Continue walking for the desired distance or time.
5. Switch hands and repeat the exercise.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3548.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Single Leg Calf Raise', 'Legs', '1. Stand on the edge of a step or platform with your heels hanging off and your toes on the step.
2. Hold a dumbbell in one hand and place your other hand on a wall or railing for support.
3. Raise your heel as high as possible, lifting your body up onto your toes.
4. Pause for a moment at the top, then slowly lower your heel back down below the step.
5. Repeat for the desired number of repetitions, then switch to the other leg.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0409.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Single Leg Deadlift', 'Legs', '1. Stand with your feet hip-width apart, holding a dumbbell in your right hand.
2. Shift your weight onto your left leg and lift your right foot slightly off the ground.
3. Keeping your back straight, hinge forward at the hips and lower the dumbbell towards the ground.
4. At the same time, extend your right leg straight behind you, maintaining a slight bend in your left knee.
5. Lower the dumbbell until your torso and right leg are parallel to the ground.
6. Pause for a moment, then engage your glutes and hamstrings to return to the starting position.
7. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1757.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Single Leg Deadlift With Stepbox Support', 'Legs', '1. Stand with your feet hip-width apart, holding a dumbbell in your right hand.
2. Place your left foot on a stepbox or elevated surface behind you.
3. Keeping your back straight and core engaged, hinge forward at the hips, lowering the dumbbell towards the ground.
4. As you lower the dumbbell, simultaneously lift your left leg behind you, maintaining a straight line from head to heel.
5. Lower the dumbbell until you feel a stretch in your right hamstring, then return to the starting position.
6. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2805.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Single Leg Split Squat', 'Legs', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand.
2. Take a step forward with one foot and position your feet so that your front foot is flat on the ground and your back foot is elevated on a bench or step.
3. Lower your body by bending your front knee and hip, keeping your back knee slightly bent and your back heel off the ground.
4. Continue lowering until your front thigh is parallel to the ground, then push through your front heel to return to the starting position.
5. Repeat for the desired number of repetitions, then switch legs and repeat.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0410.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Single Leg Squat', 'Legs', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand.
2. Extend one leg forward and keep it off the ground throughout the exercise.
3. Bend your standing leg and lower your body down as if sitting back into a chair.
4. Keep your chest up and your back straight.
5. Pause for a moment at the bottom, then push through your heel to return to the starting position.
6. Repeat for the desired number of repetitions, then switch legs.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0411.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Squat', 'Legs', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand at your sides.
2. Keeping your chest up and core engaged, lower your body down by bending at the knees and hips, as if sitting back into a chair.
3. Continue lowering until your thighs are parallel to the ground, or as low as you can comfortably go.
4. Pause for a moment at the bottom, then push through your heels to return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0413.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Standing Alternate Hammer Curl And Press', 'Arms', '1. Stand up straight with a dumbbell in each hand, palms facing your body.
2. Keep your elbows close to your torso and your back straight.
3. Exhale and curl the dumbbell in your right hand towards your shoulder, keeping your upper arm stationary.
4. Continue to raise the dumbbell until your biceps are fully contracted and the dumbbell is at shoulder level.
5. Inhale and slowly lower the dumbbell back to the starting position.
6. Repeat the curl with your left hand.
7. After completing the curl with your left hand, exhale and press the dumbbell in your right hand overhead.
8. Extend your arm fully and hold for a moment at the top.
9. Inhale and slowly lower the dumbbell back to the starting position.
10. Repeat the press with your left hand.
11. Continue alternating between curls and presses for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3560.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Standing Alternate Overhead Press', 'Shoulders', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand at shoulder level with your palms facing forward.
2. Press one dumbbell overhead, fully extending your arm.
3. Lower the dumbbell back to shoulder level.
4. Repeat with the other arm.
5. Continue alternating arms for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0414.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Standing Alternate Raise', 'Shoulders', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand with your palms facing your body.
2. Keep your back straight and your core engaged.
3. Raise one dumbbell to the side, keeping your arm straight and your palm facing down.
4. Continue lifting until your arm is parallel to the ground.
5. Pause for a moment at the top, then slowly lower the dumbbell back to the starting position.
6. Repeat with the other arm.
7. Alternate between arms for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0415.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Standing Alternating Tricep Kickback', 'Arms', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand.
2. Bend your knees slightly and hinge forward at the hips, keeping your back straight.
3. Extend your arms straight back, keeping your elbows close to your body.
4. Pause for a moment at the top, then slowly lower the dumbbells back to the starting position.
5. Repeat with the other arm, alternating sides with each repetition.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1739.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Standing Around World', 'Shoulders', '1. Stand with your feet shoulder-width apart and hold a dumbbell in each hand.
2. Extend your arms straight out to the sides at shoulder height, palms facing down.
3. Keeping your arms straight, slowly rotate your arms in a circular motion, bringing the dumbbells in front of your body and then overhead.
4. Continue the circular motion, bringing the dumbbells back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2143.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Standing Bent Over One Arm Triceps Extension', 'Arms', '1. Stand with your feet shoulder-width apart and hold a dumbbell in one hand.
2. Bend forward at the waist, keeping your back straight and parallel to the ground.
3. Extend your arm straight back, keeping your elbow close to your body.
4. Slowly lower the dumbbell back to the starting position.
5. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1740.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Standing Bent Over Two Arm Triceps Extension', 'Arms', '1. Stand with your feet shoulder-width apart and hold a dumbbell in each hand.
2. Bend forward at the waist, keeping your back straight and your knees slightly bent.
3. Extend your arms straight back, keeping your elbows close to your body.
4. Slowly lower the dumbbells back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1741.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Standing Biceps Curl', 'Arms', '1. Stand up straight with a dumbbell in each hand, palms facing forward and arms fully extended.
2. Keeping your upper arms stationary, exhale and curl the weights while contracting your biceps.
3. Continue to raise the dumbbells until your biceps are fully contracted and the dumbbells are at shoulder level.
4. Hold the contracted position for a brief pause as you squeeze your biceps.
5. Inhale and slowly begin to lower the dumbbells back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0416.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Standing Calf Raise', 'Legs', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand.
2. Raise your heels off the ground as high as possible, using your calves.
3. Pause for a moment at the top, then slowly lower your heels back down to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0417.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Standing Concentration Curl', 'Arms', '1. Stand with your feet shoulder-width apart and hold a dumbbell in one hand, with your arm fully extended and palm facing inwards.
2. Place your opposite hand on your thigh for support.
3. Keeping your upper arm stationary, exhale and curl the dumbbell towards your shoulder by contracting your biceps.
4. Continue to raise the dumbbell until your biceps are fully contracted and the dumbbell is at shoulder level.
5. Hold the contracted position for a brief pause as you squeeze your biceps.
6. Inhale and slowly lower the dumbbell back to the starting position.
7. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0418.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Standing Front Raise Above Head', 'Shoulders', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand with an overhand grip.
2. Keep your arms straight and lift the dumbbells in front of you, raising them above your head.
3. Pause for a moment at the top, then slowly lower the dumbbells back to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0419.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Standing Inner Biceps Curl V. 2', 'Arms', '1. Stand up straight with a dumbbell in each hand, palms facing your torso.
2. Keep your elbows close to your torso and rotate the palms of your hands until they are facing forward.
3. While holding your upper arms stationary, curl the weights while contracting your biceps.
4. Continue to raise the weights until your biceps are fully contracted and the dumbbells are at shoulder level.
5. Hold the contracted position for a brief pause as you squeeze your biceps.
6. Slowly begin to bring the dumbbells back to the starting position as your breathe in.
7. Repeat for the recommended amount of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2321.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Standing Kickback', 'Arms', '1. Stand with your feet shoulder-width apart and hold a dumbbell in each hand.
2. Bend your knees slightly and hinge forward at the hips, keeping your back straight.
3. Extend your arms straight back, squeezing your triceps at the top of the movement.
4. Pause for a moment, then slowly lower the dumbbells back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0420.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Standing One Arm Concentration Curl', 'Arms', '1. Stand up straight with your feet shoulder-width apart and hold a dumbbell in one hand, palm facing up.
2. Place your free hand on your thigh for support.
3. Keeping your upper arm stationary, exhale and curl the dumbbell towards your shoulder by contracting your biceps.
4. Continue to raise the dumbbell until your biceps are fully contracted and the dumbbell is at shoulder level.
5. Hold the contracted position for a brief pause as you squeeze your biceps.
6. Inhale and slowly lower the dumbbell back to the starting position.
7. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0421.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Standing One Arm Curl (over Incline Bench)', 'Arms', '1. Stand with your feet shoulder-width apart, holding a dumbbell in one hand with your palm facing forward.
2. Place your other hand on an incline bench for support.
3. Keeping your upper arm stationary, exhale and curl the dumbbell towards your shoulder by contracting your biceps.
4. Pause for a moment at the top, then inhale and slowly lower the dumbbell back to the starting position.
5. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0422.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Standing One Arm Curl Over Incline Bench', 'Arms', '1. Stand with your feet shoulder-width apart, holding a dumbbell in one hand.
2. Place your other hand on an incline bench for support.
3. Keeping your upper arm stationary, curl the dumbbell towards your shoulder by contracting your biceps.
4. Pause for a moment at the top, then slowly lower the dumbbell back to the starting position.
5. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1680.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Standing One Arm Extension', 'Arms', '1. Stand with your feet shoulder-width apart, holding a dumbbell in one hand.
2. Raise the dumbbell overhead, fully extending your arm.
3. Keep your upper arm close to your head and perpendicular to the ground.
4. Slowly lower the dumbbell behind your head, bending your elbow.
5. Pause for a moment, then raise the dumbbell back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0423.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Standing One Arm Palm In Press', 'Shoulders', '1. Stand with your feet shoulder-width apart, holding a dumbbell in one hand at shoulder height with your palm facing inwards.
2. Engage your core and keep your back straight.
3. Press the dumbbell upwards until your arm is fully extended.
4. Pause for a moment at the top, then slowly lower the dumbbell back to the starting position.
5. Repeat for the desired number of repetitions, then switch to the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0424.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Standing One Arm Reverse Curl', 'Arms', '1. Stand up straight with your feet shoulder-width apart and hold a dumbbell in one hand with an overhand grip.
2. Keep your arm fully extended and close to your body, with your palm facing down.
3. Slowly curl the dumbbell up towards your shoulder, keeping your upper arm stationary.
4. Pause for a moment at the top, then slowly lower the dumbbell back down to the starting position.
5. Repeat for the desired number of repetitions, then switch to the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0425.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Standing Overhead Press', 'Shoulders', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand at shoulder level with your palms facing forward.
2. Press the dumbbells upward until your arms are fully extended overhead.
3. Pause for a moment at the top, then slowly lower the dumbbells back down to shoulder level.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0426.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Standing Palms In Press', 'Shoulders', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand at shoulder level with your palms facing inwards.
2. Keeping your core engaged and your back straight, press the dumbbells upwards until your arms are fully extended overhead.
3. Pause for a moment at the top, then slowly lower the dumbbells back to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0427.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Standing Preacher Curl', 'Arms', '1. Stand upright with your feet shoulder-width apart and hold a dumbbell in each hand, palms facing forward.
2. Rest the back of your upper arms against the preacher bench or an incline bench, with your elbows slightly bent.
3. Keeping your upper arms stationary, exhale and curl the weights while contracting your biceps.
4. Continue to raise the dumbbells until your biceps are fully contracted and the dumbbells are at shoulder level.
5. Hold the contracted position for a brief pause as you squeeze your biceps.
6. Inhale and slowly begin to lower the dumbbells back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0428.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Standing Reverse Curl', 'Arms', '1. Stand up straight with your feet shoulder-width apart and hold a dumbbell in each hand, palms facing your body.
2. Keeping your upper arms stationary, exhale and curl the weights while contracting your biceps. Continue to raise the weights until your biceps are fully contracted and the dumbbells are at shoulder level.
3. Hold the contracted position for a brief pause as you squeeze your biceps.
4. Inhale and slowly begin to lower the dumbbells back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0429.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Standing Triceps Extension', 'Arms', '1. Stand with your feet shoulder-width apart and hold a dumbbell in one hand.
2. Raise the dumbbell overhead, keeping your arm straight.
3. Bend your elbow and lower the dumbbell behind your head, keeping your upper arm stationary.
4. Extend your arm back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0430.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Standing Zottman Preacher Curl', 'Arms', '1. Stand up straight with a dumbbell in each hand, palms facing forward.
2. Place your upper arms against the preacher bench and keep your elbows slightly bent.
3. Curl the dumbbells up towards your shoulders while keeping your upper arms stationary.
4. At the top of the movement, rotate your wrists so that your palms are facing downward.
5. Slowly lower the dumbbells back to the starting position, rotating your wrists back to the starting position as well.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2293.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Step Up Single Leg Balance With Bicep Curl', 'Arms', '1. Stand in front of a step or platform with a dumbbell in each hand, palms facing your body.
2. Place your right foot on the step, ensuring your entire foot is in contact with the surface.
3. Engage your core and push through your right heel to lift your body up onto the step, bringing your left knee up towards your chest.
4. At the top of the movement, perform a bicep curl by bending your elbows and bringing the dumbbells towards your shoulders.
5. Lower the dumbbells back down and simultaneously lower your left foot back to the ground.
6. Repeat the movement on the opposite side, stepping up with your left foot and curling the dumbbells.
7. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1684.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Step-up', 'Legs', '1. Stand in front of a bench or step with a dumbbell in each hand, palms facing your body.
2. Place your right foot on the bench or step, ensuring your entire foot is in contact with the surface.
3. Push through your right heel and lift your body up onto the bench or step, straightening your right leg.
4. Bring your left foot up onto the bench or step, standing fully upright.
5. Step back down with your left foot, followed by your right foot, returning to the starting position.
6. Repeat for the desired number of repetitions, then switch legs.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0431.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Step-up Lunge', 'Legs', '1. Stand in front of a step or platform with a dumbbell in each hand, palms facing your sides.
2. Place your right foot on the step, ensuring your entire foot is on the surface.
3. Push through your right heel and lift your body up onto the step, bringing your left foot up as well.
4. Once both feet are on the step, lower your left foot back down to the starting position, keeping your right foot on the step.
5. Repeat the movement, alternating which foot you step up with each time.
6. Continue for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2796.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Step-up Split Squat', 'Legs', '1. Stand in front of a bench or step with a dumbbell in each hand, palms facing your body.
2. Place your right foot on the bench or step, ensuring your entire foot is in contact with the surface.
3. Step up onto the bench or step with your right foot, pushing through your heel to lift your body up.
4. As you step up, simultaneously lift your left knee towards your chest.
5. Pause at the top of the movement, then slowly lower your left foot back to the ground while keeping your right foot on the bench or step.
6. Repeat the movement with your left foot on the bench or step.
7. Continue alternating between your right and left foot for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2812.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Stiff Leg Deadlift', 'Legs', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand with an overhand grip.
2. Keeping your back straight and your core engaged, hinge at the hips and lower the dumbbells towards the ground, allowing a slight bend in your knees.
3. Lower the dumbbells until you feel a stretch in your hamstrings, then squeeze your glutes and push through your heels to return to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0432.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Straight Arm Pullover', 'Chest', '1. Lie flat on a bench with your head at one end and your feet planted firmly on the ground.
2. Hold a dumbbell with both hands and extend your arms straight above your chest.
3. Keeping your arms straight, slowly lower the dumbbell behind your head in an arc-like motion.
4. Pause for a moment, then raise the dumbbell back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0433.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Straight Leg Deadlift', 'Legs', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand with an overhand grip.
2. Keeping your back straight and your core engaged, hinge at the hips and lower the dumbbells towards the ground, allowing your torso to lean forward.
3. Continue lowering the dumbbells until you feel a stretch in your hamstrings, keeping your knees slightly bent.
4. Pause for a moment at the bottom, then engage your glutes and hamstrings to lift your torso back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0434.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Sumo Pull Through', 'Legs', '1. Stand with your feet wider than shoulder-width apart, toes pointed outwards.
2. Hold a dumbbell with both hands in front of your body, arms extended.
3. Bend your knees and lower your hips down into a squat position, keeping your back straight.
4. Lower the dumbbell down between your legs, keeping your arms straight.
5. Drive through your heels and extend your hips forward, pulling the dumbbell up and in front of your body.
6. Squeeze your glutes at the top of the movement, then lower the dumbbell back down between your legs.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2808.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Supported Squat', 'Legs', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand at your sides.
2. Keeping your chest up and core engaged, slowly lower your body down by bending your knees and pushing your hips back.
3. Continue lowering until your thighs are parallel to the ground, or as low as you can comfortably go.
4. Pause for a moment at the bottom, then push through your heels to return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2803.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Tate Press', 'Arms', '1. Sit on a flat bench with a dumbbell in each hand, palms facing each other.
2. Raise the dumbbells to shoulder height, then rotate your wrists so that your palms are facing away from you.
3. Press the dumbbells up until your arms are fully extended, then lower them back down to shoulder height.
4. Rotate your wrists back to the starting position and repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0436.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Tricep Kickback With Stork Stance', 'Arms', '1. Stand with your feet shoulder-width apart and hold a dumbbell in your right hand.
2. Bend your knees slightly and hinge forward at the hips, keeping your back straight.
3. Bring your right elbow up to your side, keeping it bent at a 90-degree angle.
4. Extend your right arm straight back, squeezing your triceps.
5. Pause for a moment, then slowly lower the dumbbell back to the starting position.
6. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1742.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Twisting Bench Press', 'Arms', '1. Lie flat on a bench with your feet flat on the ground and your back pressed against the bench.
2. Hold a dumbbell in each hand with an overhand grip, palms facing away from you.
3. Extend your arms straight up over your chest, keeping a slight bend in your elbows.
4. Lower the dumbbells down towards your chest, keeping your elbows close to your body.
5. As you lower the dumbbells, twist your wrists so that your palms face towards you at the bottom of the movement.
6. Pause for a moment at the bottom, then reverse the movement by pressing the dumbbells back up to the starting position.
7. As you press the dumbbells up, twist your wrists back to the starting position with palms facing away from you.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1743.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Upright Row', 'Shoulders', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand with an overhand grip.
2. Let the dumbbells hang in front of your thighs, with your arms fully extended.
3. Keeping your back straight and your core engaged, exhale and lift the dumbbells straight up towards your chin, leading with your elbows.
4. Pause for a moment at the top, then inhale and slowly lower the dumbbells back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0437.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Upright Row (back Pov)', 'Shoulders', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand with an overhand grip.
2. Let the dumbbells hang in front of your thighs, with your arms fully extended and your palms facing your body.
3. Keeping your back straight and your core engaged, exhale and lift the dumbbells straight up towards your chin, leading with your elbows.
4. Continue lifting until the dumbbells are at shoulder height, with your elbows pointing out to the sides.
5. Pause for a moment at the top, then inhale and slowly lower the dumbbells back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1765.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Upright Shoulder External Rotation', 'Shoulders', '1. Stand with your feet shoulder-width apart and hold a dumbbell in each hand with your palms facing your body.
2. Raise your arms out to the sides until they are parallel to the ground, keeping your elbows slightly bent.
3. Rotate your arms externally, bringing the dumbbells up towards your head while keeping your elbows in the same position.
4. Pause for a moment at the top, then slowly lower the dumbbells back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0864.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Waiter Biceps Curl', 'Arms', '1. Stand up straight with a dumbbell in each hand, palms facing forward.
2. Keep your upper arms close to your body and your elbows tucked in.
3. Slowly curl the dumbbells up towards your shoulders, keeping your wrists straight.
4. Pause for a moment at the top, then slowly lower the dumbbells back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/5201.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell W-press', 'Shoulders', '1. Sit on a bench with a dumbbell in each hand, palms facing forward.
2. Raise the dumbbells to shoulder height, elbows bent and palms facing forward.
3. Press the dumbbells upward until your arms are fully extended overhead.
4. Lower the dumbbells back to shoulder height.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0438.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Zottman Curl', 'Arms', '1. Stand up straight with a dumbbell in each hand, palms facing your body.
2. Keep your elbows close to your torso and rotate your palms to face forward.
3. Curl the dumbbells up to your shoulders while keeping your upper arms stationary.
4. At the top of the movement, rotate your wrists so that your palms are facing away from your body.
5. Slowly lower the dumbbells back to the starting position, rotating your palms back to facing your body.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0439.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbell Zottman Preacher Curl', 'Arms', '1. Sit on a preacher bench with a dumbbell in each hand, palms facing up and elbows resting on the pad.
2. Curl the dumbbells up towards your shoulders, keeping your upper arms stationary and your palms facing up.
3. At the top of the curl, rotate your wrists so that your palms are facing down.
4. Slowly lower the dumbbells back down to the starting position, rotating your wrists back to the starting position as you do so.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2294.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dumbbells Seated Triceps Extension', 'Arms', '1. Sit on a bench with your back straight and feet flat on the ground.
2. Hold a dumbbell in both hands with an overhand grip, and raise it above your head.
3. Bend your elbows and lower the dumbbell behind your head, keeping your upper arms close to your ears.
4. Extend your arms and raise the dumbbell back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2189.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Dynamic Chest Stretch (male)', 'Chest', '1. Stand tall with your feet shoulder-width apart.
2. Extend your arms straight out to the sides, parallel to the ground.
3. Slowly bring your arms forward, crossing them in front of your body.
4. Feel the stretch in your chest muscles.
5. Hold the stretch for 10-30 seconds.
6. Return to the starting position and repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1167.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Elbow Dips', 'Arms', '1. Sit on the edge of a bench or chair with your hands gripping the edge next to your hips.
2. Slide your hips forward off the bench and straighten your legs, keeping your heels on the ground.
3. Bend your elbows and lower your body towards the ground, keeping your back close to the bench.
4. Pause for a moment at the bottom, then push through your hands to straighten your arms and lift your body back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3287.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Elbow Lift - Reverse Push-up', 'Back', '1. Start by lying face down on the ground with your legs extended and your hands placed directly under your shoulders.
2. Engage your core and press through your palms to lift your upper body off the ground, keeping your elbows close to your sides.
3. Pause at the top for a moment, squeezing your upper back muscles.
4. Slowly lower your body back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1772.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Elbow-to-knee', 'Core', '1. Start by lying flat on your back with your knees bent and feet flat on the ground.
2. Place your hands behind your head with your elbows pointing outwards.
3. Engage your abs and lift your upper body off the ground, bringing your right elbow towards your left knee.
4. At the same time, bring your left knee towards your right elbow, creating a twisting motion.
5. Pause for a moment at the top, then slowly lower your upper body and extend your legs back to the starting position.
6. Repeat the movement, this time bringing your left elbow towards your right knee and your right knee towards your left elbow.
7. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0443.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Elevator', 'Back', '1. Stand with your feet shoulder-width apart and your knees slightly bent.
2. Place your hands on your hips or cross them in front of your chest.
3. Keeping your back straight, slowly bend forward at the waist, lowering your upper body towards the ground.
4. Pause for a moment at the bottom, then slowly raise your upper body back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3292.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Exercise Ball Alternating Arm Ups', 'Back', '1. Sit on the stability ball with your feet flat on the ground and your back straight.
2. Hold a dumbbell in each hand with your palms facing inwards and your arms extended down by your sides.
3. Engage your core and slowly lift one arm up towards your shoulder, keeping your elbow slightly bent.
4. Pause for a moment at the top, then slowly lower your arm back down to the starting position.
5. Repeat the movement with the other arm.
6. Continue alternating arms for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1332.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Exercise Ball Back Extension With Arms Extended', 'Back', '1. Place the stability ball on the ground and lie face down on top of it, with your hips resting on the ball and your feet against a wall for stability.
2. Extend your arms straight out in front of you, with your palms facing down.
3. Engage your core and slowly lift your upper body off the ball, keeping your back straight and your neck in line with your spine.
4. Pause for a moment at the top, then slowly lower your upper body back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1333.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Exercise Ball Back Extension With Hands Behind Head', 'Back', '1. Place the stability ball on the ground and lie face down on top of it with your hips resting on the ball.
2. Position your feet against a wall or other stable surface for support.
3. Cross your arms behind your head, with your hands touching the back of your head.
4. Engage your core and slowly lift your upper body off the ball, extending your back until your body forms a straight line from your head to your hips.
5. Pause for a moment at the top of the movement, then slowly lower your upper body back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1334.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Exercise Ball Back Extension With Knees Off Ground', 'Back', '1. Place the stability ball on the ground and lie face down on top of it, with your hips resting on the ball and your feet against a wall for stability.
2. Position your hands behind your head or crossed over your chest.
3. Engage your core and slowly lift your upper body off the ball, extending your back until your body forms a straight line from your head to your heels.
4. Pause for a moment at the top, then slowly lower your upper body back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1335.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Exercise Ball Back Extension With Rotation', 'Back', '1. Start by lying face down on the stability ball with your hips resting on the ball and your feet firmly planted on the ground.
2. Place your hands behind your head or cross them over your chest.
3. Engage your core and slowly lift your upper body off the ball, extending your back until your body forms a straight line from your head to your heels.
4. Pause for a moment at the top, then slowly rotate your torso to one side, keeping your hips and legs stable.
5. Return to the center and repeat the rotation to the other side.
6. Lower your upper body back down to the starting position and repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1336.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Exercise Ball Dip', 'Arms', '1. Sit on the stability ball with your feet flat on the ground and your knees bent at a 90-degree angle.
2. Place your hands on the ball beside your hips, fingers pointing forward.
3. Engage your triceps and push through your hands to lift your body off the ball, straightening your arms.
4. Lower your body back down by bending your elbows, keeping them close to your sides.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1744.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Exercise Ball Hip Flexor Stretch', 'Legs', '1. Place the stability ball on the ground and kneel in front of it.
2. Place your right foot on top of the stability ball, with your knee bent at a 90-degree angle.
3. Extend your left leg behind you, keeping it straight.
4. Lean forward, pushing your hips towards the stability ball, until you feel a stretch in your right hip flexor.
5. Hold the stretch for 20-30 seconds, then switch sides and repeat.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1559.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Exercise Ball Hug', 'Back', '1. Sit on the stability ball with your feet flat on the ground and your back straight.
2. Hold the stability ball with both hands, hugging it close to your chest.
3. Engage your core muscles and slowly lean back, keeping your back straight and your feet planted on the ground.
4. Continue leaning back until you feel a stretch in your back muscles.
5. Hold the position for a few seconds, then slowly return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1338.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Exercise Ball Lat Stretch', 'Back', '1. Sit on a stability ball with your feet flat on the ground and your back straight.
2. Hold a dumbbell in one hand and extend your arm straight up overhead.
3. Slowly lean to the opposite side, feeling a stretch in your lat muscle.
4. Hold the stretch for 20-30 seconds, then return to the starting position.
5. Repeat on the other side.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1339.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Exercise Ball Lower Back Stretch (pyramid)', 'Back', '1. Sit on the stability ball with your feet flat on the ground and your knees bent at a 90-degree angle.
2. Slowly walk your feet forward, rolling the ball down your back until your lower back is resting on the ball.
3. Place your hands behind your head or cross them over your chest.
4. Engage your core and slowly lower your upper body towards the ground, allowing your lower back to stretch over the ball.
5. Hold the stretch for a few seconds, then slowly return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1341.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Exercise Ball Lying Side Lat Stretch', 'Back', '1. Lie on your side with your legs extended and your head supported by the stability ball.
2. Place your top arm on the ball for stability.
3. Reach your top arm overhead and allow your torso to rotate slightly.
4. Feel the stretch in your lat muscles on the side of your body.
5. Hold the stretch for 20-30 seconds, then switch sides and repeat.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1342.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Exercise Ball On The Wall Calf Raise', 'Legs', '1. Stand with your back against a wall and place an exercise ball between your lower back and the wall.
2. Position your feet shoulder-width apart, with your toes pointing forward.
3. Hold a dumbbell in each hand, with your arms extended by your sides.
4. Raise your heels off the ground, lifting your body weight onto the balls of your feet.
5. Pause for a moment at the top, then slowly lower your heels back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1382.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Exercise Ball On The Wall Calf Raise (tennis Ball Between Ankles)', 'Legs', '1. Stand facing a wall with your feet shoulder-width apart.
2. Place an exercise ball between the wall and your lower back.
3. Hold a dumbbell in each hand, with your arms extended by your sides.
4. Place a tennis ball between your ankles.
5. Raise your heels off the ground, lifting your body up onto your toes.
6. Pause for a moment at the top, then slowly lower your heels back down to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3241.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Exercise Ball On The Wall Calf Raise (tennis Ball Between Knees)', 'Legs', '1. Stand with your back against a wall and place an exercise ball between your lower back and the wall.
2. Position your feet shoulder-width apart and slightly in front of you.
3. Hold a dumbbell in each hand, with your arms extended by your sides.
4. Place a tennis ball between your knees.
5. Raise your heels off the ground, lifting your body up onto your toes.
6. Pause for a moment at the top, then slowly lower your heels back down to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3240.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Exercise Ball One Leg Prone Lower Body Rotation', 'Legs', '1. Lie face down on the stability ball with your hips resting on the ball and your legs extended straight behind you.
2. Place your hands on the ground in front of you for support.
3. Engage your glutes and core muscles to stabilize your body.
4. Slowly lift one leg off the ground, keeping it straight and parallel to the floor.
5. Rotate your leg outward, away from your body, while keeping your hips and upper body stable.
6. Pause for a moment at the end of the rotation, then slowly return your leg to the starting position.
7. Repeat the rotation with the other leg.
8. Continue alternating legs for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1416.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Exercise Ball One Legged Diagonal Kick Hamstring Curl', 'Legs', '1. Start by lying on your back with your legs extended and your heels resting on top of the stability ball.
2. Place your arms by your sides for stability.
3. Engage your glutes and core muscles to lift your hips off the ground, creating a straight line from your shoulders to your heels.
4. Bend your right knee and bring it towards your chest, keeping your left leg extended and your foot flexed.
5. Kick your right leg diagonally across your body, extending it fully and engaging your hamstrings.
6. Slowly return your right leg to the starting position, maintaining control and stability.
7. Repeat the movement with your left leg, alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1417.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Exercise Ball Pike Push Up', 'Chest', '1. Start in a push-up position with your hands on the floor and your shins resting on the stability ball.
2. Engage your core and lift your hips up towards the ceiling, rolling the ball towards your hands.
3. Keep your legs straight and your body in a pike position, forming an inverted V shape.
4. Bend your elbows and lower your upper body towards the floor, keeping your head in line with your hands.
5. Push through your hands and extend your arms to return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1296.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Exercise Ball Prone Leg Raise', 'Back', '1. Lie face down on a mat with your legs extended and your toes resting on top of the stability ball.
2. Place your hands on the ground, shoulder-width apart, and engage your core muscles.
3. Keeping your legs straight, slowly lift them off the ground, using your lower back and glutes to raise them as high as possible.
4. Pause for a moment at the top, then slowly lower your legs back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1343.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Exercise Ball Seated Hamstring Stretch', 'Legs', '1. Sit on the stability ball with your feet flat on the ground and your knees bent at a 90-degree angle.
2. Slowly roll the ball forward, walking your feet out until your upper back is resting on the ball and your legs are extended straight in front of you.
3. Place your hands on your hips for support.
4. Engage your core and slowly lower your upper body towards the ground, keeping your back straight and your chest lifted.
5. Stop when you feel a stretch in your hamstrings, and hold the position for 20-30 seconds.
6. Slowly return to the starting position by pushing through your heels and using your hamstrings to pull yourself back up.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1560.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Exercise Ball Seated Triceps Stretch', 'Arms', '1. Sit on a stability ball with your feet flat on the ground and your back straight.
2. Hold a dumbbell in one hand and extend your arm straight up above your head.
3. Bend your elbow and lower the dumbbell behind your head, keeping your upper arm close to your ear.
4. Hold the stretch for a few seconds, then return to the starting position.
5. Repeat with the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1745.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Exercise Ball Supine Triceps Extension', 'Arms', '1. Sit on an exercise ball with your feet flat on the ground and your knees bent at a 90-degree angle.
2. Hold a dumbbell with both hands and extend your arms straight up towards the ceiling.
3. Slowly lower the dumbbell behind your head, keeping your elbows close to your ears.
4. Pause for a moment, then raise the dumbbell back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1746.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Ez Bar French Press On Exercise Ball', 'Arms', '1. Sit on an exercise ball and hold an EZ barbell with an overhand grip.
2. Extend your arms straight up, keeping your elbows close to your head.
3. Slowly lower the barbell behind your head by bending your elbows.
4. Pause for a moment, then extend your arms back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1747.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Ez Bar Lying Bent Arms Pullover', 'Back', '1. Lie flat on a bench with your head at one end and your feet on the floor.
2. Hold the EZ barbell with a pronated grip (palms facing away from you) and your hands shoulder-width apart.
3. Extend your arms straight above your chest, keeping a slight bend in your elbows.
4. Lower the barbell in an arc motion behind your head, maintaining the slight bend in your elbows.
5. Pause for a moment, then return the barbell to the starting position by reversing the arc motion.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3010.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Ez Bar Lying Close Grip Triceps Extension Behind Head', 'Arms', '1. Lie flat on a bench with your feet flat on the ground and your head at the end of the bench.
2. Hold the ez barbell with a close grip, palms facing up, and extend your arms straight up over your chest.
3. Keeping your upper arms stationary, slowly lower the barbell behind your head by bending your elbows.
4. Pause for a moment, then extend your arms back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1748.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Ez Bar Reverse Grip Bent Over Row', 'Back', '1. Stand with your feet shoulder-width apart and knees slightly bent.
2. Hold the ez barbell with an underhand grip, palms facing up, and hands shoulder-width apart.
3. Bend forward at the hips, keeping your back straight and chest up, until your torso is almost parallel to the floor.
4. Pull the ez barbell towards your lower chest, squeezing your shoulder blades together.
5. Pause for a moment at the top, then slowly lower the ez barbell back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1344.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Ez Bar Seated Close Grip Concentration Curl', 'Arms', '1. Sit on a bench with your feet flat on the ground and hold an EZ barbell with an underhand grip.
2. Rest your elbow on the inside of your thigh, just above the knee.
3. Curl the barbell up towards your shoulder while keeping your upper arm stationary.
4. Squeeze your biceps at the top of the movement, then slowly lower the barbell back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1682.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Ez Bar Standing French Press', 'Arms', '1. Stand with your feet shoulder-width apart and hold the ez barbell with an overhand grip.
2. Raise the barbell above your head, fully extending your arms.
3. Keeping your upper arms close to your head, slowly lower the barbell behind your head by bending your elbows.
4. Pause for a moment, then extend your arms back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1749.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Ez Barbell Anti Gravity Press', 'Shoulders', '1. Start by standing with your feet shoulder-width apart and holding the ez barbell with an overhand grip.
2. Raise the barbell to shoulder height, keeping your elbows slightly bent and your palms facing forward.
3. Press the barbell overhead, extending your arms fully.
4. Lower the barbell back to shoulder height and repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0445.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Ez Barbell Close Grip Preacher Curl', 'Arms', '1. Sit on a preacher curl bench and place your upper arms on the pad, gripping the ez barbell with an underhand grip.
2. Rest your triceps on the pad and fully extend your arms, keeping your back straight.
3. Slowly curl the barbell towards your shoulders, contracting your biceps.
4. Pause for a moment at the top, squeezing your biceps.
5. Lower the barbell back to the starting position, fully extending your arms.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1627.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Ez Barbell Close-grip Curl', 'Arms', '1. Stand up straight with your feet shoulder-width apart and hold the ez barbell with an underhand grip, hands shoulder-width apart.
2. Keep your elbows close to your torso and your upper arms stationary throughout the movement.
3. Curl the barbell up towards your shoulders, contracting your biceps.
4. Pause for a moment at the top, then slowly lower the barbell back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0446.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Ez Barbell Curl', 'Arms', '1. Stand up straight with your feet shoulder-width apart and hold the ez barbell with an underhand grip, palms facing up.
2. Keep your elbows close to your torso and your upper arms stationary throughout the movement.
3. Exhale as you curl the barbell up towards your shoulders, contracting your biceps.
4. Pause for a moment at the top, then inhale as you slowly lower the barbell back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0447.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Ez Barbell Decline Close Grip Face Press', 'Arms', '1. Lie on a decline bench with your head lower than your feet.
2. Grasp the ez barbell with a close grip, palms facing each other.
3. Extend your arms straight up above your chest, keeping your elbows close to your body.
4. Lower the barbell towards your forehead by bending your elbows.
5. Pause for a moment, then press the barbell back up to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0448.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Ez Barbell Decline Triceps Extension', 'Arms', '1. Lie on a decline bench with your head lower than your feet and your feet secured.
2. Hold the ez barbell with an overhand grip, hands shoulder-width apart.
3. Extend your arms fully, keeping your elbows close to your head.
4. Lower the barbell slowly towards your forehead, bending your elbows.
5. Pause for a moment, then extend your arms back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2186.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Ez Barbell Incline Triceps Extension', 'Arms', '1. Set up an incline bench at a 45-degree angle.
2. Sit on the bench with your back against the pad and hold the ez barbell with an overhand grip.
3. Extend your arms fully overhead, keeping your elbows close to your head.
4. Lower the barbell behind your head by bending your elbows, keeping your upper arms stationary.
5. Pause for a moment, then extend your arms back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0449.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Ez Barbell Jm Bench Press', 'Arms', '1. Lie flat on a bench with your feet flat on the ground and your back pressed against the bench.
2. Grasp the ez barbell with an overhand grip, slightly wider than shoulder-width apart.
3. Lower the barbell to your chest, keeping your elbows tucked in close to your body.
4. Push the barbell back up to the starting position, fully extending your arms.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0450.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Ez Barbell Reverse Grip Curl', 'Arms', '1. Stand up straight with your feet shoulder-width apart and hold the ez barbell with an underhand grip.
2. Keep your elbows close to your torso and your upper arms stationary throughout the exercise.
3. Curl the barbell upwards by contracting your biceps, while exhaling.
4. Continue to raise the barbell until your biceps are fully contracted and the barbell is at shoulder level.
5. Hold the contracted position for a brief pause as you squeeze your biceps.
6. Slowly begin to bring the barbell back to the starting position as you inhale.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0451.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Ez Barbell Reverse Grip Preacher Curl', 'Arms', '1. Sit on a preacher bench with your chest against the pad and your feet flat on the floor.
2. Grasp the ez barbell with an underhand grip, hands shoulder-width apart.
3. Rest your upper arms on the pad, allowing your forearms to hang down.
4. Keeping your upper arms stationary, exhale and curl the barbell up towards your shoulders.
5. Pause for a moment at the top, then inhale and slowly lower the barbell back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0452.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Ez Barbell Seated Curls', 'Arms', '1. Sit on a bench with your feet flat on the ground and your back straight.
2. Hold the ez barbell with an underhand grip, palms facing up, and your hands shoulder-width apart.
3. Rest your upper arms on your thighs, allowing the ez barbell to hang down in front of you.
4. Keeping your upper arms stationary, exhale and curl the ez barbell upwards towards your shoulders.
5. Pause for a moment at the top, squeezing your biceps.
6. Inhale and slowly lower the ez barbell back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1458.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Ez Barbell Seated Triceps Extension', 'Arms', '1. Sit on a bench with your back straight and feet flat on the ground.
2. Hold the ez barbell with an overhand grip, hands shoulder-width apart.
3. Raise the barbell overhead, fully extending your arms.
4. Keeping your upper arms stationary, lower the barbell behind your head by bending your elbows.
5. Pause for a moment, then raise the barbell back to the starting position by extending your arms.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0453.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Ez Barbell Spider Curl', 'Arms', '1. Stand with your feet shoulder-width apart and hold the ez barbell with an underhand grip, palms facing up.
2. Rest your upper arms on a preacher bench or stability ball, allowing your elbows to hang down.
3. Keeping your upper arms stationary, exhale and curl the barbell up towards your shoulders.
4. Pause for a moment at the top, squeezing your biceps.
5. Inhale and slowly lower the barbell back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0454.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Ez Barbell Spider Curl', 'Arms', '1. Stand with your feet shoulder-width apart and hold the ez barbell with an underhand grip, palms facing up.
2. Rest your upper arms on a preacher bench or stability ball, allowing your elbows to hang down.
3. Keeping your upper arms stationary, exhale and curl the barbell up towards your shoulders.
4. Pause for a moment at the top, squeezing your biceps.
5. Inhale and slowly lower the barbell back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1628.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Ez-bar Biceps Curl (with Arm Blaster)', 'Arms', '1. Stand up straight with your feet shoulder-width apart and hold the ez barbell with an underhand grip, palms facing up.
2. Place your upper arms against the arm blaster, keeping them stationary throughout the exercise.
3. Keeping your elbows close to your body, exhale and curl the barbell up towards your shoulders.
4. Pause for a moment at the top, squeezing your biceps.
5. Inhale and slowly lower the barbell back to the starting position, fully extending your arms.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2404.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Ez-bar Close-grip Bench Press', 'Arms', '1. Lie flat on a bench with your feet flat on the ground and your back pressed against the bench.
2. Grasp the ez barbell with a close grip, hands shoulder-width apart, palms facing forward.
3. Lift the barbell off the rack and hold it directly above your chest with your arms fully extended.
4. Slowly lower the barbell towards your chest, keeping your elbows close to your body.
5. Pause for a moment when the barbell touches your chest.
6. Push the barbell back up to the starting position, fully extending your arms.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2432.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Ez-barbell Standing Wide Grip Biceps Curl', 'Arms', '1. Stand up straight with your feet shoulder-width apart and hold the ez barbell with an underhand grip, hands wider than shoulder-width apart.
2. Keep your elbows close to your torso and your upper arms stationary throughout the movement.
3. Curl the barbell up towards your shoulders by contracting your biceps.
4. Pause for a moment at the top, then slowly lower the barbell back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2741.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Farmers Walk', 'Legs', '1. Stand up straight with a dumbbell in each hand, palms facing your sides.
2. Keep your back straight and your shoulders back.
3. Take small, controlled steps forward, maintaining an upright posture.
4. Continue walking for the desired distance or time.
5. To finish, stop walking and carefully lower the dumbbells to your sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2133.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Finger Curls', 'Arms', '1. Sit on a bench with your feet flat on the ground and hold a barbell with an underhand grip, palms facing up.
2. Rest your forearms on your thighs, allowing your wrists to hang off the edge.
3. Slowly curl your fingers towards your palms, squeezing the barbell tightly.
4. Hold the contraction for a moment, then slowly release your fingers back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0455.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Flag', 'Core', '1. Start by gripping a vertical pole with both hands, palms facing each other, and arms fully extended.
2. Engage your core and lift your legs off the ground, keeping them straight.
3. Using your core and upper body strength, raise your legs until they are parallel to the ground.
4. Hold this position for as long as you can, maintaining a straight body line.
5. Slowly lower your legs back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3303.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Flexion Leg Sit Up (bent Knee)', 'Core', '1. Lie flat on your back with your knees bent and feet flat on the ground.
2. Place your hands behind your head with your elbows pointing outwards.
3. Engaging your abs, slowly lift your upper body off the ground, curling forward until your torso is at a 45-degree angle.
4. At the same time, lift your legs off the ground, bending your knees and bringing them towards your chest.
5. Pause for a moment at the top, then slowly lower your upper body and legs back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0456.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Flexion Leg Sit Up (straight Arm)', 'Core', '1. Lie flat on your back with your legs extended and arms straight above your head.
2. Engaging your abs, lift your upper body off the ground while simultaneously lifting your legs towards your chest.
3. Reach your hands towards your toes as you lift your upper body and legs.
4. Pause for a moment at the top, then slowly lower your upper body and legs back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0457.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Floor Fly (with Barbell)', 'Chest', '1. Lie flat on your back on the floor with your knees bent and feet flat on the ground.
2. Hold a barbell with an overhand grip, arms extended straight up over your chest.
3. Slowly lower the barbell out to the sides, keeping a slight bend in your elbows.
4. Lower the barbell until your arms are parallel to the floor, feeling a stretch in your chest.
5. Pause for a moment, then squeeze your chest muscles to bring the barbell back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0458.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Flutter Kicks', 'Legs', '1. Lie flat on your back with your legs extended and your hands by your sides.
2. Engage your core and lift your legs off the ground about 6 inches.
3. Keeping your legs straight, alternate lifting one leg slightly higher than the other.
4. Continue this fluttering motion for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0459.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Forward Jump', 'Legs', '1. Stand with your feet shoulder-width apart.
2. Bend your knees and lower your body into a squat position.
3. Swing your arms back for momentum.
4. Jump forward explosively, extending your hips, knees, and ankles.
5. Land softly on the balls of your feet and immediately go into the next jump.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1472.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Forward Lunge (male)', 'Legs', '1. Stand with your feet hip-width apart and hands on your hips.
2. Take a big step forward with your right foot, lowering your body into a lunge position.
3. Bend your right knee to about 90 degrees, keeping your knee aligned with your ankle.
4. Push off with your right foot and return to the starting position.
5. Repeat with your left leg, alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3470.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Frankenstein Squat', 'Legs', '1. Stand with your feet shoulder-width apart and hold the barbell in front of your body with straight arms.
2. Keeping your back straight, lower your body by bending at the knees and hips, as if sitting back into a chair.
3. Continue lowering until your thighs are parallel to the ground, or as low as you can comfortably go.
4. Pause for a moment, then push through your heels to return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3194.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Frog Crunch', 'Core', '1. Lie flat on your back with your knees bent and feet flat on the ground.
2. Place your hands behind your head with your elbows pointing outwards.
3. Engaging your abs, lift your upper body off the ground, curling forward until your torso is at a 45-degree angle.
4. Pause for a moment at the top, then slowly lower your upper body back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2429.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Frog Planche', 'Core', '1. Start in a push-up position with your hands shoulder-width apart and your feet together.
2. Bend your elbows and lower your body towards the ground, keeping your back straight.
3. As you lower your body, lift your feet off the ground and bring your knees towards your chest.
4. Hold this position for a few seconds, then extend your legs back out and push yourself back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3301.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Front Lever', 'Core', '1. Start by hanging from a pull-up bar with an overhand grip, hands shoulder-width apart.
2. Engage your core and pull your shoulder blades down and back.
3. Bend your knees and tuck them towards your chest.
4. Simultaneously, lift your legs up and extend them straight out in front of you, keeping your body parallel to the ground.
5. Hold this position for as long as you can, aiming for a full front lever position.
6. To release, slowly lower your legs back down and return to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3296.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Front Lever Reps', 'Back', '1. Hang from a pull-up bar with an overhand grip, palms facing away from you.
2. Engage your core and pull your shoulder blades down and back.
3. Keeping your body straight, lift your legs up until they are parallel to the ground.
4. Hold this position for as long as you can, aiming for 10-20 seconds.
5. Slowly lower your legs back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3295.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Front Plank With Twist', 'Core', '1. Start in a high plank position with your hands directly under your shoulders and your body in a straight line from head to toe.
2. Engage your core and glutes to maintain a stable position.
3. Rotate your torso to the right, lifting your right arm and extending it towards the ceiling.
4. Keep your hips and legs stable as you twist.
5. Hold for a moment, then return to the starting position.
6. Repeat the twist on the left side.
7. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0464.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Full Maltese', 'Core', '1. Start by standing with your feet shoulder-width apart and your arms extended straight out to the sides.
2. Slowly lean forward, keeping your arms straight, until your upper body is parallel to the ground.
3. Engage your core and hold this position for a few seconds.
4. Return to the starting position by pushing through your feet and standing back up.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3315.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Full Planche', 'Core', '1. Start in a push-up position with your hands shoulder-width apart and your fingers pointing forward.
2. Engage your core and slowly shift your weight forward, lifting your feet off the ground.
3. Continue shifting your weight forward until your body is parallel to the ground, balancing on your hands.
4. Hold this position for as long as you can, maintaining a straight body line.
5. Slowly lower your feet back to the ground and return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3299.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Full Planche Push-up', 'Chest', '1. Start in a push-up position with your hands placed slightly wider than shoulder-width apart.
2. Engage your core and lower your body down towards the ground, keeping your elbows close to your sides.
3. As you lower yourself, lean your body forward and lift your feet off the ground, balancing on your hands.
4. Continue to lower your body until your chest is just above the ground.
5. Push through your hands and extend your arms to lift your body back up to the starting position.
6. Maintain a straight line from your head to your heels throughout the movement.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3327.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Gironda Sternum Chin', 'Back', '1. Stand facing a high bar with your feet shoulder-width apart.
2. Reach up and grab the bar with an overhand grip, slightly wider than shoulder-width apart.
3. Hang from the bar with your arms fully extended and your body straight.
4. Engage your lats and biceps to pull your chest up towards the bar, leading with your sternum.
5. Pause for a moment at the top, then slowly lower yourself back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0466.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Glute Bridge March', 'Legs', '1. Lie flat on your back with your knees bent and feet flat on the ground.
2. Engage your glutes and lift your hips off the ground, forming a straight line from your knees to your shoulders.
3. While keeping your hips lifted, lift one foot off the ground and bring your knee towards your chest.
4. Lower your foot back to the ground and repeat the movement with the other leg.
5. Continue alternating legs in a marching motion while maintaining the bridge position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3561.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Glute Bridge Two Legs On Bench (male)', 'Legs', '1. Sit on the edge of a bench with your back against it and your feet flat on the ground.
2. Place your hands on the bench beside your hips for support.
3. Engage your glutes and hamstrings, then lift your hips off the bench until your body forms a straight line from your knees to your shoulders.
4. Pause for a moment at the top, then slowly lower your hips back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3523.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Glute-ham Raise', 'Legs', '1. Adjust the glute-ham raise machine to fit your body.
2. Position yourself face down on the machine with your ankles secured.
3. Place your hands on your chest or cross them over your chest.
4. Engage your hamstrings and glutes to lift your upper body up towards the ceiling.
5. Continue lifting until your body is in a straight line from your head to your heels.
6. Pause for a moment at the top, then slowly lower your body back down to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3193.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Gorilla Chin', 'Core', '1. Stand with your feet shoulder-width apart and your knees slightly bent.
2. Grasp a pull-up bar with an overhand grip, slightly wider than shoulder-width apart.
3. Hang from the bar with your arms fully extended and your palms facing away from you.
4. Engage your core and pull your body up towards the bar, bringing your chin above the bar.
5. Pause for a moment at the top, then slowly lower your body back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0467.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Groin Crunch', 'Core', '1. Lie flat on your back with your knees bent and feet flat on the ground.
2. Place your hands behind your head with your elbows pointing outwards.
3. Engaging your abs, lift your legs off the ground, bringing your knees towards your chest.
4. Pause for a moment at the top, then slowly lower your legs back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0469.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Hack Calf Raise', 'Legs', '1. Adjust the sled machine to a comfortable weight.
2. Stand on the sled machine with your toes on the platform and your heels hanging off.
3. Hold onto the handles for stability.
4. Raise your heels as high as possible by pushing through the balls of your feet.
5. Pause for a moment at the top, then slowly lower your heels back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1383.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Hack One Leg Calf Raise', 'Legs', '1. Adjust the sled machine to an appropriate weight.
2. Stand on the sled machine with one foot, keeping the other foot off the ground.
3. Hold onto the handles for stability.
4. Raise your heel as high as possible, lifting your body up on the ball of your foot.
5. Pause for a moment at the top, then slowly lower your heel back down to the starting position.
6. Repeat for the desired number of repetitions.
7. Switch legs and repeat the exercise.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1384.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Half Knee Bends (male)', 'Cardio', '1. Stand with your feet shoulder-width apart.
2. Bend your knees and lower your body down as if you were sitting back into a chair.
3. Keep your chest up and your weight in your heels.
4. Pause for a moment at the bottom, then push through your heels to return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3221.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Half Sit-up (male)', 'Core', '1. Lie flat on your back with your knees bent and feet flat on the ground.
2. Place your hands behind your head with your elbows pointing outwards.
3. Engaging your abs, slowly lift your upper body off the ground, curling forward until your torso is at a 45-degree angle.
4. Pause for a moment at the top, then slowly lower your upper body back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3202.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Hamstring Stretch', 'Legs', '1. Stand with your feet shoulder-width apart.
2. Step forward with your right foot and shift your weight onto your right leg.
3. Keeping your back straight, slowly bend forward at the hips, reaching towards your right foot with both hands.
4. Hold the stretch for 20-30 seconds, then return to the starting position.
5. Repeat on the other side.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1511.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Hands Bike', 'Chest', '1. Adjust the seat height and handlebar position to a comfortable level.
2. Sit on the ergometer with your back straight and feet on the pedals.
3. Grasp the handles with your hands and position your arms at a 90-degree angle.
4. Start pedaling with your hands, pushing and pulling the handles in a controlled motion.
5. Continue pedaling for the desired duration or number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2139.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Hands Clasped Circular Toe Touch (male)', 'Legs', '1. Stand with your feet shoulder-width apart and your hands clasped together in front of your chest.
2. Bend your knees slightly and hinge forward at the hips, keeping your back straight.
3. Lower your hands towards your toes in a circular motion, reaching as far as you can without straining.
4. Pause for a moment at the bottom, then slowly return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3218.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Hands Reversed Clasped Circular Toe Touch (male)', 'Legs', '1. Stand with your feet shoulder-width apart and your arms extended to the sides.
2. Bend forward at the waist, keeping your back straight and your knees slightly bent.
3. Reach down with your hands and clasp them together behind your legs.
4. Slowly raise your hands up and over your head in a circular motion, keeping your legs straight.
5. Continue the circular motion until your hands touch your toes.
6. Reverse the motion and bring your hands back down to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3215.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Handstand', 'Arms', '1. Find an open space with enough room to perform a handstand.
2. Place your hands on the ground shoulder-width apart, fingers pointing forward.
3. Kick your legs up towards the wall, using your core and shoulders to maintain balance.
4. Once in a handstand position, engage your triceps to support your body weight.
5. Hold the handstand for as long as you can maintain balance.
6. To come down, slowly lower your legs back to the ground.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3302.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Handstand Push-up', 'Arms', '1. Find a wall and face away from it, standing a few feet away.
2. Place your hands on the ground shoulder-width apart and kick your feet up against the wall, coming into a handstand position.
3. Bend your elbows and lower your head towards the ground, keeping your body in a straight line.
4. Push through your hands and extend your arms to return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0471.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Hanging Leg Hip Raise', 'Core', '1. Hang from a pull-up bar with your arms fully extended and your palms facing away from you.
2. Engage your core and lift your legs up by flexing your hips and knees until your thighs are parallel to the ground.
3. Pause for a moment at the top, then slowly lower your legs back down to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1764.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Hanging Leg Raise', 'Core', '1. Hang from a pull-up bar with your arms fully extended and your palms facing away from you.
2. Engage your core and lift your legs up in front of you, keeping them straight.
3. Continue lifting until your legs are parallel to the ground or as high as you can comfortably go.
4. Pause for a moment at the top, then slowly lower your legs back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0472.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Hanging Oblique Knee Raise', 'Core', '1. Hang from a pull-up bar with your arms fully extended and your palms facing away from you.
2. Engage your core and lift your knees towards your chest, twisting your torso to the side as you do so.
3. Pause for a moment at the top, then slowly lower your legs back down to the starting position.
4. Repeat on the other side, twisting your torso in the opposite direction.
5. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1761.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Hanging Pike', 'Core', '1. Hang from a pull-up bar with your arms fully extended and your palms facing away from you.
2. Engage your core and lift your legs up towards the bar, keeping them straight.
3. Continue lifting until your body forms a ''V'' shape, with your legs parallel to the ground.
4. Hold the position for a moment, then slowly lower your legs back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0473.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Hanging Straight Leg Hip Raise', 'Core', '1. Hang from a pull-up bar with your arms fully extended and your palms facing away from you.
2. Engage your core and lift your legs up in front of you until they are parallel to the ground.
3. Pause for a moment at the top, then slowly lower your legs back down to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0474.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Hanging Straight Leg Raise', 'Core', '1. Hang from a pull-up bar with your arms fully extended and your palms facing away from you.
2. Engage your core and lift your legs up in front of you, keeping them straight.
3. Continue lifting until your legs are parallel to the ground or as high as you can comfortably go.
4. Pause for a moment at the top, then slowly lower your legs back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0475.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Hanging Straight Twisting Leg Hip Raise', 'Core', '1. Hang from a pull-up bar with your arms fully extended and your legs straight.
2. Engage your core and lift your legs up towards your chest, keeping them straight.
3. Once your legs are parallel to the ground, twist your hips to one side, bringing your legs towards that side.
4. Pause for a moment, then return to the starting position.
5. Repeat the movement, but this time twist your hips to the opposite side.
6. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0476.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('High Knee Against Wall', 'Cardio', '1. Stand facing a wall with your feet hip-width apart.
2. Place your hands on the wall for support.
3. Engage your core and lift your right knee up towards your chest, while keeping your left foot on the ground.
4. Quickly switch legs, bringing your left knee up towards your chest and lowering your right foot back down.
5. Continue alternating legs in a running motion, bringing your knees up as high as possible.
6. Maintain a fast pace and keep your upper body stable throughout the exercise.
7. Repeat for the desired duration or number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3636.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Hip Raise (bent Knee)', 'Core', '1. Lie flat on your back with your knees bent and feet flat on the ground.
2. Place your hands by your sides, palms facing down.
3. Engage your core and glutes, then lift your hips off the ground until your body forms a straight line from your knees to your shoulders.
4. Pause for a moment at the top, then slowly lower your hips back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0484.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Hug Keens To Chest', 'Legs', '1. Start by standing with your feet shoulder-width apart.
2. Bend your knees and lower your body down into a squat position.
3. As you squat down, bring your knees up towards your chest and hug them with your arms.
4. Hold this position for a moment, then slowly return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1418.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Hyght Dumbbell Fly', 'Chest', '1. Lie flat on a bench with a dumbbell in each hand, palms facing each other.
2. Extend your arms straight up over your chest, with a slight bend in your elbows.
3. Keeping a slight bend in your elbows, lower the dumbbells out to the sides in a wide arc until you feel a stretch in your chest.
4. Pause for a moment, then reverse the movement and bring the dumbbells back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3234.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Hyperextension', 'Back', '1. Adjust the hyperextension bench so that your upper thighs are resting on the pad and your feet are secured.
2. Cross your arms over your chest or place your hands behind your head.
3. Lower your upper body towards the ground while keeping your back straight.
4. Pause for a moment at the bottom, then raise your upper body back up until it is in line with your legs.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0489.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Hyperextension (on Bench)', 'Back', '1. Adjust the hyperextension bench so that your hips are resting comfortably on the pad and your feet are secured.
2. Cross your arms over your chest or place your hands behind your head.
3. Slowly lower your upper body towards the ground while keeping your back straight.
4. Pause for a moment at the bottom, then raise your upper body back up until it is in line with your legs.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0488.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Impossible Dips', 'Arms', '1. Position yourself between two parallel bars with your arms fully extended and your body suspended in the air.
2. Bend your knees and cross your ankles.
3. Lower your body by bending your elbows until your upper arms are parallel to the ground.
4. Pause for a moment, then push yourself back up to the starting position by straightening your arms.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3289.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Inchworm', 'Core', '1. Start in a standing position with your feet hip-width apart.
2. Bend forward at the waist and place your hands on the ground in front of you.
3. Walk your hands forward until you are in a high plank position, with your body in a straight line from head to toe.
4. Pause for a moment, then walk your hands back towards your feet, keeping your legs as straight as possible.
5. Once your hands reach your feet, stand back up to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1471.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Inchworm V. 2', 'Core', '1. Start in a standing position with your feet hip-width apart.
2. Bend forward at the waist and place your hands on the ground in front of you.
3. Walk your hands forward until you are in a high plank position, with your body in a straight line from head to toe.
4. Keeping your legs straight, walk your feet towards your hands, bringing your hips up towards the ceiling.
5. Continue walking your hands forward, repeating the movement for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3698.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Incline Close-grip Push-up', 'Arms', '1. Place your hands on an elevated surface, such as a bench or step, slightly wider than shoulder-width apart.
2. Extend your legs behind you, resting on the balls of your feet, with your body forming a straight line from head to heels.
3. Lower your chest towards the elevated surface by bending your elbows, keeping them close to your sides.
4. Pause for a moment at the bottom, then push yourself back up to the starting position by straightening your arms.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0490.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Incline Leg Hip Raise (leg Straight)', 'Core', '1. Lie on an incline bench with your back flat against the bench and your legs extended straight out in front of you.
2. Place your hands on the sides of the bench for support.
3. Engaging your abs, lift your legs off the bench, raising them as high as you can while keeping them straight.
4. Pause for a moment at the top, then slowly lower your legs back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0491.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Incline Push Up Depth Jump', 'Chest', '1. Find an elevated surface, such as a bench or step, and place your hands shoulder-width apart on the edge.
2. Step your feet back, keeping your body in a straight line from head to heels.
3. Lower your chest towards the edge of the surface, bending your elbows and keeping your body aligned.
4. Push through your palms to extend your arms and return to the starting position.
5. Jump off the edge of the surface, landing softly with your knees slightly bent.
6. Repeat the push-up and depth jump for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0492.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Incline Push-up', 'Chest', '1. Place your hands on an elevated surface, such as a bench or step, slightly wider than shoulder-width apart.
2. Extend your legs behind you, resting on the balls of your feet, creating a straight line from your head to your heels.
3. Lower your chest towards the elevated surface by bending your elbows, keeping your body in a straight line.
4. Pause for a moment at the bottom, then push yourself back up to the starting position by straightening your arms.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0493.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Incline Push-up (on Box)', 'Chest', '1. Place your hands on the edge of a box or elevated surface, slightly wider than shoulder-width apart.
2. Extend your legs behind you, resting on the balls of your feet, creating a straight line from your head to your heels.
3. Lower your chest towards the box by bending your elbows, keeping your body in a straight line.
4. Pause for a moment at the bottom, then push yourself back up to the starting position by straightening your arms.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3785.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Incline Reverse Grip Push-up', 'Chest', '1. Place your hands on the edge of a bench or elevated surface, slightly wider than shoulder-width apart.
2. Extend your legs behind you, resting on the balls of your feet, creating a straight line from your head to your heels.
3. Lower your chest towards the bench by bending your elbows, keeping them close to your sides.
4. Pause for a moment at the bottom, then push yourself back up to the starting position by extending your arms.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0494.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Incline Scapula Push Up', 'Chest', '1. Set up an incline bench at a 45-degree angle.
2. Place your hands on the bench slightly wider than shoulder-width apart.
3. Position your feet on the ground, hip-width apart.
4. Lower your chest towards the bench, keeping your elbows tucked in.
5. As you lower, retract your shoulder blades, squeezing your scapulae together.
6. Push through your palms to extend your arms and return to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3011.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Incline Twisting Sit-up', 'Core', '1. Set up an incline bench at a 45-degree angle.
2. Lie down on the bench with your feet secured under the foot pads.
3. Place your hands behind your head or across your chest.
4. Engage your abs and lift your upper body off the bench, curling forward.
5. As you curl up, twist your torso to one side, bringing your elbow towards the opposite knee.
6. Pause for a moment at the top, then slowly lower your upper body back down to the starting position.
7. Repeat the movement, this time twisting your torso to the other side.
8. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0495.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Intermediate Hip Flexor And Quad Stretch', 'Legs', '1. Stand upright with your feet shoulder-width apart.
2. Hold onto a stable object for support.
3. Bend your right knee and bring your right foot towards your glutes, grabbing the rope with your right hand.
4. Slowly pull your right foot towards your glutes, feeling a stretch in your right quad.
5. Hold the stretch for 20-30 seconds.
6. Release the stretch and repeat on the left side.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1564.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Inverse Leg Curl (bench Support)', 'Legs', '1. Lie face down on a bench with your hips at the edge and your legs extended straight behind you.
2. Hold onto the bench for support.
3. Keeping your upper body still, bend your knees and curl your legs towards your glutes.
4. Pause for a moment at the top, then slowly extend your legs back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0496.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Inverse Leg Curl (on Pull-up Cable Machine)', 'Legs', '1. Adjust the cable machine so that the ankle straps are at the lowest setting.
2. Lie face down on the bench with your legs extended and the ankle straps attached to your feet.
3. Hold onto the handles of the bench for stability.
4. Bend your knees and curl your legs towards your glutes, squeezing your hamstrings.
5. Pause for a moment at the top of the movement, then slowly lower your legs back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2400.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Inverted Row', 'Back', '1. Set up a bar at waist height or use a suspension trainer.
2. Stand facing the bar or suspension trainer, with your feet shoulder-width apart.
3. Grab the bar or handles with an overhand grip, slightly wider than shoulder-width apart.
4. Lean back, keeping your body straight and your heels on the ground.
5. Pull your chest towards the bar or handles, squeezing your shoulder blades together.
6. Pause for a moment at the top, then slowly lower yourself back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0499.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Inverted Row Bent Knees', 'Back', '1. Set up a bar at waist height and lie underneath it.
2. Grab the bar with an overhand grip, slightly wider than shoulder-width apart.
3. Position your body so that your heels are on the ground and your body is straight.
4. Pull your chest up towards the bar by squeezing your shoulder blades together.
5. Pause for a moment at the top, then slowly lower your body back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2300.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Inverted Row On Bench', 'Back', '1. Set up a bench at a height that allows your body to hang freely underneath it.
2. Lie face up on the ground with your head towards the bench.
3. Reach up and grab the bench with an overhand grip, slightly wider than shoulder-width apart.
4. Position your body so that your heels are on the ground and your arms are fully extended.
5. Engage your core and squeeze your shoulder blades together as you pull your chest up towards the bench.
6. Pause for a moment at the top of the movement, then slowly lower your body back down to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2298.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Inverted Row V. 2', 'Back', '1. Set up a bar at waist height on a Smith machine or use a suspension trainer.
2. Stand facing the bar or suspension trainer and grab it with an overhand grip, hands shoulder-width apart.
3. Walk your feet forward, leaning back until your body is at a slight angle.
4. Keep your body straight and pull your chest up towards the bar or handles, squeezing your shoulder blades together.
5. Pause for a moment at the top, then slowly lower yourself back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0497.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Inverted Row With Straps', 'Back', '1. Set up a suspension trainer or straps at chest height.
2. Stand facing the anchor point and grab the handles with an overhand grip.
3. Walk your feet forward, leaning back until your body is at an angle.
4. Keep your body straight and engage your core.
5. Pull your chest towards the handles, squeezing your shoulder blades together.
6. Pause for a moment at the top, then slowly lower yourself back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0498.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Iron Cross Stretch', 'Legs', '1. Lie flat on your back with your arms extended out to the sides.
2. Raise your legs up towards the ceiling, keeping them straight.
3. Slowly lower your legs to one side, aiming to touch the floor with your feet.
4. Hold the stretch for a few seconds, then return your legs to the starting position.
5. Repeat the stretch on the other side.
6. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1419.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Isometric Chest Squeeze', 'Chest', '1. Stand with your feet shoulder-width apart and your knees slightly bent.
2. Extend your arms straight out in front of you, parallel to the ground, with your palms facing each other.
3. Squeeze your chest muscles together as hard as you can, while keeping your arms straight.
4. Hold this position for a few seconds, focusing on contracting your chest muscles.
5. Release the squeeze and relax your chest muscles.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1297.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Isometric Wipers', 'Chest', '1. Start by lying flat on your back on a mat or bench.
2. Extend your arms straight out to the sides, perpendicular to your body.
3. Engage your core and lift both legs off the ground, keeping them together and straight.
4. Slowly lower your legs to one side, aiming to touch the ground with your feet while maintaining control.
5. Pause for a moment, then use your core to lift your legs back to the starting position.
6. Repeat the movement, this time lowering your legs to the opposite side.
7. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0500.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Jack Burpee', 'Cardio', '1. Start in a standing position with your feet shoulder-width apart.
2. Lower your body into a squat position, placing your hands on the ground in front of you.
3. Kick your feet back, landing in a push-up position.
4. Perform a push-up, lowering your chest to the ground and then pushing back up.
5. Jump your feet forward, landing in a squat position.
6. Jump up explosively, reaching your arms overhead.
7. Land softly and immediately lower back into the squat position to begin the next repetition.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0501.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Jack Jump (male)', 'Cardio', '1. Stand with your feet together and your arms by your sides.
2. Jump up, spreading your feet apart and raising your arms above your head.
3. As you land, quickly jump back to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3224.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Jackknife Sit-up', 'Core', '1. Lie flat on your back with your legs extended and your arms overhead.
2. Engage your core and lift your legs and upper body simultaneously, reaching your hands towards your toes.
3. Pause for a moment at the top, then slowly lower your legs and upper body back down to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0507.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Janda Sit-up', 'Core', '1. Lie flat on your back with your knees bent and feet flat on the ground.
2. Place your hands behind your head with your elbows pointing outwards.
3. Engaging your abs, slowly lift your upper body off the ground, curling forward until your torso is at a 45-degree angle.
4. Pause for a moment at the top, then slowly lower your upper body back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0508.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Jump Rope', 'Cardio', '1. Hold the handles of the jump rope with your hands, palms facing inward.
2. Stand with your feet shoulder-width apart and knees slightly bent.
3. Swing the rope over your head and jump over it as it comes towards your feet.
4. Land softly on the balls of your feet and repeat the jump as the rope comes around again.
5. Continue jumping for the desired duration or number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2612.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Jump Squat', 'Legs', '1. Stand with your feet shoulder-width apart.
2. Lower your body into a squat position by bending your knees and pushing your hips back.
3. Jump explosively off the ground, extending your hips, knees, and ankles.
4. While in mid-air, quickly bring your arms forward for balance.
5. Land softly on the balls of your feet and immediately go into the next repetition.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0514.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Jump Squat V. 2', 'Legs', '1. Stand with your feet shoulder-width apart.
2. Lower your body into a squat position by bending your knees and pushing your hips back.
3. Jump explosively, extending your hips and knees fully.
4. Land softly on the balls of your feet and immediately lower your body back into a squat position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0513.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell Advanced Windmill', 'Core', '1. Stand with your feet wider than shoulder-width apart, toes pointing slightly outward.
2. Hold a kettlebell in your right hand, with your arm extended overhead and your palm facing forward.
3. Rotate your left foot slightly to the right, and shift your weight onto your left leg.
4. Bend your left knee and hinge at the hip, lowering your torso towards the left side.
5. Keep your right arm extended overhead and your eyes on the kettlebell.
6. As you lower your torso, allow your right leg to straighten and your right foot to pivot slightly.
7. Lower your torso until you feel a stretch in your left hamstring and your right arm is pointing towards the ground.
8. Pause for a moment, then engage your core and push through your left heel to return to the starting position.
9. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0517.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell Alternating Hang Clean', 'Arms', '1. Stand with your feet shoulder-width apart, holding a kettlebell in each hand with an overhand grip.
2. Bend your knees slightly and hinge forward at the hips, keeping your back straight and chest up.
3. Allow the kettlebells to hang in front of your body with your arms fully extended.
4. In one fluid motion, explosively extend your hips, shrug your shoulders, and pull the kettlebells up towards your shoulders.
5. As the kettlebells reach shoulder height, rotate your wrists and catch the kettlebells in the rack position, with your palms facing inward and the kettlebells resting on the outside of your forearms.
6. Lower the kettlebells back down to the starting position and repeat the movement with the opposite arm.
7. Continue alternating arms for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0518.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell Alternating Press', 'Shoulders', '1. Stand with your feet shoulder-width apart, holding a kettlebell in each hand at shoulder height.
2. Press one kettlebell overhead, fully extending your arm.
3. Lower the kettlebell back to shoulder height.
4. Repeat with the other arm.
5. Continue alternating arms for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0520.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell Alternating Press On Floor', 'Chest', '1. Start by lying on your back on the floor with your knees bent and feet flat on the ground.
2. Hold a kettlebell in each hand, with your palms facing towards your feet and your arms extended straight up towards the ceiling.
3. Lower one kettlebell down towards your shoulder while keeping the other kettlebell extended straight up.
4. Press the lowered kettlebell back up to the starting position while simultaneously lowering the other kettlebell down towards your shoulder.
5. Continue alternating the press motion with each kettlebell for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0519.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell Alternating Renegade Row', 'Back', '1. Start in a high plank position with your hands gripping the kettlebells and your feet hip-width apart.
2. Engage your core and keep your body in a straight line from head to heels.
3. Pull one kettlebell up towards your chest, keeping your elbow close to your body.
4. Lower the kettlebell back down to the starting position and repeat with the other arm.
5. Continue alternating arms for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0521.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell Alternating Row', 'Back', '1. Stand with your feet shoulder-width apart, knees slightly bent, and hold a kettlebell in each hand with your palms facing your body.
2. Bend forward at the hips, keeping your back straight and your core engaged.
3. Pull one kettlebell up towards your chest, keeping your elbow close to your body and squeezing your shoulder blades together.
4. Lower the kettlebell back down to the starting position and repeat with the other arm.
5. Continue alternating arms for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0522.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell Arnold Press', 'Shoulders', '1. Stand with your feet shoulder-width apart, holding a kettlebell in each hand at shoulder height with your palms facing towards you.
2. Engage your core and press the kettlebells overhead, rotating your palms to face forward as you extend your arms.
3. Pause at the top of the movement, then slowly lower the kettlebells back to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0523.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell Bent Press', 'Core', '1. Stand with your feet shoulder-width apart, holding a kettlebell in your right hand.
2. Bend your knees slightly and press the kettlebell overhead with your right arm, keeping your elbow locked.
3. Rotate your torso to the left, shifting your weight onto your left foot.
4. Bend your left knee and lower your torso towards the ground, keeping your right arm extended overhead.
5. As you lower, keep your eyes on the kettlebell and your chest lifted.
6. Once your left hand touches the ground, push through your left foot and straighten your left leg, driving your hips forward.
7. As you drive your hips forward, use your core and right arm to press the kettlebell back up to the starting position.
8. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0524.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell Bottoms Up Clean From The Hang Position', 'Arms', '1. Stand with your feet shoulder-width apart, holding a kettlebell in one hand with an overhand grip.
2. Bend your knees slightly and hinge forward at the hips, keeping your back straight and chest up.
3. Allow the kettlebell to hang down between your legs, with your arm fully extended.
4. In one fluid motion, explosively extend your hips and knees while pulling the kettlebell up towards your shoulder.
5. As the kettlebell reaches shoulder height, rotate your wrist so that the bottom of the kettlebell is facing up.
6. Catch the kettlebell at shoulder height with your elbow bent and your palm facing up.
7. Lower the kettlebell back down to the starting position by reversing the movement.
8. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0525.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell Double Alternating Hang Clean', 'Arms', '1. Stand with your feet shoulder-width apart, holding a kettlebell in each hand with an overhand grip.
2. Bend your knees slightly and hinge forward at the hips, keeping your back straight and chest up.
3. Allow the kettlebells to hang straight down in front of your body.
4. In one fluid motion, explosively extend your hips and knees while shrugging your shoulders.
5. As the kettlebells rise, pull them up towards your shoulders, keeping your elbows high and out to the sides.
6. Catch the kettlebells at shoulder height, with your palms facing inward and your elbows pointing forward.
7. Lower the kettlebells back down to the starting position and repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0526.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell Double Jerk', 'Shoulders', '1. Stand with your feet shoulder-width apart, holding a kettlebell in each hand at shoulder height.
2. Bend your knees slightly and engage your core.
3. Press the kettlebells overhead, fully extending your arms.
4. Bend your knees and quickly drop into a partial squat.
5. Explosively extend your hips and knees, driving the kettlebells overhead.
6. Lock out your arms and catch the kettlebells overhead with your knees slightly bent.
7. Stand up straight and return to the starting position.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0527.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell Double Push Press', 'Shoulders', '1. Start by standing with your feet shoulder-width apart, holding a kettlebell in each hand at shoulder height.
2. Bend your knees slightly and engage your core.
3. Initiate the movement by explosively extending your hips, knees, and ankles, driving the kettlebells overhead.
4. As the kettlebells reach the top, press them fully overhead, locking out your arms.
5. Lower the kettlebells back to the starting position by bending your elbows and bringing them back down to shoulder height.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0528.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell Double Snatch', 'Shoulders', '1. Stand with your feet shoulder-width apart, holding a kettlebell in each hand at arm''s length in front of your thighs.
2. Bend your knees slightly and hinge forward at the hips, keeping your back flat and chest up.
3. In one explosive motion, extend your hips, knees, and ankles, and simultaneously pull the kettlebells up towards your shoulders.
4. As the kettlebells reach shoulder level, rotate your wrists and punch the kettlebells overhead, fully extending your arms.
5. Lower the kettlebells back down to the starting position and repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0529.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell Double Windmill', 'Core', '1. Stand with your feet shoulder-width apart, holding a kettlebell in your right hand.
2. Extend your right arm overhead, keeping your eyes on the kettlebell.
3. Rotate your left foot 45 degrees to the left and your right foot 90 degrees to the right.
4. Bend at the waist to the left, keeping your right arm extended overhead.
5. Lower the kettlebell towards the ground, reaching towards your left foot.
6. Pause for a moment, then engage your core and push through your right foot to return to the starting position.
7. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0530.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell Extended Range One Arm Press On Floor', 'Chest', '1. Start by lying on your back on the floor with your knees bent and feet flat on the ground.
2. Hold a kettlebell in one hand, with your palm facing towards your feet.
3. Extend your arm straight up towards the ceiling, keeping your elbow locked and your wrist straight.
4. Slowly lower the kettlebell back down to the starting position, maintaining control throughout the movement.
5. Repeat for the desired number of repetitions, then switch to the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0531.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell Figure 8', 'Core', '1. Stand with your feet shoulder-width apart, holding a kettlebell in one hand.
2. Bend your knees slightly and hinge forward at the hips, keeping your back straight.
3. Pass the kettlebell between your legs, switching hands as it reaches the back of your legs.
4. As the kettlebell comes forward, pass it to the other hand between your legs.
5. Continue passing the kettlebell between your legs in a figure 8 motion.
6. Maintain a steady pace and engage your core throughout the exercise.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0532.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell Front Squat', 'Legs', '1. Stand with your feet shoulder-width apart, toes slightly turned out.
2. Hold the kettlebell with both hands in front of your chest, close to your body.
3. Engage your core and keep your chest up as you lower your hips down and back, as if sitting into a chair.
4. Lower until your thighs are parallel to the ground, or as low as you can comfortably go.
5. Drive through your heels to stand back up, squeezing your glutes at the top.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0533.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell Goblet Squat', 'Legs', '1. Stand with your feet shoulder-width apart, holding a kettlebell close to your chest with both hands.
2. Keeping your chest up and core engaged, lower your body down into a squat position by bending at the knees and hips.
3. Continue lowering until your thighs are parallel to the ground, or as low as you can comfortably go.
4. Pause for a moment at the bottom, then push through your heels to return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0534.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell Hang Clean', 'Legs', '1. Stand with your feet shoulder-width apart, holding a kettlebell in front of your thighs.
2. Bend your knees slightly and hinge forward at the hips, keeping your back straight.
3. Lower the kettlebell towards the ground, allowing it to swing between your legs.
4. Quickly extend your hips and knees, using the momentum to swing the kettlebell up to shoulder height.
5. As the kettlebell reaches shoulder height, rotate your wrists and catch the kettlebell in the rack position, with your elbow tucked in and the kettlebell resting on your forearm.
6. Lower the kettlebell back down to the starting position between your legs, and repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0535.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell Lunge Pass Through', 'Legs', '1. Stand with your feet shoulder-width apart, holding a kettlebell in front of your chest with both hands.
2. Take a step forward with your right foot, lowering your body into a lunge position.
3. As you lunge forward, pass the kettlebell under your right thigh and transfer it to your left hand.
4. Push off with your right foot to return to the starting position, while simultaneously passing the kettlebell back to your right hand.
5. Repeat the lunge on the opposite side, passing the kettlebell under your left thigh.
6. Continue alternating lunges and passing the kettlebell between hands for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0536.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell One Arm Clean And Jerk', 'Shoulders', '1. Stand with your feet shoulder-width apart, holding a kettlebell in one hand with an overhand grip.
2. Bend your knees slightly and hinge at the hips, lowering the kettlebell between your legs.
3. Explosively extend your hips, knees, and ankles, using the momentum to swing the kettlebell up to shoulder height.
4. As the kettlebell reaches shoulder height, rotate your wrist and punch your hand straight up, locking out your arm overhead.
5. Lower the kettlebell back down to the starting position and repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0537.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell One Arm Floor Press', 'Chest', '1. Lie flat on your back on the floor with your knees bent and feet flat on the ground.
2. Hold the kettlebell in one hand with your palm facing towards your feet and your arm extended straight up towards the ceiling.
3. Slowly lower the kettlebell towards your chest by bending your elbow, keeping your upper arm close to your body.
4. Pause for a moment when the kettlebell is just above your chest, then push it back up to the starting position by extending your elbow.
5. Repeat for the desired number of repetitions, then switch to the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1298.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell One Arm Jerk', 'Shoulders', '1. Stand with your feet shoulder-width apart, holding a kettlebell in one hand at shoulder height.
2. Bend your knees slightly and engage your core.
3. Press the kettlebell overhead in a straight line, fully extending your arm.
4. As you press the kettlebell overhead, simultaneously dip your knees and quickly straighten them to generate momentum.
5. As the kettlebell reaches its highest point, quickly drop underneath it by bending your knees and hips.
6. Catch the kettlebell with a slight bend in your knees and hips, and your arm fully extended overhead.
7. Stand up straight, fully extending your knees and hips, and stabilize the kettlebell overhead.
8. Lower the kettlebell back to the starting position by bending your knees and hips, and repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0538.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell One Arm Military Press To The Side', 'Shoulders', '1. Stand with your feet shoulder-width apart, holding a kettlebell in one hand at shoulder height.
2. Engage your core and keep your back straight.
3. Press the kettlebell overhead, extending your arm fully.
4. Pause for a moment at the top, then slowly lower the kettlebell back to the starting position.
5. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0539.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell One Arm Push Press', 'Shoulders', '1. Stand with your feet shoulder-width apart, holding a kettlebell in one hand at shoulder level.
2. Bend your knees slightly and engage your core.
3. Press the kettlebell overhead by extending your arm and fully extending your legs.
4. Lower the kettlebell back to the starting position by bending your knees and bringing the kettlebell back to your shoulder.
5. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0540.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell One Arm Row', 'Back', '1. Stand with your feet shoulder-width apart, holding a kettlebell in one hand with an overhand grip.
2. Bend your knees slightly and hinge forward at the hips, keeping your back straight and your core engaged.
3. Pull the kettlebell up towards your chest, keeping your elbow close to your body and squeezing your shoulder blades together.
4. Pause for a moment at the top, then slowly lower the kettlebell back down to the starting position.
5. Repeat for the desired number of repetitions, then switch sides and repeat with the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0541.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell One Arm Snatch', 'Shoulders', '1. Stand with your feet shoulder-width apart, holding a kettlebell in one hand between your legs.
2. Bend your knees slightly and hinge at the hips, lowering the kettlebell towards the ground.
3. Explosively extend your hips and knees, using the momentum to swing the kettlebell up towards your shoulder.
4. As the kettlebell reaches shoulder height, rotate your hand and punch it straight up overhead, fully extending your arm.
5. Lower the kettlebell back down between your legs and repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0542.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell Pirate Supper Legs', 'Shoulders', '1. Stand with your feet shoulder-width apart, holding a kettlebell in one hand.
2. Bend your knees slightly and hinge forward at the hips, keeping your back straight.
3. Raise the kettlebell up to shoulder height, keeping your elbow close to your body.
4. Extend your arm fully overhead, straightening your elbow.
5. Lower the kettlebell back down to shoulder height, then return to the starting position.
6. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0543.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell Pistol Squat', 'Legs', '1. Stand with your feet shoulder-width apart, holding a kettlebell in front of your chest with both hands.
2. Lift your left foot off the ground and extend it forward, keeping it parallel to the ground.
3. Slowly lower your body down into a squat position, keeping your right foot flat on the ground and your left leg extended.
4. Pause for a moment at the bottom of the squat, then push through your right heel to return to the starting position.
5. Repeat for the desired number of repetitions, then switch legs.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0544.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell Plyo Push-up', 'Chest', '1. Start in a high plank position with your hands on the kettlebells, shoulder-width apart.
2. Lower your chest towards the ground, keeping your elbows close to your body.
3. Push through your hands explosively, lifting your hands off the kettlebells and extending your arms fully.
4. Land softly back on the kettlebells and immediately lower your chest back down for the next repetition.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0545.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell Seated Press', 'Shoulders', '1. Sit on a bench with your back straight and feet flat on the ground.
2. Hold a kettlebell in each hand at shoulder height, palms facing forward.
3. Press the kettlebells overhead, fully extending your arms.
4. Lower the kettlebells back to shoulder height.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0546.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell Seated Two Arm Military Press', 'Shoulders', '1. Sit on a bench with your back straight and feet flat on the ground.
2. Hold a kettlebell in each hand at shoulder level with your palms facing forward.
3. Press the kettlebells overhead by extending your arms fully.
4. Pause for a moment at the top, then slowly lower the kettlebells back to shoulder level.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1438.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell Seesaw Press', 'Shoulders', '1. Stand with your feet shoulder-width apart, holding a kettlebell in each hand at shoulder height.
2. Press one kettlebell overhead while keeping the other kettlebell at shoulder height.
3. Lower the pressed kettlebell back to shoulder height while simultaneously pressing the other kettlebell overhead.
4. Continue alternating the pressing motion, creating a seesaw-like movement.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0547.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell Sumo High Pull', 'Back', '1. Stand with your feet wider than shoulder-width apart, toes pointing outwards.
2. Hold a kettlebell with both hands in front of your body, arms extended downwards.
3. Bend your knees and lower your hips into a squat position, keeping your back straight.
4. Drive through your heels and explosively extend your hips and knees, pulling the kettlebell up towards your chin.
5. As you pull the kettlebell up, keep your elbows high and wide, and squeeze your shoulder blades together.
6. Lower the kettlebell back down to the starting position and repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0548.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell Swing', 'Legs', '1. Stand with your feet shoulder-width apart, toes pointed slightly outward.
2. Hold the kettlebell with both hands in front of your body, arms extended.
3. Bend your knees slightly and hinge at the hips, pushing your butt back.
4. Swing the kettlebell back between your legs, keeping your arms straight and maintaining a flat back.
5. Drive your hips forward and swing the kettlebell up to shoulder height, using the momentum generated by your hips.
6. Allow the kettlebell to swing back down between your legs and repeat the movement for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0549.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell Thruster', 'Shoulders', '1. Start by standing with your feet shoulder-width apart, holding a kettlebell in front of your chest with both hands, palms facing each other.
2. Lower into a squat position by bending your knees and pushing your hips back, keeping your chest up and your back straight.
3. As you reach the bottom of the squat, explosively drive through your heels to stand up, simultaneously pressing the kettlebell overhead.
4. Lock out your arms at the top of the movement, fully extending your elbows.
5. Lower the kettlebell back to the starting position by reversing the movement, bending your elbows and lowering the weight back to your chest.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0550.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell Turkish Get Up (squat Style)', 'Legs', '1. Start by lying on your back with your legs extended and the kettlebell held in your right hand, arm fully extended above your shoulder.
2. Bend your right knee and place your right foot flat on the ground, keeping your left leg extended.
3. Pressing through your right foot, lift your hips off the ground, coming into a bridge position.
4. Slide your left leg underneath your body, bending your left knee and placing your left foot flat on the ground.
5. Rotate your torso to the left, bringing your left hand to the ground for support.
6. Pressing through your right foot and left hand, lift your torso off the ground, coming into a kneeling position.
7. From the kneeling position, stand up, keeping the kettlebell extended overhead.
8. Reverse the movement to return to the starting position.
9. Repeat the exercise on the other side, starting with the kettlebell in your left hand.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0551.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell Two Arm Clean', 'Shoulders', '1. Stand with your feet shoulder-width apart, holding a kettlebell in front of your thighs with both hands, palms facing towards you.
2. Bend your knees slightly and hinge at the hips, lowering the kettlebell towards the ground.
3. Explosively extend your hips and knees, using the momentum to pull the kettlebell up towards your shoulders.
4. As the kettlebell reaches shoulder height, rotate your wrists and catch the kettlebell in the rack position, with your elbows tucked in and the kettlebell resting on the back of your forearm.
5. Lower the kettlebell back down to the starting position and repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0552.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell Two Arm Military Press', 'Shoulders', '1. Stand with your feet shoulder-width apart, holding a kettlebell in each hand at shoulder level with your palms facing forward.
2. Engage your core and press the kettlebells overhead, fully extending your arms.
3. Pause for a moment at the top, then slowly lower the kettlebells back to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0553.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell Two Arm Row', 'Back', '1. Stand with your feet shoulder-width apart, knees slightly bent, and hold a kettlebell in each hand with your palms facing your body.
2. Bend forward at the hips, keeping your back straight and your core engaged.
3. Pull the kettlebells up towards your chest, squeezing your shoulder blades together.
4. Pause for a moment at the top, then slowly lower the kettlebells back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1345.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kettlebell Windmill', 'Core', '1. Stand with your feet shoulder-width apart, holding a kettlebell in your right hand overhead.
2. Rotate your left foot outwards about 45 degrees and keep your right foot pointing forward.
3. Bend your torso to the left side, keeping your right arm extended overhead and your eyes on the kettlebell.
4. Lower your torso as far as you can while keeping your right arm straight and your left arm extended to the side.
5. Pause for a moment, then return to the starting position by pushing through your right foot and engaging your obliques.
6. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0554.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kick Out Sit', 'Legs', '1. Sit on the edge of a bench or chair with your feet flat on the ground and your knees bent at a 90-degree angle.
2. Lean back slightly and place your hands on the edge of the bench or chair for support.
3. Engaging your hamstrings, lift your feet off the ground and extend your legs straight out in front of you.
4. Pause for a moment at the top, then slowly bend your knees and bring your feet back towards your body.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0555.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kipping Muscle Up', 'Back', '1. Start by hanging from a pull-up bar with an overhand grip, hands slightly wider than shoulder-width apart.
2. Engage your core and use a swinging motion to generate momentum.
3. As you swing forward, pull your chest towards the bar, using your lats and biceps to initiate the movement.
4. Continue the upward motion until your chest reaches the bar, then transition into a dip position by pushing down on the bar and extending your arms.
5. Lower yourself back down to the starting position by bending your arms and controlling the descent.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0558.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Knee Touch Crunch', 'Core', '1. Lie flat on your back with your knees bent and feet flat on the ground.
2. Place your hands behind your head with your elbows pointing outwards.
3. Engaging your abs, lift your shoulder blades off the ground and reach your right hand towards your left knee.
4. Return to the starting position and repeat, this time reaching your left hand towards your right knee.
5. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3640.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kneeling Jump Squat', 'Legs', '1. Start by kneeling on the ground with your feet hip-width apart and your toes pointing forward.
2. Hold a barbell across your upper back, resting it on your shoulders.
3. Engage your core and glutes, then explosively jump up into the air, extending your hips and knees.
4. As you jump, push through your toes and fully extend your ankles, knees, and hips.
5. Land softly back on the ground, bending your knees to absorb the impact.
6. Immediately go into the next repetition, repeating the jump squat motion.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1420.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kneeling Lat Stretch', 'Back', '1. Kneel on the ground with your knees hip-width apart and your toes pointing back.
2. Extend your arms overhead and interlace your fingers.
3. Keeping your back straight, slowly lean to the right side, feeling a stretch in your left lat muscle.
4. Hold the stretch for 20-30 seconds, then return to the starting position.
5. Repeat the stretch on the left side, leaning to the left and feeling a stretch in your right lat muscle.
6. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1346.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kneeling Plank Tap Shoulder (male)', 'Core', '1. Start in a kneeling position with your hands on the ground, shoulder-width apart.
2. Extend your legs behind you, resting on your toes, and lift your body into a plank position.
3. Keeping your core engaged and your hips stable, lift one hand off the ground and tap the opposite shoulder.
4. Return the hand to the ground and repeat with the other hand.
5. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3239.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Kneeling Push-up (male)', 'Chest', '1. Start by kneeling on the ground with your hands shoulder-width apart, fingers pointing forward.
2. Extend your legs behind you, resting on the balls of your feet, so that your body forms a straight line from head to heels.
3. Engage your core and lower your body towards the ground by bending your elbows, keeping them close to your sides.
4. Continue lowering until your chest is just above the ground, then push back up to the starting position by straightening your arms.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3211.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Korean Dips', 'Chest', '1. Position yourself between two parallel bars with your arms extended and supporting your body weight.
2. Lower your body by bending your elbows until your upper arms are parallel to the ground.
3. Pause for a moment, then push yourself back up to the starting position by straightening your arms.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3288.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('L-pull-up', 'Back', '1. Grab the pull-up bar with an overhand grip, slightly wider than shoulder-width apart.
2. Hang with your arms fully extended and your body straight.
3. Engage your lats and biceps to pull your body up towards the bar, keeping your elbows close to your body.
4. Continue pulling until your chin is above the bar.
5. Pause for a moment at the top, then slowly lower your body back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3418.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('L-sit On Floor', 'Core', '1. Sit on the floor with your legs extended in front of you.
2. Place your hands on the floor beside your hips, fingers pointing forward.
3. Engage your core and lift your legs off the ground, keeping them straight.
4. Try to bring your legs parallel to the floor, forming an ''L'' shape with your body.
5. Hold this position for as long as you can.
6. Slowly lower your legs back down to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3419.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Landmine 180', 'Core', '1. Stand with your feet shoulder-width apart and hold the barbell with both hands in front of your chest.
2. Bend your knees slightly and rotate your torso to the right, swinging the barbell down towards your right hip.
3. As you reach the bottom of the movement, quickly reverse the motion and rotate your torso to the left, swinging the barbell up and across your body towards your left shoulder.
4. Continue this twisting motion, alternating sides, for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0562.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Landmine Lateral Raise', 'Shoulders', '1. Stand with your feet shoulder-width apart and knees slightly bent.
2. Hold the barbell with an overhand grip, resting it on the front of your shoulders.
3. Keeping your core engaged and back straight, lift the barbell up and away from your body, raising it to shoulder height.
4. Pause for a moment at the top, then slowly lower the barbell back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3237.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lean Planche', 'Core', '1. Start in a push-up position with your hands shoulder-width apart and your body straight.
2. Engage your core and slowly shift your weight forward, bringing your shoulders past your hands.
3. Keep your elbows slightly bent and your body straight as you lean forward.
4. Hold this position for a few seconds, then slowly return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3300.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Left Hook. Boxing', 'Shoulders', '1. Stand with your feet shoulder-width apart and your knees slightly bent.
2. Keep your left hand up to protect your face and your right hand by your chin.
3. Rotate your hips and pivot on your left foot as you extend your left arm forward in a punching motion.
4. Twist your torso and engage your core muscles to generate power in the punch.
5. Snap your arm back to the starting position and repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2271.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Leg Pull In Flat Bench', 'Core', '1. Sit on a flat bench with your legs extended straight out in front of you.
2. Place your hands on the bench beside your hips for support.
3. Engage your abs and lift your legs off the ground, bringing your knees towards your chest.
4. Pause for a moment at the top, then slowly lower your legs back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0570.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Leg Up Hamstring Stretch', 'Legs', '1. Lie flat on your back with your legs extended.
2. Bend one knee and bring it towards your chest, holding onto your thigh or shin.
3. Straighten your leg as much as possible while keeping it elevated.
4. Hold the stretch for 20-30 seconds.
5. Repeat with the other leg.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1576.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Alternate Leg Press', 'Legs', '1. Adjust the seat and foot platform of the leverage machine to your desired position.
2. Sit on the machine with your back against the backrest and your feet on the foot platform.
3. Place your hands on the handles or sides of the machine for stability.
4. Push one foot against the foot platform, extending your leg until it is almost fully straight.
5. Pause for a moment, then slowly bend your leg and return to the starting position.
6. Repeat with the other leg.
7. Continue alternating legs for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2287.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Alternating Narrow Grip Seated Row', 'Back', '1. Adjust the seat height and footplate position to ensure proper alignment.
2. Sit on the machine with your back straight and feet flat on the footplate.
3. Grasp the handles with a narrow grip, palms facing each other.
4. Keep your chest up and shoulders back throughout the exercise.
5. Pull one handle towards your torso while keeping the other handle stationary.
6. Squeeze your shoulder blades together at the end of the movement.
7. Slowly return the handle to the starting position and repeat with the other side.
8. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0571.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Assisted Chin-up', 'Back', '1. Adjust the leverage machine to your desired resistance level.
2. Stand on the foot platform and grip the handles with an overhand grip, slightly wider than shoulder-width apart.
3. Hang with your arms fully extended, keeping your body straight.
4. Engage your back muscles and pull your body up towards the handles, leading with your chest.
5. Continue pulling until your chin is above the handles.
6. Pause for a moment at the top, then slowly lower your body back down to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0572.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Back Extension', 'Back', '1. Adjust the machine to fit your body size and range of motion.
2. Sit on the machine with your back against the pad and your feet secured.
3. Place your hands on the handles or grip bars.
4. Engage your core and slowly lean forward, allowing your back to round slightly.
5. Pause for a moment at the bottom position, feeling a stretch in your lower back.
6. Using your back muscles, slowly raise your torso back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0573.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Bent Over Row', 'Back', '1. Stand with your feet shoulder-width apart and knees slightly bent.
2. Hold the barbell with an overhand grip, hands slightly wider than shoulder-width apart.
3. Bend forward at the hips, keeping your back straight and chest up.
4. Pull the barbell towards your lower chest, squeezing your shoulder blades together.
5. Pause for a moment at the top, then slowly lower the barbell back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0574.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Bent-over Row With V-bar', 'Back', '1. Adjust the seat height and position yourself facing the machine.
2. Grasp the v-bar with an overhand grip, keeping your back straight and your knees slightly bent.
3. Pull the v-bar towards your abdomen, squeezing your shoulder blades together.
4. Pause for a moment at the top of the movement, then slowly release the weight back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3200.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Bicep Curl', 'Arms', '1. Adjust the seat height and position yourself on the machine with your back against the pad.
2. Grasp the handles with an underhand grip, palms facing up, and keep your elbows close to your sides.
3. Exhale and curl the handles upward, contracting your biceps.
4. Pause for a moment at the top of the movement, squeezing your biceps.
5. Inhale and slowly lower the handles back to the starting position, fully extending your arms.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0575.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Calf Press', 'Legs', '1. Adjust the seat of the leverage machine so that your shoulders are aligned with the lever pad.
2. Place your toes on the lever pad, with your heels hanging off the edge.
3. Grasp the handles or side supports for stability.
4. Push the lever pad down by extending your ankles, contracting your calf muscles.
5. Pause for a moment at the bottom of the movement.
6. Slowly return to the starting position by allowing your heels to rise back up.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2289.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Chest Press', 'Chest', '1. Adjust the seat height and position yourself on the machine with your back flat against the pad.
2. Grasp the handles with an overhand grip and position your elbows at a 90-degree angle.
3. Push the handles forward until your arms are fully extended, exhaling during the movement.
4. Pause briefly at the end of the movement, then slowly return to the starting position, inhaling as you do so.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0577.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Chest Press', 'Chest', '1. Adjust the seat height and position yourself on the machine with your back flat against the pad.
2. Grasp the handles with an overhand grip and position your elbows at a 90-degree angle.
3. Push the handles forward until your arms are fully extended, exhaling during the movement.
4. Pause briefly at the end of the movement, then slowly return to the starting position, inhaling as you do so.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0576.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Deadlift', 'Legs', '1. Adjust the seat height and foot platform to your desired position.
2. Sit on the machine with your back against the pad and your feet flat on the foot platform.
3. Grasp the handles or the sides of the seat for stability.
4. Engage your glutes and hamstrings, and push through your heels to lift the weight up.
5. Keep your back straight and avoid rounding your shoulders.
6. Extend your hips fully at the top of the movement, squeezing your glutes.
7. Lower the weight back down in a controlled manner, keeping tension on your glutes and hamstrings.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0578.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Decline Chest Press', 'Chest', '1. Adjust the seat height and backrest of the leverage machine to a comfortable position.
2. Sit on the machine with your back against the backrest and your feet flat on the floor.
3. Grasp the handles with an overhand grip and position your hands slightly wider than shoulder-width apart.
4. Push the handles forward and away from your body until your arms are fully extended.
5. Slowly lower the handles back towards your chest, keeping your elbows slightly bent.
6. Pause for a moment at the bottom, then push the handles back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1300.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Donkey Calf Raise', 'Legs', '1. Adjust the leverage machine to the appropriate height for your body.
2. Position yourself facing the machine, with your toes on the foot platform and your heels hanging off the edge.
3. Place your hands on the handles or the support bars for stability.
4. Engage your calves and lift your heels as high as possible, using the balls of your feet.
5. Pause for a moment at the top, then slowly lower your heels back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1253.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Front Pulldown', 'Back', '1. Adjust the seat height and position yourself on the machine with your knees under the pads and your feet flat on the ground.
2. Grasp the handles with an overhand grip, slightly wider than shoulder-width apart.
3. Sit upright with your chest lifted and your shoulders back, maintaining a slight arch in your lower back.
4. Engage your lats and pull the handles down towards your chest, squeezing your shoulder blades together.
5. Pause for a moment at the bottom of the movement, then slowly release the handles back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0579.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Gripless Shrug', 'Back', '1. Adjust the seat height and position yourself on the leverage machine.
2. Grasp the handles with your palms facing inwards and your arms fully extended.
3. Keeping your back straight, exhale and elevate your shoulders as high as possible.
4. Hold the contraction for a brief moment, then inhale and slowly lower your shoulders back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0580.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Gripless Shrug V. 2', 'Back', '1. Adjust the seat height and position yourself on the machine with your back against the pad.
2. Grasp the handles or bars with an overhand grip, keeping your arms straight.
3. Keeping your back straight, lift your shoulders up towards your ears as high as possible.
4. Hold the contraction for a moment, then slowly lower your shoulders back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1439.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Gripper Hands', 'Arms', '1. Adjust the seat height and grip the handles of the leverage machine.
2. Keep your back straight and your feet flat on the ground.
3. Exhale and squeeze the handles, contracting your forearms.
4. Hold the contraction for a second, then slowly release and return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2288.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Hammer Grip Preacher Curl', 'Arms', '1. Adjust the seat height and position yourself on the leverage machine.
2. Place your upper arms on the preacher pad, ensuring your chest is pressed against it.
3. Grasp the handles with a hammer grip (palms facing each other).
4. Keeping your upper arms stationary, exhale and curl the handles towards your shoulders.
5. Pause for a moment at the top, squeezing your biceps.
6. Inhale and slowly lower the handles back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1615.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever High Row', 'Back', '1. Adjust the seat height and foot platform to a comfortable position.
2. Sit on the machine with your chest against the pad and your feet flat on the foot platform.
3. Grasp the handles with an overhand grip, slightly wider than shoulder-width apart.
4. Keep your back straight and engage your core.
5. Pull the handles towards your body, squeezing your shoulder blades together.
6. Pause for a moment at the peak of the movement, then slowly release the handles back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0581.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Hip Extension V. 2', 'Legs', '1. Adjust the machine to fit your body and sit on it with your back against the backrest.
2. Place your feet on the footrests and grip the handles for stability.
3. Engage your glutes and hamstrings, then push against the footrests to extend your hips and raise your legs backward.
4. Pause for a moment at the top, then slowly lower your legs back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2286.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Horizontal One Leg Press', 'Legs', '1. Adjust the seat of the machine so that your knees are at a 90-degree angle when your feet are on the footplate.
2. Sit on the machine with your back against the backrest and your feet shoulder-width apart on the footplate.
3. Place your hands on the handles or sides of the machine for stability.
4. Push the footplate away from your body by extending your leg, keeping your back against the backrest.
5. Pause for a moment at the fully extended position, then slowly bend your leg to return to the starting position.
6. Repeat for the desired number of repetitions, then switch legs.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2611.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Incline Chest Press', 'Chest', '1. Adjust the seat and backrest of the leverage machine to a comfortable position.
2. Sit on the machine with your back against the backrest and your feet flat on the floor.
3. Grasp the handles with an overhand grip and position your hands slightly wider than shoulder-width apart.
4. Push the handles forward and away from your body until your arms are fully extended.
5. Pause for a moment, then slowly bend your elbows and lower the handles back towards your chest.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1299.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Incline Chest Press V. 2', 'Chest', '1. Adjust the seat height and backrest angle on the leverage machine to a comfortable position.
2. Sit on the machine with your back against the backrest and your feet flat on the floor.
3. Grasp the handles with an overhand grip and position your hands slightly wider than shoulder-width apart.
4. Push the handles forward and away from your body until your arms are fully extended, but without locking your elbows.
5. Pause for a moment at the fully extended position, then slowly bend your elbows and lower the handles back towards your chest.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1479.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Kneeling Leg Curl', 'Legs', '1. Adjust the machine to fit your body and select the desired weight.
2. Kneel on the machine facing downwards, with your knees resting on the pad and your feet secured under the footpads.
3. Grasp the handles or the sides of the machine for stability.
4. Keeping your upper body stationary, exhale and curl your legs up towards your glutes by flexing your knees.
5. Pause for a moment at the top of the movement, squeezing your hamstrings.
6. Inhale and slowly lower your legs back to the starting position, fully extending your knees.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0582.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Kneeling Twist', 'Core', '1. Adjust the seat height and position yourself on the machine with your knees resting on the pads and your upper body facing forward.
2. Grasp the handles or the sides of the machine for stability.
3. Keeping your core engaged, twist your torso to one side as far as comfortably possible.
4. Pause for a moment, then slowly return to the starting position.
5. Repeat the twist to the opposite side.
6. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0583.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Lateral Raise', 'Shoulders', '1. Adjust the seat height and position yourself on the machine with your back against the pad.
2. Grasp the handles with an overhand grip and keep your arms straight.
3. Exhale and raise your arms out to the sides until they are parallel to the floor.
4. Pause for a moment at the top, then inhale and slowly lower your arms back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0584.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Leg Extension', 'Legs', '1. Adjust the seat height and backrest of the machine to fit your body.
2. Sit on the machine with your back against the backrest and your feet on the footpad.
3. Grasp the handles or sidebars for stability.
4. Extend your legs forward by straightening your knees, lifting the weight.
5. Pause for a moment at the top, then slowly lower the weight back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0585.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Lying Leg Curl', 'Legs', '1. Adjust the machine to fit your body and select the desired weight.
2. Lie face down on the machine with your legs straight and your heels against the padded lever.
3. Grasp the handles or the sides of the machine for stability.
4. Keeping your upper body stationary, exhale and curl your legs up as far as possible without lifting your hips off the pad.
5. Hold the contracted position for a brief pause as you squeeze your hamstrings.
6. Inhale and slowly lower the lever back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0586.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Lying Two-one Leg Curl', 'Legs', '1. Adjust the machine to fit your body and sit on it with your back against the backrest.
2. Place your legs on the lever pad, just above your ankles.
3. Grasp the handles on the sides of the machine for support.
4. Keeping your upper body still, exhale and curl your legs up towards your glutes.
5. Pause for a moment at the top, then inhale and slowly lower your legs back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3195.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Military Press', 'Shoulders', '1. Adjust the seat height and position yourself on the machine with your back against the backrest.
2. Grasp the handles with an overhand grip and position your hands slightly wider than shoulder-width apart.
3. Push the handles upward until your arms are fully extended, but do not lock your elbows.
4. Pause for a moment at the top, then slowly lower the handles back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0587.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Narrow Grip Seated Row', 'Back', '1. Adjust the seat height and footrests to ensure proper form.
2. Sit on the machine with your feet flat on the footrests and your knees slightly bent.
3. Grasp the handles with a narrow grip, palms facing each other.
4. Keep your back straight and lean slightly forward.
5. Pull the handles towards your torso, squeezing your shoulder blades together.
6. Pause for a moment at the peak of the movement.
7. Slowly release the handles and return to the starting position.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0588.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever One Arm Bent Over Row', 'Back', '1. Stand with your feet shoulder-width apart, knees slightly bent, and hold a barbell with an overhand grip.
2. Bend forward at the hips, keeping your back straight and your head up.
3. Let the barbell hang in front of you with your arms fully extended.
4. Pull the barbell up towards your chest, keeping your elbows close to your body.
5. Squeeze your shoulder blades together at the top of the movement.
6. Lower the barbell back down to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0589.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever One Arm Lateral High Row', 'Back', '1. Adjust the seat height and position yourself facing the machine.
2. Grasp the handle with one hand and keep your back straight.
3. Pull the handle towards your body, keeping your elbow close to your side.
4. Squeeze your back muscles at the top of the movement.
5. Slowly release the handle back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1356.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever One Arm Lateral Wide Pulldown', 'Back', '1. Adjust the seat height and position yourself on the machine with your chest against the pad and your feet flat on the floor.
2. Grasp the handle with an overhand grip and fully extend your arm, keeping a slight bend in your elbow.
3. Pull the handle down and across your body towards your opposite hip, squeezing your lat muscle at the bottom of the movement.
4. Slowly return the handle to the starting position, fully extending your arm.
5. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1347.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever One Arm Shoulder Press', 'Shoulders', '1. Adjust the seat height and position yourself on the machine with your back against the pad.
2. Grasp the lever handle with one hand and position your elbow at a 90-degree angle.
3. Press the lever upward until your arm is fully extended overhead.
4. Pause for a moment at the top, then slowly lower the lever back down to the starting position.
5. Repeat for the desired number of repetitions, then switch to the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0590.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Overhand Triceps Dip', 'Arms', '1. Adjust the machine to the appropriate height and secure your body in position.
2. Grasp the handles with an overhand grip and position your body so that your arms are fully extended.
3. Lower your body by bending your elbows, keeping your upper arms close to your sides.
4. Continue lowering until your upper arms are parallel to the floor.
5. Pause for a moment, then push yourself back up to the starting position by extending your elbows.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0591.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Preacher Curl', 'Arms', '1. Adjust the seat height and position yourself on the leverage machine.
2. Place your upper arms on the pad and grip the handles with an underhand grip.
3. Keep your back straight and your elbows positioned on the pad.
4. Exhale and curl your forearms towards your upper arms, contracting your biceps.
5. Pause for a moment at the top of the movement, squeezing your biceps.
6. Inhale and slowly lower the handles back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0592.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Preacher Curl V. 2', 'Arms', '1. Adjust the seat height and position yourself on the machine with your upper arms resting on the pad and your chest against the support.
2. Grasp the handles with an underhand grip, slightly wider than shoulder-width apart.
3. Keep your upper arms stationary and exhale as you curl the handles towards your shoulders, contracting your biceps.
4. Pause for a moment at the top of the movement, squeezing your biceps.
5. Inhale as you slowly lower the handles back to the starting position, fully extending your arms.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1614.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Pullover', 'Back', '1. Adjust the seat and handles of the leverage machine to a comfortable position.
2. Sit on the machine with your back against the pad and grasp the handles with an overhand grip.
3. Keep your arms slightly bent and your core engaged.
4. Slowly pull the handles towards your chest, squeezing your lats.
5. Pause for a moment at the peak contraction, then slowly return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2285.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Reverse Grip Lateral Pulldown', 'Back', '1. Adjust the seat height and position yourself on the machine with your knees under the pads and your feet flat on the ground.
2. Grasp the handles with an overhand grip, slightly wider than shoulder-width apart.
3. Sit upright with your chest out and shoulders back, maintaining a slight arch in your lower back.
4. Pull the handles down towards your chest, leading with your elbows and squeezing your shoulder blades together.
5. Pause for a moment at the bottom of the movement, then slowly release the handles back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2736.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Reverse Grip Preacher Curl', 'Arms', '1. Adjust the seat height and position yourself on the leverage machine.
2. Grasp the handles with an underhand grip, palms facing up.
3. Rest your upper arms on the preacher pad, ensuring your elbows are fully extended.
4. Keeping your upper arms stationary, exhale and curl the handles towards your shoulders.
5. Pause for a moment at the top of the movement, squeezing your biceps.
6. Inhale and slowly lower the handles back to the starting position, fully extending your elbows.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1616.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Reverse Grip Vertical Row', 'Back', '1. Adjust the seat height and footplate position to ensure proper alignment.
2. Sit on the machine with your chest against the pad and your feet flat on the footplate.
3. Grasp the handles with an underhand grip, palms facing up.
4. Keep your back straight and engage your core.
5. Pull the handles towards your chest, squeezing your shoulder blades together.
6. Pause for a moment at the top of the movement, then slowly release and extend your arms back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1348.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Reverse Hyperextension', 'Legs', '1. Adjust the leverage machine to fit your body and secure your feet in the foot pads.
2. Lie face down on the machine with your upper body hanging off the edge and your hips resting on the pad.
3. Cross your arms over your chest or place them behind your head.
4. Engage your glutes and hamstrings to lift your legs upward until they are parallel to the ground.
5. Pause for a moment at the top, then slowly lower your legs back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0593.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Reverse T-bar Row', 'Back', '1. Adjust the seat height and footplate position on the leverage machine.
2. Sit on the machine with your chest against the pad and your feet flat on the footplate.
3. Grasp the handles with an overhand grip, slightly wider than shoulder-width apart.
4. Keep your back straight and engage your core.
5. Pull the handles towards your chest, squeezing your shoulder blades together.
6. Pause for a moment at the top of the movement, then slowly release and extend your arms back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1349.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Rotary Calf', 'Legs', '1. Adjust the seat height so that your knees are slightly bent and your feet are flat on the footplate.
2. Place your toes on the footplate, with your heels hanging off the edge.
3. Grasp the handles or the sides of the machine for stability.
4. Push through the balls of your feet, raising your heels as high as possible.
5. Pause for a moment at the top, then slowly lower your heels back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2315.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Seated Calf Press', 'Legs', '1. Adjust the seat of the machine so that your shoulders are aligned with the lever pad.
2. Place your toes on the lower portion of the platform and position your knees under the lever pad.
3. Grasp the handles on the sides of the seat for stability.
4. Press the lever pad down by extending your ankles, lifting your heels as high as possible.
5. Pause for a moment at the top of the movement, then slowly lower your heels back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2335.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Seated Calf Raise', 'Legs', '1. Adjust the seat height so that your knees are slightly bent and your feet are flat on the footplate.
2. Place your toes on the footplate with your heels hanging off the edge.
3. Grasp the handles or the sides of the seat for stability.
4. Push through the balls of your feet to raise your heels as high as possible.
5. Pause for a moment at the top, then slowly lower your heels back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0594.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Seated Crunch', 'Core', '1. Sit on the leverage machine with your back against the pad and your feet flat on the floor.
2. Grasp the handles or place your hands on the side pads for support.
3. Engage your abs and slowly lean back, allowing the pad to move with you.
4. Once your upper body is at a 45-degree angle, contract your abs and crunch forward, bringing your chest towards your knees.
5. Pause for a moment at the top, then slowly release and return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1452.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Seated Crunch (chest Pad)', 'Core', '1. Adjust the seat height and chest pad position according to your comfort.
2. Sit on the machine with your back against the chest pad and your feet flat on the floor.
3. Grasp the handles or side bars for stability.
4. Engage your abs and slowly lean back, allowing the chest pad to move with you.
5. Pause for a moment at the maximum contraction, feeling the tension in your abs.
6. Slowly return to the starting position by contracting your abs and pulling yourself back up.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0595.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Seated Crunch V. 2', 'Core', '1. Sit on the leverage machine with your back against the pad and your feet secured under the footpads.
2. Place your hands on the handles or the sides of the seat for support.
3. Engage your abs and slowly crunch forward, bringing your chest towards your knees.
4. Pause for a moment at the top of the movement, squeezing your abs.
5. Slowly return to the starting position, allowing your back to round slightly.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3760.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Seated Dip', 'Arms', '1. Adjust the seat height so that your feet are flat on the ground and your knees are at a 90-degree angle.
2. Grasp the handles of the leverage machine with your palms facing down and your arms fully extended.
3. Slowly lower your body by bending your elbows until your upper arms are parallel to the ground.
4. Pause for a moment, then push yourself back up to the starting position by straightening your arms.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1451.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Seated Fly', 'Chest', '1. Adjust the seat height and position yourself on the machine with your back against the pad.
2. Grasp the handles with a pronated grip and keep your elbows slightly bent.
3. Exhale and push the handles forward, bringing them together in front of your chest.
4. Pause for a moment, squeezing your chest muscles.
5. Inhale and slowly return to the starting position, allowing your chest muscles to stretch.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0596.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Seated Good Morning', 'Legs', '1. Adjust the seat height so that your hips are slightly higher than your knees.
2. Sit on the machine with your back against the pad and your feet flat on the footrests.
3. Grasp the handles or the sides of the seat for stability.
4. Keeping your back straight, slowly lean forward from your hips until your upper body is parallel to the ground.
5. Pause for a moment, then slowly return to the starting position by pushing through your glutes and hamstrings.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3759.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Seated Hip Abduction', 'Legs', '1. Adjust the seat height so that your knees are at a 90-degree angle.
2. Sit on the machine with your back against the backrest and your feet on the footrests.
3. Place your hands on the side handles for stability.
4. Engage your abductors and slowly push your legs apart, away from the midline of your body.
5. Pause for a moment at the end of the movement, then slowly bring your legs back together to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0597.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Seated Hip Adduction', 'Legs', '1. Adjust the seat height and position yourself on the machine with your back against the backrest.
2. Place your feet on the footrests and grasp the handles for stability.
3. Engage your adductor muscles and slowly bring your legs together, squeezing your inner thighs.
4. Pause for a moment at the peak contraction, then slowly return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0598.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Seated Leg Curl', 'Legs', '1. Adjust the machine to fit your body and sit on it with your back against the backrest.
2. Place your lower legs under the padded lever, just above your ankles.
3. Grasp the handles on the sides of the machine for support.
4. Keeping your upper legs stationary, exhale and curl your legs up as far as possible.
5. Hold the contracted position for a brief pause as you squeeze your hamstrings.
6. Inhale and slowly lower the lever back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0599.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Seated Leg Raise Crunch', 'Core', '1. Sit on the leverage machine with your back against the backrest and your feet on the footrests.
2. Grasp the handles or sidebars for stability.
3. Engage your abs and slowly raise your legs up towards your chest, curling your torso forward at the same time.
4. Pause for a moment at the top, then slowly lower your legs and torso back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0600.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Seated Reverse Fly', 'Shoulders', '1. Adjust the seat height and position yourself on the machine with your chest against the pad and your feet flat on the floor.
2. Grasp the handles with an overhand grip and keep your arms slightly bent.
3. Exhale and squeeze your shoulder blades together as you pull the handles back and outward, away from your body.
4. Pause for a moment at the peak contraction, then inhale and slowly return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0602.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Seated Reverse Fly (parallel Grip)', 'Shoulders', '1. Adjust the seat height and position yourself on the machine with your chest against the pad and your feet flat on the floor.
2. Grasp the handles with a parallel grip, palms facing each other, and keep your arms slightly bent.
3. Exhale and squeeze your shoulder blades together as you pull the handles back and outward, away from your body.
4. Pause for a moment at the peak contraction, then inhale and slowly return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0601.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Seated Row', 'Back', '1. Adjust the seat height and footrests to a comfortable position.
2. Sit on the machine with your chest against the pad and your feet on the footrests.
3. Grasp the handles with an overhand grip, shoulder-width apart.
4. Keep your back straight and your core engaged.
5. Pull the handles towards your body, squeezing your shoulder blades together.
6. Pause for a moment at the peak of the movement.
7. Slowly release the handles and return to the starting position.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1350.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Seated Squat Calf Raise On Leg Press Machine', 'Legs', '1. Adjust the seat of the leg press machine so that your knees are slightly bent when your feet are on the footplate.
2. Sit on the machine with your back against the backrest and your feet flat on the footplate, shoulder-width apart.
3. Place your toes and the balls of your feet on the footplate, keeping your heels off the edge.
4. Release the safety handles and push the footplate away from you by extending your knees.
5. Once your knees are fully extended, slowly lower your heels by flexing your calves.
6. Pause for a moment at the bottom, then push the footplate back up by extending your calves.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1385.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Shoulder Press', 'Shoulders', '1. Adjust the seat height and position yourself on the machine with your back against the backrest.
2. Grasp the handles with an overhand grip and position your hands at shoulder level.
3. Push the handles upward until your arms are fully extended, but do not lock your elbows.
4. Pause for a moment at the top, then slowly lower the handles back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0603.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Shoulder Press V. 2', 'Shoulders', '1. Adjust the seat height and backrest of the leverage machine to a comfortable position.
2. Sit on the machine with your back against the backrest and your feet flat on the floor.
3. Grasp the handles of the machine with an overhand grip, slightly wider than shoulder-width apart.
4. Push the handles upward and forward until your arms are fully extended, but not locked.
5. Pause for a moment at the top, then slowly lower the handles back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0869.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Shoulder Press V. 3', 'Shoulders', '1. Adjust the seat height and backrest of the leverage machine to a comfortable position.
2. Sit on the machine with your back against the backrest and your feet flat on the floor.
3. Grasp the handles of the machine with an overhand grip, slightly wider than shoulder-width apart.
4. Push the handles upward and forward until your arms are fully extended, but not locked.
5. Pause for a moment at the top, then slowly lower the handles back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2318.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Shrug', 'Back', '1. Adjust the seat height and position yourself on the leverage machine with your back against the pad.
2. Grasp the handles with an overhand grip and keep your arms straight.
3. Keeping your back straight, lift your shoulders up towards your ears as high as possible.
4. Hold the contraction for a moment, then slowly lower your shoulders back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0604.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Standing Calf Raise', 'Legs', '1. Adjust the machine to your height and stand with your feet shoulder-width apart.
2. Place your shoulders under the pads and hold onto the handles for stability.
3. Raise your heels as high as possible by extending your ankles.
4. Pause for a moment at the top, then slowly lower your heels back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0605.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Standing Chest Press', 'Chest', '1. Adjust the seat height and position yourself on the machine with your feet flat on the ground.
2. Grasp the handles with an overhand grip and position your hands at chest level.
3. Push the handles forward until your arms are fully extended, keeping your elbows slightly bent.
4. Pause for a moment, then slowly bring the handles back towards your chest, maintaining control throughout the movement.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3758.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever T Bar Row', 'Back', '1. Adjust the seat height and footplate position to ensure proper alignment.
2. Sit on the machine with your chest against the pad and your feet flat on the footplate.
3. Grasp the handles with an overhand grip, slightly wider than shoulder-width apart.
4. Keep your back straight and engage your core.
5. Pull the handles towards your torso, squeezing your shoulder blades together.
6. Pause for a moment at the peak contraction, then slowly release the handles back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0606.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever T-bar Reverse Grip Row', 'Back', '1. Adjust the seat height and position yourself on the machine with your chest against the pad and your feet flat on the floor.
2. Grasp the handles with an overhand grip, slightly wider than shoulder-width apart.
3. Keep your back straight and engage your core.
4. Pull the handles towards your chest, squeezing your shoulder blades together.
5. Pause for a moment at the top of the movement, then slowly release and extend your arms back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1351.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Triceps Extension', 'Arms', '1. Adjust the seat height and position yourself on the machine with your back against the pad.
2. Grasp the handles with an overhand grip and fully extend your arms in front of you.
3. Keeping your upper arms stationary, slowly lower the handles towards your forehead by bending your elbows.
4. Pause for a moment at the bottom, then push the handles back up to the starting position by extending your arms.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0607.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lever Unilateral Row', 'Back', '1. Adjust the seat height and position yourself facing the machine.
2. Grasp the handles with an overhand grip and keep your back straight.
3. Pull the handles towards your body, squeezing your shoulder blades together.
4. Pause for a moment at the peak of the movement, then slowly release and extend your arms back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1313.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('London Bridge', 'Back', '1. Attach the rope to a high anchor point.
2. Stand facing away from the anchor point with your feet shoulder-width apart.
3. Grasp the rope with an overhand grip, palms facing down.
4. Lean forward slightly, keeping your back straight and core engaged.
5. Pull the rope towards your body, squeezing your shoulder blades together.
6. Pause for a moment at the peak of the movement, then slowly release the tension and return to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0609.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Low Glute Bridge On Floor', 'Legs', '1. Lie flat on your back with your knees bent and feet flat on the ground.
2. Place your arms by your sides, palms facing down.
3. Engage your glutes and core, then lift your hips off the ground until your body forms a straight line from your knees to your shoulders.
4. Pause for a moment at the top, squeezing your glutes.
5. Slowly lower your hips back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3013.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lower Back Curl', 'Back', '1. Lie flat on your stomach with your legs extended and your arms by your sides.
2. Engage your glutes and hamstrings, and slowly lift your upper body off the ground, curling your back upwards.
3. Pause for a moment at the top, then slowly lower your upper body back down to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1352.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lunge With Jump', 'Legs', '1. Start by standing with your feet shoulder-width apart.
2. Take a step forward with your right foot, lowering your body into a lunge position.
3. Push off with your right foot and jump into the air, switching the position of your feet mid-air.
4. Land softly with your left foot forward and immediately lower your body into a lunge position.
5. Continue alternating between lunges and jumps for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3582.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lunge With Twist', 'Core', '1. Start by standing with your feet shoulder-width apart.
2. Take a step forward with your right foot, lowering your body into a lunge position.
3. As you lunge, twist your torso to the right, bringing your left elbow towards your right knee.
4. Pause for a moment, then return to the starting position.
5. Repeat on the other side, stepping forward with your left foot and twisting your torso to the left.
6. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1688.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lying (side) Quads Stretch', 'Legs', '1. Lie on your side with your legs straight.
2. Bend your top leg and grab your ankle or foot with your hand.
3. Gently pull your ankle or foot towards your glutes until you feel a stretch in your quads.
4. Hold the stretch for 20-30 seconds.
5. Release the stretch and repeat on the other side.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0613.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lying Elbow To Knee', 'Core', '1. Lie flat on your back with your knees bent and feet flat on the ground.
2. Place your hands behind your head with your elbows pointing outwards.
3. Engage your abs and lift your upper body off the ground, bringing your right elbow towards your left knee.
4. At the same time, extend your right leg straight out and lift it off the ground.
5. Pause for a moment, then return to the starting position.
6. Repeat the movement, this time bringing your left elbow towards your right knee and extending your left leg.
7. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2312.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lying Leg Raise Flat Bench', 'Core', '1. Lie flat on a flat bench with your back pressed against it.
2. Place your hands under your glutes for support.
3. Keep your legs straight and together, and lift them up towards the ceiling.
4. Pause for a moment at the top, then slowly lower your legs back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0620.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Lying Leg-hip Raise', 'Core', '1. Lie flat on your back with your legs extended and your arms by your sides.
2. Place your hands under your glutes for support.
3. Engage your core and lift your legs off the ground, raising them towards the ceiling.
4. Pause for a moment at the top, then slowly lower your legs back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0865.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Machine Inner Chest Press', 'Chest', '1. Adjust the seat height and position yourself on the machine with your back flat against the pad.
2. Grasp the handles with an overhand grip and position your elbows at a 90-degree angle.
3. Push the handles forward until your arms are fully extended, exhaling during the movement.
4. Pause for a moment at the end of the movement, then slowly return to the starting position, inhaling as you do so.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1301.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('March Sit (wall)', 'Legs', '1. Stand with your back against a wall and your feet hip-width apart.
2. Slowly slide your back down the wall until your knees are bent at a 90-degree angle.
3. Lift your right foot off the ground and bring your knee towards your chest.
4. Lower your right foot back down and lift your left foot off the ground, bringing your knee towards your chest.
5. Continue alternating between lifting your right and left foot for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0624.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Medicine Ball Catch And Overhead Throw', 'Back', '1. Stand with your feet shoulder-width apart, holding a medicine ball in both hands at chest level.
2. Bend your knees slightly and engage your core.
3. Lower your body into a squat position, keeping your back straight and chest up.
4. Explosively extend your hips and legs, while simultaneously throwing the medicine ball overhead.
5. Release the ball at the top of the movement and catch it on the way down.
6. Lower your body back into the squat position and repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1353.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Medicine Ball Chest Pass', 'Chest', '1. Stand with your feet shoulder-width apart, holding the medicine ball at chest level.
2. Extend your arms forward, pushing the medicine ball away from your chest with force.
3. As you release the ball, follow through with your arms and torso, transferring your weight from your back foot to your front foot.
4. Catch the ball as it rebounds off the wall or partner, and immediately repeat the movement.
5. Continue for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1302.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Medicine Ball Chest Push From 3 Point Stance', 'Chest', '1. Start in a 3 point stance with one hand on the medicine ball and the other hand on the ground.
2. Extend your legs and position your body in a straight line.
3. Lower your chest towards the ground while keeping your back straight.
4. Push the medicine ball away from your body, extending your arm fully.
5. Return to the starting position and repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1303.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Medicine Ball Chest Push Multiple Response', 'Chest', '1. Stand with your feet shoulder-width apart, holding a medicine ball at chest level.
2. Extend your arms forward, pushing the medicine ball away from your chest.
3. Pause for a moment, then slowly bring the medicine ball back to your chest.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1304.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Medicine Ball Chest Push Single Response', 'Chest', '1. Stand with your feet shoulder-width apart, holding the medicine ball at chest level.
2. Extend your arms forward, pushing the medicine ball away from your chest.
3. Pause for a moment, then slowly bring the medicine ball back to your chest.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1305.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Medicine Ball Chest Push With Run Release', 'Chest', '1. Stand with your feet shoulder-width apart, holding a medicine ball at chest level.
2. Step forward with your right foot and simultaneously push the medicine ball forward, extending your arms fully.
3. As you push the ball forward, release it and let it roll forward.
4. Quickly run forward and catch the ball before it hits the ground.
5. Once you catch the ball, bring it back to your chest and repeat the movement with your left foot forward.
6. Continue alternating legs and repeating the exercise for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1312.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Medicine Ball Close Grip Push Up', 'Arms', '1. Start in a high plank position with your hands on the medicine ball, shoulder-width apart.
2. Lower your body towards the ground by bending your elbows, keeping them close to your sides.
3. Push back up to the starting position, fully extending your arms.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1701.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Medicine Ball Overhead Slam', 'Back', '1. Stand with your feet shoulder-width apart, holding a medicine ball with both hands above your head.
2. Engage your core and keep your back straight.
3. Bend your knees slightly and forcefully slam the medicine ball down to the ground in front of you.
4. As you slam the ball down, use your entire body to generate power, including your shoulders and core.
5. Catch the ball on the bounce and repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1354.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Medicine Ball Supine Chest Throw', 'Arms', '1. Lie flat on your back on a bench with your knees bent and feet flat on the ground.
2. Hold the medicine ball with both hands, extending your arms straight up above your chest.
3. Lower the medicine ball towards your chest, keeping your elbows close to your body.
4. Explosively push the medicine ball upwards, extending your arms fully and throwing the ball as high as possible.
5. Catch the medicine ball and repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1750.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Mixed Grip Chin-up', 'Back', '1. Grab the pull-up bar with an underhand grip (palms facing towards you) and your hands slightly wider than shoulder-width apart.
2. Hang from the bar with your arms fully extended and your feet off the ground.
3. Engage your back muscles and pull your body up towards the bar, leading with your chest.
4. Continue pulling until your chin is above the bar.
5. Pause for a moment at the top, then slowly lower your body back down to the starting position with control.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0627.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Modified Hindu Push-up (male)', 'Chest', '1. Start in a push-up position with your hands slightly wider than shoulder-width apart and your feet hip-width apart.
2. Lower your body towards the ground, bending your elbows and keeping your core engaged.
3. As you lower your body, shift your weight back and lift your hips up towards the ceiling, creating an inverted V shape with your body.
4. Continue to lower your body until your chest is just above the ground, then reverse the movement, pushing your hips back down and extending your arms to return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3217.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Modified Push Up To Lower Arms', 'Arms', '1. Start in a push-up position with your hands directly under your shoulders and your body in a straight line.
2. Lower your body down towards the ground by bending your elbows, keeping them close to your sides.
3. Once your elbows are at a 90-degree angle, lower your forearms to the ground, keeping your elbows directly under your shoulders.
4. Pause for a moment, then push through your palms to lift your forearms back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1421.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Monster Walk', 'Legs', '1. Place a resistance band around your ankles.
2. Stand with your feet shoulder-width apart and slightly bend your knees.
3. Take a step to the side with your right foot, maintaining tension on the resistance band.
4. Follow with your left foot, stepping to the side to return to the starting position.
5. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0628.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Mountain Climber', 'Cardio', '1. Start in a high plank position with your hands directly under your shoulders and your body in a straight line.
2. Engage your core and bring your right knee towards your chest, then quickly switch and bring your left knee towards your chest.
3. Continue alternating legs in a running motion, keeping your hips low and your core engaged.
4. Maintain a steady pace and breathe evenly throughout the exercise.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0630.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Muscle Up', 'Back', '1. Start by hanging from a pull-up bar with your palms facing away from you and your arms fully extended.
2. Engage your core and pull your body up towards the bar, leading with your chest.
3. As you reach the top of the movement, transition your grip so that your palms are facing towards you.
4. Continue pulling yourself up until your chest is above the bar and your arms are fully flexed.
5. Reverse the movement by slowly lowering yourself back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0631.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Muscle-up (on Vertical Bar)', 'Back', '1. Start by hanging from a vertical bar with your palms facing away from you and your arms fully extended.
2. Engage your core and pull your body up towards the bar, leading with your chest.
3. As you pull yourself up, lean back slightly and bring your elbows towards your sides.
4. Continue pulling until your chest reaches the bar and your elbows are fully bent.
5. Pause for a moment at the top, then slowly lower yourself back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1401.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Narrow Push-up On Exercise Ball', 'Arms', '1. Place the stability ball on the ground and position yourself in a push-up position with your hands on the ball, slightly narrower than shoulder-width apart.
2. Engage your core and keep your body in a straight line from head to toe.
3. Lower your chest towards the ball by bending your elbows, keeping them close to your body.
4. Pause for a moment at the bottom, then push yourself back up to the starting position by straightening your arms.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2328.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Neck Side Stretch', 'Shoulders', '1. Stand or sit up straight with your shoulders relaxed.
2. Tilt your head to one side, bringing your ear towards your shoulder.
3. Hold the stretch for 15-30 seconds.
4. Repeat on the other side.
5. Perform 2-4 sets on each side.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1403.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Negative Crunch', 'Core', '1. Lie flat on your back with your knees bent and feet flat on the ground.
2. Place your hands behind your head with your elbows pointing outwards.
3. Engaging your abs, slowly lift your upper body off the ground, curling forward until your torso is at a 45-degree angle.
4. Pause for a moment at the top, then slowly lower your upper body back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0634.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Oblique Crunch V. 2', 'Core', '1. Lie on your back with your knees bent and feet flat on the ground.
2. Place your hands behind your head or cross them over your chest.
3. Engage your abs and lift your shoulder blades off the ground, rotating your torso to one side.
4. Pause for a moment, then lower your shoulder blades back down to the starting position.
5. Repeat on the other side.
6. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1495.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Oblique Crunches Floor', 'Core', '1. Lie on your back with your knees bent and feet flat on the floor.
2. Place your hands behind your head or cross them over your chest.
3. Engage your abs and lift your shoulder blades off the floor, rotating your torso to one side.
4. Pause for a moment, then lower your shoulder blades back down to the floor.
5. Repeat on the other side, alternating sides with each repetition.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0635.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Olympic Barbell Hammer Curl', 'Arms', '1. Stand up straight with your feet shoulder-width apart and hold an Olympic barbell with an overhand grip.
2. Let the barbell hang at arm''s length in front of your thighs, with your palms facing your body.
3. Keeping your upper arms stationary, exhale and curl the weights while contracting your biceps.
4. Continue to raise the barbell until your biceps are fully contracted and the barbell is at shoulder level.
5. Hold the contracted position for a brief pause as you squeeze your biceps.
6. Inhale and slowly begin to lower the barbell back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0636.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Olympic Barbell Triceps Extension', 'Arms', '1. Start by standing with your feet shoulder-width apart and holding the barbell with an overhand grip.
2. Raise the barbell above your head, fully extending your arms.
3. Keeping your upper arms close to your head, slowly lower the barbell behind your head by bending your elbows.
4. Pause for a moment, then extend your arms back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0637.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('One Arm Against Wall', 'Back', '1. Stand facing a wall with your feet shoulder-width apart.
2. Extend one arm straight out in front of you and place your palm against the wall.
3. Engage your core and lean your body forward, keeping your arm straight and your back flat.
4. Slowly push against the wall with your palm, activating your lat muscles.
5. Hold the position for a few seconds, then release and repeat with the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1355.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('One Arm Chin-up', 'Back', '1. Stand facing a pull-up bar with your feet shoulder-width apart.
2. Reach up and grab the bar with an underhand grip, with one hand gripping the bar and the other hand holding your wrist for support.
3. Hang from the bar with your arm fully extended, keeping your body straight and your core engaged.
4. Pull yourself up towards the bar by bending your elbow and squeezing your back muscles.
5. Continue pulling until your chin is above the bar, then slowly lower yourself back down to the starting position.
6. Repeat for the desired number of repetitions, then switch arms and repeat.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0638.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('One Arm Dip', 'Arms', '1. Stand facing away from a bench or chair, with your feet shoulder-width apart.
2. Place one hand on the bench or chair behind you, fingers pointing towards your body.
3. Extend your legs out in front of you, keeping your heels on the ground.
4. Bend your elbows and lower your body towards the ground, keeping your back close to the bench or chair.
5. Pause for a moment at the bottom, then push through your palms to straighten your arms and return to the starting position.
6. Repeat for the desired number of repetitions, then switch sides and repeat with the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0639.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('One Arm Slam (with Medicine Ball)', 'Core', '1. Stand with your feet shoulder-width apart, holding the medicine ball with one hand in front of your waist.
2. Bend your knees slightly and engage your core.
3. Raise the medicine ball above your head, fully extending your arm.
4. Forcefully slam the medicine ball down to the ground, using your core and shoulders to generate power.
5. Catch the medicine ball on the bounce and repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0640.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('One Arm Towel Row', 'Back', '1. Stand with your feet shoulder-width apart, knees slightly bent, and hold a towel with one hand.
2. Bend forward at the waist, keeping your back straight and your core engaged.
3. Extend your arm fully, allowing the towel to hang in front of you.
4. Pull the towel towards your chest, squeezing your shoulder blades together.
5. Pause for a moment at the top, then slowly lower the towel back to the starting position.
6. Repeat for the desired number of repetitions, then switch arms.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1773.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('One Leg Donkey Calf Raise', 'Legs', '1. Stand with your feet shoulder-width apart, toes pointing forward.
2. Place your hands on a stable surface for support, such as a wall or a bar.
3. Lift one leg off the ground, keeping your knee slightly bent.
4. Raise your heel as high as possible, using your calf muscles.
5. Pause for a moment at the top, then slowly lower your heel back down.
6. Repeat for the desired number of repetitions, then switch legs.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1386.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('One Leg Floor Calf Raise', 'Legs', '1. Stand with your feet hip-width apart and place your hands on a wall or sturdy object for balance.
2. Lift one foot off the ground and balance on the other foot.
3. Slowly raise your heel off the ground, lifting your body up onto the ball of your foot.
4. Pause for a moment at the top, then slowly lower your heel back down to the starting position.
5. Repeat for the desired number of repetitions, then switch legs and repeat.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1387.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('One Leg Squat', 'Legs', '1. Stand with your feet shoulder-width apart.
2. Extend one leg forward, keeping it off the ground.
3. Bend your standing leg and lower your body down as if sitting back into a chair.
4. Keep your chest up and your back straight.
5. Push through your heel to return to the starting position.
6. Repeat with the other leg.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1476.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Otis Up', 'Core', '1. Lie flat on your back with your knees bent and feet flat on the ground.
2. Place your hands behind your head with your elbows pointing outwards.
3. Engaging your abs, slowly lift your upper body off the ground, curling forward until your torso is at a 45-degree angle.
4. Pause for a moment at the top, then slowly lower your upper body back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0641.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Outside Leg Kick Push-up', 'Legs', '1. Start in a push-up position with your hands slightly wider than shoulder-width apart and your feet together.
2. Lower your body towards the ground by bending your elbows, keeping your back straight and core engaged.
3. As you push back up, kick one leg out to the side, extending it fully and engaging your glutes.
4. Return your leg to the starting position and repeat the push-up, alternating legs with each repetition.
5. Continue alternating leg kicks and push-ups for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0642.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Overhead Triceps Stretch', 'Arms', '1. Stand or sit upright with your feet shoulder-width apart.
2. Extend one arm overhead, bending at the elbow so that your hand reaches towards the opposite shoulder blade.
3. With your other hand, gently pull the elbow of the extended arm towards the opposite side of your head, feeling a stretch in your triceps.
4. Hold the stretch for 15-30 seconds, then release.
5. Repeat on the other side.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0643.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Pelvic Tilt', 'Core', '1. Lie flat on your back with your knees bent and feet flat on the ground.
2. Place your hands by your sides.
3. Engage your abs and tilt your pelvis upward, pressing your lower back into the ground.
4. Hold this position for a few seconds, focusing on contracting your abs.
5. Release the tilt and return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3147.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Pelvic Tilt Into Bridge', 'Legs', '1. Lie on your back with your knees bent and feet flat on the ground.
2. Place your arms by your sides with your palms facing down.
3. Engage your glutes and core muscles.
4. Tilt your pelvis upward, lifting your hips off the ground.
5. Hold the bridge position for a few seconds.
6. Slowly lower your hips back down to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1422.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Peroneals Stretch', 'Legs', '1. Sit on the ground with your legs extended in front of you.
2. Loop the rope around the ball of your foot and hold the ends of the rope with your hands.
3. Gently pull the rope towards you, flexing your foot and stretching your calf muscles.
4. Hold the stretch for 15-30 seconds.
5. Release the tension on the rope and repeat the stretch on the other leg.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1388.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Pike-to-cobra Push-up', 'Legs', '1. Start in a push-up position with your hands slightly wider than shoulder-width apart and your feet together.
2. Engage your core and lift your hips up towards the ceiling, forming an inverted V shape with your body.
3. Lower your upper body towards the ground by bending your elbows, keeping them close to your body.
4. As you lower down, shift your weight forward and transition into a cobra pose by straightening your arms and lifting your chest up.
5. Reverse the movement by bending your elbows and lowering your chest back down towards the ground.
6. Push through your hands to return to the inverted V position.
7. Continue the movement by lowering your hips back down towards the ground, returning to the starting push-up position.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3662.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Plyo Push Up', 'Chest', '1. Start in a high plank position with your hands slightly wider than shoulder-width apart.
2. Lower your chest towards the ground by bending your elbows, keeping your body in a straight line.
3. Push explosively off the ground, using your chest muscles to propel your upper body off the ground.
4. Land softly with your hands back in the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1306.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Posterior Step To Overhead Reach', 'Core', '1. Stand with your feet hip-width apart and your arms by your sides.
2. Take a step back with your right foot, landing on the ball of your foot.
3. Bend your left knee and lower your body into a lunge position.
4. As you lower into the lunge, simultaneously reach your arms overhead.
5. Pause for a moment at the bottom of the lunge, then return to the starting position by pushing through your left heel and bringing your right foot forward.
6. Repeat the movement on the other side, stepping back with your left foot and bending your right knee.
7. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1687.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Posterior Tibialis Stretch', 'Legs', '1. Sit on the ground with your legs extended in front of you.
2. Loop the rope around the ball of your foot and hold the ends of the rope with your hands.
3. Gently pull the rope towards you, flexing your foot and stretching your calf muscles.
4. Hold the stretch for 20-30 seconds.
5. Release the tension on the rope and relax your foot.
6. Repeat the stretch on the other leg.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1389.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Potty Squat', 'Core', '1. Stand with your feet shoulder-width apart, toes pointing slightly outward.
2. Lower your body down by bending your knees and pushing your hips back as if you were sitting on a chair.
3. Keep your chest up and your back straight throughout the movement.
4. Lower yourself until your thighs are parallel to the ground or as low as you can comfortably go.
5. Pause for a moment at the bottom, then push through your heels to return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3119.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Potty Squat With Support', 'Legs', '1. Stand with your feet shoulder-width apart, toes pointing slightly outward.
2. Hold onto a stable support, such as a chair or wall, for balance.
3. Lower your body down into a squat position by bending your knees and pushing your hips back.
4. Keep your chest up and your back straight throughout the movement.
5. Pause for a moment at the bottom, then push through your heels to return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3132.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Power Clean', 'Legs', '1. Start with the barbell on the ground in front of you, with your feet shoulder-width apart.
2. Bend down and grip the barbell with an overhand grip, slightly wider than shoulder-width apart.
3. Keep your back straight and chest up as you lift the barbell off the ground, extending your hips and knees.
4. As the barbell reaches your mid-thigh, explosively pull it upwards, shrugging your shoulders and pulling your elbows high and to the sides.
5. As the barbell reaches its highest point, quickly drop underneath it, rotating your elbows around and catching the barbell on your shoulders in a front squat position.
6. Stand up with the barbell, fully extending your hips and knees.
7. Lower the barbell back down to the starting position, keeping control of the weight throughout the movement.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0648.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Power Point Plank', 'Core', '1. Start in a high plank position with your hands directly under your shoulders and your body in a straight line from head to toe.
2. Engage your core and squeeze your glutes to maintain a stable position.
3. Lower your body down onto your forearms, one arm at a time, maintaining a straight line from head to toe.
4. Hold this position for the desired amount of time, keeping your core and glutes engaged.
5. To return to the starting position, push through your forearms and lift your body back up into a high plank position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3665.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Prisoner Half Sit-up (male)', 'Core', '1. Lie flat on your back with your knees bent and feet flat on the ground.
2. Place your hands behind your head with your elbows pointing outwards.
3. Engaging your abs, slowly lift your upper body off the ground, curling forward until your torso is at a 45-degree angle.
4. Pause for a moment at the top, then slowly lower your upper body back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3203.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Prone Twist On Stability Ball', 'Core', '1. Start by lying face down on a stability ball with your feet shoulder-width apart and your toes touching the ground.
2. Place your hands behind your head or cross them over your chest.
3. Engage your core muscles and slowly lift your upper body off the ball, keeping your back straight.
4. Rotate your torso to one side, bringing your shoulder towards your hip. Keep your hips and legs stable throughout the movement.
5. Pause for a moment, then return to the starting position.
6. Repeat the rotation to the other side.
7. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1707.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Pull Up (neutral Grip)', 'Back', '1. Hang from a pull-up bar with a neutral grip (palms facing each other) and your arms fully extended.
2. Engage your core and squeeze your shoulder blades together.
3. Pull your body up towards the bar by bending your elbows and driving your elbows down towards your hips.
4. Continue pulling until your chin is above the bar.
5. Pause for a moment at the top, then slowly lower your body back down to the starting position with control.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0651.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Pull-in (on Stability Ball)', 'Core', '1. Start by sitting on the stability ball with your feet flat on the ground and your knees bent at a 90-degree angle.
2. Place your hands on the sides of the stability ball for support.
3. Engage your abs and slowly roll your hips forward, bringing your knees towards your chest.
4. Pause for a moment at the top of the movement, then slowly extend your legs back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0650.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Pull-up', 'Back', '1. Hang from a pull-up bar with your palms facing away from you and your arms fully extended.
2. Engage your core and squeeze your shoulder blades together.
3. Pull your body up towards the bar by bending your elbows and bringing your chest towards the bar.
4. Pause at the top of the movement, then slowly lower your body back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0652.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Push And Pull Bodyweight', 'Chest', '1. Start in a push-up position with your hands slightly wider than shoulder-width apart and your body in a straight line.
2. Lower your chest towards the ground by bending your elbows, keeping your body straight.
3. Push through your palms to extend your arms and return to the starting position.
4. From the push-up position, pull your chest towards the ground by bending your elbows, keeping your body straight.
5. Push through your palms to extend your arms and return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1689.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Push To Run', 'Cardio', '1. Start in a push-up position with your hands shoulder-width apart and your body in a straight line.
2. Lower your chest towards the ground by bending your elbows, keeping your body straight.
3. Push through your hands to extend your arms and return to the starting position.
4. Quickly bring one knee towards your chest, then quickly switch and bring the other knee towards your chest.
5. Continue alternating knees as fast as you can while maintaining good form.
6. Continue for the desired duration or number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3638.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Push Up On Bosu Ball', 'Chest', '1. Place the bosu ball on the ground with the flat side facing up.
2. Position yourself in a push-up position with your hands on the outer edges of the bosu ball.
3. Engage your core and lower your body down towards the bosu ball by bending your elbows.
4. Push yourself back up to the starting position by extending your arms.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1307.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Push-up', 'Chest', '1. Start in a high plank position with your hands slightly wider than shoulder-width apart and your feet together.
2. Engage your core and lower your body towards the ground by bending your elbows, keeping your body in a straight line.
3. Pause for a moment when your chest is just above the ground, then push yourself back up to the starting position by straightening your arms.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0662.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Push-up (bosu Ball)', 'Chest', '1. Place the bosu ball on the ground with the flat side facing up.
2. Position yourself in a push-up position with your hands on the outer edges of the bosu ball.
3. Engage your core and lower your body down towards the bosu ball by bending your elbows.
4. Push yourself back up to the starting position by extending your arms.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0653.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Push-up (on Stability Ball)', 'Chest', '1. Place the stability ball on the ground and position yourself facing down with your hands on the ball, shoulder-width apart.
2. Extend your legs straight out behind you, balancing on your toes.
3. Engage your core and lower your chest towards the ball by bending your elbows, keeping your body in a straight line.
4. Pause for a moment at the bottom, then push yourself back up to the starting position by straightening your arms.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0655.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Push-up (on Stability Ball)', 'Chest', '1. Place the stability ball on the ground and position yourself facing down with your hands on the ball, shoulder-width apart.
2. Extend your legs straight out behind you, balancing on your toes.
3. Engage your core and lower your chest towards the ball by bending your elbows, keeping your body in a straight line.
4. Pause for a moment at the bottom, then push yourself back up to the starting position by straightening your arms.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0656.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Push-up (wall)', 'Chest', '1. Stand facing a wall, about arm''s length away.
2. Place your hands on the wall at shoulder height, slightly wider than shoulder-width apart.
3. Step back a few feet, keeping your body straight and your feet hip-width apart.
4. Bend your elbows and lower your chest towards the wall, keeping your body in a straight line.
5. Push back up to the starting position, straightening your arms.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0659.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Push-up (wall) V. 2', 'Chest', '1. Stand facing a wall, about arm''s length away.
2. Place your hands on the wall at shoulder height, slightly wider than shoulder-width apart.
3. Step back with your feet, keeping them hip-width apart.
4. Engage your core and keep your body in a straight line from head to heels.
5. Bend your elbows and lower your chest towards the wall, keeping your body straight.
6. Pause for a moment, then push yourself back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0658.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Push-up Close-grip Off Dumbbell', 'Arms', '1. Start in a push-up position with your hands placed close together, directly under your shoulders.
2. Hold a dumbbell in each hand, resting them on the ground.
3. Lower your body towards the ground by bending your elbows, keeping them close to your sides.
4. Push through your palms to extend your arms and return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0660.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Push-up Inside Leg Kick', 'Legs', '1. Start in a push-up position with your hands slightly wider than shoulder-width apart and your feet together.
2. Lower your body towards the ground by bending your elbows, keeping your back straight and your core engaged.
3. As you push back up, lift one leg off the ground and kick it out to the side, keeping it straight.
4. Lower your leg back down and repeat the push-up, then switch to the other leg.
5. Continue alternating leg kicks with each push-up repetition.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0661.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Push-up Medicine Ball', 'Chest', '1. Start in a high plank position with your hands on the medicine ball, shoulder-width apart.
2. Engage your core and lower your body towards the ground by bending your elbows, keeping your back straight.
3. Push through your palms to extend your arms and return to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0663.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Push-up On Lower Arms', 'Arms', '1. Start in a plank position with your forearms on the ground and elbows directly below your shoulders.
2. Engage your core and keep your body in a straight line from head to toe.
3. Lower your chest towards the ground by bending your elbows, keeping them close to your body.
4. Pause for a moment at the bottom, then push yourself back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1467.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Push-up Plus', 'Chest', '1. Start in a high plank position with your hands slightly wider than shoulder-width apart and your body in a straight line from head to heels.
2. Lower your body towards the ground by bending your elbows, keeping them close to your sides.
3. Once your chest is just above the ground, push through your hands to extend your arms and lift your upper body up.
4. At the top of the movement, protract your shoulder blades by pushing your upper back towards the ceiling.
5. Pause for a moment, then reverse the movement by retracting your shoulder blades and lowering your body back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3145.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Push-up To Side Plank', 'Core', '1. Start in a push-up position with your hands shoulder-width apart and your body in a straight line.
2. Lower your body towards the ground by bending your elbows, keeping your core engaged.
3. Push back up to the starting position.
4. Shift your weight onto your left hand and rotate your body to the right, lifting your right arm towards the ceiling.
5. Hold the side plank position for a few seconds, then return to the starting position.
6. Repeat the push-up and side plank on the opposite side.
7. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0664.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Quads', 'Legs', '1. Stand with your feet shoulder-width apart.
2. Lower your body by bending your knees and pushing your hips back as if sitting on a chair.
3. Keep your chest up and your back straight.
4. Lower yourself until your thighs are parallel to the ground.
5. Push through your heels to return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3533.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Quarter Sit-up', 'Core', '1. Lie flat on your back with your knees bent and feet flat on the ground.
2. Place your hands behind your head with your elbows pointing outwards.
3. Engaging your abs, slowly lift your upper body off the ground, curling forward until your torso is at a 45-degree angle.
4. Pause for a moment at the top, then slowly lower your upper body back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3201.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Quick Feet V. 2', 'Legs', '1. Stand with your feet shoulder-width apart and your arms by your sides.
2. Begin by rapidly moving your feet up and down, as if you were running in place.
3. Keep your movements quick and light, focusing on staying on the balls of your feet.
4. Continue for the desired duration or number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3552.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Raise Single Arm Push-up', 'Chest', '1. Start in a push-up position with your hands slightly wider than shoulder-width apart and your feet together.
2. Extend one arm straight out to the side, parallel to the ground.
3. Lower your body towards the ground by bending your elbows, keeping your back straight and core engaged.
4. Push back up to the starting position, using your chest muscles to lift your body.
5. Repeat with the other arm extended.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0666.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Rear Decline Bridge', 'Legs', '1. Lie on your back with your feet flat on the ground and your knees bent.
2. Place your arms by your sides with your palms facing down.
3. Engage your glutes and hamstrings, and lift your hips off the ground until your body forms a straight line from your knees to your shoulders.
4. Hold this position for a few seconds, then slowly lower your hips back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0668.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Rear Deltoid Stretch', 'Shoulders', '1. Stand tall with your feet shoulder-width apart.
2. Extend your right arm across your chest, placing your left hand on your right elbow.
3. Gently pull your right arm towards your left shoulder, feeling a stretch in your right shoulder.
4. Hold the stretch for 15-30 seconds, then release.
5. Repeat on the other side.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0669.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Rear Pull-up', 'Back', '1. Grab the pull-up bar with an overhand grip, slightly wider than shoulder-width apart.
2. Hang from the bar with your arms fully extended and your body straight.
3. Engage your back muscles and pull your body up towards the bar, keeping your elbows close to your body.
4. Continue pulling until your chin is above the bar.
5. Pause for a moment at the top, then slowly lower your body back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0670.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Reclining Big Toe Pose With Rope', 'Legs', '1. Lie on your back with your legs extended and your arms by your sides.
2. Loop the rope around the ball of your right foot and hold the ends of the rope with your hands.
3. Slowly raise your right leg towards your chest, keeping your knee straight and your foot flexed.
4. Hold the stretch for a few seconds, then slowly lower your leg back down to the starting position.
5. Repeat with your left leg.
6. Continue alternating legs for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1582.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Resistance Band Hip Thrusts On Knees (female)', 'Legs', '1. Start by kneeling on the ground with your knees hip-width apart and your feet flexed.
2. Wrap the resistance band around your thighs, just above your knees.
3. Place your hands on your hips or extend them out in front of you for balance.
4. Engage your glutes and core muscles.
5. Push your hips forward and squeeze your glutes as you lift your knees off the ground, extending your hips until your thighs are parallel to the ground.
6. Hold the position for a moment, then slowly lower your knees back down to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3236.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Resistance Band Leg Extension', 'Legs', '1. Attach the resistance band to a sturdy anchor point and secure it around your ankle.
2. Stand facing the anchor point with your feet shoulder-width apart.
3. Keeping your core engaged and your upper body stable, extend your leg straight out in front of you.
4. Pause for a moment at the top, then slowly return your leg to the starting position.
5. Repeat for the desired number of repetitions, then switch legs.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3007.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Resistance Band Seated Biceps Curl', 'Arms', '1. Sit on a chair or bench with your back straight and feet flat on the ground.
2. Hold the resistance band with an underhand grip, palms facing up, and arms extended down by your sides.
3. Keeping your upper arms stationary, exhale and curl the resistance band up towards your shoulders.
4. Pause for a moment at the top, squeezing your biceps.
5. Inhale and slowly lower the resistance band back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3123.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Resistance Band Seated Chest Press', 'Chest', '1. Sit on a chair or bench with your back straight and feet flat on the ground.
2. Hold the resistance band handles in each hand, with your palms facing down and elbows bent at a 90-degree angle.
3. Extend your arms forward, pushing the resistance band away from your chest.
4. Pause for a moment at the end of the movement, then slowly return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3124.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Resistance Band Seated Hip Abduction', 'Legs', '1. Sit on a chair or bench with your back straight and feet flat on the ground.
2. Wrap the resistance band around your thighs, just above your knees.
3. Place your hands on the sides of the chair or bench for support.
4. Engage your abductors (outer thigh muscles) and slowly push your knees apart, against the resistance of the band.
5. Pause for a moment at the end of the movement, then slowly bring your knees back together.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3006.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Resistance Band Seated Shoulder Press', 'Shoulders', '1. Sit on a chair or bench with your back straight and feet flat on the ground.
2. Hold the resistance band with both hands, palms facing forward, and bring it up to shoulder level.
3. Press the band overhead, extending your arms fully.
4. Pause for a moment at the top, then slowly lower the band back down to shoulder level.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3122.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Resistance Band Seated Straight Back Row', 'Back', '1. Sit on the floor with your legs extended and loop the resistance band around your feet.
2. Hold the ends of the resistance band with your hands, palms facing each other.
3. Keep your back straight and lean slightly back, engaging your core.
4. Pull the resistance band towards your chest, squeezing your shoulder blades together.
5. Pause for a moment at the top, then slowly release the tension and return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3144.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Reverse Crunch', 'Core', '1. Lie flat on your back with your arms extended along your sides.
2. Bend your knees and lift your feet off the ground, bringing your thighs perpendicular to the floor.
3. Contract your abs and curl your hips off the floor, bringing your knees towards your chest.
4. Pause for a moment at the top, then slowly lower your hips back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0872.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Reverse Dip', 'Arms', '1. Position yourself between two parallel bars with your arms fully extended and your body straight.
2. Lower your body by bending your elbows until your upper arms are parallel to the ground.
3. Pause for a moment, then push yourself back up to the starting position by straightening your arms.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0672.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Reverse Grip Machine Lat Pulldown', 'Back', '1. Adjust the seat height and position yourself on the machine with your knees under the pads and your feet flat on the ground.
2. Grasp the handles with an underhand grip, slightly wider than shoulder-width apart.
3. Sit upright with your chest out and shoulders back, maintaining a slight arch in your lower back.
4. Pull the handles down towards your chest, squeezing your shoulder blades together.
5. Pause for a moment at the bottom of the movement, then slowly release the handles back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0673.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Reverse Grip Pull-up', 'Back', '1. Grab the pull-up bar with an underhand grip, hands shoulder-width apart.
2. Hang from the bar with your arms fully extended and your body straight.
3. Engage your back muscles and pull your body up towards the bar, leading with your chest.
4. Continue pulling until your chin is above the bar.
5. Pause for a moment at the top, then slowly lower your body back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0674.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Reverse Hyper Extension (on Stability Ball)', 'Legs', '1. Lie face down on a stability ball with your hips resting on the ball and your legs extended straight behind you.
2. Place your hands on the ground in front of you for stability.
3. Engaging your glutes and hamstrings, lift your legs up towards the ceiling as high as you can.
4. Pause for a moment at the top, then slowly lower your legs back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0675.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Reverse Hyper On Flat Bench', 'Legs', '1. Lie face down on a flat bench with your hips at the edge and your legs hanging off the bench.
2. Hold onto the bench for stability.
3. Keeping your legs straight, raise them up towards the ceiling as high as you can.
4. Squeeze your glutes at the top of the movement.
5. Slowly lower your legs back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1423.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Reverse Plank With Leg Lift', 'Core', '1. Sit on the ground with your legs extended in front of you and your hands resting on the ground behind you, fingers pointing towards your feet.
2. Press through your hands and lift your hips off the ground, coming into a reverse plank position.
3. Engage your core and lift one leg off the ground, extending it straight up towards the ceiling.
4. Hold for a moment, then lower your leg back down.
5. Repeat with the other leg.
6. Continue alternating legs for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3663.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Ring Dips', 'Arms', '1. Start by hanging from the rings with your arms fully extended and your body straight.
2. Lower your body by bending your elbows until your shoulders are below your elbows.
3. Push yourself back up to the starting position by straightening your arms.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0677.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Rocking Frog Stretch', 'Legs', '1. Start by kneeling on the ground with your knees hip-width apart.
2. Place your hands on the ground in front of you for support.
3. Slowly lean forward, shifting your weight onto your hands and extending your legs behind you.
4. Keep your back straight and engage your glutes as you push your hips back and up towards the ceiling.
5. Hold this position for a few seconds, feeling a stretch in your glutes.
6. Slowly return to the starting position by bending your knees and lowering your hips back down.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2571.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Rocky Pull-up Pulldown', 'Back', '1. Stand in front of a pull-up bar with your feet shoulder-width apart.
2. Reach up and grab the bar with an overhand grip, slightly wider than shoulder-width apart.
3. Hang from the bar with your arms fully extended and your body straight.
4. Engage your back muscles and pull your body up towards the bar, leading with your chest.
5. Pause for a moment at the top, then slowly lower your body back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0678.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Roller Back Stretch', 'Back', '1. Start by sitting on the ground with your legs extended in front of you.
2. Place the roller perpendicular to your body, just below your glutes.
3. Slowly roll your body backwards, allowing the roller to move up your back.
4. Continue rolling until the roller reaches your upper back.
5. Pause for a moment, then slowly roll back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2208.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Roller Body Saw', 'Core', '1. Start in a plank position with your forearms on the roller and your body in a straight line.
2. Engage your core and slowly roll the roller forward, extending your body as far as you can while maintaining control.
3. Pause for a moment at the furthest point, then slowly roll the roller back towards your starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2204.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Roller Hip Lat Stretch', 'Legs', '1. Start by kneeling on the ground with the roller positioned under your hips.
2. Place your hands on the roller for support.
3. Slowly roll the roller forward, extending your hips and stretching your glutes.
4. Hold the stretch for a few seconds, then roll back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2205.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Roller Hip Stretch', 'Legs', '1. Start by sitting on the ground with your legs extended in front of you.
2. Place the roller under your glutes, just above your knees.
3. Lean back and place your hands on the ground behind you for support.
4. Engage your glutes and slowly roll the roller forward, bending your knees and bringing them towards your chest.
5. Pause for a moment at the end of the movement, feeling a stretch in your glutes.
6. Slowly roll the roller back to the starting position, extending your legs.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2202.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Roller Reverse Crunch', 'Core', '1. Lie flat on your back with your arms extended straight above your head and your legs straight out in front of you.
2. Place the roller between your feet and grip it with your toes.
3. Engaging your abs, lift your legs off the ground and curl your knees towards your chest, rolling the roller towards your body.
4. Pause for a moment at the top, then slowly lower your legs back down to the starting position, rolling the roller away from your body.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2206.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Roller Seated Shoulder Flexor Depresor Retractor', 'Chest', '1. Sit on a flat surface with your legs extended in front of you.
2. Hold the roller with both hands, palms facing down, and place it on your thighs.
3. Lean forward slightly and roll the roller away from your body, extending your arms straight in front of you.
4. Pause for a moment, then slowly roll the roller back towards your body, bending your arms and bringing the roller back to your thighs.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2203.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Roller Seated Single Leg Shoulder Flexor Depresor Retractor', 'Chest', '1. Sit on a flat surface with your legs extended in front of you.
2. Hold the roller with both hands, palms facing down, and place it on your thighs.
3. Lean back slightly and engage your core muscles.
4. Raise the roller up to shoulder level, keeping your arms straight.
5. Slowly lower the roller back down to your thighs.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2209.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Roller Side Lat Stretch', 'Back', '1. Stand with your feet shoulder-width apart and hold the roller with both hands in front of your body.
2. Bend your knees slightly and hinge forward at the hips, keeping your back straight.
3. Extend your arms forward and roll the roller down towards your feet, feeling a stretch in your lats.
4. Hold the stretch for a few seconds, then slowly roll the roller back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2207.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Rope Climb', 'Back', '1. Stand facing the rope with your feet shoulder-width apart.
2. Grab the rope with both hands, palms facing towards you.
3. Bend your knees slightly and engage your core.
4. Begin pulling yourself up the rope by alternating hand-over-hand movements.
5. Use your legs to assist in the upward movement.
6. Continue climbing until you reach the desired height or the top of the rope.
7. To descend, reverse the hand-over-hand movement while controlling your descent.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0680.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Run', 'Cardio', '1. Start by standing upright with your feet hip-width apart.
2. Engage your core and keep your upper body relaxed.
3. Begin jogging in place, lifting your knees up towards your chest and landing softly on the balls of your feet.
4. Maintain a steady pace and continue jogging for the desired duration or distance.
5. Remember to breathe deeply and maintain good posture throughout the exercise.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0685.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Run (equipment)', 'Cardio', '1. Start by standing upright with your feet hip-width apart.
2. Engage your core and keep your upper body relaxed.
3. Begin jogging in place, lifting your knees up towards your chest and landing softly on the balls of your feet.
4. Maintain a steady pace and continue jogging for the desired duration or distance.
5. Remember to breathe deeply and maintain good posture throughout the exercise.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0684.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Runners Stretch', 'Legs', '1. Stand with your feet hip-width apart.
2. Take a step forward with your right foot, keeping your left foot planted.
3. Bend your right knee and lower your body down, keeping your left leg straight.
4. Place your hands on your right thigh for support.
5. Hold the stretch for 20-30 seconds, then switch sides and repeat.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1585.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Russian Twist', 'Core', '1. Sit on the ground with your knees bent and feet flat on the floor.
2. Lean back slightly while keeping your back straight and your core engaged.
3. Hold your hands together in front of your chest or hold a weight if desired.
4. Lift your feet off the ground, balancing on your sit bones.
5. Twist your torso to the right, bringing your hands or weight towards the right side of your body.
6. Pause for a moment, then twist your torso to the left, bringing your hands or weight towards the left side of your body.
7. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0687.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Scapula Dips', 'Back', '1. Start by standing with your feet shoulder-width apart and your arms extended in front of you.
2. Bend your knees slightly and hinge forward at the hips, keeping your back straight.
3. Lower your body by bending your elbows and retracting your shoulder blades, as if you are trying to squeeze a pencil between them.
4. Pause for a moment at the bottom, then push through your hands to extend your elbows and return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3012.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Scapula Push-up', 'Chest', '1. Start in a high plank position with your hands directly under your shoulders and your body in a straight line.
2. Lower your chest towards the ground, keeping your elbows close to your body.
3. As you lower, squeeze your shoulder blades together and push your chest forward.
4. Pause for a moment at the bottom, then push back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3021.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Scapular Pull-up', 'Back', '1. Start by hanging from a pull-up bar with your palms facing away from you and your arms fully extended.
2. Retract your shoulder blades by pulling them down and back.
3. Engage your back muscles and pull your body up towards the bar, focusing on squeezing your shoulder blades together.
4. Pause for a moment at the top of the movement, then slowly lower your body back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0688.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Scissor Jumps (male)', 'Cardio', '1. Stand with your feet shoulder-width apart.
2. Jump off the ground and simultaneously cross your right leg in front of your left leg.
3. As you land, quickly switch legs, crossing your left leg in front of your right leg.
4. Continue alternating legs and jumping as quickly as possible.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3219.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Seated Calf Stretch (male)', 'Legs', '1. Sit on the edge of a chair or bench with your feet flat on the ground.
2. Extend one leg straight out in front of you, keeping your heel on the ground.
3. Lean forward slightly, feeling a stretch in your calf muscle.
4. Hold the stretch for 20-30 seconds.
5. Switch legs and repeat the stretch.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1390.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Seated Glute Stretch', 'Legs', '1. Sit on the ground with your legs extended in front of you.
2. Bend your right knee and cross your right ankle over your left thigh.
3. Place your right hand on the ground behind you for support.
4. With your left hand, gently press down on your right knee to deepen the stretch.
5. Hold the stretch for 30 seconds to 1 minute.
6. Switch sides and repeat.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1424.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Seated Leg Raise', 'Core', '1. Sit on a flat bench with your back straight and your feet flat on the ground.
2. Place your hands on the sides of the bench for support.
3. Keeping your legs straight, slowly raise them up in front of you until they are parallel to the ground.
4. Pause for a moment at the top, then slowly lower your legs back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0689.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Seated Lower Back Stretch', 'Back', '1. Sit on the edge of a chair with your feet flat on the ground.
2. Place your hands on your thighs or on the sides of the chair for support.
3. Slowly lean forward from your hips, keeping your back straight.
4. Feel the stretch in your lower back and hold for 20-30 seconds.
5. Slowly return to the starting position and repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0690.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Seated Piriformis Stretch', 'Legs', '1. Sit on the ground with your legs extended in front of you.
2. Bend your right knee and place your right foot on the outside of your left knee.
3. Place your left elbow on the outside of your right knee and gently twist your torso to the right.
4. Hold the stretch for 20-30 seconds, then switch sides and repeat.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2567.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Seated Side Crunch (wall)', 'Core', '1. Sit on the floor with your back against a wall and your legs extended in front of you.
2. Bend your knees and place your feet flat on the floor, hip-width apart.
3. Place your hands behind your head with your elbows pointing outwards.
4. Engage your abs and lean to one side, bringing your elbow towards your hip.
5. Pause for a moment, then return to the starting position.
6. Repeat on the other side.
7. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0691.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Seated Wide Angle Pose Sequence', 'Legs', '1. Sit on the ground with your legs extended in a wide angle.
2. Flex your feet and engage your quadriceps.
3. Place your hands on the ground behind you for support.
4. Keeping your back straight, lean forward from your hips.
5. Continue leaning forward until you feel a stretch in your hamstrings.
6. Hold this position for a few breaths.
7. Slowly release the stretch and return to the starting position.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1587.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Self Assisted Inverse Leg Curl', 'Legs', '1. Lie flat on your back on a mat or bench with your legs extended.
2. Place your hands by your sides or under your glutes for support.
3. Bend your knees and lift your feet off the ground, bringing your thighs towards your chest.
4. Pause for a moment at the top, then slowly lower your legs back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0697.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Self Assisted Inverse Leg Curl', 'Legs', '1. Lie face down on a leg curl machine with your legs extended and your ankles hooked under the padded lever.
2. Place your hands on the side handles of the machine for support.
3. Keeping your upper body stationary, exhale and curl your legs upward as far as possible.
4. Hold the contracted position for a brief pause as you squeeze your hamstrings.
5. Slowly lower your legs back to the starting position while inhaling.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1766.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Self Assisted Inverse Leg Curl (on Floor)', 'Legs', '1. Lie flat on your back with your legs extended and your arms by your sides.
2. Bend your knees and place your feet flat on the ground, hip-width apart.
3. Lift your hips off the ground, engaging your glutes and hamstrings.
4. Slowly curl your legs towards your glutes, keeping your hips lifted.
5. Pause for a moment at the top, then slowly extend your legs back to the starting position.
6. Lower your hips back down to the ground.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0696.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Semi Squat Jump (male)', 'Cardio', '1. Stand with your feet shoulder-width apart.
2. Bend your knees and lower your body into a squat position.
3. Jump explosively, extending your hips and knees while swinging your arms for momentum.
4. Land softly on the balls of your feet and immediately go into the next repetition.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3222.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Short Stride Run', 'Cardio', '1. Find an open space or a treadmill to perform the exercise.
2. Stand tall with your feet hip-width apart.
3. Start jogging in place, lifting your knees high and pumping your arms.
4. After a few seconds, start taking short strides forward, maintaining a quick pace.
5. Continue running with short strides for the desired duration or distance.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3656.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Shoulder Grip Pull-up', 'Back', '1. Grab the pull-up bar with a shoulder-width grip, palms facing away from you.
2. Hang freely with your arms fully extended.
3. Engage your back muscles and pull your body up towards the bar until your chin is above the bar.
4. Pause for a moment at the top, then slowly lower your body back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1763.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Shoulder Tap', 'Core', '1. Start in a high plank position with your hands directly under your shoulders and your body in a straight line.
2. Engage your core and lift your right hand off the ground, reaching across to tap your left shoulder.
3. Place your right hand back on the ground and repeat with your left hand tapping your right shoulder.
4. Continue alternating shoulder taps while keeping your hips and torso stable.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3699.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Shoulder Tap Push-up', 'Chest', '1. Start in a high plank position with your hands slightly wider than shoulder-width apart and your body in a straight line from head to heels.
2. Lower your body towards the ground by bending your elbows, keeping them close to your sides.
3. As you push back up, lift your right hand off the ground and tap your left shoulder.
4. Return your right hand to the ground and repeat the push-up, this time lifting your left hand and tapping your right shoulder.
5. Continue alternating shoulder taps with each push-up repetition.
6. Maintain a stable core and avoid excessive hip rotation throughout the exercise.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0699.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Side Bridge Hip Abduction', 'Legs', '1. Lie on your side with your legs extended and stacked on top of each other.
2. Prop yourself up on your forearm, keeping your elbow directly below your shoulder.
3. Engage your core and lift your hips off the ground, creating a straight line from your head to your feet.
4. While keeping your core engaged, lift your top leg as high as possible without rotating your hips.
5. Pause for a moment at the top, then lower your leg back down.
6. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1774.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Side Bridge V. 2', 'Core', '1. Lie on your side with your legs extended and stacked on top of each other.
2. Place your forearm on the ground directly below your shoulder, with your elbow bent at a 90-degree angle.
3. Engage your core and lift your hips off the ground, creating a straight line from your head to your feet.
4. Hold this position for the desired amount of time.
5. Lower your hips back down to the starting position.
6. Repeat on the other side.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0705.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Side Hip (on Parallel Bars)', 'Core', '1. Stand between two parallel bars with your feet shoulder-width apart.
2. Place your hands on the bars and lift your body off the ground, supporting your weight on your arms.
3. Engage your abs and slowly lift your legs to the side, keeping them straight.
4. Pause for a moment at the top, then slowly lower your legs back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0709.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Side Hip Abduction', 'Legs', '1. Stand with your feet shoulder-width apart and your hands on your hips.
2. Shift your weight to one leg and lift the opposite leg out to the side, keeping it straight.
3. Pause for a moment at the top, then slowly lower your leg back down to the starting position.
4. Repeat on the other side.
5. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0710.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Side Lying Floor Stretch', 'Back', '1. Lie on your side with your legs straight and your bottom arm extended straight overhead.
2. Bend your top knee and place your foot on the ground in front of your bottom leg.
3. Reach your top arm over your head and grab onto something stable, like a wall or a piece of furniture.
4. Slowly lift your bottom leg off the ground, keeping it straight, until you feel a stretch in your side.
5. Hold the stretch for 20-30 seconds, then slowly lower your leg back down.
6. Repeat on the other side.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1358.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Side Lying Hip Adduction (male)', 'Legs', '1. Lie on your side with your legs straight and stacked on top of each other.
2. Place your bottom arm under your head for support.
3. Engage your adductors and lift your top leg as high as possible without rotating your hips or leaning backward.
4. Pause for a moment at the top, then slowly lower your leg back down to the starting position.
5. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3667.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Side Plank Hip Adduction', 'Legs', '1. Start by lying on your side with your legs extended and stacked on top of each other.
2. Prop yourself up on your forearm, keeping your elbow directly below your shoulder.
3. Engage your core and lift your hips off the ground, creating a straight line from your head to your feet.
4. While maintaining the side plank position, lift your top leg towards the ceiling, keeping it straight.
5. Slowly lower your leg back down to the starting position.
6. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1775.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Side Push Neck Stretch', 'Shoulders', '1. Stand or sit up straight with your shoulders relaxed.
2. Tilt your head to the right, bringing your right ear towards your right shoulder.
3. Place your right hand on the left side of your head and gently apply pressure to increase the stretch.
4. Hold the stretch for 15-30 seconds.
5. Repeat on the other side, tilting your head to the left and applying pressure with your left hand.
6. Repeat the stretch 2-3 times on each side.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0716.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Side Push-up', 'Arms', '1. Start by lying on your side with your legs extended and stacked on top of each other.
2. Place your bottom hand on the ground directly under your shoulder, fingers pointing forward.
3. Press through your bottom hand to lift your body off the ground, keeping your legs straight and your core engaged.
4. Extend your top arm straight up towards the ceiling, creating a straight line from your head to your heels.
5. Lower your body back down to the starting position with control.
6. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0717.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Side Wrist Pull Stretch', 'Arms', '1. Stand with your feet shoulder-width apart and your arms extended in front of you.
2. Extend your right arm out to the side, parallel to the ground, with your palm facing down.
3. With your left hand, grab your right hand and gently pull it towards your body, feeling a stretch in your right forearm.
4. Hold the stretch for 15-30 seconds, then release.
5. Repeat on the other side.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0721.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Side-to-side Chin', 'Back', '1. Stand with your feet shoulder-width apart and your knees slightly bent.
2. Grasp a pull-up bar with an overhand grip, hands slightly wider than shoulder-width apart.
3. Hang from the bar with your arms fully extended and your body relaxed.
4. Pull yourself up by bending your elbows and bringing your chin towards the bar, while keeping your body straight.
5. Once your chin is above the bar, lower yourself back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0720.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Side-to-side Toe Touch (male)', 'Core', '1. Stand with your feet shoulder-width apart and your arms extended to the sides.
2. Bend at the waist to the right, reaching your right hand towards your right foot while keeping your left hand extended to the side.
3. Return to the starting position and then bend at the waist to the left, reaching your left hand towards your left foot while keeping your right hand extended to the side.
4. Repeat the side-to-side bending motion for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3213.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Single Arm Push-up', 'Chest', '1. Start in a push-up position with your hands shoulder-width apart and one hand placed slightly wider than the other.
2. Engage your core and lower your body towards the ground by bending your elbows, keeping your back straight.
3. As you lower yourself, shift your weight to one side and lift the opposite arm off the ground, extending it straight out to the side.
4. Push through your chest and triceps to raise your body back up to the starting position, while simultaneously lowering your extended arm back to the ground.
5. Repeat the movement, alternating the arm you extend with each repetition.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0725.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Single Leg Bridge With Outstretched Leg', 'Legs', '1. Lie on your back with your knees bent and feet flat on the ground.
2. Extend one leg straight out in front of you.
3. Engage your glutes and lift your hips off the ground, forming a straight line from your knees to your shoulders.
4. Hold for a moment at the top, then slowly lower your hips back down to the starting position.
5. Repeat for the desired number of repetitions, then switch legs.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3645.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Single Leg Calf Raise (on A Dumbbell)', 'Legs', '1. Stand with your feet hip-width apart and hold a dumbbell in one hand.
2. Lift one foot off the ground and balance on the other foot.
3. Slowly raise your heel as high as possible, using your calf muscles.
4. Pause for a moment at the top, then slowly lower your heel back down.
5. Repeat for the desired number of repetitions, then switch to the other leg.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0727.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Single Leg Platform Slide', 'Legs', '1. Start by standing with one foot on a platform or slide board.
2. Bend your knee slightly and slide the foot on the platform backward, extending your leg.
3. Keep your core engaged and maintain a straight posture throughout the movement.
4. Slowly return to the starting position by sliding your foot back to the initial position.
5. Repeat the movement for the desired number of repetitions, then switch legs.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0730.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Single Leg Squat (pistol) Male', 'Legs', '1. Stand with your feet shoulder-width apart and arms extended in front of you.
2. Lift your right foot off the ground and extend it forward.
3. Slowly lower your body down by bending your left knee and pushing your hips back.
4. Keep your chest up and your back straight as you lower yourself down.
5. Lower until your left thigh is parallel to the ground, or as low as you can comfortably go.
6. Pause for a moment at the bottom, then push through your left heel to return to the starting position.
7. Repeat for the desired number of repetitions, then switch legs.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1759.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Sissy Squat', 'Legs', '1. Stand with your feet shoulder-width apart and your toes pointing slightly outward.
2. Hold onto a stable object for balance if needed.
3. Slowly lower your body by bending your knees and leaning back, keeping your torso upright.
4. Continue lowering until your thighs are parallel to the ground or as far as you can comfortably go.
5. Pause for a moment, then push through your heels to return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1489.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Sit-up V. 2', 'Core', '1. Lie flat on your back with your knees bent and feet flat on the ground.
2. Place your hands behind your head with your elbows pointing outwards.
3. Engaging your abs, slowly lift your upper body off the ground, curling forward until your torso is at a 45-degree angle.
4. Pause for a moment at the top, then slowly lower your upper body back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0735.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Sit-up With Arms On Chest', 'Core', '1. Lie flat on your back with your knees bent and feet flat on the ground.
2. Cross your arms over your chest.
3. Engaging your abs, lift your upper body off the ground towards your knees.
4. Pause for a moment at the top, then slowly lower your upper body back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3679.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Skater Hops', 'Cardio', '1. Stand with your feet shoulder-width apart.
2. Bend your knees slightly and jump to the right, landing on your right foot.
3. As you land, swing your left leg behind your right leg and tap the ground with your left toes.
4. Immediately jump to the left, landing on your left foot.
5. As you land, swing your right leg behind your left leg and tap the ground with your right toes.
6. Continue alternating sides, jumping and tapping the ground with each leg.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3361.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Ski Ergometer', 'Arms', '1. Adjust the seat height and footrests to a comfortable position.
2. Grasp the handles with an overhand grip, palms facing down.
3. Sit up straight with your feet flat on the footrests.
4. Extend your arms straight out in front of you, keeping your elbows slightly bent.
5. Engage your triceps and push the handles down towards your thighs.
6. Pause for a moment at the bottom, then slowly return to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2142.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Ski Step', 'Cardio', '1. Stand with your feet shoulder-width apart.
2. Bend your knees slightly and keep your back straight.
3. Jump to the right, landing on your right foot while swinging your left leg behind your right leg.
4. Immediately jump to the left, landing on your left foot while swinging your right leg behind your left leg.
5. Continue alternating jumps from side to side, mimicking a skiing motion.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3671.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Skin The Cat', 'Back', '1. Start by hanging from a bar with your arms fully extended and your body relaxed.
2. Engage your core and lift your legs up, bringing your knees towards your chest.
3. Continue to lift your legs up and over your head, allowing your body to pass through the arms.
4. Once your legs are fully extended over your head, begin to lower them back down towards the starting position.
5. As you lower your legs, allow your body to pass back through the arms until you are hanging with your arms fully extended again.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3304.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Sled 45 Degrees One Leg Press', 'Legs', '1. Adjust the sled machine to a 45-degree angle.
2. Sit on the sled machine with your back against the pad and your feet on the footplate.
3. Place one foot on the footplate and extend your leg, pushing the sled away from you.
4. Slowly bend your knee and lower the sled back to the starting position.
5. Repeat with the other leg.
6. Continue alternating legs for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1425.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Sled 45в° Calf Press', 'Legs', '1. Adjust the sled machine to a 45-degree angle.
2. Place your feet on the sled platform with your toes pointing forward.
3. Push the sled platform away from you by extending your ankles and calves.
4. Pause for a moment at the top, then slowly lower the sled platform back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0738.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Sled 45в° Leg Press', 'Legs', '1. Adjust the seat and footplate of the sled machine to a comfortable position.
2. Sit on the sled machine with your back against the backrest and your feet shoulder-width apart on the footplate.
3. Grip the handles on the sides of the seat for stability.
4. Push the footplate away from your body by extending your legs, keeping your heels on the footplate.
5. Continue pushing until your legs are almost fully extended, but without locking your knees.
6. Pause for a moment at the top of the movement, then slowly lower the footplate back towards your body by bending your knees.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0739.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Sled 45в° Leg Press (back Pov)', 'Legs', '1. Adjust the seat of the sled machine so that your knees are at a 45-degree angle.
2. Sit on the sled machine with your back against the backrest and your feet shoulder-width apart on the footplate.
3. Grip the handles on the sides of the seat for stability.
4. Push the footplate away from your body by extending your legs, keeping your heels on the footplate.
5. Pause for a moment at the fully extended position.
6. Slowly bend your knees and lower the footplate back towards your body, controlling the movement.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1464.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Sled 45° Leg Press (side Pov)', 'Legs', '1. Adjust the seat of the sled machine so that your knees are at a 90-degree angle when your feet are on the footplate.
2. Sit on the sled machine with your back flat against the backrest and your feet shoulder-width apart on the footplate.
3. Grip the handles on the sides of the seat for stability.
4. Push against the footplate to extend your legs, straightening them completely.
5. Pause for a moment at the top, then slowly bend your knees to lower the footplate back to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1463.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Sled 45в° Leg Wide Press', 'Legs', '1. Adjust the sled machine to a 45-degree angle.
2. Sit on the sled machine with your back against the pad and your feet on the foot platform.
3. Position your feet wider than shoulder-width apart.
4. Push against the foot platform to extend your legs and straighten your knees.
5. Pause for a moment at the end of the movement, then slowly bend your knees to return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0740.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Sled Calf Press On Leg Press', 'Legs', '1. Adjust the seat of the leg press machine so that your knees are slightly bent when your feet are on the sled.
2. Place your feet shoulder-width apart on the sled, with your toes pointing forward.
3. Release the safety handles and push the sled away from you by extending your knees and ankles.
4. Pause for a moment at the top of the movement, then slowly lower the sled back down by bending your knees and ankles.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1391.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Sled Closer Hack Squat', 'Legs', '1. Adjust the sled machine to a comfortable weight and position yourself with your back against the pad.
2. Place your feet shoulder-width apart on the platform, toes slightly pointed outwards.
3. Grip the handles on the sides of the machine for stability.
4. Engage your core and slowly lower your body by bending your knees and hips, keeping your back straight.
5. Continue lowering until your thighs are parallel to the ground or slightly below.
6. Pause for a moment at the bottom, then push through your heels to extend your legs and return to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0741.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Sled Forward Angled Calf Raise', 'Legs', '1. Adjust the sled machine to a comfortable weight and position yourself on the machine with your toes on the platform and your heels hanging off.
2. Place your hands on the handles or the sides of the machine for support.
3. Engage your calves and slowly raise your heels as high as possible, pushing against the resistance of the sled.
4. Pause for a moment at the top of the movement, then slowly lower your heels back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0742.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Sled Hack Squat', 'Legs', '1. Adjust the sled machine to a comfortable position for your height.
2. Stand with your feet shoulder-width apart on the platform, toes slightly pointed outwards.
3. Hold onto the handles or bars for stability.
4. Lower your body by bending your knees and hips, keeping your back straight and chest up.
5. Continue lowering until your thighs are parallel to the ground or slightly below.
6. Pause for a moment, then push through your heels to raise your body back up to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0743.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Sled Lying Calf Press', 'Legs', '1. Adjust the sled machine to a comfortable weight.
2. Sit on the sled machine with your back against the pad and your feet on the platform.
3. Place your toes and the balls of your feet on the edge of the platform, with your heels hanging off.
4. Push the platform away from you by extending your ankles, keeping your knees slightly bent.
5. Continue pushing until your calves are fully contracted.
6. Hold the contraction for a moment, then slowly lower the platform back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2334.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Sled Lying Squat', 'Legs', '1. Adjust the sled machine to a comfortable weight.
2. Lie on your back on the sled machine with your feet on the footplate.
3. Position your feet shoulder-width apart and slightly angled outwards.
4. Grip the handles of the sled machine for stability.
5. Engage your glutes and core muscles.
6. Push through your heels and extend your legs to lift the sled.
7. Lower the sled back down by bending your knees and hips.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0744.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Sled One Leg Calf Press On Leg Press', 'Legs', '1. Adjust the seat of the leg press machine so that your knees are slightly bent when your feet are on the sled.
2. Sit on the machine with your back against the backrest and your feet on the sled, shoulder-width apart.
3. Place your toes and the balls of your feet on the sled, keeping your heels off.
4. Push the sled forward by extending your ankles, keeping your knees slightly bent.
5. Pause for a moment at the top, then slowly lower the sled back down by flexing your ankles.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1392.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Sledge Hammer', 'Core', '1. Stand with your feet shoulder-width apart and hold the sledge hammer with both hands.
2. Engage your core and keep your back straight.
3. Swing the sledge hammer down towards the ground, using your core and upper body strength.
4. As you swing down, pivot your hips and transfer the force to the hammer.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1496.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Back Shrug', 'Back', '1. Stand with your feet shoulder-width apart and your knees slightly bent.
2. Grasp the barbell with an overhand grip, hands slightly wider than shoulder-width apart.
3. Keep your arms straight and allow the barbell to hang in front of your thighs.
4. Lift your shoulders straight up towards your ears, squeezing your traps at the top.
5. Hold for a moment, then lower your shoulders back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0746.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Behind Neck Press', 'Shoulders', '1. Adjust the seat height of the smith machine so that the bar is at shoulder level.
2. Stand with your feet shoulder-width apart and your knees slightly bent.
3. Grasp the bar with an overhand grip, slightly wider than shoulder-width apart.
4. Lift the bar off the rack and step back, maintaining a stable stance.
5. Lower the bar down to the back of your neck, keeping your elbows pointing forward.
6. Press the bar up overhead until your arms are fully extended.
7. Pause for a moment at the top, then slowly lower the bar back down to the starting position.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0747.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Bench Press', 'Chest', '1. Adjust the height of the smith machine bar to chest level.
2. Lie flat on the bench with your feet firmly planted on the ground.
3. Grip the bar with an overhand grip slightly wider than shoulder-width apart.
4. Unrack the bar and lower it towards your chest, keeping your elbows tucked in.
5. Pause for a moment when the bar touches your chest.
6. Push the bar back up to the starting position, fully extending your arms.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0748.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Bent Knee Good Morning', 'Legs', '1. Start by standing with your feet shoulder-width apart, toes pointing forward.
2. Place the barbell across your upper back, resting it on your traps.
3. Bend your knees slightly and hinge forward at the hips, keeping your back straight.
4. Lower your torso until it is parallel to the ground, feeling a stretch in your hamstrings.
5. Engage your glutes and hamstrings to raise your torso back up to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0749.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Bent Over Row', 'Back', '1. Set up the smith machine with the bar at hip height.
2. Stand facing the bar with your feet shoulder-width apart.
3. Bend your knees slightly and hinge forward at the hips, keeping your back straight.
4. Grasp the bar with an overhand grip, hands slightly wider than shoulder-width apart.
5. Pull the bar towards your lower chest, squeezing your shoulder blades together.
6. Pause for a moment at the top, then slowly lower the bar back down to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1359.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Chair Squat', 'Legs', '1. Adjust the height of the smith machine bar to a comfortable position.
2. Stand with your feet shoulder-width apart, toes slightly turned out.
3. Place the barbell across your upper back, resting it on your traps.
4. Engage your core and keep your chest up as you slowly lower your body by bending your knees and hips.
5. Continue lowering until your thighs are parallel to the ground, or as low as you can comfortably go.
6. Pause for a moment, then push through your heels to return to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0750.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Close-grip Bench Press', 'Arms', '1. Adjust the seat height and position yourself on the bench with your feet flat on the ground.
2. Grasp the barbell with a close grip, slightly narrower than shoulder-width apart.
3. Lower the barbell towards your chest, keeping your elbows close to your body.
4. Pause for a moment at the bottom, then push the barbell back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0751.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Deadlift', 'Legs', '1. Set up the smith machine with the bar at hip height.
2. Stand with your feet shoulder-width apart, toes pointing slightly outward.
3. Bend at the hips and knees, keeping your back straight and chest up, and grip the bar with an overhand grip slightly wider than shoulder-width apart.
4. Engage your core and lift the bar by extending your hips and knees, keeping the bar close to your body.
5. Stand up straight, fully extending your hips and knees.
6. Lower the bar back down by bending at the hips and knees, maintaining control and keeping your back straight.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0752.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Decline Bench Press', 'Chest', '1. Adjust the decline bench to the desired angle.
2. Lie down on the bench with your feet secured under the foot pads.
3. Grasp the barbell with an overhand grip slightly wider than shoulder-width apart.
4. Unrack the barbell and lower it slowly towards your chest, keeping your elbows tucked in.
5. Pause for a moment at the bottom, then push the barbell back up to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0753.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Decline Reverse-grip Press', 'Chest', '1. Adjust the smith machine to a decline position.
2. Lie down on the bench with your feet secured under the foot pads.
3. Grasp the barbell with a reverse grip, hands slightly wider than shoulder-width apart.
4. Unrack the barbell and lower it towards your chest, keeping your elbows tucked in.
5. Pause for a moment at the bottom, then push the barbell back up to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0754.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Front Squat (clean Grip)', 'Legs', '1. Set up the smith machine with the barbell at shoulder height.
2. Stand facing the barbell with your feet shoulder-width apart.
3. Grasp the barbell with an overhand grip, slightly wider than shoulder-width apart.
4. Step back and position the barbell on your front shoulders, resting it on your collarbone and deltoids.
5. Keep your chest up, back straight, and core engaged.
6. Lower your body by bending at the knees and hips, as if sitting back into a chair.
7. Continue lowering until your thighs are parallel to the ground or slightly below.
8. Pause for a moment, then push through your heels to return to the starting position.
9. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1433.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Full Squat', 'Legs', '1. Set up the smith machine with the barbell at shoulder height.
2. Stand with your feet shoulder-width apart, toes slightly turned out.
3. Step under the bar and position it across your upper back, resting on your traps.
4. Grip the bar with your hands slightly wider than shoulder-width apart.
5. Unrack the bar and take a step back, maintaining a stable stance.
6. Keeping your chest up and core engaged, initiate the squat by pushing your hips back and bending your knees.
7. Lower your body until your thighs are parallel to the ground, or as low as your flexibility allows.
8. Pause for a moment at the bottom, then drive through your heels to return to the starting position.
9. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3281.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Hack Squat', 'Legs', '1. Adjust the barbell on the smith machine to an appropriate height for your body.
2. Stand with your feet shoulder-width apart, toes slightly pointed outwards.
3. Position yourself under the barbell, resting it on your upper traps and shoulders.
4. Grasp the barbell with an overhand grip, slightly wider than shoulder-width apart.
5. Engage your core and keep your chest up as you unrack the barbell.
6. Take a step back and position your feet slightly wider than shoulder-width apart.
7. Bend your knees and lower your body down, keeping your chest up and back straight.
8. Continue descending until your thighs are parallel to the ground or slightly below.
9. Pause for a moment at the bottom, then push through your heels to return to the starting position.
10. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0755.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Hip Raise', 'Core', '1. Position yourself on the smith machine with your back against the pad and your feet shoulder-width apart.
2. Place your hands on the barbell, slightly wider than shoulder-width apart.
3. Engage your core and glutes, then push through your heels to raise your hips off the ground.
4. Continue lifting until your body forms a straight line from your knees to your shoulders.
5. Hold for a moment at the top, then slowly lower your hips back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0756.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Incline Bench Press', 'Chest', '1. Adjust the bench to a 30-45 degree incline.
2. Sit on the bench with your back flat against the pad and feet firmly on the ground.
3. Grasp the barbell with an overhand grip slightly wider than shoulder-width apart.
4. Unrack the barbell and lower it slowly towards your upper chest, keeping your elbows slightly tucked in.
5. Pause for a moment at the bottom, then push the barbell back up to the starting position, fully extending your arms.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0757.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Incline Reverse-grip Press', 'Chest', '1. Adjust the seat of the smith machine to a comfortable incline angle.
2. Sit on the machine with your back against the pad and your feet flat on the ground.
3. Grasp the bar with an overhand grip that is slightly wider than shoulder-width apart.
4. Unrack the bar and lower it slowly towards your chest, keeping your elbows tucked in.
5. Pause for a moment when the bar is just above your chest.
6. Push the bar back up to the starting position, fully extending your arms.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0758.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Incline Shoulder Raises', 'Chest', '1. Adjust the smith machine to an incline position.
2. Stand facing the machine with your feet shoulder-width apart.
3. Grasp the bar with an overhand grip, slightly wider than shoulder-width apart.
4. Keep your back straight and core engaged.
5. Raise the barbell up towards the ceiling, leading with your elbows.
6. Pause for a moment at the top, then slowly lower the barbell back down to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0759.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Leg Press', 'Legs', '1. Adjust the seat and footplate of the smith machine to a comfortable position.
2. Sit on the machine with your back against the backrest and your feet shoulder-width apart on the footplate.
3. Grasp the handles or sides of the machine for stability.
4. Push the footplate away from you by extending your legs, keeping your back against the backrest.
5. Pause for a moment at the fully extended position.
6. Slowly bend your knees and lower the footplate back towards you, returning to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0760.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Low Bar Squat', 'Legs', '1. Set up the smith machine with the barbell at a height that allows you to comfortably rest it on your upper back.
2. Stand with your feet shoulder-width apart, toes slightly turned outwards.
3. Step under the bar and position it across your upper back, resting it on your traps.
4. Grip the bar with your hands slightly wider than shoulder-width apart.
5. Unrack the bar by straightening your legs and stepping back from the rack.
6. Take a deep breath and brace your core.
7. Initiate the squat by pushing your hips back and bending your knees.
8. Lower your body until your thighs are parallel to the ground or slightly below.
9. Keep your chest up and your back straight throughout the movement.
10. Drive through your heels to stand back up, extending your hips and knees.
11. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1434.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Machine Bicep Curl', 'Arms', '1. Adjust the height of the smith machine bar to be at waist level.
2. Stand facing the smith machine with your feet shoulder-width apart.
3. Grasp the bar with an underhand grip, hands slightly wider than shoulder-width apart.
4. Keep your elbows close to your sides and your upper arms stationary.
5. Exhale and curl the bar up towards your shoulders, contracting your biceps.
6. Pause for a moment at the top of the movement, squeezing your biceps.
7. Inhale and slowly lower the bar back down to the starting position.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1683.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Machine Decline Close Grip Bench Press', 'Arms', '1. Adjust the bench on the smith machine to a decline position.
2. Lie down on the bench with your feet firmly planted on the ground.
3. Grasp the barbell with a close grip, slightly narrower than shoulder-width apart.
4. Unrack the barbell and lower it slowly towards your chest, keeping your elbows close to your body.
5. Pause for a moment when the barbell is just above your chest.
6. Push the barbell back up to the starting position, fully extending your arms.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1625.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Machine Incline Tricep Extension', 'Arms', '1. Adjust the seat of the smith machine so that the bar is at shoulder height.
2. Sit on the bench with your back against the pad and your feet flat on the ground.
3. Grasp the bar with an overhand grip, slightly wider than shoulder-width apart.
4. Extend your arms fully, lifting the bar off the rack and holding it directly above your chest.
5. Lower the bar slowly towards your forehead, keeping your elbows close to your head.
6. Pause for a moment at the bottom, then push the bar back up to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1752.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Machine Reverse Decline Close Grip Bench Press', 'Chest', '1. Adjust the smith machine to a decline position.
2. Lie down on the bench with your feet secured under the foot pads.
3. Grasp the barbell with a close grip, slightly narrower than shoulder-width apart.
4. Unrack the barbell and lower it slowly towards your chest, keeping your elbows tucked in.
5. Pause for a moment at the bottom, then push the barbell back up to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1626.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Narrow Row', 'Back', '1. Adjust the seat height and position yourself on the machine with your feet flat on the floor.
2. Grasp the handles with an overhand grip, slightly narrower than shoulder-width apart.
3. Keep your back straight and your chest up as you pull the handles towards your body, squeezing your shoulder blades together.
4. Pause for a moment at the peak of the movement, then slowly release the handles back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0761.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith One Arm Row', 'Back', '1. Adjust the height of the smith machine bar to waist level.
2. Stand facing the smith machine with your feet shoulder-width apart.
3. Bend your knees slightly and hinge forward at the hips, keeping your back straight.
4. Grasp the bar with one hand using an overhand grip, with your palm facing down.
5. Keep your elbow close to your body and pull the bar towards your waist, squeezing your shoulder blades together.
6. Pause for a moment at the top of the movement, then slowly lower the bar back to the starting position.
7. Repeat for the desired number of repetitions, then switch to the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1360.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith One Leg Floor Calf Raise', 'Legs', '1. Position yourself on the floor under the smith machine bar, facing away from the machine.
2. Place the balls of your feet on a raised surface, such as a weight plate or block.
3. Position the smith machine bar across your lower legs, just above your ankles.
4. Hold onto the bar with your hands for stability.
5. Raise your heels off the ground by extending your ankles, lifting your body up.
6. Pause at the top of the movement, then slowly lower your heels back down to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1393.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Rear Delt Row', 'Shoulders', '1. Adjust the seat height and position yourself on the machine with your chest against the pad and your feet flat on the ground.
2. Grasp the handles with an overhand grip, slightly wider than shoulder-width apart.
3. Keep your back straight and your core engaged as you pull the handles towards your chest, squeezing your shoulder blades together.
4. Pause for a moment at the top of the movement, then slowly release the handles back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0762.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Reverse Calf Raises', 'Legs', '1. Adjust the smith machine bar to a height just below your shoulders.
2. Stand facing the bar with your feet hip-width apart and toes pointing forward.
3. Place the balls of your feet on the edge of a step or platform, with your heels hanging off.
4. Hold onto the bar for support, keeping your back straight and core engaged.
5. Raise your heels as high as possible, lifting your body weight onto the balls of your feet.
6. Pause for a moment at the top, then slowly lower your heels back down to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0763.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Reverse Calf Raises', 'Legs', '1. Adjust the smith machine bar to a height just below your shoulders.
2. Stand facing the bar with your feet hip-width apart and toes pointing forward.
3. Place the balls of your feet on the edge of a step or platform, with your heels hanging off.
4. Hold onto the bar for support.
5. Raise your heels as high as possible, lifting your body up onto your toes.
6. Pause for a moment at the top, then slowly lower your heels back down to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1394.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Reverse Grip Bent Over Row', 'Back', '1. Set up the smith machine with the bar at hip height.
2. Stand facing the bar with your feet shoulder-width apart.
3. Bend your knees slightly and hinge forward at the hips, keeping your back straight.
4. Grasp the bar with an underhand grip, hands shoulder-width apart.
5. Pull the bar towards your lower chest, squeezing your shoulder blades together.
6. Pause for a moment at the top, then slowly lower the bar back down to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1361.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Reverse-grip Press', 'Chest', '1. Adjust the height of the smith machine bar to chest level.
2. Stand facing the bar with your feet shoulder-width apart.
3. Grasp the bar with an overhand grip, hands slightly wider than shoulder-width apart.
4. Step back and position yourself with a slight bend in your knees.
5. Keep your chest up and core engaged throughout the exercise.
6. Lower the bar towards your chest, keeping your elbows tucked in.
7. Pause for a moment at the bottom, then push the bar back up to the starting position.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0764.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Seated One Leg Calf Raise', 'Legs', '1. Sit on the machine with your back against the pad and your feet on the footrest.
2. Place one leg on the footrest and keep the other leg off the footrest.
3. Using your calf muscles, raise your heel as high as possible.
4. Pause for a moment at the top, then slowly lower your heel back down to the starting position.
5. Repeat for the desired number of repetitions, then switch legs and repeat.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1395.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Seated Shoulder Press', 'Shoulders', '1. Adjust the seat height so that the handles are at shoulder level.
2. Sit on the machine with your back against the pad and your feet flat on the floor.
3. Grasp the handles with an overhand grip and lift them off the supports, extending your arms fully.
4. Lower the handles down to shoulder level, keeping your elbows slightly bent.
5. Press the handles up overhead until your arms are fully extended.
6. Pause for a moment at the top, then slowly lower the handles back down to shoulder level.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0765.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Seated Wrist Curl', 'Arms', '1. Sit on a bench in front of a Smith machine with your feet flat on the ground.
2. Grasp the barbell with an underhand grip, hands shoulder-width apart.
3. Rest your forearms on your thighs, allowing your wrists to hang off.
4. Slowly curl your wrists upward, bringing the barbell towards your forearms.
5. Pause for a moment at the top, then slowly lower the barbell back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1426.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Shoulder Press', 'Shoulders', '1. Adjust the seat height and position yourself on the smith machine with your feet shoulder-width apart.
2. Grasp the bar with an overhand grip, slightly wider than shoulder-width apart.
3. Lift the bar off the rack and position it at shoulder level, with your elbows bent and palms facing forward.
4. Press the bar upward until your arms are fully extended overhead.
5. Pause for a moment at the top, then slowly lower the bar back down to shoulder level.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0766.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Shrug', 'Back', '1. Stand with your feet shoulder-width apart and your knees slightly bent.
2. Grasp the barbell with an overhand grip, hands slightly wider than shoulder-width apart.
3. Keep your arms straight and your shoulders relaxed.
4. Lift your shoulders up towards your ears, squeezing your traps at the top.
5. Hold for a moment, then slowly lower your shoulders back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0767.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Single Leg Split Squat', 'Legs', '1. Stand in front of the smith machine with your feet shoulder-width apart.
2. Place one foot behind you on a bench or step, with your toes pointing forward.
3. Hold onto the smith machine bar for stability.
4. Bend your front knee and lower your body down into a lunge position, keeping your back straight.
5. Pause for a moment at the bottom, then push through your front heel to return to the starting position.
6. Repeat for the desired number of repetitions, then switch legs.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0768.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Sprint Lunge', 'Legs', '1. Set up the smith machine with the barbell at hip height.
2. Stand facing away from the machine with your feet shoulder-width apart.
3. Step back with your right foot and place it on the barbell, resting the top of your foot on the bar.
4. Bend your left knee and lower your body into a lunge position, keeping your back straight.
5. Push through your left heel to return to the starting position.
6. Repeat on the other side, stepping back with your left foot.
7. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0769.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Squat', 'Legs', '1. Set up the smith machine with the barbell at an appropriate height for your squat.
2. Stand with your feet shoulder-width apart, toes slightly turned out.
3. Position yourself under the barbell, resting it on your upper traps and shoulders.
4. Grip the barbell with a wide grip, slightly wider than shoulder-width apart.
5. Engage your core and unrack the barbell, stepping back to clear the rack.
6. Keeping your chest up and back straight, initiate the squat by bending at the hips and knees.
7. Lower your body until your thighs are parallel to the ground or slightly below.
8. Pause for a moment at the bottom, then drive through your heels to return to the starting position.
9. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0770.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Standing Back Wrist Curl', 'Arms', '1. Stand facing the smith machine with your feet shoulder-width apart.
2. Grasp the barbell with an overhand grip, hands shoulder-width apart.
3. Keep your back straight and your elbows close to your body.
4. Slowly curl your wrists upwards, bringing the barbell towards your body.
5. Pause for a moment at the top, then slowly lower the barbell back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0771.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Standing Behind Head Military Press', 'Shoulders', '1. Adjust the seat height of the smith machine so that the bar is at shoulder level.
2. Stand with your feet shoulder-width apart and your knees slightly bent.
3. Grasp the bar with an overhand grip, slightly wider than shoulder-width apart.
4. Lift the bar off the rack and step back, maintaining a stable stance.
5. Position the bar behind your head, resting on your upper traps.
6. Keep your core engaged and your chest lifted throughout the exercise.
7. Press the bar overhead by extending your arms, fully straightening them.
8. Pause briefly at the top of the movement, then slowly lower the bar back down to the starting position.
9. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0772.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Standing Leg Calf Raise', 'Legs', '1. Adjust the smith machine bar to a height that allows you to stand with your feet flat on the ground and your shoulders under the bar.
2. Position yourself under the bar with your feet shoulder-width apart and your toes pointing forward.
3. Place your hands on the bar for stability.
4. Engage your calves and slowly raise your heels off the ground, lifting your body up onto your toes.
5. Pause for a moment at the top, then slowly lower your heels back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0773.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Standing Military Press', 'Shoulders', '1. Stand with your feet shoulder-width apart and your knees slightly bent.
2. Grasp the barbell with an overhand grip, slightly wider than shoulder-width apart.
3. Lift the barbell off the rack and bring it down to shoulder level, with your palms facing forward.
4. Press the barbell upward until your arms are fully extended overhead.
5. Pause for a moment at the top, then slowly lower the barbell back down to shoulder level.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0774.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Sumo Squat', 'Legs', '1. Set up the smith machine with the barbell at hip height.
2. Stand with your feet wider than shoulder-width apart, toes pointing outwards.
3. Position yourself under the barbell, resting it on your upper back and shoulders.
4. Engage your core and keep your chest up as you lower your body down into a squat position, pushing your hips back and bending your knees.
5. Lower yourself until your thighs are parallel to the ground, or as low as you can comfortably go.
6. Pause for a moment at the bottom, then push through your heels to return to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3142.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Toe Raise', 'Legs', '1. Adjust the smith machine bar to a height that allows you to comfortably stand with your feet flat on the ground.
2. Position yourself under the bar with your shoulders directly below it and your feet shoulder-width apart.
3. Place the balls of your feet on a raised platform or weight plates, with your heels hanging off the edge.
4. Grasp the bar with an overhand grip, slightly wider than shoulder-width apart.
5. Engage your core and keep your back straight throughout the exercise.
6. Slowly raise your heels as high as possible, lifting your body weight onto the balls of your feet.
7. Pause for a moment at the top, then slowly lower your heels back down to the starting position.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1396.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Upright Row', 'Shoulders', '1. Stand with your feet shoulder-width apart, facing the smith machine.
2. Grasp the barbell with an overhand grip, hands slightly wider than shoulder-width apart.
3. Keep your back straight and your core engaged.
4. Pull the barbell up towards your chin, leading with your elbows.
5. Pause for a moment at the top, then slowly lower the barbell back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0775.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Wide Grip Bench Press', 'Chest', '1. Adjust the bench to a comfortable position on the smith machine.
2. Lie down on the bench with your feet flat on the ground.
3. Grasp the barbell with a wide grip, slightly wider than shoulder-width apart.
4. Unrack the barbell and lower it slowly towards your chest, keeping your elbows out to the sides.
5. Pause for a moment when the barbell touches your chest.
6. Push the barbell back up to the starting position, fully extending your arms.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1308.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Smith Wide Grip Decline Bench Press', 'Chest', '1. Adjust the decline bench to the desired angle.
2. Lie down on the bench with your feet secured under the foot pads.
3. Grasp the barbell with a wide grip, slightly wider than shoulder-width apart.
4. Unrack the barbell and lower it slowly towards your chest, keeping your elbows pointed outwards.
5. Pause for a moment when the barbell touches your chest.
6. Push the barbell back up to the starting position, fully extending your arms.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1309.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Snatch Pull', 'Legs', '1. Stand with your feet shoulder-width apart and the barbell on the ground in front of you.
2. Bend your knees and hinge at the hips to lower into a squat position, gripping the barbell with an overhand grip.
3. Keep your back straight and chest up as you drive through your heels to lift the barbell off the ground, extending your hips and knees.
4. As the barbell reaches hip level, explosively pull it upwards, shrugging your shoulders and pulling your elbows high and to the sides.
5. As the barbell reaches its highest point, quickly drop underneath it, pulling yourself into a deep squat position.
6. Catch the barbell overhead with your arms fully extended and your knees bent.
7. Stand up by extending your hips and knees, keeping the barbell overhead.
8. Lower the barbell back down to the starting position by reversing the movement.
9. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0776.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Spell Caster', 'Core', '1. Stand with your feet shoulder-width apart and hold a dumbbell in one hand.
2. Bend your knees slightly and hinge forward at the waist, keeping your back straight.
3. Extend your arm with the dumbbell towards the opposite foot, rotating your torso as you do so.
4. Return to the starting position and repeat on the other side.
5. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0777.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Sphinx', 'Back', '1. Lie face down on the ground with your forearms flat on the floor, elbows directly under your shoulders.
2. Engage your core and lift your chest off the ground, keeping your forearms and toes on the floor.
3. Hold this position for a few seconds, making sure to keep your neck in a neutral position.
4. Slowly lower your chest back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1362.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Spider Crawl Push Up', 'Legs', '1. Start in a push-up position with your hands slightly wider than shoulder-width apart and your feet together.
2. Bring your right knee towards your right elbow, keeping it off the ground.
3. As you bring your right knee back, simultaneously lower your body towards the ground by bending your elbows.
4. Push back up to the starting position and repeat with your left knee towards your left elbow.
5. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0778.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Spine Stretch', 'Back', '1. Sit on the ground with your legs extended in front of you.
2. Place your hands on the ground behind you, fingers pointing towards your body.
3. Engage your core and slowly lean back, keeping your back straight.
4. Continue leaning back until you feel a stretch in your spine.
5. Hold the stretch for a few seconds, then slowly return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1363.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Spine Twist', 'Core', '1. Sit on the ground with your legs extended in front of you.
2. Bend your knees and place your feet flat on the ground, hip-width apart.
3. Place your hands behind your head with your elbows pointing outwards.
4. Engage your abs and slowly twist your torso to the right, bringing your right elbow towards your left knee.
5. Pause for a moment at the end of the twist, then slowly return to the starting position.
6. Repeat the twist to the left side, bringing your left elbow towards your right knee.
7. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2329.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Split Squats', 'Legs', '1. Stand with your feet shoulder-width apart.
2. Take a step forward with one foot and place it about two feet in front of the other foot.
3. Lower your body by bending your knees and hips, keeping your back straight.
4. Continue lowering until your front thigh is parallel to the ground, and your back knee is hovering just above the ground.
5. Pause for a moment, then push through your front heel to return to the starting position.
6. Repeat for the desired number of repetitions, then switch legs and repeat.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2368.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Squat Jerk', 'Legs', '1. Start with the barbell resting on your shoulders, with your feet shoulder-width apart.
2. Lower your body into a squat position, keeping your chest up and your knees tracking over your toes.
3. As you reach the bottom of the squat, explosively drive through your legs and push the barbell overhead.
4. As the barbell reaches its peak, quickly drop into a split position, with one foot forward and one foot back.
5. Catch the barbell overhead with your arms fully extended and your back knee slightly touching the ground.
6. Stand up from the split position, bringing your feet back together.
7. Lower the barbell back to your shoulders and repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0786.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Squat On Bosu Ball', 'Legs', '1. Place the bosu ball on the ground with the flat side up.
2. Stand with your feet shoulder-width apart and position yourself on top of the bosu ball.
3. Lower your body down by bending your knees and hips, as if sitting back into a chair.
4. Keep your chest up and your weight on your heels.
5. Lower yourself until your thighs are parallel to the ground.
6. Pause for a moment, then push through your heels to return to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1705.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Squat To Overhead Reach', 'Legs', '1. Stand with your feet shoulder-width apart and toes slightly turned out.
2. Lower your body down into a squat position by bending your knees and pushing your hips back.
3. As you come up from the squat, extend your arms overhead, reaching towards the ceiling.
4. Return to the starting position by lowering your arms and bending your knees to squat down again.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1685.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Squat To Overhead Reach With Twist', 'Legs', '1. Stand with your feet shoulder-width apart and toes slightly turned out.
2. Lower your body into a squat position by bending your knees and pushing your hips back.
3. As you come up from the squat, raise your arms overhead and twist your torso to one side.
4. Return to the starting position and repeat the squat, this time twisting your torso to the opposite side.
5. Continue alternating sides with each squat repetition.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1686.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Stability Ball Crunch (full Range Hands Behind Head)', 'Core', '1. Sit on the stability ball with your feet flat on the ground and your knees bent at a 90-degree angle.
2. Place your hands behind your head with your elbows pointing outwards.
3. Engaging your abs, slowly curl your upper body forward, bringing your chest towards your knees.
4. Pause for a moment at the top, then slowly lower your upper body back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2297.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Stalder Press', 'Arms', '1. Start by standing with your feet shoulder-width apart and your arms extended overhead.
2. Bend your knees slightly and engage your core.
3. Lower your body down into a squat position while keeping your arms extended overhead.
4. As you squat down, press your arms down towards the ground, engaging your triceps.
5. Pause for a moment at the bottom of the squat, then push through your heels to stand back up while simultaneously raising your arms back overhead.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3291.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Standing Archer', 'Back', '1. Stand with your feet shoulder-width apart and your knees slightly bent.
2. Extend your arms straight out in front of you at shoulder height, parallel to the ground.
3. Rotate your torso to the right, keeping your arms extended and your back straight.
4. As you rotate, extend your right arm forward and your left arm back, mimicking the motion of drawing a bowstring.
5. Hold the position for a moment, then return to the starting position.
6. Repeat the motion, this time rotating your torso to the left and extending your left arm forward and your right arm back.
7. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3669.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Standing Behind Neck Press', 'Shoulders', '1. Stand with your feet shoulder-width apart and hold the barbell behind your neck with an overhand grip.
2. Keep your back straight and core engaged.
3. Press the barbell overhead by extending your arms, fully extending your elbows.
4. Pause for a moment at the top, then slowly lower the barbell back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0788.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Standing Calf Raise (on A Staircase)', 'Legs', '1. Stand on the edge of a step or a sturdy platform with your heels hanging off and your toes on the step.
2. Hold onto a railing or wall for balance if needed.
3. Slowly raise your heels as high as possible, lifting your body weight onto the balls of your feet.
4. Pause for a moment at the top, then slowly lower your heels back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1490.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Standing Calves', 'Legs', '1. Stand with your feet shoulder-width apart, toes pointing forward.
2. Raise your heels off the ground as high as possible, standing on your toes.
3. Hold the position for a moment, then slowly lower your heels back down to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1397.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Standing Calves Calf Stretch', 'Legs', '1. Stand facing a wall or sturdy object, about an arm''s length away.
2. Place your hands on the wall or object at shoulder height.
3. Step back with one foot, keeping your heel flat on the ground.
4. Bend your front knee slightly and lean forward, keeping your back leg straight.
5. You should feel a stretch in your calf muscle.
6. Hold the stretch for 20-30 seconds.
7. Repeat on the other leg.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1398.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Standing Hamstring And Calf Stretch With Strap', 'Legs', '1. Stand upright with your feet shoulder-width apart.
2. Hold the strap with both hands and place it around the ball of your foot.
3. Keep your leg straight and slowly lean forward from your hips, keeping your back straight.
4. Feel the stretch in your hamstring and calf muscles.
5. Hold the stretch for 20-30 seconds.
6. Release the stretch and repeat with the other leg.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1599.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Standing Lateral Stretch', 'Back', '1. Stand with your feet shoulder-width apart and your knees slightly bent.
2. Extend your arms straight out to the sides, parallel to the ground.
3. Slowly lean your upper body to one side, feeling a stretch in your side and lats.
4. Hold the stretch for 15-30 seconds.
5. Return to the starting position and repeat on the other side.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0794.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Standing Pelvic Tilt', 'Back', '1. Stand with your feet shoulder-width apart and your knees slightly bent.
2. Place your hands on your hips or let them hang by your sides.
3. Engage your core muscles and tilt your pelvis forward, pushing your lower back towards the wall behind you.
4. Hold the position for a few seconds, then release and return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1364.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Standing Single Leg Curl', 'Legs', '1. Stand with your feet hip-width apart and your hands on your hips.
2. Shift your weight onto your left leg and lift your right foot off the ground, bending your knee.
3. Slowly curl your right heel towards your glutes, squeezing your hamstring.
4. Pause for a moment at the top, then slowly lower your right foot back down to the starting position.
5. Repeat for the desired number of repetitions, then switch legs.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0795.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Standing Wheel Rollerout', 'Core', '1. Start by standing tall with your feet shoulder-width apart and the wheel roller in front of you.
2. Bend at your waist and slowly roll the wheel forward, keeping your back straight and your core engaged.
3. Continue rolling forward until you feel a stretch in your abs and your body is extended as far as possible.
4. Pause for a moment, then slowly roll the wheel back towards your body, returning to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0796.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Star Jump (male)', 'Cardio', '1. Stand with your feet shoulder-width apart and your arms by your sides.
2. Bend your knees slightly and jump up explosively.
3. As you jump, spread your legs and extend your arms out to the sides, forming a star shape with your body.
4. Land softly on the balls of your feet with your knees slightly bent.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3223.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Stationary Bike Run V. 3', 'Cardio', '1. Adjust the seat height and position to ensure proper alignment.
2. Place your feet on the pedals and secure them with the straps if available.
3. Start pedaling at a comfortable pace.
4. Maintain a steady rhythm and increase the resistance as desired.
5. Engage your core muscles to maintain stability and proper posture.
6. Continue pedaling for the desired duration of your workout.
7. Gradually decrease the resistance and slow down before coming to a complete stop.
8. Stretch your legs and cool down after the workout.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2138.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Stationary Bike Walk', 'Cardio', '1. Adjust the seat height and position on the stationary bike to ensure proper alignment.
2. Place your feet on the pedals and secure them with the straps if available.
3. Start pedaling at a comfortable pace, keeping your back straight and core engaged.
4. Maintain a steady rhythm and increase the resistance level if desired.
5. Continue pedaling for the desired duration of your cardio workout.
6. Cool down by gradually reducing your pace and resistance level.
7. Stretch your leg muscles after the workout to prevent tightness and promote recovery.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0798.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Straddle Maltese', 'Core', '1. Start by hanging from a pair of rings with your arms fully extended and your body in a straight line.
2. Spread your legs wide apart, forming a straddle position.
3. Engage your core and slowly lower your body until your arms are parallel to the ground.
4. Hold this position for a few seconds, then push yourself back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3314.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Straddle Planche', 'Core', '1. Start in a push-up position with your hands shoulder-width apart and your feet spread wide apart.
2. Engage your core and slowly shift your weight forward, bringing your shoulders over your hands.
3. Bend your elbows and lower your body towards the ground, keeping your elbows close to your sides.
4. Pause for a moment at the bottom, then push through your hands to straighten your arms and lift your body back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3298.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Straight Leg Outer Hip Abductor', 'Legs', '1. Lie on your side with your legs straight and stacked on top of each other.
2. Place your bottom arm under your head for support.
3. Engage your core and lift your top leg as high as possible without rotating your hips or leaning backward.
4. Pause for a moment at the top, then slowly lower your leg back down to the starting position.
5. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1427.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Superman Push-up', 'Chest', '1. Start in a high plank position with your hands slightly wider than shoulder-width apart and your feet together.
2. Engage your core and lower your body towards the ground, keeping your elbows close to your sides.
3. As you lower your body, simultaneously lift your right arm and left leg off the ground, extending them straight out.
4. Pause for a moment at the top, then lower your arm and leg back down while pushing yourself back up to the starting position.
5. Repeat the movement, this time lifting your left arm and right leg.
6. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0803.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Suspended Abdominal Fallout', 'Core', '1. Attach a suspension trainer to a high anchor point and adjust the straps to waist height.
2. Stand facing away from the anchor point and hold the handles with your arms extended in front of you.
3. Lean forward at the waist, keeping your body straight and your core engaged.
4. Lower your body as far as you can while maintaining control and tension in your abs.
5. Pause for a moment at the bottom, then slowly raise your body back up to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0805.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Suspended Push-up', 'Chest', '1. Find a suspension trainer and adjust it to an appropriate height.
2. Stand facing away from the anchor point and hold the handles with an overhand grip.
3. Walk your feet forward, leaning your body forward until your weight is supported by the suspension trainer.
4. Keep your body straight from head to heels, engage your core, and lower your chest towards the handles.
5. Push through your chest and arms to return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0806.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Suspended Reverse Crunch', 'Core', '1. Hang from a pull-up bar with your arms fully extended and your palms facing away from you.
2. Engage your core and lift your knees up towards your chest, curling your pelvis towards your ribcage.
3. Pause for a moment at the top, then slowly lower your knees back down to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0807.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Suspended Row', 'Back', '1. Set up a suspension trainer at an appropriate height.
2. Stand facing the anchor point with your feet shoulder-width apart.
3. Hold the handles with an overhand grip, palms facing each other.
4. Lean back, keeping your body straight and your heels on the ground.
5. Pull your chest towards the handles, squeezing your shoulder blades together.
6. Pause for a moment at the top, then slowly lower yourself back to the starting position.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0808.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Suspended Split Squat', 'Legs', '1. Stand facing away from a suspension trainer with your feet shoulder-width apart.
2. Extend one leg forward and place the top of your foot in the foot cradle of the suspension trainer.
3. Bend your standing leg and lower your body down into a lunge position, keeping your chest up and your knee in line with your toes.
4. Push through your heel to return to the starting position.
5. Repeat for the desired number of repetitions, then switch legs.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0809.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Swimmer Kicks V. 2 (male)', 'Legs', '1. Lie face down on a mat with your arms extended overhead.
2. Engage your core and lift your chest and legs off the ground simultaneously.
3. Kick your legs up and down in a fluttering motion, as if you were swimming.
4. Continue kicking for the desired number of repetitions.
5. Lower your chest and legs back down to the starting position.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3433.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Swing 360', 'Cardio', '1. Stand with your feet shoulder-width apart and knees slightly bent.
2. Hold your arms straight out in front of you, parallel to the ground.
3. Engage your core and swing your arms in a circular motion, rotating your torso as you do so.
4. Continue the circular motion, swinging your arms and rotating your torso for the desired number of repetitions.
5. Remember to breathe throughout the exercise.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3318.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Three Bench Dip', 'Arms', '1. Sit on a bench with your hands gripping the edge, fingers pointing forward.
2. Slide your butt off the bench, supporting your weight with your hands.
3. Bend your elbows and lower your body until your upper arms are parallel to the ground.
4. Push yourself back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1753.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Tire Flip', 'Legs', '1. Stand with your feet shoulder-width apart, facing the tire.
2. Bend your knees and hinge at the hips, lowering into a squat position.
3. Reach down and grab the bottom edge of the tire with both hands, fingers facing towards you.
4. Engage your glutes and leg muscles, and explosively drive through your legs to lift the tire off the ground.
5. As the tire flips over, use your upper body strength to guide it and maintain control.
6. Once the tire is fully flipped, quickly step back and reset your stance.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2459.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Trap Bar Deadlift', 'Legs', '1. Stand with your feet shoulder-width apart and the trap bar on the ground in front of you.
2. Bend at the hips and knees to lower yourself down and grip the handles of the trap bar with an overhand grip.
3. Keep your back straight and chest up as you begin to lift the trap bar off the ground by extending your hips and knees.
4. As you lift, focus on driving through your heels and squeezing your glutes at the top of the movement.
5. Lower the trap bar back down to the ground by bending at the hips and knees, keeping your back straight throughout the movement.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0811.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Triceps Dip', 'Arms', '1. Sit on the edge of a bench or chair with your hands gripping the edge, fingers pointing forward.
2. Slide your butt off the bench, supporting your weight with your hands.
3. Bend your elbows and lower your body towards the ground, keeping your back close to the bench.
4. Pause for a moment at the bottom, then push yourself back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0814.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Triceps Dip (bench Leg)', 'Arms', '1. Sit on the edge of a bench with your hands gripping the edge, fingers pointing forward.
2. Walk your feet forward, sliding your butt off the bench, and straighten your arms.
3. Bend your elbows and lower your body towards the ground, keeping your back close to the bench.
4. Push through your palms to straighten your arms and return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0812.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Triceps Dip (between Benches)', 'Arms', '1. Sit on a bench with your hands gripping the edge of the bench, fingers pointing forward.
2. Slide your butt off the bench, supporting your weight with your hands.
3. Bend your elbows and lower your body towards the ground, keeping your back close to the bench.
4. Pause for a moment at the bottom, then push yourself back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0813.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Triceps Dips Floor', 'Arms', '1. Sit on the edge of a chair or bench with your hands next to your hips, fingers pointing forward.
2. Slide your butt off the front of the chair with your legs extended in front of you.
3. Straighten your arms, keeping a little bend in your elbows to keep tension on your triceps and off your elbow joints.
4. Slowly bend your elbows to lower your body toward the floor until your elbows are at about a 90-degree angle.
5. Once you reach the bottom of the movement, press down into the chair to straighten your elbows, returning to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0815.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Triceps Press', 'Arms', '1. Stand with your feet shoulder-width apart and your knees slightly bent.
2. Extend your arms straight out in front of you, parallel to the ground.
3. Bend your elbows and lower your body towards the ground, keeping your upper arms close to your sides.
4. Pause for a moment at the bottom, then push yourself back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0816.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Triceps Stretch', 'Arms', '1. Stand or sit upright with your back straight.
2. Extend one arm overhead, bending it at the elbow.
3. Place your opposite hand on the bent elbow and gently pull it towards your head.
4. Hold the stretch for 15-30 seconds, feeling a gentle stretch in your triceps.
5. Release the stretch and repeat on the other arm.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0817.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Tuck Crunch', 'Core', '1. Lie flat on your back with your knees bent and feet flat on the ground.
2. Place your hands behind your head with your elbows pointing outwards.
3. Engaging your abs, lift your shoulder blades off the ground and bring your knees towards your chest, simultaneously curling your upper body towards your knees.
4. Pause for a moment at the top, then slowly lower your shoulder blades and extend your legs back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0871.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Twin Handle Parallel Grip Lat Pulldown', 'Back', '1. Adjust the seat height and position yourself facing the cable machine.
2. Grasp the handles with an overhand grip, hands shoulder-width apart.
3. Sit down and position your thighs under the thigh pads, keeping your feet flat on the floor.
4. Lean back slightly and keep your chest up, maintaining a neutral spine.
5. Pull the handles down towards your upper chest, squeezing your shoulder blades together.
6. Pause for a moment at the bottom of the movement, feeling the contraction in your lats.
7. Slowly release the handles and return to the starting position.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0818.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Twist Hip Lift', 'Legs', '1. Lie on your back with your knees bent and feet flat on the ground.
2. Place your hands by your sides for support.
3. Engage your glutes and lift your hips off the ground, forming a straight line from your knees to your shoulders.
4. While keeping your hips lifted, twist your lower body to the right side, bringing your knees towards the ground.
5. Return to the starting position and repeat the twist to the left side.
6. Continue alternating twists for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1466.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Twisted Leg Raise', 'Core', '1. Lie flat on your back with your legs extended and your arms by your sides.
2. Place your hands under your glutes for support.
3. Engage your abs and lift both legs off the ground, keeping them straight.
4. As you lift your legs, twist your hips to one side, bringing your legs towards your opposite shoulder.
5. Pause for a moment at the top, then slowly lower your legs back down to the starting position.
6. Repeat the movement, this time twisting your hips to the other side.
7. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2802.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Twisted Leg Raise (female)', 'Core', '1. Lie flat on your back with your legs extended and your arms by your sides.
2. Bend your knees and lift your legs off the ground, bringing them towards your chest.
3. As you lift your legs, twist your hips to one side, bringing your knees towards your opposite shoulder.
4. Pause for a moment at the top, then slowly lower your legs back down to the starting position.
5. Repeat the movement, this time twisting your hips to the other side.
6. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2801.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Two Toe Touch (male)', 'Back', '1. Stand with your feet shoulder-width apart and your arms extended out to the sides.
2. Bend forward at the waist, keeping your back straight and your knees slightly bent.
3. Reach down towards your toes with both hands, keeping your legs straight.
4. Pause for a moment at the bottom, then slowly return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3231.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Upper Back Stretch', 'Back', '1. Stand up straight with your feet shoulder-width apart.
2. Extend your arms straight in front of you, parallel to the ground.
3. Interlace your fingers and rotate your palms away from your body.
4. Slowly raise your arms overhead, keeping them straight and parallel to each other.
5. As you raise your arms, squeeze your shoulder blades together.
6. Hold the stretch for 15-30 seconds, then release and repeat.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1365.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Upward Facing Dog', 'Back', '1. Lie face down on the floor with your legs extended behind you.
2. Place your hands on the floor next to your lower ribs, fingers pointing forward.
3. Press your hands firmly into the floor and straighten your arms, lifting your torso and thighs off the ground.
4. Roll your shoulders back and down, opening your chest and lifting your gaze towards the ceiling.
5. Hold this position for a few breaths, then slowly lower your body back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1366.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('V-sit On Floor', 'Core', '1. Sit on the floor with your legs extended in front of you.
2. Lean back slightly and lift your legs off the ground, keeping them straight.
3. Simultaneously, lift your upper body off the ground and reach your arms towards your legs.
4. Hold this position for a few seconds, then slowly lower your upper body and legs back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3420.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Vertical Leg Raise (on Parallel Bars)', 'Core', '1. Hang from the parallel bars with your arms fully extended and your body straight.
2. Engage your core and lift your legs up in front of you, keeping them straight.
3. Continue lifting until your legs are parallel to the ground or slightly higher.
4. Pause for a moment at the top, then slowly lower your legs back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0826.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Walk Elliptical Cross Trainer', 'Cardio', '1. Adjust the resistance level and incline of the elliptical machine to your desired settings.
2. Step onto the pedals of the machine and grip the handles lightly.
3. Begin by pushing down with your feet and pulling the handles towards your body.
4. Continue this motion, alternating between pushing and pulling, to simulate a walking or running motion.
5. Maintain a steady pace and keep your core engaged throughout the exercise.
6. Continue for the desired duration of your cardio workout.
7. Gradually decrease the intensity and speed of the machine before stepping off.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2141.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Walking High Knees Lunge', 'Cardio', '1. Stand with your feet hip-width apart.
2. Lift your right knee up towards your chest as high as you can while balancing on your left leg.
3. Step forward with your right foot and lower your body into a lunge position, bending both knees to a 90-degree angle.
4. Push off with your right foot and bring your left knee up towards your chest.
5. Step forward with your left foot and lower your body into a lunge position.
6. Continue alternating legs and lunging forward, keeping your core engaged and maintaining a steady pace.
7. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3655.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Walking Lunge', 'Legs', '1. Stand with your feet shoulder-width apart.
2. Take a step forward with your right leg, lowering your body into a lunge position.
3. Keep your torso upright and your front knee aligned with your ankle.
4. Push off with your right foot and bring your left foot forward, stepping into a lunge position with your left leg.
5. Continue alternating legs and walking forward, maintaining a controlled and steady pace.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1460.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Walking On Incline Treadmill', 'Cardio', '1. Adjust the incline level on the treadmill to your desired intensity.
2. Stand on the treadmill with your feet shoulder-width apart.
3. Start walking at a comfortable pace, ensuring that you maintain proper form.
4. Engage your core muscles and keep your back straight throughout the exercise.
5. Continue walking on the incline treadmill for the desired duration of your cardio workout.
6. Gradually decrease the incline and speed of the treadmill to cool down before stopping.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3666.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Walking On Stepmill', 'Cardio', '1. Adjust the stepmill machine to a comfortable level.
2. Step onto the machine and place your hands on the handrails for support.
3. Start walking by placing one foot on a step and then the other, alternating between legs.
4. Maintain an upright posture and engage your core muscles.
5. Continue walking for the desired duration or distance.
6. Gradually increase the intensity or speed as you become more comfortable with the exercise.
7. Remember to cool down and stretch after completing the exercise.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2311.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted Bench Dip', 'Arms', '1. Sit on a bench with your hands gripping the edge, fingers pointing forward.
2. Slide your butt off the bench, supporting your weight with your hands.
3. Lower your body by bending your elbows until your upper arms are parallel to the floor.
4. Push yourself back up to the starting position by straightening your arms.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0830.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted Close Grip Chin-up On Dip Cage', 'Back', '1. Stand in front of the dip cage and grab the parallel bars with an underhand grip, hands shoulder-width apart.
2. Hang from the bars with your arms fully extended, feet off the ground, and body straight.
3. Engage your back muscles and pull your body up towards the bars, keeping your elbows close to your sides.
4. Continue pulling until your chin is above the bars, then pause for a moment.
5. Slowly lower your body back down to the starting position, fully extending your arms.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2987.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted Cossack Squats (male)', 'Legs', '1. Stand with your feet wider than shoulder-width apart and toes pointing slightly outward.
2. Hold a weight in front of your chest with both hands.
3. Shift your weight to one side and lower your body by bending the knee of the side you shifted towards, while keeping the other leg straight.
4. Go as low as you can while maintaining balance and keeping your chest up.
5. Push through the heel of the bent leg to return to the starting position.
6. Repeat on the other side, alternating between legs.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3643.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted Crunch', 'Core', '1. Lie flat on your back with your knees bent and feet flat on the ground.
2. Hold a weight plate or dumbbell on your chest.
3. Engage your abs and lift your upper body off the ground, curling forward until your shoulder blades are off the ground.
4. Pause for a moment at the top, then slowly lower your upper body back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0832.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted Decline Sit-up', 'Core', '1. Lie flat on a decline bench with your feet secured under the foot pads.
2. Place your hands behind your head or across your chest.
3. Engage your abs and slowly lift your upper body off the bench, curling forward until your torso is perpendicular to the ground.
4. Pause for a moment at the top, then slowly lower your upper body back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3670.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted Donkey Calf Raise', 'Legs', '1. Stand on a raised platform with your toes on the edge and your heels hanging off.
2. Hold onto a stable object for support.
3. Raise your heels as high as possible by extending your ankles.
4. Pause for a moment at the top, then slowly lower your heels back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0833.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted Drop Push Up', 'Chest', '1. Start in a high plank position with your hands slightly wider than shoulder-width apart and your feet together.
2. Lower your chest towards the ground, keeping your elbows close to your body.
3. Once your chest is just above the ground, explosively push yourself up, lifting your hands off the ground.
4. As you push up, quickly move your hands out to the sides and slightly forward, allowing your body to drop down towards the ground.
5. Catch yourself with your hands in the wider position and immediately lower your chest towards the ground again.
6. Repeat the push-up motion, dropping down and catching yourself with your hands in the narrower position.
7. Continue alternating between the wider and narrower hand positions for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1310.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted Front Plank', 'Core', '1. Start by lying face down on the floor.
2. Place your forearms on the ground, with your elbows directly under your shoulders.
3. Extend your legs straight out behind you, with your toes on the ground.
4. Engage your core and lift your body off the ground, balancing on your forearms and toes.
5. Keep your body in a straight line from your head to your heels.
6. Hold this position for the desired amount of time.
7. Lower your body back down to the starting position.
8. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2135.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted Front Raise', 'Shoulders', '1. Stand with your feet shoulder-width apart, holding a dumbbell in each hand with your palms facing your thighs.
2. Keeping your arms straight, exhale and lift the dumbbells in front of you until they are at shoulder level.
3. Pause for a moment at the top, then inhale and slowly lower the dumbbells back down to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0834.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted Hanging Leg-hip Raise', 'Core', '1. Hang from a pull-up bar with your arms fully extended and your palms facing away from you.
2. Engage your core and lift your legs up in front of you, keeping them straight.
3. Continue lifting until your legs are parallel to the ground or slightly higher.
4. Pause for a moment at the top, then slowly lower your legs back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0866.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted Hyperextension (on Stability Ball)', 'Back', '1. Position yourself face down on a stability ball with your hips resting on the ball and your feet against a wall for stability.
2. Place your hands behind your head or cross them over your chest.
3. Engage your core and slowly lift your upper body off the ball, extending your back until your body forms a straight line.
4. Pause for a moment at the top, then slowly lower your upper body back down to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0835.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted Kneeling Step With Swing', 'Shoulders', '1. Start in a kneeling position with your knees hip-width apart and your back straight.
2. Hold a weight in each hand, with your arms extended straight down in front of you.
3. Engage your core and swing the weights up and overhead, keeping your arms straight.
4. Lower the weights back down to the starting position and repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3641.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted Lunge With Swing', 'Legs', '1. Stand with your feet shoulder-width apart, holding a weight in each hand.
2. Take a step forward with your right foot, lowering your body into a lunge position.
3. As you lunge forward, swing the weights forward and upward, keeping your arms straight.
4. Push off with your right foot and return to the starting position, swinging the weights back down.
5. Repeat with your left foot and continue alternating legs for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3644.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted Muscle Up', 'Back', '1. Start by hanging from a pull-up bar with your palms facing away from you and your hands slightly wider than shoulder-width apart.
2. Engage your core and pull your body up towards the bar, leading with your chest.
3. As you reach the top of the movement, transition your grip so that your palms are facing towards you.
4. Continue pulling yourself up until your chest reaches the bar, then pause for a moment.
5. Slowly lower yourself back down to the starting position, maintaining control throughout the movement.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3286.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted Muscle Up (on Bar)', 'Back', '1. Start by hanging from a pull-up bar with your palms facing away from you and your hands slightly wider than shoulder-width apart.
2. Engage your core and pull your shoulder blades down and back.
3. Bend your elbows and pull your chest towards the bar, keeping your body straight.
4. Once your chest reaches the bar, push down with your hands and drive your elbows back, lifting your body above the bar.
5. Pause at the top of the movement, then slowly lower yourself back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3312.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted One Hand Pull Up', 'Back', '1. Grab the pull-up bar with an overhand grip, slightly wider than shoulder-width apart.
2. Hang from the bar with your arm fully extended and your body straight.
3. Engage your core and pull your body up towards the bar by bending your elbow and squeezing your back muscles.
4. Continue pulling until your chin is above the bar.
5. Lower your body back down to the starting position with control.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3290.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted Overhead Crunch (on Stability Ball)', 'Core', '1. Sit on a stability ball with your feet flat on the ground and your knees bent at a 90-degree angle.
2. Hold a weight plate or dumbbell with both hands and extend your arms overhead.
3. Engage your abs and slowly curl your torso forward, bringing your chest towards your knees.
4. Pause for a moment at the top, then slowly lower your torso back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0840.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted Pull-up', 'Back', '1. Grab the pull-up bar with an overhand grip, slightly wider than shoulder-width apart.
2. Hang from the bar with your arms fully extended and your body straight.
3. Engage your back muscles and pull your body up towards the bar, keeping your elbows close to your body.
4. Continue pulling until your chin is above the bar.
5. Pause for a moment at the top, then slowly lower your body back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0841.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted Round Arm', 'Shoulders', '1. Stand with your feet shoulder-width apart and hold a dumbbell in each hand.
2. Bend your knees slightly and hinge forward at the hips, keeping your back straight.
3. Raise your arms out to the sides, keeping a slight bend in your elbows.
4. Continue lifting your arms until they are parallel to the ground.
5. Pause for a moment at the top, then slowly lower your arms back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0844.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted Russian Twist', 'Core', '1. Sit on the ground with your knees bent and your feet flat on the floor.
2. Hold a weight or medicine ball with both hands in front of your chest.
3. Lean back slightly, keeping your back straight and your core engaged.
4. Slowly twist your torso to the right, bringing the weight or medicine ball towards the floor on your right side.
5. Pause for a moment, then twist your torso to the left, bringing the weight or medicine ball towards the floor on your left side.
6. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0846.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted Russian Twist (legs Up)', 'Core', '1. Sit on the ground with your knees bent and feet lifted off the ground, keeping your legs together.
2. Hold the weight with both hands in front of your chest, keeping your elbows slightly bent.
3. Lean back slightly to engage your core muscles.
4. Twist your torso to the right, bringing the weight towards the ground on your right side.
5. Pause for a moment, then twist your torso to the left, bringing the weight towards the ground on your left side.
6. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0845.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted Russian Twist V. 2', 'Core', '1. Sit on the ground with your knees bent and feet flat on the floor.
2. Hold the weight with both hands in front of your chest.
3. Lean back slightly to engage your core muscles.
4. Twist your torso to the right, bringing the weight towards the right side of your body.
5. Pause for a moment, then twist your torso to the left, bringing the weight towards the left side of your body.
6. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2371.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted Seated Bicep Curl (on Stability Ball)', 'Arms', '1. Sit on a stability ball with your feet flat on the ground and your back straight.
2. Hold a medicine ball with an underhand grip, palms facing up, and let your arms hang down by your sides.
3. Keeping your upper arms stationary, exhale and curl the medicine ball up towards your shoulders.
4. Pause for a moment at the top, squeezing your biceps.
5. Inhale and slowly lower the medicine ball back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0847.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted Seated Twist (on Stability Ball)', 'Core', '1. Sit on a stability ball with your feet flat on the ground and your knees bent at a 90-degree angle.
2. Hold a weight plate or dumbbell with both hands close to your chest.
3. Engage your core and slowly rotate your torso to one side, keeping your hips stable.
4. Pause for a moment at the end of the rotation, then slowly return to the starting position.
5. Repeat the rotation to the other side.
6. Continue alternating sides for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0849.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted Side Bend (on Stability Ball)', 'Core', '1. Sit on a stability ball with your feet shoulder-width apart and flat on the ground.
2. Hold a weight in one hand and place your other hand on your hip.
3. Engage your core and slowly bend sideways towards the weighted side, keeping your back straight.
4. Pause for a moment at the bottom, then slowly return to the starting position.
5. Repeat for the desired number of repetitions, then switch sides.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0850.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted Sissy Squat', 'Legs', '1. Stand with your feet shoulder-width apart and your toes pointing slightly outward.
2. Hold a weight in front of your chest with both hands, or place a barbell across your upper back.
3. Keeping your chest up and your core engaged, slowly lower your body down by bending at the knees and hips.
4. Continue lowering until your thighs are parallel to the ground or as low as you can comfortably go.
5. Pause for a moment at the bottom, then push through your heels to return to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0851.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted Squat', 'Legs', '1. Stand with your feet shoulder-width apart, toes pointing slightly outward.
2. Hold a weight in front of your chest or on your shoulders.
3. Engage your core and keep your chest up as you lower your hips down and back, as if sitting into a chair.
4. Lower until your thighs are parallel to the ground, or as low as you can comfortably go.
5. Push through your heels to stand back up, squeezing your glutes at the top.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0852.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted Standing Curl', 'Arms', '1. Stand with your feet shoulder-width apart and hold a dumbbell in each hand, palms facing forward.
2. Keep your elbows close to your torso and exhale as you curl the weights up to shoulder level.
3. Pause for a moment at the top, then inhale as you slowly lower the weights back down to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0853.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted Standing Hand Squeeze', 'Arms', '1. Stand with your feet shoulder-width apart and hold a weight in each hand.
2. Extend your arms straight in front of you, palms facing each other.
3. Squeeze your hands together as hard as you can, engaging your forearms.
4. Hold the squeeze for a few seconds, then release.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0854.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted Straight Bar Dip', 'Chest', '1. Position yourself between parallel bars with your arms fully extended and your body straight.
2. Lower your body by bending your elbows until your upper arms are parallel to the ground.
3. Pause for a moment, then push yourself back up to the starting position by straightening your arms.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3313.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted Stretch Lunge', 'Legs', '1. Stand with your feet shoulder-width apart.
2. Take a step forward with your right foot, keeping your back straight.
3. Lower your body by bending your knees until your right thigh is parallel to the ground.
4. Push through your right heel to return to the starting position.
5. Repeat with your left leg.
6. Continue alternating legs for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3642.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted Svend Press', 'Chest', '1. Stand with your feet shoulder-width apart and hold a weight plate in front of your chest with both hands.
2. Keep your elbows slightly bent and your palms facing each other.
3. Press the weight plate straight out in front of you, fully extending your arms.
4. Pause for a moment at the end of the movement, then slowly bring the weight plate back to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0856.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted Three Bench Dips', 'Arms', '1. Sit on the edge of a bench with your hands gripping the edge, fingers pointing forward.
2. Walk your feet forward, sliding your butt off the bench and supporting your weight with your arms.
3. Lower your body by bending your elbows, keeping your back close to the bench.
4. Pause for a moment at the bottom, then push yourself back up to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1754.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted Tricep Dips', 'Arms', '1. Sit on the edge of a bench or chair with your hands gripping the edge next to your hips.
2. Slide your butt off the front of the bench with your legs extended in front of you.
3. Keep your back close to the bench and your elbows slightly bent.
4. Lower your body by bending your elbows until your upper arms are parallel to the floor.
5. Push yourself back up to the starting position by straightening your arms.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1755.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Weighted Triceps Dip On High Parallel Bars', 'Arms', '1. Position yourself between two parallel bars with your hands gripping the bars and your arms fully extended.
2. Bend your elbows and lower your body until your upper arms are parallel to the ground.
3. Pause for a moment, then push through your palms to straighten your arms and return to the starting position.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1767.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Wheel Rollerout', 'Core', '1. Kneel on the floor and place the wheel roller in front of you.
2. Place your hands on the handles of the wheel roller and extend your arms straight out in front of you.
3. Engage your core muscles and slowly roll the wheel forward, keeping your back straight and your abs tight.
4. Continue rolling forward until your body is fully extended and your arms are overhead.
5. Pause for a moment, then slowly roll the wheel back towards your knees, maintaining control and keeping your abs engaged.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0857.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Wheel Run', 'Cardio', '1. Start in a plank position with your hands on the wheel and your body straight.
2. Engage your core and start rolling the wheel forward by extending your arms.
3. Continue rolling until your body is fully extended and your arms are overhead.
4. Reverse the movement by pulling the wheel back towards your body, using your core and arms.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/3637.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Wide Grip Pull-up', 'Back', '1. Hang from a pull-up bar with your palms facing away from you and your hands wider than shoulder-width apart.
2. Engage your core and squeeze your shoulder blades together.
3. Pull your body up towards the bar until your chin is above the bar.
4. Lower your body back down to the starting position with control.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1429.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Wide Grip Rear Pull-up', 'Back', '1. Grab the pull-up bar with a wide overhand grip, hands slightly wider than shoulder-width apart.
2. Hang from the bar with your arms fully extended and your body straight.
3. Engage your back muscles and pull your body up towards the bar, leading with your chest.
4. Continue pulling until your chin is above the bar.
5. Pause for a moment at the top, then slowly lower your body back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1367.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Wide Hand Push Up', 'Chest', '1. Start in a high plank position with your hands wider than shoulder-width apart.
2. Keep your body in a straight line from head to toe.
3. Lower your chest towards the ground by bending your elbows, keeping them close to your sides.
4. Push through your palms to extend your arms and return to the starting position.
5. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1311.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Wide-grip Chest Dip On High Parallel Bars', 'Chest', '1. Position yourself on the parallel bars with your arms fully extended and your body suspended in the air.
2. Lean forward slightly and lower your body by bending your elbows until your chest is just above the bars.
3. Pause for a moment, then push yourself back up to the starting position by straightening your arms.
4. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/2363.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Wind Sprints', 'Core', '1. Find an open space or a track to perform the exercise.
2. Start by standing with your feet shoulder-width apart.
3. Begin running as fast as you can, pumping your arms and driving your knees up.
4. Continue sprinting for a specific distance or time period.
5. Rest and repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0858.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('World Greatest Stretch', 'Legs', '1. Start in a lunge position with your right foot forward and your left foot back.
2. Place your hands on the ground on either side of your right foot.
3. Lower your left knee to the ground and extend your right leg, keeping your right foot flat on the ground.
4. Rotate your torso to the right, reaching your right arm up towards the ceiling.
5. Hold this position for a few seconds, then return to the starting position.
6. Switch sides and repeat the stretch with your left foot forward.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1604.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Wrist Circles', 'Arms', '1. Extend your arms straight out in front of you.
2. Make a fist with both hands.
3. Rotate your wrists in a circular motion, keeping your arms still.
4. Continue the wrist circles for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/1428.gif')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.exercises (name, muscle_group, instructions, gif_url)
VALUES ('Wrist Rollerer', 'Arms', '1. Attach a weight to one end of a rope or bar.
2. Hold the other end of the rope or bar with both hands, palms facing down.
3. Stand with your feet shoulder-width apart and your arms fully extended in front of you.
4. Slowly roll the weight up towards your hands by flexing your wrists.
5. Pause for a moment at the top, then slowly lower the weight back down to the starting position.
6. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/omercotkd/exercises-gifs/main/assets/0859.gif')
ON CONFLICT (name) DO NOTHING;

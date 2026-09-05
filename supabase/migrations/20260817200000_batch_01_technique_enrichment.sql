-- ============================================================================
-- 20260817200000_batch_01_technique_enrichment.sql
-- ============================================================================
-- Apply reviewed technique enrichment for Batch 1 (25 exercises).
-- Updates ONLY approved technique fields:
--   setup_instructions, execution_instructions, breathing, coaching_cues,
--   common_mistakes, safety_notes.
--
-- Matches on canonical slug and source_type = 'yeti_first_party'.
-- Preserves all immutable fields, equipment, muscles, and media.
--
-- PROVENANCE NOTE:
-- This migration version preserves the Batch 01 enrichment payload historically
-- applied under migration version 20260817200000, while resolving canonical
-- exercises by stable slug/source_type so the committed fresh-bootstrap seed
-- with generated UUIDs can replay it. The enrichment payload (setup_instructions,
-- execution_instructions, breathing, coaching_cues, common_mistakes, safety_notes)
-- is byte-identical to the historically committed f4b636d version. The only
-- structural change is the exercise-resolution predicate and transaction wrapper.
-- This rewritten byte representation was NOT the exact SQL historically executed
-- in production; production applied the UUID-based variant on 2026-08-17.
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS _batch_01_payload;

CREATE TEMP TABLE _batch_01_payload (
  slug text PRIMARY KEY,
  setup_instructions text NOT NULL,
  execution_instructions text NOT NULL,
  breathing text NOT NULL,
  coaching_cues text[] NOT NULL,
  common_mistakes text[] NOT NULL,
  safety_notes text NOT NULL
) ON COMMIT DROP;

INSERT INTO _batch_01_payload (
  slug,
  setup_instructions,
  execution_instructions,
  breathing,
  coaching_cues,
  common_mistakes,
  safety_notes
) VALUES
  ('incline-barbell-bench-press', 'Set an incline bench to 30–45 degrees. Lie back with feet flat on the floor, glutes and upper back anchored, and shoulder blades retracted and depressed. Position the barbell directly above your upper chest with wrists stacked over forearms and elbows extended.', 'Lower the barbell under control along a natural diagonal trajectory toward your clavicles and upper chest, keeping elbows tucked at approximately 45–60 degrees from your torso. Reach a full pectoral stretch at the bottom, then drive your feet into the floor and press the resistance upward and slightly back until arms reach a strong lockout over the upper chest.', 'Inhale deeply and brace core at the top; hold breath through the descent; exhale forcefully through the concentric lockout.', ARRAY['Keep shoulder blades pinned back and down', 'Tuck elbows at 45–60 degrees on the descent', 'Drive up and back over the upper chest', 'Maintain firm foot contact with the floor']::text[], ARRAY['Setting bench incline higher than 45 degrees, shifting load to front deltoids', 'Flaring elbows straight out to 90 degrees', 'Bouncing the load off the chest or hyperextending shoulders', 'Lifting hips or lower back excessively off the bench']::text[], 'Use safety spotter arms or a reliable spotter when performing heavy barbell incline presses.'),
  ('incline-dumbbell-press', 'Set an incline bench to 30–45 degrees. Lie back with feet flat on the floor, glutes and upper back anchored, and shoulder blades retracted and depressed. Position the dumbbells directly above your upper chest with wrists stacked over forearms and elbows extended.', 'Lower the dumbbells under control along a natural diagonal trajectory toward your clavicles and upper chest, keeping elbows tucked at approximately 45–60 degrees from your torso. Reach a full pectoral stretch at the bottom, then drive your feet into the floor and press the resistance upward and slightly back until arms reach a strong lockout over the upper chest.', 'Inhale deeply and brace core at the top; hold breath through the descent; exhale forcefully through the concentric lockout.', ARRAY['Keep shoulder blades pinned back and down', 'Tuck elbows at 45–60 degrees on the descent', 'Drive up and back over the upper chest', 'Maintain firm foot contact with the floor']::text[], ARRAY['Setting bench incline higher than 45 degrees, shifting load to front deltoids', 'Flaring elbows straight out to 90 degrees', 'Bouncing the load off the chest or hyperextending shoulders', 'Lifting hips or lower back excessively off the bench']::text[], 'Use safety spotter arms or a reliable spotter when performing heavy barbell incline presses.'),
  ('machine-chest-press', 'Position yourself on the bench or machine seat with feet planted firmly on the floor. Retract and depress your scapulae into the backrest, establish a slight natural arch in the lumbar spine, and grip the chest press machine with wrists aligned directly over forearms.', 'Lower the chest press machine under control toward the mid-sternum, allowing elbows to tuck at approximately 45–60 degrees relative to your ribcage. Touch or descend to full chest depth, then press forcefully through the palms, driving the resistance back up to a strong lockout while keeping shoulders pinned back.', 'Inhale and brace core at the top; control breath through descent; exhale through the concentric press.', ARRAY['Drive shoulder blades into the pad', 'Tuck elbows at 45–60 degrees', 'Push the floor away through your feet', 'Squeeze your chest at the top of the press']::text[], ARRAY['Flaring elbows out to 90 degrees with the shoulders', 'Bouncing or slamming the load at the bottom', 'Allowing shoulder blades to pull forward and round at lockout', 'Lifting glutes off the bench']::text[], 'Maintain scapular retraction throughout the entire set to protect the anterior shoulder capsule.'),
  ('decline-dumbbell-press', 'Secure your legs into the decline bench foot rollers and lie back against the pad with shoulder blades retracted and depressed. Position the dumbbell over your lower chest with wrists stacked over forearms and core braced.', 'Lower the dumbbell with strict control toward your lower sternum/pectoral crease, maintaining tucked elbows at roughly 45 degrees. At the bottom stretch, press the resistance upward in a smooth arc until your arms are fully extended over the lower chest, squeezing the lower pectorals firmly.', 'Inhale and brace during the eccentric descent; exhale as you press the load back to full extension.', ARRAY['Anchor legs securely in the foot pads', 'Aim resistance toward lower pectoral crease', 'Keep shoulder blades packed tight against the pad', 'Press up to full arm extension']::text[], ARRAY['Allowing resistance to drift toward the neck', 'Flaring elbows excessively wide', 'Failing to secure legs properly into rollers', 'Dropping load rapidly during the descent']::text[], 'Ensure feet and ankles are firmly locked into the roller pads before lifting the load into position.'),
  ('conventional-deadlift', 'Stand with feet hip-width apart with the barbell over midfoot (about 1 inch from shins). Hinge at the hips, bend knees slightly, and grip the bar just outside your knees with double-overhand or mixed grip. Pull your chest tall, pull slack out of the bar, engage lats, and brace intra-abdominal pressure firmly.', 'Initiate by pushing the floor away with your legs while keeping the bar in contact with your shins and thighs. As the bar passes your knees, drive your hips forward to lock out in a tall, upright position with glutes squeezed. Reverse the path by hinging hips back until the bar passes the knees, then bend knees to return weight to the floor.', 'Take a deep diaphragmatic breath into the core and brace firmly before breaking the floor; exhale at lockout or once returned to floor.', ARRAY['Push the floor away through midfoot', 'Keep the bar glued to your shins and thighs', 'Pull the slack out of the bar before lifting', 'Lock out tall by squeezing glutes, not hyperextending back']::text[], ARRAY['Allowing the lower back or thoracic spine to round violently under load', 'Letting the bar drift away from the legs during the pull', 'Jerking the bar off the floor without pulling slack', 'Over-arching the lumbar spine at lockout']::text[], 'Maintain a rigid, neutral spine from head to pelvis; never allow the lumbar spine to round into flexion under load.'),
  ('pendlay-row', 'Position yourself for the row with a stable athletic stance or chest supported against the pad. Grip the barbell with wrists neutral, retract your shoulder blades slightly, and brace your core with a neutral spine from neck to hips.', 'Initiate the row by driving your elbows backward past your torso, pulling the resistance smoothly toward your lower ribcage/abdomen. Squeeze your lats and mid-back musculature hard at peak contraction without jerking or hyperextending the spine. Return the weight forward under 2–3 second eccentric control, feeling a full lat stretch before starting the next rep.', 'Inhale as arms extend forward under control; exhale as you row the weight toward your torso.', ARRAY['Drive elbows back past your ribcage', 'Keep chest tall and proud', 'Squeeze shoulder blades together at peak contraction', 'Control the negative stretch smoothly']::text[], ARRAY['Using excessive torso swing or hip drive to heave the weight', 'Shrugging traps upward rather than retracting mid-back', 'Flaring elbows excessively wide on narrow-grip rows', 'Rounding the lower back into lumbar flexion']::text[], 'Maintain spinal neutrality and brace abdominal wall to protect the lumbar spine during bent-over rowing variations.'),
  ('lat-pulldown', 'Adjust the thigh support or position yourself on the station with feet planted. Grasp the attachment with your chosen grip, sit down to anchor your lower body, pull shoulder blades down and back, and establish a slight 10–15 degree backward torso lean with braced core.', 'Initiate by depressing your shoulder blades, then drive your elbows downward and inward toward your hip pockets. Pull the bar smoothly until it touches or reaches collarbone level, squeezing your lats hard in the fully contracted position. Return the bar upward under strict control, allowing lats to fully stretch at the top without shrugging shoulders to ears.', 'Inhale as arms extend to full stretch at the top; exhale as you pull the bar down to the collarbone.', ARRAY['Lead the pull with your elbows, not your hands', 'Pull shoulders down and chest up', 'Squeeze lats hard at bottom contraction', 'Control the eccentric stretch all the way to the top']::text[], ARRAY['Swinging the torso backward to heave the weight with momentum', 'Pulling the bar behind the neck or down to the stomach', 'Shrugging shoulders into ears at the top', 'Letting the weight stack slam at the top']::text[], 'Avoid pulling behind the head to prevent unnecessary cervical spine and rotator cuff stress.'),
  ('t-bar-row', 'Position yourself for the row with a stable athletic stance or chest supported against the pad. Grip the t-bar machine with wrists neutral, retract your shoulder blades slightly, and brace your core with a neutral spine from neck to hips.', 'Initiate the row by driving your elbows backward past your torso, pulling the resistance smoothly toward your lower ribcage/abdomen. Squeeze your lats and mid-back musculature hard at peak contraction without jerking or hyperextending the spine. Return the weight forward under 2–3 second eccentric control, feeling a full lat stretch before starting the next rep.', 'Inhale as arms extend forward under control; exhale as you row the weight toward your torso.', ARRAY['Drive elbows back past your ribcage', 'Keep chest tall and proud', 'Squeeze shoulder blades together at peak contraction', 'Control the negative stretch smoothly']::text[], ARRAY['Using excessive torso swing or hip drive to heave the weight', 'Shrugging traps upward rather than retracting mid-back', 'Flaring elbows excessively wide on narrow-grip rows', 'Rounding the lower back into lumbar flexion']::text[], 'Maintain spinal neutrality and brace abdominal wall to protect the lumbar spine during bent-over rowing variations.'),
  ('barbell-overhead-press', 'Stand with feet shoulder-width apart or sit upright against a 90-degree backrest. Position the barbell at shoulder level with forearms vertical and wrists stacked directly above elbows. Brace your abs, squeeze glutes, and pull your chin back slightly to clear the bar/dumbbell path.', 'Press the barbell vertically in a smooth line directly overhead. As the resistance clears your forehead, push your head and torso slightly forward into a neutral stacked position with arms locked out directly over your shoulders and midfoot. Lower under control back to the collarbones/shoulders over 2–3 seconds.', 'Inhale and brace core at shoulder height; exhale as you press overhead to lockout; inhale as you lower the weight.', ARRAY['Keep forearms vertical under the weight', 'Brace core and squeeze glutes tight', 'Press straight up and lock out overhead with head through', 'Control the descent back to shoulder level']::text[], ARRAY['Excessive lumbar hyperextension (leaning back into an incline press)', 'Flaring elbows straight back rather than keeping them slightly in front', 'Pressing the weight too far in front of the body', 'Failing to reach full overhead lockout']::text[], 'Avoid extreme lower back arching; engage core and glutes to keep the spine neutral during overhead pressing.'),
  ('arnold-press', 'Stand with feet shoulder-width apart or sit upright against a 90-degree backrest. Position the dumbbells at shoulder level with forearms vertical and wrists stacked directly above elbows. Brace your abs, squeeze glutes, and pull your chin back slightly to clear the bar/dumbbell path.', 'Press the dumbbells vertically in a smooth line directly overhead. As the resistance clears your forehead, push your head and torso slightly forward into a neutral stacked position with arms locked out directly over your shoulders and midfoot. Lower under control back to the collarbones/shoulders over 2–3 seconds.', 'Inhale and brace core at shoulder height; exhale as you press overhead to lockout; inhale as you lower the weight.', ARRAY['Keep forearms vertical under the weight', 'Brace core and squeeze glutes tight', 'Press straight up and lock out overhead with head through', 'Control the descent back to shoulder level']::text[], ARRAY['Excessive lumbar hyperextension (leaning back into an incline press)', 'Flaring elbows straight back rather than keeping them slightly in front', 'Pressing the weight too far in front of the body', 'Failing to reach full overhead lockout']::text[], 'Avoid extreme lower back arching; engage core and glutes to keep the spine neutral during overhead pressing.'),
  ('seated-barbell-shoulder-press', 'Stand with feet shoulder-width apart or sit upright against a 90-degree backrest. Position the barbell at shoulder level with forearms vertical and wrists stacked directly above elbows. Brace your abs, squeeze glutes, and pull your chin back slightly to clear the bar/dumbbell path.', 'Press the barbell vertically in a smooth line directly overhead. As the resistance clears your forehead, push your head and torso slightly forward into a neutral stacked position with arms locked out directly over your shoulders and midfoot. Lower under control back to the collarbones/shoulders over 2–3 seconds.', 'Inhale and brace core at shoulder height; exhale as you press overhead to lockout; inhale as you lower the weight.', ARRAY['Keep forearms vertical under the weight', 'Brace core and squeeze glutes tight', 'Press straight up and lock out overhead with head through', 'Control the descent back to shoulder level']::text[], ARRAY['Excessive lumbar hyperextension (leaning back into an incline press)', 'Flaring elbows straight back rather than keeping them slightly in front', 'Pressing the weight too far in front of the body', 'Failing to reach full overhead lockout']::text[], 'Avoid extreme lower back arching; engage core and glutes to keep the spine neutral during overhead pressing.'),
  ('front-squat', 'Position the barbell securely across your shoulders or hold it in front of your chest. Set feet shoulder-width apart with toes turned slightly outward (15–30 degrees). Keep chest proud, pull shoulder blades together, and brace intra-abdominal pressure 360 degrees around your trunk.', 'Initiate by unlocking knees and hips simultaneously, sitting down and back between your thighs. Keep chest upright and track knees in line with your toes. Descend until your hip crease is at or below the top of the knee, pause for a split second, then drive forcefully through midfoot to stand tall, extending hips and knees to lockout.', 'Inhale deeply and brace core before descending; hold pressure through the turnaround; exhale past the sticking point on ascent.', ARRAY['Spread the floor with your feet', 'Keep chest proud and elbows in position', 'Track knees outward over the toes', 'Drive out of the hole through midfoot']::text[], ARRAY['Allowing knees to cave inward during the ascent (valgus collapse)', 'Rounding the lower back at the bottom of the squat (butt wink)', 'Shifting weight forward onto the toes and lifting heels', 'Cutting squat depth short of parallel']::text[], 'Always ensure safety pins or spotters are present when squatting heavy loads.'),
  ('goblet-squat', 'Position the dumbbell securely across your shoulders or hold it in front of your chest. Set feet shoulder-width apart with toes turned slightly outward (15–30 degrees). Keep chest proud, pull shoulder blades together, and brace intra-abdominal pressure 360 degrees around your trunk.', 'Initiate by unlocking knees and hips simultaneously, sitting down and back between your thighs. Keep chest upright and track knees in line with your toes. Descend until your hip crease is at or below the top of the knee, pause for a split second, then drive forcefully through midfoot to stand tall, extending hips and knees to lockout.', 'Inhale deeply and brace core before descending; hold pressure through the turnaround; exhale past the sticking point on ascent.', ARRAY['Spread the floor with your feet', 'Keep chest proud and elbows in position', 'Track knees outward over the toes', 'Drive out of the hole through midfoot']::text[], ARRAY['Allowing knees to cave inward during the ascent (valgus collapse)', 'Rounding the lower back at the bottom of the squat (butt wink)', 'Shifting weight forward onto the toes and lifting heels', 'Cutting squat depth short of parallel']::text[], 'Always ensure safety pins or spotters are present when squatting heavy loads.'),
  ('hack-squat', 'Position the hack squat machine securely across your shoulders or hold it in front of your chest. Set feet shoulder-width apart with toes turned slightly outward (15–30 degrees). Keep chest proud, pull shoulder blades together, and brace intra-abdominal pressure 360 degrees around your trunk.', 'Initiate by unlocking knees and hips simultaneously, sitting down and back between your thighs. Keep chest upright and track knees in line with your toes. Descend until your hip crease is at or below the top of the knee, pause for a split second, then drive forcefully through midfoot to stand tall, extending hips and knees to lockout.', 'Inhale deeply and brace core before descending; hold pressure through the turnaround; exhale past the sticking point on ascent.', ARRAY['Spread the floor with your feet', 'Keep chest proud and elbows in position', 'Track knees outward over the toes', 'Drive out of the hole through midfoot']::text[], ARRAY['Allowing knees to cave inward during the ascent (valgus collapse)', 'Rounding the lower back at the bottom of the squat (butt wink)', 'Shifting weight forward onto the toes and lifting heels', 'Cutting squat depth short of parallel']::text[], 'Always ensure safety pins or spotters are present when squatting heavy loads.'),
  ('romanian-deadlift', 'Stand with feet hip-width apart with the barbell over midfoot (about 1 inch from shins). Hinge at the hips, bend knees slightly, and grip the bar just outside your knees with double-overhand or mixed grip. Pull your chest tall, pull slack out of the bar, engage lats, and brace intra-abdominal pressure firmly.', 'Initiate by pushing the floor away with your legs while keeping the bar in contact with your shins and thighs. As the bar passes your knees, drive your hips forward to lock out in a tall, upright position with glutes squeezed. Reverse the path by hinging hips back until the bar passes the knees, then bend knees to return weight to the floor.', 'Take a deep diaphragmatic breath into the core and brace firmly before breaking the floor; exhale at lockout or once returned to floor.', ARRAY['Push the floor away through midfoot', 'Keep the bar glued to your shins and thighs', 'Pull the slack out of the bar before lifting', 'Lock out tall by squeezing glutes, not hyperextending back']::text[], ARRAY['Allowing the lower back or thoracic spine to round violently under load', 'Letting the bar drift away from the legs during the pull', 'Jerking the bar off the floor without pulling slack', 'Over-arching the lumbar spine at lockout']::text[], 'Maintain a rigid, neutral spine from head to pelvis; never allow the lumbar spine to round into flexion under load.'),
  ('cable-pull-through', 'Adjust the machine lever arm and pad so the leg pad rests comfortably against the back of your lower calves/Achilles tendon. Align your knee joint with the machine''s pivot axis. Secure the thigh clamp (seated) or lie flat (prone), gripping the handles firmly to anchor your pelvis.', 'Initiate the movement by flexing your knees to pull the pad toward your glutes in a smooth arc. Drive the contraction until your knees reach maximum comfortable flexion, squeezing the hamstrings hard for a brief pause. Slowly return the pad back to full knee extension over 2–3 seconds, maintaining tension throughout the eccentric phase.', 'Inhale as legs extend under control; exhale as you curl heels toward glutes.', ARRAY['Drive heels towards glutes', 'Keep hips and pelvis pinned firmly to the pad', 'Squeeze hamstrings at peak contraction', 'Control the return stretch']::text[], ARRAY['Arching lower back or lifting hips to assist the curl', 'Using momentum to jerk the weight stack', 'Letting the weight slam at the end of the eccentric', 'Improper machine pivot alignment']::text[], 'Ensure pelvis remains flat on the bench/seat to avoid excessive lumbar strain.'),
  ('smith-machine-hip-thrust', 'Sit on the floor with your upper back supported against a sturdy bench at shoulder blade level. Place the smith machine across your hip crease (using a thick pad for comfort). Bend your knees at roughly 90 degrees with feet flat on the floor, hip-width apart and toes angled slightly outward.', 'Drive through your heels and squeeze your glutes forcefully to lift your hips toward the ceiling until thighs and torso form a straight horizontal line parallel to the floor. Keep chin tucked and ribs pulled down to prevent lower back hyperextension. Hold peak contraction for 1–2 seconds, then lower your hips under control back toward the floor.', 'Inhale at the bottom; exhale forcefully as you drive hips up to peak glute contraction.', ARRAY['Drive through the heels, not the toes', 'Tuck chin and look forward, keeping ribs down', 'Squeeze glutes hard at the top lockout', 'Maintain 90-degree knee angle at top position']::text[], ARRAY['Hyperextending the lower back at the top instead of using glute extension', 'Looking up at the ceiling and losing cervical neutrality', 'Placing feet too far forward (hamstring bias) or too close (quad bias)', 'Failing to reach full hip extension']::text[], 'Use a dense barbell pad or foam wrap to cushion the pelvic bones from direct bar pressure.'),
  ('cable-glute-kickback', 'Adjust the machine lever arm and pad so the leg pad rests comfortably against the back of your lower calves/Achilles tendon. Align your knee joint with the machine''s pivot axis. Secure the thigh clamp (seated) or lie flat (prone), gripping the handles firmly to anchor your pelvis.', 'Initiate the movement by flexing your knees to pull the pad toward your glutes in a smooth arc. Drive the contraction until your knees reach maximum comfortable flexion, squeezing the hamstrings hard for a brief pause. Slowly return the pad back to full knee extension over 2–3 seconds, maintaining tension throughout the eccentric phase.', 'Inhale as legs extend under control; exhale as you curl heels toward glutes.', ARRAY['Drive heels towards glutes', 'Keep hips and pelvis pinned firmly to the pad', 'Squeeze hamstrings at peak contraction', 'Control the return stretch']::text[], ARRAY['Arching lower back or lifting hips to assist the curl', 'Using momentum to jerk the weight stack', 'Letting the weight slam at the end of the eccentric', 'Improper machine pivot alignment']::text[], 'Ensure pelvis remains flat on the bench/seat to avoid excessive lumbar strain.'),
  ('standing-calf-raise-machine', 'Place the balls of your feet on the edge of the calf block with heels hanging freely off the edge. Adjust the machine pad or hold the selectorized / plate-loaded machine securely. Keep legs straight (standing) or bent at 90 degrees (seated), core braced and spine neutral.', 'Lower your heels slowly into a deep, full calf stretch at the bottom, holding for 1–2 seconds to eliminate elastic bounce. Drive forcefully through the balls of your feet and big toes to extend the ankles into maximal plantarflexion, squeezing the calves hard at the peak for a full second before lowering under control.', 'Inhale during the controlled lowering phase into full stretch; exhale as you press up to peak calf contraction.', ARRAY['Pause for a full second in the deep bottom stretch', 'Drive up through the balls of your feet and big toes', 'Squeeze calves hard at the very top of the rep', 'Control the 2-second negative without bouncing']::text[], ARRAY['Bouncing rapidly at the bottom using Achilles tendon elasticity', 'Performing short partial reps without full stretch or contraction', 'Rolling ankles outward onto the pinky toes', 'Bending knees during standing calf raises']::text[], 'Never bounce at the bottom of the stretch to avoid strain on the Achilles tendon.'),
  ('seated-calf-raise-machine', 'Place the balls of your feet on the edge of the calf block with heels hanging freely off the edge. Adjust the machine pad or hold the selectorized / plate-loaded machine securely. Keep legs straight (standing) or bent at 90 degrees (seated), core braced and spine neutral.', 'Lower your heels slowly into a deep, full calf stretch at the bottom, holding for 1–2 seconds to eliminate elastic bounce. Drive forcefully through the balls of your feet and big toes to extend the ankles into maximal plantarflexion, squeezing the calves hard at the peak for a full second before lowering under control.', 'Inhale during the controlled lowering phase into full stretch; exhale as you press up to peak calf contraction.', ARRAY['Pause for a full second in the deep bottom stretch', 'Drive up through the balls of your feet and big toes', 'Squeeze calves hard at the very top of the rep', 'Control the 2-second negative without bouncing']::text[], ARRAY['Bouncing rapidly at the bottom using Achilles tendon elasticity', 'Performing short partial reps without full stretch or contraction', 'Rolling ankles outward onto the pinky toes', 'Bending knees during standing calf raises']::text[], 'Never bounce at the bottom of the stretch to avoid strain on the Achilles tendon.'),
  ('ez-bar-curl', 'Stand or sit tall holding the ez bar with an underhand (supinated) or neutral grip. Keep elbows pinned close to your ribcage, shoulders pulled back and down, chest tall, and core braced.', 'Initiate the curl by contracting your biceps to bend your elbows, lifting the weight in a smooth arc toward your shoulders while keeping your upper arms stationary at your sides. Squeeze biceps hard at peak contraction, then lower the weight under strict 2–3 second eccentric control to full arm extension.', 'Inhale at the bottom; exhale as you curl the weight upward; inhale as you lower the weight back down.', ARRAY['Keep elbows glued to your sides', 'Curl the weight up in a smooth arc', 'Squeeze biceps hard at the top', 'Lower all the way to full extension under control']::text[], ARRAY['Swinging hips or leaning back to heave the weight up', 'Drifting elbows forward excessively to turn the curl into a front raise', 'Dropping the weight rapidly without eccentric control', 'Failing to reach full arm extension at the bottom']::text[], 'Keep upper arms stationary; do not use heavy body swing which strains the lower back and shoulders.'),
  ('hammer-curl', 'Stand or sit tall holding the dumbbells with an underhand (supinated) or neutral grip. Keep elbows pinned close to your ribcage, shoulders pulled back and down, chest tall, and core braced.', 'Initiate the curl by contracting your biceps to bend your elbows, lifting the weight in a smooth arc toward your shoulders while keeping your upper arms stationary at your sides. Squeeze biceps hard at peak contraction, then lower the weight under strict 2–3 second eccentric control to full arm extension.', 'Inhale at the bottom; exhale as you curl the weight upward; inhale as you lower the weight back down.', ARRAY['Keep elbows glued to your sides', 'Curl the weight up in a smooth arc', 'Squeeze biceps hard at the top', 'Lower all the way to full extension under control']::text[], ARRAY['Swinging hips or leaning back to heave the weight up', 'Drifting elbows forward excessively to turn the curl into a front raise', 'Dropping the weight rapidly without eccentric control', 'Failing to reach full arm extension at the bottom']::text[], 'Keep upper arms stationary; do not use heavy body swing which strains the lower back and shoulders.'),
  ('close-grip-bench-press', 'Position yourself on the bench or machine seat with feet planted firmly on the floor. Retract and depress your scapulae into the backrest, establish a slight natural arch in the lumbar spine, and grip the barbell with wrists aligned directly over forearms.', 'Lower the barbell under control toward the mid-sternum, allowing elbows to tuck at approximately 45–60 degrees relative to your ribcage. Touch or descend to full chest depth, then press forcefully through the palms, driving the resistance back up to a strong lockout while keeping shoulders pinned back.', 'Inhale and brace core at the top; control breath through descent; exhale through the concentric press.', ARRAY['Drive shoulder blades into the pad', 'Tuck elbows at 45–60 degrees', 'Push the floor away through your feet', 'Squeeze your chest at the top of the press']::text[], ARRAY['Flaring elbows out to 90 degrees with the shoulders', 'Bouncing or slamming the load at the bottom', 'Allowing shoulder blades to pull forward and round at lockout', 'Lifting glutes off the bench']::text[], 'Maintain scapular retraction throughout the entire set to protect the anterior shoulder capsule.'),
  ('ez-bar-skull-crusher', 'Position yourself holding the ez bar with arms bent and elbows pinned firmly in place. Establish a stable stance with core engaged and spine neutral.', 'Initiate the movement by contracting your triceps to extend your elbows, pushing or pressing the resistance until your arms are fully extended. Squeeze the triceps forcefully at peak extension for a full second, then return under controlled tension back to the starting elbow bend without letting elbows flare or shift position.', 'Inhale as elbows bend under control; exhale as you extend arms into full triceps contraction.', ARRAY['Keep elbows pinned in a fixed position', 'Drive through the triceps to full arm extension', 'Squeeze triceps hard at peak lockout', 'Control the return without letting elbows drift']::text[], ARRAY['Flaring elbows out to the sides during extension', 'Using shoulder movement or momentum to move the weight', 'Letting wrists collapse backward under load', 'Cutting the range of motion short']::text[], 'Keep elbows stationary to direct tension onto the triceps and protect the elbow joint tendons.'),
  ('hanging-leg-raise', 'Hang from the pull-up bar with an overhand grip or support yourself firmly in the captain’s chair. Depress your shoulder blades, engage your lats, and let your legs hang with core pre-braced and hips stable.', 'Initiate by posteriorly tilting your pelvis, then contract your abdominals to lift your legs/knees upward in a controlled arc toward your chest. Avoid swinging or using pendulum momentum. Pause briefly at peak abdominal contraction, then lower your legs under control back to the dead-hang position without arching your back.', 'Inhale at the bottom hang; exhale as you curl your pelvis and legs upward to your chest.', ARRAY['Roll your pelvis up toward your sternum', 'Lead with the abs, not hip swing', 'Pause briefly at the top of the lift', 'Control the descent without swinging']::text[], ARRAY['Using aggressive leg swing or momentum to kick the legs up', 'Arching lower back into hyperextension at the bottom', 'Pulling only from hip flexors without curling the pelvis', 'Shrugging shoulders up into the ears']::text[], 'Keep shoulders active and engaged to prevent excessive strain on the glenohumeral joint.');

DO $$
DECLARE
  v_payload_count int;
  v_distinct_payload_count int;
  v_pilot_count int;
  v_ambiguous_count int;
  v_missing_count int;
  v_match_count int;
  v_archived_count int;
  v_inactive_count int;
BEGIN
  -- 1. Exactly 25 expected slug definitions
  SELECT count(*) INTO v_payload_count FROM _batch_01_payload;
  IF v_payload_count <> 25 THEN
    RAISE EXCEPTION 'Aborting: expected 25 payload definitions, found %', v_payload_count;
  END IF;

  -- 2. No duplicate target slug definitions
  SELECT count(DISTINCT slug) INTO v_distinct_payload_count FROM _batch_01_payload;
  IF v_distinct_payload_count <> 25 THEN
    RAISE EXCEPTION 'Aborting: duplicate target slug definitions found in payload (% distinct)', v_distinct_payload_count;
  END IF;

  -- 3. Verify pilot exercises are not in Batch 1
  SELECT count(*) INTO v_pilot_count
  FROM _batch_01_payload
  WHERE slug IN ('barbell-bench-press', 'barbell-bent-over-row', 'back-squat', 'barbell-curl', 'ab-wheel-rollout-from-knees');

  IF v_pilot_count > 0 THEN
    RAISE EXCEPTION 'Aborting: pilot exercises detected in batch update list';
  END IF;

  -- 4. Check for ambiguous targets (more than one matching yeti_first_party exercise per target slug)
  SELECT count(*) INTO v_ambiguous_count
  FROM (
    SELECT p.slug
    FROM _batch_01_payload p
    JOIN public.exercises e ON e.slug = p.slug AND e.source_type = 'yeti_first_party'
    GROUP BY p.slug
    HAVING count(e.id) > 1
  ) amb;

  IF v_ambiguous_count > 0 THEN
    RAISE EXCEPTION 'Aborting: % target slug(s) match multiple canonical exercises (ambiguous)', v_ambiguous_count;
  END IF;

  -- 5. Check for missing targets (target slug with zero matching yeti_first_party exercises)
  SELECT count(*) INTO v_missing_count
  FROM _batch_01_payload p
  LEFT JOIN public.exercises e ON e.slug = p.slug AND e.source_type = 'yeti_first_party'
  WHERE e.id IS NULL;

  IF v_missing_count > 0 THEN
    RAISE EXCEPTION 'Aborting: % target slug(s) missing matching canonical exercise', v_missing_count;
  END IF;

  -- 6. Exactly 25 matching active canonical exercises
  SELECT count(*) INTO v_match_count
  FROM public.exercises e
  JOIN _batch_01_payload p ON e.slug = p.slug AND e.source_type = 'yeti_first_party';

  IF v_match_count <> 25 THEN
    RAISE EXCEPTION 'Aborting: expected 25 matching canonical exercises, found %', v_match_count;
  END IF;

  -- 7. Active/non-archived state, if supported by the schema at this migration point
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'archived_at'
  ) THEN
    EXECUTE 'SELECT count(*) FROM public.exercises e JOIN _batch_01_payload p ON e.slug = p.slug AND e.source_type = ''yeti_first_party'' WHERE e.archived_at IS NOT NULL'
    INTO v_archived_count;
    IF v_archived_count > 0 THEN
      RAISE EXCEPTION 'Aborting: % target exercise(s) are archived', v_archived_count;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'is_active'
  ) THEN
    EXECUTE 'SELECT count(*) FROM public.exercises e JOIN _batch_01_payload p ON e.slug = p.slug AND e.source_type = ''yeti_first_party'' WHERE e.is_active = false'
    INTO v_inactive_count;
    IF v_inactive_count > 0 THEN
      RAISE EXCEPTION 'Aborting: % target exercise(s) are inactive', v_inactive_count;
    END IF;
  END IF;
END $$;

-- Apply technique enrichment updates for Batch 1 (25 exercises)
UPDATE public.exercises AS e
SET
  setup_instructions = p.setup_instructions,
  execution_instructions = p.execution_instructions,
  breathing = p.breathing,
  coaching_cues = p.coaching_cues,
  common_mistakes = p.common_mistakes,
  safety_notes = p.safety_notes
FROM _batch_01_payload AS p
WHERE e.slug = p.slug
  AND e.source_type = 'yeti_first_party';

DO $$
DECLARE
  v_updated int;
BEGIN
  SELECT count(*) INTO v_updated
  FROM public.exercises e
  JOIN _batch_01_payload p ON e.slug = p.slug AND e.source_type = 'yeti_first_party'
  WHERE e.setup_instructions = p.setup_instructions
    AND e.execution_instructions = p.execution_instructions
    AND e.breathing = p.breathing
    AND e.coaching_cues = p.coaching_cues
    AND e.common_mistakes = p.common_mistakes
    AND e.safety_notes = p.safety_notes;

  IF v_updated <> 25 THEN
    RAISE EXCEPTION 'Aborting: expected 25 enriched exercises after update, verified %', v_updated;
  END IF;
END $$;

COMMIT;

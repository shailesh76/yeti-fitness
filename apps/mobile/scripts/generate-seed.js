const fs = require('fs');
const path = require('path');

const POPULAR_EXERCISES = [
  // Chest
  "barbell bench press", "dumbbell bench press", "incline barbell bench press", "incline dumbbell bench press", "decline barbell bench press", "push-up", "dumbbell chest fly", "cable chest press", "cable chest fly",
  // Back
  "barbell deadlift", "pull-up", "chin-up", "barbell bent over row", "one arm dumbbell row", "seated cable row", "lat pulldown", "face pull", "back extension",
  // Shoulders
  "barbell overhead press", "dumbbell shoulder press", "dumbbell lateral raise", "dumbbell front raise", "dumbbell rear delt raise", "dumbbell shrug", "cable lateral raise",
  // Legs (Quads, Hamstrings, Glutes, Calves)
  "barbell squat", "leg press", "leg extension", "lying leg curl", "seated leg curl", "barbell romanian deadlift", "dumbbell romanian deadlift", "barbell hip thrust", "standing calf raise", "seated calf raise", "walking lunge",
  // Biceps
  "barbell curl", "dumbbell curl", "hammer curl", "dumbbell preacher curl", "concentration curl", "cable bicep curl",
  // Triceps
  "triceps pushdown", "lying triceps extension", "dumbbell overhead triceps extension", "bench dip", "close-grip bench press", "rope triceps pushdown",
  // Abs/Core
  "crunch", "plank", "hanging leg raise", "russian twist", "ab wheel rollout", "bicycle crunch",
  // Cardio
  "treadmill running", "rope skipping", "burpee", "stationary bike"
];

async function run() {
  console.log("Fetching exercises from ExerciseGymGifsDB...");
  const response = await fetch("https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/api/en/exercises.json");
  if (!response.ok) {
    throw new Error(`Failed to fetch exercises: ${response.statusText}`);
  }
  
  const data = await response.json();
  const allExercises = data.exercises;
  console.log(`Fetched ${allExercises.length} exercises.`);
  
  // Find matched popular exercises
  const selected = [];
  const popularSet = new Set(POPULAR_EXERCISES.map(e => e.toLowerCase()));
  
  for (const ex of allExercises) {
    const nameLower = ex.name.toLowerCase();
    
    // Exact or close match
    const exactMatch = POPULAR_EXERCISES.find(p => p === nameLower || nameLower.includes(p));
    if (exactMatch) {
      selected.push(ex);
      // Remove from popular set to avoid duplicates
      popularSet.delete(exactMatch);
    }
  }
  
  // If we missed any, just log them
  if (popularSet.size > 0) {
    console.log(`Could not find exact matches for: ${Array.from(popularSet).join(', ')}`);
  }
  
  console.log(`Selected ${selected.length} popular exercises.`);
  
  // Map muscles
  const mapMuscleGroup = (muscle, bodyPart) => {
    muscle = (muscle || "").toLowerCase();
    bodyPart = (bodyPart || "").toLowerCase();
    
    if (muscle === 'biceps') return 'Biceps';
    if (muscle === 'triceps') return 'Triceps';
    if (muscle === 'chest' || muscle === 'pectoralis major' || bodyPart === 'chest') return 'Chest';
    if (muscle === 'shoulders' || muscle === 'deltoids' || bodyPart === 'shoulders') return 'Shoulders';
    if (muscle === 'lats' || muscle === 'back' || muscle === 'trapezius' || bodyPart === 'back') return 'Back';
    if (muscle === 'quads' || muscle === 'quadriceps' || muscle === 'thighs' || bodyPart === 'legs') {
      if (muscle === 'hamstrings' || muscle === 'glutes') return 'Hamstrings/Glutes';
      return 'Quads';
    }
    if (muscle === 'hamstrings' || muscle === 'glutes') return 'Hamstrings/Glutes';
    if (muscle === 'calves') return 'Calves';
    if (muscle === 'abs' || muscle === 'core' || bodyPart === 'core') return 'Core';
    if (bodyPart === 'cardio') return 'Cardio';
    
    // Fallback capitalizing first letter
    return muscle.charAt(0).toUpperCase() + muscle.slice(1);
  };
  
  // Generate SQL
  let sql = `-- Migration to add unique constraint on name and seed rich exercises with instructions & GIFs\n\n`;
  sql += `-- 1. Add unique constraint on name (if it doesn't already exist)\n`;
  sql += `do $$\n`;
  sql += `begin\n`;
  sql += `  if not exists (select 1 from pg_constraint where conname = 'exercises_name_key') then\n`;
  sql += `    alter table public.exercises add constraint exercises_name_key unique (name);\n`;
  sql += `  end if;\n`;
  sql += `end $$;\n\n`;
  sql += `-- 2. Seed exercises\n`;
  sql += `insert into public.exercises (name, muscle_group, instructions, gif_url)\nvalues\n`;
  
  const values = selected.map(ex => {
    const name = ex.name.replace(/'/g, "''");
    const muscleGroup = mapMuscleGroup(ex.muscle, ex.bodyPart);
    const instructionsText = (Array.isArray(ex.instructions) ? ex.instructions.join(" ") : (ex.instructions || "")).replace(/'/g, "''");
    const gifUrl = ex.gifUrl;
    
    return `  ('${name}', '${muscleGroup}', '${instructionsText}', '${gifUrl}')`;
  });
  
  sql += values.join(",\n");
  sql += `\non conflict (name) do update \n`;
  sql += `set muscle_group = excluded.muscle_group,\n`;
  sql += `    instructions = excluded.instructions,\n`;
  sql += `    gif_url = excluded.gif_url;\n`;
  
  const targetPath = path.join(__dirname, '..', 'supabase', 'migrations', '20240628_seed_rich_exercises.sql');
  
  // Ensure migrations dir exists
  const migrationsDir = path.dirname(targetPath);
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }
  
  fs.writeFileSync(targetPath, sql, 'utf8');
  console.log(`Successfully generated SQL seed file at: ${targetPath}`);
}

run().catch(console.error);

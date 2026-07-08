// scratch/check_workout_data.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Dependency-free .env parser
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      process.env[key] = value.trim();
    }
  });
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  await supabase.auth.signInWithPassword({
    email: 'coach-a@dude.com',
    password: 'password123'
  });

  const athleteId = 'd9823db0-da4b-4a39-951d-2cd8fd26e274';

  console.log("=== Querying assigned plans with nested days & exercises ===");
  const { data, error } = await supabase
    .from('assigned_plans')
    .select(`
      id, assigned_at, start_date,
      plan:workout_plans(
        id, name, created_at, coach_id,
        coach:profiles!coach_id(full_name),
        days:plan_days(
          id, name, day_number,
          exercises:plan_exercises(
            id, sets, reps, order_index, exercise:exercises(*)
          )
        )
      )
    `)
    .eq('athlete_id', athleteId);

  if (error) {
    console.error(error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

run();

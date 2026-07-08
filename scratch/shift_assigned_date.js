// scratch/shift_assigned_date.js
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
  const targetDateStr = '2026-07-04'; // Explicitly force July 4th

  console.log(`Updating assigned plans start_date to ${targetDateStr} for athlete ${athleteId}...`);
  const { data, error } = await supabase
    .from('assigned_plans')
    .update({ start_date: targetDateStr })
    .eq('athlete_id', athleteId)
    .select();

  if (error) {
    console.error("Update failed:", error);
  } else {
    console.log("Success! Updated plans to July 4th:", data);
  }
}

run();

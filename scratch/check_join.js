// scratch/check_join.js
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
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("🔑 Authenticating as Coach A...");
  const { data: coachSign, error: coachSignErr } = await supabase.auth.signInWithPassword({
    email: 'coach-a@dude.com',
    password: 'password123'
  });
  
  if (coachSignErr) {
    console.error("Coach A login failed:", coachSignErr.message);
    process.exit(1);
  }

  const coachId = coachSign.user.id;
  console.log("Logged in, Coach ID:", coachId);

  const { data: clientsData, error } = await supabase
    .from('coach_clients')
    .select('athlete:profiles!coach_clients_athlete_id_fkey(*)')
    .eq('coach_id', coachId);

  console.log("Query Result:");
  if (error) {
    console.error("Query Error:", error);
  } else {
    console.log(JSON.stringify(clientsData, null, 2));
  }
}

run();

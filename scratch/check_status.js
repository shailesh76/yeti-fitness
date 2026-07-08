// scratch/check_status.js
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

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: Missing Supabase credentials in .env file.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("🔑 Authenticating as Coach A...");
  const { data: coachSign, error: coachSignErr } = await supabase.auth.signInWithPassword({
    email: 'coach-a@dude.com',
    password: 'password123'
  });
  
  if (coachSignErr) {
    console.error("Coach A login failed:", coachSignErr.message);
  } else {
    console.log("Logged in as Coach A:", coachSign.user.email);
    
    const { data: invites, error: inviteErr } = await supabase
      .from('client_invites')
      .select('*');
    console.log("Coach A - Invites:", inviteErr || invites);
    
    const { data: clients, error: clientErr } = await supabase
      .from('coach_clients')
      .select('*');
    console.log("Coach A - Clients:", clientErr || clients);

    await supabase.auth.signOut();
  }

  console.log("\n🔑 Authenticating as Athlete 1...");
  const { data: athleteSign, error: athleteSignErr } = await supabase.auth.signInWithPassword({
    email: 'athlete-1@dude.com',
    password: 'password123'
  });

  if (athleteSignErr) {
    console.error("Athlete 1 login failed:", athleteSignErr.message);
  } else {
    console.log("Logged in as Athlete 1:", athleteSign.user.email);
    
    const { data: invites, error: inviteErr } = await supabase
      .from('client_invites')
      .select('*');
    console.log("Athlete 1 - Invites:", inviteErr || invites);

    const { data: clients, error: clientErr } = await supabase
      .from('coach_clients')
      .select('*');
    console.log("Athlete 1 - Clients:", clientErr || clients);
  }
}

run();

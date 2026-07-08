// scratch/check_policies.js
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
  console.log("=== RLS Policies Audit ===");
  const { data, error } = await supabase.rpc('get_policies_audit'); // If custom RPC exists
  
  // Alternative: query pg_policies directly (requires service role / admin privilege)
  const { data: policies, error: polErr } = await supabase
    .from('pg_policies') // Wait, pg_policies is a system catalog, standard REST API cannot read it unless custom function
    .select('*');
  
  if (polErr) {
    // If system catalog is blocked, run a raw query through pg or check policies via direct table query simulation.
    console.log("System catalog query blocked. Simulating queries...");
    
    // Log in as Coach A
    const { data: coachSign } = await supabase.auth.signInWithPassword({
      email: 'coach-a@dude.com',
      password: 'password123'
    });

    if (coachSign) {
      const coachId = coachSign.user.id;
      // Fetch plan days
      const { data: days, error: daysErr } = await supabase.from('plan_days').select('*');
      console.log("Coach A - plan_days select:", daysErr || `${days.length} rows`);
      
      const { data: ex, error: exErr } = await supabase.from('plan_exercises').select('*');
      console.log("Coach A - plan_exercises select:", exErr || `${ex.length} rows`);

      await supabase.auth.signOut();
    }
  } else {
    console.log(policies);
  }
}

run();

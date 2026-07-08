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
  console.log("🔑 Authenticating as Athlete (athlete-1@dude.com)...");
  const { data: sign, error: signErr } = await supabase.auth.signInWithPassword({
    email: 'athlete-1@dude.com',
    password: 'password123'
  });

  if (signErr) {
    console.error("Athlete sign in failed:", signErr.message);
    return;
  }

  console.log("Athlete authenticated! ID:", sign.user.id);

  console.log("\n=== Querying session sets ===");
  const { data: sets, error: setsErr } = await supabase
    .from('session_sets')
    .select('*');

  if (setsErr) {
    console.error(setsErr);
  } else {
    console.log("Sets count:", sets.length);
    console.log(JSON.stringify(sets, null, 2));
  }
}

run();

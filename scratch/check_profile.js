// scratch/check_profile.js
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
  // Sign in as Coach A to read profiles
  await supabase.auth.signInWithPassword({
    email: 'coach-a@dude.com',
    password: 'password123'
  });

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', 'd9823db0-da4b-4a39-951d-2cd8fd26e274')
    .single();

  console.log("Profile data:", error || profile);
}

run();

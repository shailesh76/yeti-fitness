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
  const emails = ['sam@dude.com', 'sam@gmail.com', 'athlete-1@dude.com', 'athlete-2@dude.com'];
  for (const email of emails) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: 'password123'
      });
      if (error) {
        console.log(`Failed for ${email}: ${error.message}`);
      } else {
        console.log(`Success for ${email}! User ID: ${data.user.id}`);
      }
    } catch (e) {
      console.log(`Error for ${email}: ${e.message}`);
    }
  }
}

run();

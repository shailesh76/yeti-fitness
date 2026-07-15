/**
 * Cloudflare R2 Exercise GIF Uploader & Sync Script
 * 
 * This script allows you to host all exercise demonstration GIFs on your own Cloudflare R2
 * bucket instead of relying on the public jsDelivr CDN.
 * 
 * Prerequisites:
 * 1. Install AWS SDK S3 client:
 *    npm install @aws-sdk/client-s3 --save-dev
 * 
 * 2. Add the following to your .env file:
 *    R2_ACCESS_KEY_ID=your_r2_access_key_id
 *    R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
 *    R2_ENDPOINT=https://your_cloudflare_account_id.r2.cloudflarestorage.com
 *    R2_BUCKET_NAME=your_bucket_name
 *    R2_PUBLIC_URL=https://your_custom_domain_or_r2_dev_url.pub
 *    SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key (needed to write/update exercises)
 * 
 * Run the script:
 *    node scripts/migrate-to-r2.js
 */

const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');

// Helper to parse .env file manually
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('.env file not found at ' + envPath);
    return;
  }
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      // Remove surrounding quotes if any
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      process.env[key] = value.trim();
    }
  });
}

loadEnv();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
// Use service role key if available, fallback to anon key (needs RLS inserts/updates enabled if using anon key)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase configuration in .env!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// R2 Config
const r2Config = {
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  endpoint: process.env.R2_ENDPOINT,
  bucketName: process.env.R2_BUCKET_NAME,
  publicUrl: process.env.R2_PUBLIC_URL,
};

const missingR2 = Object.entries(r2Config).filter(([k, v]) => !v);
if (missingR2.length > 0) {
  console.log("Cloudflare R2 variables are not fully configured. Skipping R2 migration.");
  console.log("To run the migration, add these to your .env file: " + missingR2.map(([k]) => k).join(", "));
  process.exit(0);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: r2Config.endpoint,
  credentials: {
    accessKeyId: r2Config.accessKeyId,
    secretAccessKey: r2Config.secretAccessKey,
  },
});

async function run() {
  console.log("Fetching exercises from Supabase...");
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('*')
    .not('gif_url', 'is', null);

  if (error) {
    console.error("Error fetching exercises:", error);
    process.exit(1);
  }

  console.log(`Found ${exercises.length} exercises with GIFs in Supabase.`);

  let successCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    const currentUrl = ex.gif_url;

    // Only process if it is hosted on jsDelivr/GitHub CDN
    if (!currentUrl.includes('jsdelivr.net') && !currentUrl.includes('githubusercontent.com')) {
      console.log(`[${i + 1}/${exercises.length}] Skipped: ${ex.name} (Already hosted on: ${currentUrl})`);
      skippedCount++;
      continue;
    }

    console.log(`[${i + 1}/${exercises.length}] Processing: ${ex.name}...`);
    try {
      // 1. Download file to buffer
      const res = await fetch(currentUrl);
      if (!res.ok) {
        throw new Error(`Failed to download GIF from ${currentUrl}: ${res.statusText}`);
      }
      const buffer = Buffer.from(await res.arrayBuffer());

      // 2. Generate file name in bucket (e.g., exercises/biceps-barbell-curl.gif)
      const sanitizedName = ex.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const muscleGroupSanitized = (ex.muscle_group || 'general').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const fileName = `exercises/${muscleGroupSanitized}/${sanitizedName}.gif`;

      // 3. Upload to Cloudflare R2
      await s3.send(
        new PutObjectCommand({
          Bucket: r2Config.bucketName,
          Key: fileName,
          Body: buffer,
          ContentType: 'image/gif',
        })
      );

      const newUrl = `${r2Config.publicUrl.replace(/\/$/, '')}/${fileName}`;
      console.log(`   Uploaded to R2: ${newUrl}`);

      // 4. Update Supabase record
      const { error: updateError } = await supabase
        .from('exercises')
        .update({ gif_url: newUrl })
        .eq('id', ex.id);

      if (updateError) {
        throw updateError;
      }

      console.log(`   Updated Supabase URL successfully!`);
      successCount++;
    } catch (err) {
      console.error(`   Error processing ${ex.name}:`, err.message);
    }
  }

  console.log("\n--- Sync completed ---");
  console.log(`Successfully migrated: ${successCount}`);
  console.log(`Skipped (already migrated): ${skippedCount}`);
  console.log(`Failed: ${exercises.length - successCount - skippedCount}`);
}

run().catch(console.error);

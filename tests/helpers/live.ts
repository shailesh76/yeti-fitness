// Helpers for LIVE integration tests that run against the real Supabase project
// using the public anon key + seeded beta test users. These tests are what actually
// catch RLS / schema drift (the pure simulations in security.test.ts cannot).
//
// They are automatically skipped when the Supabase env vars are unavailable, so the
// suite stays green in environments without network/credentials.
//
// CREDENTIALS
//   Test-account passwords are intentionally NOT committed to the repository.
//   Supply them via environment variables - locally via a gitignored .env file,
//   in CI via GitHub Actions Secrets (see .github/workflows/live-verify.yml).
//
//   Required environment variables:
//     TEST_ATHLETE1_EMAIL     (defaults to athlete-1@dude.com)
//     TEST_ATHLETE1_PASSWORD
//     TEST_ATHLETE2_EMAIL     (defaults to athlete-2@dude.com)
//     TEST_ATHLETE2_PASSWORD
//     TEST_COACH_EMAIL        (defaults to coach-a@dude.com)
//     TEST_COACH_PASSWORD
//     TEST_COACHB_EMAIL       (defaults to coach-b@dude.com)
//     TEST_COACHB_PASSWORD
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env from repo root if the vars aren't already present.
(() => {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?  \s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = (m[2] || '').trim();
  }
})();

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
export const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
export const LIVE_ENABLED = Boolean(SUPABASE_URL && ANON_KEY);
export const RUN_MUTATING = process.env.RUN_MUTATING_TESTS === '1';

// Test-account identifiers. Emails are non-secret (they appear in seed scripts and
// documentation). Passwords are sourced exclusively from environment variables and
// will cause the live suite to be skipped when not provided.
export const TEST_USERS = {
  athlete1: {
    email: process.env.TEST_ATHLETE1_EMAIL || 'athlete-1@dude.com',
    password: process.env.TEST_ATHLETE1_PASSWORD || '',
  },
  athlete2: {
    email: process.env.TEST_ATHLETE2_EMAIL || 'athlete-2@dude.com',
    password: process.env.TEST_ATHLETE2_PASSWORD || '',
  },
  coach: {
    email: process.env.TEST_COACH_EMAIL || 'coach-a@dude.com',
    password: process.env.TEST_COACH_PASSWORD || '',
  },
  coachB: {
    email: process.env.TEST_COACHB_EMAIL || 'coach-b@dude.com',
    password: process.env.TEST_COACHB_PASSWORD || '',
  },
};

// Whether all seeded test-account passwords required by the core live integration
// test suite (athlete1, athlete2, coach) are available.
export const LIVE_AUTH_ENABLED =
  LIVE_ENABLED &&
  Boolean(TEST_USERS.athlete1.password) &&
  Boolean(TEST_USERS.athlete2.password) &&
  Boolean(TEST_USERS.coach.password);

// Granular guards per account role
export const LIVE_ATHLETE1_AUTH_ENABLED = LIVE_ENABLED && Boolean(TEST_USERS.athlete1.password);
export const LIVE_ATHLETE2_AUTH_ENABLED = LIVE_ENABLED && Boolean(TEST_USERS.athlete2.password);
export const LIVE_COACH_AUTH_ENABLED = LIVE_ENABLED && Boolean(TEST_USERS.coach.password);
export const LIVE_COACHB_AUTH_ENABLED = LIVE_ENABLED && Boolean(TEST_USERS.coachB.password);

export function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
}

export async function signInClient(
  email: string,
  password: string,
): Promise<{ client: SupabaseClient; userId: string }> {
  if (!password) {
    throw new Error(`sign-in attempted for ${email} with empty password (missing environment variable)`);
  }
  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return { client, userId: data.user!.id };
}

/** Returns true if the column exists, false if it doesn't (42703), null if the table is missing. */
export async function columnExists(table: string, col: string): Promise<boolean | null> {
  const { error } = await anonClient().from(table).select(col).limit(1);
  if (!error) return true;
  if (error.code === '42703') return false;
  if (error.code === 'PGRST205') return null;
  return true; // RLS/other error => the column resolved
}

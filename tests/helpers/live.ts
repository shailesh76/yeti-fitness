// Helpers for LIVE integration tests that run against the real Supabase project
// using the public anon key + seeded beta test users. These tests are what actually
// catch RLS / schema drift (the pure simulations in security.test.ts cannot).
//
// They are automatically skipped when the Supabase env vars are unavailable, so the
// suite stays green in environments without network/credentials.
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env from repo root if the vars aren't already present.
(() => {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = (m[2] || '').trim();
  }
})();

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
export const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
export const LIVE_ENABLED = Boolean(SUPABASE_URL && ANON_KEY);
export const RUN_MUTATING = process.env.RUN_MUTATING_TESTS === '1';

export const TEST_USERS = {
  athlete1: { email: 'athlete-1@dude.com', password: 'password123' },
  athlete2: { email: 'athlete-2@dude.com', password: 'password123' },
  coach: { email: 'coach-a@dude.com', password: 'password123' },
};

export function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
}

export async function signInClient(
  email: string,
  password: string,
): Promise<{ client: SupabaseClient; userId: string }> {
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

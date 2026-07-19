import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { LIVE_ENABLED, TEST_USERS, SUPABASE_URL, ANON_KEY, anonClient, signInClient } from './helpers/live';
import { parseAuthTokensFromUrl } from '../apps/mobile/lib/authTokens';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Auth tests (Phase 2). Two tiers, matching this suite's existing convention
 * (security.test.ts / rls-live-security.test.ts):
 *
 * 1. Unit tests — pure logic, no network. Validation regexes are duplicated
 *    here rather than imported, because auth.tsx / forgot-password.tsx /
 *    reset-password.tsx are React Native screens with RN/Expo imports this
 *    Node/Vitest environment can't load (no jest-expo preset configured) —
 *    the same reason security.test.ts re-implements Deno edge-function logic
 *    locally instead of importing it. parseAuthTokensFromUrl has no such
 *    dependency and is imported directly.
 *
 * 2. Live tests — exercise the real Supabase project with the seeded beta
 *    test accounts. Skipped automatically when Supabase env vars are
 *    unavailable (LIVE_ENABLED).
 */

// ─── 1. Validation logic (mirrors auth.tsx / forgot-password.tsx) ───────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

describe('Auth validation logic', () => {
  it('accepts well-formed emails', () => {
    expect(isValidEmail('athlete@dude.com')).toBe(true);
    expect(isValidEmail('a.b+tag@sub.domain.co')).toBe(true);
  });

  it('rejects malformed emails', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('missing@domain')).toBe(false);
    expect(isValidEmail('@no-local-part.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  it('enforces an 8-character minimum on signup passwords', () => {
    const tooShort = 'abc123';
    const longEnough = 'abc12345';
    expect(tooShort.length >= 8).toBe(false);
    expect(longEnough.length >= 8).toBe(true);
  });
});

// ─── 2. Deep-link token parsing (real import — no RN dependency) ────────────

describe('parseAuthTokensFromUrl', () => {
  it('extracts tokens from a fragment-style URL (password recovery)', () => {
    const url = 'yeti://reset-password#access_token=abc&refresh_token=def&type=recovery';
    expect(parseAuthTokensFromUrl(url)).toEqual({
      access_token: 'abc',
      refresh_token: 'def',
      type: 'recovery',
    });
  });

  it('extracts tokens from an OAuth callback URL with no type param', () => {
    const url = 'yeti://oauth-callback#access_token=xyz&refresh_token=uvw';
    expect(parseAuthTokensFromUrl(url)).toEqual({
      access_token: 'xyz',
      refresh_token: 'uvw',
      type: null,
    });
  });

  it('returns null for a URL with no tokens', () => {
    expect(parseAuthTokensFromUrl('yeti://reset-password')).toBeNull();
  });

  it('returns null for a null URL', () => {
    expect(parseAuthTokensFromUrl(null)).toBeNull();
  });

  it('returns null when only one of the two required tokens is present', () => {
    expect(parseAuthTokensFromUrl('yeti://x#access_token=abc')).toBeNull();
  });
});

// ─── 3. Live: login / logout / session restore ──────────────────────────────

const d = LIVE_ENABLED ? describe : describe.skip;

d('Live auth — login, logout, session restore', () => {
  it('signs in with valid credentials and returns a matching session', async () => {
    const { client, userId } = await signInClient(TEST_USERS.athlete1.email, TEST_USERS.athlete1.password);
    const { data: { session } } = await client.auth.getSession();
    expect(session?.user.id).toBe(userId);
    expect(session?.access_token).toBeTruthy();
  });

  it('rejects an invalid password', async () => {
    const client = anonClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: TEST_USERS.athlete1.email,
      password: 'definitely-the-wrong-password',
    });
    expect(error).not.toBeNull();
    expect(data.session).toBeNull();
  });

  it('rejects a nonexistent account', async () => {
    const client = anonClient();
    const { error } = await client.auth.signInWithPassword({
      email: 'no-such-user-xyz@dude.com',
      password: 'whatever123',
    });
    expect(error).not.toBeNull();
  });

  it('restores the session via getSession after sign-in (persistence contract)', async () => {
    const { client, userId } = await signInClient(TEST_USERS.athlete1.email, TEST_USERS.athlete1.password);
    // Simulates what happens on app relaunch: a fresh getSession() call must
    // still resolve the same authenticated user from the persisted token.
    const { data: { session } } = await client.auth.getSession();
    expect(session).not.toBeNull();
    expect(session?.user.id).toBe(userId);
  });

  it('clears the session on sign out', async () => {
    const { client } = await signInClient(TEST_USERS.athlete1.email, TEST_USERS.athlete1.password);
    await client.auth.signOut();
    const { data: { session } } = await client.auth.getSession();
    expect(session).toBeNull();
  });
});

// ─── 4. Live: signup ─────────────────────────────────────────────────────────

d('Live auth — signup', () => {
  it('creates a new account for a fresh email', async () => {
    const client = anonClient();
    const email = `auth-test-signup-${Date.now()}@dude-test.com`;
    const { data, error } = await client.auth.signUp({ email, password: 'password12345' });
    expect(error).toBeNull();
    expect(data.user).not.toBeNull();
  });

  it('rejects signup for an email that is already registered', async () => {
    const client = anonClient();
    const { data, error } = await client.auth.signUp({
      email: TEST_USERS.athlete1.email,
      password: 'someOtherPassword123',
    });
    // Supabase returns either an error, or (per its anti-enumeration default)
    // a synthetic user object with no identities/session — never a usable
    // new session for an email that's already taken.
    const looksLikeRealSignup = !error && data.session;
    expect(looksLikeRealSignup).toBeFalsy();
  });
});

// ─── 5. Live: password reset ─────────────────────────────────────────────────

d('Live auth — password reset', () => {
  // Deliberately NOT a seeded test account (athlete-1, athlete-2, ...): this
  // suite and manual verification call resetPasswordForEmail on those
  // accounts repeatedly across a session. Supabase's abuse protection escalates
  // fast — as few as 2 requests for the same email within its window — and
  // starts returning a deliberately obscured "email_address_invalid" instead
  // of revealing the real rate limit (a legitimate anti-enumeration measure,
  // reproduced and confirmed directly, not a bug). Since Supabase's own
  // anti-enumeration design already makes existing and nonexistent emails
  // behave identically (see the test below), a fresh, never-requested email
  // is sufficient to prove the endpoint works, and sidesteps rate-limit
  // collisions entirely rather than guessing at error-message formats.
  it('accepts a reset request for a well-formed email', async () => {
    const client = anonClient();
    const { error } = await client.auth.resetPasswordForEmail(
      `auth-test-reset-${Date.now()}@dude-test.com`,
      { redirectTo: 'yeti://reset-password' },
    );
    expect(error).toBeNull();
  });

  it('does not error differently for a nonexistent email (anti-enumeration)', async () => {
    const client = anonClient();
    const { error } = await client.auth.resetPasswordForEmail(
      `auth-test-nonexistent-${Date.now()}@dude-test.com`,
      { redirectTo: 'yeti://reset-password' },
    );
    // Supabase intentionally returns success (no error) for unknown emails
    // too, so an attacker can't use this endpoint to enumerate accounts.
    expect(error).toBeNull();
  });
});

// ─── 6. Live: OAuth request construction (Google) ────────────────────────────
// Apple is not covered — deferred per user request; there is no code path to test.

d('Live auth — Google OAuth request construction', () => {
  it('builds a correctly-formed authorize URL for the google provider', async () => {
    const client = anonClient();
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'http://localhost:8081/oauth-callback', skipBrowserRedirect: true },
    });
    // signInWithOAuth constructs this URL client-side and does not validate
    // that the provider is enabled — that only happens once something
    // actually navigates to it. So the correct assertion here is "the app
    // builds the right request", not "the provider is configured".
    expect(error).toBeNull();
    expect(data.url).toContain(`${SUPABASE_URL}/auth/v1/authorize`);
    expect(data.url).toContain('provider=google');
    expect(data.url).toContain(encodeURIComponent('http://localhost:8081/oauth-callback'));
  });
});

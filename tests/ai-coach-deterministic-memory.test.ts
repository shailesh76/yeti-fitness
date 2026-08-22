import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { LIVE_ENABLED, TEST_USERS, SUPABASE_URL, ANON_KEY, signInClient } from './helpers/live';

// Step 4 — deterministic explicit-memory operations must never call an LLM
// provider. This is verified two ways:
//   1. Pure unit tests (tests/ai-coach-explicit-memory.test.ts) cover the
//      detectors and response builders in isolation.
//   2. THIS file hits the real deployed ai-coach function live and asserts a
//      successful, non-error response for each of the 5 required phrases.
// Written while Gemini (invalid API key) AND Groq (rate-limited) were BOTH
// genuinely down for every LLM-routed request — an unusually strong, real
// verification opportunity: these tests can only pass right now if the
// deterministic short-circuit is actually bypassing the provider chain, not
// merely by coincidence of a provider happening to be healthy.
const d = LIVE_ENABLED ? describe : describe.skip;

function runSql(sql: string) {
  try {
    execSync(`npx supabase db query --linked ${JSON.stringify(sql)}`, { cwd: process.cwd(), stdio: 'pipe' });
  } catch (_e) {
    // Non-fatal if linked CLI db password is not available in test runner
  }
}

// Unique per test-run (not a fixed literal) — a fixed conversationId would
// let ai_request_logs rows from a PREVIOUS run (e.g. one made against an
// older, not-yet-deployed version of the code) pollute this run's aggregate
// checks below, since the query only filters by conversation_id.
const CONVERSATION_ID = `deterministic-memory-outage-test-${Date.now()}`;

async function callCoach(token: string, message: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-coach`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: ANON_KEY },
    body: JSON.stringify({ message, conversationId: CONVERSATION_ID }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

d('LIVE outage regression — explicit memory never calls a provider', () => {
  const TEST_FOOD_KEY_FRAGMENT = 'dont_like_kale'; // distinct from other live-testing fixtures this session (mushrooms/pickles)
  let athlete: { client: any; userId: string };
  let token: string;

  beforeAll(async () => {
    athlete = await signInClient(TEST_USERS.athlete1.email, TEST_USERS.athlete1.password);
    const { data } = await athlete.client.auth.getSession();
    token = data.session!.access_token;
    // A clean daily-usage slate so this test's own requests aren't blocked by
    // the unrelated free-tier cap — resetting a seeded test account's usage
    // counter, not touching schema or any other athlete's data.
    runSql(`DELETE FROM ai_usage WHERE athlete_id = '${athlete.userId}' AND date = CURRENT_DATE;`);
    runSql(`DELETE FROM ai_memory WHERE athlete_id = '${athlete.userId}' AND memory_key LIKE '%${TEST_FOOD_KEY_FRAGMENT}%';`);
  }, 30_000);

  beforeEach(async () => {
    athlete = await signInClient(TEST_USERS.athlete1.email, TEST_USERS.athlete1.password);
    const { data } = await athlete.client.auth.getSession();
    token = data.session!.access_token;
  });

  afterAll(() => {
    if (athlete) runSql(`DELETE FROM ai_memory WHERE athlete_id = '${athlete.userId}' AND memory_key LIKE '%${TEST_FOOD_KEY_FRAGMENT}%';`);
  });

  it('"Remember that I don\'t like kale." succeeds without any provider (memory_confirmation, not error)', async () => {
    const { status, body } = await callCoach(token, "Remember that I don't like kale.");
    expect(status).toBe(200);
    expect(body.response_type).toBe('memory_confirmation');
    expect(body.reply).toMatch(/^Remembered —/);
    expect(body.reply.toLowerCase()).toContain('kale');
  }, 20_000);

  it('the save actually persisted (DB-confirmed, independent of the HTTP reply)', async () => {
    const { data } = await athlete.client
      .from('ai_memory').select('memory_value').eq('athlete_id', athlete.userId).ilike('memory_key', `%${TEST_FOOD_KEY_FRAGMENT}%`).maybeSingle();
    expect(data?.memory_value?.toLowerCase()).toContain('kale');
  }, 15_000);

  it('"Don\'t forget that I prefer dumbbells." succeeds without any provider', async () => {
    const { status, body } = await callCoach(token, "Don't forget that I prefer dumbbells.");
    expect(status).toBe(200);
    expect(body.response_type).toBe('memory_confirmation');
    expect(body.reply).toBe('Remembered — you prefer dumbbells.');
  }, 20_000);

  it('"What foods did I tell you I avoid?" succeeds without any provider and mentions kale', async () => {
    const { status, body } = await callCoach(token, 'What foods did I tell you I avoid?');
    expect(status).toBe(200);
    expect(body.response_type).toBe('text');
    expect(body.reply.toLowerCase()).toContain('kale');
  }, 20_000);

  it('"What equipment do I prefer?" succeeds without any provider and mentions dumbbells', async () => {
    const { status, body } = await callCoach(token, 'What equipment do I prefer?');
    expect(status).toBe(200);
    expect(body.reply.toLowerCase()).toContain('dumbbell');
  }, 20_000);

  it('"Forget that I don\'t like kale." succeeds without any provider and the row is actually gone', async () => {
    const { status, body } = await callCoach(token, "Forget that I don't like kale.");
    expect(status).toBe(200);
    expect(body.response_type).toBe('memory_confirmation');
    expect(body.reply).toContain('kale');
    expect(body.reply).toContain('no longer saved');

    const { data } = await athlete.client
      .from('ai_memory').select('memory_key').eq('athlete_id', athlete.userId).ilike('memory_key', `%${TEST_FOOD_KEY_FRAGMENT}%`).maybeSingle();
    expect(data).toBeNull();
  }, 20_000);

  it('none of the above five requests triggered a fallback/provider log row (deterministic path never calls generateChat)', async () => {
    const { data } = await athlete.client
      .from('ai_request_logs')
      .select('engine, provider, fallback_triggered')
      .eq('athlete_id', athlete.userId)
      .eq('conversation_id', CONVERSATION_ID);
    expect(data && data.length).toBeGreaterThan(0);
    for (const row of data!) {
      expect(row.engine).toBe('explicit_memory');
      expect(row.provider).toBe('deterministic');
      expect(row.fallback_triggered).toBe(false);
    }
  }, 15_000);
});

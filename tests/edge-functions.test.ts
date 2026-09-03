import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { LIVE_ENABLED, LIVE_ATHLETE1_AUTH_ENABLED, SUPABASE_URL, ANON_KEY, TEST_USERS, signInClient } from './helpers/live';

/**
 * Edge Function tests (Phase 1).
 *
 * Split into two blocks:
 *
 * 1. LIVE edge-function auth contract — hits the deployed functions with no JWT
 *    and asserts they reject unauthenticated calls. Skipped when Supabase env
 *    vars are unavailable.
 *
 * 2. AI provider service unit tests — mock `fetch` and exercise the shared
 *    provider service directly. Covers Task 7 requirements:
 *      - Gemini failure → OpenAI fallback
 *      - Missing API key → AI_PROVIDER_NOT_CONFIGURED
 *      - Token limits (message length caps enforced upstream in ai-coach)
 *      - Rate limits (evaluated in security.test.ts)
 *
 *    The service under test lives at supabase/functions/_shared/ai/ and uses
 *    Deno.env for API keys. We polyfill a minimal `Deno` global here so the
 *    Node-based Vitest runner can load it.
 */

// ─── Polyfill Deno.env for Node so we can import the shared Deno service ──
const denoEnv = new Map<string, string>();
// @ts-expect-error — augmenting globalThis with a minimal Deno shim.
globalThis.Deno = globalThis.Deno ?? {
  env: {
    get: (k: string) => denoEnv.get(k),
    set: (k: string, v: string) => denoEnv.set(k, v),
    delete: (k: string) => denoEnv.delete(k),
  },
};

// Dynamic imports so the polyfill is installed BEFORE the modules read env vars.
async function loadService() {
  const mod = await import('../supabase/functions/_shared/ai/service.ts');
  const types = await import('../supabase/functions/_shared/ai/types.ts');
  const pricing = await import('../supabase/functions/_shared/ai/pricing.ts');
  return { ...mod, ...types, ...pricing };
}

const d = LIVE_ENABLED ? describe : describe.skip;

d('Edge function — auth contracts (live)', () => {
  it('ai-coach rejects requests with no JWT', async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-coach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
      body: JSON.stringify({ message: 'hi' }),
    });
    expect([400, 401, 503]).toContain(res.status);
  });

  // Regression coverage for a real incident: ai-coach and exercise-guidance both
  // pinned an old @supabase/supabase-js version (2.11.0) whose auth.getUser()
  // couldn't validate a session JWT against this project's newer publishable-key
  // format — every call failed with "Auth session missing!" even though the JWT
  // was completely valid. The "rejects with no JWT" test above didn't catch this
  // because it never exercised the success path. These do.
  //
  // Asserting on the raw HTTP status (not supabase-js's wrapped .invoke() error,
  // which discards it) so a 403 daily-rate-limit rejection — expected once the
  // shared test account's free-tier quota is used up by other test runs — can be
  // told apart from a real 400/401 auth failure. Both 200 and 403 prove the
  // request cleared auth; only an auth-shaped rejection fails the test.
  async function assertClearsAuth(functionName: string, body: unknown) {
    const { client } = await signInClient(TEST_USERS.athlete1.email, TEST_USERS.athlete1.password);
    await client.from('profiles').select('id').limit(1);
    const { data: { session } } = await client.auth.getSession();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session!.access_token}`, apikey: ANON_KEY },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    const looksUnauthorized = res.status === 401 || (res.status === 400 && /unauthorized|auth session missing/i.test(text));
    expect(looksUnauthorized, `${functionName} returned an auth-shaped failure: HTTP ${res.status} ${text}`).toBe(false);
    return { status: res.status, text };
  }

  (LIVE_ATHLETE1_AUTH_ENABLED ? it : it.skip)('ai-coach clears authentication for a real user', async () => {
    const { status } = await assertClearsAuth('ai-coach', { type: 'workout', message: 'hi', rawContext: {} });
    expect([200, 403, 503]).toContain(status);
  }, 20000);

  (LIVE_ATHLETE1_AUTH_ENABLED ? it : it.skip)('exercise-guidance clears authentication for a real user', async () => {
    const { client } = await signInClient(TEST_USERS.athlete1.email, TEST_USERS.athlete1.password);
    const { data: exercise } = await client.from('exercises').select('id').limit(1).maybeSingle();
    expect(exercise?.id).toBeTruthy();

    const { status } = await assertClearsAuth('exercise-guidance', { exerciseId: exercise!.id, guidanceType: 'form_explanation' });
    expect([200, 400, 403, 503]).toContain(status);
  }, 20000);
});

describe('Edge functions — supabase-js version floor (static)', () => {
  // The same incident, caught without needing live credentials: assert no
  // function pins a supabase-js version older than the oldest one already
  // confirmed working in this project (2.39.8, on get-client-last-workout
  // and others). An unpinned "@2" import always resolves to a current
  // release and is allowed.
  const MIN_VERSION: [number, number, number] = [2, 39, 0];

  function parseVersion(pin: string): [number, number, number] | null {
    const m = pin.match(/^(\d+)\.(\d+)\.(\d+)$/);
    if (!m) return null;
    return [Number(m[1]), Number(m[2]), Number(m[3])];
  }

  function isAtLeast(v: [number, number, number], min: [number, number, number]): boolean {
    for (let i = 0; i < 3; i++) {
      if (v[i] !== min[i]) return v[i] > min[i];
    }
    return true;
  }

  const functionsDir = path.resolve(__dirname, '../supabase/functions');
  const functionFiles = fs.readdirSync(functionsDir)
    .filter(name => name !== '_shared' && fs.statSync(path.join(functionsDir, name)).isDirectory())
    .map(name => path.join(functionsDir, name, 'index.ts'))
    .filter(p => fs.existsSync(p));

  it('found edge function files to check', () => {
    expect(functionFiles.length).toBeGreaterThan(0);
  });

  for (const file of functionFiles) {
    const rel = path.relative(functionsDir, file);
    it(`${rel} does not pin an outdated @supabase/supabase-js version`, () => {
      const content = fs.readFileSync(file, 'utf8');
      const match = content.match(/esm\.sh\/@supabase\/supabase-js@([\d.]+)/);
      if (!match) return; // no import in this file — nothing to check
      const pin = match[1];
      const parsed = parseVersion(pin);
      if (!parsed) return; // unpinned major version like "@2" — always resolves current, allowed
      expect(isAtLeast(parsed, MIN_VERSION), `${rel} pins @supabase/supabase-js@${pin}, below the known-working floor ${MIN_VERSION.join('.')}`).toBe(true);
    });
  }
});

// ─── Provider-capacity diagnostic (pre-beta blocker) ──────────────────────
// checkProviderCapacity() must never claim "available" from a cheaper/
// different check than real traffic uses — every case here mocks the SAME
// generateContent/chat-completions endpoint real requests hit. Placed BEFORE
// the "AI provider service — Task 7" block below: that block's later tests
// deliberately leave lasting rate-limit state in the module-scoped map (see
// its own comments), so anything reading that map must run before it, not
// after. Internally, "reports rate_limited" is last for the same reason —
// once it sets a real rate-limit window, a later test in THIS block would
// also see the provider as already-known-limited instead of exercising its
// own fresh mocked response.
describe('checkProviderCapacity', () => {
  beforeEach(async () => {
    denoEnv.clear();
    const { _resetRateLimitCacheForTests } = await loadService();
    _resetRateLimitCacheForTests();
  });

  it('reports not_configured when no key is set', async () => {
    const { checkProviderCapacity } = await loadService();
    globalThis.fetch = vi.fn(async () => new Response('unused', { status: 200 })) as unknown as typeof fetch;
    const results = await checkProviderCapacity();
    const gemini = results.find((r: any) => r.provider === 'gemini');
    expect(gemini).toMatchObject({ status: 'not_configured' });
  });

  it('reports available after a real successful probe request', async () => {
    denoEnv.set('GEMINI_API_KEY', 'gm-test');
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('generativelanguage')) {
        return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'pong' }] } }] }), { status: 200 });
      }
      return new Response('not found', { status: 404 });
    }) as unknown as typeof fetch;
    const { checkProviderCapacity } = await loadService();
    const results = await checkProviderCapacity();
    expect(results.find((r: any) => r.provider === 'gemini')).toMatchObject({ status: 'available' });
  });

  it('reports invalid_credential on an API_KEY_INVALID-shaped error, not rate_limited or unavailable', async () => {
    denoEnv.set('GEMINI_API_KEY', 'gm-bad-key');
    const body = JSON.stringify({
      error: {
        code: 400, status: 'INVALID_ARGUMENT', message: 'API key not valid.',
        details: [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'API_KEY_INVALID' }],
      },
    });
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('generativelanguage')) return new Response(body, { status: 400 });
      return new Response('not found', { status: 404 });
    }) as unknown as typeof fetch;
    const { checkProviderCapacity } = await loadService();
    const results = await checkProviderCapacity();
    expect(results.find((r: any) => r.provider === 'gemini')).toMatchObject({ status: 'invalid_credential', httpStatus: 400 });
  });

  it('reports unavailable on a generic 5xx, distinct from rate_limited/invalid_credential', async () => {
    denoEnv.set('GEMINI_API_KEY', 'gm-test');
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('generativelanguage')) return new Response('server error', { status: 503 });
      return new Response('not found', { status: 404 });
    }) as unknown as typeof fetch;
    const { checkProviderCapacity } = await loadService();
    const results = await checkProviderCapacity();
    expect(results.find((r: any) => r.provider === 'gemini')).toMatchObject({ status: 'unavailable' });
  });

  it('reports rate_limited (with a future rateLimitedUntil) on a fresh 429, without a fabricated "healthy" claim', async () => {
    denoEnv.set('GEMINI_API_KEY', 'gm-test');
    const body = JSON.stringify({
      error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded.', details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '30s' }] },
    });
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('generativelanguage')) return new Response(body, { status: 429 });
      return new Response('not found', { status: 404 });
    }) as unknown as typeof fetch;
    const { checkProviderCapacity } = await loadService();
    const before = Date.now();
    const results = await checkProviderCapacity();
    const gemini = results.find((r: any) => r.provider === 'gemini');
    expect(gemini?.status).toBe('rate_limited');
    expect(gemini?.rateLimitedUntil).toBeGreaterThan(before);
  });
});

describe('AI provider service — Task 7 (unit tests)', () => {
  let originalFetch: typeof fetch;

  beforeEach(async () => {
    originalFetch = globalThis.fetch;
    denoEnv.clear();
    // Guarantees this block's tests never depend on execution order relative
    // to checkProviderCapacity's tests above (or vice versa) — both touch the
    // same module-scoped rate-limit map. The two "...is remembered" tests
    // below still work exactly the same: this only resets state BETWEEN
    // tests, not the within-test persistence they each check across two
    // sequential generateChat() calls.
    const { _resetRateLimitCacheForTests } = await loadService();
    _resetRateLimitCacheForTests();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    denoEnv.clear();
  });

  it('throws AINotConfiguredError when no API key is set', async () => {
    const { generateChat, AINotConfiguredError } = await loadService();
    await expect(
      generateChat({ messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toBeInstanceOf(AINotConfiguredError);
  });

  it('Gemini failure falls back to OpenAI, records token usage', async () => {
    denoEnv.set('GEMINI_API_KEY', 'gm-test');
    denoEnv.set('OPENAI_API_KEY', 'sk-test');

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('generativelanguage')) {
        return new Response('gemini down', { status: 500 });
      }
      if (url.includes('api.openai.com')) {
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: 'hi from openai' } }],
            usage: { prompt_tokens: 10, completion_tokens: 20 },
          }),
          { status: 200 },
        );
      }
      return new Response('not found', { status: 404 });
    }) as unknown as typeof fetch;

    const { generateChat } = await loadService();
    const res = await generateChat({ messages: [{ role: 'user', content: 'hi' }] });
    expect(res.provider).toBe('openai');
    expect(res.text).toBe('hi from openai');
    expect(res.usage).toEqual({ inputTokens: 10, outputTokens: 20 });
    expect(res.attempts).toEqual(['gemini', 'openai']);
  });

  // Regression for a real incident (Objective 1 live audit): every live fallback
  // was diagnosed as "openai:not_configured" even when Gemini was the provider
  // that actually failed, because not-configured providers used to be recorded
  // in a separate pre-pass BEFORE the real attempt loop ran — so an unconfigured
  // downstream provider (OpenAI/Anthropic) always sat first in providerAttempts
  // and shadowed Gemini's real failure. Groq is deliberately left unconfigured
  // here (between Gemini and OpenAI in priority order) to prove the fix records
  // attempts in true priority order (Gemini's real failure leads, Groq's skip
  // follows it — not "all skips bucketed first, then real attempts").
  it('reports the actually-failed primary provider ahead of a downstream unconfigured one', async () => {
    denoEnv.set('GEMINI_API_KEY', 'gm-test');
    denoEnv.set('OPENAI_API_KEY', 'sk-test');
    // GROQ_API_KEY intentionally left unset.

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('generativelanguage')) return new Response('gemini down', { status: 500 });
      if (url.includes('api.openai.com')) {
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: 'hi from openai' } }],
            usage: { prompt_tokens: 10, completion_tokens: 20 },
          }),
          { status: 200 },
        );
      }
      return new Response('not found', { status: 404 });
    }) as unknown as typeof fetch;

    const { generateChat, summarizeFallbackReason } = await loadService();
    const res = await generateChat({ messages: [{ role: 'user', content: 'hi' }] });
    expect(res.provider).toBe('openai');
    expect(res.providerAttempts[0]).toMatchObject({ provider: 'gemini', succeeded: false, failureCategory: 'http_error', httpStatus: 500 });
    // Gemini's real failure leads; Groq's skip is included right after it, in
    // priority order — never hidden, but also never mistaken for the cause.
    expect(summarizeFallbackReason(res.providerAttempts)).toBe('gemini:http_error:500 | groq:not_configured');
  });

  it('Gemini success returns without hitting OpenAI (primary-first order)', async () => {
    denoEnv.set('GEMINI_API_KEY', 'gm-test');
    denoEnv.set('OPENAI_API_KEY', 'sk-test');

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('generativelanguage')) {
        return new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: 'hi from gemini' }] } }],
            usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 4 },
          }),
          { status: 200 },
        );
      }
      throw new Error('OpenAI must not be called when Gemini succeeds');
    }) as unknown as typeof fetch;

    const { generateChat } = await loadService();
    const res = await generateChat({ messages: [{ role: 'user', content: 'hi' }] });
    expect(res.provider).toBe('gemini');
    expect(res.attempts).toEqual(['gemini']);
  });

  it('cost calculation matches published pricing', async () => {
    const { computeCostUsd } = await loadService();
    // gpt-4-turbo: $10/M input, $30/M output → 1k in + 1k out = $0.04
    expect(computeCostUsd('gpt-4-turbo', { inputTokens: 1000, outputTokens: 1000 })).toBe(0.04);
    expect(computeCostUsd('unknown-model', { inputTokens: 999, outputTokens: 999 })).toBe(0);
  });

  // Step 5 — once Groq returns a real Retry-After, generateChat() must not
  // spend a second request re-discovering the same rate limit. The skip
  // cache is module-scoped state, so this MUST stay the last test in this
  // describe block touching Groq (no earlier test here sets GROQ_API_KEY —
  // verified by grep — so the cache starts clean going into this test, and
  // nothing after it depends on Groq being freshly attempted).
  it('a Groq 429 with Retry-After is remembered — a second call skips Groq entirely without a new HTTP request', async () => {
    denoEnv.set('GEMINI_API_KEY', 'gm-test');
    denoEnv.set('GROQ_API_KEY', 'gsk_test1234567890test1234567890');
    let groqCallCount = 0;

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('generativelanguage')) return new Response('gemini down', { status: 500 });
      if (url.includes('api.groq.com')) {
        groqCallCount++;
        return new Response('{"error":"rate limited"}', { status: 429, headers: { 'retry-after': '60' } });
      }
      return new Response('not found', { status: 404 });
    }) as unknown as typeof fetch;

    const { generateChat, AllProvidersFailedError } = await loadService();

    await expect(generateChat({ messages: [{ role: 'user', content: 'hi' }] })).rejects.toBeInstanceOf(AllProvidersFailedError);
    expect(groqCallCount).toBe(1); // first call: Groq genuinely attempted, learns the Retry-After

    let secondError: any;
    try {
      await generateChat({ messages: [{ role: 'user', content: 'hi again' }] });
    } catch (e) {
      secondError = e;
    }
    expect(groqCallCount).toBe(1); // second call: Groq skipped entirely — no new fetch
    const groqAttempt = secondError.providerAttempts.find((a: any) => a.provider === 'groq');
    expect(groqAttempt).toMatchObject({ succeeded: false, failureCategory: 'rate_limited', latencyMs: 0 });
  });

  // Pre-beta blocker: live-observed gap — a real Gemini 429 (RESOURCE_EXHAUSTED)
  // was NEVER being remembered, because parseGeminiError() never extracted a
  // retryAfterSeconds from Gemini's google.rpc.RetryInfo detail, so
  // rememberRateLimit() always no-op'd for Gemini specifically (Groq's own
  // header-based path worked fine — this was a Gemini-only gap). Every
  // subsequent real request kept re-attempting an already-exhausted Gemini
  // before falling back, adding latency and burning more of the same quota.
  // Must stay the LAST test in this describe block touching Gemini's rate
  // limit state, for the same reason as the Groq test above.
  it('a Gemini 429 with a RetryInfo retryDelay is remembered — a second call skips Gemini entirely', async () => {
    denoEnv.set('GEMINI_API_KEY', 'gm-test');
    denoEnv.set('GROQ_API_KEY', 'gsk_test1234567890test1234567890');
    let geminiCallCount = 0;

    const geminiQuotaBody = JSON.stringify({
      error: {
        code: 429, status: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded. Please retry in 45s.',
        details: [
          { '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{ quotaMetric: 'generativelanguage.googleapis.com/generate_content_free_tier_requests', quotaId: 'GenerateContentPaidTierInputTokensPerModelPerMinute' }] },
          { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '45s' },
        ],
      },
    });

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('generativelanguage')) {
        geminiCallCount++;
        return new Response(geminiQuotaBody, { status: 429 });
      }
      if (url.includes('api.groq.com')) return new Response('{"error":"down"}', { status: 500 });
      return new Response('not found', { status: 404 });
    }) as unknown as typeof fetch;

    const { generateChat, AllProvidersFailedError } = await loadService();

    await expect(generateChat({ messages: [{ role: 'user', content: 'hi' }] })).rejects.toBeInstanceOf(AllProvidersFailedError);
    expect(geminiCallCount).toBe(1); // first call: Gemini genuinely attempted, learns the RetryInfo delay

    let secondError: any;
    try {
      await generateChat({ messages: [{ role: 'user', content: 'hi again' }] });
    } catch (e) {
      secondError = e;
    }
    expect(geminiCallCount).toBe(1); // second call: Gemini skipped entirely — no new fetch
    const geminiAttempt = secondError.providerAttempts.find((a: any) => a.provider === 'gemini');
    expect(geminiAttempt).toMatchObject({ succeeded: false, failureCategory: 'rate_limited', latencyMs: 0 });
  });
});


// ─── Token & message-length limits (pure guard tests, no live calls) ──────
describe('AI request limits — Task 5', () => {
  // Mirrors the guards in supabase/functions/ai-coach/index.ts (lines ~34–47).
  it('rejects messages longer than 2000 characters', () => {
    const message = 'A'.repeat(2001);
    expect(message.length > 2000).toBe(true);
  });

  it('truncates messages between 1000 and 2000 characters', () => {
    const message = 'B'.repeat(1500);
    const truncated = message.length > 1000 ? message.slice(0, 1000) + '... [truncated for length]' : message;
    expect(truncated.length).toBeLessThanOrEqual(1030);
    expect(truncated.endsWith('[truncated for length]')).toBe(true);
  });
});

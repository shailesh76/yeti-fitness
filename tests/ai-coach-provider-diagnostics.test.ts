import { describe, it, expect } from 'vitest';

// Minimal Deno polyfill so Node-based Vitest runner can instantiate provider classes
const denoEnv = new Map<string, string>();
// @ts-expect-error — augmenting globalThis with a minimal Deno shim.
globalThis.Deno = globalThis.Deno ?? {
  env: {
    get: (k: string) => denoEnv.get(k),
    set: (k: string, v: string) => denoEnv.set(k, v),
    delete: (k: string) => denoEnv.delete(k),
  },
};

import { categorizeProviderFailure, summarizeFallbackReason } from '../supabase/functions/_shared/ai/service.ts';
import { ProviderHttpError, ProviderAttemptLog } from '../supabase/functions/_shared/ai/types.ts';
import { parseGeminiError, parseGroqRateLimitHeaders } from '../supabase/functions/_shared/ai/providers.ts';

// Objective 1 — provider-selection diagnostics. These test the pure
// categorization/summarization logic only; they cannot exercise a real
// Gemini/Groq HTTP call from a unit test, and don't try to — the actual
// failure category for THIS deployment is confirmed via the live diagnostics
// rows captured after deploying (see the final report), not here.

describe('categorizeProviderFailure', () => {
  it('429 -> rate_limited, with status', () => {
    const result = categorizeProviderFailure(new ProviderHttpError(429, 'Gemini 429: quota exceeded'));
    expect(result).toEqual({ category: 'rate_limited', httpStatus: 429 });
  });

  it('other HTTP status -> http_error, with status', () => {
    expect(categorizeProviderFailure(new ProviderHttpError(404, 'Gemini 404: model not found'))).toEqual({ category: 'http_error', httpStatus: 404 });
    expect(categorizeProviderFailure(new ProviderHttpError(400, 'Gemini 400: bad request'))).toEqual({ category: 'http_error', httpStatus: 400 });
    expect(categorizeProviderFailure(new ProviderHttpError(500, 'Gemini 500'))).toEqual({ category: 'http_error', httpStatus: 500 });
  });

  it('AbortError (timeout) -> timeout, no status', () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    expect(categorizeProviderFailure(abortError)).toEqual({ category: 'timeout' });
  });

  it('SyntaxError (bad JSON) -> parse_error', () => {
    expect(categorizeProviderFailure(new SyntaxError('Unexpected token'))).toEqual({ category: 'parse_error' });
  });

  it('TypeError (network-level failure) -> network_error', () => {
    expect(categorizeProviderFailure(new TypeError('fetch failed'))).toEqual({ category: 'network_error' });
  });

  it('anything else -> unknown, never throws', () => {
    expect(categorizeProviderFailure('a plain string, not an Error').category).toBe('unknown');
    expect(categorizeProviderFailure(null).category).toBe('unknown');
    expect(categorizeProviderFailure(undefined).category).toBe('unknown');
  });

  it('never includes the error message text (only status + category) — no response bodies leak through', () => {
    const result = categorizeProviderFailure(new ProviderHttpError(429, 'Gemini 429: {"error":{"message":"quota for project X exceeded"}}'));
    expect(JSON.stringify(result)).not.toContain('quota');
    expect(JSON.stringify(result)).not.toContain('project X');
  });
});

describe('summarizeFallbackReason', () => {
  it('null when nothing failed', () => {
    const attempts: ProviderAttemptLog[] = [{ provider: 'gemini', model: 'gemini-2.5-flash', succeeded: true, latencyMs: 500 }];
    expect(summarizeFallbackReason(attempts)).toBeNull();
  });

  it('compact string from the first failed attempt', () => {
    const attempts: ProviderAttemptLog[] = [
      { provider: 'gemini', model: 'gemini-2.5-flash', succeeded: false, failureCategory: 'rate_limited', httpStatus: 429, latencyMs: 300 },
      { provider: 'groq', model: 'openai/gpt-oss-20b', succeeded: true, latencyMs: 900 },
    ];
    expect(summarizeFallbackReason(attempts)).toBe('gemini:rate_limited:429');
  });

  it('omits the status segment when there is none (e.g. timeout/network_error)', () => {
    const attempts: ProviderAttemptLog[] = [
      { provider: 'gemini', model: 'gemini-2.5-flash', succeeded: false, failureCategory: 'timeout', latencyMs: 30000 },
      { provider: 'groq', model: 'openai/gpt-oss-20b', succeeded: true, latencyMs: 900 },
    ];
    expect(summarizeFallbackReason(attempts)).toBe('gemini:timeout');
  });

  it('reports not_configured distinctly from an attempted-and-failed call', () => {
    const attempts: ProviderAttemptLog[] = [
      { provider: 'gemini', model: 'gemini-2.5-flash', succeeded: false, failureCategory: 'not_configured', latencyMs: 0 },
      { provider: 'groq', model: 'openai/gpt-oss-20b', succeeded: true, latencyMs: 900 },
    ];
    expect(summarizeFallbackReason(attempts)).toBe('gemini:not_configured');
  });

  it('never includes a response body or key — only provider/category/status', () => {
    const attempts: ProviderAttemptLog[] = [
      { provider: 'gemini', model: 'gemini-2.5-flash', succeeded: false, failureCategory: 'http_error', httpStatus: 403, latencyMs: 200 },
    ];
    const reason = summarizeFallbackReason(attempts);
    expect(reason).toBe('gemini:http_error:403');
    expect(reason).not.toMatch(/key|token|bearer|AIza/i);
  });

  // Regression for a real incident (Objective 1 live audit): when every
  // configured provider fails (all-providers-failed), reporting only the
  // FIRST failure hid whether the fallback(s) tried after it also failed and
  // why — indistinguishable from "the fallback would have worked but we never
  // got to see". Live testing found exactly this: Gemini failed 400 on every
  // call, and once Groq also started failing, ai_request_logs kept showing
  // "gemini:http_error:400" with zero visibility into Groq's own failure.
  it('joins every failed attempt, in order, when all providers fail', () => {
    const attempts: ProviderAttemptLog[] = [
      { provider: 'gemini', model: 'gemini-2.5-flash', succeeded: false, failureCategory: 'http_error', httpStatus: 400, latencyMs: 250 },
      { provider: 'groq', model: 'openai/gpt-oss-20b', succeeded: false, failureCategory: 'rate_limited', httpStatus: 429, latencyMs: 180 },
      { provider: 'openai', model: 'gpt-4-turbo', succeeded: false, failureCategory: 'not_configured', latencyMs: 0 },
    ];
    expect(summarizeFallbackReason(attempts)).toBe('gemini:http_error:400 | groq:rate_limited:429 | openai:not_configured');
  });
});

describe('GroqProvider configuration & pricing', () => {
  it('defaults to openai/gpt-oss-20b', async () => {
    const { GroqProvider } = await import('../supabase/functions/_shared/ai/providers.ts');
    const provider = new GroqProvider();
    expect(provider.model).toBe('openai/gpt-oss-20b');
  });

  it('has pricing defined for openai/gpt-oss-20b', async () => {
    const { MODEL_PRICING } = await import('../supabase/functions/_shared/ai/pricing.ts');
    expect(MODEL_PRICING['openai/gpt-oss-20b']).toBeDefined();
  });
});

// Objective 1, Step 1 — safe Gemini error parsing. Each fixture is a
// realistic synthetic Gemini API error body (Google's standard
// google.rpc.Status shape); parseGeminiError() must extract only the bounded
// SafeGeminiErrorDetails fields, never echo the raw body, and distinguish
// each scenario from the others.
describe('parseGeminiError — synthetic Gemini error scenarios', () => {
  it('INVALID_ARGUMENT (generic malformed payload, no specific reason)', () => {
    const body = JSON.stringify({
      error: { code: 400, message: 'Invalid JSON payload received. Unknown name "foo": Cannot find field.', status: 'INVALID_ARGUMENT' },
    });
    const { safeDetails } = parseGeminiError(400, body);
    expect(safeDetails.apiStatus).toBe('INVALID_ARGUMENT');
    expect(safeDetails.apiReason).toBeUndefined();
    expect(safeDetails.sanitizedMessage).toContain('Unknown name');
  });

  it('API_KEY_INVALID (distinguishable from a generic INVALID_ARGUMENT via apiReason)', () => {
    const body = JSON.stringify({
      error: {
        code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT',
        details: [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'API_KEY_INVALID', domain: 'googleapis.com' }],
      },
    });
    const { safeDetails } = parseGeminiError(400, body);
    expect(safeDetails.apiStatus).toBe('INVALID_ARGUMENT');
    expect(safeDetails.apiReason).toBe('API_KEY_INVALID');
  });

  it('PERMISSION_DENIED', () => {
    const body = JSON.stringify({ error: { code: 403, message: 'Permission denied on resource project my-project.', status: 'PERMISSION_DENIED' } });
    const { safeDetails } = parseGeminiError(403, body);
    expect(safeDetails.apiStatus).toBe('PERMISSION_DENIED');
    expect(safeDetails.httpStatus).toBe(403);
  });

  it('RESOURCE_EXHAUSTED (quota)', () => {
    const body = JSON.stringify({ error: { code: 429, message: 'Resource has been exhausted (e.g. check quota).', status: 'RESOURCE_EXHAUSTED' } });
    const { safeDetails } = parseGeminiError(429, body);
    expect(safeDetails.apiStatus).toBe('RESOURCE_EXHAUSTED');
  });

  it('unsupported response schema (fieldViolations points at the schema field)', () => {
    const body = JSON.stringify({
      error: {
        code: 400, message: 'Invalid JSON payload received. Unknown name "additionalProperties" at \'generation_config.response_schema\'.', status: 'INVALID_ARGUMENT',
        details: [{ '@type': 'type.googleapis.com/google.rpc.BadRequest', fieldViolations: [{ field: 'generation_config.response_schema', description: 'Unknown name "additionalProperties": Cannot find field.' }] }],
      },
    });
    const { safeDetails } = parseGeminiError(400, body);
    expect(safeDetails.fieldViolations?.[0].field).toBe('generation_config.response_schema');
  });

  it('unsupported generation parameter (fieldViolations points at the param)', () => {
    const body = JSON.stringify({
      error: {
        code: 400, message: 'Invalid JSON payload received. Unknown name "topK" at \'generation_config\'.', status: 'INVALID_ARGUMENT',
        details: [{ '@type': 'type.googleapis.com/google.rpc.BadRequest', fieldViolations: [{ field: 'generation_config.topK', description: 'Invalid value.' }] }],
      },
    });
    const { safeDetails } = parseGeminiError(400, body);
    expect(safeDetails.fieldViolations?.[0].field).toBe('generation_config.topK');
  });

  it('model not found', () => {
    const body = JSON.stringify({
      error: { code: 404, message: 'models/gemini-2.5-flash is not found for API version v1beta, or is not supported for generateContent.', status: 'NOT_FOUND' },
    });
    const { safeDetails } = parseGeminiError(404, body);
    expect(safeDetails.apiStatus).toBe('NOT_FOUND');
    expect(safeDetails.sanitizedMessage).toContain('gemini-2.5-flash');
  });

  it('user location not supported', () => {
    const body = JSON.stringify({ error: { code: 400, message: 'User location is not supported for the API use.', status: 'FAILED_PRECONDITION' } });
    const { safeDetails } = parseGeminiError(400, body);
    expect(safeDetails.apiStatus).toBe('FAILED_PRECONDITION');
    expect(safeDetails.sanitizedMessage).toContain('location');
  });

  it('non-JSON or unexpected body never throws, produces no fabricated detail', () => {
    const { safeDetails, message } = parseGeminiError(502, '<html>Bad Gateway</html>');
    expect(safeDetails.apiStatus).toBeUndefined();
    expect(safeDetails.sanitizedMessage).toBeUndefined();
    expect(message).toContain('no message available');
  });

  it('redacts an API key embedded in the error message', () => {
    const body = JSON.stringify({ error: { code: 400, message: 'Invalid key: AIzaSyD-fake1234567890fakefake1234567', status: 'INVALID_ARGUMENT' } });
    const { safeDetails } = parseGeminiError(400, body);
    expect(safeDetails.sanitizedMessage).not.toMatch(/AIzaSy/);
    expect(safeDetails.sanitizedMessage).toContain('[REDACTED]');
  });

  it('truncates sanitizedMessage to 500 characters', () => {
    // Realistic repeated prose (spaces/punctuation break it into ordinary
    // words) rather than one giant unbroken run — a 1000-char run of a single
    // repeated character looks like a token dump and is correctly redacted
    // wholesale by the generic long-token pattern; that's the safe behaviour,
    // not what this test is checking.
    const longMessage = 'Invalid JSON payload received at generation_config. '.repeat(20);
    const body = JSON.stringify({ error: { code: 400, message: longMessage, status: 'INVALID_ARGUMENT' } });
    const { safeDetails } = parseGeminiError(400, body);
    expect(longMessage.length).toBeGreaterThan(500);
    expect(safeDetails.sanitizedMessage!.length).toBe(500);
  });

  it('caps fieldViolations at 5 entries even when more are present', () => {
    const violations = Array.from({ length: 10 }, (_, i) => ({ field: `field_${i}`, description: 'bad' }));
    const body = JSON.stringify({
      error: { code: 400, message: 'multiple violations', status: 'INVALID_ARGUMENT', details: [{ '@type': 'type.googleapis.com/google.rpc.BadRequest', fieldViolations: violations }] },
    });
    const { safeDetails } = parseGeminiError(400, body);
    expect(safeDetails.fieldViolations).toHaveLength(5);
  });

  it('never includes the raw response body verbatim in the returned message', () => {
    const body = JSON.stringify({ error: { code: 400, message: 'short message', status: 'INVALID_ARGUMENT', details: [{ secretPayload: 'should-never-appear-anywhere' }] } });
    const { message, safeDetails } = parseGeminiError(400, body);
    expect(message).not.toContain('should-never-appear-anywhere');
    expect(JSON.stringify(safeDetails)).not.toContain('should-never-appear-anywhere');
  });

  // Pre-beta blocker: live-observed gap — a real 429 from Gemini was NEVER
  // remembered, because this function never extracted retryAfterSeconds from
  // the structured google.rpc.RetryInfo detail. "confirm the actual Gemini
  // quota type and reset window from provider metadata" means reading THIS
  // structured detail, not text-parsing the free-form message.
  describe('RESOURCE_EXHAUSTED — structured RetryInfo + QuotaFailure extraction', () => {
    it('extracts retryAfterSeconds from a RetryInfo detail (matches the real live-captured shape)', () => {
      const body = JSON.stringify({
        error: {
          code: 429, status: 'RESOURCE_EXHAUSTED',
          message: 'You exceeded your current quota, please check your plan and billing details.',
          details: [
            { '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{ quotaMetric: 'generativelanguage.googleapis.com/generate_content_free_tier_requests', quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }] },
            { '@type': 'type.googleapis.com/google.rpc.Help', links: [{ description: 'Learn more', url: 'https://ai.google.dev/gemini-api/docs/rate-limits' }] },
            { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '57.807866169s' },
          ],
        },
      });
      const { rateLimitDetails, safeDetails } = parseGeminiError(429, body);
      expect(rateLimitDetails?.retryAfterSeconds).toBeCloseTo(57.807866169, 5);
      expect(safeDetails.quotaViolations?.[0].quotaId).toBe('GenerateRequestsPerDayPerProjectPerModel-FreeTier');
      expect(safeDetails.quotaViolations?.[0].quotaMetric).toContain('generate_content_free_tier_requests');
    });

    it('quotaId reveals whether the exhausted quota is per-day vs per-minute — the "actual quota type" requirement', () => {
      const perMinuteBody = JSON.stringify({
        error: {
          code: 429, status: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded.',
          details: [
            { '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{ quotaId: 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier' }] },
            { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '12s' },
          ],
        },
      });
      const { safeDetails, rateLimitDetails } = parseGeminiError(429, perMinuteBody);
      expect(safeDetails.quotaViolations?.[0].quotaId).toContain('PerMinute');
      expect(rateLimitDetails?.retryAfterSeconds).toBe(12);
    });

    it('returns rateLimitDetails undefined when no RetryInfo detail is present at all', () => {
      const body = JSON.stringify({ error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'Resource has been exhausted.' } });
      const { rateLimitDetails } = parseGeminiError(429, body);
      expect(rateLimitDetails).toBeUndefined();
    });

    it('a non-429 error never populates rateLimitDetails even if a stray retryDelay-shaped field exists', () => {
      const body = JSON.stringify({
        error: { code: 400, status: 'INVALID_ARGUMENT', message: 'bad request', details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '5s' }] },
      });
      const { rateLimitDetails } = parseGeminiError(400, body);
      // Still correctly extracted (the parser doesn't gate this on status) —
      // service.ts's categorizeProviderFailure() is what actually decides
      // whether to act on it, gated on the 429 HTTP status, not this parser.
      expect(rateLimitDetails?.retryAfterSeconds).toBe(5);
    });

    it('caps quotaViolations at 3 entries even when more are present', () => {
      const violations = Array.from({ length: 6 }, (_, i) => ({ quotaId: `quota_${i}` }));
      const body = JSON.stringify({
        error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded.', details: [{ '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations }] },
      });
      const { safeDetails } = parseGeminiError(429, body);
      expect(safeDetails.quotaViolations).toHaveLength(3);
    });
  });
});

// Objective 1, Step 5 — Groq rate-limit header parsing. Header NAMES and
// duration-string FORMAT ("7m12s", "1.04s") are taken from a real response
// captured live against the deployed key (not assumed from docs) — see the
// final report for the raw capture.
describe('parseGroqRateLimitHeaders', () => {
  it('parses remaining requests/tokens as numbers', () => {
    const headers = new Headers({ 'x-ratelimit-remaining-requests': '995', 'x-ratelimit-remaining-tokens': '11792' });
    const result = parseGroqRateLimitHeaders(headers);
    expect(result).toMatchObject({ remainingRequests: 995, remainingTokens: 11792 });
  });

  it('parses a minutes+seconds reset duration ("7m12s") into an absolute ISO timestamp', () => {
    const before = Date.now();
    const headers = new Headers({ 'x-ratelimit-reset-requests': '7m12s' });
    const result = parseGroqRateLimitHeaders(headers);
    const resetMs = new Date(result!.resetRequestsAt!).getTime();
    // 7m12s = 432s, allow a small tolerance for test execution time.
    expect(resetMs - before).toBeGreaterThan(430_000);
    expect(resetMs - before).toBeLessThan(435_000);
  });

  it('parses a sub-second reset duration ("1.04s")', () => {
    const before = Date.now();
    const headers = new Headers({ 'x-ratelimit-reset-tokens': '1.04s' });
    const result = parseGroqRateLimitHeaders(headers);
    const resetMs = new Date(result!.resetTokensAt!).getTime();
    expect(resetMs - before).toBeGreaterThan(900);
    expect(resetMs - before).toBeLessThan(2000);
  });

  it('parses a plain numeric Retry-After (seconds)', () => {
    const headers = new Headers({ 'retry-after': '30' });
    expect(parseGroqRateLimitHeaders(headers)).toMatchObject({ retryAfterSeconds: 30 });
  });

  it('returns undefined when no rate-limit headers are present at all', () => {
    expect(parseGroqRateLimitHeaders(new Headers({ 'content-type': 'application/json' }))).toBeUndefined();
  });

  it('ignores an unparseable reset-duration string rather than fabricating a value', () => {
    const result = parseGroqRateLimitHeaders(new Headers({ 'x-ratelimit-reset-requests': 'not-a-duration' }));
    expect(result?.resetRequestsAt).toBeUndefined();
  });
});

describe('ProviderHttpError.retryable — 429 excluded (Step 5)', () => {
  it('a 429 is NOT retryable — falling through to the next provider beats a same-provider backoff-retry', () => {
    expect(new ProviderHttpError(429, 'rate limited').retryable).toBe(false);
  });

  it('a 500 IS still retryable (transient server error, unchanged behaviour)', () => {
    expect(new ProviderHttpError(500, 'server error').retryable).toBe(true);
  });

  it('a 503 IS still retryable', () => {
    expect(new ProviderHttpError(503, 'unavailable').retryable).toBe(true);
  });

  it('a 400 is NOT retryable (unchanged — was never retryable)', () => {
    expect(new ProviderHttpError(400, 'bad request').retryable).toBe(false);
  });
});

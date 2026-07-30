import { describe, it, expect } from 'vitest';
import { categorizeProviderFailure, summarizeFallbackReason } from '../supabase/functions/_shared/ai/service.ts';
import { ProviderHttpError, ProviderAttemptLog } from '../supabase/functions/_shared/ai/types.ts';

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
      { provider: 'groq', model: 'llama-3.3-70b-versatile', succeeded: true, latencyMs: 900 },
    ];
    expect(summarizeFallbackReason(attempts)).toBe('gemini:rate_limited:429');
  });

  it('omits the status segment when there is none (e.g. timeout/network_error)', () => {
    const attempts: ProviderAttemptLog[] = [
      { provider: 'gemini', model: 'gemini-2.5-flash', succeeded: false, failureCategory: 'timeout', latencyMs: 30000 },
      { provider: 'groq', model: 'llama-3.3-70b-versatile', succeeded: true, latencyMs: 900 },
    ];
    expect(summarizeFallbackReason(attempts)).toBe('gemini:timeout');
  });

  it('reports not_configured distinctly from an attempted-and-failed call', () => {
    const attempts: ProviderAttemptLog[] = [
      { provider: 'gemini', model: 'gemini-2.5-flash', succeeded: false, failureCategory: 'not_configured', latencyMs: 0 },
      { provider: 'groq', model: 'llama-3.3-70b-versatile', succeeded: true, latencyMs: 900 },
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
});

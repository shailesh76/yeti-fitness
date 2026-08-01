// Orchestrator: tries providers in priority order (Gemini → Groq → OpenAI →
// Anthropic), with per-provider retry/backoff on transient errors, and returns
// the first success annotated with token usage + cost. Also exposes a health
// check.
import { AINotConfiguredError, AIProvider, AllProvidersFailedError, ChatRequest, ChatResult, ProviderAttemptLog, ProviderFailureCategory, SafeGeminiErrorDetails, ProviderRateLimitDetails, ProviderCapacityResult } from "./types.ts";
import { AnthropicProvider, GeminiProvider, GroqProvider, OpenAIProvider } from "./providers.ts";
import { ProviderHttpError } from "./types.ts";
import { computeCostUsd } from "./pricing.ts";

/**
 * Categorizes a provider failure for diagnostics ONLY — never includes the
 * error's own message text (which may echo request/response content) in
 * anything returned to callers; only this bounded enum + an optional numeric
 * HTTP status are surfaced.
 */
/**
 * Compact, human-readable reason for a fallback — one segment per
 * non-succeeded attempt, in priority order, e.g. "gemini:rate_limited:429".
 * Safe to persist: provider name + category enum + numeric status only,
 * never a response body or error message text.
 *
 * Joins EVERY failed attempt, not just the first: when every provider fails
 * (the all-providers-failed case), reporting only the first entry would
 * always show the PRIMARY provider's failure and silently hide whether the
 * fallback(s) tried after it failed too, and why — leaving an operator no
 * better off than the generic "provider_error" this was built to replace.
 * When exactly one provider failed before a later one succeeded (the common
 * case), this still returns a single segment, identical to before.
 */
export function summarizeFallbackReason(attempts: ProviderAttemptLog[]): string | null {
  const failed = attempts.filter((a) => !a.succeeded);
  if (!failed.length) return null;
  return failed
    .map((a) => `${a.provider}:${a.failureCategory ?? 'unknown'}${a.httpStatus ? ':' + a.httpStatus : ''}`)
    .join(' | ');
}

export function categorizeProviderFailure(e: unknown): {
  category: ProviderFailureCategory;
  httpStatus?: number;
  geminiErrorDetails?: SafeGeminiErrorDetails;
  rateLimitDetails?: ProviderRateLimitDetails;
} {
  if (e instanceof ProviderHttpError) {
    return {
      category: e.status === 429 ? 'rate_limited' : 'http_error',
      httpStatus: e.status,
      geminiErrorDetails: e.geminiErrorDetails,
      rateLimitDetails: e.rateLimitDetails,
    };
  }
  const name = (e as { name?: string })?.name;
  if (name === 'AbortError') return { category: 'timeout' };
  if (e instanceof SyntaxError) return { category: 'parse_error' };
  if (e instanceof TypeError) return { category: 'network_error' };
  return { category: 'unknown' };
}

/**
 * Priority order (cost-optimised for the free-tier beta):
 *   Gemini (primary, generous free tier) → Groq (ultra-fast) → OpenAI (fallback) → Anthropic (optional).
 * Any provider without a key is skipped.
 */
export function getProviders(): AIProvider[] {
  return [new GeminiProvider(), new GroqProvider(), new OpenAIProvider(), new AnthropicProvider()];
}

// Module-scoped, so it persists across requests handled by the SAME warm
// Deno isolate (common under bursty traffic) but starts empty on every cold
// start — no persistence guarantee needed, this is purely an optimisation.
// Once a provider tells us its real Retry-After, we skip attempting it again
// (an instant, zero-cost skip, exactly like the not_configured case) until
// that window passes, rather than spending a request finding out again.
const rateLimitedUntil = new Map<string, number>();

function isKnownRateLimited(providerName: string): boolean {
  const until = rateLimitedUntil.get(providerName);
  return until != null && Date.now() < until;
}

/** Test-only: clears the in-memory rate-limit skip cache so tests don't leak state into each other regardless of execution order. Never called by production code. */
export function _resetRateLimitCacheForTests() {
  rateLimitedUntil.clear();
}

function rememberRateLimit(providerName: string, retryAfterSeconds: number | undefined) {
  if (retryAfterSeconds == null || retryAfterSeconds <= 0) return;
  rateLimitedUntil.set(providerName, Date.now() + retryAfterSeconds * 1000);
}

async function withRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (e) {
      const retryable = (e instanceof ProviderHttpError && e.retryable) ||
        (e as { name?: string })?.name === "AbortError";
      if (!retryable || attempt >= retries) throw e;
      await new Promise((r) => setTimeout(r, 400 * Math.pow(2, attempt)));
      attempt++;
    }
  }
}

/**
 * Generate a chat completion, falling back across configured providers.
 * @throws AINotConfiguredError if no provider has an API key.
 */
export async function generateChat(req: ChatRequest): Promise<ChatResult> {
  const allProviders = getProviders();
  if (!allProviders.some((p) => p.isConfigured())) throw new AINotConfiguredError();

  // Record every provider IN PRIORITY ORDER — configured-and-skipped-here
  // providers interleaved with real attempts, not bucketed separately. This
  // matters because summarizeFallbackReason() reports the FIRST non-succeeded
  // entry as "the reason for the fallback": if all not_configured providers
  // were recorded up front (as this used to do), a downstream unconfigured
  // provider (e.g. OpenAI) would always shadow the real, earlier failure of
  // the actual primary provider (Gemini) — reporting "openai:not_configured"
  // as the fallback reason even when Gemini was attempted and failed first.
  const providerAttempts: ProviderAttemptLog[] = [];
  const attempts: string[] = [];
  let lastError: unknown;
  for (const provider of allProviders) {
    if (!provider.isConfigured()) {
      providerAttempts.push({ provider: provider.name, model: provider.model, succeeded: false, failureCategory: 'not_configured', latencyMs: 0 });
      continue;
    }
    if (isKnownRateLimited(provider.name)) {
      // A previous call already got a real Retry-After from this provider
      // within this warm isolate — skip the HTTP round-trip entirely rather
      // than spend a request re-discovering what we already know.
      providerAttempts.push({ provider: provider.name, model: provider.model, succeeded: false, failureCategory: 'rate_limited', latencyMs: 0 });
      continue;
    }
    attempts.push(provider.name);
    const startedAt = Date.now();
    try {
      const { text, usage } = await withRetry(() => provider.chat(req));
      const latencyMs = Date.now() - startedAt;
      if (!text || !text.trim()) {
        // A 200 OK with unusable (empty) content is a soft failure — record
        // it, then keep falling through to the next provider rather than
        // return an answer with nothing in it. This does not change existing
        // behaviour for any provider that has ever actually returned text.
        providerAttempts.push({ provider: provider.name, model: provider.model, succeeded: false, failureCategory: 'empty_response', latencyMs });
        continue;
      }
      providerAttempts.push({ provider: provider.name, model: provider.model, succeeded: true, latencyMs });
      return {
        text,
        usage,
        provider: provider.name,
        model: provider.model,
        costUsd: computeCostUsd(provider.model, usage),
        attempts,
        providerAttempts,
      };
    } catch (e) {
      const latencyMs = Date.now() - startedAt;
      const { category, httpStatus, geminiErrorDetails, rateLimitDetails } = categorizeProviderFailure(e);
      providerAttempts.push({
        provider: provider.name, model: provider.model, succeeded: false,
        failureCategory: category, httpStatus, latencyMs, geminiErrorDetails, rateLimitDetails,
      });
      if (category === 'rate_limited') rememberRateLimit(provider.name, rateLimitDetails?.retryAfterSeconds);
      lastError = e;
      // (e as Error).message is safe to log here: providers.ts builds it from
      // already-sanitized, length-capped fields — never the raw response body.
      console.error(`[ai/service] provider "${provider.name}" failed (${category}${httpStatus ? ' ' + httpStatus : ''}):`, (e as Error).message);
    }
  }
  throw new AllProvidersFailedError(providerAttempts, lastError);
}

/** Returns { providerName: healthy } for every provider. */
export async function healthCheck(): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {};
  for (const provider of getProviders()) {
    result[provider.name] = provider.isConfigured() ? await provider.healthCheck() : false;
  }
  return result;
}

/**
 * Provider-capacity diagnostic (pre-beta blocker). Live-observed gap this
 * closes: healthCheck() above calls each provider's OWN lightweight
 * healthCheck() method, which for Gemini hits the cheap models-LIST endpoint
 * — that endpoint kept returning healthy while the real generateContent()
 * endpoint (what every actual chat request uses) was returning 429
 * RESOURCE_EXHAUSTED. "Redundancy is healthy" must never be claimed from a
 * cheaper, different check than the one real traffic actually uses — this
 * function makes the SAME chat() call every real request makes, for every
 * configured provider, so its result is trustworthy for that claim.
 *
 * Respects the existing known-rate-limited skip (never spends a real request
 * re-discovering a quota window we already know is active), and records a
 * newly-discovered rate limit into the same shared map generateChat() reads,
 * so a capacity check and a real user request never work at cross purposes.
 */
export async function checkProviderCapacity(): Promise<ProviderCapacityResult[]> {
  const results: ProviderCapacityResult[] = [];
  const probeReq: ChatRequest = { messages: [{ role: 'user', content: 'ping' }], maxTokens: 5 };

  for (const provider of getProviders()) {
    if (!provider.isConfigured()) {
      results.push({ provider: provider.name, status: 'not_configured' });
      continue;
    }
    if (isKnownRateLimited(provider.name)) {
      results.push({ provider: provider.name, status: 'rate_limited', rateLimitedUntil: rateLimitedUntil.get(provider.name) });
      continue;
    }
    try {
      const { text } = await provider.chat(probeReq);
      results.push({ provider: provider.name, status: text && text.trim() ? 'available' : 'unavailable' });
    } catch (e) {
      const { category, httpStatus, geminiErrorDetails, rateLimitDetails } = categorizeProviderFailure(e);
      if (category === 'rate_limited') {
        rememberRateLimit(provider.name, rateLimitDetails?.retryAfterSeconds);
        results.push({ provider: provider.name, status: 'rate_limited', rateLimitedUntil: rateLimitedUntil.get(provider.name), httpStatus });
      } else if (
        geminiErrorDetails?.apiReason === 'API_KEY_INVALID' ||
        geminiErrorDetails?.apiStatus === 'UNAUTHENTICATED' ||
        httpStatus === 401 || httpStatus === 403
      ) {
        results.push({ provider: provider.name, status: 'invalid_credential', httpStatus });
      } else {
        results.push({ provider: provider.name, status: 'unavailable', httpStatus });
      }
    }
  }
  return results;
}

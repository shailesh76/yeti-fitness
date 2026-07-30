// Orchestrator: tries providers in priority order (Gemini → Groq → OpenAI →
// Anthropic), with per-provider retry/backoff on transient errors, and returns
// the first success annotated with token usage + cost. Also exposes a health
// check.
import { AINotConfiguredError, AIProvider, AllProvidersFailedError, ChatRequest, ChatResult, ProviderAttemptLog, ProviderFailureCategory } from "./types.ts";
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
 * Compact, human-readable reason for a fallback — from the first
 * non-succeeded attempt (normally the primary provider). Safe to persist:
 * provider name + category enum + numeric status only, e.g.
 * "gemini:rate_limited:429" — never a response body or error message text.
 */
export function summarizeFallbackReason(attempts: ProviderAttemptLog[]): string | null {
  const failed = attempts.find((a) => !a.succeeded);
  if (!failed) return null;
  return `${failed.provider}:${failed.failureCategory ?? 'unknown'}${failed.httpStatus ? ':' + failed.httpStatus : ''}`;
}

export function categorizeProviderFailure(e: unknown): { category: ProviderFailureCategory; httpStatus?: number } {
  if (e instanceof ProviderHttpError) {
    return { category: e.status === 429 ? 'rate_limited' : 'http_error', httpStatus: e.status };
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
  const providerAttempts: ProviderAttemptLog[] = [];

  // Record configuration-skipped providers up front — this is the only way to
  // tell "Gemini was never even attempted" apart from "Gemini was attempted
  // and failed" from the outside.
  for (const p of allProviders) {
    if (!p.isConfigured()) {
      providerAttempts.push({ provider: p.name, model: p.model, succeeded: false, failureCategory: 'not_configured', latencyMs: 0 });
    }
  }
  const configured = allProviders.filter((p) => p.isConfigured());
  if (configured.length === 0) throw new AINotConfiguredError();

  const attempts: string[] = [];
  let lastError: unknown;
  for (const provider of configured) {
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
      const { category, httpStatus } = categorizeProviderFailure(e);
      providerAttempts.push({ provider: provider.name, model: provider.model, succeeded: false, failureCategory: category, httpStatus, latencyMs });
      lastError = e;
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

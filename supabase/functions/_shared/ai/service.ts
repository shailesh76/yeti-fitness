// Orchestrator: tries providers in priority order (OpenAI → Gemini → Anthropic),
// with per-provider retry/backoff on transient errors, and returns the first
// success annotated with token usage + cost. Also exposes a health check.
import { AINotConfiguredError, AIProvider, ChatRequest, ChatResult } from "./types.ts";
import { AnthropicProvider, GeminiProvider, OpenAIProvider } from "./providers.ts";
import { ProviderHttpError } from "./types.ts";
import { computeCostUsd } from "./pricing.ts";

/**
 * Priority order (cost-optimised for the free-tier beta):
 *   Gemini (primary, generous free tier) → OpenAI (fallback) → Anthropic (optional).
 * Any provider without a key is skipped, so if only OPENAI_API_KEY is set, OpenAI
 * effectively becomes primary.
 */
export function getProviders(): AIProvider[] {
  return [new GeminiProvider(), new OpenAIProvider(), new AnthropicProvider()];
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
  const configured = getProviders().filter((p) => p.isConfigured());
  if (configured.length === 0) throw new AINotConfiguredError();

  const attempts: string[] = [];
  let lastError: unknown;
  for (const provider of configured) {
    attempts.push(provider.name);
    try {
      const { text, usage } = await withRetry(() => provider.chat(req));
      return {
        text,
        usage,
        provider: provider.name,
        model: provider.model,
        costUsd: computeCostUsd(provider.model, usage),
        attempts,
      };
    } catch (e) {
      lastError = e;
      console.error(`[ai/service] provider "${provider.name}" failed:`, (e as Error).message);
    }
  }
  throw lastError ?? new Error("All AI providers failed");
}

/** Returns { providerName: healthy } for every provider. */
export async function healthCheck(): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {};
  for (const provider of getProviders()) {
    result[provider.name] = provider.isConfigured() ? await provider.healthCheck() : false;
  }
  return result;
}

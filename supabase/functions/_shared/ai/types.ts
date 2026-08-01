// Shared AI provider service — type contracts.
// Deno-native (edge functions cannot import the @yeti/ai workspace package directly),
// but mirrors its provider/coach abstraction so the two stay conceptually aligned.

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface ProviderResult {
  text: string;
  usage: TokenUsage;
}

export interface ChatResult extends ProviderResult {
  provider: string;
  model: string;
  costUsd: number;
  attempts: string[]; // provider names tried, in order
  providerAttempts: ProviderAttemptLog[]; // per-attempt diagnostics — never includes keys, prompts, or response bodies
}

/** Why a provider attempt didn't produce a usable answer. No sensitive detail — safe to log/persist. */
export type ProviderFailureCategory =
  | 'not_configured'
  | 'timeout'
  | 'rate_limited'
  | 'http_error'
  | 'network_error'
  | 'parse_error'
  | 'empty_response'
  | 'unknown';

/**
 * Structured, bounded detail from a Gemini API error response — parsed from
 * ONLY the `error` object (never the raw response body, never the request/
 * prompt that produced it). Every string field is redacted (see
 * errorSanitizer.ts) and length-capped before it ever reaches this shape, so
 * it's safe to log or persist. Lets an operator tell a malformed payload
 * (INVALID_ARGUMENT + fieldViolations) apart from auth (API_KEY_INVALID /
 * UNAUTHENTICATED), permission (PERMISSION_DENIED), model (NOT_FOUND), or
 * quota (RESOURCE_EXHAUSTED) errors without ever seeing the raw body.
 */
export interface SafeGeminiErrorDetails {
  httpStatus: number;
  apiStatus?: string;
  apiCode?: number;
  /** From a google.rpc.ErrorInfo detail's `reason`, e.g. "API_KEY_INVALID" — distinguishes an invalid key from an ordinary malformed request, both of which surface as apiStatus "INVALID_ARGUMENT". */
  apiReason?: string;
  sanitizedMessage?: string; // redacted, capped to 500 chars
  fieldViolations?: Array<{ field?: string; description?: string }>; // capped to 5 entries
  /** From a google.rpc.QuotaFailure detail's `violations[]` — identifies WHICH quota was hit (e.g. per-minute vs per-day request cap), not just that a 429 happened. */
  quotaViolations?: Array<{ quotaMetric?: string; quotaId?: string }>; // capped to 3 entries
}

/** One provider attempt's outcome — provider/model names are not secrets; no key, prompt, or response body is ever included. */
export interface ProviderAttemptLog {
  provider: string;
  model: string;
  succeeded: boolean;
  failureCategory?: ProviderFailureCategory;
  httpStatus?: number;
  latencyMs: number;
  /** Only ever populated for a Gemini failure — see SafeGeminiErrorDetails. */
  geminiErrorDetails?: SafeGeminiErrorDetails;
  /** Only ever populated when a rate-limited provider (e.g. Groq 429) returned parseable rate-limit headers. */
  rateLimitDetails?: ProviderRateLimitDetails;
}

/**
 * Rate-limit accounting parsed from a provider's response headers when
 * present (e.g. Groq's x-ratelimit-* headers). Every field is a plain number
 * or ISO timestamp — never a header blob, never anything provider-secret.
 */
export interface ProviderRateLimitDetails {
  retryAfterSeconds?: number;
  remainingRequests?: number;
  remainingTokens?: number;
  resetRequestsAt?: string;
  resetTokensAt?: string;
}

/**
 * A provider's CURRENTLY KNOWN capacity to actually serve a request — not a
 * bare "configured" boolean. Distinguishes an invalid credential (won't ever
 * self-recover) from a rate limit (recovers at a known time) from a generic
 * outage (unknown recovery), so a caller never has to guess which one 429/401
 * meant.
 */
export type ProviderCapacityStatus = 'available' | 'rate_limited' | 'invalid_credential' | 'unavailable' | 'not_configured';

export interface ProviderCapacityResult {
  provider: string;
  status: ProviderCapacityStatus;
  /** Epoch ms — present only when status === 'rate_limited'. */
  rateLimitedUntil?: number;
  httpStatus?: number;
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  isConfigured(): boolean;
  chat(req: ChatRequest): Promise<ProviderResult>;
  healthCheck(): Promise<boolean>;
}

/** Thrown when no AI provider has an API key configured. Callers map this to a 503. */
export class AINotConfiguredError extends Error {
  constructor() {
    super("AI provider not configured");
    this.name = "AINotConfiguredError";
  }
}

/** HTTP error from a provider; `retryable` gates the retry/backoff logic. */
export class ProviderHttpError extends Error {
  constructor(
    public status: number,
    message: string,
    /** Structured, sanitized Gemini error detail — undefined for every other provider. */
    public geminiErrorDetails?: SafeGeminiErrorDetails,
    /** Structured, sanitized rate-limit header detail — undefined unless the provider sent parseable rate-limit headers. */
    public rateLimitDetails?: ProviderRateLimitDetails,
  ) {
    super(message);
    this.name = "ProviderHttpError";
  }
  get retryable(): boolean {
    // 429 is deliberately excluded: a same-provider backoff-retry against a
    // provider that just told us it's rate-limited is nearly always futile
    // within a single request's timeframe, and wastes another request against
    // an already-exhausted quota. Falling through to the next configured
    // provider (generateChat()'s normal loop) is faster and more likely to
    // succeed than waiting out a real Retry-After mid-request.
    return this.status >= 500;
  }
}

/** Thrown when every configured provider failed. Carries the full diagnostic trail so the caller can still log why, even on total failure. */
export class AllProvidersFailedError extends Error {
  constructor(public providerAttempts: ProviderAttemptLog[], cause?: unknown) {
    super(`All AI providers failed: ${(cause as Error)?.message ?? 'unknown error'}`);
    this.name = "AllProvidersFailedError";
  }
}

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

/** One provider attempt's outcome — provider/model names are not secrets; no key, prompt, or response body is ever included. */
export interface ProviderAttemptLog {
  provider: string;
  model: string;
  succeeded: boolean;
  failureCategory?: ProviderFailureCategory;
  httpStatus?: number;
  latencyMs: number;
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
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ProviderHttpError";
  }
  get retryable(): boolean {
    return this.status === 429 || this.status >= 500;
  }
}

/** Thrown when every configured provider failed. Carries the full diagnostic trail so the caller can still log why, even on total failure. */
export class AllProvidersFailedError extends Error {
  constructor(public providerAttempts: ProviderAttemptLog[], cause?: unknown) {
    super(`All AI providers failed: ${(cause as Error)?.message ?? 'unknown error'}`);
    this.name = "AllProvidersFailedError";
  }
}

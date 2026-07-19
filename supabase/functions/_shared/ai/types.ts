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

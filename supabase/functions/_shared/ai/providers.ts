// Concrete AI providers. Each implements the AIProvider contract and normalises
// its native request/response shape into { text, usage }.
import { AIProvider, ChatRequest, ProviderHttpError, ProviderResult, SafeGeminiErrorDetails, ProviderRateLimitDetails } from "./types.ts";
import { redactSensitive } from "./errorSanitizer.ts";

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Parses ONLY the structured `error` object from a Gemini API error response
 * — never the raw body, never anything about the request that produced it.
 * Every string is redacted and length-capped before it leaves this function,
 * so the result (and the summary message built from it) is safe to log or
 * persist. Distinguishes malformed payloads (INVALID_ARGUMENT +
 * fieldViolations) from auth (API_KEY_INVALID / UNAUTHENTICATED), permission
 * (PERMISSION_DENIED), model (NOT_FOUND), region, and quota
 * (RESOURCE_EXHAUSTED) errors by their `status` field — without ever
 * exposing the body itself.
 */
export function parseGeminiError(
  httpStatus: number,
  rawResponseText: string,
): { message: string; safeDetails: SafeGeminiErrorDetails; rateLimitDetails?: ProviderRateLimitDetails } {
  let apiStatus: string | undefined;
  let apiCode: number | undefined;
  let apiReason: string | undefined;
  let sanitizedMessage: string | undefined;
  const fieldViolations: Array<{ field?: string; description?: string }> = [];
  const quotaViolations: Array<{ quotaMetric?: string; quotaId?: string }> = [];
  let retryAfterSeconds: number | undefined;

  try {
    const parsed = JSON.parse(rawResponseText);
    const err = parsed?.error;
    if (err && typeof err === "object") {
      if (typeof err.status === "string") apiStatus = err.status;
      if (typeof err.code === "number") apiCode = err.code;
      if (typeof err.message === "string") sanitizedMessage = redactSensitive(err.message).slice(0, 500);

      const details = Array.isArray(err.details) ? err.details : [];
      outer: for (const d of details) {
        // google.rpc.ErrorInfo carries a machine-readable `reason` (e.g.
        // "API_KEY_INVALID") that distinguishes an invalid key from an
        // ordinary malformed request — both otherwise report the same
        // apiStatus "INVALID_ARGUMENT".
        if (!apiReason && typeof d?.reason === "string") apiReason = redactSensitive(d.reason).slice(0, 100);

        // google.rpc.RetryInfo carries the ACTUAL server-computed backoff —
        // this is what makes the known-rate-limited skip in service.ts work
        // for Gemini at all. Quota metric/id names (e.g.
        // "generativelanguage.googleapis.com/generate_content_free_tier_requests")
        // are operational identifiers, not secrets — not run through
        // redactSensitive, just length-capped.
        if (typeof d?.retryDelay === "string" && retryAfterSeconds == null) {
          const parsed = parseGroqDuration(d.retryDelay);
          if (parsed != null) retryAfterSeconds = parsed;
        }

        const violations = Array.isArray(d?.fieldViolations) ? d.fieldViolations : [];
        for (const v of violations) {
          if (fieldViolations.length >= 5) break outer;
          fieldViolations.push({
            field: typeof v?.field === "string" ? redactSensitive(v.field).slice(0, 200) : undefined,
            description: typeof v?.description === "string" ? redactSensitive(v.description).slice(0, 500) : undefined,
          });
        }

        // google.rpc.QuotaFailure identifies WHICH quota was exceeded (e.g. a
        // per-minute request cap vs a per-day cap) — this is the "actual
        // quota type" a 429 alone never reveals.
        const quotaFailureViolations = Array.isArray(d?.violations) ? d.violations : [];
        for (const qv of quotaFailureViolations) {
          if (quotaViolations.length >= 3) break;
          if (typeof qv?.quotaMetric === "string" || typeof qv?.quotaId === "string") {
            quotaViolations.push({
              quotaMetric: typeof qv?.quotaMetric === "string" ? qv.quotaMetric.slice(0, 200) : undefined,
              quotaId: typeof qv?.quotaId === "string" ? qv.quotaId.slice(0, 200) : undefined,
            });
          }
        }
      }
    }
  } catch {
    // Non-JSON or unexpected shape — fall through with no structured detail
    // rather than risk echoing raw, unsanitized text.
  }

  const safeDetails: SafeGeminiErrorDetails = {
    httpStatus,
    apiStatus,
    apiCode,
    apiReason,
    sanitizedMessage,
    fieldViolations: fieldViolations.length ? fieldViolations : undefined,
    quotaViolations: quotaViolations.length ? quotaViolations : undefined,
  };
  const message = `Gemini ${httpStatus}${apiStatus ? ` ${apiStatus}` : ""}${apiReason ? ` (${apiReason})` : ""}: ${sanitizedMessage ?? "no message available"}`;
  const rateLimitDetails: ProviderRateLimitDetails | undefined = retryAfterSeconds != null ? { retryAfterSeconds } : undefined;
  return { message, safeDetails, rateLimitDetails };
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── OpenAI (primary) ──────────────────────────────────────────────────────────
export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  readonly model = "gpt-4-turbo";
  private key = Deno.env.get("OPENAI_API_KEY") ?? "";

  isConfigured(): boolean {
    return this.key.length > 0 && !this.key.startsWith("sb_");
  }

  async chat(req: ChatRequest): Promise<ProviderResult> {
    const res = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.key}` },
      body: JSON.stringify({
        model: this.model,
        messages: req.messages,
        temperature: req.temperature ?? 0.7,
        ...(req.maxTokens ? { max_tokens: req.maxTokens } : {}),
        ...(req.jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!res.ok) throw new ProviderHttpError(res.status, `OpenAI ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return {
      text: data.choices?.[0]?.message?.content ?? "",
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
      },
    };
  }

  async healthCheck(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      const res = await fetchWithTimeout(
        "https://api.openai.com/v1/models",
        { headers: { Authorization: `Bearer ${this.key}` } },
        8000,
      );
      return res.ok;
    } catch {
      return false;
    }
  }
}

// ── Gemini (fallback) ─────────────────────────────────────────────────────────
export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  readonly model = "gemini-2.5-flash";
  private key = Deno.env.get("GEMINI_API_KEY") ?? "";

  isConfigured(): boolean {
    return this.key.length > 0 && !this.key.startsWith("sb_");
  }

  async chat(req: ChatRequest): Promise<ProviderResult> {
    const system = req.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
    const contents = req.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: req.temperature ?? 0.7,
        ...(req.jsonMode ? { responseMimeType: "application/json" } : {}),
      },
    };
    if (system) body.systemInstruction = { parts: [{ text: system }] };

    const res = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.key}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    );
    if (!res.ok) {
      const { message, safeDetails, rateLimitDetails } = parseGeminiError(res.status, await res.text());
      throw new ProviderHttpError(res.status, message, safeDetails, rateLimitDetails);
    }
    const data = await res.json();
    const text = (data.candidates?.[0]?.content?.parts ?? [])
      .map((p: { text?: string }) => p.text ?? "").join("");
    return {
      text,
      usage: {
        inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      },
    };
  }

  async healthCheck(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      const res = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${this.key}`,
        {},
        8000,
      );
      return res.ok;
    } catch {
      return false;
    }
  }
}

// ── Anthropic (optional) ──────────────────────────────────────────────────────
export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  readonly model = "claude-sonnet-5";
  private key = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

  isConfigured(): boolean {
    return this.key.length > 0;
  }

  async chat(req: ChatRequest): Promise<ProviderResult> {
    const system = req.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
    const messages = req.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));

    const res = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: req.maxTokens ?? 1024,
        temperature: req.temperature ?? 0.7,
        ...(system ? { system } : {}),
        messages,
      }),
    });
    if (!res.ok) throw new ProviderHttpError(res.status, `Anthropic ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const text = (data.content ?? [])
      .filter((b: { type?: string }) => b.type === "text")
      .map((b: { text?: string }) => b.text ?? "").join("");
    return {
      text,
      usage: {
        inputTokens: data.usage?.input_tokens ?? 0,
        outputTokens: data.usage?.output_tokens ?? 0,
      },
    };
  }

  async healthCheck(): Promise<boolean> {
    // Anthropic has no cheap unauthenticated probe endpoint; treat a configured
    // key as healthy and let the retry/fallback logic handle live failures.
    return this.isConfigured();
  }
}

/**
 * Relative duration string parser — e.g. "7m12s", "1.04s" (Groq's reset-window
 * headers, confirmed empirically against the live API, not assumed from
 * docs), and Gemini's `google.rpc.RetryInfo.retryDelay` field (e.g. "57s",
 * "57.807866169s" — same grammar, different provider). Returns whole/
 * fractional seconds, or null if the string doesn't match the expected shape.
 */
export function parseGroqDuration(raw: string): number | null {
  const match = raw.match(/^(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s)?$/);
  if (!match) return null;
  const [, d, h, m, s] = match;
  if (!d && !h && !m && !s) return null;
  return Number(d || 0) * 86400 + Number(h || 0) * 3600 + Number(m || 0) * 60 + Number(s || 0);
}

/** Standard HTTP Retry-After: either a plain integer (seconds) or an HTTP-date. */
function parseRetryAfter(raw: string): number | null {
  const asNumber = Number(raw);
  if (!Number.isNaN(asNumber)) return asNumber;
  const asDate = Date.parse(raw);
  if (!Number.isNaN(asDate)) return Math.max(0, Math.round((asDate - Date.now()) / 1000));
  return null;
}

/**
 * Reads Groq's real x-ratelimit-* response headers (its organisation's ACTUAL
 * configured limits at the moment of the call, not a hardcoded assumption
 * from the public pricing page) into the bounded ProviderRateLimitDetails
 * shape. Returns undefined when no rate-limit headers are present at all
 * (e.g. a provider that doesn't send them) rather than an all-undefined object.
 */
export function parseGroqRateLimitHeaders(headers: Headers): ProviderRateLimitDetails | undefined {
  const result: ProviderRateLimitDetails = {};

  const remainingRequests = headers.get("x-ratelimit-remaining-requests");
  if (remainingRequests != null && !Number.isNaN(Number(remainingRequests))) result.remainingRequests = Number(remainingRequests);

  const remainingTokens = headers.get("x-ratelimit-remaining-tokens");
  if (remainingTokens != null && !Number.isNaN(Number(remainingTokens))) result.remainingTokens = Number(remainingTokens);

  const resetRequests = headers.get("x-ratelimit-reset-requests");
  if (resetRequests) {
    const secs = parseGroqDuration(resetRequests);
    if (secs != null) result.resetRequestsAt = new Date(Date.now() + secs * 1000).toISOString();
  }

  const resetTokens = headers.get("x-ratelimit-reset-tokens");
  if (resetTokens) {
    const secs = parseGroqDuration(resetTokens);
    if (secs != null) result.resetTokensAt = new Date(Date.now() + secs * 1000).toISOString();
  }

  const retryAfter = headers.get("retry-after");
  if (retryAfter) {
    const secs = parseRetryAfter(retryAfter);
    if (secs != null) result.retryAfterSeconds = secs;
  }

  return Object.keys(result).length ? result : undefined;
}

// ── Groq (Ultra-fast inference & JSON schemas) ─────────────────────────────
export class GroqProvider implements AIProvider {
  readonly name = "groq";
  readonly model: string;
  private key = Deno.env.get("GROQ_API_KEY") ?? "";

  constructor(model = "llama-3.3-70b-versatile") {
    this.model = model;
  }

  isConfigured(): boolean {
    return this.key.length > 0 && this.key.startsWith("gsk_");
  }

  async chat(req: ChatRequest): Promise<ProviderResult> {
    const res = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.key}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: req.messages,
        temperature: req.temperature ?? 0.5,
        ...(req.maxTokens ? { max_tokens: req.maxTokens } : {}),
        ...(req.jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!res.ok) {
      const rateLimitDetails = parseGroqRateLimitHeaders(res.headers);
      throw new ProviderHttpError(res.status, `Groq ${res.status}: ${await res.text()}`, undefined, rateLimitDetails);
    }
    const data = await res.json();
    return {
      text: data.choices?.[0]?.message?.content ?? "",
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
      },
    };
  }

  async healthCheck(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      const res = await fetchWithTimeout(
        "https://api.groq.com/openai/v1/models",
        { headers: { Authorization: `Bearer ${this.key}` } },
        8000,
      );
      return res.ok;
    } catch {
      return false;
    }
  }
}


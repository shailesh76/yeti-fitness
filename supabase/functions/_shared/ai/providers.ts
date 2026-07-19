// Concrete AI providers. Each implements the AIProvider contract and normalises
// its native request/response shape into { text, usage }.
import { AIProvider, ChatRequest, ProviderHttpError, ProviderResult } from "./types.ts";

const DEFAULT_TIMEOUT_MS = 30_000;

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
    return this.key.length > 0;
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
    return this.key.length > 0;
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
    if (!res.ok) throw new ProviderHttpError(res.status, `Gemini ${res.status}: ${await res.text()}`);
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

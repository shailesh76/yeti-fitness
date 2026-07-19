// Deno unit tests for the shared AI provider service.
// Run with:  deno test --allow-env supabase/functions/_shared/ai/service_test.ts
//
// Covers Task 6 AI requirements: OpenAI failure → Gemini fallback, token capture,
// cost computation, and the "no provider configured" error path.
import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { computeCostUsd } from "./pricing.ts";
import { generateChat } from "./service.ts";
import { AINotConfiguredError } from "./types.ts";

function stubFetch(handler: (url: string) => Response): () => void {
  const original = globalThis.fetch;
  globalThis.fetch = ((input: string | URL | Request) =>
    Promise.resolve(handler(String(input)))) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

function clearKeys() {
  Deno.env.delete("OPENAI_API_KEY");
  Deno.env.delete("GEMINI_API_KEY");
  Deno.env.delete("ANTHROPIC_API_KEY");
}

Deno.test("computeCostUsd: gpt-4-turbo 1k in / 1k out = $0.04", () => {
  assertEquals(computeCostUsd("gpt-4-turbo", { inputTokens: 1000, outputTokens: 1000 }), 0.04);
});

Deno.test("computeCostUsd: unknown model costs 0", () => {
  assertEquals(computeCostUsd("mystery-model", { inputTokens: 999, outputTokens: 999 }), 0);
});

Deno.test("generateChat throws AINotConfiguredError when no keys are set", async () => {
  clearKeys();
  await assertRejects(
    () => generateChat({ messages: [{ role: "user", content: "hi" }] }),
    AINotConfiguredError,
  );
});

Deno.test("OpenAI failure falls back to Gemini and captures usage", async () => {
  clearKeys();
  Deno.env.set("OPENAI_API_KEY", "sk-test");
  Deno.env.set("GEMINI_API_KEY", "gm-test");

  const restore = stubFetch((url) => {
    if (url.includes("api.openai.com")) {
      return new Response("upstream boom", { status: 500 });
    }
    if (url.includes("generativelanguage")) {
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: "hi from gemini" }] } }],
          usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 7 },
        }),
        { status: 200 },
      );
    }
    return new Response("not found", { status: 404 });
  });

  try {
    const res = await generateChat({ messages: [{ role: "user", content: "hi" }] });
    assertEquals(res.provider, "gemini");
    assertEquals(res.text, "hi from gemini");
    assertEquals(res.usage.inputTokens, 5);
    assertEquals(res.usage.outputTokens, 7);
    assertEquals(res.attempts, ["openai", "gemini"]);
  } finally {
    restore();
    clearKeys();
  }
});

Deno.test("OpenAI success returns immediately without fallback", async () => {
  clearKeys();
  Deno.env.set("OPENAI_API_KEY", "sk-test");
  Deno.env.set("GEMINI_API_KEY", "gm-test");

  const restore = stubFetch((url) => {
    if (url.includes("api.openai.com")) {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "hi from openai" } }],
          usage: { prompt_tokens: 10, completion_tokens: 20 },
        }),
        { status: 200 },
      );
    }
    throw new Error("Gemini should not be called when OpenAI succeeds");
  });

  try {
    const res = await generateChat({ messages: [{ role: "user", content: "hi" }] });
    assertEquals(res.provider, "openai");
    assertEquals(res.text, "hi from openai");
    assertEquals(res.usage, { inputTokens: 10, outputTokens: 20 });
  } finally {
    restore();
    clearKeys();
  }
});

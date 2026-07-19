// Per-model pricing (USD per 1M tokens) for cost tracking. Approximate published
// list prices; update as provider pricing changes. Unknown models cost 0 (logged as such).
import { TokenUsage } from "./types.ts";

export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4-turbo":      { input: 10.0,  output: 30.0 },
  "gpt-4o":           { input: 2.5,   output: 10.0 },
  "gemini-2.5-flash": { input: 0.30,  output: 2.50 },
  "gemini-1.5-flash": { input: 0.075, output: 0.30 },
  "claude-sonnet-5":  { input: 3.0,   output: 15.0 },
};

export function computeCostUsd(model: string, usage: TokenUsage): number {
  const p = MODEL_PRICING[model];
  if (!p) return 0;
  const cost = (usage.inputTokens / 1_000_000) * p.input +
    (usage.outputTokens / 1_000_000) * p.output;
  return Number(cost.toFixed(6));
}

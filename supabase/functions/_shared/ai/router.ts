// Task-Based Dual-Provider AI Router (Gemini 2.5 Flash + Groq)
// Routes AI calls according to task specialization and provider quotas/latency:
//   - workout_plan: Gemini 2.5 Flash (Primary) → Groq openai/gpt-oss-20b (Fallback)
//   - exercise_swap: Groq openai/gpt-oss-20b (Primary) → Gemini 2.5 Flash (Fallback)
//   - workout_summary: Groq openai/gpt-oss-20b (Primary) → Gemini 2.5 Flash (Fallback)
//   - nutrition_image: Gemini 2.5 Flash (Exclusive multimodal)
import { AIProvider, AINotConfiguredError, ChatRequest, ProviderHttpError, TokenUsage } from "./types.ts";
import { GeminiProvider, GroqProvider } from "./providers.ts";
import { computeCostUsd } from "./pricing.ts";

export type AiTaskType = 'workout_plan' | 'exercise_swap' | 'workout_summary' | 'nutrition_image';

export interface ExecuteTaskOptions {
  taskType: AiTaskType;
  req: ChatRequest;
  userId?: string;
  subscriptionTier?: string;
  supabaseServiceRole?: any;
}

export interface TaskExecutionResult {
  text: string;
  provider: string;
  model: string;
  usage: TokenUsage;
  costUsd: number;
  latencyMs: number;
  attempts: string[];
}

function getProviderChainForTask(taskType: AiTaskType): AIProvider[] {
  switch (taskType) {
    case 'workout_plan':
      return [
        new GeminiProvider(),
        new GroqProvider('openai/gpt-oss-20b'),
      ];
    case 'exercise_swap':
    case 'workout_summary':
      return [
        new GroqProvider('openai/gpt-oss-20b'),
        new GeminiProvider(),
      ];
    case 'nutrition_image':
      return [
        new GeminiProvider(),
      ];
  }
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
 * Execute an AI task using the optimal primary provider, falling back to a secondary provider.
 * Logs token usage, execution latency, and estimated cost to `ai_request_logs` if service role is supplied.
 */
export async function executeAiTask(options: ExecuteTaskOptions): Promise<TaskExecutionResult> {
  const { taskType, req, userId, subscriptionTier = 'FREE', supabaseServiceRole } = options;
  const providers = getProviderChainForTask(taskType);
  const configured = providers.filter((p) => p.isConfigured());

  if (configured.length === 0) {
    throw new AINotConfiguredError();
  }

  const startTime = Date.now();
  const attempts: string[] = [];
  let lastError: unknown;

  for (const provider of configured) {
    attempts.push(`${provider.name}:${provider.model}`);
    try {
      const { text, usage } = await withRetry(() => provider.chat(req));
      const latencyMs = Date.now() - startTime;
      const costUsd = computeCostUsd(provider.model, usage);

      // Audit log to ai_request_logs (non-blocking)
      if (supabaseServiceRole && userId) {
        supabaseServiceRole.from('ai_request_logs').insert({
          athlete_id: userId,
          subscription_tier: subscriptionTier,
          success: true,
          coach_type: taskType,
          provider: provider.name,
          model: provider.model,
          input_tokens: usage.inputTokens,
          output_tokens: usage.outputTokens,
          cost_usd: costUsd,
        }).then(() => {}).catch((err: any) => console.warn('[ai/router] failed to log ai_request_log:', err));
      }

      return {
        text,
        provider: provider.name,
        model: provider.model,
        usage,
        costUsd,
        latencyMs,
        attempts,
      };
    } catch (e) {
      lastError = e;
      console.error(`[ai/router] task "${taskType}" provider "${provider.name}:${provider.model}" failed:`, (e as Error).message);
    }
  }

  // If all attempted providers failed, log error if client supplied
  if (supabaseServiceRole && userId) {
    supabaseServiceRole.from('ai_request_logs').insert({
      athlete_id: userId,
      subscription_tier: subscriptionTier,
      success: false,
      error_reason: (lastError as Error)?.message || 'All providers failed',
      coach_type: taskType,
    }).then(() => {}).catch(() => {});
  }

  throw lastError ?? new Error(`All AI providers failed for task "${taskType}"`);
}

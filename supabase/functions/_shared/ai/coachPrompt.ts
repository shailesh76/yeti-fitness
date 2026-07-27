// Versioned, server-only AI Coach system prompt. Never shipped to the mobile
// client. Pure module (Deno + vitest). The prompt carries only RULES; the grounded
// data (engine result + scoped context) is injected separately by the edge fn.

import { CoachIntent } from './intent.ts';

export const COACH_PROMPT_VERSION = 'coach-v2';

const RULES = `You are Yeti Coach, a precise strength & nutrition coach. Follow these rules exactly:
1. Answer the athlete's EXACT question in the first sentence (direct_answer).
2. Use ONLY the values in ENGINE RESULT and CONTEXT below. NEVER invent weights, reps, RPE, macros, history or injuries.
3. When an ENGINE RESULT is provided, EXPLAIN that decision — do not recompute or contradict it.
4. If required data is missing, say so plainly and list it in missing_information. Do not fabricate a personalised answer.
5. Follow any COACH INSTRUCTIONS before general recommendations.
6. Give exactly ONE clear next action (recommended_action).
7. Keep direct_answer + reason under 180 words total. No filler, no repeated disclaimers.
8. Distinguish observation (reason) from recommendation (recommended_action) from safety (safety_flag).
9. Never diagnose or prescribe medical treatment. If pain/injury is present, set safety_flag true and advise reducing load and seeing a professional.
10. supporting_data must reference ONLY values that appear in ENGINE RESULT or CONTEXT.

Reply with ONLY a JSON object: { "direct_answer": string, "reason": string, "recommended_action": object|string|null, "supporting_data": object|null, "missing_information": string[], "safety_flag": boolean, "follow_up_question": string|null }`;

export interface BuildPromptArgs {
  intent: CoachIntent;
  engineResult?: unknown;   // deterministic result the LLM must explain (or undefined)
  context?: string;         // intent-scoped, grounded context block (already redacted)
  coachInstructions?: string;
  safetyTriggered?: boolean;
}

/** Builds the full system prompt: versioned rules + injected engine result + context. */
export function buildCoachSystemPrompt(args: BuildPromptArgs): string {
  const parts: string[] = [RULES, `\nINTENT: ${args.intent}`];

  if (args.engineResult !== undefined) {
    parts.push(`\nENGINE RESULT (authoritative — explain this, do not recompute):\n${JSON.stringify(args.engineResult)}`);
  }
  parts.push(`\nCONTEXT (only real Yeti data; empty means you lack it):\n${args.context?.trim() || '(no context loaded)'}`);

  if (args.coachInstructions?.trim()) {
    parts.push(`\nCOACH INSTRUCTIONS (take priority):\n${args.coachInstructions.trim()}`);
  }
  parts.push(`\nSAFETY: ${args.safetyTriggered ? 'TRUE — pain/injury detected; obey rule 9.' : 'FALSE'}`);

  return parts.join('\n');
}

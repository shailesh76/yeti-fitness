// Deterministic parsing of a workout-plan-edit command. App logic extracts the
// ACTION + the raw exercise phrase (and replacement / target day / sets / reps / rest);
// canonical exercise naming and the actual plan proposal/mutation are done by the
// app/catalog, and the LLM is used only to confirm the exercise and explain the change.
// Pure module (Deno + vitest).

import { detectWorkoutPlanEdit } from './intent.ts';

export type PlanEditAction = 'add' | 'remove' | 'replace' | 'move' | 'update_sets_reps' | 'update_rest';

export interface PlanEditRequest {
  action: PlanEditAction;
  exercise: string;        // raw exercise phrase (e.g. "high to low fly")
  replacement?: string;    // for "replace X with Y"
  targetDay?: string;      // for "move X to <day>" / "add X to <day>"
  sets?: string;           // e.g. "4"
  reps?: string;           // e.g. "8-10"
  restSeconds?: number;    // e.g. 90
  ambiguous: boolean;      // true when the exercise phrase couldn't be extracted
  raw: string;
}

// A trailing "... to <day>" only counts as a day when it looks like one, so
// "high to low fly" is NOT mis-parsed as "add high → day 'low fly'".
const DAY_LIKE = /^((push|pull|leg|legs|upper|lower|chest|back|shoulders?|arms?|full body|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b.*|day\s*\d+.*)$/i;

function clean(s: string): string {
  return (s || '')
    .replace(/^(and|now|please|ok|okay|so|also|then|could you|can you|i want to)\s+/i, '')
    .replace(/[?.!,]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Parses a plan-edit command, or null if the message isn't a plan edit. */
export function parsePlanEdit(message: string): PlanEditRequest | null {
  if (!detectWorkoutPlanEdit(message)) return null;
  const raw = message.trim();
  const lower = raw.toLowerCase();

  // 1. replace / swap / switch X with|for Y
  let match = lower.match(/\b(?:replace|swap|switch)\s+(.+?)\s+(?:with|for)\s+(.+)$/);
  if (match) {
    const exercise = clean(match[1]);
    const replacement = clean(match[2]);
    return { action: 'replace', exercise, replacement, ambiguous: !exercise || !replacement, raw };
  }

  // 2. update rest: "change/set rest (time) for/on X to N sec/seconds/min/minutes" or "change X rest to N..."
  match = lower.match(/\b(?:change|set|update)\s+(?:the\s+)?rest(?:\s+time)?\s+(?:for|on|of)\s+(.+?)\s+to\s+(\d+)\s*(s|sec|seconds?|m|min|minutes?)\b/)
    || lower.match(/\b(?:change|set|update)\s+(.+?)\s+rest(?:\s+time)?\s+to\s+(\d+)\s*(s|sec|seconds?|m|min|minutes?)\b/);
  if (match) {
    const exercise = clean(match[1]);
    const num = parseInt(match[2], 10);
    const unit = match[3] || 's';
    const restSeconds = unit.startsWith('m') ? num * 60 : num;
    return { action: 'update_rest', exercise, restSeconds, ambiguous: !exercise || isNaN(restSeconds), raw };
  }

  // 3. update sets/reps: "change/update/set X to N sets of M (reps) [on <day>]"
  match = lower.match(/\b(?:change|set|update)\s+(.+?)\s+to\s+(\d+)\s+sets?\s+(?:of\s+)?(\d+(?:-\d+)?)\s*(?:reps?)?(?:\s+(?:on|for|in)\s+(.+))?$/)
    || lower.match(/\b(?:change|set|update)\s+(?:sets?\s+(?:and|&)\s+reps?\s+(?:for|on|of)\s+)?(.+?)\s+to\s+(\d+)\s*x\s*(\d+(?:-\d+)?)(?:\s+(?:on|for|in)\s+(.+))?$/);
  if (match) {
    const exercise = clean(match[1]);
    const sets = match[2];
    const reps = match[3];
    const targetDay = match[4] && DAY_LIKE.test(match[4].trim()) ? clean(match[4]) : undefined;
    return { action: 'update_sets_reps', exercise, sets, reps, targetDay, ambiguous: !exercise, raw };
  }

  match = lower.match(/\b(?:change|set|update)\s+(.+?)\s+to\s+(\d+)\s+sets?(?:\s+(?:on|for|in)\s+(.+))?$/);
  if (match) {
    const exercise = clean(match[1]);
    const sets = match[2];
    const targetDay = match[3] && DAY_LIKE.test(match[3].trim()) ? clean(match[3]) : undefined;
    return { action: 'update_sets_reps', exercise, sets, targetDay, ambiguous: !exercise, raw };
  }

  match = lower.match(/\b(?:change|set|update)\s+(.+?)\s+to\s+(\d+(?:-\d+)?)\s+reps?(?:\s+(?:on|for|in)\s+(.+))?$/);
  if (match) {
    const exercise = clean(match[1]);
    const reps = match[2];
    const targetDay = match[3] && DAY_LIKE.test(match[3].trim()) ? clean(match[3]) : undefined;
    return { action: 'update_sets_reps', exercise, reps, targetDay, ambiguous: !exercise, raw };
  }

  // 4. move X to <day>  (move always targets a day)
  match = lower.match(/\bmove\s+(.+?)\s+to\s+(.+)$/);
  if (match) {
    const exercise = clean(match[1]);
    return { action: 'move', exercise, targetDay: clean(match[2]), ambiguous: !exercise, raw };
  }

  // 5. remove / delete / drop / take out X [from/on/in <day>]
  match = lower.match(/\b(?:remove|delete|drop|take out)\s+(.+)$/);
  if (match) {
    let rest = match[1];
    let targetDay: string | undefined;
    const fromDay = rest.match(/^(.+?)\s+(?:from|on|in)\s+(.+)$/);
    if (fromDay && DAY_LIKE.test(fromDay[2].trim())) {
      rest = fromDay[1];
      targetDay = clean(fromDay[2]);
    }
    const exercise = clean(rest);
    return { action: 'remove', exercise, targetDay, ambiguous: exercise.length === 0, raw };
  }

  // 6. add / insert / put X [to <day-like>] [with N sets of M reps]
  match = lower.match(/\b(?:add|insert|put)\s+(.+)$/);
  if (match) {
    let rest = match[1];
    let sets: string | undefined;
    let reps: string | undefined;

    // Check for "with 3 sets of 10" or "for 4 sets of 8-12"
    const setsRepsMatch = rest.match(/\s+(?:with|for)\s+(\d+)\s+sets?(?:\s+of\s+(\d+(?:-\d+)?)\s*(?:reps?)?)?/i);
    if (setsRepsMatch) {
      sets = setsRepsMatch[1];
      reps = setsRepsMatch[2];
      rest = rest.replace(setsRepsMatch[0], '');
    }

    let targetDay: string | undefined;
    const toDay = rest.match(/^(.+?)\s+to\s+(.+)$/);
    if (toDay && DAY_LIKE.test(toDay[2].trim())) {
      rest = toDay[1];
      targetDay = clean(toDay[2]);
    }
    const exercise = clean(rest);
    return { action: 'add', exercise, targetDay, sets, reps, ambiguous: exercise.length === 0, raw };
  }

  // Detected a plan edit but couldn't parse structure → ambiguous (LLM clarifies).
  return { action: 'add', exercise: '', ambiguous: true, raw };
}

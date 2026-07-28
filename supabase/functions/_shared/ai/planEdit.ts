// Deterministic parsing of a workout-plan-edit command. App logic extracts the
// ACTION + the raw exercise phrase (and replacement / target day); canonical
// exercise naming and the actual plan mutation are done by the app/catalog, and
// the LLM is used only to confirm the exercise and explain the change — never to
// invent the whole mutation. Pure module (Deno + vitest).

import { detectWorkoutPlanEdit } from './intent.ts';

export type PlanEditAction = 'add' | 'remove' | 'replace' | 'move';

export interface PlanEditRequest {
  action: PlanEditAction;
  exercise: string;        // raw exercise phrase (e.g. "high to low fly")
  replacement?: string;    // for "replace X with Y"
  targetDay?: string;      // for "move X to <day>" / "add X to <day>"
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

  // replace / swap / switch X with|for Y
  let match = lower.match(/\b(?:replace|swap|switch)\s+(.+?)\s+(?:with|for)\s+(.+)$/);
  if (match) {
    const exercise = clean(match[1]);
    const replacement = clean(match[2]);
    return { action: 'replace', exercise, replacement, ambiguous: !exercise || !replacement, raw };
  }

  // move X to <day>  (move always targets a day)
  match = lower.match(/\bmove\s+(.+?)\s+to\s+(.+)$/);
  if (match) {
    const exercise = clean(match[1]);
    return { action: 'move', exercise, targetDay: clean(match[2]), ambiguous: !exercise, raw };
  }

  // remove / delete / drop / take out X
  match = lower.match(/\b(?:remove|delete|drop|take out)\s+(.+)$/);
  if (match) {
    const exercise = clean(match[1]);
    return { action: 'remove', exercise, ambiguous: exercise.length === 0, raw };
  }

  // add / insert / put X [to <day-like>]
  match = lower.match(/\b(?:add|insert|put)\s+(.+)$/);
  if (match) {
    let rest = match[1];
    let targetDay: string | undefined;
    const toDay = rest.match(/^(.+?)\s+to\s+(.+)$/);
    if (toDay && DAY_LIKE.test(toDay[2].trim())) {
      rest = toDay[1];
      targetDay = clean(toDay[2]);
    }
    const exercise = clean(rest);
    return { action: 'add', exercise, targetDay, ambiguous: exercise.length === 0, raw };
  }

  // Detected a plan edit but couldn't parse structure → ambiguous (LLM clarifies).
  return { action: 'add', exercise: '', ambiguous: true, raw };
}

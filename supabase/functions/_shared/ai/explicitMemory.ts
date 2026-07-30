// Deterministic explicit-memory command detector. Pure module (Deno + vitest).
// Runs ALONGSIDE classifyIntent() — not a CoachIntent value and not a
// replacement for the 20-value enum, since an explicit memory command can
// co-occur with any other intent ("remember I prefer dumbbells, now build me
// a workout"). Conservative by design: only fires on a recognised trigger
// phrase, and still rejects transient-shaped content even then ("remember
// that I trained badly today").

import { classifyMemory, MemoryCategory } from './memoryClassifier.ts';

export type ExplicitMemoryOperation = 'upsert' | 'delete' | 'none';
export type ExplicitMemoryConfidence = 'high' | 'medium' | 'low';

export interface ExplicitMemoryResult {
  detected: boolean;
  operation: ExplicitMemoryOperation;
  category?: MemoryCategory;
  memoryKey?: string;
  memoryValue?: string;
  confidence: ExplicitMemoryConfidence;
  requiresClarification?: boolean;
}

const NOT_DETECTED: ExplicitMemoryResult = { detected: false, operation: 'none', confidence: 'low' };

// Order matters: "don't forget that" MUST be checked before the bare "forget
// that" — the plain pattern is a literal substring of the negated one
// ("don't **forget that**..."), so checking it first would misread every
// "don't forget that X" (save) as "forget that X" (delete).
const TRIGGER_PATTERNS: { pattern: RegExp; operation: 'upsert' | 'delete' }[] = [
  { pattern: /\bdon'?t forget that\s+(.+)/i, operation: 'upsert' },
  { pattern: /\bforget that\s+(.+)/i, operation: 'delete' },
  { pattern: /\bremember that\s+(.+)/i, operation: 'upsert' },
  { pattern: /\bsave that\s+(.+)/i, operation: 'upsert' },
  { pattern: /\bfrom now on,?\s+(.+)/i, operation: 'upsert' },
  { pattern: /\b(i prefer\s+.+)/i, operation: 'upsert' },
  { pattern: /\b(i don'?t eat\s+.+)/i, operation: 'upsert' },
  { pattern: /\b(i am allergic to\s+.+)/i, operation: 'upsert' },
  { pattern: /\b(my usual\s+.+)/i, operation: 'upsert' },
];

// Explicit-phrasing hedges — downgrade confidence even when a trigger
// literally matches, since "maybe I prefer machines" is not a durable fact.
const HEDGE_WORDS = /\b(maybe|perhaps|possibly|might|probably|i think|not sure|i guess|could be)\b/i;

const STOPWORDS = new Set(['i', 'a', 'an', 'the', 'that', 'to', 'my', 'is', 'am', 'are', 'of']);

function slugifyMemoryKey(coreStatement: string): string {
  const words = coreStatement
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w));
  return words.slice(0, 6).join('_') || 'preference';
}

// Specific/dangerous categories checked before the broader nutrition
// like/dislike catch, so "I don't like leg day" doesn't get miscategorised
// as a food preference just because "like" is a substring.
const CATEGORY_KEYWORDS: [MemoryCategory, RegExp][] = [
  ['injuries', /\b(injur\w*|pain|hurt\w*|sore|knee|shoulder|elbow|wrist|hip|neck)\b/i],
  ['equipment preferences', /\b(dumbbell|barbell|machine|band|kettlebell|gym|equipment)s?\b/i],
  ['workout style', /\b(workout|session|split|minutes?|duration|routine|leg day|push day|pull day|training day|reps?|sets?)\b/i],
  ['nutrition preferences', /\b(eat|food|diet|vegetarian|vegan|allerg\w*|dairy|meat|gluten|mushroom|protein|carb|calorie|meal|dislikes?|likes?)\w*\b/i],
  ['training goals', /\b(goal|lose weight|gain weight|bulk|cut|build muscle|strength|hypertrophy)\w*\b/i],
];

function guessCategory(coreStatement: string): MemoryCategory {
  for (const [category, pattern] of CATEGORY_KEYWORDS) {
    if (pattern.test(coreStatement)) return category;
  }
  return 'preferences';
}

/**
 * Deterministically recognises explicit memory commands. Returns
 * `detected: false` for anything that isn't a clear trigger phrase, and for
 * anything that IS a trigger phrase but describes a transient state ("...
 * today", "I'm tired", etc) rather than a durable fact — reusing
 * classifyMemory()'s existing transience gate so both the deterministic and
 * LLM-driven paths agree on what counts as "temporary".
 */
export function detectExplicitMemoryCommand(message: string): ExplicitMemoryResult {
  const raw = message || '';
  for (const { pattern, operation } of TRIGGER_PATTERNS) {
    const match = raw.match(pattern);
    if (!match) continue;

    const core = (match[1] || '').replace(/[.!?]+$/, '').trim();
    if (!core) continue;

    // Still reject transient-shaped statements even under an explicit trigger
    // — "remember that I trained badly today" must not be saved as durable.
    const classification = classifyMemory(core);
    if (classification.reason === 'temporary state') return NOT_DETECTED;

    const isHedged = HEDGE_WORDS.test(raw);
    const category = guessCategory(core);
    const memoryKey = slugifyMemoryKey(core);

    return {
      detected: true,
      operation,
      category,
      memoryKey,
      memoryValue: operation === 'upsert' ? core : undefined,
      confidence: isHedged ? 'low' : 'high',
      requiresClarification: isHedged || undefined,
    };
  }
  return NOT_DETECTED;
}

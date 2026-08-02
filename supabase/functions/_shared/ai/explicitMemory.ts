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
      // Populated for BOTH operations — a delete needs the fact's own text
      // too (for a deterministic "mushrooms are no longer saved" reply, not
      // just the key to delete by). Previously undefined for delete since
      // nothing read it yet; still means "the fact this command is about",
      // not "the value being written".
      memoryValue: core,
      confidence: isHedged ? 'low' : 'high',
      requiresClarification: isHedged || undefined,
    };
  }
  return NOT_DETECTED;
}

// ── Deterministic retrieval questions ───────────────────────────────────────
// A NARROW, separate detector from the write-command one above: recognises
// only direct questions asking to read back a specific fact category already
// covered by explicit memory (disliked/liked foods, equipment). Deliberately
// conservative and anchored on "what ... do/did I" — ordinary requests
// ("make me a meal plan") never start this way, so this cannot hijack a real
// nutrition/workout ask into a memory-only answer.

export type ExplicitMemoryRetrievalType = 'disliked_foods' | 'liked_foods' | 'equipment_preferences';

export interface ExplicitMemoryRetrievalResult {
  detected: boolean;
  retrievalType?: ExplicitMemoryRetrievalType;
}

// Order matters, same adjacency-strictness lesson as the write-command
// triggers above: "What foods don't I like?" has a negation ("don't")
// separated from "like" by "I" — a naive .{0,N}\b(like)\b gap-match for
// liked_foods would find "like" regardless of the negation sitting right
// before it and misclassify a DISLIKE question as a LIKE one. The negated
// pattern is checked BEFORE the plain "like/prefer/enjoy" pattern so it wins
// first on exactly this phrasing.
const RETRIEVAL_PATTERNS: { pattern: RegExp; type: ExplicitMemoryRetrievalType }[] = [
  { pattern: /\bwhat (?:foods?|do i eat).{0,40}\b(avoid|dislikes?)\b/i, type: 'disliked_foods' },
  { pattern: /\bwhat (?:foods?).{0,40}\b(?:don'?t|doesn'?t|can'?t|won'?t|not)\b.{0,15}\b(?:like|eat)\b/i, type: 'disliked_foods' },
  { pattern: /\bwhat (?:foods?).{0,20}\b(like|prefer|enjoy)\b/i, type: 'liked_foods' },
  { pattern: /\bwhat equipment.{0,20}\b(prefer|have|like|use)\b/i, type: 'equipment_preferences' },
];

const NOT_DETECTED_RETRIEVAL: ExplicitMemoryRetrievalResult = { detected: false };

export function detectExplicitMemoryRetrieval(message: string): ExplicitMemoryRetrievalResult {
  const raw = message || '';
  for (const { pattern, type } of RETRIEVAL_PATTERNS) {
    if (pattern.test(raw)) return { detected: true, retrievalType: type };
  }
  return NOT_DETECTED_RETRIEVAL;
}

// ── Deterministic response text (no LLM involved) ───────────────────────────
// Renders plain, natural-sounding sentences directly from a stored fact or a
// folded memory list — used only for the narrow set of operations above, so
// a save/delete/retrieval turn never needs a provider call at all.

/** "I don't like mushrooms" -> "mushrooms"; falls back to the full fact if no lead-in phrase matches. */
export function extractFactSubject(fact: string): string {
  const stripped = fact
    .replace(/^i\s+(?:don'?t like|dislikes?|hate|am allergic to|can'?t eat|no longer eat|prefer|love|enjoy|like)\s+/i, '')
    .trim();
  return stripped || fact;
}

/** "I don't like mushrooms" -> "you don't like mushrooms"; "My usual split..." -> "Your usual split...". Best-effort — falls back to the original text for phrasing it doesn't recognise. */
export function toSecondPerson(fact: string): string {
  let out = fact;
  if (/^i\b/i.test(out)) out = out.replace(/^i\b/i, 'you').replace(/\bam\b/i, 'are');
  out = out.replace(/\bmy\b/gi, 'your');
  return out;
}

function joinNaturally(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function article(phrase: string): string {
  return /^[aeiou]/i.test(phrase) ? 'an' : 'a';
}

const CATEGORY_LABELS: Record<string, string> = {
  'nutrition preferences': 'disliked food',
  'equipment preferences': 'equipment preference',
  injuries: 'injury',
  'workout style': 'preference',
  'training goals': 'preference',
  preferences: 'preference',
};

/** "Remembered — you don't like mushrooms." */
export function buildSaveAcknowledgment(fact: string): string {
  return `Remembered — ${toSecondPerson(fact)}.`;
}

/** "Removed — mushrooms are no longer saved as a disliked food." */
export function buildDeleteAcknowledgment(fact: string, category?: string): string {
  const subject = extractFactSubject(fact);
  const categoryLabel = (category && CATEGORY_LABELS[category]) || 'preference';
  const verb = subject.trim().toLowerCase().endsWith('s') ? 'are' : 'is';
  return `Removed — ${subject} ${verb} no longer saved as ${article(categoryLabel)} ${categoryLabel}.`;
}

/**
 * "You've told me you avoid mushrooms and pickles." / a durable, honest
 * fallback when nothing is stored yet — never fabricates a fact.
 */
export function buildRetrievalAnswer(type: ExplicitMemoryRetrievalType, facts: string[]): string {
  const subjects = [...new Set(facts.map(extractFactSubject))];
  if (!subjects.length) {
    if (type === 'disliked_foods') return "You haven't told me about any foods to avoid yet.";
    if (type === 'liked_foods') return "You haven't told me about any foods you like yet.";
    return "You haven't told me about any equipment preferences yet.";
  }
  const list = joinNaturally(subjects);
  if (type === 'disliked_foods') return `You've told me you avoid ${list}.`;
  if (type === 'liked_foods') return `You've told me you like ${list}.`;
  return `You prefer ${list}.`;
}

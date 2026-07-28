// Canonical exercise alias resolution. Deterministically maps common aliases,
// abbreviations and word-order variants to a canonical SEARCH TERM; the caller
// (edge fn) then looks up the exercise row by that term. Pure (Deno + vitest) so
// the aliasing is unit-testable independent of the DB. Extend ALIASES freely — it
// never replaces the DB lookup, only improves what we search for.

// alias (normalized) → canonical search term
const ALIASES: Record<string, string> = {
  // Smith / machine incline presses
  'incline smith': 'incline smith machine press',
  'smith incline': 'incline smith machine press',
  'smith press': 'smith machine press',
  'incline machine press': 'incline machine press',
  // Flyes
  'cable fly': 'cable fly',
  'cable flye': 'cable fly',
  'high to low fly': 'high to low cable fly',
  'high-to-low fly': 'high to low cable fly',
  'low to high fly': 'low to high cable fly',
  // Pulldowns
  'lat pulldown': 'lat pulldown',
  'close grip pulldown': 'close grip lat pulldown',
  'close-grip pulldown': 'close grip lat pulldown',
  // Rows
  'db row': 'dumbbell row',
  'dumbbell row': 'dumbbell row',
  'bb row': 'barbell row',
  'rows': 'barbell row',
  'row': 'barbell row',
  // Presses
  'shoulder press': 'shoulder press',
  'machine shoulder press': 'machine shoulder press',
  'ohp': 'overhead press',
  'bench': 'bench press',
  'incline bench': 'incline bench press',
  'decline bench': 'decline bench press',
  // Legs / misc
  'rdl': 'romanian deadlift',
  'bulgarian split squat': 'bulgarian split squat',
  'leg press': 'leg press',
  'dips': 'dips',
  'lateral raise': 'lateral raise',
  'lat raise': 'lateral raise',
};

/** Lowercases, strips punctuation and collapses whitespace. */
export function normalizeExerciseInput(raw: string): string {
  return (raw || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Resolves an alias/abbreviation to a canonical search term. Exact-alias match
 * first, then the longest contained-alias match, else the normalized input.
 */
export function resolveExerciseAlias(raw: string): string {
  const n = normalizeExerciseInput(raw);
  if (!n) return '';
  if (ALIASES[n]) return ALIASES[n];

  // Longest matching alias contained in the input wins (e.g. "smith incline
  // press today" → "incline smith machine press").
  let best = '';
  let bestLen = 0;
  for (const alias of Object.keys(ALIASES)) {
    if (n.includes(alias) && alias.length > bestLen) { best = ALIASES[alias]; bestLen = alias.length; }
  }
  return best || n;
}

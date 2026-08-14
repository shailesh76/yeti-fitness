// Canonical exercise alias resolution & first-party database catalog grounding.
// Deterministically maps common aliases, abbreviations and word-order variants
// to canonical search terms, retrieves records from the database first,
// and enforces that LLMs explain/coach only based on actual database catalog exercises.

const ALIASES: Record<string, string> = {
  'incline smith': 'incline smith machine press',
  'smith incline': 'incline smith machine press',
  'smith press': 'smith machine press',
  'incline machine press': 'incline machine press',
  'cable fly': 'cable fly',
  'cable flye': 'cable fly',
  'high to low fly': 'high to low cable fly',
  'high-to-low fly': 'high to low cable fly',
  'low to high fly': 'low to high cable fly',
  'lat pulldown': 'lat pulldown',
  'close grip pulldown': 'close grip lat pulldown',
  'close-grip pulldown': 'close grip lat pulldown',
  'db row': 'dumbbell row',
  'dumbbell row': 'dumbbell row',
  'bb row': 'barbell row',
  'rows': 'barbell row',
  'row': 'barbell row',
  'shoulder press': 'shoulder press',
  'machine shoulder press': 'machine shoulder press',
  'ohp': 'overhead press',
  'bench': 'bench press',
  'incline bench': 'incline bench press',
  'decline bench': 'decline bench press',
  'rdl': 'romanian deadlift',
  'bulgarian split squat': 'bulgarian split squat',
  'leg press': 'leg press',
  'dips': 'dips',
  'lateral raise': 'lateral raise',
  'lat raise': 'lateral raise',
  'hack squat': 'hack squat',
  'pec deck': 'pec deck',
  'bayesian curl': 'bayesian cable curl',
  'lower lats': 'lat pulldown',
};

export function normalizeExerciseInput(raw: string): string {
  return (raw || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function extractExerciseName(message: string): string {
  return (message || '')
    .toLowerCase()
    .replace(/[?.!,]/g, ' ')
    .replace(/\b(give me|show me|show|recommend|add|replace|with a similar|similar|machine exercise|cable exercise|exercise|for|my gym does not have|does not have|not present in the catalog|catalog|not present|should i|can i|do i|is it time to|ready to|time to|(?:to\s+)?increase|go up|more weight|heavier|bump( up)?|progress(?:ion)?|\d+[\s-]?week|a|the weight|weight|load|plan|program(?:me)?|routine|my|today|next session|next|reps?|sets?)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function resolveExerciseAlias(raw: string): string {
  const extracted = extractExerciseName(raw);
  const n = normalizeExerciseInput(extracted || raw);
  if (!n) return '';
  if (ALIASES[n]) return ALIASES[n];

  let best = '';
  let bestLen = 0;
  for (const alias of Object.keys(ALIASES)) {
    if (n.includes(alias) && alias.length > bestLen) { best = ALIASES[alias]; bestLen = alias.length; }
  }
  return best || n;
}

/**
 * Searches the first-party database catalog for an exercise before calling LLM.
 */
export async function searchCatalogExercise(supabase: any, rawInput: string): Promise<any | null> {
  if (!supabase || !rawInput) return null;
  const canonical = resolveExerciseAlias(rawInput);
  if (!canonical || canonical.length < 2) return null;

  // 1. Search by exact slug or exact name
  const { data: exact } = await supabase
    .from('exercises')
    .select('*')
    .eq('source_type', 'yeti_first_party')
    .or(`slug.eq.${canonical},name.ilike.${canonical}`)
    .maybeSingle();

  if (exact) return exact;

  // 2. Search by partial name match
  const { data: matches } = await supabase
    .from('exercises')
    .select('*')
    .ilike('name', `%${canonical}%`)
    .eq('source_type', 'yeti_first_party')
    .limit(1);

  if (matches && matches.length > 0) return matches[0];

  // 3. Search exercise_aliases table
  const { data: aliasMatch } = await supabase
    .from('exercise_aliases')
    .select('exercise_id, exercises!inner(*)')
    .ilike('alias', `%${canonical}%`)
    .eq('exercises.source_type', 'yeti_first_party')
    .limit(1);

  if (aliasMatch && aliasMatch.length > 0 && (aliasMatch[0] as any).exercises) {
    return (aliasMatch[0] as any).exercises;
  }

  // 4. Token-based fallback across name / slug
  const tokens = canonical.split(/\s+/).filter(t => t.length > 2);
  if (tokens.length > 0) {
    let q = supabase.from('exercises').select('*').eq('source_type', 'yeti_first_party');
    tokens.forEach(tok => {
      q = q.or(`name.ilike.%${tok}%,slug.ilike.%${tok}%`);
    });
    const { data: tokenMatches } = await q.limit(1);
    if (tokenMatches && tokenMatches.length > 0) return tokenMatches[0];
  }

  return null;
}

/**
 * Formats a retrieved database exercise record into a strict grounding prompt context block.
 * Ensures the LLM is instructed to use the database record and NEVER invent non-existent exercises.
 */
export function buildExerciseGroundingPrompt(exercise: any): string {
  if (!exercise) return 'NO_DATABASE_EXERCISE_FOUND: Rely strictly on standard library exercises or inform user the exercise is not in the database.';

  return (
    `GROUNDED DATABASE EXERCISE RECORD:\n` +
    `- ID: ${exercise.id}\n` +
    `- Source Type: ${exercise.source_type || 'yeti_first_party'}\n` +
    `- Name: ${exercise.name}\n` +
    `- Slug: ${exercise.slug || 'n/a'}\n` +
    `- Primary Muscle: ${exercise.primary_muscle || exercise.target_muscle || exercise.muscle_group || 'n/a'}\n` +
    `- Category: ${exercise.category || 'n/a'}\n` +
    `- Equipment: ${exercise.equipment || 'n/a'}\n` +
    `- Movement Pattern: ${exercise.movement_pattern || 'n/a'}\n` +
    `- Setup Instructions: ${exercise.setup_instructions || exercise.instructions || 'n/a'}\n` +
    `- Execution Instructions: ${exercise.execution_instructions || exercise.instructions || 'n/a'}\n` +
    `- Coaching Cues: ${Array.isArray(exercise.coaching_cues) ? exercise.coaching_cues.join('; ') : exercise.coaching_cues || 'n/a'}\n` +
    `- Common Mistakes: ${Array.isArray(exercise.common_mistakes) ? exercise.common_mistakes.join('; ') : exercise.common_mistakes || 'n/a'}\n` +
    `- Safety Notes: ${exercise.safety_notes || 'n/a'}\n` +
    `INSTRUCTION: Use ONLY this grounded database record for coaching explanations. NEVER invent exercises not present in the database.`
  );
}

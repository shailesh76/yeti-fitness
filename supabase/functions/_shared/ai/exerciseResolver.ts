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
  'high to low cable fly': 'high to low cable fly',
  'high-to-low cable fly': 'high to low cable fly',
  'low to high fly': 'low to high cable fly',
  'low-to-high fly': 'low to high cable fly',
  'low to high cable fly': 'low to high cable fly',
  'low-to-high cable fly': 'low to high cable fly',
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
  return (raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
  const nSpaces = n.replace(/-/g, ' ');
  const nHyphens = n.replace(/\s+/g, '-');
  if (ALIASES[n]) return ALIASES[n];
  if (ALIASES[nSpaces]) return ALIASES[nSpaces];
  if (ALIASES[nHyphens]) return ALIASES[nHyphens];

  let best = '';
  let bestLen = 0;
  for (const alias of Object.keys(ALIASES)) {
    const normAlias = normalizeExerciseInput(alias);
    const normAliasSpaces = normAlias.replace(/-/g, ' ');
    if ((n.includes(normAlias) || nSpaces.includes(normAliasSpaces)) && normAlias.length > bestLen) {
      best = ALIASES[alias];
      bestLen = normAlias.length;
    }
  }
  return best || n;
}

export interface ExerciseCatalogSearchResult {
  id: string;
  name: string;
  slug?: string;
  source_type?: string;
  primary_muscle?: string;
  equipment?: string;
  movement_pattern?: string;
  matchStrategy?: 'exact_name_or_slug' | 'database_alias' | 'static_alias' | 'partial_name' | 'token_fallback';
  confidence?: 'exact' | 'alias' | 'token' | 'none';
  [key: string]: any;
}

/**
 * Searches the first-party database catalog for an exercise before calling LLM.
 */
export async function searchCatalogExercise(supabase: any, rawInput: string): Promise<ExerciseCatalogSearchResult | null> {
  if (!supabase || !rawInput) return null;
  const extracted = extractExerciseName(rawInput);
  const normalized = normalizeExerciseInput(extracted || rawInput);
  if (!normalized || normalized.length < 2) return null;

  const slugVariant = normalized.replace(/\s+/g, '-');

  // 1. Search by exact slug or exact name
  try {
    const { data: exact } = await supabase
      .from('exercises')
      .select('*')
      .eq('source_type', 'yeti_first_party')
      .or(`slug.eq.${slugVariant},slug.eq.${normalized},name.ilike.${normalized}`)
      .maybeSingle();

    if (exact) {
      return { ...exact, matchStrategy: 'exact_name_or_slug', confidence: 'exact' };
    }
  } catch (_e) { /* continue */ }

  // 2. Search exercise_aliases table in database
  try {
    const { data: dbAliases } = await supabase
      .from('exercise_aliases')
      .select('exercise_id, alias, exercises!inner(*)')
      .or(`alias.ilike.${normalized},alias.ilike.%${normalized}%`)
      .eq('exercises.source_type', 'yeti_first_party')
      .limit(3);

    if (dbAliases && dbAliases.length > 0) {
      const exactAlias = dbAliases.find((a: any) => normalizeExerciseInput(a.alias) === normalized);
      const chosen = exactAlias ? (exactAlias as any).exercises : (dbAliases[0] as any).exercises;
      if (chosen) {
        return { ...chosen, matchStrategy: 'database_alias', confidence: exactAlias ? 'exact' : 'alias' };
      }
    }
  } catch (_e) { /* continue */ }

  // 3. Static alias dictionary fallback
  const canonicalAlias = resolveExerciseAlias(normalized);
  if (canonicalAlias && canonicalAlias !== normalized) {
    const aliasSlug = canonicalAlias.replace(/\s+/g, '-');
    try {
      const { data: aliasTarget } = await supabase
        .from('exercises')
        .select('*')
        .eq('source_type', 'yeti_first_party')
        .or(`slug.eq.${aliasSlug},slug.eq.${canonicalAlias},name.ilike.%${canonicalAlias}%`)
        .limit(1);

      if (aliasTarget && aliasTarget.length > 0) {
        return { ...aliasTarget[0], matchStrategy: 'static_alias', confidence: 'alias' };
      }
    } catch (_e) { /* continue */ }
  }

  // 4. Partial name / slug match
  try {
    const { data: matches } = await supabase
      .from('exercises')
      .select('*')
      .eq('source_type', 'yeti_first_party')
      .or(`name.ilike.%${normalized}%,slug.ilike.%${slugVariant}%`)
      .limit(3);

    if (matches && matches.length > 0) {
      return { ...matches[0], matchStrategy: 'partial_name', confidence: 'token' };
    }
  } catch (_e) { /* continue */ }

  // 5. Token-based fallback across name for multi-word queries
  const tokens = normalized.split(/\s+/).filter((t: string) => t.length > 2 && !['and', 'for', 'the', 'with', 'day'].includes(t));
  if (tokens.length >= 2) {
    try {
      const filterClauses = tokens.map((tok: string) => `name.ilike.%${tok}%`);
      const { data: tokenMatches } = await supabase
        .from('exercises')
        .select('*')
        .eq('source_type', 'yeti_first_party')
        .or(filterClauses.join(','))
        .limit(10);

      if (tokenMatches && tokenMatches.length > 0) {
        const scored = tokenMatches.map((cand: any) => {
          const candNorm = normalizeExerciseInput(cand.name);
          const overlap = tokens.filter((tok: string) => candNorm.includes(tok)).length;
          return { cand, score: overlap / tokens.length };
        });
        scored.sort((a: any, b: any) => b.score - a.score);
        if (scored[0].score >= 0.5) {
          return { ...scored[0].cand, matchStrategy: 'token_fallback', confidence: 'token' };
        }
      }
    } catch (_e) { /* continue */ }
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

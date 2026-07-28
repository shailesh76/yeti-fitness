// Coach Memory system. Builds the structured "Coach Memory Card" injected into
// the prompt so Yeti talks like a coach who remembers the athlete. Pure module
// (Deno + vitest). Facts come from deterministic sources (profile, plan,
// progression) + the ai_memory store — never fabricated; unknown fields are
// simply omitted from the card.

export interface CoachMemory {
  goal?: string | null;
  trainingSplit?: string | null;
  currentWeightKg?: number | null;
  targetWeightKg?: number | null;
  favouriteExercises?: string[];
  weakMuscleGroups?: string[];
  currentPlateau?: string | null;
  currentInjury?: string | null;
  nutrition?: string | null;     // e.g. "Vegetarian"
  recentMood?: string | null;
}

export interface MemoryRow { category?: string; memory_key?: string; memory_value?: string }

/**
 * Formats the Coach Memory Card. Omits any field we don't actually have (never
 * fabricated). Returns a friendly placeholder when nothing is known yet.
 */
export function buildCoachMemoryCard(m: CoachMemory): string {
  const lines: string[] = [];
  const add = (label: string, val: unknown) => {
    if (val == null || val === '' || (Array.isArray(val) && val.length === 0)) return;
    lines.push(`${label}: ${Array.isArray(val) ? val.join(', ') : val}`);
  };
  add('Current Goal', m.goal);
  add('Training Split', m.trainingSplit);
  add('Current Weight', m.currentWeightKg != null ? `${m.currentWeightKg} kg` : null);
  add('Target Weight', m.targetWeightKg != null ? `${m.targetWeightKg} kg` : null);
  add('Favourite Exercises', m.favouriteExercises);
  add('Weak Muscle Groups', m.weakMuscleGroups);
  add('Current Plateau', m.currentPlateau);
  add('Current Injury', m.currentInjury);
  add('Nutrition', m.nutrition);
  add('Recent Mood', m.recentMood);
  return lines.length ? lines.join('\n') : '(No stored coach memory yet.)';
}

/** Folds ai_memory rows into a CoachMemory (deterministic categorisation). */
export function foldMemoryRows(rows: MemoryRow[]): CoachMemory {
  const m: CoachMemory = { favouriteExercises: [], weakMuscleGroups: [] };
  for (const r of rows || []) {
    const cat = (r.category || '').toLowerCase();
    const key = (r.memory_key || '').toLowerCase();
    const val = (r.memory_value || '').trim();
    if (!val) continue;

    if (cat === 'injuries' || key.includes('injur') || key.includes('pain')) m.currentInjury = val;
    else if (cat === 'nutrition preferences' || key.includes('vegetarian') || key.includes('vegan') || key.includes('diet') || key.includes('allerg')) m.nutrition = val;
    else if (key.includes('split')) m.trainingSplit = val;
    else if (key.includes('plateau') || key.includes('stuck')) m.currentPlateau = val;
    else if (key.includes('mood')) m.recentMood = val;
    else if (key.includes('weak')) m.weakMuscleGroups!.push(val);
    else if (key.includes('favourite') || key.includes('favorite') || key.includes('prefer') || cat === 'equipment preferences' || cat === 'workout style') m.favouriteExercises!.push(val);
    else if (cat === 'training goals' || key.includes('goal')) { if (!m.goal) m.goal = val; }
  }
  return m;
}

/** Merges deterministic profile/plan facts over folded memory (facts win). */
export function mergeCoachMemory(base: CoachMemory, facts: Partial<CoachMemory>): CoachMemory {
  const out: CoachMemory = { ...base };
  for (const [k, v] of Object.entries(facts)) {
    if (v == null || (Array.isArray(v) && v.length === 0)) continue;
    (out as any)[k] = v;
  }
  return out;
}

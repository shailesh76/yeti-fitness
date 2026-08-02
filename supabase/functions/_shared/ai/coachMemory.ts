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
  coachingObservations?: string[];
  coachingSummaries?: string[];  // compact summaries of past coaching sessions
  recoveryPatterns?: string[];
  nutritionPatterns?: string[];
  likedFoods?: string[];
  dislikedFoods?: string[];
  eatingPatterns?: string[];
  equipmentPreferences?: string[];
  preferredTrainingDays?: string[];  // e.g. ["Mon", "Wed", "Fri"]
  dislikedExercises?: string[];
  experienceLevel?: string | null;   // beginner / intermediate / advanced
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
  add('Experience Level', m.experienceLevel);
  add('Training Split', m.trainingSplit);
  add('Preferred Training Days', m.preferredTrainingDays);
  add('Current Weight', m.currentWeightKg != null ? `${m.currentWeightKg} kg` : null);
  add('Target Weight', m.targetWeightKg != null ? `${m.targetWeightKg} kg` : null);
  add('Favourite Exercises', m.favouriteExercises);
  add('Disliked Exercises', m.dislikedExercises);
  add('Weak Muscle Groups', m.weakMuscleGroups);
  add('Current Plateau', m.currentPlateau);
  add('Current Injury', m.currentInjury);
  add('Nutrition', m.nutrition);
  add('Recent Mood', m.recentMood);
  add('Liked Foods', m.likedFoods);
  add('Disliked Foods', m.dislikedFoods);
  add('Equipment Preferences', m.equipmentPreferences);
  add('Eating Patterns', m.eatingPatterns);
  add('Coaching Observations', m.coachingObservations);
  add('Recovery Patterns', m.recoveryPatterns);
  add('Nutrition Patterns', m.nutritionPatterns);
  // Render only the most recent coaching summary to keep the prompt lean.
  if (m.coachingSummaries && m.coachingSummaries.length > 0) {
    lines.push(`Last Coaching Session: ${m.coachingSummaries[0]}`);
  }
  return lines.length ? lines.join('\n') : '(No stored coach memory yet.)';
}

export function foldMemoryRows(rows: MemoryRow[]): CoachMemory {
  const m: CoachMemory = {
    favouriteExercises: [],
    weakMuscleGroups: [],
    coachingObservations: [],
    coachingSummaries: [],
    recoveryPatterns: [],
    nutritionPatterns: [],
    likedFoods: [],
    dislikedFoods: [],
    eatingPatterns: [],
    equipmentPreferences: [],
    preferredTrainingDays: [],
    dislikedExercises: [],
  };
  const seenKeys = new Set<string>();

  for (const r of rows || []) {
    const cat = (r.category || '').toLowerCase();
    const key = (r.memory_key || '').toLowerCase();
    const val = (r.memory_value || '').trim();
    if (!val) continue;

    const dedupId = `${cat}:${key}:${val.toLowerCase()}`;
    if (seenKeys.has(dedupId)) continue;
    seenKeys.add(dedupId);

    const pushBounded = (arr: string[], item: string, cap = 5) => {
      if (!arr.includes(item) && arr.length < cap) {
        arr.push(item);
      }
    };

    // Coaching summaries — stored as coaching_observations with [session_summary] tag
    if ((cat === 'coaching observations' || cat === 'coaching_observations') && val.startsWith('[session_summary]')) {
      pushBounded(m.coachingSummaries!, val.replace('[session_summary]', '').trim(), 3);
      continue;
    }
    // Preferred training days
    if (key.includes('training_days') || key.includes('preferred_days') || key.includes('training_schedule')) {
      pushBounded(m.preferredTrainingDays!, val);
      continue;
    }
    // Disliked exercises
    if (key.includes('disliked_exercise') || key.includes('avoided_exercise') || key.includes('hate_exercise') || key.includes('cant_do')) {
      pushBounded(m.dislikedExercises!, val);
      continue;
    }
    // Experience level
    if (key.includes('experience') || key.includes('level') || key.includes('beginner') || key.includes('intermediate') || key.includes('advanced')) {
      if (!m.experienceLevel) m.experienceLevel = val;
      continue;
    }

    if (cat === 'injuries' || key.includes('injur') || key.includes('pain')) m.currentInjury = val;
    else if (cat === 'liked foods' || cat === 'food_likes' || key.includes('liked_food') || key.includes('favourite_food')) pushBounded(m.likedFoods!, val);
    else if (cat === 'disliked foods' || cat === 'food_dislikes' || key.includes('disliked_food') || key.includes('hate_food')) pushBounded(m.dislikedFoods!, val);
    else if (cat === 'eating patterns' || cat === 'fasting' || key.includes('eating_pattern') || key.includes('fasting_schedule') || key.includes('skip_breakfast')) pushBounded(m.eatingPatterns!, val);
    else if (cat === 'coaching observations' || cat === 'coaching_observation' || key.includes('observation') || key.includes('behavior')) pushBounded(m.coachingObservations!, val);
    else if (cat === 'recovery patterns' || key.includes('recovery_pattern') || key.includes('soreness_pattern')) pushBounded(m.recoveryPatterns!, val);
    else if (cat === 'nutrition patterns' || key.includes('nutrition_pattern') || key.includes('weekend_eating')) pushBounded(m.nutritionPatterns!, val);
    else if (cat === 'nutrition preferences' || key.includes('vegetarian') || key.includes('vegan') || key.includes('diet') || key.includes('allerg')) {
      // A single "nutrition preferences" category covers both a scalar diet
      // TYPE ("I am vegetarian") and individual food likes/dislikes ("I don't
      // like mushrooms") — these must not share one overwritable field, or
      // the newer/older fact silently clobbers the other depending on row
      // order. Route by the value's own wording instead.
      if (/\b(don'?t like|dislikes?|hate|avoid|allergic to|can'?t eat|no longer eat)\b/i.test(val)) pushBounded(m.dislikedFoods!, val);
      else if (/\b(prefer|love|favou?rite|enjoy)\b/i.test(val)) pushBounded(m.likedFoods!, val);
      else m.nutrition = val;
    }
    else if (key.includes('split')) m.trainingSplit = val;
    else if (key.includes('plateau') || key.includes('stuck')) m.currentPlateau = val;
    else if (key.includes('mood')) m.recentMood = val;
    else if (key.includes('weak')) pushBounded(m.weakMuscleGroups!, val);
    // Checked before the generic favourite/prefer catch-all below so an
    // "equipment preferences" fact (e.g. "I prefer dumbbells") lands in its
    // own list instead of being folded into favourite EXERCISES, which is a
    // different concept the deterministic retrieval answer for "what
    // equipment do I prefer?" needs to read distinctly.
    else if (cat === 'equipment preferences') pushBounded(m.equipmentPreferences!, val);
    else if (key.includes('favourite') || key.includes('favorite') || key.includes('prefer') || cat === 'workout style') pushBounded(m.favouriteExercises!, val);
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



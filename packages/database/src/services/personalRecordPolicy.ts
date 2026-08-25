export const PR_CORRUPTION_LIMITS = {
  MAX_REPS: 1000,
  MAX_WEIGHT_KG: 2000,
} as const;

export interface ExerciseMetadataLike {
  category?: string | null;
  equipment?: string | null;
}

export interface PersonalRecordLike {
  id?: string;
  exercise_id?: string;
  record_type?: string;
  value?: number | null;
  achieved_at?: string | number | null;
  exercises?: {
    name?: string | null;
    category?: string | null;
    equipment?: string | null;
    muscle_group?: string | null;
  } | null;
}

/**
 * Universal corruption guard and metadata-based PR eligibility validator.
 * Validates that a personal record row is within universal corruption limits (reps <= 1000, weight <= 2000 kg)
 * and satisfies category constraints if metadata is available.
 */
export function isPlausiblePersonalRecord(
  pr: PersonalRecordLike,
  exerciseMeta?: ExerciseMetadataLike | null,
): boolean {
  if (!pr || !pr.exercise_id || !pr.record_type) return false;
  const numVal = Number(pr.value);
  if (!Number.isFinite(numVal) || numVal <= 0) return false;

  const recordType = String(pr.record_type).toLowerCase();

  // Universal corruption limits
  if (recordType.includes('rep')) {
    if (numVal > PR_CORRUPTION_LIMITS.MAX_REPS) return false;
  } else if (recordType.includes('weight')) {
    if (numVal > PR_CORRUPTION_LIMITS.MAX_WEIGHT_KG) return false;
  }

  // Category-based exclusion: Cardio and Stretching do not produce Strength PRs
  const meta = exerciseMeta || pr.exercises;
  if (meta?.category) {
    const cat = String(meta.category).toLowerCase().trim();
    if (cat === 'cardio' || cat === 'stretching') {
      return false;
    }
  }

  return true;
}

/** Return the current best per exercise and metric; identical history counts once; filters corrupt entries. */
export function currentPersonalRecords<T extends PersonalRecordLike>(records: T[]): T[] {
  const best = new Map<string, T>();
  for (const record of records) {
    if (!isPlausiblePersonalRecord(record)) continue;
    const key = `${record.exercise_id}:${record.record_type}`;
    const previous = best.get(key);
    const isBetter = !previous || Number(record.value) > Number(previous.value);
    const isEarlierEqual = previous && Number(record.value) === Number(previous.value)
      && new Date(record.achieved_at as string | number).getTime() < new Date(previous.achieved_at as string | number).getTime();
    if (isBetter || isEarlierEqual) best.set(key, record);
  }
  return Array.from(best.values());
}

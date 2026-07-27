// Deterministic coaching decisions. The LLM only EXPLAINS these results — it must
// never compute them. Pure module (no Deno/node APIs, no imports) so it runs
// inside the Deno edge function AND is unit-testable in vitest. Mirrors the
// double-progression + deload rules in @yeti/training-engine.

export type ProgressionDecision =
  | 'increase_weight'
  | 'keep_weight'
  | 'add_reps'
  | 'reduce_load'
  | 'deload'
  | 'insufficient_data';

export interface ProgressionInput {
  exercise: string;
  currentWeightKg: number;
  targetRepsLow: number;
  targetRepsHigh: number;
  targetSets: number;
  lastSetReps: number[];          // reps per working set, most recent session
  avgRpe?: number | null;
  recoveryScore?: number | null;  // 0-100
  painFlag?: boolean;
  isUpperBody?: boolean;
}

export interface ProgressionResult {
  decision: ProgressionDecision;
  reason_code: string;
  current_weight_kg: number;
  recommended_weight_kg: number | null;
  target: string;                 // e.g. "3 x 6-8"
  last_result: number[];
  missing: string[];
}

function targetString(sets: number, low: number, high: number): string {
  return `${sets} x ${low}-${high}`;
}

/**
 * Decides the next-session progression for one exercise from logged performance.
 * Returns `insufficient_data` (never a guess) when the required sets aren't logged.
 */
export function decideProgression(input: ProgressionInput): ProgressionResult {
  const {
    currentWeightKg, targetRepsLow, targetRepsHigh, targetSets,
    lastSetReps, avgRpe = null, recoveryScore = null, painFlag = false, isUpperBody = false,
  } = input;

  const target = targetString(targetSets, targetRepsLow, targetRepsHigh);
  const base = {
    current_weight_kg: currentWeightKg,
    recommended_weight_kg: currentWeightKg,
    target,
    last_result: lastSetReps,
  };

  // 1. Missing data — refuse to guess.
  if (!lastSetReps || lastSetReps.length === 0) {
    return { ...base, decision: 'insufficient_data', reason_code: 'no_recent_sets', recommended_weight_kg: null, missing: ['recent working sets (weight, reps, RPE)'] };
  }
  if (lastSetReps.length < targetSets) {
    return {
      ...base, decision: 'insufficient_data', reason_code: 'incomplete_sets_logged', recommended_weight_kg: null,
      missing: [`all ${targetSets} working sets (only ${lastSetReps.length} logged)`],
    };
  }

  // 2. Pain flag — back off load and defer to the safety path.
  if (painFlag) {
    return { ...base, decision: 'reduce_load', reason_code: 'pain_reported', recommended_weight_kg: Math.round(currentWeightKg * 0.9 * 100) / 100, missing: [] };
  }

  // 3. Deload — very high RPE or poor recovery.
  if ((avgRpe != null && avgRpe >= 9.5) || (recoveryScore != null && recoveryScore < 40)) {
    return { ...base, decision: 'deload', reason_code: 'high_rpe_or_low_recovery', recommended_weight_kg: Math.round(currentWeightKg * 0.9 * 100) / 100, missing: [] };
  }

  const minReps = Math.min(...lastSetReps);
  const maxReps = Math.max(...lastSetReps);
  const increment = isUpperBody ? 2.5 : 5.0;

  // 4. All working sets at/above the top of the range → progress load (unless RPE high).
  if (minReps >= targetRepsHigh) {
    if (avgRpe != null && avgRpe > 8) {
      return { ...base, decision: 'keep_weight', reason_code: 'top_range_reached_but_high_rpe', missing: [] };
    }
    return { ...base, decision: 'increase_weight', reason_code: 'all_sets_reached_top_range', recommended_weight_kg: Math.round((currentWeightKg + increment) * 100) / 100, missing: [] };
  }

  // 5. Couldn't reach even the bottom of the range on any set → too heavy.
  if (maxReps < targetRepsLow) {
    return { ...base, decision: 'reduce_load', reason_code: 'below_minimum_reps', recommended_weight_kg: Math.round(currentWeightKg * 0.9 * 100) / 100, missing: [] };
  }

  // 6. In range but not all sets at the top → stay, chase reps (double progression).
  return { ...base, decision: 'keep_weight', reason_code: 'not_all_sets_reached_top_range', missing: [] };
}

// ─── Nutrition remaining (deterministic; the engine owns the numbers) ────────────
export interface NutritionInput {
  calorieTarget: number | null;
  proteinTarget: number | null;
  carbTarget: number | null;
  fatTarget: number | null;
  consumedCalories: number;
  consumedProtein: number;
  consumedCarbs: number;
  consumedFat: number;
}

export interface NutritionResult {
  targets: { calories: number | null; protein: number | null; carbs: number | null; fat: number | null };
  consumed: { calories: number; protein: number; carbs: number; fat: number };
  remaining: { calories: number | null; protein: number | null; carbs: number | null; fat: number | null };
  missing: string[];
}

/** Remaining = target − consumed (negative = over). Null target ⇒ null remaining + a `missing` entry. */
export function computeNutritionRemaining(input: NutritionInput): NutritionResult {
  const missing: string[] = [];
  const rem = (target: number | null, consumed: number, label: string): number | null => {
    if (target == null) { missing.push(`${label} target`); return null; }
    return Math.round((target - consumed) * 10) / 10;
  };
  return {
    targets: { calories: input.calorieTarget, protein: input.proteinTarget, carbs: input.carbTarget, fat: input.fatTarget },
    consumed: { calories: input.consumedCalories, protein: input.consumedProtein, carbs: input.consumedCarbs, fat: input.consumedFat },
    remaining: {
      calories: rem(input.calorieTarget, input.consumedCalories, 'calorie'),
      protein: rem(input.proteinTarget, input.consumedProtein, 'protein'),
      carbs: rem(input.carbTarget, input.consumedCarbs, 'carb'),
      fat: rem(input.fatTarget, input.consumedFat, 'fat'),
    },
    missing,
  };
}

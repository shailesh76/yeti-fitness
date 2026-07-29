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

// One data point of an exercise's history across sessions, used for the
// multi-signal checks below. Mirrors @yeti/training-engine's HistoricalSession
// (estimated_1rm, volume), adapted to what is actually recorded server-side —
// there is no avg_rpe column on session_sets, so the "fatigue" plateau type
// PlateauDetector supports cannot be computed here; only 'volume' | 'strength'.
export interface SessionHistoryPoint {
  daysAgo: number;       // 0 = today; caller supplies, engine never guesses dates
  estimated1rm: number;  // Epley estimate — see estimateOneRepMax()
  volumeKg: number;      // total weight x reps for this lift in that session
}

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
  // Multi-signal additions (all optional — omitting them reproduces the exact
  // prior behaviour so every existing caller/test is unaffected).
  adherencePct?: number | null;               // calculate_adherence RPC, 0-100
  personalRecordKg?: number | null;           // best recorded weight for this lift
  sessionHistory?: SessionHistoryPoint[];     // multiple past sessions, any order
}

export interface ProgressionResult {
  decision: ProgressionDecision;
  reason_code: string;
  current_weight_kg: number;
  recommended_weight_kg: number | null;
  target: string;                 // e.g. "3 x 6-8"
  last_result: number[];
  missing: string[];
  // Multi-signal additions — informational unless stated otherwise below.
  adherence_pct?: number | null;
  plateau_detected?: boolean;
  plateau_type?: 'volume' | 'strength' | null;
  weekly_volume_trend?: 'increasing' | 'stable' | 'decreasing' | null;
  new_pr?: boolean;               // true only alongside decision === 'increase_weight'
}

function targetString(sets: number, low: number, high: number): string {
  return `${sets} x ${low}-${high}`;
}

/** Epley estimated 1RM: weight × (1 + reps/30). Deterministic — never a guess. */
export function estimateOneRepMax(weightKg: number, reps: number): number {
  if (!Number.isFinite(weightKg) || !Number.isFinite(reps) || weightKg <= 0 || reps <= 0) return 0;
  return Math.round(weightKg * (1 + reps / 30) * 100) / 100;
}

/**
 * Decides the next-session progression for one exercise from logged performance.
 * Returns `insufficient_data` (never a guess) when the required sets aren't logged.
 *
 * The rep-based decision (increase/keep/reduce, driven by the CURRENT session's
 * logged sets) remains the primary driver and is unchanged from the original
 * implementation. Multi-signal fields (adherence, personal-record history,
 * cross-session trend) are additive: adherence and a real historical drop can
 * gate the decision (both fire only when explicitly supplied); plateau/volume-
 * trend/new-PR are informational annotations that never override a decision
 * driven by real, current-session evidence.
 */
export function decideProgression(input: ProgressionInput): ProgressionResult {
  const {
    currentWeightKg, targetRepsLow, targetRepsHigh, targetSets,
    lastSetReps, avgRpe = null, recoveryScore = null, painFlag = false, isUpperBody = false,
    adherencePct = null, personalRecordKg = null, sessionHistory,
  } = input;

  const target = targetString(targetSets, targetRepsLow, targetRepsHigh);

  // ── Informational signals from cross-session history (never invents dates
  //    or values — only derives from what the caller supplied) ────────────────
  let plateauDetected: boolean | undefined;
  let plateauType: 'volume' | 'strength' | null | undefined;
  let volumeTrend: 'increasing' | 'stable' | 'decreasing' | null | undefined;
  let historyDeload = false;

  if (sessionHistory && sessionHistory.length >= 2) {
    const sorted = [...sessionHistory].sort((a, b) => a.daysAgo - b.daysAgo); // newest first
    const newest = sorted[0];
    const previous = sorted[1];
    const oldest = sorted[sorted.length - 1];

    // Real, recent performance drop (mirrors DeloadEngine's >10% check; the RPE
    // gate is omitted since RPE is not recorded server-side).
    if (previous.estimated1rm > 0 && (previous.estimated1rm - newest.estimated1rm) / previous.estimated1rm > 0.10) {
      historyDeload = true;
    }

    // Short-term volume trend (most recent session vs the one before it).
    if (previous.volumeKg > 0) {
      const delta = (newest.volumeKg - previous.volumeKg) / previous.volumeKg;
      volumeTrend = delta > 0.05 ? 'increasing' : delta < -0.05 ? 'decreasing' : 'stable';
    }

    // Plateau (mirrors PlateauDetector): >=3 week span, <2% 1RM improvement.
    const spanDays = oldest.daysAgo - newest.daysAgo;
    if (spanDays >= 21 && oldest.estimated1rm > 0 && newest.estimated1rm <= oldest.estimated1rm * 1.02) {
      plateauDetected = true;
      plateauType = newest.volumeKg <= oldest.volumeKg * 1.05 ? 'volume' : 'strength';
    } else {
      plateauDetected = false;
    }
  }

  const base = {
    current_weight_kg: currentWeightKg,
    recommended_weight_kg: currentWeightKg,
    target,
    last_result: lastSetReps,
    adherence_pct: adherencePct,
    plateau_detected: plateauDetected,
    plateau_type: plateauType,
    weekly_volume_trend: volumeTrend,
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

  // 3. A real, measured performance drop across sessions → deload. Concrete
  //    multi-session history takes priority over the single-session RPE check
  //    below. Only fires when sessionHistory was supplied.
  if (historyDeload) {
    return { ...base, decision: 'deload', reason_code: 'performance_drop_recent', recommended_weight_kg: Math.round(currentWeightKg * 0.9 * 100) / 100, missing: [] };
  }

  // 4. Deload — very high RPE or poor recovery (unchanged).
  if ((avgRpe != null && avgRpe >= 9.5) || (recoveryScore != null && recoveryScore < 40)) {
    return { ...base, decision: 'deload', reason_code: 'high_rpe_or_low_recovery', recommended_weight_kg: Math.round(currentWeightKg * 0.9 * 100) / 100, missing: [] };
  }

  // 5. Adherence gate — inconsistent training means the priority is showing up,
  //    not adding load. Only fires when adherence data was supplied.
  if (adherencePct != null && adherencePct < 50) {
    return { ...base, decision: 'keep_weight', reason_code: 'low_adherence_build_consistency', missing: [] };
  }

  const minReps = Math.min(...lastSetReps);
  const maxReps = Math.max(...lastSetReps);
  const increment = isUpperBody ? 2.5 : 5.0;

  // 6. All working sets at/above the top of the range → progress load (unless RPE high). (unchanged)
  if (minReps >= targetRepsHigh) {
    if (avgRpe != null && avgRpe > 8) {
      return { ...base, decision: 'keep_weight', reason_code: 'top_range_reached_but_high_rpe', missing: [] };
    }
    const recommended = Math.round((currentWeightKg + increment) * 100) / 100;
    return {
      ...base, decision: 'increase_weight', reason_code: 'all_sets_reached_top_range',
      recommended_weight_kg: recommended, missing: [],
      new_pr: personalRecordKg != null ? recommended > personalRecordKg : undefined,
    };
  }

  // 7. Couldn't reach even the bottom of the range on any set → too heavy. (unchanged)
  if (maxReps < targetRepsLow) {
    return { ...base, decision: 'reduce_load', reason_code: 'below_minimum_reps', recommended_weight_kg: Math.round(currentWeightKg * 0.9 * 100) / 100, missing: [] };
  }

  // 8. In range but not all sets at the top → stay, chase reps (double progression). (unchanged)
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

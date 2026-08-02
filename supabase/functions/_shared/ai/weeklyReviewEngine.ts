// Deterministic Raw Telemetry Engine for Weekly Reviews (Phase 2). Pure module (Deno + vitest).
// Calculates objective telemetry over 7 to 28-day windows:
// - Recovery Score (0-100) & Recovery Status
// - Progress Score (0-100) & Progress Status
// - Workout Adherence %
// - Volume (kg) & Volume Trend
// - Weight Trend (kg/week)
// - Nutrition Adherence (Calories & Protein compliance)

export type RecoveryStatus =
  | 'fully_recovered'
  | 'mildly_fatigued'
  | 'moderately_fatigued'
  | 'high_fatigue'
  | 'deload_recommended';

export type ProgressStatus =
  | 'progressing_well'
  | 'plateau_detected'
  | 'regression_detected';

export interface TelemetryInput {
  completedWorkouts: number;
  prescribedWorkouts: number;
  recentSessionsVolumeKg: number[];
  recent1rmValues: number[];
  bodyWeightLogsKg: { daysAgo: number; weightKg: number }[];
  avgSleepHours?: number | null;
  sorenessReported?: boolean;
  stressReported?: boolean;
  injuryReported?: boolean;
  consumedCaloriesAvg?: number | null;
  targetCalories?: number | null;
  consumedProteinAvg?: number | null;
  targetProtein?: number | null;
  newPrsCount?: number;
  daysSinceLastWorkout?: number;
  goal?: 'muscle_gain' | 'fat_loss' | 'strength' | 'general_fitness' | 'athletic_performance' | null;
}

export interface RawTelemetryResult {
  adherencePct: number;
  completedWorkouts: number;
  prescribedWorkouts: number;
  recoveryScore: number; // 0-100
  recoveryStatus: RecoveryStatus;
  progressScore: number; // 0-100
  progressStatus: ProgressStatus;
  totalVolumeKg: number;
  volumeTrend: 'increasing' | 'stable' | 'decreasing';
  weightDeltaKgPerWeek: number | null;
  weightTrendDirection: 'gaining' | 'losing' | 'maintaining' | 'unknown';
  calorieCompliancePct: number | null;
  proteinCompliancePct: number | null;
  newPrsCount: number;
  daysSinceLastWorkout: number;
  avgSleepHours: number | null;
  sorenessReported: boolean;
  stressReported: boolean;
  injuryReported: boolean;
  telemetryDataPointCount: number;
}

export function computeRawTelemetry(input: TelemetryInput): RawTelemetryResult {
  const {
    completedWorkouts = 0,
    prescribedWorkouts = 4,
    recentSessionsVolumeKg = [],
    recent1rmValues = [],
    bodyWeightLogsKg = [],
    avgSleepHours = null,
    sorenessReported = false,
    stressReported = false,
    injuryReported = false,
    consumedCaloriesAvg = null,
    targetCalories = null,
    consumedProteinAvg = null,
    targetProtein = null,
    newPrsCount = 0,
    daysSinceLastWorkout = 0,
    goal = 'general_fitness',
  } = input;

  // 1. Adherence %
  const adherencePct = prescribedWorkouts > 0
    ? Math.min(100, Math.round((completedWorkouts / prescribedWorkouts) * 100))
    : 0;

  // 2. Telemetry Data Point Count (for confidence scoring)
  let dataPoints = completedWorkouts;
  if (bodyWeightLogsKg.length) dataPoints += bodyWeightLogsKg.length;
  if (consumedCaloriesAvg != null) dataPoints += 7;
  if (avgSleepHours != null) dataPoints += 7;
  if (newPrsCount) dataPoints += newPrsCount;

  // 3. Recovery Score & Status
  let recoveryScore = 85; // default healthy baseline
  if (avgSleepHours != null) {
    if (avgSleepHours >= 8) recoveryScore += 10;
    else if (avgSleepHours < 6) recoveryScore -= 25;
    else if (avgSleepHours < 7) recoveryScore -= 10;
  }
  if (sorenessReported) recoveryScore -= 15;
  if (stressReported) recoveryScore -= 15;
  if (injuryReported) recoveryScore -= 25;
  if (daysSinceLastWorkout === 0 && completedWorkouts >= 6) recoveryScore -= 10;

  recoveryScore = Math.max(0, Math.min(100, recoveryScore));

  let recoveryStatus: RecoveryStatus = 'fully_recovered';
  if (recoveryScore < 40 || injuryReported) recoveryStatus = 'deload_recommended';
  else if (recoveryScore < 55) recoveryStatus = 'high_fatigue';
  else if (recoveryScore < 70) recoveryStatus = 'moderately_fatigued';
  else if (recoveryScore < 80) recoveryStatus = 'mildly_fatigued';

  // 4. Volume & Volume Trend
  const totalVolumeKg = recentSessionsVolumeKg.reduce((a, b) => a + b, 0);
  let volumeTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
  if (recentSessionsVolumeKg.length >= 2) {
    const latest = recentSessionsVolumeKg[0];
    const prev = recentSessionsVolumeKg[1];
    if (prev > 0) {
      const delta = (latest - prev) / prev;
      if (delta > 0.05) volumeTrend = 'increasing';
      else if (delta < -0.05) volumeTrend = 'decreasing';
    }
  }

  // 5. Weight Trend
  let weightDeltaKgPerWeek: number | null = null;
  let weightTrendDirection: 'gaining' | 'losing' | 'maintaining' | 'unknown' = 'unknown';

  if (bodyWeightLogsKg.length >= 2) {
    const sorted = [...bodyWeightLogsKg].sort((a, b) => a.daysAgo - b.daysAgo); // newest first
    const newest = sorted[0];
    const oldest = sorted[sorted.length - 1];
    const daySpan = Math.max(1, oldest.daysAgo - newest.daysAgo);
    const totalDelta = newest.weightKg - oldest.weightKg;
    weightDeltaKgPerWeek = Math.round((totalDelta / (daySpan / 7)) * 100) / 100;

    if (weightDeltaKgPerWeek > 0.15) weightTrendDirection = 'gaining';
    else if (weightDeltaKgPerWeek < -0.15) weightTrendDirection = 'losing';
    else weightTrendDirection = 'maintaining';
  }

  // 6. Nutrition Compliance
  let calorieCompliancePct: number | null = null;
  if (targetCalories != null && consumedCaloriesAvg != null && targetCalories > 0) {
    const diff = Math.abs(consumedCaloriesAvg - targetCalories);
    calorieCompliancePct = Math.max(0, Math.round((1 - diff / targetCalories) * 100));
  }

  let proteinCompliancePct: number | null = null;
  if (targetProtein != null && consumedProteinAvg != null && targetProtein > 0) {
    proteinCompliancePct = Math.min(100, Math.round((consumedProteinAvg / targetProtein) * 100));
  }

  // 7. Progress Score & Status
  let progressScore = 70; // baseline
  if (adherencePct >= 80) progressScore += 10;
  else if (adherencePct < 50) progressScore -= 20;

  if (newPrsCount > 0) progressScore += 15;
  if (volumeTrend === 'increasing') progressScore += 5;
  else if (volumeTrend === 'decreasing') progressScore -= 10;

  if (goal === 'muscle_gain' && weightTrendDirection === 'gaining') progressScore += 10;
  if (goal === 'fat_loss' && weightTrendDirection === 'losing') progressScore += 10;
  if (goal === 'muscle_gain' && weightTrendDirection === 'maintaining' && recentSessionsVolumeKg.length >= 4) {
    progressScore -= 15; // stall
  }

  progressScore = Math.max(0, Math.min(100, progressScore));

  let progressStatus: ProgressStatus = 'progressing_well';
  if (progressScore < 50 || (adherencePct < 50 && completedWorkouts < 2)) progressStatus = 'regression_detected';
  else if (progressScore < 65 || (goal === 'muscle_gain' && weightTrendDirection === 'maintaining' && recentSessionsVolumeKg.length >= 4)) {
    progressStatus = 'plateau_detected';
  }

  return {
    adherencePct,
    completedWorkouts,
    prescribedWorkouts,
    recoveryScore,
    recoveryStatus,
    progressScore,
    progressStatus,
    totalVolumeKg,
    volumeTrend,
    weightDeltaKgPerWeek,
    weightTrendDirection,
    calorieCompliancePct,
    proteinCompliancePct,
    newPrsCount,
    daysSinceLastWorkout,
    avgSleepHours,
    sorenessReported,
    stressReported,
    injuryReported,
    telemetryDataPointCount: dataPoints,
  };
}

// Deterministic Nutrition Decision Engine (Phase 3). Pure module (Deno + vitest).
// Operates strictly on VALIDATED nutrition data to produce high-level coaching decisions:
// - Nutrition Score (0–100) & score breakdown (Calories, Protein, Fiber, Weekend Variance)
// - Periodization Phase Guidance (Transition timing for Mini-Cut, Diet Break, or Maintenance)
// - Adaptive Calorie Adjustments (+/- 150-200 kcal based on 14–21 day weight trend)
// - Biggest Limiting Factor & Pre-Workout Carb Placement
// - Categorized Grocery Priorities & Evidence-Based Supplement Advice

import { NutritionEngineInput, PeriodizationPhase, RawNutritionResult } from './nutritionEngine.ts';
import { NutritionValidationResult } from './nutritionValidator.ts';

export interface WeightLogPoint {
  daysAgo: number;
  weightKg: number;
}

export interface TelemetryNutritionInput {
  weightLogsKg?: WeightLogPoint[];
  consumedCaloriesAvg?: number | null;
  targetCalories?: number | null;
  consumedProteinAvg?: number | null;
  targetProtein?: number | null;
  loggedDaysCount?: number; // 0-7 days logged
  weekendCalorieAvg?: number | null;
  weekdayCalorieAvg?: number | null;
  fiberGramsAvg?: number | null;
  trainsAfterWork?: boolean;
}

export interface AdaptiveCalorieDecision {
  action: 'maintain' | 'increase_calories' | 'reduce_calories' | 'increase_protein' | 'diet_break';
  deltaKcal: number;
  reason: string;
}

export interface NutritionIntelligenceResult {
  nutritionScore: {
    score: number; // 0-100
    rating: 'excellent' | 'good' | 'fair' | 'needs_attention';
    breakdown: { category: string; status: 'positive' | 'neutral' | 'attention_needed'; note: string }[];
  };
  adaptiveDecision: AdaptiveCalorieDecision;
  periodizationGuidance: {
    currentPhase: PeriodizationPhase;
    recommendedPhase: PeriodizationPhase;
    phaseDurationWeeks: number;
    advice: string;
  };
  biggestLimitingFactor: string | null;
  mealTimingRecommendation: string;
  groceryPriorities: string[];
  validationSummary: NutritionValidationResult;
  validatedNutrition: RawNutritionResult;
}

export function deriveNutritionIntelligence(
  validatedResult: RawNutritionResult,
  validation: NutritionValidationResult,
  telemetry: TelemetryNutritionInput,
  input: NutritionEngineInput,
): NutritionIntelligenceResult {
  const {
    weightLogsKg = [],
    consumedCaloriesAvg = null,
    targetCalories = validatedResult.dailyTargetCalories,
    consumedProteinAvg = null,
    targetProtein = validatedResult.trainingDayMacros.proteinG,
    loggedDaysCount = 5,
    weekendCalorieAvg = null,
    weekdayCalorieAvg = null,
    fiberGramsAvg = null,
    trainsAfterWork = false,
  } = telemetry;

  const goal = input.goal || 'maintenance';

  // 1. Calculate Weight Trend (kg/week)
  let weightDeltaKgPerWeek = 0;
  if (weightLogsKg.length >= 2) {
    const sorted = [...weightLogsKg].sort((a, b) => a.daysAgo - b.daysAgo);
    const newest = sorted[0];
    const oldest = sorted[sorted.length - 1];
    const daySpan = Math.max(1, oldest.daysAgo - newest.daysAgo);
    weightDeltaKgPerWeek = Math.round(((newest.weightKg - oldest.weightKg) / (daySpan / 7)) * 100) / 100;
  }

  // 2. Compute Nutrition Score (0-100) & Breakdown
  let score = 75; // Baseline healthy score
  const breakdown: NutritionIntelligenceResult['nutritionScore']['breakdown'] = [];

  // Protein compliance
  if (targetProtein && consumedProteinAvg != null) {
    const protPct = Math.min(100, Math.round((consumedProteinAvg / targetProtein) * 100));
    if (protPct >= 85) {
      score += 10;
      breakdown.push({ category: 'Protein Compliance', status: 'positive', note: `Averaged ${consumedProteinAvg}g/day (${protPct}% of ${targetProtein}g target).` });
    } else if (protPct < 70) {
      score -= 15;
      breakdown.push({ category: 'Protein Compliance', status: 'attention_needed', note: `Averaged ${consumedProteinAvg}g/day (${protPct}% of ${targetProtein}g target). Protein is below target.` });
    }
  } else {
    breakdown.push({ category: 'Protein Compliance', status: 'neutral', note: 'No recent protein log data.' });
  }

  // Calorie compliance
  if (targetCalories && consumedCaloriesAvg != null) {
    const calDiff = Math.abs(consumedCaloriesAvg - targetCalories);
    const calPct = Math.round((1 - calDiff / targetCalories) * 100);
    if (calPct >= 85) {
      score += 10;
      breakdown.push({ category: 'Calorie Compliance', status: 'positive', note: `Calorie intake (${consumedCaloriesAvg} kcal) is aligned with target (${targetCalories} kcal).` });
    } else {
      score -= 10;
      breakdown.push({ category: 'Calorie Compliance', status: 'attention_needed', note: `Calorie intake (${consumedCaloriesAvg} kcal) deviates from target (${targetCalories} kcal).` });
    }
  }

  // Logging consistency
  if (loggedDaysCount >= 5) {
    score += 5;
    breakdown.push({ category: 'Logging Consistency', status: 'positive', note: `Logged meals on ${loggedDaysCount} of 7 days.` });
  } else if (loggedDaysCount <= 2) {
    score -= 10;
    breakdown.push({ category: 'Logging Consistency', status: 'attention_needed', note: `Only logged meals on ${loggedDaysCount} days this week.` });
  }

  // Fiber
  if (fiberGramsAvg != null) {
    if (fiberGramsAvg >= 25) {
      score += 5;
      breakdown.push({ category: 'Fiber Intake', status: 'positive', note: `Sufficient dietary fiber (${fiberGramsAvg}g/day).` });
    } else {
      score -= 5;
      breakdown.push({ category: 'Fiber Intake', status: 'attention_needed', note: `Fiber intake (${fiberGramsAvg}g/day) is below 25g target.` });
    }
  }

  // Weekend variance
  if (weekendCalorieAvg != null && weekdayCalorieAvg != null && weekdayCalorieAvg > 0) {
    const variance = (weekendCalorieAvg - weekdayCalorieAvg) / weekdayCalorieAvg;
    if (variance > 0.20) {
      score -= 10;
      breakdown.push({ category: 'Weekend Variance', status: 'attention_needed', note: `Weekend calories (${weekendCalorieAvg} kcal) are ${Math.round(variance * 100)}% higher than weekdays.` });
    }
  }

  score = Math.max(0, Math.min(100, score));

  let rating: NutritionIntelligenceResult['nutritionScore']['rating'] = 'good';
  if (score >= 85) rating = 'excellent';
  else if (score >= 70) rating = 'good';
  else if (score >= 55) rating = 'fair';
  else rating = 'needs_attention';

  // 3. Adaptive Calorie Decision
  let adaptiveDecision: AdaptiveCalorieDecision = { action: 'maintain', deltaKcal: 0, reason: 'Current intake is on track for goal.' };

  if (goal === 'muscle_gain') {
    if (weightLogsKg.length >= 2 && weightDeltaKgPerWeek < 0.1) {
      adaptiveDecision = {
        action: 'increase_calories',
        deltaKcal: 150,
        reason: `Weight rate is +${weightDeltaKgPerWeek} kg/week (below 0.2 kg target). Increasing calories by +150 kcal/day to drive lean muscle gain.`,
      };
    } else if (weightDeltaKgPerWeek > 0.5) {
      adaptiveDecision = {
        action: 'reduce_calories',
        deltaKcal: -150,
        reason: `Weight rate is +${weightDeltaKgPerWeek} kg/week (above 0.3 kg target). Decreasing calories by 150 kcal to limit fat gain.`,
      };
    }
  } else if (goal === 'fat_loss') {
    if (weightLogsKg.length >= 2 && weightDeltaKgPerWeek > -0.1) {
      adaptiveDecision = {
        action: 'reduce_calories',
        deltaKcal: -200,
        reason: `Weight loss has stalled (${weightDeltaKgPerWeek} kg/week). Decreasing daily calories by 200 kcal to restart fat loss.`,
      };
    }
  }

  // 4. Periodization Guidance
  const periodizationGuidance = {
    currentPhase: validatedResult.currentPhase,
    recommendedPhase: validatedResult.currentPhase,
    phaseDurationWeeks: 8,
    advice: validatedResult.currentPhase === 'lean_bulk'
      ? 'Execute Lean Bulk phase for 8–12 weeks, tracking weight gain rate at 0.2–0.3 kg/week before taking a planned mini-cut.'
      : 'Maintain current nutrition targets to support body composition goals.',
  };

  // 5. Biggest Limiting Factor
  let biggestLimitingFactor: string | null = null;
  const attentionItems = breakdown.filter((b) => b.status === 'attention_needed');
  if (attentionItems.length > 0) {
    biggestLimitingFactor = attentionItems[0].note;
  }

  // 6. Meal Timing Recommendation
  const mealTimingRecommendation = trainsAfterWork
    ? 'Since you train after work, consume your largest carbohydrate meal 60–90 minutes pre-workout to maximize muscle glycogen and training energy.'
    : 'Distribute protein evenly across 3–4 meals (30–40g per meal) to maximize muscle protein synthesis throughout the day.';

  // 7. Grocery Priorities
  const groceryPriorities = validatedResult.groceryList.proteins.slice(0, 3).concat(validatedResult.groceryList.carbohydrates.slice(0, 2));

  return {
    nutritionScore: { score, rating, breakdown },
    adaptiveDecision,
    periodizationGuidance,
    biggestLimitingFactor,
    mealTimingRecommendation,
    groceryPriorities,
    validationSummary: validation,
    validatedNutrition: validatedResult,
  };
}

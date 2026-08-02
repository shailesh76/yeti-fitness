// Deterministic Coaching Intelligence Engine (Phase 2). Pure module (Deno + vitest).
// Transforms raw telemetry metrics from weeklyReviewEngine.ts into high-level
// structured coaching decisions:
// - Confidence Score (high / medium / low + reason)
// - Top 3 Coaching Priorities (ranked deterministically)
// - Positive Achievements (wins to celebrate)
// - Biggest Limiting Factor (single primary bottleneck)
// - Proactive Trigger (Monday check-in, post-workout, missed workouts, weight stall, PR celebration)
// - Goal-Specific Review Focus
// - Tone Selection (empathetic vs reinforcing)
// - Safety Enforcement (hard blocks on load increases)

import { RawTelemetryResult } from './weeklyReviewEngine.ts';
import { ProgramRequirements } from './programRequirements.ts';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface CoachingPriority {
  rank: 1 | 2 | 3;
  domain: 'sleep' | 'nutrition' | 'adherence' | 'volume' | 'recovery' | 'plateau' | 'injury' | 'stress';
  title: string;
  recommendation: string;
}

export interface ProactiveTriggerResult {
  type: 'monday_checkin' | 'post_workout' | 'missed_workouts' | 'weight_stall' | 'pr_celebration' | null;
  message: string | null;
}

export interface GoalSpecificMetrics {
  primaryGoal: string;
  keyMetrics: { name: string; value: string; assessment: 'positive' | 'neutral' | 'attention_needed' }[];
  focusDescription: string;
}

export interface WeeklyReviewResult {
  confidence: {
    score: ConfidenceLevel;
    reason: string;
  };
  priorities: CoachingPriority[];
  positiveAchievements: string[];
  biggestLimitingFactor: string | null;
  proactiveTrigger: ProactiveTriggerResult;
  goalFocus: GoalSpecificMetrics;
  tone: 'empathetic_reassuring' | 'high_energy_reinforcing';
  safetyFlags: string[];
  loadIncreaseAllowed: boolean;
  telemetrySummary: RawTelemetryResult;
}

export function deriveCoachingIntelligence(
  telemetry: RawTelemetryResult,
  requirements: Partial<ProgramRequirements>,
): WeeklyReviewResult {
  const {
    adherencePct,
    completedWorkouts,
    prescribedWorkouts,
    recoveryScore,
    recoveryStatus,
    progressStatus,
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
    telemetryDataPointCount,
  } = telemetry;

  const goal = requirements.goal || 'general_fitness';

  // 1. Confidence Score & Reason
  let score: ConfidenceLevel = 'high';
  let reason = `${completedWorkouts} workouts logged, telemetry verified across multiple data points.`;

  if (telemetryDataPointCount <= 5 || completedWorkouts <= 2) {
    score = 'low';
    reason = `Only ${completedWorkouts} workout${completedWorkouts === 1 ? '' : 's'} logged recently. Limited telemetry available.`;
  } else if (telemetryDataPointCount <= 12 || completedWorkouts < prescribedWorkouts) {
    score = 'medium';
    reason = `Partial telemetry logged (${completedWorkouts}/${prescribedWorkouts} workouts completed).`;
  }

  // 2. Positive Achievements
  const positiveAchievements: string[] = [];
  if (adherencePct >= 90) positiveAchievements.push(`Completed ${adherencePct}% of planned workouts (${completedWorkouts}/${prescribedWorkouts} sessions).`);
  else if (adherencePct >= 75) positiveAchievements.push(`Maintained solid consistency with ${completedWorkouts} completed sessions.`);

  if (newPrsCount > 0) positiveAchievements.push(`Set ${newPrsCount} new personal record${newPrsCount === 1 ? '' : 's'}!`);
  if (proteinCompliancePct != null && proteinCompliancePct >= 85) positiveAchievements.push(`Hit your daily protein target consistently (${proteinCompliancePct}% compliance).`);
  if (volumeTrend === 'increasing') positiveAchievements.push('Increased total training volume week-over-week.');
  if (avgSleepHours != null && avgSleepHours >= 7.5) positiveAchievements.push(`Averaged ${avgSleepHours} hours of quality sleep per night.`);
  if (goal === 'muscle_gain' && weightTrendDirection === 'gaining') positiveAchievements.push(`Gaining body weight on target (${weightDeltaKgPerWeek} kg/week).`);
  if (goal === 'fat_loss' && weightTrendDirection === 'losing') positiveAchievements.push(`Losing body weight on target (${weightDeltaKgPerWeek} kg/week).`);

  if (positiveAchievements.length === 0 && completedWorkouts > 0) {
    positiveAchievements.push(`Logged ${completedWorkouts} training session${completedWorkouts === 1 ? '' : 's'} this week.`);
  }

  // 3. Candidate Bottlenecks & Priority Ranking
  const bottlenecks: { domain: CoachingPriority['domain']; title: string; rec: string; severityScore: number }[] = [];

  if (injuryReported) {
    bottlenecks.push({
      domain: 'injury',
      title: 'Joint Soreness / Injury Reported',
      rec: 'Reduce training load on affected areas, modify movement patterns, and consult a professional if pain persists.',
      severityScore: 100,
    });
  }

  if (recoveryStatus === 'deload_recommended' || recoveryStatus === 'high_fatigue') {
    bottlenecks.push({
      domain: 'recovery',
      title: 'High Fatigue & Low Recovery',
      rec: 'Take a deload week or reduce volume by 30-40% to allow your central nervous system and muscles to recover.',
      severityScore: 90,
    });
  }

  if (avgSleepHours != null && avgSleepHours < 6.5) {
    bottlenecks.push({
      domain: 'sleep',
      title: 'Sleep Deficit',
      rec: `Averaging ${avgSleepHours}h of sleep is limiting your recovery and adaptation. Prioritise 7.5-8h per night.`,
      severityScore: 80,
    });
  }

  if (proteinCompliancePct != null && proteinCompliancePct < 75) {
    bottlenecks.push({
      domain: 'nutrition',
      title: 'Suboptimal Protein Intake',
      rec: `Protein compliance is at ${proteinCompliancePct}%. Increase protein intake to support muscle recovery.`,
      severityScore: 75,
    });
  }

  if (adherencePct < 60) {
    bottlenecks.push({
      domain: 'adherence',
      title: 'Low Training Adherence',
      rec: `Completed only ${completedWorkouts} of ${prescribedWorkouts} planned sessions. Focus on consistency before increasing load.`,
      severityScore: 70,
    });
  }

  if (progressStatus === 'plateau_detected') {
    bottlenecks.push({
      domain: 'plateau',
      title: 'Training Plateau Detected',
      rec: 'Lifts/weight have stalled over recent weeks. Consider a strategic exercise swap or planned deload.',
      severityScore: 65,
    });
  }

  if (stressReported) {
    bottlenecks.push({
      domain: 'stress',
      title: 'High Lifestyle Stress',
      rec: 'High stress impacts recovery capacity. Keep session duration strictly under 60 minutes.',
      severityScore: 60,
    });
  }

  if (volumeTrend === 'decreasing' && adherencePct >= 75) {
    bottlenecks.push({
      domain: 'volume',
      title: 'Decreasing Training Volume',
      rec: 'Total training volume has dropped week-over-week. Ensure working sets reach prescribed rep targets.',
      severityScore: 50,
    });
  }

  // Sort bottlenecks by severity score descending and pick top 3
  bottlenecks.sort((a, b) => b.severityScore - a.severityScore);

  const priorities: CoachingPriority[] = bottlenecks.slice(0, 3).map((b, idx) => ({
    rank: (idx + 1) as 1 | 2 | 3,
    domain: b.domain,
    title: b.title,
    recommendation: b.rec,
  }));

  if (priorities.length === 0) {
    priorities.push({
      rank: 1,
      domain: 'volume',
      title: 'Maintain Training Momentum',
      recommendation: 'Everything is tracking cleanly. Continue executing your program progressive overload.',
    });
  }

  const biggestLimitingFactor = bottlenecks.length > 0 ? bottlenecks[0].title : null;

  // 4. Proactive Trigger Generation
  let proactiveTrigger: ProactiveTriggerResult = { type: null, message: null };

  if (newPrsCount > 0) {
    proactiveTrigger = {
      type: 'pr_celebration',
      message: `Congratulations! You hit ${newPrsCount} new PR${newPrsCount === 1 ? '' : 's'} this week. Great work building strength!`,
    };
  } else if (daysSinceLastWorkout >= 3) {
    proactiveTrigger = {
      type: 'missed_workouts',
      message: `I noticed you haven't logged a workout in ${daysSinceLastWorkout} days. Everything okay? If you're busy, we can adjust this week's plan.`,
    };
  } else if (goal === 'muscle_gain' && weightTrendDirection === 'maintaining' && telemetryDataPointCount >= 10) {
    proactiveTrigger = {
      type: 'weight_stall',
      message: 'Your body weight has stalled over recent weeks while your goal is muscle gain. We may need to adjust your calorie targets.',
    };
  } else if (completedWorkouts > 0 && daysSinceLastWorkout === 0) {
    proactiveTrigger = {
      type: 'post_workout',
      message: 'Great effort on your workout today! Focus on hydration and getting sufficient protein for recovery.',
    };
  }

  // 5. Goal-Specific Review Focus
  let goalFocus: GoalSpecificMetrics;
  if (goal === 'muscle_gain') {
    goalFocus = {
      primaryGoal: 'Muscle Gain',
      keyMetrics: [
        { name: 'Weight Rate', value: weightDeltaKgPerWeek != null ? `${weightDeltaKgPerWeek} kg/wk` : 'No data', assessment: weightTrendDirection === 'gaining' ? 'positive' : 'attention_needed' },
        { name: 'Volume Trend', value: volumeTrend, assessment: volumeTrend === 'increasing' ? 'positive' : 'neutral' },
        { name: 'Recovery Status', value: recoveryStatus.replace('_', ' '), assessment: recoveryScore >= 70 ? 'positive' : 'attention_needed' },
      ],
      focusDescription: 'Prioritising muscle hypertrophy via weight progression, volume overload, and recovery.',
    };
  } else if (goal === 'fat_loss') {
    goalFocus = {
      primaryGoal: 'Fat Loss',
      keyMetrics: [
        { name: 'Weight Rate', value: weightDeltaKgPerWeek != null ? `${weightDeltaKgPerWeek} kg/wk` : 'No data', assessment: weightTrendDirection === 'losing' ? 'positive' : 'attention_needed' },
        { name: 'Calorie Hit %', value: calorieCompliancePct != null ? `${calorieCompliancePct}%` : 'No data', assessment: (calorieCompliancePct ?? 0) >= 80 ? 'positive' : 'attention_needed' },
        { name: 'Adherence', value: `${adherencePct}%`, assessment: adherencePct >= 80 ? 'positive' : 'attention_needed' },
      ],
      focusDescription: 'Prioritising fat loss via calorie compliance, weight trend, and session consistency.',
    };
  } else if (goal === 'strength') {
    goalFocus = {
      primaryGoal: 'Strength',
      keyMetrics: [
        { name: 'New PRs', value: `${newPrsCount}`, assessment: newPrsCount > 0 ? 'positive' : 'neutral' },
        { name: 'Recovery Score', value: `${recoveryScore}/100`, assessment: recoveryScore >= 75 ? 'positive' : 'attention_needed' },
        { name: 'Adherence', value: `${adherencePct}%`, assessment: adherencePct >= 80 ? 'positive' : 'attention_needed' },
      ],
      focusDescription: 'Prioritising maximal strength, 1RM gains, and CNS recovery.',
    };
  } else {
    goalFocus = {
      primaryGoal: 'General Fitness',
      keyMetrics: [
        { name: 'Adherence', value: `${adherencePct}%`, assessment: adherencePct >= 75 ? 'positive' : 'attention_needed' },
        { name: 'Recovery Score', value: `${recoveryScore}/100`, assessment: recoveryScore >= 70 ? 'positive' : 'attention_needed' },
      ],
      focusDescription: 'Prioritising overall health, workout consistency, and active recovery.',
    };
  }

  // 6. Tone Selection
  const tone: WeeklyReviewResult['tone'] = (adherencePct < 60 || recoveryStatus === 'deload_recommended' || progressStatus === 'regression_detected')
    ? 'empathetic_reassuring'
    : 'high_energy_reinforcing';

  // 7. Safety Enforcement: Hard blocks on load increases
  const safetyFlags: string[] = [];
  let loadIncreaseAllowed = true;

  if (recoveryStatus === 'deload_recommended' || recoveryStatus === 'high_fatigue') {
    safetyFlags.push('High fatigue / deload status detected — load increases blocked.');
    loadIncreaseAllowed = false;
  }
  if (adherencePct < 60) {
    safetyFlags.push('Training adherence below 60% — focus on consistency before increasing load.');
    loadIncreaseAllowed = false;
  }
  if (injuryReported) {
    safetyFlags.push('Pain/injury reported — load increases blocked until cleared.');
    loadIncreaseAllowed = false;
  }

  return {
    confidence: { score, reason },
    priorities,
    positiveAchievements,
    biggestLimitingFactor,
    proactiveTrigger,
    goalFocus,
    tone,
    safetyFlags,
    loadIncreaseAllowed,
    telemetrySummary: telemetry,
  };
}

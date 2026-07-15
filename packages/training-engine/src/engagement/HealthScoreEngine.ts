export type EngagementStatus = '🟢 Active' | '🟡 At Risk' | '🔴 Churn Risk';

export interface HealthScoreResult {
  score: number;
  status: EngagementStatus;
  breakdown: {
    workoutCompletion: number; // Max 40
    nutrition: number;         // Max 20
    aiUsage: number;           // Max 15
    checkIns: number;          // Max 15
    appEngagement: number;     // Max 10
  };
}

export class HealthScoreEngine {
  /**
   * Calculates the Yeti Engagement Score based on raw athlete metrics over 14 days.
   * Formula: Workout frequency (40%) + Nutrition logging (20%) + AI usage (15%) + Check-ins (15%) + App opens (10%).
   */
  static calculate(metrics: {
    workoutsCompleted: number;
    workoutsAssigned: number;
    mealsLogged: number;
    aiInteractions: number;
    checkInsCompleted: number;
    daysActive: number;
    daysSinceLastWorkout: number;
  }): HealthScoreResult {
    // 40%: Workout Completion
    const completionRate = metrics.workoutsAssigned > 0 
      ? (metrics.workoutsCompleted / metrics.workoutsAssigned) 
      : 0;
    const workoutScore = Math.min(40, completionRate * 40);

    // 20%: Nutrition Tracking
    // Expect ~1-2 meals logged a day for 14 days
    const nutritionRate = metrics.mealsLogged / 14; 
    const nutritionScore = Math.min(20, nutritionRate * 20);

    // 15%: AI Coach Usage
    const aiScore = Math.min(15, metrics.aiInteractions * 3);

    // 15%: Check-ins
    // Assume 2 check-ins max per 14 days
    const checkInScore = Math.min(15, metrics.checkInsCompleted * 7.5);

    // 10%: App Engagement
    const engagementScore = Math.min(10, (metrics.daysActive / 14) * 10);

    const totalScore = Math.round(workoutScore + nutritionScore + aiScore + checkInScore + engagementScore);

    let status: EngagementStatus = '🟢 Active';
    if (metrics.daysSinceLastWorkout >= 14 || totalScore < 30) {
      status = '🔴 Churn Risk';
    } else if (metrics.daysSinceLastWorkout >= 5 || totalScore < 60) {
      status = '🟡 At Risk';
    }

    return {
      score: totalScore,
      status,
      breakdown: {
        workoutCompletion: Math.round(workoutScore),
        nutrition: Math.round(nutritionScore),
        aiUsage: Math.round(aiScore),
        checkIns: Math.round(checkInScore),
        appEngagement: Math.round(engagementScore)
      }
    };
  }
}

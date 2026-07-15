export interface ExercisePerformanceContext {
  exercise: string;
  previousWeight: number;
  previousReps: number[];
  sets: number;
  averageRPE: number;
  volume: number;
  fatigue?: number;
  recoveryScore?: number;
}

export interface ProgressionRecommendation {
  action: 'INCREASE_WEIGHT' | 'INCREASE_REPS' | 'MAINTAIN' | 'DELOAD';
  suggestedWeight: number;
  suggestedReps: number[];
  reasoning: string;
}

export class ProgressionEngine {
  static evaluate(context: ExercisePerformanceContext): ProgressionRecommendation {
    const targetRepsAchieved = context.previousReps.every(r => r >= 8); // Example generic rule

    if (targetRepsAchieved && context.averageRPE <= 8) {
      // Smallest increment is typically 2.5kg for barbells
      return {
        action: 'INCREASE_WEIGHT',
        suggestedWeight: context.previousWeight + 2.5,
        suggestedReps: context.previousReps.map(() => 8), // Reset to lower end of rep range
        reasoning: 'Target reps achieved with manageable RPE. Increasing load.'
      };
    }

    if (context.averageRPE >= 9.5 || (context.recoveryScore && context.recoveryScore < 40)) {
      return {
        action: 'DELOAD',
        suggestedWeight: context.previousWeight * 0.9,
        suggestedReps: context.previousReps,
        reasoning: 'High RPE or low recovery detected. Recommending a deload.'
      };
    }

    return {
      action: 'MAINTAIN',
      suggestedWeight: context.previousWeight,
      suggestedReps: context.previousReps.map(r => r + 1), // Try for more reps
      reasoning: 'Target weight maintained. Focus on increasing reps.'
    };
  }
}

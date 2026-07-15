export interface TransformationResult {
  overallScore: number;
  trainingAdherence: number;
  strengthDelta: number;
  nutritionAdherence: number;
  recoveryScore: number;
}

export class TransformationScoreEngine {
  /**
   * Generates the premium Transformation Score, proving the ROI of the app/coach to the athlete.
   */
  static calculate30DayTransformation(data: {
    trainingAdherencePct: number;
    startingVolumeLoad: number;
    endingVolumeLoad: number;
    nutritionAdherencePct: number;
    recoveryAvgPct: number;
  }): TransformationResult {
    
    // Strength Delta (calculated off volume load or 1RM estimated changes over 30 days)
    const strengthDelta = data.startingVolumeLoad > 0 
      ? ((data.endingVolumeLoad - data.startingVolumeLoad) / data.startingVolumeLoad) * 100
      : 0;

    // Weight the overall transformation (out of 100)
    // Training: 30%, Strength: 30%, Nutrition: 20%, Recovery: 20%
    const trainingSub = (data.trainingAdherencePct / 100) * 30;
    
    // Cap strength contribution at 30 points (roughly a 10% gain over 30 days is max score)
    const strengthSub = Math.min(30, (Math.max(0, strengthDelta) / 10) * 30);
    
    const nutritionSub = (data.nutritionAdherencePct / 100) * 20;
    const recoverySub = (data.recoveryAvgPct / 100) * 20;

    const overall = Math.round(trainingSub + strengthSub + nutritionSub + recoverySub);

    return {
      overallScore: overall,
      trainingAdherence: Math.round(data.trainingAdherencePct),
      strengthDelta: Math.round(strengthDelta * 10) / 10, // 1 decimal place
      nutritionAdherence: Math.round(data.nutritionAdherencePct),
      recoveryScore: Math.round(data.recoveryAvgPct)
    };
  }
}

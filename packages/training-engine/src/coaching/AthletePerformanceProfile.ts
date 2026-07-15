export interface TrainingHistoryMetrics {
  months_training: number;
  average_weekly_volume: number; // sets
  average_sleep_hours: number;
  squat_bodyweight_ratio: number;
  bench_bodyweight_ratio: number;
  deadlift_bodyweight_ratio: number;
}

export class AthletePerformanceProfile {
  static evaluate(metrics: TrainingHistoryMetrics) {
    let strengthLevel = 'Beginner';
    
    // Simplistic strength standard proxy
    const totalRatio = metrics.squat_bodyweight_ratio + metrics.bench_bodyweight_ratio + metrics.deadlift_bodyweight_ratio;
    if (totalRatio > 4.5) strengthLevel = 'Advanced';
    else if (totalRatio > 2.5) strengthLevel = 'Intermediate';

    let volumeTolerance = 'Normal';
    if (metrics.months_training > 24 && metrics.average_weekly_volume > 60) {
      volumeTolerance = 'High';
    } else if (metrics.months_training < 6) {
      volumeTolerance = 'Low';
    }

    let recoveryCapacity = 'Normal';
    if (metrics.average_sleep_hours >= 8) recoveryCapacity = 'High';
    else if (metrics.average_sleep_hours < 6) recoveryCapacity = 'Low';

    return {
      training_age_months: metrics.months_training,
      strength_level: strengthLevel,
      volume_tolerance: volumeTolerance,
      recovery_capacity: recoveryCapacity,
      overall_status: recoveryCapacity === 'Low' ? 'Monitor' : 'Progressing'
    };
  }
}

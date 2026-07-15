export interface SetData {
  weight: number;
  reps: number;
  target_reps: number;
  rpe?: number;
}

export class WeightProgression {
  /**
   * Evaluates Double Progression rules.
   * If the athlete hit the target_reps on ALL sets with an average RPE <= 8, recommend weight increase.
   * Otherwise, recommend adding reps to the lagging sets.
   */
  static evaluate(sets: SetData[], isUpperBody: boolean): { action: string; value: number } | null {
    if (sets.length === 0) return null;

    let allTargetsHit = true;
    let totalRpe = 0;
    let rpeCount = 0;

    for (const set of sets) {
      if (set.reps < set.target_reps) {
        allTargetsHit = false;
      }
      if (set.rpe) {
        totalRpe += set.rpe;
        rpeCount++;
      }
    }

    const avgRpe = rpeCount > 0 ? totalRpe / rpeCount : 0;
    const currentWeight = sets[0].weight;

    if (allTargetsHit && (avgRpe <= 8 || rpeCount === 0)) {
      // Weight progression achieved
      const increment = isUpperBody ? 2.5 : 5.0;
      return {
        action: 'increase_weight',
        value: currentWeight + increment
      };
    } else {
      // Still in rep progression phase
      return {
        action: 'maintain_weight_increase_reps',
        value: currentWeight
      };
    }
  }
}

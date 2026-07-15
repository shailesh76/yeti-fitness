interface AdjustmentInput {
  plateau_data: { isPlateau: boolean, reason?: string };
  muscle_imbalances: { issue: string, recommendation: string }[];
  recovery_capacity: string;
}

export class ProgramAdjustmentEngine {
  /**
   * Synthesizes progression plateaus and muscle imbalances to output a program adjustment.
   */
  static generateAdjustments(input: AdjustmentInput) {
    const adjustments = [];

    if (input.muscle_imbalances.length > 0) {
      adjustments.push(...input.muscle_imbalances.map(i => i.recommendation));
    }

    if (input.plateau_data.isPlateau) {
      if (input.recovery_capacity === 'High') {
        adjustments.push('Plateau detected but recovery is high. Recommend swapping exercise variant (e.g., Barbell to Dumbbell).');
      } else {
        adjustments.push('Plateau detected with low recovery. Recommend deloading volume by 40% next week.');
      }
    }

    if (adjustments.length === 0) {
      adjustments.push('Progression stable. Maintain current trajectory.');
    }

    return adjustments;
  }
}

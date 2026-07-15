export interface MuscleVolumeLog {
  muscle_group: string;
  total_sets: number;
}

export class MuscleBalanceEngine {
  /**
   * Evaluates weekly volume distribution across major muscle groups
   * to detect imbalances (e.g. Chest dominating Back).
   */
  static evaluate(logs: MuscleVolumeLog[]) {
    const volumeMap = new Map<string, number>();
    logs.forEach(log => volumeMap.set(log.muscle_group.toLowerCase(), log.total_sets));

    const chestSets = volumeMap.get('chest') || 0;
    const backSets = volumeMap.get('back') || 0;
    
    const imbalances = [];

    // Push/Pull balance check
    if (chestSets > backSets * 1.5 && chestSets > 5) {
      imbalances.push({
        issue: 'Overtrained Chest relative to Back',
        recommendation: `Back volume is ${Math.round(((chestSets - backSets) / chestSets) * 100)}% lower than chest. Add pulling sets.`
      });
    }

    return {
      is_balanced: imbalances.length === 0,
      imbalances
    };
  }
}

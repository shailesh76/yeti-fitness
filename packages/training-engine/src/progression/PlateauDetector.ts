export interface HistoricalSession {
  date: Date;
  estimated_1rm: number;
  volume: number;
  avg_rpe: number;
  body_weight?: number;
}

export class PlateauDetector {
  /**
   * Detects if a plateau has occurred based on historical data.
   * A strength plateau is defined as no 1RM increase for 3+ weeks.
   */
  static detect(history: HistoricalSession[]): { isPlateau: boolean; type?: string; reason?: string } {
    if (history.length < 3) return { isPlateau: false };

    // Sort ascending by date
    const sorted = [...history].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    const oldest = sorted[0];
    const newest = sorted[sorted.length - 1];
    const weeksDiff = (newest.date.getTime() - oldest.date.getTime()) / (1000 * 60 * 60 * 24 * 7);

    // Evaluate Strength Plateau (No 1RM increase over 3+ weeks)
    if (weeksDiff >= 3) {
      if (newest.estimated_1rm <= oldest.estimated_1rm * 1.02) { // Less than 2% improvement
        
        // Evaluate Fatigue vs Volume
        if (newest.avg_rpe > oldest.avg_rpe + 1) {
          return {
            isPlateau: true,
            type: 'fatigue',
            reason: 'RPE has increased while performance stagnated. Fatigue accumulation likely.'
          };
        } else if (newest.volume <= oldest.volume * 1.05) {
          return {
            isPlateau: true,
            type: 'volume',
            reason: 'Training volume has remained stagnant for 3+ weeks.'
          };
        }

        return {
          isPlateau: true,
          type: 'strength',
          reason: 'No meaningful 1RM progression observed over the last 3-4 weeks.'
        };
      }
    }

    return { isPlateau: false };
  }
}

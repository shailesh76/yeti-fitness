import { HistoricalSession } from './PlateauDetector';

export class DeloadEngine {
  /**
   * Recommends a deload if performance drops 10%+ while RPE stays high.
   */
  static evaluate(history: HistoricalSession[]): { shouldDeload: boolean; recommendation?: string } {
    if (history.length < 2) return { shouldDeload: false };

    const sorted = [...history].sort((a, b) => a.date.getTime() - b.date.getTime());
    const latest = sorted[sorted.length - 1];
    const previous = sorted[sorted.length - 2];

    const performanceDrop = (previous.estimated_1rm - latest.estimated_1rm) / previous.estimated_1rm;

    if (performanceDrop > 0.10 && latest.avg_rpe >= 8.5) {
      return {
        shouldDeload: true,
        recommendation: 'Reduce total volume by 40-60% for 5-7 days. Maintain technique and avoid failure.'
      };
    }

    return { shouldDeload: false };
  }
}

import { WeightProgression, SetData } from './WeightProgression';
import { PlateauDetector, HistoricalSession } from './PlateauDetector';
import { DeloadEngine } from './DeloadEngine';

export interface ProgressionResult {
  action: string;
  value: any;
  isPlateau: boolean;
  plateauType?: string;
  deloadRecommended: boolean;
}

export class ProgressionEngine {
  /**
   * Main entry point called when a WorkoutCompletedEvent fires.
   */
  static analyzeExercise(
    isUpperBody: boolean,
    currentSets: SetData[], 
    history: HistoricalSession[]
  ): ProgressionResult {
    
    // 1. Check for Deload
    const deloadCheck = DeloadEngine.evaluate(history);
    if (deloadCheck.shouldDeload) {
      return {
        action: 'deload',
        value: deloadCheck.recommendation,
        isPlateau: false,
        deloadRecommended: true
      };
    }

    // 2. Check for Plateau
    const plateauCheck = PlateauDetector.detect(history);
    if (plateauCheck.isPlateau) {
      return {
        action: 'plateau_detected',
        value: plateauCheck.reason,
        isPlateau: true,
        plateauType: plateauCheck.type,
        deloadRecommended: false
      };
    }

    // 3. Normal Progression Rules
    const progression = WeightProgression.evaluate(currentSets, isUpperBody);
    
    return {
      action: progression?.action || 'maintain',
      value: progression?.value || 0,
      isPlateau: false,
      deloadRecommended: false
    };
  }
}

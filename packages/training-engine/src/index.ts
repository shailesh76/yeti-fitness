/**
 * @yeti/training-engine — Public API
 * Single entry point for all training intelligence engines.
 */

// ─── Root-level progression engine (used by session.tsx) ────────────────────
export { ProgressionEngine } from './ProgressionEngine';
export type {
  ExercisePerformanceContext,
  ProgressionRecommendation,
} from './ProgressionEngine';

// ─── Advanced Progression sub-engines ────────────────────────────────────────
export {
  ProgressionEngine as AdvancedProgressionEngine,
} from './progression/ProgressionEngine';
export type { ProgressionResult } from './progression/ProgressionEngine';

export { PlateauDetector } from './progression/PlateauDetector';
export type { HistoricalSession } from './progression/PlateauDetector';

export { DeloadEngine } from './progression/DeloadEngine';

export { WeightProgression } from './progression/WeightProgression';
export type { SetData } from './progression/WeightProgression';

// ─── Engagement / Health engines ─────────────────────────────────────────────
export { HealthScoreEngine } from './engagement/HealthScoreEngine';
export type {
  HealthScoreResult,
  EngagementStatus,
} from './engagement/HealthScoreEngine';

export { TransformationScoreEngine } from './engagement/TransformationScoreEngine';

export { WeeklyReviewEngine } from './engagement/WeeklyReviewEngine';

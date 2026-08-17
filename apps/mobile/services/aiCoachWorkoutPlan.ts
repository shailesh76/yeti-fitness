// Turns an AI Coach workout-plan action (confirm_workout_plan / create_workout_plan
// / edit_workout_plan) into either a saved plan or a populated draft in the
// builder — the single, testable place this happens, so the two "Save this
// plan"-shaped action types can never drift onto separate persistence logic,
// and so this logic is reachable from a test without rendering the coach
// screen. See packages/database/src/repositories/ExerciseRepository.ts for
// why exercise-name resolution needs the FULL catalog and never falls back to
// an arbitrary substitute.
// Imported from the specific file, not the '@yeti/database' package barrel:
// the barrel's index re-exports every WatermelonDB model in one go (see
// packages/database/index.ts), which Vitest's test transform can't parse —
// the same reason tests/repositories.test.ts imports UserRepository directly
// rather than through '@yeti/database'. Metro (the real app bundler) resolves
// either path identically, so this doesn't change app behavior.
import { resolveExerciseNamesAgainstCatalog, ExerciseCatalogEntry } from '../../../packages/database/src/repositories/ExerciseRepository';
import type { DraftExercise } from '../store/useWorkoutBuilderStore';

// Narrow, structural dependency shapes instead of importing the full
// WorkoutRepository/ExerciseRepository classes — this file only ever needs
// these two methods, and a real repository instance already satisfies these
// interfaces without any explicit relationship, so tests can pass a plain
// fake object instead of constructing a real repository.
export interface WorkoutRepositoryLike {
  createOwnWorkoutPlan(
    userId: string,
    name: string,
    notes: string | undefined,
    exercises: Array<{ exerciseId: string; sets?: string; reps?: string; restSeconds?: number }>,
  ): Promise<{ planId: string; planDayId: string }>;
}

export interface ExerciseRepositoryLike {
  getExercises(): Promise<any[]>;
  getAliasesByExerciseId(): Promise<Map<string, string[]>>;
}

export type AICoachActionKind = 'nutrition_targets' | 'workout_save' | 'workout_edit' | 'plan_edit_confirm' | 'plan_edit_cancel' | 'unsupported';

export interface ProposedPlanEditData {
  proposalId: string;
  action: 'add' | 'remove' | 'replace' | 'move' | 'update_sets_reps' | 'update_rest';
  planId: string;
  planName: string;
  dayId?: string;
  dayName?: string;
  targetPlanExerciseId?: string;
  exerciseId?: string;
  exerciseName: string;
  replacementExerciseId?: string;
  replacementExerciseName?: string;
  sets?: string;
  reps?: string;
  restSeconds?: number;
  currentValueDescription?: string;
  proposedValueDescription: string;
  expiresAt: number; // unix ms
}

/**
 * Classifies an AIAction.type into which handler branch owns it. The coach
 * screen's handleApplyAction dispatches on this instead of a duplicated
 * if/else chain — both create_workout_plan (legacy type, still used by the
 * pre-first-message demo transcript) and confirm_workout_plan (the type the
 * server actually emits, per coachSchema.ts's computeActions) classify as the
 * same 'workout_save', which is what actually proves they share one save
 * path: there is exactly one branch that reaches saveWorkoutPlanFromAction,
 * not two copies that could quietly drift apart.
 */
export function classifyAICoachAction(actionType: string): AICoachActionKind {
  if (actionType === 'set_nutrition_targets') return 'nutrition_targets';
  if (actionType === 'create_workout_plan' || actionType === 'confirm_workout_plan') return 'workout_save';
  if (actionType === 'edit_workout_plan') return 'workout_edit';
  if (actionType === 'confirm_plan_edit') return 'plan_edit_confirm';
  if (actionType === 'cancel_plan_edit') return 'plan_edit_cancel';
  return 'unsupported';
}

export interface AIWorkoutExerciseInput {
  name: string;
  sets?: number | string;
  reps?: string | number;
  rest_seconds?: number;
}

export interface AIWorkoutPlanActionData {
  name?: string;
  exercises?: AIWorkoutExerciseInput[];
}

export type SaveWorkoutPlanOutcome =
  | { kind: 'success'; planId: string; planDayId: string }
  | { kind: 'empty' }
  | { kind: 'unresolved'; names: string[] }
  | { kind: 'error'; message: string };

/**
 * Fetches the full exercise catalog (ExerciseRepository.getExercises() already
 * pages past any single-request row cap) plus known aliases, in the shape
 * resolveExerciseNamesAgainstCatalog needs. Exported so tests can exercise
 * resolution against a synthetic catalog without going through a real
 * ExerciseRepository at all.
 */
export async function loadExerciseCatalog(
  exerciseRepository: ExerciseRepositoryLike,
): Promise<ExerciseCatalogEntry[]> {
  const [exercises, aliasesByExerciseId] = await Promise.all([
    exerciseRepository.getExercises(),
    exerciseRepository.getAliasesByExerciseId(),
  ]);
  return (exercises || []).map((ex: any) => ({
    id: ex.id,
    name: ex.name,
    aliases: aliasesByExerciseId.get(ex.id),
  }));
}

// Keyed by action id (unique per AI-generated action) so a rapid double-tap on
// the same "Save this plan" button returns the SAME in-flight promise instead
// of starting a second createOwnWorkoutPlan call — this is what actually
// prevents the duplicate-plan race, not just disabling the button in the UI
// (which can't cover the gap between two taps that both land before the first
// re-render). Cleared in `finally` so a genuinely new attempt (e.g. retry
// after a failure) is never permanently blocked.
const inFlightSaves = new Map<string, Promise<SaveWorkoutPlanOutcome>>();

export interface SaveWorkoutPlanDeps {
  userId: string;
  workoutRepository: WorkoutRepositoryLike;
  exerciseRepository: ExerciseRepositoryLike;
}

/**
 * The one shared save path for both create_workout_plan (legacy/demo action
 * type) and confirm_workout_plan (current server action type) — callers pass
 * whichever type they received; this function doesn't care which, only that
 * `data` has the same shape. Never marks anything applied itself — the caller
 * does that only on a `success` outcome, so a failed or unresolved save always
 * leaves the action re-triable.
 */
export async function saveWorkoutPlanFromAction(
  actionId: string,
  data: AIWorkoutPlanActionData,
  deps: SaveWorkoutPlanDeps,
): Promise<SaveWorkoutPlanOutcome> {
  const existing = inFlightSaves.get(actionId);
  if (existing) return existing;

  const run = (async (): Promise<SaveWorkoutPlanOutcome> => {
    try {
      const exercisesList = (data.exercises || []).filter((ex) => ex && typeof ex.name === 'string' && ex.name.trim());
      if (exercisesList.length === 0) {
        return { kind: 'empty' };
      }

      const catalog = await loadExerciseCatalog(deps.exerciseRepository);
      const { resolved, unresolved } = resolveExerciseNamesAgainstCatalog(
        exercisesList.map((ex) => ex.name),
        catalog,
      );

      if (unresolved.length > 0) {
        // Never save a partially-corrupted plan: either every exercise
        // resolves to a real catalog id, or nothing is persisted.
        return { kind: 'unresolved', names: unresolved };
      }

      const mappedExercises = exercisesList.map((ex) => {
        const key = ex.name.trim().toLowerCase().replace(/\s+/g, ' ');
        const exerciseId = resolved.get(key);
        if (!exerciseId) {
          // Defensive — resolveExerciseNamesAgainstCatalog already guaranteed
          // every requested name is in `resolved` when `unresolved` is empty,
          // but never trust that invariant silently across a function
          // boundary without a hard stop if it's ever violated.
          throw new Error(`Internal error: "${ex.name}" resolved with no id.`);
        }
        return {
          exerciseId,
          sets: String(ex.sets ?? 3),
          reps: String(ex.reps ?? '10'),
          restSeconds: typeof ex.rest_seconds === 'number' ? ex.rest_seconds : 90,
        };
      });

      const { planId, planDayId } = await deps.workoutRepository.createOwnWorkoutPlan(
        deps.userId,
        data.name || 'AI Recommended Plan',
        'Created from Yeti AI Coach recommendation',
        mappedExercises,
      );

      return { kind: 'success', planId, planDayId };
    } catch (e: any) {
      return { kind: 'error', message: e?.message || 'Failed to save workout plan.' };
    } finally {
      inFlightSaves.delete(actionId);
    }
  })();

  inFlightSaves.set(actionId, run);
  return run;
}

export interface AICoachRepositoryLike {
  confirmPlanEdit(proposalId: string): Promise<any>;
  cancelPlanEdit(proposalId: string): Promise<any>;
}

export type ExecutePlanEditOutcome =
  | { kind: 'success'; message: string; action?: string; planName?: string }
  | { kind: 'already_applied'; message: string }
  | { kind: 'cancelled'; message: string }
  | { kind: 'expired'; message: string }
  | { kind: 'stale'; message: string }
  | { kind: 'error'; message: string };

const inFlightPlanEdits = new Map<string, Promise<ExecutePlanEditOutcome>>();

export async function executePlanEditFromAction(
  actionId: string,
  proposalId: string,
  aiCoachRepository: AICoachRepositoryLike,
): Promise<ExecutePlanEditOutcome> {
  const existing = inFlightPlanEdits.get(actionId);
  if (existing) return existing;

  const run = (async (): Promise<ExecutePlanEditOutcome> => {
    try {
      const res = await aiCoachRepository.confirmPlanEdit(proposalId);
      if (res.success) {
        return {
          kind: res.reason === 'already_applied' ? 'already_applied' : 'success',
          message: res.message || 'Plan change applied.',
          action: res.action,
          planName: res.planName,
        };
      }
      if (res.reason === 'expired') {
        return { kind: 'expired', message: res.message || 'This proposal has expired.' };
      }
      if (res.reason === 'cancelled') {
        return { kind: 'cancelled', message: res.message || 'This proposal was cancelled.' };
      }
      if (res.reason === 'proposal_stale') {
        return { kind: 'stale', message: res.message || 'Your workout plan has changed since this proposal was created.' };
      }
      return { kind: 'error', message: res.message || 'Failed to apply plan change.' };
    } catch (err: any) {
      return { kind: 'error', message: err.message || 'Failed to apply plan change.' };
    }
  })();

  inFlightPlanEdits.set(actionId, run);
  try {
    return await run;
  } finally {
    inFlightPlanEdits.delete(actionId);
  }
}

export async function cancelPlanEditFromAction(
  proposalId: string,
  aiCoachRepository: AICoachRepositoryLike,
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await aiCoachRepository.cancelPlanEdit(proposalId);
    return { success: true, message: res.message || 'Change cancelled.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to cancel change.' };
  }
}

/** Test-only escape hatch — production code never needs to clear this. */
export function __clearInFlightSavesForTests(): void {
  inFlightSaves.clear();
  inFlightPlanEdits.clear();
}

export interface BuildDraftResult {
  name: string;
  notes: string;
  exercises: DraftExercise[];
  /** Names that couldn't be matched to a real catalog exercise — surfaced to
   * the athlete rather than silently dropped or substituted; the draft still
   * loads with whatever DID resolve, since "adjust it first" is exactly where
   * a human fixing up a few rows by hand belongs. */
  unresolvedNames: string[];
}

let tempIdCounter = 0;
const nextDraftTempId = () => `ai-draft-${++tempIdCounter}-${Date.now()}`;

/**
 * Resolves an AI-proposed plan into DraftExercise rows for
 * useWorkoutBuilderStore, for the edit_workout_plan ("Adjust it first") path.
 * Never invents an exerciseId for a name it can't match — those are left out
 * of `exercises` and listed in `unresolvedNames` instead.
 */
export async function buildDraftFromAction(
  data: AIWorkoutPlanActionData,
  exerciseRepository: ExerciseRepositoryLike,
): Promise<BuildDraftResult> {
  const exercisesList = (data.exercises || []).filter((ex) => ex && typeof ex.name === 'string' && ex.name.trim());
  const catalog = await loadExerciseCatalog(exerciseRepository);
  const { resolved, unresolved } = resolveExerciseNamesAgainstCatalog(
    exercisesList.map((ex) => ex.name),
    catalog,
  );
  const byId = new Map(catalog.map((c) => [c.id, c] as const));

  const exercises: DraftExercise[] = exercisesList
    .map((ex): DraftExercise | null => {
      const key = ex.name.trim().toLowerCase().replace(/\s+/g, ' ');
      const exerciseId = resolved.get(key);
      if (!exerciseId) return null;
      return {
        tempId: nextDraftTempId(),
        exerciseId,
        exerciseName: byId.get(exerciseId)?.name || ex.name,
        sets: String(ex.sets ?? 3),
        reps: String(ex.reps ?? '10'),
        weight: '',
        restSeconds: typeof ex.rest_seconds === 'number' ? ex.rest_seconds : undefined,
        warmupSets: 0,
        isDropset: false,
        supersetGroup: null,
      };
    })
    .filter((ex): ex is DraftExercise => ex !== null);

  return {
    name: data.name || 'AI Recommended Plan',
    notes: 'Created from Yeti AI Coach recommendation',
    exercises,
    unresolvedNames: unresolved,
  };
}

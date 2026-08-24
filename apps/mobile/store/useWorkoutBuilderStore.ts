import { create } from 'zustand';
import { database } from '../database';
import { supabase } from '../lib/supabase';
import { WorkoutRepository, PlanExerciseConfig } from '@yeti/database';

const workoutRepository = new WorkoutRepository(database, supabase);

let tempIdCounter = 0;
const nextTempId = () => `temp-${++tempIdCounter}-${Date.now()}`;

export interface DraftExercise {
  tempId: string;
  /** Set once this row is actually persisted (plan_exercises.id). Absent for a row added during this edit session. */
  planExerciseId?: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup?: string;
  sets: string;
  reps: string;
  weight: string;
  targetRpe?: number;
  restSeconds?: number;
  notes?: string;
  warmupSets: number;
  isDropset: boolean;
  supersetGroup?: string | null;
}

interface PendingPick {
  exerciseId: string;
  exerciseName: string;
  muscleGroup?: string;
}

function toConfig(ex: DraftExercise): { exerciseId: string } & PlanExerciseConfig {
  return {
    exerciseId: ex.exerciseId,
    sets: ex.sets,
    reps: ex.reps,
    weight: ex.weight || undefined,
    targetRpe: ex.targetRpe,
    restSeconds: ex.restSeconds,
    notes: ex.notes,
    warmupSets: ex.warmupSets,
    isDropset: ex.isDropset,
    supersetGroup: ex.supersetGroup,
  };
}

interface WorkoutBuilderState {
  planId: string | null;
  planDayId: string | null;
  name: string;
  notes: string;
  exercises: DraftExercise[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  pendingPick: PendingPick | null;
  /** Set just before navigating to the picker to replace a specific row, rather than add a new one. */
  replacingTempId: string | null;
  /** planExerciseId set captured at load time, to diff against on save. */
  originalExerciseIds: Set<string>;

  reset: () => void;
  loadExisting: (planId: string) => Promise<void>;
  /** Pre-populates a brand-new (unsaved) draft from the AI Coach's
   * edit_workout_plan action, already resolved to real exercise ids by
   * services/aiCoachWorkoutPlan.ts's buildDraftFromAction. Distinct from
   * loadExisting: there is no plan_id yet, so `save()` will create a new
   * plan, exactly like starting a template from scratch. */
  loadDraftFromAI: (name: string, notes: string, exercises: DraftExercise[]) => void;
  setName: (name: string) => void;
  setNotes: (notes: string) => void;
  setPendingPick: (pick: PendingPick) => void;
  consumePendingPick: () => void;
  beginReplace: (tempId: string) => void;
  /** Clears a stale replace target before starting a genuine "+ Add Exercise"
   * picker trip. Needed because beginReplace(tempId) and a plain add both
   * navigate through the same picker route, distinguished only by whether
   * replacingTempId is set — if the athlete opens the picker to replace one
   * exercise, cancels out without picking (navigates back), then taps "+ Add
   * Exercise" to add a different one, replacingTempId would otherwise still
   * be armed from the abandoned replace attempt and silently turn that
   * unrelated add into a replace of the original row. */
  clearReplaceTarget: () => void;
  addExercise: (exerciseId: string, exerciseName: string, muscleGroup?: string) => void;
  removeExercise: (tempId: string) => void;
  replaceExercise: (tempId: string, newExerciseId: string, newExerciseName: string, newMuscleGroup?: string) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
  updateExerciseConfig: (tempId: string, patch: Partial<DraftExercise>) => void;
  /** Applies pendingPick as either a replace (if replacingTempId is set) or an add, then clears both. */
  resolvePendingPick: () => void;
  save: (userId: string) => Promise<string | null>;
}

const initialState = {
  planId: null as string | null,
  planDayId: null as string | null,
  name: '',
  notes: '',
  exercises: [] as DraftExercise[],
  loading: false,
  saving: false,
  error: null as string | null,
  pendingPick: null as PendingPick | null,
  replacingTempId: null as string | null,
  originalExerciseIds: new Set<string>(),
};

export const useWorkoutBuilderStore = create<WorkoutBuilderState>((set, get) => ({
  ...initialState,

  reset: () => set({ ...initialState, exercises: [], originalExerciseIds: new Set() }),

  loadDraftFromAI: (name, notes, exercises) => set({
    planId: null,
    planDayId: null,
    name,
    notes,
    exercises,
    loading: false,
    saving: false,
    error: null,
    pendingPick: null,
    replacingTempId: null,
    originalExerciseIds: new Set(),
  }),

  loadExisting: async (planId: string) => {
    set({ loading: true, error: null });
    try {
      const plan = await workoutRepository.fetchOwnWorkoutPlanById(planId);
      const day = plan?.days?.[0];
      const sortedExercises = [...(day?.exercises || [])].sort(
        (a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)
      );
      const draftExercises: DraftExercise[] = sortedExercises.map((ex: any) => ({
        tempId: nextTempId(),
        planExerciseId: ex.id,
        exerciseId: ex.exercise_id,
        exerciseName: ex.exercise?.name || 'Exercise',
        muscleGroup: ex.exercise?.muscle_group,
        sets: ex.sets ?? '3',
        reps: ex.reps ?? '10',
        weight: ex.weight ?? '',
        targetRpe: ex.target_rpe ?? undefined,
        restSeconds: ex.rest_seconds ?? undefined,
        notes: ex.notes ?? undefined,
        warmupSets: ex.warmup_sets ?? 0,
        isDropset: !!ex.is_dropset,
        supersetGroup: ex.superset_group ?? null,
      }));
      set({
        planId: plan?.id ?? null,
        planDayId: day?.id ?? null,
        name: plan?.name ?? '',
        notes: plan?.notes ?? '',
        exercises: draftExercises,
        originalExerciseIds: new Set(draftExercises.map(e => e.planExerciseId!).filter(Boolean)),
        loading: false,
      });
    } catch (e: any) {
      set({ loading: false, error: e?.message || 'Failed to load workout template' });
    }
  },

  setName: (name) => set({ name }),
  setNotes: (notes) => set({ notes }),
  setPendingPick: (pick) => set({ pendingPick: pick }),
  consumePendingPick: () => set({ pendingPick: null }),
  beginReplace: (tempId) => set({ replacingTempId: tempId }),
  clearReplaceTarget: () => set({ replacingTempId: null }),

  resolvePendingPick: () => {
    const { pendingPick, replacingTempId } = get();
    if (!pendingPick) return;
    if (replacingTempId) {
      get().replaceExercise(replacingTempId, pendingPick.exerciseId, pendingPick.exerciseName, pendingPick.muscleGroup);
    } else {
      get().addExercise(pendingPick.exerciseId, pendingPick.exerciseName, pendingPick.muscleGroup);
    }
    set({ pendingPick: null, replacingTempId: null });
  },

  addExercise: (exerciseId, exerciseName, muscleGroup) => {
    set(state => ({
      exercises: [
        ...state.exercises,
        {
          tempId: nextTempId(),
          exerciseId,
          exerciseName,
          muscleGroup,
          sets: '3',
          reps: '10',
          weight: '',
          warmupSets: 0,
          isDropset: false,
          supersetGroup: null,
        },
      ],
    }));
  },

  removeExercise: (tempId) => {
    set(state => ({ exercises: state.exercises.filter(e => e.tempId !== tempId) }));
  },

  replaceExercise: (tempId, newExerciseId, newExerciseName, newMuscleGroup) => {
    set(state => ({
      exercises: state.exercises.map(e =>
        e.tempId === tempId
          ? { ...e, exerciseId: newExerciseId, exerciseName: newExerciseName, muscleGroup: newMuscleGroup }
          : e
      ),
    }));
  },

  reorder: (fromIndex, toIndex) => {
    set(state => {
      const list = [...state.exercises];
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      return { exercises: list };
    });
  },

  updateExerciseConfig: (tempId, patch) => {
    set(state => ({
      exercises: state.exercises.map(e => (e.tempId === tempId ? { ...e, ...patch } : e)),
    }));
  },

  save: async (userId: string) => {
    const state = get();
    set({ saving: true, error: null });
    try {
      if (!state.planId) {
        // Brand new template.
        const { planId } = await workoutRepository.createOwnWorkoutPlan(
          userId,
          state.name || 'Untitled Workout',
          state.notes || undefined,
          state.exercises.map(toConfig)
        );
        set({ saving: false, planId });
        return planId;
      }

      // Editing an existing template — reconcile against what was loaded.
      await workoutRepository.updateOwnWorkoutPlanMeta(state.planId, {
        name: state.name || 'Untitled Workout',
        notes: state.notes || undefined,
      });

      const currentIds = new Set(state.exercises.map(e => e.planExerciseId).filter(Boolean) as string[]);
      const toRemove = [...state.originalExerciseIds].filter(id => !currentIds.has(id));
      await Promise.all(toRemove.map(id => workoutRepository.removePlanExercise(id)));

      const planDayId = state.planDayId!;
      const finalIds: string[] = [];
      for (const ex of state.exercises) {
        if (ex.planExerciseId) {
          await workoutRepository.replacePlanExercise(ex.planExerciseId, ex.exerciseId);
          await workoutRepository.updatePlanExerciseConfig(ex.planExerciseId, toConfig(ex));
          finalIds.push(ex.planExerciseId);
        } else {
          const created = await workoutRepository.addPlanExercise(planDayId, ex.exerciseId, 0, toConfig(ex));
          finalIds.push(created.id);
        }
      }
      await workoutRepository.reorderPlanExercises(finalIds.map((id, index) => ({ id, orderIndex: index })));

      set({ saving: false });
      return state.planId;
    } catch (e: any) {
      set({ saving: false, error: e?.message || 'Failed to save workout template' });
      return null;
    }
  },
}));

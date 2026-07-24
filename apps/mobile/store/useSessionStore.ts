import { create } from 'zustand';
import { database, isNativeDbAvailable } from '../database';
import { supabase } from '../lib/supabase';
import { WorkoutRepository } from '@yeti/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

const workoutRepository = new WorkoutRepository(database, supabase);

export interface SetLog {
  id: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  rpe?: number;
  tempo?: string;
  restSeconds?: number;
  isWarmup?: boolean;
  isDropset?: boolean;
  isCompleted: boolean;
  completedAt?: number;
}

export interface ExerciseInSession {
  exerciseId: string;
  exerciseName: string;
  targetSets: number;
  targetReps: string;
  targetWeightKg?: number;
  planExerciseId?: string;
  targetRpe?: number;
  muscleGroup?: string;
  progressionSuggestion?: string;
  restSeconds?: number;
  sets: SetLog[];
}

export interface ActiveSession {
  localId: string;
  serverId?: string;
  userId: string;
  planDayId?: string;
  assignmentId?: string;
  name: string;
  startedAt: number;
  notes?: string;
  exercises: ExerciseInSession[];
}

interface SessionState {
  activeSession: ActiveSession | null;
  isLoading: boolean;
  isSaving: boolean;
  elapsedSeconds: number;

  /** Load a plan day into a new session */
  startSession: (params: {
    userId: string;
    planDayId?: string;
    assignmentId?: string;
    sessionName: string;
    exercises: Omit<ExerciseInSession, 'sets'>[];
  }) => Promise<void>;

  /** Resume an in-progress session from AsyncStorage (e.g. app backgrounded) */
  resumeSession: () => Promise<void>;

  /** Update the session-level notes (saved with the workout on finish) */
  setNotes: (notes: string) => void;

  /** Update a set's values while the athlete is entering data */
  updateSet: (exerciseIdx: number, setIdx: number, values: Partial<SetLog>) => void;

  /** Add a new set to an exercise in the active session */
  addSet: (exerciseIdx: number) => void;

  /** Remove a set from an exercise in the active session */
  removeSet: (exerciseIdx: number, setIdx: number) => void;

  /** Add an exercise to the active session */
  addExercise: (exercise: Omit<ExerciseInSession, 'sets'>) => void;

  /** Remove an exercise from the active session */
  removeExercise: (exerciseIdx: number) => void;

  /** Replace an exercise in the active session */
  replaceExercise: (exerciseIdx: number, newExercise: Omit<ExerciseInSession, 'sets'>) => void;

  /** Mark a set as completed and save it locally + enqueue for sync */
  completeSet: (exerciseIdx: number, setIdx: number, userId: string) => Promise<void>;


  /** Finish the session, save workout history, trigger progression analysis */
  finishSession: () => Promise<{ sessionId: string | null; totalVolume: number }>;

  /** Abandon (discard) the current session */
  abandonSession: () => void;

  /** Tick the elapsed timer — call every second */
  tick: () => void;
}

const SESSION_STORAGE_KEY = '@yeti_active_session';

function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function buildDefaultSets(
  targetSets: number,
  targetReps: string,
  targetWeightKg?: number,
): SetLog[] {
  const reps = parseInt(targetReps?.split('-')[0] || '8', 10);
  return Array.from({ length: targetSets }, (_, i) => ({
    id: generateLocalId(),
    setNumber: i + 1,
    weightKg: targetWeightKg ?? 0,
    reps,
    isCompleted: false,
  }));
}

export const useSessionStore = create<SessionState>((set, get) => ({
  activeSession: null,
  isLoading: false,
  isSaving: false,
  elapsedSeconds: 0,

  startSession: async ({ userId, planDayId, assignmentId, sessionName, exercises }) => {
    set({ isLoading: true });

    const localId = generateLocalId();
    const now = Date.now();

    const session: ActiveSession = {
      localId,
      userId,
      planDayId,
      assignmentId,
      name: sessionName,
      startedAt: now,
      exercises: exercises.map((ex) => ({
        ...ex,
        sets: buildDefaultSets(ex.targetSets, ex.targetReps, ex.targetWeightKg),
      })),
    };

    // 1. Create the session record locally first (offline-first)
    if (isNativeDbAvailable && database) {
      try {
        const dbSession = await workoutRepository.createWorkoutSession(userId, sessionName, planDayId, assignmentId);
        session.localId = dbSession.id;
      } catch (e) {
        console.warn('[Session] Could not create local session record:', e);
      }
    }

    // Persist session to AsyncStorage for crash-recovery
    await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    set({ activeSession: session, isLoading: false, elapsedSeconds: 0 });
  },

  resumeSession: async () => {
    try {
      const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        const session: ActiveSession = JSON.parse(raw);
        const elapsed = Math.floor((Date.now() - session.startedAt) / 1000);
        set({ activeSession: session, elapsedSeconds: elapsed });
        console.log('[Session] Resumed active session:', session.name);
      }
    } catch (e) {
      console.warn('[Session] Failed to resume session:', e);
    }
  },

  setNotes: (notes) => {
    set((state) => {
      if (!state.activeSession) return state;
      const session = { ...state.activeSession, notes };
      AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session)).catch(() => {});
      return { activeSession: session };
    });
  },

  updateSet: (exerciseIdx, setIdx, values) => {
    set((state) => {
      if (!state.activeSession) return state;
      const exercises = [...state.activeSession.exercises];
      const sets = [...exercises[exerciseIdx].sets];
      sets[setIdx] = { ...sets[setIdx], ...values };
      // Write the updated sets array back onto its exercise — without this the
      // new array is orphaned and the change (weight/reps/RPE/completion) is lost.
      exercises[exerciseIdx] = { ...exercises[exerciseIdx], sets };
      const session = { ...state.activeSession, exercises };
      AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session)).catch(() => {});
      return { activeSession: session };
    });
  },


  addSet: (exerciseIdx) => {

    set((state) => {
      if (!state.activeSession) return state;
      const exercises = [...state.activeSession.exercises];
      const ex = exercises[exerciseIdx];
      const lastSet = ex.sets[ex.sets.length - 1];
      const newSet: SetLog = {
        id: generateLocalId(),
        setNumber: ex.sets.length + 1,
        weightKg: lastSet?.weightKg ?? ex.targetWeightKg ?? 0,
        reps: lastSet?.reps ?? parseInt(ex.targetReps?.split('-')[0] || '8', 10),
        rpe: lastSet?.rpe,
        tempo: lastSet?.tempo,
        restSeconds: lastSet?.restSeconds ?? ex.restSeconds,
        isWarmup: false,
        isCompleted: false,
      };
      exercises[exerciseIdx] = { ...ex, sets: [...ex.sets, newSet] };
      const session = { ...state.activeSession, exercises };
      AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session)).catch(() => {});
      return { activeSession: session };
    });
  },

  removeSet: (exerciseIdx, setIdx) => {
    set((state) => {
      if (!state.activeSession) return state;
      const exercises = [...state.activeSession.exercises];
      const ex = exercises[exerciseIdx];
      if (ex.sets.length <= 1) return state; // Keep at least 1 set
      const sets = ex.sets.filter((_, idx) => idx !== setIdx).map((s, idx) => ({ ...s, setNumber: idx + 1 }));
      exercises[exerciseIdx] = { ...ex, sets };
      const session = { ...state.activeSession, exercises };
      AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session)).catch(() => {});
      return { activeSession: session };
    });
  },

  addExercise: (newEx) => {
    set((state) => {
      if (!state.activeSession) return state;
      const fullEx: ExerciseInSession = {
        ...newEx,
        sets: buildDefaultSets(newEx.targetSets || 3, newEx.targetReps || '8-10', newEx.targetWeightKg),
      };
      const session = { ...state.activeSession, exercises: [...state.activeSession.exercises, fullEx] };
      AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session)).catch(() => {});
      return { activeSession: session };
    });
  },

  removeExercise: (exerciseIdx) => {
    set((state) => {
      if (!state.activeSession) return state;
      const exercises = state.activeSession.exercises.filter((_, idx) => idx !== exerciseIdx);
      const session = { ...state.activeSession, exercises };
      AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session)).catch(() => {});
      return { activeSession: session };
    });
  },

  replaceExercise: (exerciseIdx, newEx) => {
    set((state) => {
      if (!state.activeSession) return state;
      const exercises = [...state.activeSession.exercises];
      const fullEx: ExerciseInSession = {
        ...newEx,
        sets: buildDefaultSets(newEx.targetSets || 3, newEx.targetReps || '8-10', newEx.targetWeightKg),
      };
      exercises[exerciseIdx] = fullEx;
      const session = { ...state.activeSession, exercises };
      AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session)).catch(() => {});
      return { activeSession: session };
    });
  },


  completeSet: async (exerciseIdx, setIdx, userId) => {
    const state = get();
    if (!state.activeSession) return;

    const now = Date.now();

    // Mark set as completed in local state
    get().updateSet(exerciseIdx, setIdx, {
      isCompleted: true,
      completedAt: now,
    });

    const ex = get().activeSession!.exercises[exerciseIdx];
    const completedSet = ex.sets[setIdx];
    const session = get().activeSession!;

    // Save set locally in WatermelonDB
    if (isNativeDbAvailable && database) {
      try {
        await workoutRepository.saveExerciseSet(
          session.localId,
          userId,
          ex.exerciseId,
          ex.exerciseName,
          completedSet.setNumber,
          completedSet.weightKg,
          completedSet.reps,
          completedSet.rpe,
          completedSet.tempo,
          completedSet.restSeconds,
          completedSet.isWarmup,
          completedSet.isDropset
        );
      } catch (e) {
        console.warn('[Session] Failed to save set locally:', e);
      }
    }
  },

  finishSession: async () => {
    const state = get();
    if (!state.activeSession) return { sessionId: null, totalVolume: 0 };

    set({ isSaving: true });

    const session = state.activeSession;
    const finishedAt = Date.now();
    const durationSeconds = Math.floor((finishedAt - session.startedAt) / 1000);

    // Calculate total volume
    let totalVolume = 0;
    session.exercises.forEach((ex) => {
      ex.sets
        .filter((s) => s.isCompleted)
        .forEach((s) => {
          totalVolume += s.weightKg * s.reps;
        });
    });

    // Complete session locally in WatermelonDB
    const suggestions: string[] = [];
    session.exercises.forEach((ex) => {
      if (ex.progressionSuggestion) {
        suggestions.push(`${ex.exerciseName}: ${ex.progressionSuggestion}`);
      }
    });
    const suggestionText = suggestions.join('\n') || undefined;

    if (isNativeDbAvailable && database) {
      try {
        await workoutRepository.completeWorkoutSession(
          session.localId,
          durationSeconds,
          totalVolume,
          session.notes || '',
          suggestionText
        );
      } catch (e) {
        console.warn('[Session] Failed to complete session locally:', e);
      }
    }

    // Clear local active session cache
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    set({ activeSession: null, isSaving: false, elapsedSeconds: 0 });

    return { sessionId: session.localId || null, totalVolume };
  },

  abandonSession: async () => {
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    set({ activeSession: null, elapsedSeconds: 0 });
  },

  tick: () => {
    set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 }));
  },
}));

import { create } from 'zustand';
import { database, isNativeDbAvailable } from '../database';
import { supabase } from '../lib/supabase';
import { WorkoutRepository } from '@yeti/database/src/repositories/WorkoutRepository';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLogStore } from './useLogStore';
import { useWorkoutStore } from './useWorkoutStore';
import { getHomeSnapshot, patchHomeSnapshot, buildTodaysPlan } from '../services/homeSummary';
import { invalidateScreenData } from '../services/screenDataCache';
import {
  DurableWorkoutCompletion,
  persistWorkoutCompletion,
} from '../services/workoutCompletionPersistence';
import {
  claimTerminalState,
  clearPendingDiscardIfMatches,
  enqueuePendingWorkoutDiscard,
  flushPendingWorkoutDiscard,
  PendingWorkoutDiscard,
  readPendingWorkoutDiscards,
  reconcilePendingDiscardState,
  SessionTerminalState,
} from '../services/workoutDiscardPersistence';

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
  /** Shared label (e.g. "A") linking exercises performed as a superset. */
  supersetGroup?: string;
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

export interface StartSessionInput {
  userId: string;
  planDayId?: string;
  assignmentId?: string;
  sessionName: string;
  exercises: Array<{
    exerciseId: string;
    exerciseName: string;
    targetSets: number;
    targetReps: string;
    targetWeightKg?: number;
    planExerciseId?: string;
    muscleGroup?: string;
    restSeconds?: number;
    supersetGroup?: string;
  }>;
}

interface SessionState {
  activeSession: ActiveSession | null;
  isLoading: boolean;
  isSaving: boolean;
  elapsedSeconds: number;
  pendingCompletion: DurableWorkoutCompletion | null;
  completionError: string | null;
  terminalState: SessionTerminalState;
  terminalSessionId: string | null;

  /** Initialize a new session and persist it to SQLite + AsyncStorage */
  startSession: (input: StartSessionInput) => Promise<void>;

  /** Resume an active session from AsyncStorage on app open */
  resumeSession: () => Promise<void>;

  /** Update set weight/reps/rpe/completed in memory */
  updateSet: (
    exerciseIdx: number,
    setIdx: number,
    fields: Partial<SetLog>,
  ) => void;

  /** Append a new set to an exercise */
  addSet: (exerciseIdx: number) => void;

  /** Remove a set from an exercise */
  removeSet: (exerciseIdx: number, setIdx: number) => void;

  /** Add an exercise to the active session */
  addExercise: (exercise: Omit<ExerciseInSession, 'sets'>) => void;

  /** Remove an exercise from the active session */
  removeExercise: (exerciseIdx: number) => void;

  /** Replace an exercise in the active session */
  replaceExercise: (exerciseIdx: number, newExercise: Omit<ExerciseInSession, 'sets'>) => void;

  /** Reorder exercises within the active session */
  reorderExercises: (fromIndex: number, toIndex: number) => void;

  /** Set session notes */
  setNotes: (notes: string) => void;

  /** Mark a set as completed and save it locally + enqueue for sync */
  completeSet: (exerciseIdx: number, setIdx: number, userId: string) => Promise<void>;

  /** Finish the session, save workout history, trigger progression analysis */
  finishSession: () => Promise<{ sessionId: string | null; totalVolume: number; persisted: boolean; pendingRetry: boolean }>;

  /** Retry a PWA completion payload already owned by persistent storage. */
  retryPendingCompletion: () => Promise<boolean>;

  /** Abandon (discard) the current session */
  abandonSession: () => Promise<void>;

  /** Clear only a stale crash-recovery snapshot proven completed elsewhere. */
  clearStaleActiveSession: (
    sessionId: string,
    completedSessionId: string | null,
    completedAt?: string | number | null,
  ) => Promise<void>;

  /** Tick the elapsed timer — call every second */
  tick: () => void;
}

const SESSION_STORAGE_KEY = '@yeti_active_session';
const PENDING_COMPLETION_KEY = '@yeti_pending_workout_completion';

function generateStableId(): string {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  if (randomUuid) return randomUuid;
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    return (char === 'x' ? value : (value & 0x3) | 0x8).toString(16);
  });
}

function buildDefaultSets(
  targetSets: number,
  targetReps: string,
  targetWeightKg?: number,
): SetLog[] {
  const reps = parseInt(targetReps?.split('-')[0] || '8', 10);
  return Array.from({ length: targetSets }, (_, i) => ({
    id: generateStableId(),
    setNumber: i + 1,
    weightKg: targetWeightKg ?? 0,
    reps,
    isCompleted: false,
  }));
}

function publishCompletedSession(
  session: ActiveSession,
  durationSeconds: number,
  totalVolume: number,
  completedAtIso: string,
) {
  useLogStore.getState().prependWorkoutLog({
    id: session.localId,
    name: session.name,
    plan_day_id: session.planDayId,
    assignment_id: session.assignmentId,
    duration_seconds: durationSeconds,
    completed_at: completedAtIso,
    total_volume: totalVolume,
    exercises: session.exercises.map((exercise) => ({
      id: `${session.localId}:${exercise.exerciseId}`,
      exercise_id: exercise.exerciseId,
      exercise_name: exercise.exerciseName,
      sets: exercise.sets.map((item) => ({
        reps: item.reps,
        weight: String(item.weightKg),
        completed: item.isCompleted,
        tempo: item.tempo,
        rpe: item.rpe,
      })),
    })),
  });

  if (!session.userId) return;
  const snap = getHomeSnapshot(session.userId);
  const completedDayIds = new Set<string>();
  if (session.planDayId) completedDayIds.add(session.planDayId);
  (useLogStore.getState().logsHistory || []).forEach((log) => {
    if (log.plan_day_id) completedDayIds.add(log.plan_day_id);
  });
  const nextPlan = buildTodaysPlan({
    activeSession: null,
    plans: useWorkoutStore.getState().workoutPlans,
    completedPlanDayIds: completedDayIds,
  });
  patchHomeSnapshot(session.userId, {
    weeklyWorkoutCount: (snap?.weeklyWorkoutCount || 0) + 1,
    todayPlan: nextPlan,
  });
  invalidateScreenData(`home:${session.userId}`);
  invalidateScreenData(`workouts:${session.userId}`);
  invalidateScreenData(`progress:${session.userId}`);
}

export const useSessionStore = create<SessionState>((set, get) => ({
  activeSession: null,
  isLoading: false,
  isSaving: false,
  elapsedSeconds: 0,
  pendingCompletion: null,
  completionError: null,
  terminalState: 'ACTIVE',
  terminalSessionId: null,

  startSession: async ({ userId, planDayId, assignmentId, sessionName, exercises }) => {
    set({ isLoading: true });

    const localId = generateStableId();
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
    set({
      activeSession: session,
      isLoading: false,
      elapsedSeconds: 0,
      terminalState: 'ACTIVE',
      terminalSessionId: session.localId,
    });

    // Patch Home snapshot so Today's Plan card reflects active session immediately
    if (userId) {
      patchHomeSnapshot(userId, {
        todayPlan: {
          kind: 'session',
          sessionId: session.localId,
          name: sessionName,
          muscleSummary: '',
          exerciseCount: exercises.length,
          setCount: exercises.reduce((acc, e) => acc + (e.targetSets || 0), 0),
        },
      });
      invalidateScreenData(`home:${userId}`);
    }
  },

  resumeSession: async () => {
    try {
      const [raw, pendingRaw, pendingDiscards] = await Promise.all([
        AsyncStorage.getItem(SESSION_STORAGE_KEY),
        AsyncStorage.getItem(PENDING_COMPLETION_KEY),
        readPendingWorkoutDiscards(),
      ]);
      const pendingCompletion: DurableWorkoutCompletion | null = pendingRaw ? JSON.parse(pendingRaw) : null;
      const restoredSession: ActiveSession | null = raw ? JSON.parse(raw) : null;
      const reconciled = reconcilePendingDiscardState(
        restoredSession,
        pendingCompletion,
        pendingDiscards,
      );
      if (reconciled.pendingCompletion) set({ pendingCompletion: reconciled.pendingCompletion });
      if (reconciled.activeSession) {
        const elapsed = Math.floor((Date.now() - reconciled.activeSession.startedAt) / 1000);
        set({
          activeSession: reconciled.activeSession,
          elapsedSeconds: elapsed,
          terminalState: 'ACTIVE',
          terminalSessionId: reconciled.activeSession.localId,
        });
        console.log('[Session] Resumed active session:', reconciled.activeSession.name);
      }
      if (pendingDiscards.length > 0) {
        const removals: Promise<void>[] = [];
        if (reconciled.clearActiveStorage) removals.push(AsyncStorage.removeItem(SESSION_STORAGE_KEY));
        if (reconciled.clearCompletionStorage) removals.push(AsyncStorage.removeItem(PENDING_COMPLETION_KEY));
        set((state) => ({
          activeSession: state.activeSession && pendingDiscards.some((item) => item.sessionId === state.activeSession?.localId)
            ? null
            : state.activeSession,
          pendingCompletion: state.pendingCompletion && pendingDiscards.some((item) => item.sessionId === state.pendingCompletion?.session.id)
            ? null
            : state.pendingCompletion,
          elapsedSeconds: state.activeSession && pendingDiscards.some((item) => item.sessionId === state.activeSession?.localId)
            ? 0
            : state.elapsedSeconds,
        }));
        await Promise.all(removals);
        pendingDiscards.forEach((discard) => {
          void flushPendingWorkoutDiscard(supabase, discard, undefined, true);
        });
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

  updateSet: (exerciseIdx, setIdx, fields) => {
    set((state) => {
      if (!state.activeSession) return state;
      const exercises = [...state.activeSession.exercises];
      const sets = [...exercises[exerciseIdx].sets];
      sets[setIdx] = { ...sets[setIdx], ...fields };
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
        id: generateStableId(),
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

  reorderExercises: (fromIndex, toIndex) => {
    const session = get().activeSession;
    if (!session) return;

    const exercises = [...session.exercises];
    const [moved] = exercises.splice(fromIndex, 1);
    exercises.splice(toIndex, 0, moved);

    set({ activeSession: { ...session, exercises } });
    AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ ...session, exercises })).catch(() => {});
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
    if (!state.activeSession) return { sessionId: null, totalVolume: 0, persisted: false, pendingRetry: false };

    const session = state.activeSession;
    let claimed = false;
    set((current) => {
      const currentTerminal = current.terminalSessionId === session.localId
        ? current.terminalState
        : 'ACTIVE';
      const next = claimTerminalState(currentTerminal, 'FINISHING');
      if (!next || current.activeSession?.localId !== session.localId) return current;
      claimed = true;
      return {
        terminalState: next,
        terminalSessionId: session.localId,
        isSaving: true,
        completionError: null,
      };
    });
    if (!claimed) return { sessionId: null, totalVolume: 0, persisted: false, pendingRetry: false };
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

    const completedAtIso = new Date(finishedAt).toISOString();
    const completion: DurableWorkoutCompletion = {
      session: {
        id: session.localId,
        athlete_id: session.userId,
        plan_day_id: session.planDayId || null,
        started_at: new Date(session.startedAt).toISOString(),
        completed_at: completedAtIso,
        duration_seconds: durationSeconds,
      },
      sets: session.exercises.flatMap((exercise) =>
        exercise.sets.filter((item) => item.isCompleted).map((item) => ({
          id: item.id,
          session_id: session.localId,
          plan_exercise_id: exercise.planExerciseId || null,
          exercise_id: exercise.exerciseId,
          weight: item.weightKg,
          reps: item.reps,
          completed_at: item.completedAt ? new Date(item.completedAt).toISOString() : completedAtIso,
        })),
      ),
    };

    // Complete the session in durable storage / remote before publishing history.
    const suggestions: string[] = [];
    session.exercises.forEach((ex) => {
      if (ex.progressionSuggestion) {
        suggestions.push(`${ex.exerciseName}: ${ex.progressionSuggestion}`);
      }
    });
    const suggestionText = suggestions.join('\n') || undefined;

    try {
      if (!isNativeDbAvailable) {
        await AsyncStorage.setItem(PENDING_COMPLETION_KEY, JSON.stringify(completion));
        set({ pendingCompletion: completion, completionError: null });
      }
      if (isNativeDbAvailable && database) {
        await workoutRepository.completeWorkoutSession(
          session.localId,
          durationSeconds,
          totalVolume,
          session.notes || '',
          suggestionText
        );
      } else if (supabase && session.userId) {
        const persistence = await persistWorkoutCompletion(supabase, completion);
        if (persistence.status === 'complete') {
          await AsyncStorage.removeItem(PENDING_COMPLETION_KEY);
        } else {
          set({
            pendingCompletion: completion,
            completionError: 'Workout completed; exercise sets are pending sync',
          });
        }
      }
      publishCompletedSession(session, durationSeconds, totalVolume, completedAtIso);
      try {
        await workoutRepository.recordPersonalBests(
          session.userId,
          completion.sets.map((item) => ({
            exerciseId: item.exercise_id,
            weight: item.weight,
            reps: item.reps,
          })),
        );
        void useLogStore.getState().fetchPRs(session.userId);
      } catch (recordError) {
        console.warn('[Session] Workout saved; personal record evaluation will retry on a later completion:', recordError);
      }
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
      set({
        activeSession: null,
        pendingCompletion: isNativeDbAvailable ? null : get().pendingCompletion,
        completionError: isNativeDbAvailable ? null : get().completionError,
        isSaving: false,
        elapsedSeconds: 0,
        terminalState: 'COMPLETED',
        terminalSessionId: session.localId,
      });
      return {
        sessionId: session.localId || null,
        totalVolume,
        persisted: true,
        pendingRetry: Boolean(!isNativeDbAvailable && get().pendingCompletion),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Workout could not be saved';
      console.warn('[Session] Completed workout retained for retry:', message);
      if (isNativeDbAvailable) {
        set({
          isSaving: false,
          completionError: message,
          terminalState: 'ACTIVE',
          terminalSessionId: session.localId,
        });
        throw error;
      }
      set({
        activeSession: session,
        pendingCompletion: completion,
        completionError: message,
        isSaving: false,
        terminalState: 'ACTIVE',
        terminalSessionId: session.localId,
      });
      return { sessionId: session.localId || null, totalVolume, persisted: false, pendingRetry: true };
    }
  },

  retryPendingCompletion: async () => {
    const stored = get().pendingCompletion || JSON.parse(
      (await AsyncStorage.getItem(PENDING_COMPLETION_KEY)) || 'null',
    );
    if (!stored || !supabase) return false;
    const pendingDiscards = await readPendingWorkoutDiscards();
    if (pendingDiscards.some((discard) => (
      discard.sessionId === stored.session.id && !discard.preservePendingCompletion
    ))) {
      await AsyncStorage.removeItem(PENDING_COMPLETION_KEY);
      set({ pendingCompletion: null, completionError: null });
      return false;
    }
    const activeForCompletion = get().activeSession?.localId === stored.session.id;
    let claimed = !activeForCompletion;
    if (activeForCompletion) {
      set((current) => {
        const currentTerminal = current.terminalSessionId === stored.session.id
          ? current.terminalState
          : 'ACTIVE';
        const next = claimTerminalState(currentTerminal, 'FINISHING');
        if (!next || current.activeSession?.localId !== stored.session.id) return current;
        claimed = true;
        return {
          terminalState: next,
          terminalSessionId: stored.session.id,
          isSaving: true,
          completionError: null,
        };
      });
    } else if (
      get().terminalSessionId === stored.session.id
      && get().terminalState === 'DISCARDING'
    ) {
      claimed = false;
    }
    if (!claimed) return false;
    set({ isSaving: true, completionError: null });
    try {
      const persistence = await persistWorkoutCompletion(supabase, stored);
      if (persistence.status === 'sets_pending') {
        await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
        set((current) => ({
          activeSession: current.activeSession?.localId === stored.session.id ? null : current.activeSession,
          pendingCompletion: stored,
          completionError: 'Workout completed; exercise sets are pending sync',
          isSaving: false,
          terminalState: 'COMPLETED',
          terminalSessionId: stored.session.id,
        }));
        return false;
      }
      await Promise.all([
        AsyncStorage.removeItem(PENDING_COMPLETION_KEY),
        AsyncStorage.removeItem(SESSION_STORAGE_KEY),
      ]);
      set((current) => ({
        activeSession: current.activeSession?.localId === stored.session.id ? null : current.activeSession,
        pendingCompletion: current.pendingCompletion?.session.id === stored.session.id
          ? null
          : current.pendingCompletion,
        completionError: null,
        isSaving: false,
        terminalState: 'COMPLETED',
        terminalSessionId: stored.session.id,
      }));
      invalidateScreenData(`home:${stored.session.athlete_id}`);
      invalidateScreenData(`workouts:${stored.session.athlete_id}`);
      invalidateScreenData(`progress:${stored.session.athlete_id}`);
      return true;
    } catch (error) {
      set({
        completionError: error instanceof Error ? error.message : 'Workout retry failed',
        isSaving: false,
        terminalState: activeForCompletion ? 'ACTIVE' : get().terminalState,
        terminalSessionId: activeForCompletion ? stored.session.id : get().terminalSessionId,
      });
      return false;
    }
  },

  abandonSession: async () => {
    const session = get().activeSession;
    if (!session) return;
    let claimed = false;
    set((current) => {
      const currentTerminal = current.terminalSessionId === session.localId
        ? current.terminalState
        : 'ACTIVE';
      const next = claimTerminalState(currentTerminal, 'DISCARDING');
      if (!next || current.activeSession?.localId !== session.localId) return current;
      claimed = true;
      return {
        terminalState: next,
        terminalSessionId: session.localId,
        isSaving: true,
        completionError: null,
      };
    });
    if (!claimed) throw new Error('A terminal workout operation is already in progress');
    const discard: PendingWorkoutDiscard = {
      sessionId: session.localId,
      athleteId: session.userId,
    };
    try {
      await enqueuePendingWorkoutDiscard(discard);
      if (session.localId && isNativeDbAvailable && database) {
        try {
          await workoutRepository.abandonWorkoutSession(session.localId);
        } catch (deleteError) {
          await clearPendingDiscardIfMatches(session.localId);
          throw deleteError;
        }
      }
      useLogStore.getState().removeWorkoutLog(session.localId);
      const pendingCompletion = get().pendingCompletion;
      const samePendingCompletion = pendingCompletion?.session.id === session.localId;
      const removals = [AsyncStorage.removeItem(SESSION_STORAGE_KEY)];
      if (samePendingCompletion) removals.push(AsyncStorage.removeItem(PENDING_COMPLETION_KEY));
      let localReconciled = false;
      try {
        await Promise.all(removals);
        localReconciled = true;
      } catch (cleanupError) {
        set((current) => ({
          activeSession: current.activeSession?.localId === session.localId ? null : current.activeSession,
          pendingCompletion: current.pendingCompletion?.session.id === session.localId
            ? null
            : current.pendingCompletion,
          completionError: cleanupError instanceof Error ? cleanupError.message : 'Workout cleanup pending',
          isSaving: false,
          elapsedSeconds: current.activeSession?.localId === session.localId ? 0 : current.elapsedSeconds,
          terminalState: 'DISCARDED',
          terminalSessionId: session.localId,
        }));
      }
      set((current) => ({
        activeSession: current.activeSession?.localId === session.localId ? null : current.activeSession,
        pendingCompletion: current.pendingCompletion?.session.id === session.localId
          ? null
          : current.pendingCompletion,
        completionError: null,
        isSaving: false,
        elapsedSeconds: current.activeSession?.localId === session.localId ? 0 : current.elapsedSeconds,
        terminalState: 'DISCARDED',
        terminalSessionId: session.localId,
      }));
      if (localReconciled) {
        void flushPendingWorkoutDiscard(supabase, discard, undefined, true);
      }
    } catch (error) {
      set((current) => current.terminalSessionId === session.localId
        ? {
            terminalState: 'ACTIVE',
            terminalSessionId: session.localId,
            isSaving: false,
            completionError: error instanceof Error ? error.message : 'Workout discard failed',
          }
        : current);
      throw error;
    }

    if (session?.userId) {
      const completedDayIds = new Set<string>();
      (useLogStore.getState().logsHistory || []).forEach((l) => {
        if (l.plan_day_id) completedDayIds.add(l.plan_day_id);
      });

      const nextPlan = buildTodaysPlan({
        activeSession: null,
        plans: useWorkoutStore.getState().workoutPlans,
        completedPlanDayIds: completedDayIds,
      });
      patchHomeSnapshot(session.userId, { todayPlan: nextPlan });
      invalidateScreenData(`home:${session.userId}`);
      invalidateScreenData(`workouts:${session.userId}`);
      invalidateScreenData(`progress:${session.userId}`);
    }
  },

  clearStaleActiveSession: async (sessionId, completedSessionId, completedAt) => {
    const current = get().activeSession;
    if (!current || current.localId !== sessionId) return;
    if (!completedSessionId) {
      throw new Error('Cannot reconcile a stale session without proven completed-session identity');
    }
    const discard: PendingWorkoutDiscard = {
      sessionId,
      athleteId: current.userId,
      preservePendingCompletion: completedSessionId === sessionId,
    };
    await enqueuePendingWorkoutDiscard(discard);
    try {
      if (isNativeDbAvailable && database) {
        await workoutRepository.reconcileStaleActiveSession(sessionId, completedSessionId, completedAt);
      }
    } catch (reconcileError) {
      await clearPendingDiscardIfMatches(sessionId);
      throw reconcileError;
    }
    set((state) => state.activeSession?.localId === sessionId
      ? {
          activeSession: null,
          elapsedSeconds: 0,
          isSaving: false,
          completionError: null,
          terminalState: 'COMPLETED',
          terminalSessionId: sessionId,
        }
      : state);
    let localReconciled = true;
    const storedRaw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    if (storedRaw) {
      try {
        if (JSON.parse(storedRaw)?.localId === sessionId) {
          await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
        }
      } catch {
        localReconciled = false;
      }
    }
    if (localReconciled) {
      void flushPendingWorkoutDiscard(supabase, discard, undefined, true);
    }
  },

  tick: () => {
    set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 }));
  },
}));

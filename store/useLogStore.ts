import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { generateUUID } from '../utils/uuid';

import { useAuthStore } from './useAuthStore';

export interface LoggedSet {
  weight: string;
  reps: string;
  completed: boolean;
}

export interface LoggedExercise {
  plan_exercise_id?: string;
  exercise_id: string;
  name: string;
  muscle_group: string;
  instructions?: string;
  gif_url?: string;
  sets: LoggedSet[];
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  workout_plan_id: string;
  started_at: string;
  completed_at: string;
  total_volume: number;
  logged_exercises: LoggedExercise[];
  workout_plans?: {
    name: string;
  };
}

interface LogState {
  activeSession: {
    id: string;
    planId: string;
    planName: string;
    startedAt: string;
    exercises: LoggedExercise[];
  } | null;
  logsHistory: WorkoutLog[];
  prs: any[];
  loading: boolean;
  
  startSession: (planId: string, planName: string, initialExercises: any[]) => Promise<void>;
  updateSet: (exerciseIndex: number, setIndex: number, fields: Partial<LoggedSet>) => void;
  addSet: (exerciseIndex: number) => void;
  removeSet: (exerciseIndex: number, setIndex: number) => void;
  cancelSession: () => Promise<void>;
  finishSession: (userId: string) => Promise<boolean>;
  addExercise: (exercise: any) => void;
  fetchLogsHistory: (userId: string) => Promise<void>;
  fetchPRs: (userId: string) => Promise<void>;
  createPR: (athleteId: string, exerciseId: string, type: 'max_weight' | 'max_reps' | 'best_time', value: number) => Promise<void>;
}

export const useLogStore = create<LogState>((set, get) => ({
  activeSession: null,
  logsHistory: [],
  prs: [],
  loading: false,

  startSession: async (planId, planName, initialExercises) => {
    const userId = useAuthStore.getState().session?.user?.id;
    if (!userId) return;

    const exercises: LoggedExercise[] = initialExercises.map((planEx) => {
      const ex = planEx.exercise;
      const setsCount = planEx.sets || 3;
      
      const sets: LoggedSet[] = Array.from({ length: setsCount }, () => ({
        weight: planEx.weight ? planEx.weight.toString() : '',
        reps: planEx.reps?.toString() || '10',
        completed: false,
      }));

      return {
        plan_exercise_id: planEx.id,
        exercise_id: planEx.exercise_id,
        name: ex?.name || 'Unknown Exercise',
        muscle_group: ex?.muscle_group || 'Full Body',
        instructions: ex?.instructions || '',
        gif_url: ex?.gif_url || '',
        sets,
      };
    });

    try {
      // Create a local active session ID
      const sessionId = generateUUID();
      
      set({
        activeSession: {
          id: sessionId,
          planId,
          planName,
          startedAt: new Date().toISOString(),
          exercises,
        },
      });
    } catch (e) {
      console.error('Failed to start workout session locally:', e);
    }
  },

  updateSet: (exerciseIndex, setIndex, fields) => {
    set((state) => {
      if (!state.activeSession) return state;
      const updatedExercises = [...state.activeSession.exercises];
      const updatedSets = [...updatedExercises[exerciseIndex].sets];
      updatedSets[setIndex] = { ...updatedSets[setIndex], ...fields };
      updatedExercises[exerciseIndex] = {
        ...updatedExercises[exerciseIndex],
        sets: updatedSets,
      };
      return {
        activeSession: {
          ...state.activeSession,
          exercises: updatedExercises,
        },
      };
    });
  },

  addSet: (exerciseIndex) => {
    set((state) => {
      if (!state.activeSession) return state;
      const updatedExercises = [...state.activeSession.exercises];
      const textSets = updatedExercises[exerciseIndex].sets;
      const lastSet = textSets[textSets.length - 1];
      
      const newSet: LoggedSet = {
        weight: lastSet?.weight || '',
        reps: lastSet?.reps || '10',
        completed: false,
      };

      updatedExercises[exerciseIndex] = {
        ...updatedExercises[exerciseIndex],
        sets: [...textSets, newSet],
      };

      return {
        activeSession: {
          ...state.activeSession,
          exercises: updatedExercises,
        },
      };
    });
  },

  removeSet: (exerciseIndex, setIndex) => {
    set((state) => {
      if (!state.activeSession) return state;
      const updatedExercises = [...state.activeSession.exercises];
      const sets = updatedExercises[exerciseIndex].sets;
      if (sets.length <= 1) return state; // Keep at least 1 set

      updatedExercises[exerciseIndex] = {
        ...updatedExercises[exerciseIndex],
        sets: sets.filter((_, idx) => idx !== setIndex),
      };

      return {
        activeSession: {
          ...state.activeSession,
          exercises: updatedExercises,
        },
      };
    });
  },

  cancelSession: async () => {
    set({ activeSession: null });
  },

  addExercise: (exercise) => {
    set((state) => {
      if (!state.activeSession) return state;
      
      let initialWeight = '';
      let initialReps = '10';

      // Find previous performance
      if (state.logsHistory && state.logsHistory.length > 0) {
        for (const log of state.logsHistory) {
          const matchEx = log.logged_exercises?.find(
            (ex: any) => ex.exercise_id === exercise.id
          );
          if (matchEx && matchEx.sets && matchEx.sets.length > 0) {
            const lastSet = matchEx.sets[matchEx.sets.length - 1];
            if (lastSet.weight && lastSet.reps) {
              initialWeight = lastSet.weight === '0' ? '' : lastSet.weight;
              initialReps = lastSet.reps === '0' ? '10' : lastSet.reps;
              break;
            }
          }
        }
      }
      
      const newLoggedEx = {
        plan_exercise_id: undefined,
        exercise_id: exercise.id,
        name: exercise.name || 'Unknown Exercise',
        muscle_group: exercise.muscle_group || 'Full Body',
        instructions: exercise.instructions || '',
        gif_url: exercise.gif_url || '',
        sets: [
          { weight: initialWeight, reps: initialReps, completed: false }
        ]
      };
      
      return {
        activeSession: {
          ...state.activeSession,
          exercises: [...state.activeSession.exercises, newLoggedEx]
        }
      };
    });
  },

  finishSession: async (userId) => {
    const session = get().activeSession;
    if (!session) return false;

    set({ loading: true });

    // Calculate total volume (weight * reps for completed sets)
    let totalVolume = 0;
    session.exercises.forEach((ex) => {
      ex.sets.forEach((set) => {
        if (set.completed) {
          const w = parseFloat(set.weight) || 0;
          const r = parseInt(set.reps) || 0;
          totalVolume += w * r;
        }
      });
    });

    const completedAt = new Date().toISOString();
    
    // We will enqueue the session and its sets into the offline sync store
    // To avoid circular dependencies if imported at the top, we import here
    const { useOfflineSyncStore } = require('./useOfflineSyncStore');
    
    const dbSessionId = generateUUID();
    
    // Extract plan_day_id from planId which is currently `assigned_plan_id-plan_day_id`
    const planDayId = session.planId !== 'quick-workout' && session.planId.length > 36 
      ? session.planId.slice(-36) 
      : null;

    useOfflineSyncStore.getState().enqueueMutation({
      type: 'INSERT_WORKOUT_SESSION',
      payload: {
        id: dbSessionId,
        athlete_id: userId,
        plan_day_id: planDayId,
        started_at: session.startedAt,
        completed_at: completedAt,
        duration_seconds: Math.round((new Date(completedAt).getTime() - new Date(session.startedAt).getTime()) / 1000)
      }
    });

    // Enqueue each completed set
    session.exercises.forEach(ex => {
      ex.sets.forEach(set => {
        if (set.completed) {
          useOfflineSyncStore.getState().enqueueMutation({
            type: 'INSERT_SESSION_SET',
            payload: {
              session_id: dbSessionId,
              plan_exercise_id: ex.plan_exercise_id || null,
              exercise_id: ex.exercise_id,
              weight: parseFloat(set.weight) || 0,
              reps: parseInt(set.reps) || 0,
              completed_at: completedAt
            }
          });
        }
      });
    });

    set({ loading: false, activeSession: null });

    // Force flush to sync immediately (in case the online listener didn't fire)
    try {
      await useOfflineSyncStore.getState().flushQueue();
    } catch (e) {
      console.warn('Failed to flush sync queue after workout:', e);
    }

    // Refresh history
    await get().fetchLogsHistory(userId);
    return true;
  },

  fetchLogsHistory: async (userId) => {
    set({ loading: true });
    // Join workout_sessions and session_sets with exercises and plan_exercises to build the history shape
    const { data, error } = await supabase
      .from('workout_sessions')
      .select('*, plan_day:plan_days(name), session_sets(*, exercise:exercises(*), plan_exercise:plan_exercises(*, exercise:exercises(*)))')
      .eq('athlete_id', userId)
      .order('completed_at', { ascending: false });

    if (!error && data) {
      // Map to the legacy WorkoutLog shape so the UI charts still work perfectly
      const mappedLogs = data.map(session => {
        const total_volume = session.session_sets?.reduce((acc: number, s: any) => acc + ((s.weight || 0) * (s.reps || 0)), 0) || 0;
        
        // Group session_sets by exercise
        const exercisesMap: { [key: string]: LoggedExercise } = {};
        
        (session.session_sets || []).forEach((setObj: any) => {
          const directEx = setObj.exercise;
          const planEx = setObj.plan_exercise;
          const ex = directEx || planEx?.exercise;
          
          const exerciseId = ex?.id || setObj.exercise_id || 'unknown';
          const exerciseName = ex?.name || 'Unknown Exercise';
          const muscleGroup = ex?.muscle_group || 'Full Body';
          
          if (!exercisesMap[exerciseName]) {
            exercisesMap[exerciseName] = {
              plan_exercise_id: setObj.plan_exercise_id || undefined,
              exercise_id: exerciseId,
              name: exerciseName,
              muscle_group: muscleGroup,
              instructions: ex?.instructions || '',
              gif_url: ex?.gif_url || '',
              sets: []
            };
          }
          
          exercisesMap[exerciseName].sets.push({
            weight: setObj.weight ? setObj.weight.toString() : '0',
            reps: setObj.reps ? setObj.reps.toString() : '0',
            completed: true
          });
        });
        
        return {
          id: session.id,
          user_id: session.athlete_id,
          workout_plan_id: session.plan_day_id,
          started_at: session.started_at,
          completed_at: session.completed_at,
          total_volume,
          logged_exercises: Object.values(exercisesMap),
          workout_plans: { name: session.plan_day?.name || 'Workout' }
        };
      });
      
      set({ logsHistory: mappedLogs as any, loading: false });
    } else {
      set({ loading: false });
      console.error('Error fetching logs history:', error);
    }
  },

  fetchPRs: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('personal_records')
        .select('*, exercises(name, muscle_group)')
        .eq('athlete_id', userId)
        .order('achieved_at', { ascending: false });

      if (!error && data) {
        set({ prs: data });
      }
    } catch (e) {
      console.warn("fetchPRs failed:", e);
    }
  },

  createPR: async (athleteId, exerciseId, type, value) => {
    const { useOfflineSyncStore } = require('./useOfflineSyncStore');
    const newPr = {
      athlete_id: athleteId,
      exercise_id: exerciseId,
      record_type: type,
      value,
      achieved_at: new Date().toISOString()
    };
    
    useOfflineSyncStore.getState().enqueueMutation({
      type: 'INSERT_PR',
      payload: newPr
    });

    try {
      const { data: exerciseData } = await supabase
        .from('exercises')
        .select('name, muscle_group')
        .eq('id', exerciseId)
        .single();
      
      set((state) => ({
        prs: [
          {
            ...newPr,
            id: Math.random().toString(),
            exercises: exerciseData || { name: 'Exercise', muscle_group: 'Strength' }
          },
          ...state.prs
        ]
      }));
    } catch (e) {
      // Fallback
      set((state) => ({
        prs: [
          {
            ...newPr,
            id: Math.random().toString(),
            exercises: { name: 'Exercise', muscle_group: 'Strength' }
          },
          ...state.prs
        ]
      }));
    }
  },
}));

export interface ExercisePR {
  name: string;
  muscle_group: string;
  maxWeight: number;
  maxReps: number;
  estimated1RM: number;
  date: string;
}

export interface VolumeTrendItem {
  date: string;
  volume: number;
  planName: string;
}

export interface MuscleDistributionItem {
  muscle: string;
  percentage: number;
  count: number;
}

export interface ConsistencyStats {
  totalWorkouts: number;
  totalVolume: number;
  streakDays: number;
}

// Selector: Calculate consistency stats
export const getConsistencyStats = (history: WorkoutLog[]): ConsistencyStats => {
  const totalWorkouts = history.length;
  const totalVolume = history.reduce((sum, log) => sum + (log.total_volume || 0), 0);
  
  if (history.length === 0) {
    return { totalWorkouts, totalVolume, streakDays: 0 };
  }

  // Calculate daily streak
  const dates = Array.from(new Set(
    history.map(log => new Date(log.completed_at).toISOString().split('T')[0])
  )).sort((a, b) => b.localeCompare(a)); // Sort descending (most recent first)

  let streakDays = 0;
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // If the most recent workout is not today or yesterday, streak is broken/0
  if (dates[0] !== todayStr && dates[0] !== yesterdayStr) {
    return { totalWorkouts, totalVolume, streakDays: 0 };
  }

  let expectedStr = dates[0];
  for (let i = 0; i < dates.length; i++) {
    if (dates[i] === expectedStr) {
      streakDays++;
      // Set expected to previous day
      const current = new Date(expectedStr);
      current.setDate(current.getDate() - 1);
      expectedStr = current.toISOString().split('T')[0];
    } else {
      break;
    }
  }

  return { totalWorkouts, totalVolume, streakDays };
};

// Selector: Volume trend for last 6 workouts
export const getVolumeTrend = (history: WorkoutLog[]): VolumeTrendItem[] => {
  const last6 = history.slice(0, 6).reverse(); // Reverse to show chronological order
  return last6.map(log => {
    const d = new Date(log.completed_at);
    const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return {
      date: dateStr,
      volume: log.total_volume || 0,
      planName: log.workout_plans?.name || 'Workout'
    };
  });
};

// Selector: Muscle group set distribution
export const getMuscleDistribution = (history: WorkoutLog[]): MuscleDistributionItem[] => {
  const muscleSets: { [key: string]: number } = {};
  let totalSets = 0;

  history.forEach(log => {
    if (log.logged_exercises) {
      log.logged_exercises.forEach(ex => {
        const completedSets = ex.sets?.filter(s => s.completed).length || 0;
        if (completedSets > 0) {
          const muscle = ex.muscle_group || 'Full Body';
          muscleSets[muscle] = (muscleSets[muscle] || 0) + completedSets;
          totalSets += completedSets;
        }
      });
    }
  });

  if (totalSets === 0) return [];

  return Object.entries(muscleSets)
    .map(([muscle, count]) => ({
      muscle,
      count,
      percentage: Math.round((count / totalSets) * 100)
    }))
    .sort((a, b) => b.percentage - a.percentage);
};

// Selector: Personal Records (PRs) per exercise
export const getPersonalRecords = (history: WorkoutLog[]): ExercisePR[] => {
  const prs: { [key: string]: ExercisePR } = {};

  history.forEach(log => {
    const logDate = new Date(log.completed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    if (log.logged_exercises) {
      log.logged_exercises.forEach(ex => {
        ex.sets?.forEach(set => {
          if (set.completed) {
            const weight = parseFloat(set.weight) || 0;
            const reps = parseInt(set.reps) || 0;
            if (weight > 0 && reps > 0) {
              const estimated1RM = Math.round(weight * (1 + reps / 30) * 10) / 10;
              const existing = prs[ex.name];
              if (!existing || weight > existing.maxWeight) {
                prs[ex.name] = {
                  name: ex.name,
                  muscle_group: ex.muscle_group,
                  maxWeight: weight,
                  maxReps: reps,
                  estimated1RM: Math.max(existing?.estimated1RM || 0, estimated1RM),
                  date: logDate
                };
              } else {
                if (estimated1RM > existing.estimated1RM) {
                  prs[ex.name].estimated1RM = estimated1RM;
                }
              }
            }
          }
        });
      });
    }
  });

  return Object.values(prs).sort((a, b) => a.name.localeCompare(b.name));
};

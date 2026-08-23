import { create } from 'zustand';
import { database } from '../database';
import { supabase } from '../lib/supabase';
import { Q } from '@nozbe/watermelondb';
import { WorkoutRepository } from '@yeti/database/src/repositories/WorkoutRepository';
import type { SessionSet } from '@yeti/database/src/models/SessionSet';
import { getHomeSnapshot, patchHomeSnapshot } from '../services/homeSummary';
import { invalidateScreenData } from '../services/screenDataCache';

const workoutRepository = new WorkoutRepository(database, supabase);

export interface LoggedSet {
  reps: number;
  weight: string;
  completed: boolean;
  tempo?: string;
  rpe?: number;
}

export interface LoggedExercise {
  id: string;
  exercise_id: string;
  exercise_name: string;
  sets: LoggedSet[];
}

export interface WorkoutLog {
  id: string;
  name: string;
  completed_at: string;
  total_volume: number;
  exercises: LoggedExercise[];
}

export interface ActiveSession {
  planId: string;
  startedAt: string;
  exercises: Array<{
    id: string;
    exercise_id: string;
    exercise_name: string;
    plan_exercise_id?: string;
    sets: Array<{
      setNumber: number;
      weight: string;
      reps: string;
      completed: boolean;
      rpe?: number;
      tempo?: string;
      restSeconds?: number;
    }>;
  }>;
}

interface LogState {
  logsHistory: WorkoutLog[];
  prs: any[];
  activeSession: ActiveSession | null;
  loading: boolean;
  
  startSession: (planId: string, planName: string, exercises: any[]) => void;
  updateSetLog: (exerciseIdx: number, setIdx: number, fields: Partial<LoggedSet>) => void;
  finishSession: (userId: string) => Promise<boolean>;
  fetchLogsHistory: (userId: string) => Promise<void>;
  fetchPRs: (userId: string) => Promise<void>;
  createPR: (athleteId: string, exerciseId: string, type: string, value: number) => Promise<void>;
  prependWorkoutLog: (log: WorkoutLog) => void;
}

export const useLogStore = create<LogState>((set, get) => ({
  logsHistory: [],
  prs: [],
  activeSession: null,
  loading: false,

  prependWorkoutLog: (log) => set((state) => ({
    logsHistory: state.logsHistory.some((item) => item.id === log.id) ? state.logsHistory : [log, ...state.logsHistory],
  })),

  startSession: (planId, planName, exercises) => {
    const exercisesMapped = (exercises || []).map((pe: any) => {
      const setsArr = Array.from({ length: pe.sets || 3 }, (_, i) => ({
        setNumber: i + 1,
        weight: pe.weight ? pe.weight.toString() : '',
        reps: pe.reps ? pe.reps.toString() : '10',
        completed: false,
      }));
      return {
        id: Math.random().toString(),
        exercise_id: pe.exercise_id,
        exercise_name: pe.exercise?.name || 'Exercise',
        plan_exercise_id: pe.id,
        sets: setsArr,
      };
    });

    set({
      activeSession: {
        planId,
        startedAt: new Date().toISOString(),
        exercises: exercisesMapped,
      },
    });
  },

  updateSetLog: (exerciseIdx, setIdx, fields) => {
    set((state) => {
      if (!state.activeSession) return state;
      const exercises = [...state.activeSession.exercises];
      const sets = [...exercises[exerciseIdx].sets];
      sets[setIdx] = { ...sets[setIdx], ...fields } as any;
      exercises[exerciseIdx] = { ...exercises[exerciseIdx], sets };
      return {
        activeSession: {
          ...state.activeSession,
          exercises,
        },
      };
    });
  },

  finishSession: async (userId) => {
    const session = get().activeSession;
    if (!session) return false;

    set({ loading: true });

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

    const finishedAt = Date.now();
    const durationSeconds = Math.round((finishedAt - new Date(session.startedAt).getTime()) / 1000);

    try {
      const dbSession = await workoutRepository.createWorkoutSession(
        userId,
        planIdToName(session.planId),
        session.planId.includes('-') ? session.planId.split('-')[1] : undefined,
        session.planId.includes('-') ? session.planId.split('-')[0] : undefined
      );

      for (const ex of session.exercises) {
        for (const set of ex.sets) {
          if (set.completed) {
            await workoutRepository.saveExerciseSet(
              dbSession.id,
              userId,
              ex.exercise_id,
              ex.exercise_name,
              set.setNumber,
              parseFloat(set.weight) || 0,
              parseInt(set.reps) || 0,
              set.rpe,
              set.tempo,
              set.restSeconds,
              false,
              false
            );
          }
        }
      }

      await workoutRepository.completeWorkoutSession(
        dbSession.id,
        durationSeconds,
        totalVolume,
        ''
      );

      set({ loading: false, activeSession: null });
      const currentHome = getHomeSnapshot(userId);
      const prevCount = currentHome?.weeklyWorkoutCount ?? 0;
      patchHomeSnapshot(userId, { weeklyWorkoutCount: prevCount + 1 });
      invalidateScreenData(`home:${userId}`);
      await get().fetchLogsHistory(userId);
      return true;
    } catch (e) {
      console.error('Failed to complete session locally:', e);
      set({ loading: false });
      return false;
    }
  },

  fetchLogsHistory: async (userId) => {
    set({ loading: true });
    try {
      const sessions = await workoutRepository.getWorkoutHistory(userId);
      
      const mappedLogs: WorkoutLog[] = await Promise.all(
        sessions.map(async (session) => {
          const sets = await database.get<SessionSet>('session_sets')
            .query(Q.where('session_id', session.id))
            .fetch();

          const total_volume = sets.reduce((acc, s) => acc + (s.weight_kg * s.reps), 0);
          
          const exercisesMap: { [key: string]: LoggedExercise } = {};
          
          sets.forEach((setObj) => {
            const exName = setObj.exercise_name || 'Exercise';
            if (!exercisesMap[setObj.exercise_id]) {
              exercisesMap[setObj.exercise_id] = {
                id: setObj.id,
                exercise_id: setObj.exercise_id,
                exercise_name: exName,
                sets: [],
              };
            }
            exercisesMap[setObj.exercise_id].sets.push({
              reps: setObj.reps,
              weight: setObj.weight_kg.toString(),
              completed: true,
              tempo: setObj.tempo || undefined,
              rpe: setObj.rpe || undefined,
            });
          });

          return {
            id: session.id,
            name: session.name,
            completed_at: new Date(session.finished_at || session.started_at).toISOString(),
            total_volume,
            exercises: Object.values(exercisesMap),
          };
        })
      );

      set({ logsHistory: mappedLogs, loading: false });
    } catch (e) {
      console.warn("fetchLogsHistory failed:", e);
      set({ loading: false });
    }
  },

  fetchPRs: async (userId) => {
    try {
      const data = await workoutRepository.getPersonalRecords(userId);
      // Map PRs to legacy shape
      const mapped = await Promise.all(
        data.map(async (pr) => {
          let exerciseData = { name: 'Exercise', muscle_group: 'Strength' };
          try {
            const ex = await database.get('exercises').find(pr.exercise_id);
            if (ex) {
              exerciseData = { name: (ex as any).name, muscle_group: (ex as any).muscle_group || 'Strength' };
            }
          } catch {}
          return {
            id: pr.id,
            athlete_id: pr.athlete_id,
            exercise_id: pr.exercise_id,
            record_type: pr.record_type,
            value: pr.value,
            achieved_at: new Date(pr.achieved_at).toISOString(),
            exercises: exerciseData,
          };
        })
      );
      set({ prs: mapped });
    } catch (e) {
      console.warn("fetchPRs failed:", e);
    }
  },

  createPR: async (athleteId, exerciseId, type, value) => {
    try {
      await workoutRepository.savePersonalRecord(athleteId, exerciseId, type, value);
      await get().fetchPRs(athleteId);
    } catch (e) {
      console.error("createPR failed:", e);
    }
  }
}));

function planIdToName(planId: string): string {
  // Fallback helper to parse plan name from session ID
  return 'Workout Session';
}

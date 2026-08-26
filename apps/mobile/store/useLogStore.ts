import { create } from 'zustand';
import { database } from '../database';
import { supabase } from '../lib/supabase';
import { Q } from '@nozbe/watermelondb';
import { WorkoutRepository, dedupePersonalRecords } from '@yeti/database/src/repositories/WorkoutRepository';
import { canonicalExerciseName } from '@yeti/database/src/repositories/ExerciseRepository';
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
  duration_seconds?: number;
  plan_day_id?: string;
  assignment_id?: string;
  workout_plan_id?: string;
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
  historyError: string | null;
  prsError: string | null;
  
  startSession: (planId: string, planName: string, exercises: any[]) => void;
  updateSetLog: (exerciseIdx: number, setIdx: number, fields: Partial<LoggedSet>) => void;
  finishSession: (userId: string) => Promise<boolean>;
  fetchLogsHistory: (userId: string, startDate?: string, endDate?: string, limit?: number) => Promise<void>;
  fetchPRs: (userId: string) => Promise<void>;
  createPR: (athleteId: string, exerciseId: string, type: string, value: number) => Promise<void>;
  prependWorkoutLog: (log: WorkoutLog) => void;
  removeWorkoutLog: (id: string) => void;
}

export const useLogStore = create<LogState>((set, get) => ({
  logsHistory: [],
  prs: [],
  activeSession: null,
  loading: false,
  historyError: null,
  prsError: null,

  prependWorkoutLog: (log) => set((state) => ({
    logsHistory: state.logsHistory.some((item) => item.id === log.id)
      ? state.logsHistory.map((item) => item.id === log.id ? { ...item, ...log } : item)
      : [log, ...state.logsHistory],
  })),
  removeWorkoutLog: (id) => set((state) => ({
    logsHistory: state.logsHistory.filter((item) => item.id !== id),
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

  fetchLogsHistory: async (userId, startDate, endDate, limit = 50) => {
    set({ loading: true, historyError: null });
    try {
      const sessions = startDate && endDate
        ? await workoutRepository.getWorkoutHistoryForRange(userId, startDate, endDate)
        : await workoutRepository.getWorkoutHistory(userId, limit);
      
      const mappedLogs: WorkoutLog[] = await Promise.all(
        sessions.map(async (session: any) => {
          let sets: any[] = [];
          if (Array.isArray(session.sets)) {
            // Already attached (e.g. from Web PostgREST fallback)
            sets = session.sets;
          } else if (database) {
            // Native WatermelonDB fetch
            try {
              sets = await database.get<SessionSet>('session_sets')
                .query(Q.where('session_id', session.id))
                .fetch();
            } catch (dbErr) {
              console.warn('[LogStore] Failed to fetch session_sets locally:', dbErr);
              sets = [];
            }
          }

          const total_volume = session.total_volume_kg ?? sets.reduce((acc: number, s: any) => {
            const w = Number(s.weight_kg ?? s.weight ?? 0);
            const r = Number(s.reps ?? 0);
            return acc + (w * r);
          }, 0);
          
          const exercisesMap: { [key: string]: LoggedExercise } = {};
          
          sets.forEach((setObj: any) => {
            const exId = setObj.exercise_id || 'unknown';
            const exName = canonicalExerciseName(setObj.exercise_name || 'Exercise', setObj.exercise_id);
            if (!exercisesMap[exId]) {
              exercisesMap[exId] = {
                id: setObj.id,
                exercise_id: exId,
                exercise_name: exName,
                sets: [],
              };
            }
            exercisesMap[exId].sets.push({
              reps: Number(setObj.reps || 0),
              weight: String(setObj.weight_kg ?? setObj.weight ?? ''),
              completed: true,
              tempo: setObj.tempo || undefined,
              rpe: setObj.rpe || undefined,
            });
          });

          return {
            id: session.id,
            plan_day_id: session.plan_day_id,
            assignment_id: session.assignment_id,
            duration_seconds: session.duration_seconds,
            name: session.name || 'Workout Session',
            completed_at: new Date(session.finished_at || session.completed_at || session.started_at).toISOString(),
            total_volume,
            exercises: Object.values(exercisesMap),
          };
        })
      );

      // Merge into logsHistory deduplicating by id
      set((state) => {
        const existingIds = new Set(mappedLogs.map((l) => l.id));
        const keptPrevious = state.logsHistory.filter((l) => !existingIds.has(l.id));
        const merged = [...mappedLogs, ...keptPrevious].sort(
          (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
        );
        return { logsHistory: merged, loading: false, historyError: null };
      });
    } catch (e: any) {
      console.warn("fetchLogsHistory failed:", e);
      set({ loading: false, historyError: e?.message || 'Failed to load workout history' });
    }
  },

  fetchPRs: async (userId) => {
    set({ prsError: null });
    try {
      const data = dedupePersonalRecords(await workoutRepository.getPersonalRecords(userId));
      // Map PRs to legacy shape
      const mapped = await Promise.all(
        data.map(async (pr) => {
          let exerciseData = (pr as any).exercises || { name: 'Exercise', muscle_group: 'Strength' };
          try {
            if (!database) throw new Error('No native database');
            const ex = await database.get('exercises').find(pr.exercise_id);
            if (ex) {
              exerciseData = { name: canonicalExerciseName((ex as any).name, pr.exercise_id), muscle_group: (ex as any).muscle_group || 'Strength' };
            }
          } catch {}
          return {
            id: pr.id,
            athlete_id: pr.athlete_id,
            exercise_id: pr.exercise_id,
            record_type: pr.record_type,
            value: pr.value,
            achieved_at: new Date(pr.achieved_at).toISOString(),
            exercises: { ...exerciseData, name: canonicalExerciseName(exerciseData.name, pr.exercise_id) },
          };
        })
      );
      set({ prs: mapped, prsError: null });
    } catch (e: any) {
      console.warn("fetchPRs failed:", e);
      set({ prsError: e?.message || 'Failed to load personal records' });
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

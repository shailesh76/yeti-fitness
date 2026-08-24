import { create } from 'zustand';
import { database } from '../database';
import { supabase } from '../lib/supabase';
import { WorkoutRepository } from '@yeti/database/src/repositories/WorkoutRepository';
import { ExerciseRepository, canonicalExerciseName } from '@yeti/database/src/repositories/ExerciseRepository';
import type { Exercise } from '@yeti/database/src/models/Exercise';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendLocalNotification } from '../services/notificationService';

export type { Exercise };

export interface WorkoutPlan {
  id: string;
  name: string;
  created_at: string;
  updated_at?: string;
  workout_plan_exercises?: WorkoutPlanExercise[];
  /** Set on ownTemplates entries, which don't carry full nested exercise objects. */
  exerciseCount?: number;
  assignment_id?: string;
  plan_day_id?: string;
  day_number?: number;
  start_date?: string;
  coach?: { full_name: string };
}

export interface WorkoutPlanExercise {
  id: string;
  workout_plan_id: string;
  exercise_id: string;
  sets: number;
  reps: number;
  rest_seconds: number;
  order_index: number;
  target_sets?: number;
  target_reps?: string;
  target_weight_kg?: number;
  notes?: string;
  superset_group?: string;
  exercise?: any;
}

const notifiedPlanIdsInMemory = new Set<string>();

const workoutRepository = new WorkoutRepository(database, supabase);
const exerciseRepository = new ExerciseRepository(database, supabase);

interface WorkoutState {
  exercises: Exercise[];
  workoutPlans: WorkoutPlan[];
  loading: boolean;
  lastSyncedAt: string | null;
  /** Authoritative active assignment metadata resolved from highest assigned_at */
  activeAssignmentId: string | null;
  activePlanId: string | null;
  assignedAt: string | null;
  fetchExercises: () => Promise<void>;
  fetchWorkoutPlans: (userId: string) => Promise<void>;
  syncWorkoutPlans: (userId: string) => Promise<void>;
  // Athlete-authored templates (Step 4.5) — a separate list from coach-assigned
  // workoutPlans above. Both lists are backed by WatermelonDB on native.
  ownTemplates: WorkoutPlan[];
  ownTemplatesLoading: boolean;
  fetchOwnTemplates: (userId: string) => Promise<void>;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  exercises: [],
  workoutPlans: [],
  loading: false,
  lastSyncedAt: null,
  activeAssignmentId: null,
  activePlanId: null,
  assignedAt: null,
  
  fetchExercises: async () => {
    set({ loading: true });
    try {
      const data = await exerciseRepository.getExercises();
      set({ exercises: data as any[], loading: false });
    } catch (error) {
      set({ loading: false });
      console.error(error);
    }
  },

  fetchWorkoutPlans: async (userId: string) => {
    await get().syncWorkoutPlans(userId);
  },

  syncWorkoutPlans: async (userId: string) => {
    set({ loading: true });
    
    // Read the local WatermelonDB graph on native, or direct PostgREST on web.
    try {
      const remoteAssigned = await workoutRepository.fetchWorkoutPlansRemote(userId);

      if (remoteAssigned && remoteAssigned.length > 0) {
        // Authoritative active assignment resolver:
        // Contract: active assignment = highest assigned_at for authenticated athlete.
        // Deterministic secondary tie-breaker if timestamps are equal.
        const sortedAssignments = [...remoteAssigned].sort((a: any, b: any) => {
          const timeA = new Date(a.assigned_at || a.created_at || 0).getTime();
          const timeB = new Date(b.assigned_at || b.created_at || 0).getTime();
          if (timeB !== timeA) return timeB - timeA;
          return String(b.id || '').localeCompare(String(a.id || ''));
        });

        const activeAssignment = sortedAssignments[0] || null;
        const activeAssignmentId = activeAssignment?.id || null;
        const activePlanId = activeAssignment?.plan?.id || null;
        const assignedAt = activeAssignment?.assigned_at || null;

        const mappedPlans: any[] = [];
        const assignmentIds: string[] = [];

        // Only the deterministic newest assignment is active. Older repeated
        // assignments remain on the server as history and cannot resurrect days.
        [activeAssignment].filter(Boolean).forEach((assigned: any) => {
          const plan = assigned.plan;
          if (!plan) return;
          const coachName = plan.coach?.full_name || 'Coach';
          assignmentIds.push(assigned.id);
          
          if (plan.days && plan.days.length > 0) {
            const sortedDays = [...plan.days].sort((a, b) => (a.day_number || 0) - (b.day_number || 0));
            sortedDays.forEach((day: any) => {
              const sortedExercises = [...(day.exercises || [])].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
              
              mappedPlans.push({
                id: `${assigned.id}-${day.id}`,
                assignment_id: assigned.id,
                plan_day_id: day.id,
                day_number: day.day_number,
                start_date: assigned.start_date,
                name: `${plan.name} - ${day.name || 'Day ' + day.day_number}`,
                created_at: assigned.assigned_at,
                coach: { full_name: coachName },
                workout_plan_exercises: sortedExercises.map((ex: any) => ({
                  id: ex.id,
                  workout_plan_id: plan.id,
                  exercise_id: ex.exercise?.id || ex.exercise_id,
                  sets: parseInt(ex.sets) || 3,
                  reps: parseInt(ex.reps) || 10,
                  weight: ex.weight || '',
                  rest_seconds: ex.rest_seconds || 60,
                  order_index: ex.order_index,
                  superset_group: ex.superset_group ?? undefined,
                  exercise: ex.exercise ? {
                    ...ex.exercise,
                    name: canonicalExerciseName(ex.exercise.name, ex.exercise.id),
                  } : ex.exercise
                }))
              });
            });
          }
        });

        if (notifiedPlanIdsInMemory.size === 0) {
          const stored = await AsyncStorage.getItem('@dude_notified_assignment_ids');
          if (stored) {
            try {
              JSON.parse(stored).forEach((id: string) => notifiedPlanIdsInMemory.add(id));
            } catch (e) {}
          }
        }

        const notifiedStr = await AsyncStorage.getItem('@dude_notified_assignment_ids');
        let hasNewAssignment = false;
        
        assignmentIds.forEach((assignId) => {
          if (!notifiedPlanIdsInMemory.has(assignId)) {
            hasNewAssignment = true;
            notifiedPlanIdsInMemory.add(assignId);
          }
        });
        
        if (hasNewAssignment && notifiedStr !== null) {
          await sendLocalNotification(
            "New workout plan available! 🏋️", 
            "Your coach assigned a new workout plan. Check it out!"
          );
        }
        
        await AsyncStorage.setItem('@dude_notified_assignment_ids', JSON.stringify(Array.from(notifiedPlanIdsInMemory)));

        const nowStr = new Date().toISOString();
        set({ 
          workoutPlans: mappedPlans as any,
          activeAssignmentId,
          activePlanId,
          assignedAt,
          lastSyncedAt: nowStr,
          loading: false 
        });

      } else {
        set({
          workoutPlans: [],
          activeAssignmentId: null,
          activePlanId: null,
          assignedAt: null,
          loading: false
        });
      }
    } catch (e) {
      console.warn("Failed to load local workout plans:", e);
      set({ loading: false });
    }
  },

  ownTemplates: [],
  ownTemplatesLoading: false,

  fetchOwnTemplates: async (userId: string) => {
    set({ ownTemplatesLoading: true });
    try {
      const plans = await workoutRepository.fetchOwnWorkoutPlans(userId);
      const mapped: WorkoutPlan[] = plans.map((plan: any) => ({
        id: plan.id,
        name: plan.name,
        created_at: plan.created_at,
        updated_at: plan.updated_at,
        exerciseCount: plan.days?.[0]?.exercises?.length || 0,
      }));
      set({ ownTemplates: mapped, ownTemplatesLoading: false });
    } catch (e) {
      console.warn('Failed to fetch own workout templates:', e);
      set({ ownTemplatesLoading: false });
    }
  },
}));

import { create } from 'zustand';
import { database } from '../database';
import { supabase } from '../lib/supabase';
import { WorkoutRepository, ExerciseRepository, Exercise } from '@yeti/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendLocalNotification } from '../services/notificationService';

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
  exercise?: Exercise;
}

export type { Exercise };

const notifiedPlanIdsInMemory = new Set<string>();

const workoutRepository = new WorkoutRepository(database, supabase);
const exerciseRepository = new ExerciseRepository(database, supabase);

interface WorkoutState {
  exercises: Exercise[];
  workoutPlans: WorkoutPlan[];
  loading: boolean;
  lastSyncedAt: string | null;
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
    
    // Read the local WatermelonDB graph. SyncManager refreshes it separately.
    try {
      const remoteAssigned = await workoutRepository.fetchWorkoutPlansRemote(userId);

      if (remoteAssigned) {
        const mappedPlans: any[] = [];
        const assignmentIds: string[] = [];
        remoteAssigned.forEach((assigned: any) => {
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
                  exercise_id: ex.exercise?.id,
                  sets: parseInt(ex.sets) || 3,
                  reps: parseInt(ex.reps) || 10,
                  weight: ex.weight || '',
                  rest_seconds: 60,
                  order_index: ex.order_index,
                  superset_group: ex.superset_group ?? undefined,
                  exercise: ex.exercise
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
          lastSyncedAt: nowStr,
          loading: false 
        });

      } else {
        set({ loading: false });
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

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendLocalNotification } from '../services/notificationService';

const notifiedPlanIdsInMemory = new Set<string>();

export interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
  instructions: string;
  gif_url: string;
  video_url: string;
}

export interface WorkoutPlan {
  id: string;
  name: string;
  created_at: string;
  updated_at?: string;
  workout_plan_exercises?: WorkoutPlanExercise[];
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
  exercise?: Exercise;
}

interface WorkoutState {
  exercises: Exercise[];
  workoutPlans: WorkoutPlan[];
  loading: boolean;
  lastSyncedAt: string | null;
  fetchExercises: () => Promise<void>;
  fetchWorkoutPlans: (userId: string) => Promise<void>;
  syncWorkoutPlans: (userId: string) => Promise<void>;
  createWorkoutPlan: (userId: string, name: string, exercises: Partial<WorkoutPlanExercise>[]) => Promise<void>;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  exercises: [],
  workoutPlans: [],
  loading: false,
  lastSyncedAt: null,
  
  fetchExercises: async () => {
    set({ loading: true });
    const { data, error } = await supabase.from('exercises').select('*').order('name');
    if (!error && data) {
      set({ exercises: data, loading: false });
    } else {
      set({ loading: false });
      console.error(error);
    }
  },

  fetchWorkoutPlans: async (userId: string) => {
    await get().syncWorkoutPlans(userId);
  },

  syncWorkoutPlans: async (userId: string) => {
    set({ loading: true });
    
    // 1. Try loading from AsyncStorage cache first
    try {
      const cachedPlansStr = await AsyncStorage.getItem('@dude_workout_plans');
      const cachedSyncedAt = await AsyncStorage.getItem('@dude_plans_last_synced_at');
      
      if (cachedPlansStr) {
        set({ 
          workoutPlans: JSON.parse(cachedPlansStr), 
          lastSyncedAt: cachedSyncedAt 
        });
      }
    } catch (e) {
      console.warn("AsyncStorage workout plans load failed:", e);
    }

    // 2. Fetch remote updates from Supabase
    try {
      const { data: remoteAssigned, error } = await supabase
        .from('assigned_plans')
        .select(`
          id, assigned_at, start_date,
          plan:workout_plans(
            id, name, created_at, coach_id,
            coach:profiles!coach_id(full_name),
            days:plan_days(
              id, name, day_number,
              exercises:plan_exercises(
                id, sets, reps, weight, order_index, exercise:exercises(*)
              )
            )
          )
        `)
        .eq('athlete_id', userId)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      if (remoteAssigned) {
        const mappedPlans: any[] = [];
        const assignmentIds: string[] = []; // Track one notification per assignment, not per day
        remoteAssigned.forEach((assigned: any) => {
          const plan = assigned.plan;
          if (!plan) return;
          const coachName = plan.coach?.full_name || 'Coach';
          assignmentIds.push(assigned.id);
          
          if (plan.days && plan.days.length > 0) {
            // Sort days by day_number ascending
            const sortedDays = [...plan.days].sort((a, b) => (a.day_number || 0) - (b.day_number || 0));
            sortedDays.forEach((day: any) => {
              // Sort exercises by order_index ascending
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
                  exercise: ex.exercise
                }))
              });
            });
          }
        });

        // Load in-memory cache if empty (use assignment IDs, not plan-day IDs)
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
        
        // Check by assignment ID — one notification per assignment, regardless of day count
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

        // Cache locally
        await AsyncStorage.setItem('@dude_workout_plans', JSON.stringify(mappedPlans));
        await AsyncStorage.setItem('@dude_plans_last_synced_at', nowStr);
      } else {
        set({ loading: false });
      }
    } catch (e) {
      console.warn("Failed to sync remote workout plans, falling back to cache:", e);
      set({ loading: false });
    }
  },

  createWorkoutPlan: async (userId: string, name: string, exercises: Partial<WorkoutPlanExercise>[]) => {
    set({ loading: true });
    
    // 1. Create the plan
    const { data: planData, error: planError } = await supabase
      .from('workout_plans')
      .insert({ user_id: userId, name })
      .select()
      .single();

    if (planError || !planData) {
      console.error(planError);
      set({ loading: false });
      return;
    }

    // 2. Insert the exercises
    if (exercises.length > 0) {
      const exercisesToInsert = exercises.map((ex, index) => ({
        workout_plan_id: planData.id,
        exercise_id: ex.exercise_id,
        sets: ex.sets || 3,
        reps: ex.reps || 10,
        rest_seconds: ex.rest_seconds || 60,
        order_index: index,
      }));

      const { error: exercisesError } = await supabase
        .from('workout_plan_exercises')
        .insert(exercisesToInsert);

      if (exercisesError) {
        console.error(exercisesError);
      }
    }

    // Refresh plans
    await get().fetchWorkoutPlans(userId);
  }
}));

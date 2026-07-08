import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface Client {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  lastWorkout: number; // timestamp
  adherenceScore: number; // 0-100
  caloriesLogged: number;
  calorieTarget: number;
  weight: number;
  avgHeartRate: number;
  wearableConnected: boolean;
  planName: string;
  weekProgress: string; 
}

export interface WorkoutLog {
  id: string;
  date: number; // timestamp
  name: string;
  status: 'completed' | 'skipped';
  exercises?: {
    name: string;
    sets: {
      weight: number;
      reps: number;
    }[];
  }[];
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  instructions?: string;
  gif_url?: string;
  video_url?: string;
  created_by_coach_id?: string;
}

export interface AssignedExercise {
  id: string;
  exerciseId: string;
  name: string;
  sets: string;
  reps: string;
  weight?: string;
}

export interface PlanDay {
  id: string;
  name: string;
  exercises: AssignedExercise[];
}

export interface DraftPlan {
  name: string;
  days: PlanDay[];
}

interface CoachState {
  clients: Client[];
  loading: boolean;
  exercises: Exercise[];
  invites: any[];
  notes: Record<string, any[]>;
  bundles: any[];
  
  // Actions
  getClients: () => Promise<void>;
  getClientDetail: (id: string) => Promise<{ 
    client: Client | null; 
    logs: WorkoutLog[]; 
    weightHistory: { date: string; weight: number }[] 
  }>;
  getExercises: () => Promise<void>;
  assignPlan: (plan: DraftPlan, clientIds: string[]) => Promise<void>;
  
  previousWeights: Record<string, number>;
  fetchPreviousWeights: (athleteId: string) => Promise<void>;
  
  // Invite system
  getInvites: () => Promise<void>;
  inviteClient: (email: string) => Promise<void>;
  
  // Trainer Notes
  getTrainerNotes: (athleteId: string) => Promise<void>;
  addTrainerNote: (athleteId: string, note: string) => Promise<void>;
  deleteTrainerNote: (noteId: string, athleteId: string) => Promise<void>;
  
  // Exercise Bundles
  getBundles: () => Promise<void>;
  createBundle: (name: string, exercises: any[]) => Promise<void>;
  deleteBundle: (bundleId: string) => Promise<void>;
}

export const useCoachStore = create<CoachState>((set, get) => ({
  clients: [],
  exercises: [],
  previousWeights: {},
  invites: [],
  notes: {},
  bundles: [],
  loading: false,

  getClients: async () => {
    set({ loading: true });
    const { data: sessionData } = await supabase.auth.getSession();
    const coachId = sessionData.session?.user?.id;
    if (!coachId) {
      set({ loading: false, clients: [] });
      return;
    }
    
    // 1. Get clients from coach_clients
    const { data: clientsData, error } = await supabase
      .from('coach_clients')
      .select('athlete:profiles!coach_clients_athlete_id_fkey(*)')
      .eq('coach_id', coachId);
      
    if (error || !clientsData || clientsData.length === 0) {
      set({ clients: [], loading: false });
      return;
    }

    // 2. Map to Client type and fetch adherence
    const mappedClients: Client[] = await Promise.all(clientsData.map(async (row: any) => {
      const p = row.athlete;
      
      const { data: logs } = await supabase
        .from('workout_sessions')
        .select('completed_at')
        .eq('athlete_id', p.id)
        .order('completed_at', { ascending: false })
        .limit(1);
        
      const lastWorkout = logs?.[0]?.completed_at ? new Date(logs[0].completed_at).getTime() : 0;
      const initials = p.full_name ? p.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : '??';

      // Call adherence RPC
      const { data: adherenceData } = await supabase.rpc('calculate_adherence', { athlete_id_param: p.id });

      // Get current plan name
      const { data: plans } = await supabase
        .from('assigned_plans')
        .select('workout_plans(name)')
        .eq('athlete_id', p.id)
        .order('assigned_at', { ascending: false })
        .limit(1);

      let currentPlanName = 'No Plan';
      if (plans && plans.length > 0 && plans[0].workout_plans) {
        // Handle both object and array shapes depending on PostgREST response
        const wp = plans[0].workout_plans as any;
        currentPlanName = Array.isArray(wp) ? wp[0]?.name : wp?.name || 'No Plan';
      }

      // Get today's calories
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const { data: mealLogs } = await supabase
        .from('meal_logs')
        .select('servings, food:foods(calories)')
        .eq('user_id', p.id)
        .gte('logged_at', startOfToday.toISOString());

      const caloriesLogged = (mealLogs || []).reduce((acc: number, log: any) => {
        const calories = log.food?.calories || 0;
        const servings = Number(log.servings) || 0;
        return acc + Math.round(calories * servings);
      }, 0);

      return {
        id: p.id,
        name: p.full_name || 'Unknown',
        initials,
        avatarColor: 'bg-primary text-black',
        lastWorkout,
        adherenceScore: adherenceData || 0,
        caloriesLogged, 
        calorieTarget: p.daily_calorie_target || 2500,
        weight: p.weight_kg || 170,
        avgHeartRate: 70,
        wearableConnected: p.wearable_connected || false,
        planName: currentPlanName,
        weekProgress: 'Active',
      };
    }));

    set({ clients: mappedClients, loading: false });
  },

  getClientDetail: async (id: string) => {
    // 0. Verify the requesting coach actually owns this athlete
    const { data: sessionData } = await supabase.auth.getSession();
    const coachId = sessionData.session?.user?.id;
    if (!coachId) return { client: null, logs: [], weightHistory: [] };

    const { data: ownership } = await supabase
      .from('coach_clients')
      .select('athlete_id')
      .eq('coach_id', coachId)
      .eq('athlete_id', id)
      .single();

    // Refuse to return data if this athlete doesn't belong to the requesting coach
    if (!ownership) return { client: null, logs: [], weightHistory: [] };

    // 1. Get profile (safe — ownership confirmed above)
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (!profile) return { client: null, logs: [], weightHistory: [] };

    // 2. Get recent logs (joining session_sets and exercises to display set details)
    const { data: logsData } = await supabase
      .from('workout_sessions')
      .select(`
        id, 
        started_at, 
        completed_at, 
        plan_day:plan_days(name),
        sets:session_sets(
          weight, 
          reps,
          plan_exercise:plan_exercises(
            exercise:exercises(name)
          )
        )
      `)
      .eq('athlete_id', id)
      .order('started_at', { ascending: false })
      .limit(10);

    const logs = (logsData || []).map((l: any) => {
      const exerciseMap: Record<string, { name: string; sets: { weight: number; reps: number }[] }> = {};
      
      (l.sets || []).forEach((s: any) => {
        const exName = s.plan_exercise?.exercise?.name || 'Unknown Exercise';
        if (!exerciseMap[exName]) {
          exerciseMap[exName] = { name: exName, sets: [] };
        }
        exerciseMap[exName].sets.push({
          weight: Number(s.weight) || 0,
          reps: parseInt(s.reps) || 0,
        });
      });

      return {
        id: l.id,
        date: new Date(l.started_at).getTime(),
        name: l.plan_day?.name || 'Workout',
        status: (l.completed_at ? 'completed' : 'skipped') as 'completed' | 'skipped',
        exercises: Object.values(exerciseMap),
      };
    });

    // 3. Get weight history
    const { data: weightsData } = await supabase
      .from('weight_logs')
      .select('date, weight_kg')
      .eq('user_id', id)
      .order('date', { ascending: true })
      .limit(6);

    const weightHistory = (weightsData || []).map((w: any) => ({
      date: new Date(w.date).toLocaleDateString(),
      weight: w.weight_kg,
    }));

    // Fetch today's calories
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const { data: mealLogs } = await supabase
      .from('meal_logs')
      .select('servings, food:foods(calories)')
      .eq('user_id', id)
      .gte('logged_at', startOfToday.toISOString());

    const caloriesLogged = (mealLogs || []).reduce((acc: number, log: any) => {
      const calories = log.food?.calories || 0;
      const servings = Number(log.servings) || 0;
      return acc + Math.round(calories * servings);
    }, 0);

    // Use existing client from store to grab pre-calculated fields if available
    let client = get().clients.find(c => c.id === id);
    if (!client) {
      const initials = profile.full_name ? profile.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : '??';
      client = {
         id: profile.id,
         name: profile.full_name || 'Unknown',
         initials,
         avatarColor: 'bg-primary text-black',
         lastWorkout: 0,
         adherenceScore: 80,
         caloriesLogged,
         calorieTarget: profile.daily_calorie_target || 2000,
         weight: profile.weight_kg || 170,
         avgHeartRate: 0,
         wearableConnected: profile.wearable_connected || false,
         planName: 'Current Plan',
         weekProgress: 'Active'
      };
    } else {
      client = {
        ...client,
        caloriesLogged
      };
    }

    return { client, logs, weightHistory };
  },

  fetchPreviousWeights: async (athleteId: string) => {
    try {
      const { data, error } = await supabase
        .from('exercise_sets')
        .select('exercise_id, weight_kg, completed_at, workout_logs!inner(user_id)')
        .eq('workout_logs.user_id', athleteId);
        
      if (error) throw error;
      
      const weights: Record<string, number> = {};
      const times: Record<string, number> = {};
      
      (data || []).forEach((row: any) => {
        const time = new Date(row.completed_at).getTime();
        if (!times[row.exercise_id] || time > times[row.exercise_id]) {
          times[row.exercise_id] = time;
          weights[row.exercise_id] = Number(row.weight_kg) || 0;
        }
      });
      
      set({ previousWeights: weights });
    } catch (e) {
      console.warn("Failed to fetch previous weights:", e);
    }
  },

  getExercises: async () => {
    set({ loading: true });
    const { data } = await supabase
      .from('exercises')
      .select('*')
      .order('name');
      
    if (data) {
      set({ 
        exercises: data.map(e => ({
          id: e.id,
          name: e.name,
          muscleGroup: e.muscle_group || 'Other',
          instructions: e.instructions || '',
          gif_url: e.gif_url || '',
          video_url: e.video_url || '',
          created_by_coach_id: e.created_by_coach_id || null
        })), 
        loading: false 
      });
    } else {
      set({ loading: false });
    }
  },

  assignPlan: async (plan, clientIds) => {
    if (get().loading) return;
    set({ loading: true });
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const coachId = sessionData.session?.user?.id;
      if (!coachId) {
        set({ loading: false });
        return;
      }
      
      // 1. Create the template plan
      const { data: newPlan, error } = await supabase
        .from('workout_plans')
        .insert({ coach_id: coachId, name: plan.name })
        .select()
        .single();
        
      if (error) throw error;
      if (!newPlan) throw new Error("Failed to create workout plan");
        
      // 2. Insert plan days and exercises
      for (let dayIndex = 0; dayIndex < plan.days.length; dayIndex++) {
        const day = plan.days[dayIndex];
        const { data: newDay, error: dayError } = await supabase
          .from('plan_days')
          .insert({ plan_id: newPlan.id, day_number: dayIndex + 1, name: day.name })
          .select()
          .single();
          
        if (dayError) throw dayError;
        if (newDay) {
          const exercisesToInsert = day.exercises.map((ex: AssignedExercise, exIndex: number) => ({
            plan_day_id: newDay.id,
            exercise_id: ex.exerciseId,
            sets: ex.sets || '3',
            reps: ex.reps || '10',
            weight: ex.weight || '',
            order_index: exIndex
          }));
          const { error: exError } = await supabase.from('plan_exercises').insert(exercisesToInsert);
          if (exError) throw exError;
        }
      }
      
      // 3. Assign the plan to clients
      for (const clientId of clientIds) {
        const { error: assignError } = await supabase.from('assigned_plans').insert({
          plan_id: newPlan.id,
          athlete_id: clientId,
          start_date: new Date().toISOString().split('T')[0]
        });
        if (assignError) throw assignError;
        
        // 4. Create a notification for the athlete
        const { error: notifError } = await supabase.from('notifications').insert({
          user_id: clientId,
          type: 'coach',
          title: 'New Workout Plan!',
          body: `Your coach assigned a new plan: ${plan.name}. Let's get to work!`,
          deep_link: '/workouts'
        });
        if (notifError) throw notifError;
      }
      
      // Refresh clients to pull the new plan adherence
      await get().getClients();
    } catch (e) {
      console.error("Failed to assign plan:", e);
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  getInvites: async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const coachId = sessionData.session?.user?.id;
    if (!coachId) return;

    const { data, error } = await supabase
      .from('client_invites')
      .select('*')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      set({ invites: data });
    }
  },

  inviteClient: async (email: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const coachId = sessionData.session?.user?.id;
    if (!coachId) return;

    const { error } = await supabase
      .from('client_invites')
      .insert({
        coach_id: coachId,
        email,
        status: 'pending'
      });

    if (error) throw error;
    await get().getInvites();
  },

  getTrainerNotes: async (athleteId: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const coachId = sessionData.session?.user?.id;
    if (!coachId) return;

    const { data, error } = await supabase
      .from('trainer_notes')
      .select('*')
      .eq('coach_id', coachId)
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      set((state) => ({
        notes: {
          ...state.notes,
          [athleteId]: data
        }
      }));
    }
  },

  addTrainerNote: async (athleteId: string, note: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const coachId = sessionData.session?.user?.id;
    if (!coachId) return;

    const { error } = await supabase
      .from('trainer_notes')
      .insert({
        coach_id: coachId,
        athlete_id: athleteId,
        note
      });

    if (error) throw error;
    await get().getTrainerNotes(athleteId);
  },

  deleteTrainerNote: async (noteId: string, athleteId: string) => {
    const { error } = await supabase
      .from('trainer_notes')
      .delete()
      .eq('id', noteId);

    if (error) throw error;
    await get().getTrainerNotes(athleteId);
  },

  getBundles: async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const coachId = sessionData.session?.user?.id;
    if (!coachId) return;

    const { data, error } = await supabase
      .from('exercise_bundles')
      .select('*, bundle_exercises(*, exercise:exercises(*))')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      set({ bundles: data });
    }
  },

  createBundle: async (name: string, exercises: any[]) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const coachId = sessionData.session?.user?.id;
    if (!coachId) return;

    const { data: bundleData, error: bundleError } = await supabase
      .from('exercise_bundles')
      .insert({ coach_id: coachId, name })
      .select()
      .single();

    if (bundleError || !bundleData) throw bundleError || new Error("Failed to create bundle");

    if (exercises.length > 0) {
      const { error: exercisesError } = await supabase
        .from('bundle_exercises')
        .insert(exercises.map((ex, index) => ({
          bundle_id: bundleData.id,
          exercise_id: ex.exercise_id,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight || '',
          order_index: index
        })));

      if (exercisesError) throw exercisesError;
    }

    await get().getBundles();
  },

  deleteBundle: async (bundleId: string) => {
    const { error } = await supabase
      .from('exercise_bundles')
      .delete()
      .eq('id', bundleId);

    if (error) throw error;
    await get().getBundles();
  },
}));

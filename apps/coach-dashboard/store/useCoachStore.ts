import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { countSessionsToday } from '@/lib/dashboardMetrics';

export interface Client {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  lastWorkout: number | null; // timestamp; null when workout data is unavailable
  adherenceScore: number | null; // 0-100; null when calculate_adherence failed
  caloriesLogged: number | null;
  calorieTarget: number;
  weight: number;
  avgHeartRate: number;
  wearableConnected: boolean;
  planName: string | null;
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

/** Summary row for the Programs list (/dashboard/templates) — one of this
 * coach's own workout_plans, not an athlete-authored or assigned one. */
export interface WorkoutTemplateSummary {
  id: string;
  name: string;
  createdAt: string;
  dayCount: number;
}

interface CoachState {
  clients: Client[];
  loading: boolean;
  /** Authentication or roster-load failure; distinct from a legitimate zero-client coach, which has no error. */
  clientsError: string | null;
  /** Total successful workout_sessions completed today; null means the workout query was unavailable, while 0 is a successful empty result. */
  workoutsToday: number | null;
  dashboardErrors: {
    workouts: string | null;
    plans: string | null;
    meals: string | null;
    adherence: string | null;
  };
  exercises: Exercise[];
  invites: any[];
  /** Set when the client_invites fetch itself failed, so an unavailable invite count is never rendered as a real zero. */
  invitesError: string | null;
  notes: Record<string, any[]>;
  bundles: any[];
  templates: WorkoutTemplateSummary[];
  templatesLoading: boolean;
  templatesError: string | null;

  // Actions
  getClients: () => Promise<void>;
  getTemplates: () => Promise<void>;
  getClientDetail: (id: string) => Promise<{ 
    client: Client | null; 
    logs: WorkoutLog[]; 
    weightHistory: { date: string; weight: number }[] 
  }>;
  getExercises: () => Promise<void>;
  assignPlan: (plan: DraftPlan, clientIds: string[]) => Promise<void>;
  assignNutritionTargets: (
    athleteId: string,
    targets: { calories: number; protein: number; carbs: number; fat: number },
  ) => Promise<void>;

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
  clientsError: null,
  workoutsToday: null,
  dashboardErrors: { workouts: null, plans: null, meals: null, adherence: null },
  exercises: [],
  previousWeights: {},
  invites: [],
  invitesError: null,
  notes: {},
  bundles: [],
  templates: [],
  templatesLoading: false,
  templatesError: null,
  loading: false,

  getClients: async () => {
    try {
    set({
      loading: true,
      clientsError: null,
      dashboardErrors: { workouts: null, plans: null, meals: null, adherence: null },
    });
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const coachId = sessionData.session?.user?.id;
    if (sessionError || !coachId) {
      set({
        loading: false,
        clients: [],
        workoutsToday: null,
        clientsError: sessionError?.message || 'Not signed in',
      });
      return;
    }

    // 1. Get clients from coach_clients
    const { data: clientsData, error } = await supabase
      .from('coach_clients')
      .select('athlete:profiles!coach_clients_athlete_id_fkey(*)')
      .eq('coach_id', coachId);

    if (error) {
      // Genuine fetch failure — distinct from a coach who simply has no athletes yet.
      set({ clients: [], loading: false, workoutsToday: null, clientsError: error.message });
      return;
    }
    if (!clientsData || clientsData.length === 0) {
      set({ clients: [], loading: false, workoutsToday: 0, clientsError: null });
      return;
    }

    // 2. Batch-fetch everything needed across ALL clients in parallel — 4 queries
    // total instead of 4 PER client (was 4N+1 round trips for N clients; now a
    // fixed ~4, plus N adherence RPC calls since calculate_adherence has no
    // batched equivalent yet). Grouping logic below preserves the exact same
    // semantics as the original per-client queries (same sort orders, same
    // "sum all of today's logs" aggregation), just computed client-side after
    // one shared fetch instead of one fetch per client.
    const athleteIds = clientsData.map((row: any) => row.athlete.id);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [workoutRes, plansRes, mealLogsRes, adherenceResults] = await Promise.all([
      supabase
        .from('workout_sessions')
        .select('athlete_id, completed_at')
        .in('athlete_id', athleteIds)
        .order('completed_at', { ascending: false }),
      supabase
        .from('assigned_plans')
        .select('athlete_id, assigned_at, workout_plans(name)')
        .in('athlete_id', athleteIds)
        .order('assigned_at', { ascending: false }),
      supabase
        .from('meal_logs')
        .select('user_id, servings, food:foods(calories)')
        .in('user_id', athleteIds)
        .gte('logged_at', startOfToday.toISOString()),
      Promise.all(athleteIds.map((id: string) => supabase.rpc('calculate_adherence', { athlete_id_param: id }))),
    ]);

    const failedAdherence = adherenceResults.filter((result: any) => result.error).length;
    const dashboardErrors = {
      workouts: workoutRes.error?.message || null,
      plans: plansRes.error?.message || null,
      meals: mealLogsRes.error?.message || null,
      adherence: failedAdherence > 0
        ? `Adherence unavailable for ${failedAdherence} ${failedAdherence === 1 ? 'athlete' : 'athletes'}`
        : null,
    };

    // First occurrence per athlete_id after a DESC-sorted fetch == latest row,
    // matching each original per-client `.order(...).limit(1)` query.
    const lastWorkoutMap = new Map<string, number>();
    (!workoutRes.error ? workoutRes.data || [] : []).forEach((row: any) => {
      if (!lastWorkoutMap.has(row.athlete_id) && row.completed_at) {
        lastWorkoutMap.set(row.athlete_id, new Date(row.completed_at).getTime());
      }
    });

    const planMap = new Map<string, string>();
    (!plansRes.error ? plansRes.data || [] : []).forEach((row: any) => {
      if (planMap.has(row.athlete_id)) return;
      const wp = row.workout_plans as any;
      const name = Array.isArray(wp) ? wp[0]?.name : wp?.name;
      planMap.set(row.athlete_id, name || 'No Plan');
    });

    // Sum today's calories per athlete (same aggregation as the original,
    // just grouped across all athletes' logs instead of one athlete's).
    const caloriesMap = new Map<string, number>();
    (!mealLogsRes.error ? mealLogsRes.data || [] : []).forEach((log: any) => {
      const calories = log.food?.calories || 0;
      const servings = Number(log.servings) || 0;
      caloriesMap.set(log.user_id, (caloriesMap.get(log.user_id) || 0) + Math.round(calories * servings));
    });

    // Adherence RPC results are positionally aligned with athleteIds.
    const adherenceMap = new Map<string, number | null>();
    athleteIds.forEach((id: string, idx: number) => {
      const result = adherenceResults[idx];
      adherenceMap.set(id, result?.error ? null : (result?.data ?? null));
    });

    const mappedClients: Client[] = clientsData.map((row: any) => {
      const p = row.athlete;
      const initials = p.full_name ? p.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : '??';

      return {
        id: p.id,
        name: p.full_name || 'Unknown',
        initials,
        avatarColor: 'bg-primary text-black',
        lastWorkout: workoutRes.error ? null : (lastWorkoutMap.get(p.id) || 0),
        adherenceScore: adherenceMap.get(p.id) ?? null,
        caloriesLogged: mealLogsRes.error ? null : (caloriesMap.get(p.id) || 0),
        calorieTarget: p.daily_calorie_target || 2500,
        weight: p.weight_kg || 170,
        avgHeartRate: 70,
        wearableConnected: p.wearable_connected || false,
        planName: plansRes.error ? null : (planMap.get(p.id) || 'No Plan'),
        weekProgress: 'Active',
      };
    });

    set({
      clients: mappedClients,
      loading: false,
      workoutsToday: workoutRes.error ? null : countSessionsToday(workoutRes.data || []),
      clientsError: null,
      dashboardErrors,
    });
    } catch (e: any) {
      set({ clients: [], loading: false, workoutsToday: null, clientsError: e?.message || 'Failed to load athletes' });
    }
  },

  getTemplates: async () => {
    set({ templatesLoading: true, templatesError: null });
    try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const coachId = sessionData.session?.user?.id;
    if (sessionError || !coachId) {
      set({ templates: [], templatesLoading: false, templatesError: sessionError?.message || 'Not signed in' });
      return;
    }

    // Coach-authored templates only (workout_plans.coach_id) — RLS additionally
    // enforces this server-side, this filter is belt-and-suspenders, not the
    // only line of defense. Deliberately excludes athlete-authored plans
    // (workout_plans.user_id), which are a different ownership axis in this
    // schema (see docs/database-schema.md's "Workout planning" section) and
    // don't belong on the coach's own Programs list.
    const { data, error } = await supabase
      .from('workout_plans')
      .select('id, name, created_at, plan_days(count)')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false });

    if (error) {
      set({ templates: [], templatesLoading: false, templatesError: error.message });
      return;
    }

    const templates: WorkoutTemplateSummary[] = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name || 'Untitled Program',
      createdAt: row.created_at,
      dayCount: row.plan_days?.[0]?.count ?? 0,
    }));

    set({ templates, templatesLoading: false, templatesError: null });
    } catch (e: any) {
      set({ templates: [], templatesLoading: false, templatesError: e?.message || 'Failed to load programs' });
    }
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
          exercise:exercises(name),
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
        const exName = s.exercise?.name || s.plan_exercise?.exercise?.name || 'Unknown Exercise';
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

    // 3. Get weight history from measurements (aligned with offline schema)
    const { data: weightsData } = await supabase
      .from('measurements')
      .select('logged_at, value')
      .eq('user_id', id)
      .eq('type', 'weight_kg')
      .order('logged_at', { ascending: true })
      .limit(6);

    const weightHistory = (weightsData || []).map((w: any) => ({
      date: new Date(w.logged_at).toLocaleDateString(),
      weight: Number(w.value),
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
        .from('session_sets')
        .select('exercise_id, weight, completed_at, workout_sessions!inner(athlete_id)')
        .eq('workout_sessions.athlete_id', athleteId)
        .not('completed_at', 'is', null);
        
      if (error) throw error;
      
      const weights: Record<string, number> = {};
      const times: Record<string, number> = {};
      
      (data || []).forEach((row: any) => {
        if (!row.exercise_id) return;
        const time = new Date(row.completed_at).getTime();
        if (!times[row.exercise_id] || time > times[row.exercise_id]) {
          times[row.exercise_id] = time;
          weights[row.exercise_id] = Number(row.weight) || 0;
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

  assignNutritionTargets: async (athleteId, targets) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const coachId = sessionData.session?.user?.id;
    if (!coachId) throw new Error('Not authenticated');

    set({ loading: true });
    try {
      // Writes the CANONICAL profiles.daily_*_target columns and locks them. RLS
      // ("Coaches update client nutrition targets") restricts this to the coach's
      // own assigned athletes, so a coach cannot touch anyone else's targets.
      const { error } = await supabase
        .from('profiles')
        .update({
          daily_calorie_target: targets.calories,
          daily_protein_target: targets.protein,
          daily_carb_target: targets.carbs,
          daily_fat_target: targets.fat,
          nutrition_targets_locked: true,
          nutrition_targets_updated_by: coachId,
          nutrition_targets_updated_at: new Date().toISOString(),
        })
        .eq('id', athleteId);
      if (error) throw error;

      // Best-effort notification so the athlete knows their targets changed.
      try {
        await supabase.from('notifications').insert({
          user_id: athleteId,
          type: 'coach',
          title: 'Nutrition targets updated',
          body: `Your coach set new daily targets: ${targets.calories} kcal · ${targets.protein}P / ${targets.carbs}C / ${targets.fat}F.`,
          deep_link: '/food-diary',
        });
      } catch (notifErr) {
        console.warn('Nutrition target notification failed (non-fatal):', notifErr);
      }

      await get().getClients();
    } catch (e) {
      console.error('Failed to assign nutrition targets:', e);
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  getInvites: async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const coachId = sessionData.session?.user?.id;
    if (!coachId) {
      set({ invites: [], invitesError: 'Not signed in' });
      return;
    }

    const { data, error } = await supabase
      .from('client_invites')
      .select('*')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false });

    if (error) {
      // Keep a failed fetch distinguishable from a genuine zero-invite result,
      // so the dashboard can say "unavailable" instead of showing a real "0".
      set({ invites: [], invitesError: error.message });
      return;
    }

    set({ invites: data || [], invitesError: null });
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

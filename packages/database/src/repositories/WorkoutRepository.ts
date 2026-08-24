import { Database, Q } from '@nozbe/watermelondb';
import { Workout } from '../models/Workout';
import { WorkoutSession } from '../models/WorkoutSession';
import { SessionSet } from '../models/SessionSet';
import { PersonalRecord } from '../models/PersonalRecord';
import { WorkoutPlan } from '../models/WorkoutPlan';
import { PlanDay } from '../models/PlanDay';
import { PlanExercise } from '../models/PlanExercise';
import { AssignedPlan } from '../models/AssignedPlan';

export class WorkoutRepository {
  private db: Database;
  private supabase?: any;

  constructor(db: Database, supabase?: any) {
    this.db = db;
    this.supabase = supabase;
  }

  /**
   * Guards local WatermelonDB access for WRITE operations. The native SQLite
   * adapter is unavailable on web, where `db` is null — fail with a clear,
   * catchable error instead of a cryptic "Cannot read properties of null" crash.
   */
  private requireDb(): Database {
    if (!this.db) {
      throw new Error('LOCAL_DB_UNAVAILABLE: local database is not available on this platform');
    }
    return this.db;
  }

  private hasLocalPlanDb(): boolean {
    return Boolean(this.db && typeof (this.db as any).get === 'function' && typeof (this.db as any).write === 'function');
  }

  // --- Routine Templates ---

  async createWorkout(name: string, dayId?: string): Promise<Workout> {
    this.requireDb();
    return await this.db.write(async () => {
      return await this.db.get<Workout>('workouts').create(workout => {
        workout.name = name;
        if (dayId) workout.day_id = dayId;
      });
    });
  }

  async updateWorkout(id: string, updates: Partial<{name: string}>): Promise<void> {
    this.requireDb();
    await this.db.write(async () => {
      const workout = await this.db.get<Workout>('workouts').find(id);
      await workout.update(w => {
        if (updates.name) w.name = updates.name;
      });
    });
  }

  async deleteWorkout(id: string): Promise<void> {
    this.requireDb();
    await this.db.write(async () => {
      const workout = await this.db.get<Workout>('workouts').find(id);
      await workout.markAsDeleted();
    });
  }

  async getWorkouts(): Promise<Workout[]> {
    // Local DB unavailable on web — an empty list is a reasonable, safe fallback
    // (identical UI state to "no workout templates yet"), rather than throwing
    // and aborting whatever multi-step load called this.
    if (!this.db) return [];
    return await this.db.get<Workout>('workouts').query().fetch();
  }

  // --- Workout Session Lifecycle ---

  async createWorkoutSession(
    userId: string, 
    name: string, 
    planDayId?: string, 
    assignmentId?: string
  ): Promise<WorkoutSession> {
    this.requireDb();
    return await this.db.write(async () => {
      return await this.db.get<WorkoutSession>('workout_sessions').create(session => {
        session.user_id = userId;
        session.name = name;
        session.status = 'active';
        session.started_at = Date.now();
        session.is_synced = false;
        if (planDayId) session.plan_day_id = planDayId;
        if (assignmentId) session.assignment_id = assignmentId;
      });
    });
  }

  async completeWorkoutSession(
    sessionId: string, 
    durationSeconds: number, 
    totalVolumeKg: number, 
    notes?: string,
    progressionSuggestion?: string
  ): Promise<void> {
    this.requireDb();
    await this.db.write(async () => {
      const session = await this.db.get<WorkoutSession>('workout_sessions').find(sessionId);
      await session.update(s => {
        s.status = 'completed';
        s.finished_at = Date.now();
        s.duration_seconds = durationSeconds;
        s.total_volume_kg = totalVolumeKg;
        s.notes = notes;
        s.progression_suggestion = progressionSuggestion;
        s.is_synced = false;
      });
    });
  }

  async saveExerciseSet(
    sessionId: string,
    userId: string,
    exerciseId: string,
    exerciseName: string,
    setNumber: number,
    weightKg: number,
    reps: number,
    rpe?: number,
    tempo?: string,
    restSeconds?: number,
    isWarmup?: boolean,
    isDropset?: boolean
  ): Promise<SessionSet> {
    this.requireDb();
    return await this.db.write(async () => {
      return await this.db.get<SessionSet>('session_sets').create(set => {
        set.session_id = sessionId;
        set.user_id = userId;
        set.exercise_id = exerciseId;
        set.exercise_name = exerciseName;
        set.set_number = setNumber;
        set.weight_kg = weightKg;
        set.reps = reps;
        set.rpe = rpe;
        set.tempo = tempo;
        set.rest_seconds = restSeconds;
        set.is_warmup = isWarmup;
        set.is_dropset = isDropset;
        set.completed_at = Date.now();
        set.is_synced = false;
      });
    });
  }

  async getWorkoutHistory(userId: string, limit = 50): Promise<any[]> {
    if (this.db) {
      return await this.db.get<WorkoutSession>('workout_sessions')
        .query(
          Q.where('user_id', userId),
          Q.where('status', 'completed'),
          Q.sortBy('finished_at', Q.desc),
          Q.take(limit)
        )
        .fetch();
    }
    // Web / PWA PostgREST fallback:
    if (!this.supabase) return [];
    try {
      const { data, error } = await this.supabase
        .from('workout_sessions')
        .select(`
          id,
          athlete_id,
          plan_day_id,
          started_at,
          completed_at,
          duration_seconds,
          plan_day:plan_days(name, workout_plan:workout_plans(name)),
          session_sets (
            id,
            session_id,
            exercise_id,
            plan_exercise_id,
            weight,
            reps,
            completed_at,
            exercise:exercises(name)
          )
        `)
        .eq('athlete_id', userId)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('Failed to fetch remote workout history:', error);
        return [];
      }

      return (data || []).map((s: any) => ({
        id: s.id,
        user_id: s.athlete_id,
        athlete_id: s.athlete_id,
        plan_day_id: s.plan_day_id,
        name: s.plan_day?.workout_plan?.name || s.plan_day?.name || 'Workout Session',
        status: 'completed',
        started_at: new Date(s.started_at).getTime(),
        finished_at: new Date(s.completed_at).getTime(),
        completed_at: s.completed_at,
        duration_seconds: s.duration_seconds,
        total_volume_kg: (s.session_sets || []).reduce((sum: number, st: any) =>
          sum + (Number(st.weight ?? 0) * Number(st.reps ?? 0)), 0),
        notes: null,
        sets: [...(s.session_sets || [])].sort((a: any, b: any) => {
          const time = String(a.completed_at || '').localeCompare(String(b.completed_at || ''));
          return time || String(a.id).localeCompare(String(b.id));
        }).map((st: any, index: number) => ({
          id: st.id,
          session_id: st.session_id,
          exercise_id: st.exercise_id,
          exercise_name: st.exercise?.name || st.exercise_name || 'Exercise',
          set_number: index + 1,
          weight_kg: Number(st.weight ?? 0),
          reps: Number(st.reps ?? 0),
          rpe: undefined,
          tempo: undefined,
          rest_seconds: undefined,
          is_warmup: false,
          is_dropset: false,
          completed_at: st.completed_at ? new Date(st.completed_at).getTime() : undefined,
        })).sort((a: any, b: any) => a.set_number - b.set_number),
      }));
    } catch (err) {
      console.warn('Error fetching remote workout history:', err);
      return [];
    }
  }

  async getPersonalRecords(userId: string): Promise<PersonalRecord[]> {
    if (!this.db) return [];
    return await this.db.get<PersonalRecord>('personal_records')
      .query(Q.where('athlete_id', userId))
      .fetch();
  }

  async savePersonalRecord(
    athleteId: string,
    exerciseId: string,
    recordType: string,
    value: number
  ): Promise<PersonalRecord> {
    this.requireDb();
    return this.db.write(async () => {
      return this.db.get<PersonalRecord>('personal_records').create(pr => {
        pr.athlete_id = athleteId;
        pr.exercise_id = exerciseId;
        pr.record_type = recordType;
        pr.value = value;
        pr.achieved_at = Date.now();
      });
    });
  }

  async getVolumeHistory(userId: string): Promise<Array<{ date: number; volume: number }>> {
    const sessions = await this.getWorkoutHistory(userId);
    return sessions.map(s => ({
      date: s.finished_at || s.started_at,
      volume: s.total_volume_kg || 0
    }));
  }

  async duplicateWorkout(sessionId: string, userId: string): Promise<WorkoutSession> {
    this.requireDb();
    const sourceSession = await this.db.get<WorkoutSession>('workout_sessions').find(sessionId);
    const sourceSets = await this.db.get<SessionSet>('session_sets')
      .query(Q.where('session_id', sessionId))
      .fetch();

    return await this.db.write(async () => {
      const newSession = await this.db.get<WorkoutSession>('workout_sessions').create(s => {
        s.user_id = userId;
        s.name = `${sourceSession.name} (Copy)`;
        s.status = 'active';
        s.started_at = Date.now();
        s.is_synced = false;
      });

      for (const set of sourceSets) {
        await this.db.get<SessionSet>('session_sets').create(newSet => {
          newSet.session_id = newSession.id;
          newSet.user_id = userId;
          newSet.exercise_id = set.exercise_id;
          newSet.exercise_name = set.exercise_name;
          newSet.set_number = set.set_number;
          newSet.weight_kg = set.weight_kg;
          newSet.reps = set.reps;
          newSet.rpe = set.rpe;
          newSet.tempo = set.tempo;
          newSet.rest_seconds = set.rest_seconds;
          newSet.is_warmup = set.is_warmup;
          newSet.is_dropset = set.is_dropset;
          newSet.completed_at = Date.now();
          newSet.is_synced = false;
        });
      }

      return newSession;
    });
  }

  // --- Remote Operations ---

  async fetchExerciseHistoryRemote(exerciseId: string, userId: string): Promise<any> {
    if (!this.supabase) {
      throw new Error('Supabase client not configured in WorkoutRepository');
    }
    const { data, error } = await this.supabase.functions.invoke('get-client-exercise-history', {
      body: { clientId: userId, exerciseId, limit: 10 }
    });
    if (error) throw error;
    return data;
  }

  async fetchWorkoutPlansRemote(userId: string): Promise<any[]> {
    if (this.hasLocalPlanDb()) return this.fetchAssignedWorkoutPlansLocal(userId);
    if (!this.supabase) {
      throw new Error('Supabase client not configured in WorkoutRepository');
    }
    const { data, error } = await this.supabase
      .from('assigned_plans')
      .select(`
        id, assigned_at, start_date,
        plan:workout_plans(
          id, name, created_at, coach_id,
          coach:profiles!coach_id(full_name),
          days:plan_days(
            id, name, day_number,
            exercises:plan_exercises(
              id, sets, reps, weight, superset_group, order_index, exercise:exercises(*)
            )
          )
        )
      `)
      .eq('athlete_id', userId)
      .order('assigned_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  private async fetchAssignedWorkoutPlansLocal(userId: string): Promise<any[]> {
    const assignments = await this.db.get<AssignedPlan>('assigned_plans').query(
      Q.where('athlete_id', userId), Q.sortBy('assigned_at', Q.desc)
    ).fetch();
    return Promise.all(assignments.map(async assigned => {
      const plan = await this.db.get<WorkoutPlan>('workout_plans').find(assigned.plan_id);
      return { id: assigned.id, assigned_at: new Date(assigned.assigned_at).toISOString(), start_date: assigned.start_date,
        plan: await this.hydratePlan(plan) };
    }));
  }

  private async hydratePlan(plan: WorkoutPlan): Promise<any> {
    const days = await this.db.get<PlanDay>('plan_days').query(
      Q.where('plan_id', plan.id), Q.sortBy('day_number', Q.asc)
    ).fetch();
    return {
      id: plan.id, name: plan.name, notes: plan.notes,
      user_id: plan.user_id, coach_id: plan.coach_id,
      created_at: new Date(plan.createdAt).toISOString(), updated_at: new Date(plan.updatedAt).toISOString(),
      days: await Promise.all(days.map(async day => ({
        id: day.id, name: day.name, day_number: day.day_number,
        exercises: await Promise.all((await this.db.get<PlanExercise>('plan_exercises').query(
          Q.where('plan_day_id', day.id), Q.sortBy('order_index', Q.asc)
        ).fetch()).map(async item => {
          let exercise: any = null;
          try { exercise = (await this.db.get('exercises').find(item.exercise_id))._raw; } catch (_) {}
          return { ...item._raw, exercise };
        })),
      }))),
    };
  }

  // --- Athlete-authored workout templates (Step 4.5, local-first since 4.6) ---
  // Local-first via hasLocalPlanDb(): reads/writes hit WatermelonDB directly
  // when a local plan DB is available (native), falling back to the direct
  // Supabase calls below only where there's no local database (web) — sync
  // then reconciles local writes with the server in the background. Never
  // touches workout_plan_exercises, the pre-plan_days/plan_exercises legacy
  // join table — that stays as-is for compatibility with whatever historical
  // data still references it.

  private static readonly OWN_PLAN_SELECT = `
    id, name, notes, created_at, updated_at,
    days:plan_days(
      id, name, day_number,
      exercises:plan_exercises(
        id, exercise_id, sets, reps, weight, target_rpe, rest_seconds, notes,
        warmup_sets, is_dropset, superset_group, order_index,
        exercise:exercises(*)
      )
    )
  `;

  /** Templates the athlete authored themselves (not coach-assigned). */
  async fetchOwnWorkoutPlans(userId: string): Promise<any[]> {
    if (this.hasLocalPlanDb()) {
      const plans = await this.db.get<WorkoutPlan>('workout_plans').query(
        Q.where('user_id', userId), Q.where('coach_id', null), Q.sortBy('created_at', Q.desc)
      ).fetch();
      return Promise.all(plans.map(plan => this.hydratePlan(plan)));
    }
    if (!this.supabase) {
      throw new Error('Supabase client not configured in WorkoutRepository');
    }
    const { data, error } = await this.supabase
      .from('workout_plans')
      .select(WorkoutRepository.OWN_PLAN_SELECT)
      .eq('user_id', userId)
      .is('coach_id', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async fetchOwnWorkoutPlanById(planId: string): Promise<any | null> {
    if (this.hasLocalPlanDb()) {
      try { return await this.hydratePlan(await this.db.get<WorkoutPlan>('workout_plans').find(planId)); }
      catch (_) { return null; }
    }
    if (!this.supabase) {
      throw new Error('Supabase client not configured in WorkoutRepository');
    }
    const { data, error } = await this.supabase
      .from('workout_plans')
      .select(WorkoutRepository.OWN_PLAN_SELECT)
      .eq('id', planId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async createOwnWorkoutPlan(
    userId: string,
    name: string,
    notes: string | undefined,
    exercises: Array<{ exerciseId: string } & PlanExerciseConfig>
  ): Promise<{ planId: string; planDayId: string }> {
    if (this.hasLocalPlanDb()) {
      return this.db.write(async () => {
        const now = Date.now();
        const plan = await this.db.get<WorkoutPlan>('workout_plans').create(row => {
          row.user_id = userId; row.name = name; row.notes = notes;
          (row as any)._raw.created_at = now; (row as any)._raw.updated_at = now;
        });
        const day = await this.db.get<PlanDay>('plan_days').create(row => {
          row.plan_id = plan.id; row.day_number = 1; row.name = 'Day 1';
          (row as any)._raw.created_at = now; (row as any)._raw.updated_at = now;
        });
        for (let index = 0; index < exercises.length; index++) {
          const config = exercises[index];
          await this.createLocalPlanExercise(day.id, config.exerciseId, index, config, now);
        }
        return { planId: plan.id, planDayId: day.id };
      });
    }
    if (!this.supabase) {
      throw new Error('Supabase client not configured in WorkoutRepository');
    }

    const { data: plan, error: planErr } = await this.supabase
      .from('workout_plans')
      .insert({ user_id: userId, name, notes: notes ?? null })
      .select()
      .single();
    if (planErr) throw planErr;

    // Single implicit day — this builder targets a flat exercise list, not a
    // multi-day program, matching what was actually asked for.
    const { data: day, error: dayErr } = await this.supabase
      .from('plan_days')
      .insert({ plan_id: plan.id, day_number: 1, name: 'Day 1' })
      .select()
      .single();
    if (dayErr) throw dayErr;

    if (exercises.length > 0) {
      const rows = exercises.map((ex, index) => planExerciseRow(day.id, ex, index));
      const { error: exErr } = await this.supabase.from('plan_exercises').insert(rows);
      if (exErr) throw exErr;
    }

    return { planId: plan.id, planDayId: day.id };
  }

  async updateOwnWorkoutPlanMeta(planId: string, updates: { name?: string; notes?: string }): Promise<void> {
    if (this.hasLocalPlanDb()) {
      await this.db.write(async () => (await this.db.get<WorkoutPlan>('workout_plans').find(planId)).update(row => {
        if (updates.name !== undefined) row.name = updates.name;
        if (updates.notes !== undefined) row.notes = updates.notes;
      }));
      return;
    }
    if (!this.supabase) {
      throw new Error('Supabase client not configured in WorkoutRepository');
    }
    const { error } = await this.supabase.from('workout_plans').update(updates).eq('id', planId);
    if (error) throw error;
  }

  async addPlanExercise(
    planDayId: string,
    exerciseId: string,
    orderIndex: number,
    config: PlanExerciseConfig = {}
  ): Promise<any> {
    if (this.hasLocalPlanDb()) {
      return this.db.write(() => this.createLocalPlanExercise(planDayId, exerciseId, orderIndex, config, Date.now()));
    }
    if (!this.supabase) {
      throw new Error('Supabase client not configured in WorkoutRepository');
    }
    const { data, error } = await this.supabase
      .from('plan_exercises')
      .insert(planExerciseRow(planDayId, { exerciseId, ...config }, orderIndex))
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async removePlanExercise(planExerciseId: string): Promise<void> {
    if (this.hasLocalPlanDb()) {
      await this.db.write(async () => (await this.db.get<PlanExercise>('plan_exercises').find(planExerciseId)).markAsDeleted());
      return;
    }
    if (!this.supabase) {
      throw new Error('Supabase client not configured in WorkoutRepository');
    }
    const { error } = await this.supabase.from('plan_exercises').delete().eq('id', planExerciseId);
    if (error) throw error;
  }

  /** Swaps which exercise a plan entry points at; sets/reps/notes/etc. stay put. */
  async replacePlanExercise(planExerciseId: string, newExerciseId: string): Promise<void> {
    if (this.hasLocalPlanDb()) {
      await this.db.write(async () => (await this.db.get<PlanExercise>('plan_exercises').find(planExerciseId)).update(row => { row.exercise_id = newExerciseId; }));
      return;
    }
    if (!this.supabase) {
      throw new Error('Supabase client not configured in WorkoutRepository');
    }
    const { error } = await this.supabase
      .from('plan_exercises')
      .update({ exercise_id: newExerciseId })
      .eq('id', planExerciseId);
    if (error) throw error;
  }

  async reorderPlanExercises(items: Array<{ id: string; orderIndex: number }>): Promise<void> {
    if (this.hasLocalPlanDb()) {
      await this.db.write(async () => {
        for (const item of items) await (await this.db.get<PlanExercise>('plan_exercises').find(item.id)).update(row => { row.order_index = item.orderIndex; });
      });
      return;
    }
    if (!this.supabase) {
      throw new Error('Supabase client not configured in WorkoutRepository');
    }
    const results = await Promise.all(
      items.map(item =>
        this.supabase.from('plan_exercises').update({ order_index: item.orderIndex }).eq('id', item.id)
      )
    );
    const failed = results.find(r => r.error);
    if (failed?.error) throw failed.error;
  }

  async updatePlanExerciseConfig(planExerciseId: string, config: PlanExerciseConfig): Promise<void> {
    if (this.hasLocalPlanDb()) {
      await this.db.write(async () => (await this.db.get<PlanExercise>('plan_exercises').find(planExerciseId)).update(row => {
        if (config.sets !== undefined) row.sets = config.sets;
        if (config.reps !== undefined) row.reps = config.reps;
        if (config.weight !== undefined) row.weight = config.weight;
        if (config.targetRpe !== undefined) row.target_rpe = config.targetRpe;
        if (config.restSeconds !== undefined) row.rest_seconds = config.restSeconds;
        if (config.notes !== undefined) row.notes = config.notes;
        if (config.warmupSets !== undefined) row.warmup_sets = config.warmupSets;
        if (config.isDropset !== undefined) row.is_dropset = config.isDropset;
        if (config.supersetGroup !== undefined) row.superset_group = config.supersetGroup || undefined;
      }));
      return;
    }
    if (!this.supabase) {
      throw new Error('Supabase client not configured in WorkoutRepository');
    }
    const patch = configToPatch(config);
    const { error } = await this.supabase.from('plan_exercises').update(patch).eq('id', planExerciseId);
    if (error) throw error;
  }

  private createLocalPlanExercise(planDayId: string, exerciseId: string, orderIndex: number, config: PlanExerciseConfig, now: number) {
    return this.db.get<PlanExercise>('plan_exercises').create(row => {
      row.plan_day_id = planDayId; row.exercise_id = exerciseId; row.order_index = orderIndex;
      row.sets = config.sets ?? '3'; row.reps = config.reps ?? '10'; row.weight = config.weight;
      row.target_rpe = config.targetRpe; row.rest_seconds = config.restSeconds; row.notes = config.notes;
      row.warmup_sets = config.warmupSets ?? 0; row.is_dropset = config.isDropset ?? false;
      row.superset_group = config.supersetGroup || undefined;
      (row as any)._raw.created_at = now; (row as any)._raw.updated_at = now;
    });
  }
}

export interface PlanExerciseConfig {
  sets?: string;
  reps?: string;
  weight?: string;
  targetRpe?: number;
  restSeconds?: number;
  notes?: string;
  warmupSets?: number;
  isDropset?: boolean;
  supersetGroup?: string | null;
}

function configToPatch(config: PlanExerciseConfig): Record<string, any> {
  const patch: Record<string, any> = {};
  if (config.sets !== undefined) patch.sets = config.sets;
  if (config.reps !== undefined) patch.reps = config.reps;
  if (config.weight !== undefined) patch.weight = config.weight;
  if (config.targetRpe !== undefined) patch.target_rpe = config.targetRpe;
  if (config.restSeconds !== undefined) patch.rest_seconds = config.restSeconds;
  if (config.notes !== undefined) patch.notes = config.notes;
  if (config.warmupSets !== undefined) patch.warmup_sets = config.warmupSets;
  if (config.isDropset !== undefined) patch.is_dropset = config.isDropset;
  if (config.supersetGroup !== undefined) patch.superset_group = config.supersetGroup;
  return patch;
}

function planExerciseRow(planDayId: string, ex: { exerciseId: string } & PlanExerciseConfig, orderIndex: number) {
  return {
    plan_day_id: planDayId,
    exercise_id: ex.exerciseId,
    sets: ex.sets ?? '3',
    reps: ex.reps ?? '10',
    weight: ex.weight ?? null,
    target_rpe: ex.targetRpe ?? null,
    rest_seconds: ex.restSeconds ?? null,
    notes: ex.notes ?? null,
    warmup_sets: ex.warmupSets ?? 0,
    is_dropset: ex.isDropset ?? false,
    superset_group: ex.supersetGroup ?? null,
    order_index: orderIndex,
  };
}

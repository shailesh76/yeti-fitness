import { Database, Q } from '@nozbe/watermelondb';
import { Workout } from '../models/Workout';
import { WorkoutSession } from '../models/WorkoutSession';
import { SessionSet } from '../models/SessionSet';
import { PersonalRecord } from '../models/PersonalRecord';

export class WorkoutRepository {
  private db: Database;
  private supabase?: any;

  constructor(db: Database, supabase?: any) {
    this.db = db;
    this.supabase = supabase;
  }

  // --- Routine Templates ---

  async createWorkout(name: string, dayId?: string): Promise<Workout> {
    return await this.db.write(async () => {
      return await this.db.get<Workout>('workouts').create(workout => {
        workout.name = name;
        if (dayId) workout.day_id = dayId;
      });
    });
  }

  async updateWorkout(id: string, updates: Partial<{name: string}>): Promise<void> {
    await this.db.write(async () => {
      const workout = await this.db.get<Workout>('workouts').find(id);
      await workout.update(w => {
        if (updates.name) w.name = updates.name;
      });
    });
  }

  async deleteWorkout(id: string): Promise<void> {
    await this.db.write(async () => {
      const workout = await this.db.get<Workout>('workouts').find(id);
      await workout.markAsDeleted();
    });
  }

  async getWorkouts(): Promise<Workout[]> {
    return await this.db.get<Workout>('workouts').query().fetch();
  }

  // --- Workout Session Lifecycle ---

  async createWorkoutSession(
    userId: string, 
    name: string, 
    planDayId?: string, 
    assignmentId?: string
  ): Promise<WorkoutSession> {
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

  async getWorkoutHistory(userId: string): Promise<WorkoutSession[]> {
    return await this.db.get<WorkoutSession>('workout_sessions')
      .query(
        Q.where('user_id', userId),
        Q.where('status', 'completed'),
        Q.sortBy('finished_at', Q.desc)
      )
      .fetch();
  }

  async getPersonalRecords(userId: string): Promise<PersonalRecord[]> {
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
              id, sets, reps, weight, order_index, exercise:exercises(*)
            )
          )
        )
      `)
      .eq('athlete_id', userId)
      .order('assigned_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async createWorkoutPlanRemote(userId: string, name: string, exercises: any[]): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase client not configured in WorkoutRepository');
    }
    
    // 1. Create the plan
    const { data: planData, error: planError } = await this.supabase
      .from('workout_plans')
      .insert({ user_id: userId, name })
      .select()
      .single();

    if (planError) throw planError;

    // 2. Insert exercises
    if (exercises.length > 0) {
      const exercisesToInsert = exercises.map((ex, index) => ({
        workout_plan_id: planData.id,
        exercise_id: ex.exercise_id,
        sets: ex.sets || 3,
        reps: ex.reps || 10,
        rest_seconds: ex.rest_seconds || 60,
        order_index: index,
      }));

      const { error: exercisesError } = await this.supabase
        .from('workout_plan_exercises')
        .insert(exercisesToInsert);

      if (exercisesError) throw exercisesError;
    }
  }
}

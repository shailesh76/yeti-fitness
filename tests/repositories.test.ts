import { describe, it, expect, vi } from 'vitest';
import { ProgressionEngine } from '@yeti/training-engine';
import { EventRepository } from '../packages/database/src/repositories/EventRepository';
import { MessagingRepository } from '../packages/database/src/repositories/MessagingRepository';
import { ExerciseRepository } from '../packages/database/src/repositories/ExerciseRepository';
import { WorkoutRepository } from '../packages/database/src/repositories/WorkoutRepository';

// 1. ProgressionEngine Unit Tests
describe('ProgressionEngine', () => {
  it('should recommend increasing weight when all sets meet target reps with low RPE', () => {
    const result = ProgressionEngine.evaluate({
      exercise: 'Bench Press',
      previousWeight: 100,
      previousReps: [8, 8, 8],
      sets: 3,
      averageRPE: 7.5,
      volume: 2400,
    });

    expect(result.action).toBe('INCREASE_WEIGHT');
    expect(result.suggestedWeight).toBe(102.5);
    expect(result.suggestedReps).toEqual([8, 8, 8]);
    expect(result.reasoning).toContain('Target reps achieved');
  });

  it('should recommend a deload when average RPE is too high', () => {
    const result = ProgressionEngine.evaluate({
      exercise: 'Squat',
      previousWeight: 140,
      previousReps: [8, 7, 6],
      sets: 3,
      averageRPE: 9.8,
      volume: 2940,
    });

    expect(result.action).toBe('DELOAD');
    expect(result.suggestedWeight).toBe(126); // 140 * 0.9
  });

  it('should recommend a deload when recovery score is critically low', () => {
    const result = ProgressionEngine.evaluate({
      exercise: 'Deadlift',
      previousWeight: 180,
      previousReps: [5, 5, 5],
      sets: 3,
      averageRPE: 8.0,
      volume: 2700,
      recoveryScore: 30, // low recovery
    });

    expect(result.action).toBe('DELOAD');
    expect(result.suggestedWeight).toBe(162);
  });
});

// 2. AI Coach Premium Limit Helper Unit Tests
function evaluatePremiumAccess(currentRequests: number, isPremium: boolean): { allowed: boolean; error?: string } {
  if (!isPremium && currentRequests >= 5) {
    return {
      allowed: false,
      error: 'AI Coach daily limit reached for free tier. Upgrade to Yeti Pro to get unlimited coaching!'
    };
  }
  return { allowed: true };
}

describe('AI Coach Premium Enforcement', () => {
  it('should block free tier users if they exceed 5 requests', () => {
    const result = evaluatePremiumAccess(5, false);
    expect(result.allowed).toBe(false);
    expect(result.error).toContain('limit reached');
  });

  it('should allow free tier users under 5 requests', () => {
    const result = evaluatePremiumAccess(3, false);
    expect(result.allowed).toBe(true);
  });

  it('should always allow premium users', () => {
    const result = evaluatePremiumAccess(10, true);
    expect(result.allowed).toBe(true);
  });
});

// 3. Repository and Supabase/Watermelon DB integration mocks
describe('Repository Mocks and Security Isolation', () => {
  it('EventRepository should log activities to Supabase client', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null })
    };

    const mockDb = {} as any; // Watermelon mock
    const eventRepo = new EventRepository(mockDb, mockSupabase);

    await eventRepo.logActivity('user-123', 'workout_completed', { volume: 5000 });

    expect(mockSupabase.from).toHaveBeenCalledWith('activity_logs');
    expect(mockSupabase.insert).toHaveBeenCalledWith({
      user_id: 'user-123',
      event_name: 'workout_completed',
      metadata: { volume: 5000 }
    });
  });

  it('EventRepository should log errors to centralized DB securely', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null })
    };

    const mockDb = {} as any;
    const eventRepo = new EventRepository(mockDb, mockSupabase);

    await eventRepo.logError('user-123', 'SyncService', 'Database lock timeout', 'Error: lock timeout\n  at sync()');

    expect(mockSupabase.from).toHaveBeenCalledWith('error_logs');
    expect(mockSupabase.insert).toHaveBeenCalledWith({
      user_id: 'user-123',
      context: 'SyncService',
      error_message: 'Database lock timeout',
      stack_trace: 'Error: lock timeout\n  at sync()'
    });
  });

  it('MessagingRepository should query correct direct conversations', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'conv-abc', athlete_id: 'athlete-1', coach_id: 'coach-2' },
        error: null
      })
    };

    const mockDb = {} as any;
    const msgRepo = new MessagingRepository(mockDb, mockSupabase);

    const conv = await msgRepo.getOrCreateDirectConversation('athlete-1', 'coach-2');
    expect(conv.id).toBe('conv-abc');
    expect(mockSupabase.from).toHaveBeenCalledWith('conversations');
  });
});

// 4. Step 4.4: ExerciseRepository.getRelations / getGuidance (new functionality)
describe('ExerciseRepository.getRelations', () => {
  it('returns empty variations/alternatives when supabase is not configured', async () => {
    const repo = new ExerciseRepository({} as any, undefined);
    const result = await repo.getRelations('ex-1');
    expect(result).toEqual({ variations: [], alternatives: [] });
  });

  it('returns empty variations/alternatives when the relations query errors', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } }),
    };
    const repo = new ExerciseRepository({} as any, mockSupabase);
    const result = await repo.getRelations('ex-1');
    expect(result).toEqual({ variations: [], alternatives: [] });
  });

  it('splits relation rows by type and resolves each to a full exercise via local db lookup', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [
          { related_exercise_id: 'var-1', relation_type: 'variation' },
          { related_exercise_id: 'alt-1', relation_type: 'alternative' },
          { related_exercise_id: 'alt-2', relation_type: 'alternative' },
        ],
        error: null,
      }),
    };
    const exercisesById: Record<string, any> = {
      'var-1': { id: 'var-1', name: 'Variation One' },
      'alt-1': { id: 'alt-1', name: 'Alternative One' },
      'alt-2': { id: 'alt-2', name: 'Alternative Two' },
    };
    const mockDb = {
      get: vi.fn().mockReturnValue({
        find: vi.fn((id: string) => Promise.resolve(exercisesById[id])),
      }),
    };
    const repo = new ExerciseRepository(mockDb as any, mockSupabase);

    const result = await repo.getRelations('ex-1');
    expect(mockSupabase.from).toHaveBeenCalledWith('exercise_relations');
    expect(mockSupabase.eq).toHaveBeenCalledWith('exercise_id', 'ex-1');
    expect(result.variations.map(e => e.id)).toEqual(['var-1']);
    expect(result.alternatives.map(e => e.id).sort()).toEqual(['alt-1', 'alt-2']);
  });
});

describe('ExerciseRepository.getGuidance', () => {
  it('throws when supabase is not configured', async () => {
    const repo = new ExerciseRepository({} as any, undefined);
    await expect(repo.getGuidance('ex-1', 'form_explanation')).rejects.toThrow();
  });

  it('invokes the exercise-guidance function and returns the generated text', async () => {
    const mockSupabase = {
      functions: {
        invoke: vi.fn().mockResolvedValue({ data: { text: 'Keep your back straight.', guidanceType: 'form_explanation' }, error: null }),
      },
    };
    const repo = new ExerciseRepository({} as any, mockSupabase);

    const text = await repo.getGuidance('ex-1', 'form_explanation');
    expect(text).toBe('Keep your back straight.');
    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('exercise-guidance', {
      body: { exerciseId: 'ex-1', guidanceType: 'form_explanation' },
    });
  });

  it('throws when the edge function returns an error', async () => {
    const mockSupabase = {
      functions: {
        invoke: vi.fn().mockResolvedValue({ data: null, error: { message: 'daily limit reached' } }),
      },
    };
    const repo = new ExerciseRepository({} as any, mockSupabase);
    await expect(repo.getGuidance('ex-1', 'common_mistakes')).rejects.toBeTruthy();
  });
});

// 5. Step 4.5: WorkoutRepository athlete workout builder (new functionality)
describe('WorkoutRepository — athlete workout builder (Step 4.5)', () => {
  /** Builds a mock supabase client where each table gets its own chainable stub. */
  function buildMockSupabase(overrides: Record<string, any> = {}) {
    const calls: string[] = [];
    const tableStubs: Record<string, any> = {
      workout_plans: {
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'plan-1' }, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        then: undefined,
      },
      plan_days: {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'day-1' }, error: null }),
      },
      plan_exercises: {
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      },
      ...overrides,
    };
    const from = vi.fn((table: string) => {
      calls.push(table);
      if (!tableStubs[table]) throw new Error(`Unmocked table: ${table}`);
      return tableStubs[table];
    });
    return { from, calls, tableStubs };
  }

  it('createOwnWorkoutPlan writes workout_plans -> plan_days -> plan_exercises, never workout_plan_exercises', async () => {
    const mockSupabase = buildMockSupabase();
    const repo = new WorkoutRepository({} as any, mockSupabase);

    const result = await repo.createOwnWorkoutPlan('user-1', 'Push Day', 'focus on chest', [
      { exerciseId: 'ex-1', sets: '4', reps: '8', targetRpe: 8 },
    ]);

    expect(result).toEqual({ planId: 'plan-1', planDayId: 'day-1' });
    expect(mockSupabase.calls).toContain('workout_plans');
    expect(mockSupabase.calls).toContain('plan_days');
    expect(mockSupabase.calls).toContain('plan_exercises');
    expect(mockSupabase.calls).not.toContain('workout_plan_exercises');

    expect(mockSupabase.tableStubs.workout_plans.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', name: 'Push Day', notes: 'focus on chest' })
    );
    expect(mockSupabase.tableStubs.plan_exercises.insert).toHaveBeenCalledWith([
      expect.objectContaining({ plan_day_id: 'day-1', exercise_id: 'ex-1', sets: '4', reps: '8', target_rpe: 8, order_index: 0 }),
    ]);
  });

  it('fetchOwnWorkoutPlanById reopens a saved template by id, scoped to self-authored plans', async () => {
    const savedPlan = {
      id: 'plan-1',
      name: 'Push Day',
      notes: 'focus on chest',
      days: [{ id: 'day-1', exercises: [{ id: 'pe-1', exercise_id: 'ex-1', sets: '4', order_index: 0 }] }],
    };
    const mockSupabase = buildMockSupabase({
      workout_plans: {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: savedPlan, error: null }),
      },
    });
    const repo = new WorkoutRepository({} as any, mockSupabase);

    const reopened = await repo.fetchOwnWorkoutPlanById('plan-1');
    expect(reopened).toEqual(savedPlan);
    expect(mockSupabase.calls).not.toContain('workout_plan_exercises');
  });

  it('reorderPlanExercises updates order_index for every item and touches only plan_exercises', async () => {
    const mockSupabase = buildMockSupabase();
    const repo = new WorkoutRepository({} as any, mockSupabase);

    await repo.reorderPlanExercises([
      { id: 'pe-1', orderIndex: 1 },
      { id: 'pe-2', orderIndex: 0 },
    ]);

    expect(mockSupabase.tableStubs.plan_exercises.update).toHaveBeenCalledWith({ order_index: 1 });
    expect(mockSupabase.tableStubs.plan_exercises.update).toHaveBeenCalledWith({ order_index: 0 });
    expect(mockSupabase.calls.every((t: string) => t === 'plan_exercises')).toBe(true);
  });

  it('replacePlanExercise swaps only exercise_id, leaving sets/reps/config untouched', async () => {
    const mockSupabase = buildMockSupabase();
    const repo = new WorkoutRepository({} as any, mockSupabase);

    await repo.replacePlanExercise('pe-1', 'ex-2');

    expect(mockSupabase.tableStubs.plan_exercises.update).toHaveBeenCalledWith({ exercise_id: 'ex-2' });
    expect(mockSupabase.calls).toEqual(['plan_exercises']);
  });

  it('removePlanExercise deletes the row and never touches workout_plan_exercises', async () => {
    const mockSupabase = buildMockSupabase();
    const repo = new WorkoutRepository({} as any, mockSupabase);

    await repo.removePlanExercise('pe-1');

    expect(mockSupabase.tableStubs.plan_exercises.delete).toHaveBeenCalled();
    expect(mockSupabase.calls).toEqual(['plan_exercises']);
  });

  it('updatePlanExerciseConfig maps sets/reps/RPE/rest/notes/warmup/dropset/superset to their columns', async () => {
    const mockSupabase = buildMockSupabase();
    const repo = new WorkoutRepository({} as any, mockSupabase);

    await repo.updatePlanExerciseConfig('pe-1', {
      sets: '5', reps: '5', weight: '100kg', targetRpe: 9, restSeconds: 120,
      notes: 'last set to failure', warmupSets: 2, isDropset: true, supersetGroup: 'group-a',
    });

    expect(mockSupabase.tableStubs.plan_exercises.update).toHaveBeenCalledWith({
      sets: '5', reps: '5', weight: '100kg', target_rpe: 9, rest_seconds: 120,
      notes: 'last set to failure', warmup_sets: 2, is_dropset: true, superset_group: 'group-a',
    });
  });

  it('addPlanExercise inserts a new row scoped to plan_exercises only', async () => {
    const mockSupabase = buildMockSupabase({
      plan_exercises: {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'pe-2' }, error: null }),
      },
    });
    const repo = new WorkoutRepository({} as any, mockSupabase);

    const created = await repo.addPlanExercise('day-1', 'ex-3', 2, { sets: '3', reps: '12' });
    expect(created).toEqual({ id: 'pe-2' });
    expect(mockSupabase.calls).toEqual(['plan_exercises']);
  });

  it('fetchWorkoutPlansRemote (coach-assigned plans) is unchanged and still queries assigned_plans', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const repo = new WorkoutRepository({} as any, mockSupabase);
    await repo.fetchWorkoutPlansRemote('athlete-1');
    expect(mockSupabase.from).toHaveBeenCalledWith('assigned_plans');
  });
});

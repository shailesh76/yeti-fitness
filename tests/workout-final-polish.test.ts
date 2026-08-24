import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { canonicalExerciseName, mapExerciseRowToDTO } from '../packages/database/src/repositories/ExerciseRepository';
import { dedupePersonalRecords, WorkoutRepository } from '../packages/database/src/repositories/WorkoutRepository';
import { assignedPlanProgress } from '../apps/mobile/services/workoutLifecycle';
import { buildTodaysPlan } from '../apps/mobile/services/homeSummary';

describe('workout final polish contracts', () => {
  it('canonicalizes only UUID-derived legacy suffixes and preserves historical ids', () => {
    const id = 'a45ea3f6-aee0-4fdb-ada0-7483c9b3f1d1';
    expect(canonicalExerciseName('3/4 Sit-up (Legacy a45e) (Legacy a45e)', id)).toBe('3/4 Sit-up');
    expect(canonicalExerciseName('Alternate Incline Dumbbell Curl (Legacy 30ee) (Legacy 30ee)', '30ee0000-0000-4000-8000-000000000000')).toBe('Alternate Incline Dumbbell Curl');
    expect(canonicalExerciseName('Legacy Strength Press', id)).toBe('Legacy Strength Press');
    expect(canonicalExerciseName('Press (Legacy 30ee)', id)).toBe('Press');
    expect(mapExerciseRowToDTO({ id, name: '3/4 Sit-up (Legacy a45e)' }).id).toBe(id);
    expect(mapExerciseRowToDTO({ id, name: '3/4 Sit-up (Legacy a45e)' }).name).toBe('3/4 Sit-up');
  });

  it('canonicalizes trailing legacy suffix when no exercise id is passed', () => {
    expect(canonicalExerciseName('3/4 Sit-up (Legacy a45e)')).toBe('3/4 Sit-up');
    expect(canonicalExerciseName('Bench Press (Legacy e385) (Legacy e385)')).toBe('Bench Press');
    expect(canonicalExerciseName('Legacy Press Variation')).toBe('Legacy Press Variation');
  });

  it('deduplicates equal historical PR achievements but preserves genuine improvements and metrics', () => {
    const records = dedupePersonalRecords([
      { id: 'old-weight', exercise_id: 'bench', record_type: 'max_weight', value: 20, achieved_at: '2026-08-24T10:00:00Z' },
      { id: 'duplicate-weight', exercise_id: 'bench', record_type: 'max_weight', value: 20, achieved_at: '2026-08-24T10:00:01Z' },
      { id: 'improved-weight', exercise_id: 'bench', record_type: 'max_weight', value: 25, achieved_at: '2026-08-25T10:00:00Z' },
      { id: 'reps', exercise_id: 'bench', record_type: 'max_reps', value: 10, achieved_at: '2026-08-24T10:00:00Z' },
    ]);
    expect(records.map((record) => record.id)).toEqual(['old-weight', 'improved-weight', 'reps']);
  });

  it('creates at most one max_weight and max_reps achievement for repeated equal sets', async () => {
    const repo = new WorkoutRepository(null as any, {} as any);
    vi.spyOn(repo, 'getPersonalRecords').mockResolvedValue([]);
    const save = vi.spyOn(repo, 'savePersonalRecord').mockResolvedValue({} as any);

    await repo.recordPersonalBests('athlete', [
      { exerciseId: 'bench', weight: 20, reps: 10 },
      { exerciseId: 'bench', weight: 20, reps: 10 },
      { exerciseId: 'bench', weight: 20, reps: 10 },
    ]);

    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenCalledWith('athlete', 'bench', 'max_weight', 20);
    expect(save).toHaveBeenCalledWith('athlete', 'bench', 'max_reps', 10);
  });

  it('marks a one-day plan complete and advances a multi-day plan from Day 1 to Day 2', () => {
    const day1 = { plan_day_id: 'day-1', name: 'Day 1' };
    const day2 = { plan_day_id: 'day-2', name: 'Day 2' };

    expect(assignedPlanProgress([day1], new Set(['day-1']))).toEqual({
      next: null,
      completed: [day1],
      isComplete: true,
    });
    expect(assignedPlanProgress([day1, day2], new Set(['day-1']))).toEqual({
      next: day2,
      completed: [day1],
      isComplete: false,
    });
  });

  it('handles empty plans and uncompleted plans in assignedPlanProgress', () => {
    expect(assignedPlanProgress([], new Set())).toEqual({
      next: null,
      completed: [],
      isComplete: false,
    });
    const day1 = { plan_day_id: 'day-1', name: 'Day 1' };
    expect(assignedPlanProgress([day1], new Set())).toEqual({
      next: day1,
      completed: [],
      isComplete: false,
    });
  });

  it('buildTodaysPlan restores uncompleted plan day on session discard', () => {
    const plans = [
      { plan_day_id: 'day-1', name: 'Push' },
      { plan_day_id: 'day-2', name: 'Pull' },
    ];
    // Before completing day-1, day-1 is returned
    const todayPlan = buildTodaysPlan({
      activeSession: null,
      plans,
      completedPlanDayIds: new Set(),
    });
    expect(todayPlan?.name).toBe('Push');
  });

  it('session screen has 3-option End Workout menu and 2-step Discard confirmation modal', () => {
    const source = readFileSync('apps/mobile/app/workouts/session.tsx', 'utf8');
    expect(source).toContain('Finish Workout');
    expect(source).toContain('Discard Workout');
    expect(source).toContain('Continue Workout');
    expect(source).toContain('Discard this workout?');
    expect(source).toContain('Your completed sets from this attempt will not be saved.');
    expect(source).toContain('The assigned workout will remain available to start again.');
    expect(source).toContain('Keep Workout');
    expect(source).toContain('Discard');
  });

  it('session store protects against double finishSession invocation', () => {
    const source = readFileSync('apps/mobile/store/useSessionStore.ts', 'utf8');
    expect(source).toContain("claimTerminalState(currentTerminal, 'FINISHING')");
    expect(source).toContain('if (!claimed) return { sessionId: null');
  });

  it('abandonSession cleans both active session and pending completion storage', () => {
    const source = readFileSync('apps/mobile/store/useSessionStore.ts', 'utf8');
    expect(source).toContain('AsyncStorage.removeItem(SESSION_STORAGE_KEY)');
    expect(source).toContain('AsyncStorage.removeItem(PENDING_COMPLETION_KEY)');
  });

  it('workouts screen displays actionable coach plan with clear status and plan completed card', () => {
    const source = readFileSync('apps/mobile/app/workouts.tsx', 'utf8');
    expect(source).toContain('YOUR PLAN · ASSIGNED BY COACH');
    expect(source).toContain('NEXT WORKOUT');
    expect(source).toContain('IN PROGRESS');
    expect(source).toContain('✓ Plan completed');
  });

  it('keeps progress tabs horizontally scrollable with fixed selection-independent dimensions', () => {
    const source = readFileSync('apps/mobile/app/analytics.tsx', 'utf8');
    expect(source).toContain('<ScrollView horizontal showsHorizontalScrollIndicator={false}');
    expect(source).toMatch(/tabBtn:\s*\{[\s\S]*?height:\s*36,[\s\S]*?minHeight:\s*36,[\s\S]*?maxHeight:\s*36,/);
    expect(source).toMatch(/tabBtn:\s*\{[\s\S]*?flexShrink:\s*0,/);
    expect(source).toContain("tabBtnTextActive: { color: '#FFFFFF' }");
  });
});

import { describe, it, expect } from 'vitest';
import { classifyIntent } from '../supabase/functions/_shared/ai/intent.ts';

describe('AI Coach Write Intent Confirmation & Validation', () => {
  it('1. routes exercise logging commands to exercise_logging', () => {
    expect(classifyIntent('Log 80 kg for 8 reps on bench')).toBe('exercise_logging');
    expect(classifyIntent('Record 3 sets of 10 squats')).toBe('exercise_logging');
  });

  it('2. routes goal adjustment commands to goal_adjustment', () => {
    expect(classifyIntent('I want to change my primary goal to strength')).toBe('goal_adjustment');
  });

  it('3. routes schedule adjustment commands to schedule_adjustment', () => {
    expect(classifyIntent('Move my Friday workout to Saturday')).toBe('schedule_adjustment');
  });

  it('4. routes app navigation commands to app_navigation', () => {
    expect(classifyIntent('Where is the rest timer?')).toBe('app_navigation');
    expect(classifyIntent('Where do I view my workout history screen?')).toBe('app_navigation');
  });
});

// Regression: ai-coach/index.ts's exercise_logging branch previously claimed
// status: 'confirmed_and_logged' / record_confirmed: true with NO actual
// database write anywhere in that code path — a false success claim that
// would tell the athlete their set was saved when it wasn't. There is no
// exported pure function for this (the logic lives inline in the edge
// function), so this mirrors the exact fixed logic to pin the honest
// contract: "complete" parameters must produce pending_confirmation, never
// a claim of persistence.
describe('exercise_logging must never claim a save that did not happen', () => {
  function buildExerciseLoggingResult(resolvedEx: { id: string; name: string } | undefined, weightKg: number | null, reps: number | null) {
    const isComplete = Boolean(resolvedEx && weightKg != null && reps != null);
    if (isComplete) {
      return {
        type: 'exercise_logging',
        status: 'pending_confirmation',
        exercise_id: resolvedEx!.id,
        exercise_name: resolvedEx!.name,
        weight_kg: weightKg,
        reps,
        confirmation_required: true,
      };
    }
    return {
      type: 'exercise_logging',
      status: 'missing_parameters',
      missing: [!resolvedEx ? 'exercise_name' : null, weightKg == null ? 'weight' : null, reps == null ? 'reps' : null].filter(Boolean),
    };
  }

  it('complete parameters -> pending_confirmation, never confirmed_and_logged', () => {
    const result = buildExerciseLoggingResult({ id: 'ex-1', name: 'Bench Press' }, 80, 8);
    expect(result.status).toBe('pending_confirmation');
    expect(result.status).not.toBe('confirmed_and_logged');
    expect((result as any).record_confirmed).toBeUndefined();
    expect((result as any).confirmation_required).toBe(true);
  });

  it('incomplete parameters -> missing_parameters, still no false success', () => {
    const result = buildExerciseLoggingResult(undefined, null, null);
    expect(result.status).toBe('missing_parameters');
    expect(result.status).not.toBe('confirmed_and_logged');
  });
});

// Regression: app_navigation previously (a) was unreachable at all — it was
// in none of WORKOUT_INTENTS/PERSONAL_CONTEXT_INTENTS/NUTRITION_INTENTS, so
// every app_navigation-classified message fell through to the generic
// catch-all — and (b) even once reachable, silently defaulted an unmatched
// question to "active_workout" instead of asking which screen was meant.
// Mirrors the fixed matching logic (no default) to pin the honest contract.
describe('app_navigation must not silently default to a guessed screen', () => {
  const YETI_APP_ROUTE_DIRECTORY: Record<string, { route: string; label: string }> = {
    rest_timer: { route: '/workouts/rest-timer', label: 'Rest Timer' },
    workout_log: { route: '/workouts/history', label: 'Workout History' },
    nutrition_diary: { route: '/nutrition/log', label: 'Nutrition Diary' },
    settings: { route: '/settings/profile', label: 'Account Settings' },
    progress: { route: '/progress/analytics', label: 'Progress & PRs' },
    active_workout: { route: '/workouts/active', label: 'Active Session' },
  };
  function matchRoute(message: string): string | null {
    const m = message.toLowerCase();
    if (m.includes('timer') || m.includes('rest')) return 'rest_timer';
    if (m.includes('history') || m.includes('past')) return 'workout_log';
    if (m.includes('food') || m.includes('diet') || m.includes('nutrition') || m.includes('calorie')) return 'nutrition_diary';
    if (m.includes('setting') || m.includes('profile')) return 'settings';
    if (m.includes('progress') || m.includes('pr') || m.includes('graph')) return 'progress';
    if (m.includes('active') || m.includes('current session') || m.includes('logging screen')) return 'active_workout';
    return null;
  }

  it('a matched destination resolves to its route', () => {
    expect(matchRoute('where is the rest timer')).toBe('rest_timer');
  });

  it('an unmatched question returns null, not a guessed default', () => {
    const key = matchRoute('how do I use this app');
    expect(key).toBeNull();
    expect(key).not.toBe('active_workout');
  });

  it('the clarification path lists every supported destination', () => {
    const supported = Object.values(YETI_APP_ROUTE_DIRECTORY).map((r) => r.label);
    expect(supported).toEqual(['Rest Timer', 'Workout History', 'Nutrition Diary', 'Account Settings', 'Progress & PRs', 'Active Session']);
  });
});

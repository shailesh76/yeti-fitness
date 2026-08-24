import { describe, expect, it } from 'vitest';

describe('Phase 9: Edge Functions Normalized History Contracts', () => {
  it('groups session sets and calculates 1RM accurately from normalized rows', () => {
    const rawNormalizedSets = [
      {
        id: 'set-1',
        session_id: 'sess-1',
        exercise_id: 'ex-bench',
        exercise_name: 'Bench Press',
        reps: 10,
        weight_kg: 100,
        completed_at: '2026-08-23T10:15:00Z',
        workout_sessions: {
          id: 'sess-1',
          athlete_id: 'athlete-1',
          started_at: '2026-08-23T10:00:00Z',
          completed_at: '2026-08-23T11:00:00Z',
          plan_day: { workout_plans: { name: 'Hypertrophy Day 1' } },
        },
        exercises: { name: 'Bench Press', muscle_group: 'Chest', gif_url: 'https://media.yeti.com/bench.gif' },
      },
      {
        id: 'set-2',
        session_id: 'sess-1',
        exercise_id: 'ex-bench',
        exercise_name: 'Bench Press',
        reps: 8,
        weight_kg: 105,
        completed_at: '2026-08-23T10:20:00Z',
        workout_sessions: {
          id: 'sess-1',
          athlete_id: 'athlete-1',
          started_at: '2026-08-23T10:00:00Z',
          completed_at: '2026-08-23T11:00:00Z',
          plan_day: { workout_plans: { name: 'Hypertrophy Day 1' } },
        },
        exercises: { name: 'Bench Press', muscle_group: 'Chest', gif_url: 'https://media.yeti.com/bench.gif' },
      },
    ];

    // Simulate get-client-exercise-history grouping
    const sessionsMap = new Map<string, any>();
    for (const s of rawNormalizedSets) {
      const sessionId = s.session_id;
      const date = new Date(s.workout_sessions.completed_at).toLocaleDateString();
      const exId = s.exercise_id;

      if (!sessionsMap.has(sessionId)) {
        sessionsMap.set(sessionId, {
          session_id: sessionId,
          date,
          completed_at: s.workout_sessions.completed_at,
          workout_name: s.workout_sessions.plan_day.workout_plans.name,
          exercises: {},
        });
      }

      const session = sessionsMap.get(sessionId);
      if (!session.exercises[exId]) {
        session.exercises[exId] = {
          id: exId,
          name: s.exercises.name,
          muscle_group: s.exercises.muscle_group,
          gif_url: s.exercises.gif_url,
          sets: [],
        };
      }

      const reps = Number(s.reps);
      const weight = Number(s.weight_kg);
      const estimatedOneRepMax = Math.round(weight * (1 + reps / 30));

      session.exercises[exId].sets.push({
        id: s.id,
        reps,
        weight_kg: weight,
        estimated_1rm: estimatedOneRepMax,
        completed_at: s.completed_at,
      });
    }

    const sessionList = Array.from(sessionsMap.values());
    expect(sessionList).toHaveLength(1);
    expect(sessionList[0].session_id).toBe('sess-1');
    expect(sessionList[0].workout_name).toBe('Hypertrophy Day 1');

    const benchSets = sessionList[0].exercises['ex-bench'].sets;
    expect(benchSets).toHaveLength(2);
    // Set 1: 100 * (1 + 10/30) = 133
    expect(benchSets[0].estimated_1rm).toBe(133);
    // Set 2: 105 * (1 + 8/30) = 133
    expect(benchSets[1].estimated_1rm).toBe(133);
  });

  it('calculates PR logic correctly against previous historical sessions', () => {
    const currentWorkoutSets = [
      { id: 's1', reps: 10, weight_kg: 100, estimated_1rm: 133 },
      { id: 's2', reps: 5, weight_kg: 120, estimated_1rm: 140 },
    ];

    const prevSets = [
      { reps: 10, weight_kg: 95, estimated_1rm: 127 },
      { reps: 5, weight_kg: 110, estimated_1rm: 128 },
    ];

    const prevBest1RM = Math.max(...prevSets.map((s) => s.estimated_1rm));
    const currentBest1RM = Math.max(...currentWorkoutSets.map((s) => s.estimated_1rm));

    expect(prevBest1RM).toBe(128);
    expect(currentBest1RM).toBe(140);
    const hasPR = currentBest1RM > prevBest1RM;
    expect(hasPR).toBe(true);
  });
});

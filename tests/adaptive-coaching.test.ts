import { describe, it, expect } from 'vitest';
import { computeRawTelemetry, TelemetryInput } from '../supabase/functions/_shared/ai/weeklyReviewEngine.ts';
import { deriveCoachingIntelligence } from '../supabase/functions/_shared/ai/coachIntelligence.ts';
import { classifyIntent } from '../supabase/functions/_shared/ai/intent.ts';
import { foldMemoryRows, buildCoachMemoryCard } from '../supabase/functions/_shared/ai/coachMemory.ts';

describe('Adaptive Coaching & Weekly Review Engine — Raw Telemetry (`weeklyReviewEngine.ts`)', () => {
  it('1. computes adherence, volume trend, and healthy recovery for a good week', () => {
    const telemetry: TelemetryInput = {
      completedWorkouts: 4,
      prescribedWorkouts: 4,
      recentSessionsVolumeKg: [13000, 11500, 11000],

      recent1rmValues: [100, 102],
      bodyWeightLogsKg: [{ daysAgo: 0, weightKg: 80.5 }, { daysAgo: 14, weightKg: 79.5 }],
      avgSleepHours: 8,
      sorenessReported: false,
      stressReported: false,
      injuryReported: false,
      consumedCaloriesAvg: 2600,
      targetCalories: 2500,
      consumedProteinAvg: 170,
      targetProtein: 160,
      newPrsCount: 1,
      daysSinceLastWorkout: 1,
      goal: 'muscle_gain',
    };

    const res = computeRawTelemetry(telemetry);

    expect(res.adherencePct).toBe(100);
    expect(res.recoveryScore).toBeGreaterThanOrEqual(85);
    expect(res.recoveryStatus).toBe('fully_recovered');
    expect(res.volumeTrend).toBe('increasing');
    expect(res.weightTrendDirection).toBe('gaining');
    expect(res.progressStatus).toBe('progressing_well');
  });

  it('2. detects high fatigue and deload recommendation on low sleep, pain, and high strain', () => {
    const telemetry: TelemetryInput = {
      completedWorkouts: 5,
      prescribedWorkouts: 4,
      recentSessionsVolumeKg: [10000, 12000],
      recent1rmValues: [],
      bodyWeightLogsKg: [],
      avgSleepHours: 5,
      sorenessReported: true,
      stressReported: true,
      injuryReported: true,
      daysSinceLastWorkout: 0,
    };

    const res = computeRawTelemetry(telemetry);

    expect(res.recoveryScore).toBeLessThan(40);
    expect(res.recoveryStatus).toBe('deload_recommended');
  });

  it('3. detects weight stall on muscle gain goal', () => {
    const telemetry: TelemetryInput = {
      completedWorkouts: 4,
      prescribedWorkouts: 4,
      recentSessionsVolumeKg: [10000, 10000, 10000, 10000],
      recent1rmValues: [80, 80, 80],
      bodyWeightLogsKg: [{ daysAgo: 0, weightKg: 75.0 }, { daysAgo: 21, weightKg: 75.1 }],
      goal: 'muscle_gain',
    };

    const res = computeRawTelemetry(telemetry);

    expect(res.weightTrendDirection).toBe('maintaining');
    expect(res.progressStatus).toBe('plateau_detected');
  });
});

describe('Adaptive Coaching & Weekly Review Engine — Coaching Intelligence (`coachIntelligence.ts`)', () => {
  it('4. outputs HIGH confidence score when telemetry data points are rich', () => {
    const raw = computeRawTelemetry({
      completedWorkouts: 4,
      prescribedWorkouts: 4,
      recentSessionsVolumeKg: [10000, 9500],
      recent1rmValues: [],
      bodyWeightLogsKg: [{ daysAgo: 0, weightKg: 80 }, { daysAgo: 7, weightKg: 79.5 }, { daysAgo: 14, weightKg: 79 }],
      consumedCaloriesAvg: 2500,
      targetCalories: 2500,
      avgSleepHours: 8,
      newPrsCount: 2,
    });

    const intel = deriveCoachingIntelligence(raw, { goal: 'muscle_gain' });

    expect(intel.confidence.score).toBe('high');
    expect(intel.confidence.reason).toContain('workouts logged');
  });

  it('5. outputs LOW confidence score when data density is sparse (only 1 workout)', () => {
    const raw = computeRawTelemetry({
      completedWorkouts: 1,
      prescribedWorkouts: 4,
      recentSessionsVolumeKg: [2000],
      recent1rmValues: [],
      bodyWeightLogsKg: [],
    });

    const intel = deriveCoachingIntelligence(raw, { goal: 'general_fitness' });

    expect(intel.confidence.score).toBe('low');
    expect(intel.confidence.reason).toContain('Limited telemetry available');
  });

  it('6. ranks top 3 coaching priorities and identifies biggest limiting factor', () => {
    const raw = computeRawTelemetry({
      completedWorkouts: 2,
      prescribedWorkouts: 4,
      recentSessionsVolumeKg: [8000],
      recent1rmValues: [],
      bodyWeightLogsKg: [],
      avgSleepHours: 5.5,
      consumedProteinAvg: 90,
      targetProtein: 160,
      stressReported: true,
    });

    const intel = deriveCoachingIntelligence(raw, { goal: 'muscle_gain' });

    expect(intel.priorities.length).toBeLessThanOrEqual(3);
    expect(intel.priorities[0].rank).toBe(1);
    expect(intel.biggestLimitingFactor).not.toBeNull();
  });

  it('7. captures positive achievements for a stellar week', () => {
    const raw = computeRawTelemetry({
      completedWorkouts: 4,
      prescribedWorkouts: 4,
      recentSessionsVolumeKg: [15000, 14000],
      recent1rmValues: [120],
      bodyWeightLogsKg: [{ daysAgo: 0, weightKg: 81 }, { daysAgo: 7, weightKg: 80.5 }],
      newPrsCount: 2,
      consumedProteinAvg: 180,
      targetProtein: 170,
      avgSleepHours: 8,
    });

    const intel = deriveCoachingIntelligence(raw, { goal: 'muscle_gain' });

    expect(intel.positiveAchievements.length).toBeGreaterThanOrEqual(2);
    expect(intel.positiveAchievements.some((a) => a.includes('personal record'))).toBe(true);
    expect(intel.tone).toBe('high_energy_reinforcing');
  });

  it('8. triggers proactive missed-workout check-in when athlete has not logged for 4 days', () => {
    const raw = computeRawTelemetry({
      completedWorkouts: 1,
      prescribedWorkouts: 4,
      recentSessionsVolumeKg: [5000],
      recent1rmValues: [],
      bodyWeightLogsKg: [],
      daysSinceLastWorkout: 4,
    });

    const intel = deriveCoachingIntelligence(raw, { goal: 'general_fitness' });

    expect(intel.proactiveTrigger.type).toBe('missed_workouts');
    expect(intel.proactiveTrigger.message).toContain("haven't logged a workout in 4 days");
  });

  it('9. hard blocks load increases when recovery is poor or injury is reported', () => {
    const raw = computeRawTelemetry({
      completedWorkouts: 4,
      prescribedWorkouts: 4,
      recentSessionsVolumeKg: [10000],
      recent1rmValues: [],
      bodyWeightLogsKg: [],
      injuryReported: true,
    });

    const intel = deriveCoachingIntelligence(raw, { goal: 'strength' });

    expect(intel.loadIncreaseAllowed).toBe(false);
    expect(intel.safetyFlags.length).toBeGreaterThan(0);
  });
});

describe('Adaptive Coaching — Intent Classification', () => {
  it('10. routes weekly review queries to weekly_review', () => {
    expect(classifyIntent('Do my weekly review')).toBe('weekly_review');
    expect(classifyIntent('Weekly check-in time')).toBe('weekly_review');
    expect(classifyIntent('How was my progress this week?')).toBe('weekly_review');
  });

  it('11. routes lifestyle inputs to adaptive_coaching', () => {
    expect(classifyIntent('I only slept 5 hours')).toBe('adaptive_coaching');
    expect(classifyIntent('I missed Pull Day')).toBe('adaptive_coaching');
    expect(classifyIntent("I'm travelling")).toBe('adaptive_coaching');
    expect(classifyIntent("I've plateaued")).toBe('adaptive_coaching');
  });
});

describe('Adaptive Coaching — Evolved Coach Memory (`coachMemory.ts`)', () => {
  it('12. folds coaching observations, recovery patterns, and nutrition patterns', () => {
    const rows = [
      { category: 'coaching observations', memory_key: 'behavior_1', memory_value: 'Misses Pull workouts frequently' },
      { category: 'recovery patterns', memory_key: 'rec_1', memory_value: 'Recovers slowly after Leg Day' },
      { category: 'nutrition patterns', memory_key: 'nutr_1', memory_value: 'Often under-eats on weekends' },
    ];

    const folded = foldMemoryRows(rows);
    const card = buildCoachMemoryCard(folded);

    expect(folded.coachingObservations).toContain('Misses Pull workouts frequently');
    expect(folded.recoveryPatterns).toContain('Recovers slowly after Leg Day');
    expect(folded.nutritionPatterns).toContain('Often under-eats on weekends');
    expect(card).toContain('Coaching Observations: Misses Pull workouts frequently');
  });
});

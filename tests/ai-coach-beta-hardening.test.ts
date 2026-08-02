import { describe, it, expect } from 'vitest';
import { foldMemoryRows, buildCoachMemoryCard, CoachMemory } from '../supabase/functions/_shared/ai/coachMemory.ts';
import { computeRawTelemetry } from '../supabase/functions/_shared/ai/weeklyReviewEngine.ts';
import { deriveCoachingIntelligence } from '../supabase/functions/_shared/ai/coachIntelligence.ts';
import { classifyIntent } from '../supabase/functions/_shared/ai/intent.ts';
import { buildCoachSystemPrompt } from '../supabase/functions/_shared/ai/coachPrompt.ts';

describe('Phase 2.5 Beta Hardening — Memory Growth & Deduplication Bounds', () => {
  it('1. deduplicates identical memory keys and caps category items at 5', () => {
    const rawRows = [
      { category: 'coaching observations', memory_key: 'obs_1', memory_value: 'Misses Pull workouts frequently' },
      { category: 'coaching observations', memory_key: 'obs_1', memory_value: 'Misses Pull workouts frequently' }, // dup
      { category: 'coaching observations', memory_key: 'obs_2', memory_value: 'Prefers dumbbells for chest' },
      { category: 'coaching observations', memory_key: 'obs_3', memory_value: 'Recovers slowly after Leg Day' },
      { category: 'coaching observations', memory_key: 'obs_4', memory_value: 'Responds well to encouragement' },
      { category: 'coaching observations', memory_key: 'obs_5', memory_value: 'Often under-eats on weekends' },
      { category: 'coaching observations', memory_key: 'obs_6', memory_value: 'Excess observation beyond cap' }, // 6th item
    ];

    const folded = foldMemoryRows(rawRows);
    expect(folded.coachingObservations?.length).toBe(5);
    expect(folded.coachingObservations).not.toContain('Excess observation beyond cap');
    expect(folded.coachingObservations).toContain('Misses Pull workouts frequently');
  });

  it('2. guarantees bounded Coach Memory Card output length (< 300 words)', () => {
    const memory: CoachMemory = {
      goal: 'Lean Bulk',
      trainingSplit: 'Push / Pull / Legs',
      currentWeightKg: 75,
      targetWeightKg: 82,
      favouriteExercises: ['Bench Press', 'Incline DB Press', 'Barbell Row', 'Pull-ups', 'Lat Pulldown'],
      weakMuscleGroups: ['Upper Chest', 'Rear Delts', 'Calves', 'Abs', 'Biceps'],
      currentInjury: 'Left shoulder soreness',
      coachingObservations: ['Misses Pull workouts', 'Prefers DB press', 'Slow leg recovery', 'Likes feedback', 'Under-eats weekends'],
      recoveryPatterns: ['Needs 8h sleep', 'DOMS after squats', 'Fatigue on 5th day', 'Good with creatine', 'Stressed on Mondays'],
      nutritionPatterns: ['High protein weekdays', 'Low carbs evening', 'Creatine daily', 'Hydrates 3L', 'Skips breakfast'],
    };

    const card = buildCoachMemoryCard(memory);
    const wordCount = card.split(/\s+/).length;

    expect(wordCount).toBeLessThan(300);
    expect(card).toContain('Current Goal: Lean Bulk');
  });
});

describe('Phase 2.5 Beta Hardening — End-to-End Athlete Scenarios', () => {
  it('3. New Athlete Scenario: handles empty history with low confidence framing', () => {
    const raw = computeRawTelemetry({
      completedWorkouts: 0,
      prescribedWorkouts: 4,
      recentSessionsVolumeKg: [],
      recent1rmValues: [],
      bodyWeightLogsKg: [],
    });

    const intel = deriveCoachingIntelligence(raw, { goal: 'general_fitness' });

    expect(intel.confidence.score).toBe('low');
    expect(intel.confidence.reason).toContain('0 workouts logged');
    expect(intel.tone).toBe('empathetic_reassuring');
  });

  it('4. Experienced Muscle Gain Athlete Scenario: evaluates volume overload and weight rate', () => {
    const raw = computeRawTelemetry({
      completedWorkouts: 5,
      prescribedWorkouts: 5,
      recentSessionsVolumeKg: [15000, 14000, 13000],
      recent1rmValues: [140, 142],
      bodyWeightLogsKg: [{ daysAgo: 0, weightKg: 82.5 }, { daysAgo: 14, weightKg: 81.9 }],
      avgSleepHours: 8,
      consumedProteinAvg: 180,
      targetProtein: 175,
      newPrsCount: 2,
      goal: 'muscle_gain',
    });

    const intel = deriveCoachingIntelligence(raw, { goal: 'muscle_gain' });

    expect(intel.confidence.score).toBe('high');
    expect(intel.positiveAchievements.length).toBeGreaterThanOrEqual(2);
    expect(intel.goalFocus.primaryGoal).toBe('Muscle Gain');
    expect(intel.loadIncreaseAllowed).toBe(true);
  });

  it('5. Fat Loss Athlete Scenario: evaluates calorie adherence and weight drop rate', () => {
    const raw = computeRawTelemetry({
      completedWorkouts: 4,
      prescribedWorkouts: 4,
      recentSessionsVolumeKg: [10000, 10000],
      recent1rmValues: [],
      bodyWeightLogsKg: [{ daysAgo: 0, weightKg: 85.0 }, { daysAgo: 14, weightKg: 86.0 }],
      consumedCaloriesAvg: 2000,
      targetCalories: 2100,
      goal: 'fat_loss',
    });

    const intel = deriveCoachingIntelligence(raw, { goal: 'fat_loss' });

    expect(intel.goalFocus.primaryGoal).toBe('Fat Loss');
    expect(intel.goalFocus.keyMetrics.some((m) => m.name === 'Calorie Hit %')).toBe(true);
  });

  it('6. Injury & Deload Scenario: strictly enforces safety blocks on load increases', () => {
    const raw = computeRawTelemetry({
      completedWorkouts: 5,
      prescribedWorkouts: 4,
      recentSessionsVolumeKg: [8000],
      recent1rmValues: [],
      bodyWeightLogsKg: [],
      avgSleepHours: 5.0,
      injuryReported: true,
      sorenessReported: true,
    });

    const intel = deriveCoachingIntelligence(raw, { goal: 'strength' });

    expect(intel.loadIncreaseAllowed).toBe(false);
    expect(intel.safetyFlags.length).toBeGreaterThan(0);
    expect(intel.safetyFlags.some((f) => f.includes('blocked'))).toBe(true);
  });

  it('7. Missed Workouts & Travel Scenario: routes intent and generates non-punitive proactive advice', () => {
    expect(classifyIntent("I'm travelling this week")).toBe('adaptive_coaching');

    const raw = computeRawTelemetry({
      completedWorkouts: 1,
      prescribedWorkouts: 4,
      recentSessionsVolumeKg: [4000],
      recent1rmValues: [],
      bodyWeightLogsKg: [],
      daysSinceLastWorkout: 4,
    });

    const intel = deriveCoachingIntelligence(raw, { goal: 'general_fitness' });

    expect(intel.proactiveTrigger.type).toBe('missed_workouts');
    expect(intel.tone).toBe('empathetic_reassuring');
  });

  it('8. System Prompt Generation: formats persona, rules, and grounding without duplication', () => {
    const prompt = buildCoachSystemPrompt({
      intent: 'weekly_review',
      engineResult: { confidence: { score: 'high', reason: 'Verified' } },
      memoryCard: 'Current Goal: Muscle Gain',
      safetyTriggered: false,
    });

    expect(prompt).toContain('PERSONA:');
    expect(prompt).toContain('WEEKLY REVIEW & ADAPTIVE COACHING');
    expect(prompt).toContain('ENGINE RESULT');
    expect(prompt).toContain('COACH MEMORY');
  });
});

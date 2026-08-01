import { describe, it, expect, vi } from 'vitest';
import { classifyIntent, classifyIntentWithHistory, detectWorkoutProgramGenerate } from '../supabase/functions/_shared/ai/intent.ts';
import {
  extractRequirementsFromText,
  resolveKnownRequirements,
  findMissingRequired,
} from '../supabase/functions/_shared/ai/programRequirements.ts';
import { recommendSplit } from '../supabase/functions/_shared/ai/splitRecommender.ts';
import { generateProgram, applyDraftEdit, GeneratedDay, ExerciseCandidate, MuscleGroup } from '../supabase/functions/_shared/ai/programGenerator.ts';
import { validateProgram } from '../supabase/functions/_shared/ai/programValidator.ts';
import { saveWorkoutPlan, activateWorkoutPlan } from '../supabase/functions/_shared/ai/planPersistence.ts';
import { computeResponseType } from '../supabase/functions/_shared/ai/coachSchema.ts';

describe('Conversational Workout Program Generator — Intent Routing', () => {
  it('1. routes "Make me a workout plan" to workout_program_generate', () => {
    expect(classifyIntent('Make me a workout plan')).toBe('workout_program_generate');
  });

  it('2. routes "Generate a Push Pull Legs plan" to workout_program_generate', () => {
    expect(classifyIntent('Generate a Push Pull Legs plan')).toBe('workout_program_generate');
  });

  it('3. routes "I want to train five days" to workout_program_generate', () => {
    expect(classifyIntent('I want to train five days')).toBe('workout_program_generate');
  });

  it('4. routes "Build me a muscle-gain program" to workout_program_generate', () => {
    expect(classifyIntent('Build me a muscle-gain program')).toBe('workout_program_generate');
  });

  it('5. routes "Can you change my split?" to workout_program_generate', () => {
    expect(classifyIntent('Can you change my split?')).toBe('workout_program_generate');
  });

  it('6. routes "Activate Summer Bulk V1" to workout_program_generate', () => {
    expect(classifyIntent('Activate Summer Bulk V1')).toBe('workout_program_generate');
  });
});

describe('Conversational Workout Program Generator — Requirements Extraction', () => {
  it('7. extracts goal, experience, days, equipment, duration, and preferences from text', () => {
    const text = 'Build me a muscle gain program for an intermediate lifter. I have a commercial gym, can train 4 days a week for 60 minutes, love bench press, hate lunges, and focus on chest. Monday Wednesday Friday Saturday.';
    const req = extractRequirementsFromText(text);

    expect(req.goal).toBe('muscle_gain');
    expect(req.experience).toBe('intermediate');
    expect(req.daysPerWeek).toBe(4);
    expect(req.equipment).toBe('commercial_gym');
    expect(req.maxSessionMinutes).toBe(60);
    expect(req.preferredDays).toEqual(['Monday', 'Wednesday', 'Friday', 'Saturday']);
  });

  it('8. merges profile and memory without asking again for known information', () => {
    const req = resolveKnownRequirements({
      latestMessage: 'I want to train 5 days a week',
      profileGoal: 'BUILD_MUSCLE',
      memoryEquipment: 'commercial gym',
      memoryExperience: 'advanced',
      memoryInjury: 'shoulder pain',
    });

    expect(req.goal).toBe('muscle_gain');
    expect(req.equipment).toBe('commercial_gym');
    expect(req.experience).toBe('advanced');
    expect(req.daysPerWeek).toBe(5);
    expect(req.injuries).toContain('shoulder');

    const missing = findMissingRequired(req);
    expect(missing).toEqual([]);
  });

  it('9. identifies missing hard-required fields when information is incomplete', () => {
    const req = resolveKnownRequirements({
      latestMessage: 'Make me a workout plan',
      profileGoal: null,
    });

    const missing = findMissingRequired(req);
    expect(missing).toContain('goal');
    expect(missing).toContain('experience');
    expect(missing).toContain('daysPerWeek');
    expect(missing).toContain('equipment');
  });

  // Live-observed (runtime-hardening pass, 2026-08-01): a real QA conversation
  // asked "Create a 4-day PPL workout plan for me." (prompt #1 of the mandated
  // 10-prompt suite) and the engine still listed daysPerWeek as missing on the
  // FIRST turn, forcing an unnecessary clarifying question the athlete had
  // already answered. Root cause: the digit-extraction regex only recognised
  // "N days a week" / "training N days" shapes — never a bare "N-day" adjective
  // directly on "plan"/"program"/"split", which is the single most natural way
  // to phrase this request.
  it("20. derives daysPerWeek from a bare 'N-day' adjective with no 'week' or 'train' context", () => {
    const req = extractRequirementsFromText('Create a 4-day PPL workout plan for me.');
    expect(req.daysPerWeek).toBe(4);
    expect(req.requestedSplit).toBe('Push/Pull/Legs');
  });

  it("21. derives daysPerWeek from a bare 'N day' (space, not hyphen) adjective", () => {
    const req = extractRequirementsFromText('Build me a 3 day upper lower split.');
    expect(req.daysPerWeek).toBe(3);
  });

  // Live-observed follow-on bug in the SAME conversation: after being asked to
  // clarify, the athlete replied "I'm intermediate, I have full gym access, and
  // I want to train Monday, Tuesday, Thursday, Friday." — a completely
  // unambiguous 4-day answer — yet the engine asked AGAIN for the exact count,
  // because the day-name list was captured into preferredDays without ever
  // being counted into daysPerWeek.
  it('22. derives daysPerWeek from an explicit day-of-week list when no count is stated', () => {
    const req = extractRequirementsFromText(
      "I'm intermediate, I have full gym access, and I want to train Monday, Tuesday, Thursday, Friday."
    );
    expect(req.preferredDays).toEqual(['Monday', 'Tuesday', 'Thursday', 'Friday']);
    expect(req.daysPerWeek).toBe(4);
    expect(req.experience).toBe('intermediate');
    expect(req.equipment).toBe('commercial_gym');
  });

  it('23. an explicit stated count still wins over the day-list-derived count', () => {
    // Flexible framing: names 5 possible days but only wants to train 3 of them.
    const req = extractRequirementsFromText('I can train 3 days a week, flexible between Monday, Wednesday, Friday, Saturday and Sunday.');
    expect(req.preferredDays.length).toBe(5);
    expect(req.daysPerWeek).toBe(3);
  });

  // Live-observed (runtime-hardening pass, 2026-08-01), found via the exact
  // mandated verification conversation: the athlete answered the coach's own
  // "what's your goal?" question with "Building muscle." and the goal came
  // back null — every goal pattern was written in only one grammatical form
  // (bare "build muscle", "lose fat", "improve my game", "stay fit"), so the
  // extremely common gerund reply silently failed to resolve, leaving
  // response_type stuck on 'clarification'/'text' instead of ever reaching
  // 'workout_plan_draft' — even though every other field was already known.
  it("24. recognizes the gerund form of each goal phrase, not just the bare form", () => {
    expect(extractRequirementsFromText('Building muscle.').goal).toBe('muscle_gain');
    expect(extractRequirementsFromText('Gaining size mostly.').goal).toBe('muscle_gain');
    expect(extractRequirementsFromText('Getting bigger overall.').goal).toBe('muscle_gain');
    expect(extractRequirementsFromText('Getting stronger is the goal.').goal).toBe('strength');
    expect(extractRequirementsFromText('Losing fat this cycle.').goal).toBe('fat_loss');
    expect(extractRequirementsFromText('Losing weight steadily.').goal).toBe('fat_loss');
    expect(extractRequirementsFromText('Leaning out for summer.').goal).toBe('fat_loss');
    expect(extractRequirementsFromText('Improving my game on the court.').goal).toBe('athletic_performance');
    expect(extractRequirementsFromText('Staying fit is enough for me.').goal).toBe('general_fitness');
    expect(extractRequirementsFromText('Staying healthy mostly.').goal).toBe('general_fitness');
    // Bare forms must keep working exactly as before (no regression).
    expect(extractRequirementsFromText('Build muscle.').goal).toBe('muscle_gain');
    expect(extractRequirementsFromText('Lose fat.').goal).toBe('fat_loss');
    expect(extractRequirementsFromText('Stay fit.').goal).toBe('general_fitness');
  });

  it('25. the exact live conversation resolves goal from a gerund reply and clears missing_information entirely', () => {
    const req = resolveKnownRequirements({
      latestMessage: 'Building muscle.',
      recentMessages: [
        'Create a 4-day PPL workout plan for me.',
        'Intermediate, full gym, Monday, Tuesday, Thursday and Friday.',
      ],
      profileGoal: null, // deliberately no profile fallback — this turn alone must resolve it
    });
    expect(req.goal).toBe('muscle_gain');
    expect(req.experience).toBe('intermediate');
    expect(req.equipment).toBe('commercial_gym');
    expect(req.daysPerWeek).toBe(4);
    expect(findMissingRequired(req)).toEqual([]);
  });
});

describe('Conversational Workout Program Generator — Trainer Coaching & Split Recommendation', () => {
  it('10. recommends Upper/Lower for 4 days', () => {
    const rec = recommendSplit({
      daysPerWeek: 4,
      experience: 'intermediate',
      goal: 'muscle_gain',
    });

    expect(rec.split).toBe('Upper/Lower');
    expect(rec.dayNames.length).toBe(4);
    expect(rec.rationale).toContain('Upper/Lower');
  });

  it('11. acts like a real personal trainer when athlete requests 6 days but historically averages 4 days', () => {
    const rec = recommendSplit({
      daysPerWeek: 6,
      experience: 'intermediate',
      goal: 'muscle_gain',
      historicalAverageDays: 4,
    });

    expect(rec.adherenceCheckRequired).toBe(true);
    expect(rec.adherenceNote).toContain('averaging 4 training days per week');
  });
});

describe('Conversational Workout Program Generator — Deterministic Validation Engine', () => {
  const sampleDays: GeneratedDay[] = [
    {
      name: 'Push Day',
      exercises: [
        { name: 'Barbell Bench Press', muscleGroup: 'chest', sets: 4, reps: '8-12', restSeconds: 90 },
        { name: 'Overhead Press', muscleGroup: 'shoulders', sets: 4, reps: '8-12', restSeconds: 90 },
        { name: 'Incline Dumbbell Press', muscleGroup: 'chest', sets: 3, reps: '8-12', restSeconds: 90 },
      ],
    },
    {
      name: 'Pull Day',
      exercises: [
        { name: 'Barbell Row', muscleGroup: 'back', sets: 4, reps: '8-12', restSeconds: 90 },
        { name: 'Lat Pulldown', muscleGroup: 'back', sets: 3, reps: '8-12', restSeconds: 90 },
      ],
    },
  ];

  it('12. validates volume, session duration, and catalog integrity cleanly', () => {
    const catalogMap = {
      'Barbell Bench Press': { id: 'ex-1', equipment: 'barbell' },
      'Overhead Press': { id: 'ex-2', equipment: 'barbell' },
      'Incline Dumbbell Press': { id: 'ex-3', equipment: 'dumbbell' },
      'Barbell Row': { id: 'ex-4', equipment: 'barbell' },
      'Lat Pulldown': { id: 'ex-5', equipment: 'cable' },
    };

    const res = validateProgram(sampleDays, { equipment: 'commercial_gym', maxSessionMinutes: 60 }, catalogMap);
    expect(res.valid).toBe(true);
    expect(res.estimatedSessionMinutes['Push Day']).toBeGreaterThan(0);
  });

  it('13. flags injury conflicts deterministically', () => {
    const res = validateProgram(sampleDays, { injuries: ['shoulder'] });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('Overhead Press'))).toBe(true);
  });

  it('14. flags duplicate exercises on the same day', () => {
    const duplicateDays: GeneratedDay[] = [
      {
        name: 'Push Day',
        exercises: [
          { name: 'Barbell Bench Press', muscleGroup: 'chest', sets: 4, reps: '8-12', restSeconds: 90 },
          { name: 'Barbell Bench Press', muscleGroup: 'chest', sets: 3, reps: '8-12', restSeconds: 90 },
        ],
      },
    ];

    const res = validateProgram(duplicateDays, {});
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('Duplicate exercise'))).toBe(true);
  });
});

describe('Conversational Workout Program Generator — Draft Editing Loop', () => {
  const initialDays: GeneratedDay[] = [
    {
      name: 'Push Day',
      exercises: [
        { name: 'Barbell Bench Press', muscleGroup: 'chest', sets: 4, reps: '8-12', restSeconds: 90 },
        { name: 'Overhead Press', muscleGroup: 'shoulders', sets: 3, reps: '8-12', restSeconds: 90 },
      ],
    },
  ];

  it('15. replaces an exercise in the draft', () => {
    const updated = applyDraftEdit(initialDays, {
      action: 'replace',
      exercise: 'Barbell Bench Press',
      replacement: 'Dumbbell Press',
    });

    expect(updated[0].exercises[0].name).toBe('Dumbbell Press');
  });

  it('16. adds an exercise to the draft', () => {
    const updated = applyDraftEdit(initialDays, {
      action: 'add',
      exercise: 'Lateral Raise',
      targetDay: 'Push Day',
    });

    expect(updated[0].exercises.some((e) => e.name === 'Lateral Raise')).toBe(true);
  });

  it('17. removes an exercise from the draft', () => {
    const updated = applyDraftEdit(initialDays, {
      action: 'remove',
      exercise: 'Overhead Press',
    });

    expect(updated[0].exercises.some((e) => e.name === 'Overhead Press')).toBe(false);
  });
});

describe('Conversational Workout Program Generator — Versioned Persistence & Activation', () => {
  it('18. increments plan version automatically (Summer Bulk V1 -> Summer Bulk V2)', async () => {
    const mockSupabase = {
      from: (table: string) => {
        if (table === 'workout_plans') {
          return {
            select: () => ({
              eq: () => Promise.resolve({
                data: [{ id: 'plan-1', name: 'Summer Bulk V1', created_at: '2026-07-01' }],
              }),
            }),
            update: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
            insert: (row: any) => ({
              select: () => ({
                single: () => Promise.resolve({ data: { id: 'plan-2', name: row.name }, error: null }),
              }),
            }),
          };
        }
        if (table === 'plan_days') {
          return {
            insert: (row: any) => ({
              select: () => ({
                single: () => Promise.resolve({ data: { id: 'day-1' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'plan_exercises') {
          return {
            insert: () => Promise.resolve({ error: null }),
          };
        }
        if (table === 'exercises') {
          return {
            select: () => ({
              ilike: () => ({
                limit: () => Promise.resolve({ data: [{ id: 'ex-1' }] }),
              }),
            }),
          };
        }
        return {};
      },
    };

    const days: GeneratedDay[] = [
      {
        name: 'Day 1',
        exercises: [{ name: 'Bench Press', muscleGroup: 'chest', sets: 3, reps: '8-12', restSeconds: 90 }],
      },
    ];

    const result = await saveWorkoutPlan(mockSupabase as any, 'user-123', 'Summer Bulk', days);

    expect(result.success).toBe(true);
    expect(result.planName).toBe('Summer Bulk V2');
    expect(result.version).toBe(2);
  });

  it('19. activates a specified plan and deactivates others', async () => {
    const mockSupabase = {
      from: (table: string) => {
        if (table === 'workout_plans') {
          return {
            select: () => ({
              eq: () => Promise.resolve({
                data: [
                  { id: 'plan-1', name: 'Summer Bulk V1' },
                  { id: 'plan-2', name: 'Summer Bulk V2' },
                ],
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        return {};
      },
    };

    const result = await activateWorkoutPlan(mockSupabase as any, 'user-123', 'Summer Bulk V1');
    expect(result.success).toBe(true);
    expect(result.planName).toBe('Summer Bulk V1');
  });
});

// ─── Full pipeline, the EXACT live-tested conversation (runtime-hardening
// pass, 2026-08-01) ──────────────────────────────────────────────────────────
// This is an end-to-end run of every deterministic stage the edge function
// itself chains together for workout_program_generate — intent resolution,
// requirement resolution, split recommendation, program generation, and
// validation — using the precise two-message conversation exercised live
// through the real mobile UI. It exists to prove the fix at the level the
// user actually experiences it (a validated draft comes out the other end),
// not just that each stage's own unit tests pass in isolation.
describe('Full pipeline — the exact live conversation produces a validated draft', () => {
  const TURN_1 = 'Create a 4-day PPL workout plan for me.';
  const TURN_2 = 'Intermediate, full gym, Monday, Tuesday, Thursday and Friday.';

  const CANDIDATE_POOL: Partial<Record<MuscleGroup, ExerciseCandidate[]>> = {
    chest: [{ name: 'Barbell Bench Press', equipment: 'barbell' }, { name: 'Incline Dumbbell Press', equipment: 'dumbbell' }],
    back: [{ name: 'Barbell Row', equipment: 'barbell' }, { name: 'Lat Pulldown', equipment: 'cable' }],
    shoulders: [{ name: 'Seated Dumbbell Shoulder Press', equipment: 'dumbbell' }, { name: 'Lateral Raise', equipment: 'dumbbell' }],
    biceps: [{ name: 'Barbell Curl', equipment: 'barbell' }, { name: 'Hammer Curl', equipment: 'dumbbell' }],
    triceps: [{ name: 'Triceps Pushdown', equipment: 'cable' }, { name: 'Overhead Triceps Extension', equipment: 'dumbbell' }],
    quads: [{ name: 'Barbell Back Squat', equipment: 'barbell' }, { name: 'Leg Press', equipment: 'machine' }],
    hamstrings: [{ name: 'Romanian Deadlift', equipment: 'barbell' }, { name: 'Seated Leg Curl', equipment: 'machine' }],
    glutes: [{ name: 'Hip Thrust', equipment: 'barbell' }, { name: 'Cable Glute Kickback', equipment: 'cable' }],
    calves: [{ name: 'Standing Calf Raise', equipment: 'machine' }, { name: 'Seated Calf Raise', equipment: 'machine' }],
  };

  it('intent resolves correctly across the two-turn conversation', () => {
    expect(classifyIntent(TURN_1)).toBe('workout_program_generate');
    expect(classifyIntentWithHistory(TURN_2, [TURN_1])).toBe('workout_program_generate');
  });

  it('requirement resolution derives all four hard-required fields with no re-asking', () => {
    const req = resolveKnownRequirements({
      latestMessage: TURN_2,
      recentMessages: [TURN_1],
      profileGoal: 'BUILD_MUSCLE', // from the athlete's onboarding profile, same as index.ts passes in
    });

    expect(req.goal).toBe('muscle_gain');
    expect(req.experience).toBe('intermediate');
    expect(req.equipment).toBe('commercial_gym');
    expect(req.daysPerWeek).toBe(4);
    expect(req.preferredDays).toEqual(['Monday', 'Tuesday', 'Thursday', 'Friday']);
    expect(req.requestedSplit).toBe('Push/Pull/Legs');
    expect(findMissingRequired(req)).toEqual([]);
  });

  it('runs recommendSplit -> generateProgram -> validateProgram end-to-end and produces a valid, confirmable draft', () => {
    const req = resolveKnownRequirements({
      latestMessage: TURN_2,
      recentMessages: [TURN_1],
      profileGoal: 'BUILD_MUSCLE',
    });
    expect(findMissingRequired(req)).toEqual([]);

    const recommendation = recommendSplit({
      daysPerWeek: req.daysPerWeek!,
      experience: req.experience!,
      goal: req.goal,
      requestedSplit: req.requestedSplit,
    });
    // Honest, pre-existing trainer behavior: Push/Pull/Legs only splits evenly
    // across 3 or 6 days, so a 4-day request correctly falls back to
    // Upper/Lower with an explained rationale — it does NOT force an uneven
    // PPL rotation just because that's the literal word the athlete used.
    expect(recommendation.honoredRequest).toBe(false);
    expect(recommendation.split).toBe('Upper/Lower');
    expect(recommendation.dayNames).toEqual(['Upper 1', 'Lower 1', 'Upper 2', 'Lower 2']);
    expect(recommendation.rationale).toContain("doesn't split cleanly across 4 days");

    const generated = generateProgram({
      dayNames: recommendation.dayNames,
      experience: req.experience!,
      goal: req.goal,
      equipment: req.equipment,
      candidatesByGroup: CANDIDATE_POOL,
      excludedExerciseNames: req.dislikedExercises,
      likedExerciseNames: req.likedExercises,
      priorityMuscleGroups: req.priorityMuscleGroups as any,
      injuryKeywords: req.injuries,
    });

    expect(generated.days.length).toBe(4);
    expect(generated.unfilledSlots).toEqual([]); // every slot in the pool above is covered
    for (const day of generated.days) expect(day.exercises.length).toBeGreaterThan(0);

    const catalogMap = Object.fromEntries(
      Object.values(CANDIDATE_POOL).flat().map((c: any, i) => [c.name, { id: `ex-${i}`, equipment: c.equipment }])
    );
    const validation = validateProgram(generated.days, req, catalogMap);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);

    // This is what the edge function actually assembles as engineResult for a
    // fresh (not-yet-confirmed) proposal — status drives computeResponseType.
    const engineResult = {
      status: recommendation.adherenceCheckRequired ? 'adherence_check' : 'draft_proposed',
      split: recommendation.split,
      program: generated.days,
      validation,
      confirmation_required: true,
    };
    expect(engineResult.status).toBe('draft_proposed');

    const responseType = computeResponseType({
      intent: 'workout_program_generate',
      missingInformation: [],
      safetyFlag: false,
      isError: false,
      engineStatus: engineResult.status,
      hasEngineResult: true,
      memoryPersistedThisTurn: false,
    });
    expect(responseType).toBe('workout_plan_draft');
  });
});

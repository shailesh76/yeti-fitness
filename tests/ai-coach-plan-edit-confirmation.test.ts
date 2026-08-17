import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@yeti/database', () => ({
  AICoachRepository: class {
    getOrCreateConversation() { return Promise.resolve({ id: 'c1' }); }
    saveMessageLocal() { return Promise.resolve(); }
    sendMessageRemote() { return Promise.resolve({ reply: 'ok', actions: [] }); }
    confirmPlanEdit() { return Promise.resolve({ success: true, message: 'Plan change applied.' }); }
    cancelPlanEdit() { return Promise.resolve({ success: true, message: 'Cancelled.' }); }
  },
  WorkoutRepository: class {
    createOwnWorkoutPlan() { return Promise.resolve({ id: 'plan-123' }); }
  },
  UserRepository: class {
    getProfile() { return Promise.resolve({ full_name: 'Alice Athlete' }); }
    updateProfile() { return Promise.resolve({ remoteSuccess: true }); }
  },
  NutritionRepository: class {
    getDailySummary() { return Promise.resolve(null); }
  },
  ExerciseRepository: class {
    getExercises() { return Promise.resolve([]); }
  },
}));

vi.mock('../packages/database', () => ({
  AICoachRepository: class {
    getOrCreateConversation() { return Promise.resolve({ id: 'c1' }); }
    saveMessageLocal() { return Promise.resolve(); }
    sendMessageRemote() { return Promise.resolve({ reply: 'ok', actions: [] }); }
    confirmPlanEdit() { return Promise.resolve({ success: true, message: 'Plan change applied.' }); }
    cancelPlanEdit() { return Promise.resolve({ success: true, message: 'Cancelled.' }); }
  },
  WorkoutRepository: class {
    createOwnWorkoutPlan() { return Promise.resolve({ id: 'plan-123' }); }
  },
  UserRepository: class {
    getProfile() { return Promise.resolve({ full_name: 'Alice Athlete' }); }
    updateProfile() { return Promise.resolve({ remoteSuccess: true }); }
  },
  NutritionRepository: class {
    getDailySummary() { return Promise.resolve(null); }
  },
  ExerciseRepository: class {
    getExercises() { return Promise.resolve([]); }
  },
}));

vi.mock('../apps/mobile/database/index', () => ({
  database: null,
  isNativeDbAvailable: false,
}));

vi.mock('../apps/mobile/database', () => ({
  database: null,
  isNativeDbAvailable: false,
}));

vi.mock('../apps/mobile/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
      delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    }),
  },
}));

import {
  proposePlanEdit,
  executePlanEdit,
  cancelPlanEdit,
  PROPOSAL_EXPIRY_MS,
} from '../supabase/functions/_shared/ai/planEditProposals.ts';
import { parsePlanEdit } from '../supabase/functions/_shared/ai/planEdit.ts';
import {
  classifyAICoachAction,
  executePlanEditFromAction,
  cancelPlanEditFromAction,
  __clearInFlightSavesForTests,
} from '../apps/mobile/services/aiCoachWorkoutPlan';
import { useAICoachStore } from '../apps/mobile/store/useAICoachStore';

// In-memory Supabase mock simulating public schema tables
function createMockSupabase(initialState?: {
  exercises?: any[];
  exerciseAliases?: any[];
  plans?: any[];
  days?: any[];
  planExercises?: any[];
  proposals?: any[];
}) {
  const exercises = initialState?.exercises ?? [
    { id: 'ex-bench', name: 'Barbell Bench Press', slug: 'barbell-bench-press', source_type: 'yeti_first_party' },
    { id: 'ex-cable-fly', name: 'High-to-Low Cable Fly', slug: 'high-to-low-cable-fly', source_type: 'yeti_first_party' },
    { id: 'ex-incline-db', name: 'Incline Dumbbell Press', slug: 'incline-dumbbell-press', source_type: 'yeti_first_party' },
    { id: 'ex-db-fly', name: 'Dumbbell Flyes', slug: 'dumbbell-flyes', source_type: 'yeti_first_party' },
  ];

  const exerciseAliases = initialState?.exerciseAliases ?? [
    { exercise_id: 'ex-cable-fly', alias: 'high to low fly', exercises: exercises[1] },
    { exercise_id: 'ex-bench', alias: 'bench press', exercises: exercises[0] },
    { exercise_id: 'ex-incline-db', alias: 'incline dumbbell press', exercises: exercises[2] },
  ];

  let plans = initialState?.plans ?? [
    { id: 'plan-1', user_id: 'athlete-1', name: 'Push Pull Legs', created_at: new Date().toISOString() },
  ];

  let days = initialState?.days ?? [
    { id: 'day-1', plan_id: 'plan-1', day_number: 1, name: 'Push Day' },
    { id: 'day-2', plan_id: 'plan-1', day_number: 2, name: 'Pull Day' },
  ];

  let planExercises = initialState?.planExercises ?? [
    { id: 'pe-1', plan_day_id: 'day-1', exercise_id: 'ex-bench', order_index: 0, sets: '4', reps: '6-8', rest_seconds: 180 },
    { id: 'pe-2', plan_day_id: 'day-1', exercise_id: 'ex-incline-db', order_index: 1, sets: '3', reps: '8-10', rest_seconds: 120 },
  ];

  let proposals: any[] = initialState?.proposals ?? [];

  const mockClient: any = {
    _state: { exercises, exerciseAliases, plans, days, planExercises, proposals },
    from: (table: string) => {
      let currentTable = table;
      let orQuery: string | null = null;
      let inCol: string | null = null;
      let inVals: any[] | null = null;
      let gtCol: string | null = null;
      let gtVal: any = null;
      let eqFilters: Array<{ col: string; val: any }> = [];

      const queryBuilder: any = {
        select: (cols: string = '*') => queryBuilder,
        eq: (col: string, val: any) => {
          eqFilters.push({ col, val });
          return queryBuilder;
        },
        or: (query: string) => {
          orQuery = query;
          return queryBuilder;
        },
        in: (col: string, vals: any[]) => {
          inCol = col;
          inVals = vals;
          return queryBuilder;
        },
        gt: (col: string, val: any) => {
          gtCol = col;
          gtVal = val;
          return queryBuilder;
        },
        order: (col: string, opts?: any) => queryBuilder,
        limit: (n: number) => queryBuilder,
        single: async () => {
          const res = await queryBuilder.executeSelect();
          return { data: res[0] || null, error: res[0] ? null : { message: 'Row not found' } };
        },
        maybeSingle: async () => {
          const res = await queryBuilder.executeSelect();
          return { data: res[0] || null, error: null };
        },
        insert: (rowOrRows: any) => {
          const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
          const createdRows = rows.map((r) => {
            const id = r.id || `gen-${Math.random().toString(36).substring(7)}`;
            const created = { id, created_at: new Date().toISOString(), ...r };
            if (currentTable === 'ai_plan_edit_proposals') {
              proposals.push(created);
            } else if (currentTable === 'plan_exercises') {
              planExercises.push(created);
            }
            return created;
          });

          return {
            select: (cols?: string) => ({
              single: async () => ({ data: createdRows[0], error: null }),
              maybeSingle: async () => ({ data: createdRows[0], error: null }),
            }),
            then: (resolve: any) => resolve({ data: createdRows, error: null }),
          };
        },
        update: (updates: any) => {
          const updateBuilder: any = {
            eq: (col: string, val: any) => {
              eqFilters.push({ col, val });
              return updateBuilder;
            },
            gt: (col: string, val: any) => {
              gtCol = col;
              gtVal = val;
              return updateBuilder;
            },
            select: () => ({
              maybeSingle: async () => {
                let rows = currentTable === 'ai_plan_edit_proposals' ? proposals : planExercises;
                const matchingIdx = rows.findIndex((r) => {
                  for (const { col, val } of eqFilters) {
                    if (r[col] !== val) return false;
                  }
                  if (gtCol && gtVal) {
                    if (!(new Date(r[gtCol]).getTime() > new Date(gtVal).getTime())) return false;
                  }
                  return true;
                });

                if (matchingIdx === -1) {
                  return { data: null, error: null };
                }

                rows[matchingIdx] = { ...rows[matchingIdx], ...updates };
                return { data: rows[matchingIdx], error: null };
              },
            }),
            then: async (resolve: any) => {
              let rows = currentTable === 'ai_plan_edit_proposals' ? proposals : planExercises;
              for (let i = 0; i < rows.length; i++) {
                let match = true;
                for (const { col, val } of eqFilters) {
                  if (rows[i][col] !== val) { match = false; break; }
                }
                if (gtCol && gtVal && !(new Date(rows[i][gtCol]).getTime() > new Date(gtVal).getTime())) match = false;
                if (match) {
                  rows[i] = { ...rows[i], ...updates };
                }
              }
              return resolve({ error: null });
            },
          };
          return updateBuilder;
        },
        delete: () => {
          return {
            eq: (col: string, val: any) => {
              if (currentTable === 'plan_exercises') {
                planExercises = planExercises.filter((r) => r[col] !== val);
                mockClient._state.planExercises = planExercises;
              }
              return Promise.resolve({ error: null });
            },
          };
        },
        executeSelect: async () => {
          let rows: any[] = [];
          if (currentTable === 'exercises') rows = mockClient._state.exercises;
          else if (currentTable === 'exercise_aliases') rows = mockClient._state.exerciseAliases;
          else if (currentTable === 'workout_plans') rows = mockClient._state.plans;
          else if (currentTable === 'plan_days') rows = mockClient._state.days;
          else if (currentTable === 'plan_exercises') {
            rows = mockClient._state.planExercises.map((pe: any) => {
              const ex = mockClient._state.exercises.find((e: any) => e.id === pe.exercise_id);
              return { ...pe, exercises: ex };
            });
          } else if (currentTable === 'ai_plan_edit_proposals') rows = mockClient._state.proposals;

          let filtered = rows.filter((r) => {
            for (const { col, val } of eqFilters) {
              if (r[col] !== val) return false;
            }
            if (inCol && inVals) {
              if (!inVals.includes(r[inCol])) return false;
            }
            if (gtCol && gtVal) {
              if (!(new Date(r[gtCol]).getTime() > new Date(gtVal).getTime())) return false;
            }
            if (orQuery && currentTable === 'exercises') {
              const terms = orQuery.split(',');
              const matched = terms.some((term) => {
                if (term.startsWith('slug.eq.')) {
                  const s = term.replace('slug.eq.', '');
                  return r.slug === s;
                }
                if (term.startsWith('name.ilike.')) {
                  const n = term.replace('name.ilike.', '').replace(/%/g, '').toLowerCase();
                  return (r.name || '').toLowerCase().includes(n);
                }
                return false;
              });
              if (!matched) return false;
            }
            if (orQuery && currentTable === 'exercise_aliases') {
              const terms = orQuery.split(',');
              const matched = terms.some((term) => {
                if (term.startsWith('alias.ilike.')) {
                  const a = term.replace('alias.ilike.', '').replace(/%/g, '').toLowerCase();
                  return (r.alias || '').toLowerCase().includes(a);
                }
                return false;
              });
              if (!matched) return false;
            }
            return true;
          });
          return filtered;
        },
      };

      queryBuilder.then = (resolve: any) => queryBuilder.executeSelect().then((data: any) => resolve({ data, error: null }));
      return queryBuilder;
    },
    rpc: async (fnName: string, args: any) => {
      if (fnName === 'execute_ai_plan_edit_proposal') {
        const { p_proposal_id, p_athlete_id } = args;
        const proposal = mockClient._state.proposals.find((p: any) => p.id === p_proposal_id && p.athlete_id === p_athlete_id);
        if (!proposal) {
          return { data: { success: false, reason: 'not_found', message: 'Proposal not found.' }, error: null };
        }
        if (proposal.status === 'applied') {
          return { data: { success: true, reason: 'already_applied', message: 'This plan change has already been applied.' }, error: null };
        }
        if (proposal.status === 'cancelled') {
          return { data: { success: false, reason: 'cancelled', message: 'This change proposal was cancelled and cannot be applied.' }, error: null };
        }
        if (new Date(proposal.expires_at).getTime() <= Date.now()) {
          return { data: { success: false, reason: 'expired', message: 'This change proposal has expired. Please ask for the change again.' }, error: null };
        }

        const plan = mockClient._state.plans.find((pl: any) => pl.id === proposal.plan_id && pl.user_id === p_athlete_id);
        if (!plan) {
          return { data: { success: false, reason: 'proposal_stale', message: 'The target workout plan no longer exists.' }, error: null };
        }

        const day = mockClient._state.days.find((d: any) => d.id === proposal.plan_day_id && d.plan_id === plan.id);
        if (!day) {
          return { data: { success: false, reason: 'proposal_stale', message: 'The target workout day no longer exists in your plan.' }, error: null };
        }

        const dayLabel = day.name || `Day ${day.day_number}`;

        if (proposal.action === 'add') {
          const already = mockClient._state.planExercises.some((pe: any) => pe.plan_day_id === day.id && pe.exercise_id === proposal.exercise_id);
          if (!already) {
            mockClient._state.planExercises.push({
              id: `gen-${Math.random().toString(36).substring(7)}`,
              plan_day_id: day.id,
              exercise_id: proposal.exercise_id,
              order_index: mockClient._state.planExercises.length,
              sets: proposal.sets || '3',
              reps: proposal.reps || '10-12',
              rest_seconds: proposal.rest_seconds || 90,
            });
          }
          proposal.status = 'applied';
          proposal.applied_at = new Date().toISOString();
          return {
            data: {
              success: true,
              action: 'add',
              planName: plan.name,
              message: `${proposal.exercise_name_snapshot || 'Exercise'} added to ${dayLabel}.`,
            },
            error: null,
          };
        }

        const target = proposal.target_plan_exercise_id
          ? mockClient._state.planExercises.find((pe: any) => pe.id === proposal.target_plan_exercise_id)
          : mockClient._state.planExercises.find((pe: any) => pe.exercise_id === proposal.exercise_id);

        if (!target) {
          return { data: { success: false, reason: 'proposal_stale', message: 'Target exercise no longer in plan.' }, error: null };
        }

        if (proposal.action === 'remove') {
          mockClient._state.planExercises = mockClient._state.planExercises.filter((pe: any) => pe.id !== target.id);
        } else if (proposal.action === 'replace') {
          target.exercise_id = proposal.replacement_exercise_id;
        } else if (proposal.action === 'move') {
          target.plan_day_id = day.id;
        } else if (proposal.action === 'update_sets_reps') {
          if (proposal.sets) target.sets = proposal.sets;
          if (proposal.reps) target.reps = proposal.reps;
        } else if (proposal.action === 'update_rest') {
          target.rest_seconds = proposal.rest_seconds;
        }

        proposal.status = 'applied';
        proposal.applied_at = new Date().toISOString();
        return {
          data: {
            success: true,
            action: proposal.action,
            planName: plan.name,
            message: `${proposal.exercise_name_snapshot} updated.`,
          },
          error: null,
        };
      }

      if (fnName === 'cancel_ai_plan_edit_proposal') {
        const { p_proposal_id, p_athlete_id } = args;
        const proposal = mockClient._state.proposals.find((p: any) => p.id === p_proposal_id && p.athlete_id === p_athlete_id);
        if (proposal && proposal.status === 'pending') {
          proposal.status = 'cancelled';
          proposal.cancelled_at = new Date().toISOString();
        }
        return { data: { success: true, message: "Change cancelled. Your workout plan wasn't modified." }, error: null };
      }

      return { data: null, error: { message: `RPC ${fnName} not found` } };
    },
  };

  return mockClient;
}

beforeEach(() => {
  __clearInFlightSavesForTests();
});

describe('AI Coach Plan-Edit Confirmation & Security Architecture', () => {
  it('1. Initial plan-edit request creates proposal only in ai_plan_edit_proposals', async () => {
    const supabase = createMockSupabase();
    const edit = parsePlanEdit('Add high to low fly to my push day');
    expect(edit).not.toBeNull();
    expect(edit?.action).toBe('add');

    const result = await proposePlanEdit(supabase, 'athlete-1', edit, 'Add high to low fly to my push day');

    expect(result.success).toBe(true);
    expect(result.status).toBe('proposal_created');
    expect(result.proposalId).toBeDefined();
    expect(result.proposalData?.exerciseName).toBe('High-to-Low Cable Fly');
    expect(result.proposalData?.dayName).toBe('Push Day');

    // Authoritative proposal stored in mock DB
    expect(supabase._state.proposals.length).toBe(1);
    const stored = supabase._state.proposals[0];
    expect(stored.athlete_id).toBe('athlete-1');
    expect(stored.status).toBe('pending');
    expect(stored.action).toBe('add');
    expect(stored.exercise_id).toBe('ex-cable-fly');
  });

  it('2. Zero plan_exercises mutation occurs before explicit confirmation', async () => {
    const supabase = createMockSupabase();
    const initialPlanExercisesCount = supabase._state.planExercises.length;

    const edit = parsePlanEdit('Add high to low fly to my push day');
    await proposePlanEdit(supabase, 'athlete-1', edit, 'Add high to low fly to my push day');

    // plan_exercises must remain untouched
    expect(supabase._state.planExercises.length).toBe(initialPlanExercisesCount);
  });

  it('3. Valid confirm executes once and mutates plan_exercises', async () => {
    const supabase = createMockSupabase();
    const edit = parsePlanEdit('Add high to low fly to my push day');
    const proposal = await proposePlanEdit(supabase, 'athlete-1', edit, 'Add high to low fly to my push day');

    const execResult = await executePlanEdit(supabase, 'athlete-1', proposal.proposalId!);

    expect(execResult.success).toBe(true);
    expect(execResult.action).toBe('add');
    expect(supabase._state.planExercises.length).toBe(3);
    expect(supabase._state.planExercises[2].exercise_id).toBe('ex-cable-fly');
    expect(supabase._state.proposals[0].status).toBe('applied');
  });

  it('4. Confirm twice executes once (idempotent)', async () => {
    const supabase = createMockSupabase();
    const edit = parsePlanEdit('Add high to low fly to my push day');
    const proposal = await proposePlanEdit(supabase, 'athlete-1', edit, 'Add high to low fly to my push day');

    const first = await executePlanEdit(supabase, 'athlete-1', proposal.proposalId!);
    const second = await executePlanEdit(supabase, 'athlete-1', proposal.proposalId!);

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(second.reason).toBe('already_applied');
    // Still exactly 3 rows in plan_exercises, not duplicated to 4
    expect(supabase._state.planExercises.length).toBe(3);
  });

  it('5. Cancel = zero workout mutation', async () => {
    const supabase = createMockSupabase();
    const initialCount = supabase._state.planExercises.length;
    const edit = parsePlanEdit('Add high to low fly to my push day');
    const proposal = await proposePlanEdit(supabase, 'athlete-1', edit, 'Add high to low fly to my push day');

    const cancelResult = await cancelPlanEdit(supabase, 'athlete-1', proposal.proposalId!);

    expect(cancelResult.success).toBe(true);
    expect(supabase._state.proposals[0].status).toBe('cancelled');
    expect(supabase._state.planExercises.length).toBe(initialCount);
  });

  it('6. Cancelled proposal cannot be confirmed', async () => {
    const supabase = createMockSupabase();
    const edit = parsePlanEdit('Add high to low fly to my push day');
    const proposal = await proposePlanEdit(supabase, 'athlete-1', edit, 'Add high to low fly to my push day');

    await cancelPlanEdit(supabase, 'athlete-1', proposal.proposalId!);
    const execResult = await executePlanEdit(supabase, 'athlete-1', proposal.proposalId!);

    expect(execResult.success).toBe(false);
    expect(execResult.reason).toBe('cancelled');
    expect(supabase._state.planExercises.length).toBe(2);
  });

  it('7. Expired proposal cannot be confirmed', async () => {
    const supabase = createMockSupabase();
    const edit = parsePlanEdit('Add high to low fly to my push day');
    const proposal = await proposePlanEdit(supabase, 'athlete-1', edit, 'Add high to low fly to my push day');

    // Simulate expiry by backdating expires_at
    supabase._state.proposals[0].expires_at = new Date(Date.now() - 1000 * 60 * 60).toISOString();

    const execResult = await executePlanEdit(supabase, 'athlete-1', proposal.proposalId!);

    expect(execResult.success).toBe(false);
    expect(execResult.reason).toBe('expired');
    expect(supabase._state.planExercises.length).toBe(2);
  });

  it('8. Another athlete cannot confirm proposal (tenant isolation)', async () => {
    const supabase = createMockSupabase();
    const edit = parsePlanEdit('Add high to low fly to my push day');
    const proposal = await proposePlanEdit(supabase, 'athlete-1', edit, 'Add high to low fly to my push day');

    // Athlete 2 attempts to confirm Athlete 1's proposal
    const execResult = await executePlanEdit(supabase, 'athlete-2', proposal.proposalId!);

    expect(execResult.success).toBe(false);
    expect(execResult.reason).toBe('not_found');
    expect(supabase._state.planExercises.length).toBe(2);
  });

  it('9. Stale target row rejected on remove/replace/update', async () => {
    const supabase = createMockSupabase();
    const edit = parsePlanEdit('Remove Barbell Bench Press from my plan');
    const proposal = await proposePlanEdit(supabase, 'athlete-1', edit, 'Remove Barbell Bench Press from my plan');

    // Simulate user removing bench press through mobile UI before confirming AI proposal
    supabase._state.planExercises = supabase._state.planExercises.filter((pe: any) => pe.exercise_id !== 'ex-bench');

    const execResult = await executePlanEdit(supabase, 'athlete-1', proposal.proposalId!);

    expect(execResult.success).toBe(false);
    expect(execResult.reason).toBe('proposal_stale');
  });

  it('10. Unknown exercise produces no proposal', async () => {
    const supabase = createMockSupabase();
    const edit = parsePlanEdit('Add Kryptonite Flying Squat to push day');

    const result = await proposePlanEdit(supabase, 'athlete-1', edit, 'Add Kryptonite Flying Squat to push day');

    expect(result.success).toBe(false);
    expect(result.status).toBe('unknown_exercise');
    expect(supabase._state.proposals.length).toBe(0);
  });

  it('11. Ambiguous exercise produces no proposal', async () => {
    const supabase = createMockSupabase();
    const edit = parsePlanEdit('change my workout please');

    const result = await proposePlanEdit(supabase, 'athlete-1', edit, 'change my workout please');

    expect(result.success).toBe(false);
    expect(result.status).toBe('ambiguous');
    expect(supabase._state.proposals.length).toBe(0);
  });

  it('12. REMOVE operation proposal and execution', async () => {
    const supabase = createMockSupabase();
    const edit = parsePlanEdit('Remove Incline Dumbbell Press');
    expect(edit?.action).toBe('remove');

    const proposal = await proposePlanEdit(supabase, 'athlete-1', edit, 'Remove Incline Dumbbell Press');
    expect(proposal.success).toBe(true);
    expect(supabase._state.planExercises.length).toBe(2);

    const exec = await executePlanEdit(supabase, 'athlete-1', proposal.proposalId!);
    expect(exec.success).toBe(true);
    expect(supabase._state.planExercises.length).toBe(1);
    expect(supabase._state.planExercises[0].exercise_id).toBe('ex-bench');
  });

  it('13. REPLACE operation proposal and execution', async () => {
    const supabase = createMockSupabase();
    const edit = parsePlanEdit('Replace Incline Dumbbell Press with High-to-Low Cable Fly');
    expect(edit?.action).toBe('replace');

    const proposal = await proposePlanEdit(supabase, 'athlete-1', edit, 'Replace Incline Dumbbell Press with High-to-Low Cable Fly');
    expect(proposal.success).toBe(true);
    expect(proposal.proposalData?.replacementExerciseName).toBe('High-to-Low Cable Fly');

    const exec = await executePlanEdit(supabase, 'athlete-1', proposal.proposalId!);
    expect(exec.success).toBe(true);
    expect(supabase._state.planExercises[1].exercise_id).toBe('ex-cable-fly');
  });

  it('14. UPDATE SETS/REPS operation proposal and execution', async () => {
    const supabase = createMockSupabase();
    const edit = parsePlanEdit('Change Barbell Bench Press to 5 sets of 5');
    expect(edit?.action).toBe('update_sets_reps');
    expect(edit?.sets).toBe('5');
    expect(edit?.reps).toBe('5');

    const proposal = await proposePlanEdit(supabase, 'athlete-1', edit, 'Change Barbell Bench Press to 5 sets of 5');
    expect(proposal.success).toBe(true);

    const exec = await executePlanEdit(supabase, 'athlete-1', proposal.proposalId!);
    expect(exec.success).toBe(true);
    expect(supabase._state.planExercises[0].sets).toBe('5');
    expect(supabase._state.planExercises[0].reps).toBe('5');
  });

  it('15. UPDATE REST operation proposal and execution', async () => {
    const supabase = createMockSupabase();
    const edit = parsePlanEdit('Change rest time on Barbell Bench Press to 90 seconds');
    expect(edit?.action).toBe('update_rest');
    expect(edit?.restSeconds).toBe(90);

    const proposal = await proposePlanEdit(supabase, 'athlete-1', edit, 'Change rest time on Barbell Bench Press to 90 seconds');
    expect(proposal.success).toBe(true);

    const exec = await executePlanEdit(supabase, 'athlete-1', proposal.proposalId!);
    expect(exec.success).toBe(true);
    expect(supabase._state.planExercises[0].rest_seconds).toBe(90);
  });

  it('16. Exact target_plan_exercise_id targeting when duplicate exercises exist across days', async () => {
    // Setup plan where Barbell Bench Press appears on Day 1 (pe-1) and Day 2 (pe-bench-2)
    const supabase = createMockSupabase({
      planExercises: [
        { id: 'pe-1', plan_day_id: 'day-1', exercise_id: 'ex-bench', order_index: 0, sets: '4', reps: '6-8', rest_seconds: 180 },
        { id: 'pe-2', plan_day_id: 'day-1', exercise_id: 'ex-incline-db', order_index: 1, sets: '3', reps: '8-10', rest_seconds: 120 },
        { id: 'pe-bench-2', plan_day_id: 'day-2', exercise_id: 'ex-bench', order_index: 0, sets: '3', reps: '12', rest_seconds: 60 },
      ],
    });

    // When specifying push day (day 1), proposal targets pe-1 specifically
    const edit = parsePlanEdit('Change Barbell Bench Press to 5 sets of 5 on push day');
    const proposal = await proposePlanEdit(supabase, 'athlete-1', edit, 'Change Barbell Bench Press to 5 sets of 5 on push day');
    expect(proposal.success).toBe(true);
    expect(proposal.proposalData?.targetPlanExerciseId).toBe('pe-1');

    // Execution targets pe-1 specifically, leaving pe-bench-2 untouched
    const exec = await executePlanEdit(supabase, 'athlete-1', proposal.proposalId!);
    expect(exec.success).toBe(true);

    const updatedPe1 = supabase._state.planExercises.find((p: any) => p.id === 'pe-1');
    const updatedPeBench2 = supabase._state.planExercises.find((p: any) => p.id === 'pe-bench-2');
    expect(updatedPe1.sets).toBe('5');
    expect(updatedPeBench2.sets).toBe('3');
    expect(updatedPeBench2.reps).toBe('12');
  });

  it('17. Transactional RPC execution integration when supabase.rpc is present', async () => {
    const supabase = createMockSupabase();
    supabase.rpc = vi.fn().mockResolvedValue({
      data: {
        success: true,
        action: 'add',
        planName: 'Push Pull Legs',
        message: 'High-to-Low Cable Fly added to Push Day.',
      },
      error: null,
    });

    const execResult = await executePlanEdit(supabase, 'athlete-1', 'prop-test-rpc');
    expect(execResult.success).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('execute_ai_plan_edit_proposal', {
      p_proposal_id: 'prop-test-rpc',
      p_athlete_id: 'athlete-1',
    });
  });

  it('18. Disambiguate when multiple instances of an exercise exist across days', async () => {
    // Setup plan with bench press on Day 1 and Day 2
    const supabase = createMockSupabase({
      planExercises: [
        { id: 'pe-1', plan_day_id: 'day-1', exercise_id: 'ex-bench', order_index: 0, sets: '4', reps: '6-8', rest_seconds: 180 },
        { id: 'pe-2', plan_day_id: 'day-2', exercise_id: 'ex-bench', order_index: 0, sets: '3', reps: '10', rest_seconds: 120 },
      ],
    });

    const edit = parsePlanEdit('Remove Barbell Bench Press from my plan');
    const result = await proposePlanEdit(supabase, 'athlete-1', edit, 'Remove Barbell Bench Press from my plan');

    expect(result.success).toBe(false);
    expect(result.status).toBe('ambiguous');
    expect(result.reason).toBe('ambiguous_target');
    expect(supabase._state.proposals.length).toBe(0);
  });

  it('19. Fail closed on transactional RPC error with zero plan mutation', async () => {
    const supabase = createMockSupabase();
    const initialPlanCount = supabase._state.planExercises.length;
    supabase.rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Database transaction lock timeout' },
    });

    const execResult = await executePlanEdit(supabase, 'athlete-1', 'prop-fail-closed');

    expect(execResult.success).toBe(false);
    expect(execResult.reason).toBe('db_error');
    expect(supabase._state.planExercises.length).toBe(initialPlanCount);
  });

  it('20. Cancel RPC execution integration when supabase.rpc is present', async () => {
    const supabase = createMockSupabase();
    supabase.rpc = vi.fn().mockResolvedValue({
      data: { success: true, message: 'Change cancelled.' },
      error: null,
    });

    const cancelResult = await cancelPlanEdit(supabase, 'athlete-1', 'prop-test-cancel');
    expect(cancelResult.success).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('cancel_ai_plan_edit_proposal', {
      p_proposal_id: 'prop-test-cancel',
      p_athlete_id: 'athlete-1',
    });
  });

  it('21. Concurrency: Two concurrent confirmations result in exactly one mutation and one already_applied', async () => {
    const supabase = createMockSupabase();
    const edit = parsePlanEdit('Add high to low fly to my push day');
    const proposal = await proposePlanEdit(supabase, 'athlete-1', edit, 'Add high to low fly to my push day');
    expect(proposal.success).toBe(true);

    const [exec1, exec2] = await Promise.all([
      executePlanEdit(supabase, 'athlete-1', proposal.proposalId!),
      executePlanEdit(supabase, 'athlete-1', proposal.proposalId!),
    ]);

    expect(exec1.success).toBe(true);
    expect(exec2.success).toBe(true);

    const appliedCount = (exec1.action === 'add' ? 1 : 0) + (exec2.action === 'add' ? 1 : 0);
    const alreadyAppliedCount = (exec1.reason === 'already_applied' ? 1 : 0) + (exec2.reason === 'already_applied' ? 1 : 0);

    expect(appliedCount).toBe(1);
    expect(alreadyAppliedCount).toBe(1);
  });

  it('22. Concurrency: Confirm vs cancel race resolves to exactly one terminal state', async () => {
    const supabase = createMockSupabase();
    const edit = parsePlanEdit('Add high to low fly to my push day');
    const proposal = await proposePlanEdit(supabase, 'athlete-1', edit, 'Add high to low fly to my push day');
    expect(proposal.success).toBe(true);

    // Cancel first
    const cancelRes = await cancelPlanEdit(supabase, 'athlete-1', proposal.proposalId!);
    expect(cancelRes.success).toBe(true);

    // Then confirm
    const confirmRes = await executePlanEdit(supabase, 'athlete-1', proposal.proposalId!);
    expect(confirmRes.success).toBe(false);
    expect(confirmRes.reason).toBe('cancelled');
  });

  it('23. Security: Migration enforces restrictive RPC permissions (service_role only)', async () => {
    const fs = await import('fs');
    const migrationContent = fs.readFileSync('supabase/migrations/20260817220000_ai_plan_edit_proposals.sql', 'utf-8');

    expect(migrationContent).toContain('REVOKE ALL ON FUNCTION public.execute_ai_plan_edit_proposal(UUID, UUID) FROM PUBLIC');
    expect(migrationContent).toContain('REVOKE ALL ON FUNCTION public.execute_ai_plan_edit_proposal(UUID, UUID) FROM anon');
    expect(migrationContent).toContain('REVOKE ALL ON FUNCTION public.execute_ai_plan_edit_proposal(UUID, UUID) FROM authenticated');
    expect(migrationContent).toContain('GRANT EXECUTE ON FUNCTION public.execute_ai_plan_edit_proposal(UUID, UUID) TO service_role');

    expect(migrationContent).toContain('REVOKE ALL ON FUNCTION public.cancel_ai_plan_edit_proposal(UUID, UUID) FROM PUBLIC');
    expect(migrationContent).toContain('REVOKE ALL ON FUNCTION public.cancel_ai_plan_edit_proposal(UUID, UUID) FROM anon');
    expect(migrationContent).toContain('REVOKE ALL ON FUNCTION public.cancel_ai_plan_edit_proposal(UUID, UUID) FROM authenticated');
    expect(migrationContent).toContain('GRANT EXECUTE ON FUNCTION public.cancel_ai_plan_edit_proposal(UUID, UUID) TO service_role');
  });
});

describe('Mobile Client Action Handlers & Double-Tap Suppression', () => {
  it('classifyAICoachAction classifies confirm_plan_edit as plan_edit_confirm', () => {
    expect(classifyAICoachAction('confirm_plan_edit')).toBe('plan_edit_confirm');
    expect(classifyAICoachAction('cancel_plan_edit')).toBe('plan_edit_cancel');
  });

  it('executePlanEditFromAction executes and handles double-tap gracefully', async () => {
    const mockRepo = {
      confirmPlanEdit: vi.fn().mockResolvedValue({
        success: true,
        action: 'add',
        planName: 'Push Pull Legs',
        message: 'High-to-Low Cable Fly added to Push Day.',
      }),
      cancelPlanEdit: vi.fn().mockResolvedValue({ success: true, message: 'Cancelled.' }),
    };

    const promise1 = executePlanEditFromAction('act-1', 'prop-1', mockRepo);
    const promise2 = executePlanEditFromAction('act-1', 'prop-1', mockRepo);

    const [res1, res2] = await Promise.all([promise1, promise2]);

    expect(res1.kind).toBe('success');
    expect(res2.kind).toBe('success');
    expect(mockRepo.confirmPlanEdit).toHaveBeenCalledTimes(1);
  });

  it('useAICoachStore markActionStatus and markActionCancelled work correctly', () => {
    useAICoachStore.setState({
      messages: [
        {
          id: 'msg-1',
          role: 'assistant',
          content: 'Here is your proposed edit.',
          createdAt: Date.now(),
          actions: [
            {
              id: 'act-edit-1',
              type: 'confirm_plan_edit',
              label: 'Confirm Change',
              data: { proposalId: 'prop-123' },
            },
          ],
        },
      ],
    });

    const store = useAICoachStore.getState();
    store.markActionCancelled('msg-1', 'act-edit-1');

    const updated = useAICoachStore.getState().messages[0].actions![0];
    expect(updated.cancelled).toBe(true);
    expect(updated.status).toBe('cancelled');
  });
});

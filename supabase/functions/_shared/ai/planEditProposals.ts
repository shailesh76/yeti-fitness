// Durable server-side workout-plan edit proposals and confirmation execution.
// Pure module (Deno + vitest).

import { PlanEditRequest, PlanEditAction } from './planEdit.ts';
import { searchCatalogExercise, normalizeExerciseInput, ExerciseCatalogSearchResult } from './exerciseResolver.ts';
import { ProposedPlanEditData } from './coachSchema.ts';

export const PROPOSAL_EXPIRY_MS = 45 * 60 * 1000; // 45 minutes

export interface ProposedPlanEditResult {
  success: boolean;
  status: 'proposal_created' | 'ambiguous' | 'unknown_exercise' | 'no_plan' | 'no_days' | 'not_in_plan' | 'unknown_replacement' | 'db_error';
  proposalId?: string;
  action?: PlanEditAction;
  proposalData?: ProposedPlanEditData;
  message: string;
  reason?: string;
}

export async function proposePlanEdit(
  supabase: any,
  userId: string,
  edit: PlanEditRequest | null,
  rawPrompt: string,
): Promise<ProposedPlanEditResult> {
  if (!edit || edit.ambiguous || !edit.exercise) {
    return { success: false, status: 'ambiguous', reason: 'ambiguous', message: "I couldn't tell exactly which exercise you meant to edit. Which movement and which training day?" };
  }

  // 1. Resolve primary exercise from catalog
  const ex = await searchCatalogExercise(supabase, edit.exercise);
  if (!ex && edit.action !== 'remove') {
    return { success: false, status: 'unknown_exercise', reason: 'unknown_exercise', message: `I couldn't find "${edit.exercise}" in your Yeti library.` };
  }

  // 2. Resolve replacement exercise if applicable
  let rex: ExerciseCatalogSearchResult | null = null;
  if (edit.action === 'replace') {
    rex = await searchCatalogExercise(supabase, edit.replacement || '');
    if (!rex) {
      return { success: false, status: 'unknown_replacement', reason: 'unknown_replacement', message: `I couldn't find "${edit.replacement}" in the library to swap in.` };
    }
  }

  // 3. Resolve active workout plan
  const { data: plans } = await supabase
    .from('workout_plans')
    .select('id, name')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);
  const plan = plans?.[0];
  if (!plan) {
    return { success: false, status: 'no_plan', reason: 'no_plan', message: "You don't have an active workout plan yet — create one and I can propose edits to it." };
  }

  // 4. Resolve plan days
  const { data: days } = await supabase
    .from('plan_days')
    .select('id, day_number, name')
    .eq('plan_id', plan.id)
    .order('day_number');
  if (!days?.length) {
    return { success: false, status: 'no_days', reason: 'no_days', message: 'Your plan has no training days set up yet.' };
  }

  let day = days[0];
  if (edit.targetDay) {
    const t = String(edit.targetDay).toLowerCase();
    const num = t.match(/\d+/);
    const found = days.find((d: any) =>
      (d.name || '').toLowerCase().includes(t.replace(/day\s*\d*/, '').trim()) ||
      (num && String(d.day_number) === num[0]));
    if (found) day = found;
  }
  const dayLabel = day.name || `Day ${day.day_number}`;
  const dayIds = days.map((d: any) => d.id);

  // 5. For remove/replace/move/update: locate exact existing exercise row
  let currentExerciseName = edit.exercise;
  let currentValueDesc: string | undefined;
  let targetPlanExerciseId: string | undefined;

  if (edit.action !== 'add') {
    const { data: pxs } = await supabase
      .from('plan_exercises')
      .select('id, plan_day_id, exercise_id, sets, reps, rest_seconds, exercises(name, slug)')
      .in('plan_day_id', dayIds);

    const normalizedEditName = normalizeExerciseInput(edit.exercise);
    const matchingTargets = (pxs || []).filter((p: any) =>
      (ex && p.exercise_id === ex.id) ||
      (p.exercises?.name && normalizeExerciseInput(p.exercises.name).includes(normalizedEditName)) ||
      (p.exercises?.slug && ex?.slug && p.exercises.slug === ex.slug));

    if (matchingTargets.length === 0) {
      return { success: false, status: 'not_in_plan', reason: 'not_in_plan', message: `I couldn't find "${edit.exercise}" in your current plan.` };
    }

    // Disambiguate if multiple instances exist
    if (matchingTargets.length > 1 && !edit.targetDay) {
      return {
        success: false,
        status: 'ambiguous',
        reason: 'ambiguous_target',
        message: `You have multiple "${edit.exercise}" exercises across your training days. Which day would you like to edit?`,
      };
    }

    const dayTargets = edit.targetDay
      ? matchingTargets.filter((p: any) => p.plan_day_id === day.id)
      : matchingTargets;

    if (dayTargets.length > 1) {
      return {
        success: false,
        status: 'ambiguous',
        reason: 'ambiguous_target',
        message: `You have multiple "${edit.exercise}" exercises on ${dayLabel}. Please clarify which one you'd like to modify.`,
      };
    }

    const target = dayTargets[0] || matchingTargets[0];
    targetPlanExerciseId = target.id;
    currentExerciseName = target.exercises?.name || edit.exercise;
    currentValueDesc = `${target.sets ?? 3} sets × ${target.reps ?? '10'} reps${target.rest_seconds ? ` (${target.rest_seconds}s rest)` : ''}`;
  }

  // 6. Formulate proposed value description and values
  const sets = edit.sets || '3';
  const reps = edit.reps || '10-12';
  const restSeconds = edit.restSeconds ?? 90;

  let proposedValueDesc = '';
  switch (edit.action) {
    case 'add':
      proposedValueDesc = `Add ${ex?.name || edit.exercise} to ${dayLabel} (${sets} sets × ${reps} reps)`;
      break;
    case 'remove':
      proposedValueDesc = `Remove ${currentExerciseName} from your plan`;
      break;
    case 'replace':
      proposedValueDesc = `Replace ${currentExerciseName} with ${rex?.name || edit.replacement}`;
      break;
    case 'move':
      proposedValueDesc = `Move ${currentExerciseName} to ${dayLabel}`;
      break;
    case 'update_sets_reps':
      proposedValueDesc = `Update ${currentExerciseName} to ${sets} sets × ${reps} reps`;
      break;
    case 'update_rest':
      proposedValueDesc = `Update ${currentExerciseName} rest time to ${restSeconds} seconds`;
      break;
  }

  // 7. Save pending proposal to public.ai_plan_edit_proposals
  const now = Date.now();
  const expiresAt = new Date(now + PROPOSAL_EXPIRY_MS).toISOString();

  const { data: proposalRow, error: insertErr } = await supabase
    .from('ai_plan_edit_proposals')
    .insert({
      athlete_id: userId,
      plan_id: plan.id,
      plan_day_id: day.id,
      target_plan_exercise_id: targetPlanExerciseId || null,
      action: edit.action,
      exercise_id: ex?.id || null,
      replacement_exercise_id: rex?.id || null,
      sets: edit.action === 'add' || edit.action === 'update_sets_reps' ? sets : null,
      reps: edit.action === 'add' || edit.action === 'update_sets_reps' ? reps : null,
      rest_seconds: edit.action === 'update_rest' ? restSeconds : (edit.action === 'add' ? restSeconds : null),
      status: 'pending',
      expires_at: expiresAt,
      raw_prompt: rawPrompt,
      plan_name_snapshot: plan.name,
      day_name_snapshot: dayLabel,
      exercise_name_snapshot: ex?.name || currentExerciseName,
      replacement_exercise_name_snapshot: rex?.name || null,
    })
    .select('id')
    .single();

  if (insertErr || !proposalRow) {
    console.error('[proposePlanEdit] insert error:', insertErr);
    return { success: false, status: 'db_error', reason: 'db_error', message: "I couldn't prepare the plan edit. Please try again in a moment." };
  }

  const proposalId = proposalRow.id;
  const proposalData: ProposedPlanEditData = {
    proposalId,
    action: edit.action,
    planId: plan.id,
    planName: plan.name,
    dayId: day.id,
    dayName: dayLabel,
    targetPlanExerciseId,
    exerciseId: ex?.id,
    exerciseName: ex?.name || currentExerciseName,
    replacementExerciseId: rex?.id,
    replacementExerciseName: rex?.name,
    sets: edit.action === 'add' || edit.action === 'update_sets_reps' ? sets : undefined,
    reps: edit.action === 'add' || edit.action === 'update_sets_reps' ? reps : undefined,
    restSeconds: edit.action === 'update_rest' ? restSeconds : undefined,
    currentValueDescription: currentValueDesc,
    proposedValueDescription: proposedValueDesc,
    expiresAt: now + PROPOSAL_EXPIRY_MS,
  };

  return {
    success: true,
    status: 'proposal_created',
    proposalId,
    action: edit.action,
    proposalData,
    message: `I've prepared a proposed change: ${proposedValueDesc}. Please confirm below to apply it.`,
  };
}

export interface ExecutePlanEditResult {
  success: boolean;
  message: string;
  reason?: 'not_found' | 'already_applied' | 'cancelled' | 'expired' | 'proposal_stale' | 'db_error';
  proposalId?: string;
  action?: string;
  planName?: string;
}

/**
 * Executes confirmation strictly through the transactional execute_ai_plan_edit_proposal RPC.
 * Fails closed on any RPC error with zero plan mutations.
 */
export async function executePlanEdit(
  supabase: any,
  userId: string,
  proposalId: string,
): Promise<ExecutePlanEditResult> {
  if (!supabase || typeof supabase.rpc !== 'function') {
    return {
      success: false,
      reason: 'db_error',
      message: 'Transactional database client required.',
    };
  }

  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('execute_ai_plan_edit_proposal', {
      p_proposal_id: proposalId,
      p_athlete_id: userId,
    });

    if (rpcErr || !rpcRes || typeof rpcRes !== 'object') {
      console.error('[executePlanEdit] RPC execution error:', rpcErr);
      return {
        success: false,
        reason: 'db_error',
        message: 'Failed to apply plan change.',
      };
    }

    return {
      success: Boolean(rpcRes.success),
      message: rpcRes.message || (rpcRes.success ? 'Plan change applied.' : 'Unable to apply change.'),
      reason: rpcRes.reason,
      proposalId,
      action: rpcRes.action,
      planName: rpcRes.planName,
    };
  } catch (err: any) {
    console.error('[executePlanEdit] unexpected error:', err);
    return {
      success: false,
      reason: 'db_error',
      message: 'Failed to apply plan change.',
    };
  }
}

/**
 * Executes cancellation strictly through the transactional cancel_ai_plan_edit_proposal RPC.
 * Fails closed on any RPC error.
 */
export async function cancelPlanEdit(
  supabase: any,
  userId: string,
  proposalId: string,
): Promise<{ success: boolean; message: string }> {
  if (!supabase || typeof supabase.rpc !== 'function') {
    return {
      success: false,
      message: 'Transactional database client required.',
    };
  }

  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('cancel_ai_plan_edit_proposal', {
      p_proposal_id: proposalId,
      p_athlete_id: userId,
    });

    if (rpcErr || !rpcRes || typeof rpcRes !== 'object') {
      console.error('[cancelPlanEdit] RPC error:', rpcErr);
      return {
        success: false,
        message: "Unable to cancel plan edit proposal.",
      };
    }

    return {
      success: Boolean(rpcRes.success),
      message: rpcRes.message || 'Change cancelled.',
    };
  } catch (err: any) {
    console.error('[cancelPlanEdit] unexpected error:', err);
    return {
      success: false,
      message: "Unable to cancel plan edit proposal.",
    };
  }
}

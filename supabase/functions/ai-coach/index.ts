import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AINotConfiguredError, AllProvidersFailedError, generateChat, healthCheck, checkProviderCapacity, ProviderAttemptLog, summarizeFallbackReason } from "../_shared/ai/index.ts";
import { classifyIntentWithHistory, classifySafetySignal, CoachIntent } from "../_shared/ai/intent.ts";
import { parsePlanEdit } from "../_shared/ai/planEdit.ts";
import { resolveExerciseAlias, extractExerciseName, normalizeExerciseInput, searchCatalogExercise, buildExerciseGroundingPrompt } from "../_shared/ai/exerciseResolver.ts";
import { decideProgression, computeNutritionRemaining, estimateOneRepMax, NutritionInput } from "../_shared/ai/coachEngine.ts";
import { buildCoachSystemPrompt } from "../_shared/ai/coachPrompt.ts";
import { buildCoachMemoryCard, foldMemoryRows, mergeCoachMemory, sanitizeSummarySensitivity } from "../_shared/ai/coachMemory.ts";
import { classifyMemory, normalizeMemoryCategory } from "../_shared/ai/memoryClassifier.ts";
import {
  parseCoachResponse, responseViolatesIntent, safePlainText, ungroundedNumbers,
  REPAIR_INSTRUCTION, INTENT_ISOLATION_RETRY, GROUNDING_RETRY, CoachResponse,
  containsInternalLabels, sanitizeInternalLabels, LABEL_LEAK_RETRY,
  containsMemoryClaim, MEMORY_PERSISTENCE_FAILED_NOTE,
  computeResponseType, computeActions, CoachAction, CoachResponseType,
  unsupportedProseNumbers, buildProseGroundingRetryInstruction, ungroundedNumberFallbackResponse,
  unsupportedPersonalClaims, buildPersonalClaimRetryInstruction, stripUnsupportedPersonalClaims,
} from "../_shared/ai/coachSchema.ts";
import { detectNutritionTargetAsk, describeNutritionTarget, StoredNutritionTargets } from "../_shared/ai/nutritionTargetLookup.ts";
import {
  detectExplicitMemoryCommand, detectExplicitMemoryRetrieval,
  buildSaveAcknowledgment, buildDeleteAcknowledgment, buildRetrievalAnswer,
} from "../_shared/ai/explicitMemory.ts";
import { resolveKnownRequirements, findMissingRequired, mapProfileGoal } from "../_shared/ai/programRequirements.ts";
import { recommendSplit } from "../_shared/ai/splitRecommender.ts";
import { generateProgram, applyDraftEdit, GeneratedDay, ExerciseCandidate, MuscleGroup } from "../_shared/ai/programGenerator.ts";
import { validateProgram } from "../_shared/ai/programValidator.ts";
import { saveWorkoutPlan, activateWorkoutPlan } from "../_shared/ai/planPersistence.ts";
import { computeRawTelemetry, TelemetryInput } from "../_shared/ai/weeklyReviewEngine.ts";
import { deriveCoachingIntelligence } from "../_shared/ai/coachIntelligence.ts";
import { computeCalorieTargets, computeMacroCycling, getEqualMacroSubstitutions, generateGroceryList, getSupplementAdvice } from "../_shared/ai/nutritionEngine.ts";
import { validateNutritionPlan } from "../_shared/ai/nutritionValidator.ts";
import { deriveNutritionIntelligence } from "../_shared/ai/nutritionIntelligence.ts";
import { saveNutritionPlan } from "../_shared/ai/nutritionPlanPersistence.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};


const YETI_APP_ROUTE_DIRECTORY: Record<string, { route: string; label: string; description: string }> = {
  'rest_timer': { route: '/workouts/rest-timer', label: 'Rest Timer', description: 'Rest timer settings and active timer view' },
  'workout_log': { route: '/workouts/history', label: 'Workout History', description: 'Past workouts and completed session logs' },
  'nutrition_diary': { route: '/nutrition/log', label: 'Nutrition Diary', description: 'Daily food logger and calorie/macro summary' },
  'settings': { route: '/settings/profile', label: 'Account Settings', description: 'Profile, goals, equipment, and subscription settings' },
  'progress': { route: '/progress/analytics', label: 'Progress & PRs', description: 'Personal records, volume graphs, and strength analytics' },
  'active_workout': { route: '/workouts/active', label: 'Active Session', description: 'Current workout logging screen' },
};

const WORKOUT_INTENTS: CoachIntent[] = [
  'workout_plan_edit', 'workout_progression', 'exercise_substitution',
  'workout_program_generate', 'weekly_review', 'adaptive_coaching',
  'exercise_logging', 'schedule_adjustment', 'exercise_inquiry',
];
const NUTRITION_INTENTS: CoachIntent[] = ['nutrition_plan_generate', 'nutrition_plan_edit', 'nutrition_review', 'nutrition_target_lookup', 'grocery_list', 'eating_out_guidance', 'supplement_guidance', 'nutrition_status', 'nutrition_advice'];
// Intents that receive the personal coaching context (profile + memory) but no
// engine computation.
const PERSONAL_CONTEXT_INTENTS: CoachIntent[] = [
  'workout_explanation', 'rest_pacing', 'recovery',
  'goal_adjustment',
];

/** Readable engine label for diagnostics (Fix 10) — which deterministic engine (if any) backed this reply. */
function engineNameForIntent(intent: CoachIntent): string {
  switch (intent) {
    case 'workout_progression': return 'progression_engine';
    case 'workout_program_generate': return 'program_generator';
    case 'workout_plan_edit': return 'plan_edit_engine';
    case 'exercise_inquiry': return 'exercise_grounding';
    case 'weekly_review':
    case 'adaptive_coaching': return 'coaching_intelligence_engine';
    case 'nutrition_target_lookup': return 'nutrition_target_lookup';
    case 'nutrition_plan_generate':
    case 'nutrition_plan_edit':
    case 'nutrition_review':
    case 'nutrition_status':
    case 'nutrition_advice': return 'nutrition_engine';
    case 'grocery_list': return 'grocery_engine';
    case 'supplement_guidance': return 'supplement_engine';
    case 'eating_out_guidance': return 'eating_out_engine';
    default: return 'llm_only';
  }
}




// ─── Intent-scoped context loaders (isolated — never cross domains) ──────────────

/** Workout plan/day/exercise context. NEVER loads nutrition. */
async function loadWorkoutContext(supabase: any, userId: string): Promise<string> {
  try {
    const { data: plans } = await supabase
      .from('workout_plans').select('id, name')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(1);
    const plan = plans?.[0];
    if (!plan) return 'No active workout plan on file.';

    const { data: days } = await supabase
      .from('plan_days').select('id, day_number, name').eq('plan_id', plan.id).order('day_number');
    const dayIds = (days || []).map((d: any) => d.id);

    const exByDay: Record<string, any[]> = {};
    if (dayIds.length) {
      const { data: pex } = await supabase
        .from('plan_exercises')
        .select('plan_day_id, sets, reps, target_rpe, order_index, exercises(name)')
        .in('plan_day_id', dayIds).order('order_index');
      for (const e of pex || []) (exByDay[e.plan_day_id] ||= []).push(e);
    }

    const lines = [`ACTIVE PLAN: ${plan.name}`];
    for (const d of days || []) {
      lines.push(`Day ${d.day_number}${d.name ? ` (${d.name})` : ''}:`);
      for (const e of exByDay[d.id] || []) {
        const nm = e.exercises?.name || 'Exercise';
        lines.push(`  - ${nm}: ${e.sets ?? '?'} x ${e.reps ?? '?'}${e.target_rpe ? ` @RPE ${e.target_rpe}` : ''}`);
      }
    }
    return lines.join('\n');
  } catch (_e) {
    return '';
  }
}

/** Nutrition context + engine input. NEVER loads workout routines. */
async function loadNutritionContext(
  supabase: any, userId: string,
): Promise<{ context: string; engine: NutritionInput }> {
  const engine: NutritionInput = {
    calorieTarget: null, proteinTarget: null, carbTarget: null, fatTarget: null,
    consumedCalories: 0, consumedProtein: 0, consumedCarbs: 0, consumedFat: 0,
  };
  try {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    // Independent of each other — run in parallel (one round trip instead of two).
    const [{ data: prof }, { data: logs }] = await Promise.all([
      supabase.from('profiles')
        .select('daily_calorie_target,daily_protein_target,daily_carb_target,daily_fat_target')
        .eq('id', userId).maybeSingle(),
      supabase.from('meal_logs')
        .select('servings, food:foods(calories,protein,carbs,fat)')
        .eq('user_id', userId).gte('logged_at', start.toISOString()),
    ]);
    if (prof) {
      engine.calorieTarget = prof.daily_calorie_target ?? null;
      engine.proteinTarget = prof.daily_protein_target ?? null;
      engine.carbTarget = prof.daily_carb_target ?? null;
      engine.fatTarget = prof.daily_fat_target ?? null;
    }
    let c = 0, p = 0, cb = 0, f = 0;
    for (const l of logs || []) {
      const s = Number(l.servings) || 0; const fd = l.food || {};
      c += (fd.calories || 0) * s; p += (fd.protein || 0) * s; cb += (fd.carbs || 0) * s; f += (fd.fat || 0) * s;
    }
    engine.consumedCalories = Math.round(c); engine.consumedProtein = Math.round(p);
    engine.consumedCarbs = Math.round(cb); engine.consumedFat = Math.round(f);
  } catch (_e) { /* degrade to empty */ }

  const context =
    `NUTRITION TARGETS: ${engine.calorieTarget ?? '—'} kcal / P${engine.proteinTarget ?? '—'} C${engine.carbTarget ?? '—'} F${engine.fatTarget ?? '—'}\n` +
    `CONSUMED TODAY: ${engine.consumedCalories} kcal / P${engine.consumedProtein} C${engine.consumedCarbs} F${engine.consumedFat}`;
  return { context, engine };
}

// ─── Progression history for a specific lift ─────────────────────────────────────
// Real schema: session_sets(weight, reps, exercise_id, session_id, completed_at) —
// NO rpe/exercise_name/user_id. Ownership + completion come via
// session_id → workout_sessions(athlete_id, completed_at). RPE is therefore never
// fabricated (avgRpe stays null).
// extractExerciseName() lives in exerciseResolver.ts (imported above) so it's
// unit-testable outside Deno.

/**
 * Loads the last 3–5 completed working sets for the lift named in the message and
 * builds the deterministic decideProgression() input + a human-readable history
 * block. Returns engineInput: null when the lift/history can't be resolved (the
 * engine then reports insufficient_data — nothing is invented).
 */
async function loadProgressionForExercise(
  supabase: any, userId: string, message: string,
): Promise<{ engineInput: any | null; context: string }> {
  const candidate = extractExerciseName(message);
  if (!candidate) return { engineInput: null, context: 'No specific exercise named in the question.' };

  // 1. Alias-resolve → canonical search term, then look up the catalog id.
  const canonical = resolveExerciseAlias(candidate);
  const { data: matches } = await supabase
    .from('exercises').select('id, name').ilike('name', `%${canonical}%`).limit(1);
  const ex = matches?.[0];
  if (!ex) return { engineInput: null, context: `No catalog exercise matched "${candidate}".` };

  // 2. Recent COMPLETED sessions for the athlete (ownership + completion here).
  const { data: sessions } = await supabase
    .from('workout_sessions').select('id, completed_at')
    .eq('athlete_id', userId).not('completed_at', 'is', null)
    .order('completed_at', { ascending: false }).limit(8);
  const sessionIds = (sessions || []).map((s: any) => s.id);
  if (!sessionIds.length) {
    return { engineInput: null, context: `EXERCISE: ${ex.name}\nNo completed sessions logged yet.` };
  }

  // 3. This lift's working sets within those sessions, + PR history, plan
  //    prescription and adherence — all independent of each other once
  //    sessionIds/ex.id are known, so fetched in parallel (one round trip
  //    instead of four sequential ones).
  const [{ data: sets }, { data: prRows }, { data: pex }, adherenceRpc] = await Promise.all([
    supabase.from('session_sets').select('weight, reps, session_id, completed_at')
      .eq('exercise_id', ex.id).in('session_id', sessionIds),
    supabase.from('personal_records').select('value')
      .eq('athlete_id', userId).eq('exercise_id', ex.id).eq('record_type', 'max_weight')
      .order('value', { ascending: false }).limit(1),
    supabase.from('plan_exercises').select('sets, reps').eq('exercise_id', ex.id).limit(1),
    // calculate_adherence is an established RPC (used by the coach dashboard);
    // treated as optional/best-effort — a failure here must never break the
    // reply, matching this function's existing fail-open pattern for such data.
    supabase.rpc('calculate_adherence', { athlete_id_param: userId }).then((r: any) => r).catch(() => ({ data: null })),
  ]);
  if (!sets || sets.length === 0) {
    return { engineInput: null, context: `EXERCISE: ${ex.name}\nNo completed sets logged for this lift yet.` };
  }
  const personalRecordKg = prRows?.[0]?.value != null ? Number(prRows[0].value) : null;
  const adherencePct = typeof adherenceRpc?.data === 'number' ? adherenceRpc.data : null;

  // 4. Group by session, ordered by session recency; take the latest 3–5 for
  //    the current-session decision, but keep ALL fetched sessions for the
  //    multi-session trend signals (plateau needs a real 3+ week window).
  const bySession: Record<string, any[]> = {};
  for (const s of sets) (bySession[s.session_id] ||= []).push(s);
  const sessionCompletedAt = new Map((sessions || []).map((s: any) => [s.id, s.completed_at]));
  const orderedIds = sessionIds.filter((id: string) => bySession[id]);
  const latest = bySession[orderedIds[0]];
  const lastSetReps = latest.map((s: any) => Number(s.reps) || 0);
  const currentWeight = Math.max(...latest.map((s: any) => Number(s.weight) || 0));

  // Estimated-1RM + volume per session (mirrors @yeti/training-engine's
  // plateau/deload signals; RPE is omitted — not stored server-side).
  const nowMs = Date.now();
  const sessionHistory = orderedIds.map((id: string) => {
    const sess = bySession[id];
    const estimated1rm = Math.max(...sess.map((s: any) => estimateOneRepMax(Number(s.weight) || 0, Number(s.reps) || 0)));
    const volumeKg = sess.reduce((sum: number, s: any) => sum + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0);
    const completedAt = sessionCompletedAt.get(id);
    const daysAgo = completedAt ? Math.max(0, Math.round((nowMs - new Date(completedAt as string).getTime()) / 86_400_000)) : 0;
    return { daysAgo, estimated1rm, volumeKg };
  });

  // 5. Target sets/reps from the plan prescription, if the lift is programmed.
  const repMatch = String(pex?.[0]?.reps ?? '').match(/(\d+)\s*-\s*(\d+)/);
  const targetRepsLow = repMatch ? Number(repMatch[1]) : Math.min(...lastSetReps);
  const targetRepsHigh = repMatch ? Number(repMatch[2]) : Math.max(8, ...lastSetReps);
  const targetSets = Number(pex?.[0]?.sets) || latest.length;

  const engineInput = {
    exercise: ex.name,
    currentWeightKg: currentWeight,
    targetRepsLow, targetRepsHigh, targetSets,
    lastSetReps,
    avgRpe: null,          // RPE is not recorded server-side — never fabricated
    recoveryScore: null,   // no sleep/recovery data source exists yet — never fabricated
    isUpperBody: /\b(bench|press|row|curl|pulldown|fly|raise|dip|pull-?up|push-?up|shrug|extension|chin)\b/.test(ex.name.toLowerCase()),
    adherencePct,
    personalRecordKg,
    sessionHistory,
  };

  const histLines = orderedIds.slice(0, 5).map((id: string, i: number) => {
    const sess = bySession[id];
    const w = Math.max(...sess.map((s: any) => Number(s.weight) || 0));
    const reps = sess.map((s: any) => Number(s.reps) || 0).join(', ');
    const when = sessionCompletedAt.get(id) ? new Date(sessionCompletedAt.get(id) as string).toLocaleDateString() : '';
    return `  ${i === 0 ? 'latest' : `-${i}`} ${when}: ${w}kg x [${reps}]`;
  }).join('\n');

  const context =
    `EXERCISE: ${ex.name}\nTARGET: ${targetSets} x ${targetRepsLow}-${targetRepsHigh}\n` +
    `RECENT SESSIONS (newest first):\n${histLines}\n` +
    (personalRecordKg != null ? `PERSONAL RECORD: ${personalRecordKg}kg\n` : '') +
    (adherencePct != null ? `ADHERENCE (7-day): ${adherencePct}%\n` : '') +
    `(RPE and recovery are not recorded — do not reference them.)`;

  return { engineInput, context };
}

// ─── Deterministic workout-plan mutation (Phase 2) ──────────────────────────────
// Resolves the exercise, finds the athlete's active plan + target day, and
// EXECUTES the change against plan_exercises (RLS-gated to the athlete). Returns
// an honest { success, message } — the LLM explains this result and NEVER claims
// success unless success === true. Offline devices pick the change up via the
// existing plan_exercises sync-pull path.
interface PlanEditResult { success: boolean; action?: string; message: string; exercise?: string; replacement?: string; day?: string; reason?: string }

async function applyPlanEdit(supabase: any, userId: string, edit: any): Promise<PlanEditResult> {
  if (!edit || edit.ambiguous || !edit.exercise) {
    return { success: false, reason: 'ambiguous', message: "I couldn't tell exactly which exercise you meant. Which movement and which day?" };
  }
  const ex = await searchCatalogExercise(supabase, edit.exercise);
  if (!ex && edit.action !== 'remove') {
    return { success: false, reason: 'unknown_exercise', message: `I couldn't find "${edit.exercise}" in your Yeti library.` };
  }

  const { data: plans } = await supabase
    .from('workout_plans').select('id, name').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(1);
  const plan = plans?.[0];
  if (!plan) return { success: false, reason: 'no_plan', message: "You don't have an active workout plan yet — create one and I'll edit it." };

  const { data: days } = await supabase
    .from('plan_days').select('id, day_number, name').eq('plan_id', plan.id).order('day_number');
  if (!days?.length) return { success: false, reason: 'no_days', message: 'Your plan has no training days set up yet.' };

  // Resolve the target day (by name/number) or default to the first day.
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

  try {
    if (edit.action === 'add' && ex) {
      const { data: existing } = await supabase
        .from('plan_exercises').select('order_index').eq('plan_day_id', day.id)
        .order('order_index', { ascending: false }).limit(1);
      const nextOrder = ((existing?.[0]?.order_index) ?? -1) + 1;
      const { error } = await supabase.from('plan_exercises').insert({
        plan_day_id: day.id, exercise_id: ex.id, order_index: nextOrder, sets: '3', reps: '12-15',
      });
      if (error) throw error;
      return { success: true, action: 'add', exercise: ex.name, day: dayLabel, message: `${ex.name} was added to ${dayLabel}.` };
    }

    // remove / replace / move all locate the existing plan_exercise first.
    const { data: pxs } = await supabase
      .from('plan_exercises').select('id, exercise_id, exercises(name, slug)').in('plan_day_id', dayIds);
    const normalizedEditName = normalizeExerciseInput(edit.exercise);
    const target = (pxs || []).find((p: any) =>
      (ex && p.exercise_id === ex.id) ||
      (p.exercises?.name && normalizeExerciseInput(p.exercises.name).includes(normalizedEditName)) ||
      (p.exercises?.slug && ex?.slug && p.exercises.slug === ex.slug));
    if (!target) return { success: false, reason: 'not_in_plan', message: `I couldn't find ${edit.exercise} in your current plan.` };
    const targetName = target.exercises?.name || edit.exercise;

    if (edit.action === 'remove') {
      const { error } = await supabase.from('plan_exercises').delete().eq('id', target.id);
      if (error) throw error;
      return { success: true, action: 'remove', exercise: targetName, message: `${targetName} was removed from your plan.` };
    }
    if (edit.action === 'replace') {
      const rex = await searchCatalogExercise(supabase, edit.replacement || '');
      if (!rex) return { success: false, reason: 'unknown_replacement', message: `I couldn't find "${edit.replacement}" in the library to swap in.` };
      const { error } = await supabase.from('plan_exercises').update({ exercise_id: rex.id }).eq('id', target.id);
      if (error) throw error;
      return { success: true, action: 'replace', exercise: targetName, replacement: rex.name, message: `${targetName} was replaced with ${rex.name}.` };
    }
    if (edit.action === 'move') {
      const { error } = await supabase.from('plan_exercises').update({ plan_day_id: day.id }).eq('id', target.id);
      if (error) throw error;
      return { success: true, action: 'move', exercise: targetName, day: dayLabel, message: `${targetName} was moved to ${dayLabel}.` };
    }
    return { success: false, reason: 'unknown_action', message: "I couldn't process that edit." };
  } catch (_e) {
    return { success: false, reason: 'db_error', message: "The update didn't go through. Please try again in a moment." };
  }
}

/** True if any user-facing field of the response contains a leaked internal section label. */
function responseLeaksInternalLabels(r: CoachResponse): boolean {
  return containsInternalLabels(`${r.direct_answer} ${r.reason} ${r.follow_up_question || ''}`);
}

/**
 * Text to run the GROUNDING check against: direct_answer, reason,
 * recommended_action, and follow_up_question. This is a strict superset of
 * what toReply() actually renders to the athlete (toReply only includes
 * recommended_action when it's a plain string, treating an object as
 * structured data rather than prose) — deliberately broader here, because a
 * live-observed case showed the model can dump an entire fabricated workout
 * plan (specific sets/reps numbers included) into an OBJECT-shaped
 * recommended_action when ungrounded. That object never reaches the athlete
 * as rendered text today, but it's still returned in `structured` and
 * persisted — the grounding guard must not treat "the model put it in a
 * structured field instead of prose" as a loophole. supporting_data is
 * intentionally excluded here — it already has its own dedicated grounding
 * guard (ungroundedNumbers) with its own retry, checked separately above.
 */
function textForGroundingCheck(r: CoachResponse): string {
  const actionText = typeof r.recommended_action === 'string'
    ? r.recommended_action
    : r.recommended_action != null ? JSON.stringify(r.recommended_action) : '';
  return `${r.direct_answer} ${r.reason} ${actionText} ${r.follow_up_question || ''}`;
}

/** Sanitizes every user-facing field — never touches recommended_action/supporting_data (structured, not prose). */
function sanitizeResponseLabels(r: CoachResponse): CoachResponse {
  return {
    ...r,
    direct_answer: sanitizeInternalLabels(r.direct_answer),
    reason: sanitizeInternalLabels(r.reason),
    follow_up_question: r.follow_up_question ? sanitizeInternalLabels(r.follow_up_question) : r.follow_up_question,
  };
}

// ─── Model execution + schema/cross-intent validation with one retry each ────────
async function runCoach(
  baseMessages: { role: string; content: string }[],
  intent: CoachIntent,
  groundedSource: string,
): Promise<{
  resp: CoachResponse; provider: string; model: string; usage: any; costUsd: number;
  labelLeakDetected: boolean; labelLeakSanitized: boolean; providerAttempts: ProviderAttemptLog[];
}> {
  const gen = (msgs: any[]) => generateChat({ messages: msgs, jsonMode: true, temperature: 0.2, maxTokens: 800 });

  let result = await gen(baseMessages);
  let parsed = parseCoachResponse(result.text);

  // Retry once on invalid schema.
  if (!parsed.ok) {
    result = await gen([...baseMessages, { role: 'user', content: REPAIR_INSTRUCTION }]);
    parsed = parseCoachResponse(result.text);
  }
  let resp: CoachResponse = parsed.ok ? parsed.value : safePlainText(result.text);

  // Cross-intent isolation: a workout answer must not leak nutrition.
  if (responseViolatesIntent(intent, `${resp.direct_answer} ${resp.reason}`)) {
    const retry = await gen([...baseMessages, { role: 'user', content: INTENT_ISOLATION_RETRY }]);
    const reparsed = parseCoachResponse(retry.text);
    const retryResp = reparsed.ok ? reparsed.value : safePlainText(retry.text);
    if (!responseViolatesIntent(intent, `${retryResp.direct_answer} ${retryResp.reason}`)) {
      resp = retryResp; result = retry;
    } else {
      // Never return the leaking answer — safe deterministic fallback.
      resp = safePlainText("I've kept this to your training. Tell me the workout day and I'll refine the sets and reps.");
    }
  }

  // Hallucination guard: supporting_data must cite only grounded numbers.
  if (ungroundedNumbers(resp.supporting_data, groundedSource).length > 0) {
    const retry = await gen([...baseMessages, { role: 'user', content: GROUNDING_RETRY }]);
    const reparsed = parseCoachResponse(retry.text);
    const retryResp = reparsed.ok ? reparsed.value : resp;
    if (ungroundedNumbers(retryResp.supporting_data, groundedSource).length === 0) {
      resp = retryResp; result = retry;
    } else {
      // Strip ungrounded supporting_data rather than surface invented numbers.
      resp = { ...resp, supporting_data: null };
    }
  }

  // Prose-level hallucination guard (pre-beta blocker): the guard above only
  // ever protected supporting_data. Live-observed failure — asked for a
  // bench-press progression plan with no logged history, answered with "I
  // estimate your current 1RM at around 93-95kg" stated directly in prose,
  // which the supporting_data guard never sees. Extends the same
  // grounded-or-reject principle to direct_answer/reason/recommended_action/
  // follow_up_question (see textForGroundingCheck — a strict superset of the
  // rendered reply, and ALSO covers an object-shaped recommended_action —
  // see its own comment for why that matters).
  const userMessagesText = baseMessages.filter((m) => m.role === 'user').map((m) => m.content).join('\n');
  const groundingSources = { userMessagesText, groundedSource };
  if (unsupportedProseNumbers(textForGroundingCheck(resp), groundingSources).length > 0) {
    const unsupported = unsupportedProseNumbers(textForGroundingCheck(resp), groundingSources);
    const retry = await gen([...baseMessages, { role: 'user', content: buildProseGroundingRetryInstruction(unsupported) }]);
    const reparsed = parseCoachResponse(retry.text);
    const retryResp = reparsed.ok ? reparsed.value : resp;
    if (unsupportedProseNumbers(textForGroundingCheck(retryResp), groundingSources).length === 0) {
      resp = retryResp; result = retry;
    } else {
      // Never merely strip the number — a sentence with its number deleted
      // ("your 1RM is around kg") can silently change the advice's meaning.
      // Replace the whole response with an honest, deterministic answer.
      resp = ungroundedNumberFallbackResponse(resp.missing_information);
    }
  }

  // Non-numeric personal-claim grounding guard (final closed-beta gate):
  // covers invented athlete-specific FACTS (preference, dislike, injury,
  // schedule, dietary/recovery pattern, adherence, favourite exercise, weak
  // muscle group, previous performance) — a different failure shape than the
  // numeric guard above, so it needs its own detect -> retry -> resolve pass.
  // Unlike a fabricated number, a fabricated personal-fact aside is normally
  // a self-contained sentence — safe to remove in place rather than replace
  // the whole response (see stripUnsupportedPersonalClaims for why).
  if (unsupportedPersonalClaims(textForGroundingCheck(resp), groundingSources).length > 0) {
    const unsupportedClaims = unsupportedPersonalClaims(textForGroundingCheck(resp), groundingSources);
    const retry = await gen([...baseMessages, { role: 'user', content: buildPersonalClaimRetryInstruction(unsupportedClaims) }]);
    const reparsed = parseCoachResponse(retry.text);
    const retryResp = reparsed.ok ? reparsed.value : resp;
    if (unsupportedPersonalClaims(textForGroundingCheck(retryResp), groundingSources).length === 0) {
      resp = retryResp; result = retry;
    } else {
      resp = stripUnsupportedPersonalClaims(retryResp, groundingSources);
    }
  }

  // Internal-label leak guard: never rely on the prompt instruction alone.
  // Retry once with an explicit correction; if it still leaks, sanitize
  // deterministically rather than ship the raw label text to the athlete.
  let labelLeakDetected = false;
  let labelLeakSanitized = false;
  if (responseLeaksInternalLabels(resp)) {
    labelLeakDetected = true;
    const retry = await gen([...baseMessages, { role: 'user', content: LABEL_LEAK_RETRY }]);
    const reparsed = parseCoachResponse(retry.text);
    const retryResp = reparsed.ok ? reparsed.value : resp;
    if (!responseLeaksInternalLabels(retryResp)) {
      resp = retryResp; result = retry;
    } else {
      resp = sanitizeResponseLabels(retryResp);
      labelLeakSanitized = true;
    }
  }

  return {
    resp, provider: result.provider, model: result.model, usage: result.usage, costUsd: result.costUsd,
    labelLeakDetected, labelLeakSanitized, providerAttempts: result.providerAttempts,
  };
}

function toReply(resp: CoachResponse): string {
  const parts = [resp.direct_answer.trim()];
  if (resp.reason && resp.reason.trim()) parts.push(resp.reason.trim());
  if (typeof resp.recommended_action === 'string' && resp.recommended_action.trim()) parts.push(resp.recommended_action.trim());
  return parts.join('\n\n');
}

async function loadCandidatePool(supabase: any) {
  const { data: catalog } = await supabase
    .from('exercises')
    .select('id, name, equipment, target_muscle, body_part, muscle_group');

  const candidatesByGroup: Partial<Record<MuscleGroup, ExerciseCandidate[]>> = {};
  const catalogMap: Record<string, { id: string; equipment: string | null }> = {};

  for (const ex of catalog || []) {
    catalogMap[ex.name] = { id: ex.id, equipment: ex.equipment };

    const target = (ex.target_muscle || ex.muscle_group || ex.body_part || ex.name || '').toLowerCase();
    let group: MuscleGroup = 'core';
    if (/chest|pectoral|bench|fly/.test(target)) group = 'chest';
    else if (/back|lat|trap|rhomboid|row|pull-?up|pulldown/.test(target)) group = 'back';
    else if (/shoulder|deltoid|overhead press|lateral raise/.test(target)) group = 'shoulders';
    else if (/bicep|brachialis|curl/.test(target)) group = 'biceps';
    else if (/tricep|pushdown|dip/.test(target)) group = 'triceps';
    else if (/quad|thigh|squat|lunge|leg press/.test(target)) group = 'quads';
    else if (/hamstring|rdl|deadlift/.test(target)) group = 'hamstrings';
    else if (/glute|hip thrust/.test(target)) group = 'glutes';
    else if (/calf|calves|soleus/.test(target)) group = 'calves';
    else if (/ab|core|oblique|plank|crunch/.test(target)) group = 'core';

    (candidatesByGroup[group] ||= []).push({
      name: ex.name,
      equipment: ex.equipment,
    });
  }

  return { candidatesByGroup, catalogMap };
}

async function loadAthleteTelemetry(supabase: any, userId: string): Promise<TelemetryInput> {
  const start28DaysAgo = new Date(Date.now() - 28 * 86_400_000).toISOString();
  const start7DaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  try {
    const [
      { data: sessions },
      { data: prs },
      { data: weights },
      { data: meals },
      { data: profile },
    ] = await Promise.all([
      supabase.from('workout_sessions')
        .select('id, completed_at, total_volume_kg, duration_seconds')
        .eq('athlete_id', userId)
        .not('completed_at', 'is', null)
        .gte('completed_at', start28DaysAgo)
        .order('completed_at', { ascending: false })
        .limit(20),

      supabase.from('personal_records')
        .select('id, created_at')
        .eq('athlete_id', userId)
        .gte('created_at', start7DaysAgo)
        .limit(20),

      supabase.from('measurements')
        .select('value, logged_at')
        .eq('user_id', userId)
        .eq('type', 'weight')
        .gte('logged_at', start28DaysAgo)
        .order('logged_at', { ascending: false })
        .limit(20),

      supabase.from('meal_logs')
        .select('servings, food:foods(calories,protein)')
        .eq('user_id', userId)
        .gte('logged_at', start7DaysAgo)
        .limit(50),

      supabase.from('profiles')
        .select('goal, daily_calorie_target, daily_protein_target')
        .eq('id', userId)
        .maybeSingle(),
    ]);

    const recent7DaysSessions = (sessions || []).filter((s: any) => new Date(s.completed_at) >= new Date(start7DaysAgo));
    const completedWorkouts = recent7DaysSessions.length;
    const daysSinceLastWorkout = sessions?.[0]?.completed_at
      ? Math.max(0, Math.round((Date.now() - new Date(sessions[0].completed_at).getTime()) / 86_400_000))
      : 7;

    const recentSessionsVolumeKg = (sessions || []).map((s: any) => Number(s.total_volume_kg) || 0);

    const nowMs = Date.now();
    const bodyWeightLogsKg = (weights || []).map((w: any) => ({
      daysAgo: Math.max(0, Math.round((nowMs - new Date(w.logged_at).getTime()) / 86_400_000)),
      weightKg: Number(w.value) || 0,
    }));

    let totCals = 0, totProt = 0;
    for (const m of meals || []) {
      const s = Number(m.servings) || 0;
      const fd = m.food || {};
      totCals += (fd.calories || 0) * s;
      totProt += (fd.protein || 0) * s;
    }
    const consumedCaloriesAvg = meals?.length ? Math.round(totCals / 7) : null;
    const consumedProteinAvg = meals?.length ? Math.round(totProt / 7) : null;

    return {
      completedWorkouts,
      prescribedWorkouts: 4,
      recentSessionsVolumeKg,
      recent1rmValues: [],
      bodyWeightLogsKg,
      consumedCaloriesAvg,
      targetCalories: profile?.daily_calorie_target ?? null,
      consumedProteinAvg,
      targetProtein: profile?.daily_protein_target ?? null,
      newPrsCount: prs?.length || 0,
      daysSinceLastWorkout,
      goal: mapProfileGoal(profile?.goal),
    };
  } catch (_err) {
    // Graceful telemetry failure boundary
    return {
      completedWorkouts: 0,
      prescribedWorkouts: 4,
      recentSessionsVolumeKg: [],
      recent1rmValues: [],
      bodyWeightLogsKg: [],
      newPrsCount: 0,
      daysSinceLastWorkout: 7,
    };
  }
}




serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const reqUrl = new URL(req.url);
  if (req.method === 'GET' && reqUrl.searchParams.get('health') === '1') {
    return new Response(JSON.stringify(await healthCheck()), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });
  }

  try {
    // Used only by the fully-deterministic memory short-circuit (Step 4)
    // further down — a separate, narrower timing than `started`/`latencyMs`
    // below, which specifically measures the LLM call and isn't reached at
    // all on that path.
    const requestStartedAt = Date.now();

    // 1. Auth ------------------------------------------------------------------
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token || undefined);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      });
    }

    // Provider-capacity diagnostic (pre-beta blocker) — unlike ?health=1
    // above (unauthenticated, and only ever checks each provider's cheapest
    // endpoint), this makes the SAME real chat() call actual traffic makes,
    // for every configured provider, so a "redundancy is healthy" claim can
    // be backed by evidence instead of a lighter, misleading proxy check.
    // Auth-gated (any signed-in user) since it spends a real provider request
    // per call and must not be triggerable anonymously.
    if (req.method === 'GET' && reqUrl.searchParams.get('providerCapacity') === '1') {
      return new Response(JSON.stringify(await checkProviderCapacity()), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    }

    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', serviceRoleKey,
      { global: { headers: { Authorization: `Bearer ${serviceRoleKey}` } } },
    );

    // 1b. Input validation — read `context` + `messageHistory` (client field names)
    const { message, context, messageHistory, conversationId } = await req.json();
    if (message && message.length > 2000) {
      return new Response(JSON.stringify({ error: 'Message exceeds maximum length (2000 characters).' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }
    let latestUserMessage = message || '';
    if (latestUserMessage.length > 1000) latestUserMessage = latestUserMessage.substring(0, 1000) + '... [truncated]';

    // Parse partitioned context safely (supporting both structured object and legacy string)
    let clientProfileContext = '';
    let clientWorkoutContext = '';
    let clientNutritionContext = '';

    if (context && typeof context === 'object') {
      clientProfileContext = typeof context.profile === 'string' ? context.profile : '';
      clientWorkoutContext = typeof context.workout === 'string' ? context.workout : '';
      clientNutritionContext = typeof context.nutrition === 'string' ? context.nutrition : '';
    } else if (typeof context === 'string' && context.trim()) {
      const profileMatch = context.match(/ATHLETE PROFILE:[\s\S]*?(?=(?:RECENT WORKOUTS|NUTRITION|$))/i);
      const workoutMatch = context.match(/RECENT WORKOUTS[\s\S]*?(?=(?:NUTRITION|ATHLETE PROFILE|$))/i);
      const nutritionMatch = context.match(/NUTRITION[\s\S]*?(?=(?:ATHLETE PROFILE|RECENT WORKOUTS|$))/i);

      clientProfileContext = profileMatch ? profileMatch[0].trim() : '';
      clientWorkoutContext = workoutMatch ? workoutMatch[0].trim() : '';
      clientNutritionContext = nutritionMatch ? nutritionMatch[0].trim() : '';

      if (!clientProfileContext && !clientWorkoutContext && !clientNutritionContext) {
        clientProfileContext = context.trim();
      }
    }

    // Entitlements fetch — beta_mode_config was removed (table does not exist in
    // production and caused a logged DB error on every request).
    const { data: entitlements } = await supabaseClient
      .from('user_entitlements').select('plan_id').eq('user_id', user.id).eq('status', 'active');
    const isPremiumPlan = (entitlements || []).some((e: any) => e.plan_id === 'PRO' || e.plan_id === 'COACHING');
    const subscriptionTier = isPremiumPlan
      ? ((entitlements || []).find((e: any) => e.plan_id === 'COACHING') ? 'COACHING' : 'PRO') : 'FREE';
    const isPremium = isPremiumPlan;

    // Daily free-tier limit — ATOMIC increment-and-check (fixes a real race:
    // the previous read-then-write of requests_count let concurrent requests
    // all read the same stale count and all pass the `< 5` check before any
    // of them committed, bypassing the cap entirely — each LLM call has a real
    // $ cost). increment_ai_usage() does the upsert-and-increment as one
    // statement; Postgres serializes concurrent writers on the unique
    // (athlete_id, date) row, so under any amount of concurrency exactly 5
    // requests can ever get new_count <= 5. Runs for every tier (premium usage
    // is still tracked for analytics); only non-premium is capped.
    // Fail-open on an RPC error, consistent with this function's existing
    // tolerance for non-critical metadata lookups failing.
    const today = new Date().toISOString().split('T')[0];
    let newRequestCount = 0;
    try {
      const { data: incremented, error: incErr } = await supabaseServiceRole
        .rpc('increment_ai_usage', { p_athlete_id: user.id, p_date: today, p_tier: subscriptionTier });
      if (incErr) throw incErr;
      newRequestCount = Number(incremented) || 0;
    } catch (_e) {
      newRequestCount = 0; // fail-open — do not block the athlete on a metering hiccup
    }
    if (!isPremium && newRequestCount > 5) {
      await supabaseServiceRole.from('ai_request_logs').insert({
        athlete_id: user.id, subscription_tier: subscriptionTier, success: false,
        error_reason: 'daily_limit_exceeded', message_length: message?.length ?? 0,
        conversation_id: conversationId || null,
      }).then(() => {}, () => {});
      return new Response(JSON.stringify({ error: 'AI Coach daily limit reached for free tier. Upgrade to Yeti Pro for unlimited coaching!' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403,
      });
    }

    // 2. Deterministic intent classification. Primarily driven by the latest
    // message alone, but falls back to the most recent PRIOR user message's
    // intent when the current one is ambiguous (general_chat) and that prior
    // intent was engine-backed — otherwise a short reply answering the
    // coach's own clarifying question ("60kg for 5 reps") loses the thread
    // and gets an ungrounded, LLM-improvised answer instead of running the
    // real engine. See classifyIntentWithHistory()'s own comment for the
    // live-observed incident this fixes.
    const priorUserMessagesForIntent = (Array.isArray(messageHistory) ? messageHistory : [])
      .filter((m: any) => m && m.role === 'user' && typeof m.content === 'string' && m.content.trim() !== latestUserMessage.trim())
      .map((m: any) => m.content);
    const intent = classifyIntentWithHistory(latestUserMessage, priorUserMessagesForIntent);

    // 5-Way Medical Safety & Emergency Escalation Check
    const safetySignal = classifySafetySignal(latestUserMessage);
    const safetyTriggered = safetySignal === 'current_first_person_emergency' || safetySignal === 'current_third_person_emergency' || intent === 'medical_safety';

    if (safetyTriggered) {
      await supabaseServiceRole.from('ai_safety_logs').insert({
        user_id: user.id, conversation_id: conversationId || 'general',
        risk_type: safetySignal === 'current_third_person_emergency' ? 'THIRD_PERSON_EMERGENCY' : 'INJURY_REPORT',
        trigger_text: latestUserMessage, category: 'injuries',
      }).then(() => {}, () => {});
    }

    // Pre-generation emergency escalation: halt exercise prescription engines and return immediate safety response
    if (safetySignal === 'current_first_person_emergency' || safetySignal === 'current_third_person_emergency') {
      const emergencyReply = safetySignal === 'current_third_person_emergency'
        ? "Please seek immediate emergency medical care for your friend. Do not attempt to move them or resume training until a medical professional has evaluated them."
        : "Your health and safety come first. If you are experiencing chest pain, fainting, shortness of breath, or severe pain, please stop exercising immediately and seek emergency medical attention.";

      return new Response(JSON.stringify({
        reply: emergencyReply, response: emergencyReply,
        actions: [{ type: 'medical_escalation', emergency: true, signal: safetySignal }],
        action_types: ['medical_escalation'],
        intent: 'medical_safety', response_type: 'medical_disclaimer',
        structured: {
          direct_answer: emergencyReply,
          reason: 'Emergency safety signal detected — exercise prescription halted.',
          recommended_action: { type: 'medical_escalation', emergency: true, signal: safetySignal },
          supporting_data: null, missing_information: [],
          safety_flag: true, follow_up_question: null,
        },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    // 4b. Coach Memory — long-term ai_memory folded with deterministic profile
    //     facts, so Yeti remembers the athlete across the conversation. Fetched
    //     BEFORE intent dispatch (moved up from its original position after it)
    //     because several branches below read memoryRows/memProfile directly —
    //     declared with `let` in this outer scope (not `const` inside the try)
    //     so they stay in scope for all of step 3, not just this block.
    let memoryRows: any[] = [];
    let memProfile: any = null;
    let memoryCard = '';
    try {
      // Independent of each other — parallel fetch instead of sequential.
      const [{ data: mRows }, { data: mProfile }] = await Promise.all([
        supabaseClient.from('ai_memory')
          .select('category, memory_key, memory_value')
          .eq('athlete_id', user.id)
          .order('created_at', { ascending: false })
          .limit(30),
        supabaseClient.from('profiles').select('goal, weight_kg').eq('id', user.id).maybeSingle(),
      ]);
      memoryRows = mRows || [];
      memProfile = mProfile;

      let memory = foldMemoryRows(memoryRows);
      if (memProfile) {
        memory = mergeCoachMemory(memory, {
          goal: memProfile.goal ?? memory.goal,
          currentWeightKg: memProfile.weight_kg ?? memory.currentWeightKg,
        });
      }
      memoryCard = buildCoachMemoryCard(memory);
    } catch (_e) { /* memory is best-effort — never blocks a reply */ }

    // Declared here (not at first use) because both the deterministic
    // explicit-memory path below AND the LLM-driven memory_updates path
    // (step 7b, further down) need to report into the same turn-level state —
    // "was anything actually persisted this turn" must reflect either path,
    // and rejections from either path go into the same log.
    let memoryPersistedThisTurn = false;
    const rejectedMemoryUpdates: { category: string; memory_key: string; reason: string }[] = [];

    // 4c. Deterministic explicit-memory commands (Objective 2) — recognised
    // independently of intent classification (a command can co-occur with any
    // other request). Only HIGH-confidence detections are auto-persisted;
    // anything hedged ("maybe I prefer...") is left alone rather than guessed
    // at — the existing LLM-driven memory_updates path and its honesty guard
    // (step 7b) remain the backstop either way.
    const explicitMemory = detectExplicitMemoryCommand(latestUserMessage);
    let explicitMemoryOutcome: 'saved' | 'deleted' | 'save_failed' | 'delete_failed' | null = null;
    if (explicitMemory.detected && explicitMemory.confidence === 'high') {
      if (explicitMemory.operation === 'upsert' && explicitMemory.memoryKey && explicitMemory.memoryValue && explicitMemory.category) {
        try {
          const { error: upsertErr } = await supabaseServiceRole.from('ai_memory').upsert({
            athlete_id: user.id, category: explicitMemory.category, memory_key: explicitMemory.memoryKey,
            memory_value: explicitMemory.memoryValue, updated_at: new Date().toISOString(),
          }, { onConflict: 'athlete_id,memory_key' });
          if (upsertErr) throw upsertErr;
          // Read back — never assume a write succeeded just because it didn't throw.
          const { data: verifyRow } = await supabaseServiceRole.from('ai_memory')
            .select('memory_value').eq('athlete_id', user.id).eq('memory_key', explicitMemory.memoryKey).maybeSingle();
          explicitMemoryOutcome = verifyRow?.memory_value === explicitMemory.memoryValue ? 'saved' : 'save_failed';
        } catch (_e) {
          explicitMemoryOutcome = 'save_failed';
        }
        if (explicitMemoryOutcome === 'saved') {
          memoryPersistedThisTurn = true;
          // Refresh the in-prompt memory card so THIS reply can reference the
          // fact it just saved, instead of waiting for the next turn.
          memoryRows = [...memoryRows.filter((m: any) => m.memory_key !== explicitMemory.memoryKey),
            { category: explicitMemory.category, memory_key: explicitMemory.memoryKey, memory_value: explicitMemory.memoryValue }];
        } else {
          rejectedMemoryUpdates.push({ category: explicitMemory.category, memory_key: explicitMemory.memoryKey, reason: 'explicit_upsert_failed' });
        }
      } else if (explicitMemory.operation === 'delete' && explicitMemory.memoryKey) {
        try {
          const { error: delErr } = await supabaseServiceRole.from('ai_memory').delete()
            .eq('athlete_id', user.id).eq('memory_key', explicitMemory.memoryKey);
          if (delErr) throw delErr;
          const { data: verifyGone } = await supabaseServiceRole.from('ai_memory')
            .select('memory_key').eq('athlete_id', user.id).eq('memory_key', explicitMemory.memoryKey).maybeSingle();
          explicitMemoryOutcome = !verifyGone ? 'deleted' : 'delete_failed';
        } catch (_e) {
          explicitMemoryOutcome = 'delete_failed';
        }
        if (explicitMemoryOutcome === 'deleted') {
          memoryPersistedThisTurn = true; // a confirmed delete is also a confirmed memory action this turn
          memoryRows = memoryRows.filter((m: any) => m.memory_key !== explicitMemory.memoryKey);
        } else {
          rejectedMemoryUpdates.push({ category: explicitMemory.category ?? '', memory_key: explicitMemory.memoryKey, reason: 'explicit_delete_failed' });
        }
      }
      // Rebuild the memory card from the (possibly just-updated) rows so the
      // system prompt reflects this turn's change, not last turn's.
      let refreshedMemory = foldMemoryRows(memoryRows);
      if (memProfile) refreshedMemory = mergeCoachMemory(refreshedMemory, { goal: memProfile.goal, currentWeightKg: memProfile.weight_kg });
      memoryCard = buildCoachMemoryCard(refreshedMemory);
    }

    // 4d. Fully deterministic short-circuit (Step 4) — explicit save/delete
    // commands and the narrow set of "read back a specific fact" retrieval
    // questions ("What foods did I tell you I avoid?", "What equipment do I
    // prefer?") never need a model call at all: detect -> validate ->
    // athlete-scoped write/read/delete (already done above) -> read-back
    // verification (already done above) -> deterministic TS response ->
    // return immediately. This is what makes these operations work even when
    // every provider is down (see the outage regression test), and it means
    // zero provider latency/cost for the most common memory interactions.
    //
    // Deliberately unconditional on `intent` — a compound message combining
    // an explicit memory command with an unrelated ask (e.g. "remember I
    // don't like mushrooms, also build me a workout") will, like the
    // detector's own trigger-capture already did before this change, only
    // fulfil the memory part deterministically. That's an accepted, narrow
    // trade-off, not a new limitation this introduces — see the final report.
    const explicitRetrieval = detectExplicitMemoryRetrieval(latestUserMessage);
    const isDeterministicSaveOrDelete = explicitMemory.detected && explicitMemory.confidence === 'high' && explicitMemoryOutcome !== null;
    if (isDeterministicSaveOrDelete || explicitRetrieval.detected) {
      let deterministicReply: string;
      let responseType: CoachResponseType;

      if (explicitMemoryOutcome === 'saved') {
        deterministicReply = buildSaveAcknowledgment(explicitMemory.memoryValue!);
        responseType = 'memory_confirmation';
      } else if (explicitMemoryOutcome === 'deleted') {
        deterministicReply = buildDeleteAcknowledgment(explicitMemory.memoryValue!, explicitMemory.category);
        responseType = 'memory_confirmation';
      } else if (explicitMemoryOutcome === 'save_failed' || explicitMemoryOutcome === 'delete_failed') {
        // Honest failure — never claims success just because the athlete asked nicely.
        deterministicReply = MEMORY_PERSISTENCE_FAILED_NOTE;
        responseType = 'text';
      } else {
        // Retrieval — read the CURRENT (possibly just-refreshed-above) memory.
        const currentMemory = foldMemoryRows(memoryRows);
        const factList = explicitRetrieval.retrievalType === 'disliked_foods' ? currentMemory.dislikedFoods
          : explicitRetrieval.retrievalType === 'liked_foods' ? currentMemory.likedFoods
          : currentMemory.equipmentPreferences;
        deterministicReply = buildRetrievalAnswer(explicitRetrieval.retrievalType!, factList || []);
        responseType = 'text';
      }

      const detActions: CoachAction[] = computeActions(responseType);
      await supabaseServiceRole.from('ai_request_logs').insert({
        athlete_id: user.id, subscription_tier: subscriptionTier, success: true,
        coach_type: intent, provider: 'deterministic', model: 'none',
        input_tokens: 0, output_tokens: 0, cost_usd: 0, latency_ms: Date.now() - requestStartedAt,
        message_length: latestUserMessage.length, conversation_id: conversationId || null,
        engine: 'explicit_memory', fallback_triggered: false, response_type: responseType,
        action_types: detActions.map((a) => a.type), fallback_reason: null,
      }).then(() => {}, () => {});

      return new Response(JSON.stringify({
        reply: deterministicReply, response: deterministicReply,
        actions: detActions, action_types: detActions.map((a) => a.type),
        intent, response_type: responseType,
        structured: {
          direct_answer: deterministicReply,
          reason: 'Deterministic memory operation — no model call was needed.',
          recommended_action: null, supporting_data: null, missing_information: [],
          safety_flag: false, follow_up_question: null,
        },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    // 3. Intent-scoped context loading (STRICT isolation) -----------------------
    let contextBlock = '';
    let engineResult: unknown = undefined;
    // Tell the model the CONFIRMED outcome of any explicit memory command so
    // it can acknowledge it accurately — it must never guess or claim
    // otherwise. The existing honesty guard (step 7b) still corrects it if it
    // does, but this makes the correct phrasing the easy default.
    let coachInstructions = explicitMemoryOutcome === 'saved'
      ? `You just saved this to memory: "${explicitMemory.memoryValue}". Acknowledge it naturally and briefly — do not describe it as anything other than saved.`
      : explicitMemoryOutcome === 'deleted'
      ? `You just deleted a previously saved preference at the athlete's request. Acknowledge that it's forgotten.`
      : explicitMemoryOutcome === 'save_failed' || explicitMemoryOutcome === 'delete_failed'
      ? `The athlete asked you to remember/forget something, but the save did NOT go through due to a technical issue. Say so honestly — do not claim it was saved or forgotten.`
      : '';
    // Compound-request handling (smallest safe version — see Fix 7): a message
    // can ask for a workout plan AND a stored nutrition value in one go
    // ("create a PPL plan and tell me my protein target"). The primary intent
    // stays workout_program_generate (classifyIntent already prioritises it),
    // but this secondary ask is detected independently and its deterministic
    // answer is appended to the final reply in code — never left to chance
    // that the model happens to remember the second half of the question.
    let compoundNutritionAnswer: string | null = null;

    if (intent === 'app_navigation') {
      // App Navigation Intent: Context selection matrix enforces ZERO private
      // profile/injury context. Destination validated strictly against the
      // YETI_APP_ROUTE_DIRECTORY allowlist — no silent default: this branch
      // was previously unreachable entirely (app_navigation was in none of
      // WORKOUT_INTENTS/PERSONAL_CONTEXT_INTENTS/NUTRITION_INTENTS, so it fell
      // through to the generic catch-all below every time), and even once
      // reachable it defaulted an unmatched question to "Active Session"
      // rather than asking which screen the athlete meant.
      const msgLower = latestUserMessage.toLowerCase();
      let matchedKey: string | null = null;
      if (msgLower.includes('timer') || msgLower.includes('rest')) matchedKey = 'rest_timer';
      else if (msgLower.includes('history') || msgLower.includes('past')) matchedKey = 'workout_log';
      else if (msgLower.includes('food') || msgLower.includes('diet') || msgLower.includes('nutrition') || msgLower.includes('calorie')) matchedKey = 'nutrition_diary';
      else if (msgLower.includes('setting') || msgLower.includes('profile')) matchedKey = 'settings';
      else if (msgLower.includes('progress') || msgLower.includes('pr') || msgLower.includes('graph')) matchedKey = 'progress';
      else if (msgLower.includes('active') || msgLower.includes('current session') || msgLower.includes('logging screen')) matchedKey = 'active_workout';

      if (matchedKey) {
        const routeTarget = YETI_APP_ROUTE_DIRECTORY[matchedKey];
        engineResult = {
          type: 'app_navigation',
          status: 'route_validated',
          target_route: routeTarget.route,
          screen_label: routeTarget.label,
          description: routeTarget.description,
        };
        contextBlock = `YETI APP NAVIGATION ALLOWLIST DIRECTORY:\n- Screen: ${routeTarget.label} (Route: ${routeTarget.route}) — ${routeTarget.description}`;
      } else {
        const supportedDestinations = Object.values(YETI_APP_ROUTE_DIRECTORY).map((r) => r.label);
        engineResult = {
          type: 'app_navigation',
          status: 'clarification_needed',
          supported_destinations: supportedDestinations,
        };
        contextBlock = `YETI APP NAVIGATION ALLOWLIST DIRECTORY (ask the athlete which one they mean):\n${supportedDestinations.map((d) => `- ${d}`).join('\n')}`;
      }
    } else if (WORKOUT_INTENTS.includes(intent)) {
      if (intent === 'workout_progression') {
        // Pull the target lift's last 3–5 completed working sets and let the
        // deterministic engine decide; the LLM only explains the result.
        const prog = await loadProgressionForExercise(supabaseClient, user.id, latestUserMessage);
        contextBlock = prog.context; // workout-only — nutrition is never loaded
        engineResult = prog.engineInput ? decideProgression(prog.engineInput) : undefined;
      } else if (intent === 'workout_plan_edit') {
        // Parse → resolve → EXECUTE the plan mutation. engineResult carries the
        // honest { success, message }; the LLM explains it and confirms ONLY when
        // success === true (never pretends an update happened).
        const edit = parsePlanEdit(latestUserMessage);
        engineResult = await applyPlanEdit(supabaseClient, user.id, edit);
        contextBlock = await loadWorkoutContext(supabaseClient, user.id); // no nutrition, ever
      } else if (intent === 'workout_program_generate') {
        // Compound-request check (Fix 7): does this SAME message also ask for
        // a stored nutrition target? Independent of which sub-path below
        // handles the workout side.
        const compoundAsk = detectNutritionTargetAsk(latestUserMessage);
        if (compoundAsk) {
          try {
            const { data: cProf } = await supabaseClient
              .from('profiles')
              .select('daily_calorie_target,daily_protein_target,daily_carb_target,daily_fat_target')
              .eq('id', user.id).maybeSingle();
            const targets: StoredNutritionTargets = {
              calorieTarget: cProf?.daily_calorie_target ?? null,
              proteinTarget: cProf?.daily_protein_target ?? null,
              carbTarget: cProf?.daily_carb_target ?? null,
              fatTarget: cProf?.daily_fat_target ?? null,
            };
            compoundNutritionAnswer = describeNutritionTarget(targets, compoundAsk).text;
          } catch (_e) { /* nutrition lookup is best-effort for the compound case; workout side still answers */ }
        }

        // Conversational Workout Program Generation Flow
        const activationMatch = latestUserMessage.match(/\bactivate\s+(?:the\s+|my\s+|this\s+)?([a-z0-9_\s]+)\b/i);
        if (activationMatch) {
          const targetName = activationMatch[1].trim();
          engineResult = await activateWorkoutPlan(supabaseClient, user.id, targetName);
          contextBlock = await loadWorkoutContext(supabaseClient, user.id);
        } else {
          const priorUserMsgs = (Array.isArray(messageHistory) ? messageHistory : [])
            .filter((m: any) => m && m.role === 'user' && typeof m.content === 'string')
            .map((m: any) => m.content);

          const memoryEquipment = (memoryRows || []).find((m: any) => m.category === 'equipment preferences')?.memory_value;
          const memoryExperience = (memoryRows || []).find((m: any) => m.category === 'workout style' || m.category === 'training goals')?.memory_value;
          const memoryInjury = (memoryRows || []).find((m: any) => m.category === 'injuries')?.memory_value;
          const memoryFav = (memoryRows || []).filter((m: any) => m.category === 'preferences').map((m: any) => m.memory_value);

          const req = resolveKnownRequirements({
            latestMessage: latestUserMessage,
            recentMessages: priorUserMsgs,
            profileGoal: memProfile?.goal,
            memoryEquipment,
            memoryExperience,
            memoryInjury,
            memoryFavouriteExercises: memoryFav,
          });

          const missing = findMissingRequired(req);

          let historicalAverageDays: number | null = null;
          try {
            const { data: recentSessions } = await supabaseClient
              .from('workout_sessions')
              .select('completed_at')
              .eq('athlete_id', user.id)
              .not('completed_at', 'is', null)
              .order('completed_at', { ascending: false })
              .limit(28);
            if (recentSessions && recentSessions.length > 0) {
              historicalAverageDays = recentSessions.length / 4;
            }
          } catch (_e) { /* ignore */ }

          const isSaveConfirmation = /\b(save\s*it|confirm\s*(plan)?|looks\s*good\s*(save)?|yes\s*(please)?\s*save|do\s*it|apply\s*plan)\b/i.test(latestUserMessage);
          const parsedEdit = parsePlanEdit(latestUserMessage);

          if (isSaveConfirmation) {
            // Save versioned plan!
            const recommendation = recommendSplit({
              daysPerWeek: req.daysPerWeek || 4,
              experience: req.experience || 'intermediate',
              goal: req.goal,
              requestedSplit: req.requestedSplit,
              historicalAverageDays,
            });
            const pool = await loadCandidatePool(supabaseClient);
            const gen = generateProgram({
              dayNames: recommendation.dayNames,
              experience: req.experience || 'intermediate',
              goal: req.goal,
              equipment: req.equipment,
              candidatesByGroup: pool.candidatesByGroup,
              excludedExerciseNames: req.dislikedExercises,
              likedExerciseNames: req.likedExercises,
              priorityMuscleGroups: req.priorityMuscleGroups as any,
              injuryKeywords: req.injuries,
            });

            const planName = req.requestedSplit ? `${req.requestedSplit} Split` : 'Workout Program';
            const saveRes = await saveWorkoutPlan(supabaseClient, user.id, planName, gen.days);
            engineResult = {
              status: saveRes.success ? 'saved' : 'save_failed',
              planName: saveRes.planName,
              version: saveRes.version,
              message: saveRes.success
                ? `Your plan ${saveRes.planName} has been saved to your profile and activated.`
                : `Failed to save plan: ${saveRes.error}`,
            };
          } else if (parsedEdit && !parsedEdit.ambiguous) {
            const pool = await loadCandidatePool(supabaseClient);
            const recommendation = recommendSplit({
              daysPerWeek: req.daysPerWeek || 4,
              experience: req.experience || 'intermediate',
              goal: req.goal,
              requestedSplit: req.requestedSplit,
              historicalAverageDays,
            });
            const base = generateProgram({
              dayNames: recommendation.dayNames,
              experience: req.experience || 'intermediate',
              goal: req.goal,
              equipment: req.equipment,
              candidatesByGroup: pool.candidatesByGroup,
              excludedExerciseNames: req.dislikedExercises,
              likedExerciseNames: req.likedExercises,
              priorityMuscleGroups: req.priorityMuscleGroups as any,
              injuryKeywords: req.injuries,
            });

            const editedDays = applyDraftEdit(base.days, parsedEdit);
            const validation = validateProgram(editedDays, req, pool.catalogMap);
            engineResult = {
              status: 'draft_edited',
              editApplied: parsedEdit,
              program: editedDays,
              validation,
              confirmation_required: true,
            };
          } else if (missing.length > 0) {
            engineResult = {
              status: 'missing_information',
              known: req,
              missing,
            };
          } else {
            const recommendation = recommendSplit({
              daysPerWeek: req.daysPerWeek!,
              experience: req.experience!,
              goal: req.goal,
              requestedSplit: req.requestedSplit,
              historicalAverageDays,
            });

            const pool = await loadCandidatePool(supabaseClient);
            const generated = generateProgram({
              dayNames: recommendation.dayNames,
              experience: req.experience!,
              goal: req.goal,
              equipment: req.equipment,
              candidatesByGroup: pool.candidatesByGroup,
              excludedExerciseNames: req.dislikedExercises,
              likedExerciseNames: req.likedExercises,
              priorityMuscleGroups: req.priorityMuscleGroups as any,
              injuryKeywords: req.injuries,
            });

            const validation = validateProgram(generated.days, req, pool.catalogMap);

            engineResult = {
              status: recommendation.adherenceCheckRequired ? 'adherence_check' : 'draft_proposed',
              split: recommendation.split,
              rationale: recommendation.rationale,
              adherenceNote: recommendation.adherenceNote,
              program: generated.days,
              validation,
              confirmation_required: true,
            };
          }

          contextBlock = await loadWorkoutContext(supabaseClient, user.id);
        }
      } else if (intent === 'weekly_review' || intent === 'adaptive_coaching') {
        const telemetryInput = await loadAthleteTelemetry(supabaseClient, user.id);
        const rawTelemetry = computeRawTelemetry(telemetryInput);

        const memoryEquipment = (memoryRows || []).find((m: any) => m.category === 'equipment preferences')?.memory_value;
        const memoryExperience = (memoryRows || []).find((m: any) => m.category === 'workout style' || m.category === 'training goals')?.memory_value;
        const memoryInjury = (memoryRows || []).find((m: any) => m.category === 'injuries')?.memory_value;

        const req = resolveKnownRequirements({
          latestMessage: latestUserMessage,
          profileGoal: memProfile?.goal,
          memoryEquipment,
          memoryExperience,
          memoryInjury,
        });

        const intelligence = deriveCoachingIntelligence(rawTelemetry, req);
        engineResult = intelligence;
        contextBlock = await loadWorkoutContext(supabaseClient, user.id);

        // After a weekly/adaptive review, generate and persist a compact coaching
        // summary to ai_memory so future sessions have longitudinal context.
        try {
          const summaryDate = new Date().toISOString().split('T')[0];
          const adherenceLabel = rawTelemetry.adherencePct != null ? `${rawTelemetry.adherencePct}% adherence` : '';
          const prsLabel = rawTelemetry.newPrsCount > 0 ? `${rawTelemetry.newPrsCount} PR(s)` : '';
          const limitingFactor = (intelligence as any).biggestLimitingFactor ?? null;
          const summaryParts = [adherenceLabel, prsLabel, limitingFactor].filter(Boolean);
          if (summaryParts.length > 0) {
            const sanitizedParts = sanitizeSummarySensitivity(summaryParts.join(', '));
            const turnKey = `session_summary_${conversationId || 'default'}_${Date.now()}`;
            const summaryText = `[session_summary] ${summaryDate}: ${sanitizedParts}.`;
            await supabaseServiceRole.from('ai_memory').upsert({
              athlete_id: user.id,
              category: 'coaching observations',
              memory_key: turnKey,
              memory_value: summaryText,
            }, { onConflict: 'athlete_id,memory_key' }).then(() => {}, () => {});
          }
        } catch (_e) { /* non-critical — never block the reply */ }

      } else if (intent === 'exercise_substitution') {
        // Biomechanical Substitution Engine with 8-Factor Scoring & Hard Exclusions
        const targetExerciseName = resolveExerciseAlias(latestUserMessage);
        const userEquipmentPrefs = (memoryRows || [])
          .filter((m: any) => m.category === 'equipment preferences')
          .map((m: any) => m.memory_value as string);
        const userInjury = (memoryRows || []).find((m: any) => m.category === 'injuries')?.memory_value ?? null;
        // Only exclude on CLEAR negative sentiment or an explicit disliked-
        // exercise key/category — matching category === 'preferences' alone
        // was a real bug: that category also holds LIKED things ("prefers
        // dumbbell press", "likes pull-ups"), which were getting excluded as
        // if disliked purely because they shared the same memory category.
        const NEGATIVE_EXERCISE_SENTIMENT = /\b(dislikes?|hate|avoid|don'?t want|do not want|can'?t stand|no longer want)\b/i;
        const dislikedExercises = (memoryRows || [])
          .filter((m: any) => {
            const key = (m.memory_key || '').toLowerCase();
            const val = (m.memory_value as string) || '';
            if (key.includes('disliked_exercise') || key.includes('avoided_exercise') || key.includes('hate_exercise') || key.includes('cant_do')) return true;
            return m.category === 'preferences' && NEGATIVE_EXERCISE_SENTIMENT.test(val);
          })
          .map((m: any) => (m.memory_value as string).toLowerCase());

        try {
          // 1. Resolve source exercise from catalogue. source_type='yeti_v2'
          //    restored — the broader multi-source lookup wasn't verified
          //    against live data before this pass; keeping the previously
          //    verified, catalog-scoped behavior here. If a genuine need for
          //    multi-source substitution exists, it should be a separate,
          //    reviewed change, not folded into this repair.
          const { data: sourceExs } = await supabaseClient
            .from('exercises')
            .select('id, name, primary_muscle, secondary_muscles, movement_pattern, equipment, category, difficulty, unilateral, is_active, status, media_status')
            .ilike('name', `%${targetExerciseName}%`)
            .eq('source_type', 'yeti_v2')
            .limit(1);
          const sourceEx = sourceExs?.[0];

          let substitutionLines: string[] = [];

          if (sourceEx) {
            // 2. Fetch curated alternatives from exercise_alternatives
            const { data: mappedAlts } = await supabaseClient
              .from('exercise_alternatives')
              .select('alternative_exercise_id, similarity_score, swap_reason, exercises!exercise_alternatives_alternative_exercise_id_fkey(id, name, primary_muscle, secondary_muscles, movement_pattern, equipment, category, difficulty, unilateral, is_active, status, media_status)')
              .eq('exercise_id', sourceEx.id)
              .order('similarity_score', { ascending: false })
              .limit(8);

            // 3. Fetch catalogue fallback candidates matching primary_muscle or movement_pattern
            const { data: byMuscle } = await supabaseClient
              .from('exercises')
              .select('id, name, primary_muscle, secondary_muscles, movement_pattern, equipment, category, difficulty, unilateral, is_active, status, media_status')
              .or(`primary_muscle.eq.${sourceEx.primary_muscle},movement_pattern.eq.${sourceEx.movement_pattern}`)
              .eq('source_type', 'yeti_v2')
              .neq('id', sourceEx.id)
              .limit(15);

            const rawCandidates = [
              ...((mappedAlts || []).map((a: any) => ({ ...((a as any).exercises || {}), swap_reason: (a as any).swap_reason, isCurated: true, similarity_score: Number((a as any).similarity_score) || 1.0 }))),
              ...((byMuscle || []).map((a: any) => ({ ...a, swap_reason: null, isCurated: false, similarity_score: 0.5 }))),
            ];

            // 4. Apply Strict Hard Exclusions BEFORE scoring:
            //    - Exclude inactive candidates (is_active === false)
            //    - Exclude self-references (same ID or name)
            //    - Exclude duplicate candidate IDs
            //    - Exclude unavailable equipment when constrained
            //    - Exclude Level 1/2 joint injury restriction conflicts
            //    - Exclude user-disliked exercises
            const seenIds = new Set<string>();
            const excludedReasons: string[] = [];

            const eligibleCandidates = rawCandidates.filter((c: any) => {
              if (!c || !c.id || !c.name) return false;
              if (c.id === sourceEx.id || c.name.toLowerCase() === sourceEx.name.toLowerCase()) return false;
              if (seenIds.has(c.id)) return false;
              seenIds.add(c.id);

              // Hard exclusion 1: Inactive candidates
              if (c.is_active === false) {
                excludedReasons.push(`${c.name}: hard-excluded (inactive candidate)`);
                return false;
              }

              // Hard exclusion 2: Equipment constraint
              if (userEquipmentPrefs.length > 0) {
                const reqEq = (c.equipment || '').toLowerCase();
                const matchesPref = userEquipmentPrefs.some((pref: string) => reqEq.includes(pref.toLowerCase()) || pref.toLowerCase().includes(reqEq));
                if (!matchesPref && reqEq && reqEq !== 'bodyweight' && reqEq !== 'none') {
                  excludedReasons.push(`${c.name}: hard-excluded (equipment "${c.equipment}" unavailable)`);
                  return false;
                }
              }

              // Hard exclusion 3: Level 1 & 2 Injury restriction conflict
              if (userInjury) {
                const injLower = userInjury.toLowerCase();
                const jointRisk = ['knee', 'shoulder', 'lower back', 'spine', 'wrist', 'elbow'].find(
                  (j) => injLower.includes(j) && ((c.name || '').toLowerCase().includes(j) || (c.primary_muscle || '').toLowerCase().includes(j))
                );
                if (jointRisk && (injLower.includes('do not') || injLower.includes('avoid') || injLower.includes('restricted') || injLower.includes('doctor') || injLower.includes('severe'))) {
                  excludedReasons.push(`${c.name}: hard-excluded (Level 1/2 injury restriction conflict on ${jointRisk})`);
                  return false;
                }
              }

              // Hard exclusion 4: User-disliked exercises
              if (dislikedExercises.some((d: string) => c.name.toLowerCase().includes(d) || d.includes(c.name.toLowerCase()))) {
                excludedReasons.push(`${c.name}: hard-excluded (user disliked exercise preference)`);
                return false;
              }

              return true;
            });

            // 5. Calculate Multi-Factor Score S (0.0 to 1.0) and Deterministic Tie-Breaking
            const scoredCandidates = eligibleCandidates.map((c: any) => {
              const curatedScore = c.isCurated ? (c.similarity_score ?? 1.0) : 0.0;
              const primaryMuscleScore = c.primary_muscle === sourceEx.primary_muscle ? 1.0 : 0.5;
              const movementPatternScore = c.movement_pattern === sourceEx.movement_pattern ? 1.0 : 0.0;
              
              // Secondary muscle overlap
              const srcSec = Array.isArray(sourceEx.secondary_muscles) ? sourceEx.secondary_muscles : [];
              const candSec = Array.isArray(c.secondary_muscles) ? c.secondary_muscles : [];
              const overlapCount = candSec.filter((m: string) => srcSec.includes(m)).length;
              const secondaryOverlap = srcSec.length > 0 ? (overlapCount / srcSec.length) : 0.5;

              // Equipment score
              const equipmentScore = userEquipmentPrefs.some((p: string) => (c.equipment || '').toLowerCase().includes(p.toLowerCase())) ? 1.0 : 0.5;

              // Mechanic score (compound vs isolation)
              const mechanicScore = c.category === sourceEx.category ? 1.0 : 0.7;

              // Unilateral match
              const unilateralScore = Boolean(c.unilateral) === Boolean(sourceEx.unilateral) ? 1.0 : 0.0;

              // Difficulty proximity
              const diffSrc = Number(sourceEx.difficulty) || 2;
              const diffCand = Number(c.difficulty) || 2;
              const difficultyScore = Math.max(0, 1.0 - Math.abs(diffCand - diffSrc) / 3.0);

              const totalScore = Number((
                0.35 * curatedScore +
                0.25 * primaryMuscleScore +
                0.15 * movementPatternScore +
                0.10 * secondaryOverlap +
                0.05 * equipmentScore +
                0.04 * mechanicScore +
                0.03 * unilateralScore +
                0.03 * difficultyScore
              ).toFixed(4));

              const hasMedia = Boolean(c.media_status && c.media_status !== 'TO_CREATE');

              return {
                ...c,
                hasMedia,
                scoringFactors: {
                  curatedScore, primaryMuscleScore, movementPatternScore, secondaryOverlap,
                  equipmentScore, mechanicScore, unilateralScore, difficultyScore, totalScore,
                },
              };
            });

            // Deterministic Tie-Breaking Order:
            // 1. Curated match -> 2. Equipment score -> 3. Total score -> 4. Stable Name
            scoredCandidates.sort((a: any, b: any) => {
              if (b.scoringFactors.curatedScore !== a.scoringFactors.curatedScore) {
                return b.scoringFactors.curatedScore - a.scoringFactors.curatedScore;
              }
              if (b.scoringFactors.equipmentScore !== a.scoringFactors.equipmentScore) {
                return b.scoringFactors.equipmentScore - a.scoringFactors.equipmentScore;
              }
              if (b.scoringFactors.totalScore !== a.scoringFactors.totalScore) {
                return b.scoringFactors.totalScore - a.scoringFactors.totalScore;
              }
              return a.name.localeCompare(b.name);
            });

            const topAlts = scoredCandidates.slice(0, 3);

            if (topAlts.length === 0 && rawCandidates.length > 0 && dislikedExercises.length > 0) {
              // Disliked exercises limitation fallback: explain honestly
              substitutionLines = [
                `SOURCE EXERCISE: ${sourceEx.name}`,
                `NOTE: Valid alternatives exist in the catalogue, but were excluded based on your stored exercise dislikes (${dislikedExercises.join(', ')}).`,
                `WOULD YOU LIKE TO RECONSIDER: Ask the athlete if they wish to temporarily lift a dislike preference to see options.`,
              ];
            } else {
              substitutionLines = [
                `SOURCE EXERCISE: ${sourceEx.name} (${sourceEx.primary_muscle} / ${sourceEx.movement_pattern} / ${sourceEx.equipment || 'any equipment'})`,
                ...(userEquipmentPrefs.length > 0 ? [`USER AVAILABLE EQUIPMENT: ${userEquipmentPrefs.join(', ')}`] : []),
                ...(userInjury ? [`ACTIVE INJURY CONSIDERATION: ${userInjury}`] : []),
                `SUBSTITUTION OPTIONS (ranked deterministically): `,
                ...topAlts.map((a: any, i: number) =>
                  `  ${i + 1}. ${a.name} — ${a.primary_muscle}, ${a.movement_pattern}, ${a.equipment || 'any equipment'}${
                    a.swap_reason ? ` (${a.swap_reason})` : ''
                  }${!a.hasMedia ? ' [text guidance only — no video demo available]' : ''}`
                ),
                topAlts.length === 0 ? 'NO_VALID_ALTERNATIVES_FOUND: Inform athlete honestly and suggest general movement pattern alternatives.' : '',
              ].filter(Boolean);
            }

            engineResult = {
              type: 'exercise_substitution',
              source: sourceEx.name,
              substitution_options: topAlts.map((a: any) => ({
                id: a.id,
                name: a.name,
                primary_muscle: a.primary_muscle,
                movement_pattern: a.movement_pattern,
                equipment: a.equipment,
                difficulty: a.difficulty,
                swap_reason: a.swap_reason,
                has_media: a.hasMedia,
                scoring_factors: a.scoringFactors,
              })),
              user_equipment_preferences: userEquipmentPrefs,
              user_injury: userInjury,
              excluded_candidates_count: excludedReasons.length,
            };
          } else {
            substitutionLines = [`EXERCISE NOT IN CATALOGUE: "${targetExerciseName}" was not found in the Yeti exercise library.`, 'Use general biomechanical principles and ask the athlete for clarification.'];
          }

          contextBlock = substitutionLines.join('\n');
        } catch (_e) {
          contextBlock = `Could not load exercise substitution context: ${(_e as Error).message}`;
        }

      } else if (intent === 'exercise_logging') {
        // Exercise Logging Intent: Validate exercise, weight, reps, unit, set index
        const logMatch = latestUserMessage.match(/\b(?:log|record|did|completed)\s+(?:(?:my|a)\s+)?([a-z0-9_\s-]+?)\s+(\d+(?:\.\d+)?)\s*(kg|lbs?)\s*(?:x|for|\*)\s*(\d+)/i)
          || latestUserMessage.match(/(\d+(?:\.\d+)?)\s*(kg|lbs?)\s*(?:x|for|\*)\s*(\d+)\s+(?:on|for|of)?\s+([a-z0-9_\s-]+)/i);

        let exerciseName = logMatch ? (logMatch[1] || logMatch[4]).trim() : resolveExerciseAlias(latestUserMessage);
        let weightKg = logMatch ? Number(logMatch[2] || logMatch[1]) : null;
        let unit = logMatch ? (logMatch[3] || 'kg').toLowerCase() : 'kg';
        let reps = logMatch ? Number(logMatch[4] || logMatch[3]) : null;

        if (unit.startsWith('lb') && weightKg != null) {
          weightKg = Math.round(weightKg * 0.453592 * 10) / 10;
        }

        const { data: exRows } = await supabaseClient.from('exercises').select('id, name').ilike('name', `%${exerciseName}%`).limit(1);
        const resolvedEx = exRows?.[0];

        if (resolvedEx && weightKg != null && reps != null) {
          // Proposal-only: no authenticated write, read-back, or idempotency
          // flow exists yet for session sets, so this must never claim the
          // set was actually logged. Present the parsed values and ask the
          // athlete to confirm before any future write path persists them.
          engineResult = {
            type: 'exercise_logging',
            status: 'pending_confirmation',
            exercise_id: resolvedEx.id,
            exercise_name: resolvedEx.name,
            weight_kg: weightKg,
            reps: reps,
            unit: 'kg',
            confirmation_required: true,
            // Phrased as a question, not a statement — avoids any wording
            // ("logged"/"saved"/"recorded"/"completed") that could read as a
            // claim this has already happened.
            proposed_action: `Confirm: ${resolvedEx.name}, ${weightKg}kg x ${reps} reps?`,
          };
        } else {
          engineResult = {
            type: 'exercise_logging',
            status: 'missing_parameters',
            known: { exercise_name: resolvedEx?.name || exerciseName, weight_kg: weightKg, reps },
            missing: [!resolvedEx ? 'exercise_name' : null, weightKg == null ? 'weight' : null, reps == null ? 'reps' : null].filter(Boolean),
          };
        }

        contextBlock = await loadWorkoutContext(supabaseClient, user.id);

      } else if (intent === 'schedule_adjustment') {
        // Schedule Adjustment Intent: Parse day move, show exact proposed change, require confirmation
        const moveMatch = latestUserMessage.match(/\bmove\s+(?:my\s+)?(day\s*\d+|monday|tuesday|wednesday|thursday|friday|saturday|sunday|push|pull|legs)\s+to\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|day\s*\d+)/i);

        contextBlock = await loadWorkoutContext(supabaseClient, user.id);
        
        if (moveMatch) {
          const fromDay = moveMatch[1].trim();
          const toDay = moveMatch[2].trim();
          engineResult = {
            type: 'schedule_adjustment',
            status: 'proposed_schedule_change',
            from_day: fromDay,
            to_day: toDay,
            confirmation_required: true,
            proposed_action: `Move ${fromDay} workout session to ${toDay}`,
          };
        } else {
          engineResult = {
            type: 'schedule_adjustment',
            status: 'clarification_needed',
            note: 'Ask athlete which specific plan day they wish to move or reschedule.',
          };
        }
      } else if (intent === 'exercise_inquiry') {
        const ex = await searchCatalogExercise(supabaseClient, latestUserMessage);
        const grounding = buildExerciseGroundingPrompt(ex);
        const workoutCtx = await loadWorkoutContext(supabaseClient, user.id);
        contextBlock = `${grounding}\n\n${workoutCtx || clientWorkoutContext || ''}`.trim();
        engineResult = ex ? {
          type: 'exercise_inquiry',
          resolved_exercise: ex.name,
          primary_muscle: ex.primary_muscle || (ex as any).target_muscle,
          equipment: ex.equipment,
          movement_pattern: ex.movement_pattern,
          match_strategy: ex.matchStrategy,
          confidence: ex.confidence,
        } : { type: 'exercise_inquiry', status: 'not_found' };
      }
    } else if (PERSONAL_CONTEXT_INTENTS.includes(intent)) {
      // Personal coaching context: for technique, recovery, rest, general chat,
      // and goal adjustment — load profile + memory instead of the
      // client-supplied context string (which could be stale or empty).
      // (app_navigation has its own dedicated, zero-private-context branch
      // above — it is deliberately not in PERSONAL_CONTEXT_INTENTS.)
      try {
        const [{ data: prof }, recentSessionsResult] = await Promise.all([
          supabaseClient.from('profiles')
            .select('goal, weight_kg, height_cm, experience_level, daily_calorie_target, daily_protein_target')
            .eq('id', user.id).maybeSingle(),
          supabaseClient.from('workout_sessions')
            .select('id, started_at, completed_at')
            .eq('user_id', user.id)
            .not('completed_at', 'is', null)
            .order('completed_at', { ascending: false })
            .limit(3),
        ]);

        const equipmentPrefs = (memoryRows || [])
          .filter((m: any) => m.category === 'equipment preferences')
          .map((m: any) => m.memory_value as string);
        const injuries = (memoryRows || [])
          .filter((m: any) => m.category === 'injuries')
          .map((m: any) => m.memory_value as string);
        const recentSessions = recentSessionsResult.data || [];

        const personalLines: string[] = [];
        if (prof?.goal) personalLines.push(`TRAINING GOAL: ${prof.goal}`);
        if (prof?.experience_level) personalLines.push(`EXPERIENCE LEVEL: ${prof.experience_level}`);
        if (prof?.weight_kg) personalLines.push(`BODY WEIGHT: ${Number(prof.weight_kg).toFixed(1)} kg`);
        if (equipmentPrefs.length > 0) personalLines.push(`AVAILABLE EQUIPMENT: ${equipmentPrefs.join(', ')}`);
        if (injuries.length > 0) personalLines.push(`KNOWN INJURIES / LIMITATIONS: ${injuries.join('; ')}`);
        if (recentSessions.length > 0) {
          const lastDate = recentSessions[0].completed_at
            ? new Date(recentSessions[0].completed_at).toLocaleDateString()
            : 'unknown';
          personalLines.push(`LAST WORKOUT: ${lastDate} (${recentSessions.length} sessions in recent history)`);
        }
        if (intent === 'goal_adjustment') {
          personalLines.push('USER WANTS TO ADJUST THEIR TRAINING GOAL. Confirm the new goal and update memory.');
        }
        // Fall back to domain-partitioned client context if profile is empty
        const fallbackClientCtx = [clientProfileContext, clientWorkoutContext].filter(Boolean).join('\n\n');
        contextBlock = personalLines.length > 0
          ? personalLines.join('\n')
          : (fallbackClientCtx || '(no profile data available)');
      } catch (_e) {
        // Fail-open: use partitioned profile context if profile fetch errors
        contextBlock = clientProfileContext || '';
      }
    } else if (NUTRITION_INTENTS.includes(intent)) {
      const { context: nctx, engine } = await loadNutritionContext(supabaseClient, user.id);
      contextBlock = nctx || [clientProfileContext, clientNutritionContext].filter(Boolean).join('\n\n');

      if (intent === 'nutrition_target_lookup') {
        // Deterministic read-only lookup — never computes a new value,
        // only reports what's already stored, or an honest fallback.
        const ask = detectNutritionTargetAsk(latestUserMessage) ?? 'macro';
        const targets: StoredNutritionTargets = {
          calorieTarget: engine.calorieTarget, proteinTarget: engine.proteinTarget,
          carbTarget: engine.carbTarget, fatTarget: engine.fatTarget,
        };
        const described = describeNutritionTarget(targets, ask);
        engineResult = { type: 'nutrition_target_lookup', ask, ...targets, hasValue: described.hasValue, answerText: described.text };
      } else if (intent === 'grocery_list') {
        const memoryPref = (memoryRows || []).find((m: any) => m.category === 'nutrition preferences')?.memory_value as any;
        engineResult = { type: 'grocery_list', list: generateGroceryList(memoryPref || 'omnivore', 'moderate') };
      } else if (intent === 'supplement_guidance') {
        engineResult = { type: 'supplement_guidance', supplements: getSupplementAdvice(latestUserMessage) };
      } else if (intent === 'eating_out_guidance') {
        engineResult = {
          type: 'eating_out_guidance',
          guidance: [
            { venue: 'Fast Casual (Mexican/Bowls)', recommendation: 'Choose rice, black beans, double chicken/tofu, salsa, skip sour cream.' },
            { venue: 'Japanese / Sushi', recommendation: 'Opt for sashimi, edamame, steamed rice, teriyaki chicken, miso soup.' },
            { venue: 'Airport / Travel', recommendation: 'Grab hardboiled eggs, Greek yogurt, almonds, pre-packaged turkey sandwich, water.' },
          ],
        };
      } else if (intent === 'nutrition_plan_edit') {
        const swap = getEqualMacroSubstitutions(latestUserMessage, 100);
        engineResult = { type: 'nutrition_plan_edit', swap };
      } else {
        // nutrition_plan_generate, nutrition_review, nutrition_status, nutrition_advice
        const weightKg = memProfile?.weight_kg ? Number(memProfile.weight_kg) : 75;
        const rawCalc = computeCalorieTargets({
          weightKg,
          goal: mapProfileGoal(memProfile?.goal) as any,
          activityLevel: 'moderate',
        });
        const cycling = computeMacroCycling(rawCalc.dailyCalories, weightKg);
        const sampleMeals = [
          {
            name: 'Breakfast',
            targetCalories: Math.round(cycling.trainingDay.calories * 0.25),
            items: [
              { name: 'Oats / Cream of Rice', amountG: 60, calories: 220, proteinG: 7, carbsG: 40, fatG: 3, category: 'carbs' as const },
              { name: 'Egg Whites / Tofu', amountG: 150, calories: 120, proteinG: 22, carbsG: 2, fatG: 2, category: 'protein' as const },
            ],
          },
          {
            name: 'Lunch',
            targetCalories: Math.round(cycling.trainingDay.calories * 0.35),
            items: [
              { name: 'Chicken Breast / Paneer', amountG: 150, calories: 220, proteinG: 32, carbsG: 0, fatG: 6, category: 'protein' as const },
              { name: 'Brown Rice', amountG: 150, calories: 200, proteinG: 4, carbsG: 42, fatG: 2, category: 'carbs' as const },
            ],
          },
        ];
        const rawResult = {
          baseTdee: rawCalc.baseTdee, dailyTargetCalories: rawCalc.dailyCalories,
          trainingDayMacros: cycling.trainingDay, restDayMacros: cycling.restDay,
          currentPhase: rawCalc.phase, meals: sampleMeals,
          groceryList: generateGroceryList('omnivore', 'moderate'),
        };
        const validation = validateNutritionPlan(sampleMeals, {
          targetCalories: rawCalc.dailyCalories, targetProteinG: cycling.trainingDay.proteinG, weightKg,
        });
        const intel = deriveNutritionIntelligence(rawResult, validation, {
          consumedCaloriesAvg: engine.consumedCalories, targetCalories: engine.calorieTarget,
          consumedProteinAvg: engine.consumedProtein, targetProtein: engine.proteinTarget,
        }, { weightKg, goal: mapProfileGoal(memProfile?.goal) as any });
        engineResult = intel;
      }
    } else {
      // general_chat / and any unclassified intents:
      // use only minimal profile context; NEVER dump raw workout history or nutrition logs by default.
      contextBlock = clientProfileContext || '';
    }

    // 5. Grounded system prompt -------------------------------------------------
    const systemPrompt = buildCoachSystemPrompt({ intent, engineResult, context: contextBlock, memoryCard, coachInstructions, safetyTriggered });

    // Build messages: system → prior turns → latest message LAST (authoritative).
    const priorTurns = (Array.isArray(messageHistory) ? messageHistory : [])
      .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-8);
    while (priorTurns.length && priorTurns[priorTurns.length - 1].role === 'user'
      && priorTurns[priorTurns.length - 1].content.trim() === (message || '').trim()) {
      priorTurns.pop(); // avoid duplicating the current message
    }
    const baseMessages = [
      { role: 'system', content: systemPrompt },
      ...priorTurns.map((m: any) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
      { role: 'user', content: latestUserMessage },
    ];

    // Dev logging of the final payload (secrets/PII removed).
    if (Deno.env.get('DEBUG_AI') === '1') {
      console.log('[ai-coach] payload', JSON.stringify({
        intent, provider_order: 'gemini→groq', turns: baseMessages.length,
        engineResult, contextChars: contextBlock.length,
      }));
    }

    // 6 + 7. Model execution + validation + retries -----------------------------
    const started = Date.now();
    let resp: CoachResponse, provider = 'unknown', model = 'unknown', usage = { inputTokens: 0, outputTokens: 0 }, costUsd = 0;
    let labelLeakDetected = false, labelLeakSanitized = false;
    let providerAttempts: ProviderAttemptLog[] = [];
    try {
      // Everything the answer may cite must appear here (engine result + context
      // + Coach Memory — the personal-claim guard needs memory-sourced facts
      // like favourite exercises or training days to ground as legitimate).
      const groundedSource = `${engineResult !== undefined ? JSON.stringify(engineResult) : ''}\n${contextBlock}\n${memoryCard}`;
      const out = await runCoach(baseMessages, intent, groundedSource);
      resp = out.resp; provider = out.provider; model = out.model; usage = out.usage; costUsd = out.costUsd;
      labelLeakDetected = out.labelLeakDetected; labelLeakSanitized = out.labelLeakSanitized;
      providerAttempts = out.providerAttempts;
    } catch (providerErr: any) {
      if (providerErr instanceof AINotConfiguredError) {
        return new Response(JSON.stringify({
          error: 'AI_PROVIDER_NOT_CONFIGURED',
          message: 'No AI provider is configured. Set GEMINI_API_KEY and/or GROQ_API_KEY.',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 });
      }
      // Even on total failure, surface WHY each provider didn't work — never
      // just "provider_error" with no further detail.
      const failedAttempts: ProviderAttemptLog[] = providerErr instanceof AllProvidersFailedError ? providerErr.providerAttempts : [];
      const reasonSummary = summarizeFallbackReason(failedAttempts);
      await supabaseServiceRole.from('ai_request_logs').insert({
        athlete_id: user.id, subscription_tier: subscriptionTier, success: false,
        error_reason: 'provider_error', coach_type: intent, message_length: latestUserMessage.length,
        conversation_id: conversationId || null, engine: engineNameForIntent(intent),
        fallback_triggered: false, response_type: 'error', action_types: ['retry'],
        fallback_reason: reasonSummary,
      }).then(() => {}, () => {});
      return new Response(JSON.stringify({
        reply: 'Yeti Coach is temporarily unable to analyse this request. Please try again shortly.',
        response: 'Yeti Coach is temporarily unable to analyse this request. Please try again shortly.',
        actions: [], action_types: ['retry'], intent, response_type: 'error',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    // 7a. Nutrition-target answer guarantee (Fix 8) — never trust the model's
    // prose alone for a "never invent a value" requirement. If the reply
    // doesn't actually contain the real stored number (or, when none exists,
    // doesn't convey that honestly), replace it with the deterministic text.
    // Skipped for the multi-value 'macro' ask — verifying four numbers by
    // substring match isn't worth the complexity; grounding + retries cover it.
    if (intent === 'nutrition_target_lookup') {
      const er = engineResult as any;
      if (er?.ask !== 'macro') {
        const expectedValue = er?.ask === 'protein' ? er.proteinTarget
          : er?.ask === 'calorie' ? er.calorieTarget
          : er?.ask === 'carb' ? er.carbTarget
          : er?.ask === 'fat' ? er.fatTarget
          : null;
        const answerIsGrounded = er?.hasValue
          ? resp.direct_answer.includes(String(expectedValue))
          : /don'?t (currently )?have|no saved|not (currently )?saved/i.test(resp.direct_answer);
        if (!answerIsGrounded) resp = { ...resp, direct_answer: er.answerText };
      }
    }

    // 7b. Persist durable facts the coach learned (Fix 6): category MUST match
    // the exact whitelist (aliases normalized) — anything else is REJECTED and
    // LOGGED, never silently dropped. Each successful write is verified with a
    // read-back before it counts as "persisted". (memoryPersistedThisTurn /
    // rejectedMemoryUpdates are declared earlier, alongside the deterministic
    // explicit-memory path, since both paths report into the same state.)
    if (resp.memory_updates && resp.memory_updates.length) {
      for (const u of resp.memory_updates) {
        if (!u?.memory_key) {
          rejectedMemoryUpdates.push({ category: u?.category ?? '', memory_key: '', reason: 'missing memory_key' });
          continue;
        }
        const category = normalizeMemoryCategory(u.category);
        if (!category) {
          rejectedMemoryUpdates.push({ category: u.category, memory_key: u.memory_key, reason: 'unrecognised category' });
          continue;
        }
        if (u.memory_value === '') {
          // Forgetting is always allowed.
          await supabaseServiceRole.from('ai_memory').delete()
            .eq('athlete_id', user.id).eq('memory_key', u.memory_key).then(() => {}, () => {});
          continue;
        }
        if (!classifyMemory(u.memory_value).shouldStore) {
          rejectedMemoryUpdates.push({ category, memory_key: u.memory_key, reason: 'not a durable fact' });
          continue;
        }
        try {
          const { error: upsertErr } = await supabaseServiceRole.from('ai_memory').upsert({
            athlete_id: user.id, category, memory_key: u.memory_key,
            memory_value: u.memory_value, updated_at: new Date().toISOString(),
          }, { onConflict: 'athlete_id,memory_key' });
          if (upsertErr) throw upsertErr;
          // Verify by reading the row back — never assume a write succeeded just because it didn't throw.
          const { data: verifyRow } = await supabaseServiceRole.from('ai_memory')
            .select('memory_value').eq('athlete_id', user.id).eq('memory_key', u.memory_key).maybeSingle();
          if (verifyRow?.memory_value === u.memory_value) memoryPersistedThisTurn = true;
          else rejectedMemoryUpdates.push({ category, memory_key: u.memory_key, reason: 'write verification failed' });
        } catch (_e) {
          rejectedMemoryUpdates.push({ category, memory_key: u.memory_key, reason: 'db_error' });
        }
      }
      if (rejectedMemoryUpdates.length) console.log('[ai-coach:memory-rejected]', JSON.stringify(rejectedMemoryUpdates));
    }

    // Memory-claim honesty (Fix 6): never let the reply claim a save that didn't happen.
    if (containsMemoryClaim(resp.direct_answer) && !memoryPersistedThisTurn) {
      resp = { ...resp, direct_answer: MEMORY_PERSISTENCE_FAILED_NOTE };
    }

    // 7c. Discriminated response contract (Fix 9).
    const responseType = computeResponseType({
      intent, missingInformation: resp.missing_information, safetyFlag: resp.safety_flag, isError: false,
      engineStatus: (engineResult as any)?.status, hasEngineResult: engineResult != null,
      memoryPersistedThisTurn,
    });
    const actions: CoachAction[] = computeActions(responseType);

    // 8. Log + return -----------------------------------------------------------
    // ai_usage was already incremented atomically up-front — only the request
    // log remains here (no more read-then-write race on the usage counter).
    const latencyMs = Date.now() - started;
    // True when a non-primary provider ultimately answered (service.ts tries
    // Gemini first) — i.e. a fallback occurred. `provider` is already resolved
    // above from runCoach()'s result.
    const fallbackTriggered = provider !== 'unknown' && provider !== 'gemini';
    // Objective 1: a compact, queryable reason WHY the fallback happened —
    // e.g. "gemini:rate_limited:429" — never null when fallbackTriggered is
    // true, since providerAttempts records every attempt including skipped
    // (not_configured) ones.
    const fallbackReason = fallbackTriggered ? summarizeFallbackReason(providerAttempts) : null;
    await supabaseServiceRole.from('ai_request_logs').insert({
      athlete_id: user.id, subscription_tier: subscriptionTier, success: true,
      coach_type: intent, provider, model,
      input_tokens: usage.inputTokens, output_tokens: usage.outputTokens,
      cost_usd: costUsd, latency_ms: latencyMs, message_length: latestUserMessage.length,
      conversation_id: conversationId || null, engine: engineNameForIntent(intent),
      fallback_triggered: fallbackTriggered, response_type: responseType,
      action_types: actions.map((a) => a.type), fallback_reason: fallbackReason,
    }).then(() => {}, () => {}); // non-blocking

    // Privacy-Safe Diagnostics Logging (NO PII, NO message content, NO meal descriptions)
    console.log('[ai-coach:diagnostics]', JSON.stringify({
      timestamp: new Date().toISOString(),
      intent,
      response_type: responseType,
      action_types: actions.map((a) => a.type),
      engine_executed: engineResult != null,
      confidence_score: (engineResult as any)?.confidence?.score ?? 'n/a',
      safety_blocks_triggered: (engineResult as any)?.safetyFlags?.length || (safetyTriggered ? 1 : 0),
      recovery_status: (engineResult as any)?.telemetrySummary?.recoveryStatus ?? 'n/a',
      progress_status: (engineResult as any)?.telemetrySummary?.progressStatus ?? 'n/a',
      telemetry_completeness: (engineResult as any)?.telemetrySummary?.telemetryDataPointCount ?? 0,
      memory_retrieval_count: memoryCard ? memoryCard.split('\n').length : 0,
      memory_persisted: memoryPersistedThisTurn,
      memory_rejected_count: rejectedMemoryUpdates.length,
      label_leak_detected: labelLeakDetected,
      label_leak_sanitized: labelLeakSanitized,
      prompt_token_estimate: usage.inputTokens,
      completion_token_estimate: usage.outputTokens,
      total_execution_time_ms: latencyMs,
      db_query_count: 5,
      fallback_events: fallbackTriggered ? ['provider_fallback'] : [],
      fallback_reason: fallbackReason,
      // Redacted per-attempt trail: provider/model names + failure category +
      // HTTP status + latency only — never a response body or error message.
      provider_attempts: providerAttempts.map((a) => ({
        provider: a.provider, model: a.model, succeeded: a.succeeded,
        failure_category: a.failureCategory ?? null, http_status: a.httpStatus ?? null, latency_ms: a.latencyMs,
      })),
    }));

    const reply = toReply(resp);
    // Compound-request guarantee (Fix 7): append the deterministic secondary
    // answer in code — never rely on the model to remember it unprompted.
    const finalReply = compoundNutritionAnswer ? `${reply}\n\n${compoundNutritionAnswer}` : reply;
    return new Response(JSON.stringify({
      reply: finalReply, response: finalReply, actions, action_types: actions.map((a) => a.type),
      intent, response_type: responseType, structured: resp,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });
  } catch (error: any) {
    console.error('[ai-coach] error:', error);
    // Harden against a non-Error throw (e.g. malformed req.json()) where
    // `error.message` would be undefined and JSON.stringify would omit the key.
    return new Response(JSON.stringify({ error: error?.message || 'Unexpected error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    });
  }
});

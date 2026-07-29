import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AINotConfiguredError, generateChat, healthCheck } from "../_shared/ai/index.ts";
import { classifyIntent, CoachIntent } from "../_shared/ai/intent.ts";
import { parsePlanEdit } from "../_shared/ai/planEdit.ts";
import { resolveExerciseAlias } from "../_shared/ai/exerciseResolver.ts";
import { decideProgression, computeNutritionRemaining, NutritionInput } from "../_shared/ai/coachEngine.ts";
import { buildCoachSystemPrompt } from "../_shared/ai/coachPrompt.ts";
import { buildCoachMemoryCard, foldMemoryRows, mergeCoachMemory } from "../_shared/ai/coachMemory.ts";
import { classifyMemory } from "../_shared/ai/memoryClassifier.ts";
import {
  parseCoachResponse, responseViolatesIntent, safePlainText, ungroundedNumbers,
  REPAIR_INSTRUCTION, INTENT_ISOLATION_RETRY, GROUNDING_RETRY, CoachResponse,
} from "../_shared/ai/coachSchema.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WORKOUT_INTENTS: CoachIntent[] = ['workout_plan_edit', 'workout_progression', 'exercise_substitution'];

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
    const { data: prof } = await supabase
      .from('profiles')
      .select('daily_calorie_target,daily_protein_target,daily_carb_target,daily_fat_target')
      .eq('id', userId).maybeSingle();
    if (prof) {
      engine.calorieTarget = prof.daily_calorie_target ?? null;
      engine.proteinTarget = prof.daily_protein_target ?? null;
      engine.carbTarget = prof.daily_carb_target ?? null;
      engine.fatTarget = prof.daily_fat_target ?? null;
    }
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const { data: logs } = await supabase
      .from('meal_logs')
      .select('servings, food:foods(calories,protein,carbs,fat)')
      .eq('user_id', userId).gte('logged_at', start.toISOString());
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

/** Best-effort extraction of the target lift phrase from a progression question. */
function extractExerciseName(message: string): string {
  return (message || '')
    .toLowerCase()
    .replace(/[?.!,]/g, ' ')
    .replace(/\b(should i|can i|do i|is it time to|ready to|time to|increase|go up|add (weight|load)|more weight|heavier|bump( up)?|progress(?:ion)?|the weight|weight|load|my|on|for|to|today|next session|next|reps?|sets?)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

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

  // 3. This lift's working sets within those sessions.
  const { data: sets } = await supabase
    .from('session_sets').select('weight, reps, session_id, completed_at')
    .eq('exercise_id', ex.id).in('session_id', sessionIds);
  if (!sets || sets.length === 0) {
    return { engineInput: null, context: `EXERCISE: ${ex.name}\nNo completed sets logged for this lift yet.` };
  }

  // 4. Group by session, ordered by session recency; take the latest 3–5.
  const bySession: Record<string, any[]> = {};
  for (const s of sets) (bySession[s.session_id] ||= []).push(s);
  const orderedIds = sessionIds.filter((id: string) => bySession[id]).slice(0, 5);
  const latest = bySession[orderedIds[0]];
  const lastSetReps = latest.map((s: any) => Number(s.reps) || 0);
  const currentWeight = Math.max(...latest.map((s: any) => Number(s.weight) || 0));

  // 5. Target sets/reps from the plan prescription, if the lift is programmed.
  const { data: pex } = await supabase
    .from('plan_exercises').select('sets, reps').eq('exercise_id', ex.id).limit(1);
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
    recoveryScore: null,
    isUpperBody: /\b(bench|press|row|curl|pulldown|fly|raise|dip|pull-?up|push-?up|shrug|extension|chin)\b/.test(ex.name.toLowerCase()),
  };

  const histLines = orderedIds.map((id: string, i: number) => {
    const sess = bySession[id];
    const w = Math.max(...sess.map((s: any) => Number(s.weight) || 0));
    const reps = sess.map((s: any) => Number(s.reps) || 0).join(', ');
    const when = sess[0]?.completed_at ? new Date(sess[0].completed_at).toLocaleDateString() : '';
    return `  ${i === 0 ? 'latest' : `-${i}`} ${when}: ${w}kg x [${reps}]`;
  }).join('\n');

  const context =
    `EXERCISE: ${ex.name}\nTARGET: ${targetSets} x ${targetRepsLow}-${targetRepsHigh}\n` +
    `RECENT SESSIONS (newest first):\n${histLines}\n(RPE is not recorded — do not reference RPE.)`;

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
  const canonical = resolveExerciseAlias(edit.exercise);
  const { data: exs } = await supabase.from('exercises').select('id, name').ilike('name', `%${canonical}%`).limit(1);
  const ex = exs?.[0];
  if (!ex && edit.action !== 'remove') {
    return { success: false, reason: 'unknown_exercise', message: `I couldn't find "${edit.exercise}" in the exercise library.` };
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
    if (edit.action === 'add') {
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
      .from('plan_exercises').select('id, exercise_id, exercises(name)').in('plan_day_id', dayIds);
    const target = (pxs || []).find((p: any) =>
      (ex && p.exercise_id === ex.id) || (p.exercises?.name || '').toLowerCase().includes(canonical));
    if (!target) return { success: false, reason: 'not_in_plan', message: `I couldn't find ${edit.exercise} in your current plan.` };
    const targetName = target.exercises?.name || edit.exercise;

    if (edit.action === 'remove') {
      const { error } = await supabase.from('plan_exercises').delete().eq('id', target.id);
      if (error) throw error;
      return { success: true, action: 'remove', exercise: targetName, message: `${targetName} was removed from your plan.` };
    }
    if (edit.action === 'replace') {
      const rc = resolveExerciseAlias(edit.replacement || '');
      const { data: rexs } = await supabase.from('exercises').select('id, name').ilike('name', `%${rc}%`).limit(1);
      const rex = rexs?.[0];
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

// ─── Model execution + schema/cross-intent validation with one retry each ────────
async function runCoach(
  baseMessages: { role: string; content: string }[],
  intent: CoachIntent,
  groundedSource: string,
): Promise<{ resp: CoachResponse; provider: string; model: string; usage: any; costUsd: number }> {
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

  return { resp, provider: result.provider, model: result.model, usage: result.usage, costUsd: result.costUsd };
}

function toReply(resp: CoachResponse): string {
  const parts = [resp.direct_answer.trim()];
  if (resp.reason && resp.reason.trim()) parts.push(resp.reason.trim());
  if (typeof resp.recommended_action === 'string' && resp.recommended_action.trim()) parts.push(resp.recommended_action.trim());
  return parts.join('\n\n');
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

    // Entitlements + daily free-tier limit -------------------------------------
    const { data: entitlements } = await supabaseClient
      .from('user_entitlements').select('plan_id').eq('user_id', user.id).eq('status', 'active');
    const isPremiumPlan = (entitlements || []).some((e: any) => e.plan_id === 'PRO' || e.plan_id === 'COACHING');
    const subscriptionTier = isPremiumPlan
      ? ((entitlements || []).find((e: any) => e.plan_id === 'COACHING') ? 'COACHING' : 'PRO') : 'FREE';
    const { data: betaConfig } = await supabaseClient
      .from('beta_mode_config').select('is_global_beta_active').single();
    const isPremium = isPremiumPlan || (betaConfig?.is_global_beta_active ?? false);

    const today = new Date().toISOString().split('T')[0];
    const { data: usageData } = await supabaseClient
      .from('ai_usage').select('requests_count').eq('athlete_id', user.id).eq('date', today).maybeSingle();
    const currentRequests = usageData?.requests_count || 0;
    if (!isPremium && currentRequests >= 5) {
      await supabaseServiceRole.from('ai_request_logs').insert({
        athlete_id: user.id, subscription_tier: subscriptionTier, success: false,
        error_reason: 'daily_limit_exceeded', message_length: message?.length ?? 0,
      }).then(() => {}).catch(() => {});
      return new Response(JSON.stringify({ error: 'AI Coach daily limit reached for free tier. Upgrade to Yeti Pro for unlimited coaching!' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403,
      });
    }

    // 2. Deterministic, stateless intent classification (latest message only) ---
    const intent = classifyIntent(latestUserMessage);

    // Safety keyword scan (log injury reports).
    const safetyTriggered = /\b(pain|hurt|injured|sprain|tweak|ache|injury)\b/i.test(latestUserMessage) || intent === 'medical_safety';
    if (safetyTriggered) {
      await supabaseServiceRole.from('ai_safety_logs').insert({
        user_id: user.id, conversation_id: conversationId || 'general',
        risk_type: 'INJURY_REPORT', trigger_text: latestUserMessage, category: 'injuries',
      }).then(() => {}).catch(() => {});
    }

    // 3. Intent-scoped context loading (STRICT isolation) -----------------------
    let contextBlock = '';
    let engineResult: unknown = undefined;
    let coachInstructions = '';

    if (WORKOUT_INTENTS.includes(intent)) {
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
      } else {
        contextBlock = await loadWorkoutContext(supabaseClient, user.id); // no nutrition, ever
      }
    } else if (intent === 'nutrition_status') {
      const { context: nctx, engine } = await loadNutritionContext(supabaseClient, user.id); // no workouts
      contextBlock = nctx;
      engineResult = computeNutritionRemaining(engine);
    } else {
      // general_chat / explanation / recovery / advice / meal_suggestion / rest_pacing:
      // use only the light client-supplied context; NEVER default to nutrition.
      contextBlock = typeof context === 'string' ? context : '';
    }

    // 4b. Coach Memory — long-term ai_memory folded with deterministic profile
    //     facts, so Yeti remembers the athlete across the conversation.
    let memoryCard = '';
    try {
      const { data: memoryRows } = await supabaseClient
        .from('ai_memory').select('category, memory_key, memory_value').eq('athlete_id', user.id);
      let memory = foldMemoryRows(memoryRows || []);
      const { data: memProfile } = await supabaseClient
        .from('profiles').select('goal, weight_kg').eq('id', user.id).maybeSingle();
      if (memProfile) {
        memory = mergeCoachMemory(memory, {
          goal: memProfile.goal ?? memory.goal,
          currentWeightKg: memProfile.weight_kg ?? memory.currentWeightKg,
        });
      }
      memoryCard = buildCoachMemoryCard(memory);
    } catch (_e) { /* memory is best-effort — never blocks a reply */ }

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
    try {
      // Everything the answer may cite must appear here (engine result + context).
      const groundedSource = `${engineResult !== undefined ? JSON.stringify(engineResult) : ''}\n${contextBlock}`;
      const out = await runCoach(baseMessages, intent, groundedSource);
      resp = out.resp; provider = out.provider; model = out.model; usage = out.usage; costUsd = out.costUsd;
    } catch (providerErr: any) {
      if (providerErr instanceof AINotConfiguredError) {
        return new Response(JSON.stringify({
          error: 'AI_PROVIDER_NOT_CONFIGURED',
          message: 'No AI provider is configured. Set GEMINI_API_KEY and/or GROQ_API_KEY.',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 });
      }
      await supabaseServiceRole.from('ai_request_logs').insert({
        athlete_id: user.id, subscription_tier: subscriptionTier, success: false,
        error_reason: 'provider_error', coach_type: intent, message_length: latestUserMessage.length,
      }).then(() => {}).catch(() => {});
      return new Response(JSON.stringify({
        reply: 'Yeti Coach is temporarily unable to analyse this request. Please try again shortly.',
        response: 'Yeti Coach is temporarily unable to analyse this request. Please try again shortly.',
        actions: [], intent,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    // 7b. Persist durable facts the coach learned (restores ai_memory writes).
    if (resp.memory_updates && resp.memory_updates.length) {
      const allowed = ['preferences', 'training goals', 'workout style', 'nutrition preferences', 'equipment preferences', 'injuries'];
      for (const u of resp.memory_updates) {
        if (!u?.memory_key || !allowed.includes(u.category)) continue;
        if (u.memory_value === '') {
          // Forgetting is always allowed.
          await supabaseServiceRole.from('ai_memory').delete()
            .eq('athlete_id', user.id).eq('memory_key', u.memory_key).then(() => {}).catch(() => {});
        } else if (classifyMemory(u.memory_value).shouldStore) {
          // Quality gate: only persist durable facts (goal/injury/diet/preference),
          // never transient states ("tired today", "had pizza").
          await supabaseServiceRole.from('ai_memory').upsert({
            athlete_id: user.id, category: u.category, memory_key: u.memory_key,
            memory_value: u.memory_value, updated_at: new Date().toISOString(),
          }, { onConflict: 'athlete_id,memory_key' }).then(() => {}).catch(() => {});
        }
      }
    }

    // 8. Log + return -----------------------------------------------------------
    const latencyMs = Date.now() - started;
    await Promise.all([
      supabaseServiceRole.from('ai_usage').upsert({
        athlete_id: user.id, date: today, requests_count: currentRequests + 1,
        subscription_tier: subscriptionTier, last_request_at: new Date().toISOString(),
      }, { onConflict: 'athlete_id,date' }),
      supabaseServiceRole.from('ai_request_logs').insert({
        athlete_id: user.id, subscription_tier: subscriptionTier, success: true,
        coach_type: intent, provider, model,
        input_tokens: usage.inputTokens, output_tokens: usage.outputTokens,
        cost_usd: costUsd, latency_ms: latencyMs, message_length: latestUserMessage.length,
      }),
    ]).catch(() => {}); // non-blocking

    const reply = toReply(resp);
    return new Response(JSON.stringify({ reply, response: reply, actions: [], intent, structured: resp }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });
  } catch (error: any) {
    console.error('[ai-coach] error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    });
  }
});

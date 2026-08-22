// suggest-exercise-swap — AI-powered exercise alternative recommendations
// Uses the dual-provider AI router (Groq llama-3.1-8b-instant Primary → Gemini 2.5 Flash Fallback).
// Designed for ultra-fast (<1s) exercise alternative swaps when gym equipment is unavailable.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AINotConfiguredError, executeAiTask, sanitizeAthleteErrorMessage } from "../_shared/ai/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TASK_TYPE = 'exercise_swap';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── 1. Auth ────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token || undefined);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      });
    }

    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey,
      { global: { headers: { Authorization: `Bearer ${serviceRoleKey}` } } }
    );

    // ── 2. Validate input ──────────────────────────────────────────────────
    const { originalExercise, availableEquipment } = await req.json();

    if (!originalExercise?.name || !originalExercise?.target_muscle) {
      return new Response(JSON.stringify({
        error: 'originalExercise must include "name" and "target_muscle"',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    // ── 3. Entitlement / rate-limit check ──────────────────────────────────
    const { data: entitlements } = await supabaseClient
      .from('user_entitlements')
      .select('plan_id')
      .eq('user_id', user.id)
      .eq('status', 'active');
    const isPremiumPlan = (entitlements || []).some(
      (e: any) => e.plan_id === 'PRO' || e.plan_id === 'COACHING'
    );
    // beta_mode_config removed — table does not exist in production.
    const isPremium = isPremiumPlan;
    const subscriptionTier = isPremiumPlan ? 'PRO' : 'FREE';

    // ATOMIC increment-and-check (same pattern as ai-coach/index.ts — avoids
    // the read-then-write race that let concurrent requests bypass the cap).
    const today = new Date().toISOString().split('T')[0];
    let newRequestCount = 0;
    try {
      const { data: incremented, error: incErr } = await supabaseServiceRole
        .rpc('increment_ai_usage', { p_athlete_id: user.id, p_date: today, p_tier: subscriptionTier });
      if (incErr) throw incErr;
      newRequestCount = Number(incremented) || 0;
    } catch (_e) {
      newRequestCount = 0; // fail-open
    }

    if (!isPremium && newRequestCount > 5) {
      await supabaseServiceRole.from('ai_request_logs').insert({
        athlete_id: user.id,
        subscription_tier: 'FREE',
        success: false,
        error_reason: 'daily_limit_exceeded',
        coach_type: TASK_TYPE,
      }).then(() => {}).catch(() => {});

      return new Response(JSON.stringify({
        error: 'AI Coach daily limit reached for free tier. Upgrade to Yeti Pro for unlimited coaching!',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403,
      });
    }

    // ── 4. Build prompt & call AI Router ───────────────────────────────────
    const tier = isPremium ? (isPremiumPlan ? 'PRO' : 'FREE') : 'FREE';
    const equipmentList = Array.isArray(availableEquipment) && availableEquipment.length > 0
      ? availableEquipment.join(', ')
      : 'any available gym equipment';

    const prompt = `The athlete cannot perform "${originalExercise.name}" (target muscle: ${originalExercise.target_muscle}) because the required equipment is occupied or unavailable.

Available equipment: ${equipmentList}.

Suggest exactly 3 biomechanically similar alternative exercises that:
- Target the same primary muscle (${originalExercise.target_muscle})
- Use only the available equipment listed above
- Provide a similar stimulus and range of motion
- Are practical gym exercises (not obscure or impractical)

Return a JSON object with this exact schema:
{
  "alternatives": [
    {
      "exercise_name": "string - the alternative exercise name",
      "reason": "string - one sentence explaining why this is a good substitute",
      "suggested_sets": number,
      "suggested_reps": "string like 10-12"
    }
  ]
}`;

    try {
      const result = await executeAiTask({
        taskType: TASK_TYPE,
        req: {
          messages: [
            { role: 'system', content: 'You are the Yeti AI Exercise Coach. You recommend biomechanically equivalent exercise alternatives. Return only valid JSON, no markdown or commentary.' },
            { role: 'user', content: prompt },
          ],
          jsonMode: true,
          temperature: 0.5,
        },
        userId: user.id,
        subscriptionTier: tier,
        supabaseServiceRole,
      });

      // Update daily usage counter
      await supabaseServiceRole
        .from('ai_usage')
        .upsert({
          athlete_id: user.id,
          date: today,
          requests_count: currentRequests + 1,
          subscription_tier: tier,
          last_request_at: new Date().toISOString(),
        }, { onConflict: 'athlete_id,date' })
        .catch(() => {});

      // Parse and return structured JSON
      let swaps: any;
      try {
        swaps = JSON.parse(result.text);
      } catch {
        const cleaned = result.text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        swaps = JSON.parse(cleaned);
      }

      return new Response(JSON.stringify(swaps), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    } catch (providerErr: any) {
      const isNotConfigured = providerErr instanceof AINotConfiguredError || providerErr?.name === 'AINotConfiguredError' || (providerErr?.message && providerErr.message.includes('AI_PROVIDER_NOT_CONFIGURED'));
      if (isNotConfigured) {
        return new Response(JSON.stringify({
          error: 'AI_PROVIDER_NOT_CONFIGURED',
          message: 'No AI provider is configured. Set GROQ_API_KEY or GEMINI_API_KEY.',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503,
        });
      }

      console.error(`[${TASK_TYPE}] router error:`, providerErr?.message);
      return new Response(JSON.stringify({ error: 'AI coach is temporarily unavailable. Try again shortly.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502,
      });
    }
  } catch (error: any) {
    console.error(`[${TASK_TYPE}] error:`, error);
    return new Response(JSON.stringify({ error: sanitizeAthleteErrorMessage(error, 'AI coach is temporarily unavailable. Try again shortly.') }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    });
  }
});

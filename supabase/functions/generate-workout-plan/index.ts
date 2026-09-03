// generate-workout-plan — AI-powered hypertrophy program builder
// Uses the dual-provider AI router (Gemini 2.5 Flash Primary → Groq openai/gpt-oss-20b Fallback).
// Enforces full multi-day split program structure with sets, rep ranges, and rest periods in structured JSON.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createAnonClient, createServiceRoleClient } from "../_shared/supabaseClient.ts";
import { AINotConfiguredError, executeAiTask, sanitizeAthleteErrorMessage } from "../_shared/ai/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TASK_TYPE = 'workout_plan';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── 1. Auth ────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const supabaseClient = createAnonClient(authHeader);

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token || undefined);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      });
    }

    const supabaseServiceRole = createServiceRoleClient();

    // ── 2. Validate input ──────────────────────────────────────────────────
    const { targetMuscles, daysPerWeek, experienceLevel, availableEquipment } = await req.json();

    if (!Array.isArray(targetMuscles) || targetMuscles.length === 0) {
      return new Response(JSON.stringify({ error: 'targetMuscles must be a non-empty array' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }
    if (typeof daysPerWeek !== 'number' || daysPerWeek < 1 || daysPerWeek > 7) {
      return new Response(JSON.stringify({ error: 'daysPerWeek must be between 1 and 7' }), {
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

    const { data: betaConfig } = await supabaseClient
      .from('beta_mode_config')
      .select('is_global_beta_active')
      .maybeSingle();
    const isPremium = isPremiumPlan || (betaConfig?.is_global_beta_active ?? false);

    const today = new Date().toISOString().split('T')[0];
    const { data: usageData } = await supabaseClient
      .from('ai_usage')
      .select('requests_count')
      .eq('athlete_id', user.id)
      .eq('date', today)
      .maybeSingle();
    const currentRequests = usageData?.requests_count || 0;

    if (!isPremium && currentRequests >= 5) {
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
    const prompt = `Build a ${daysPerWeek}-day per week hypertrophy workout program for a ${experienceLevel || 'intermediate'} lifter.

Target muscle groups: ${targetMuscles.join(', ')}.
Available equipment: ${(availableEquipment || []).join(', ') || 'full gym'}.

Rules:
- Each day should have 4-6 exercises.
- Use rep ranges appropriate for hypertrophy (typically 6-15 reps).
- Include appropriate rest periods (60-120 seconds).
- Name each day descriptively (e.g. "Push Day", "Back & Biceps").
- Only use exercises compatible with the available equipment.

Return a JSON object with this exact schema:
{
  "plan_name": "string - a descriptive name for the plan",
  "days": [
    {
      "day_name": "string",
      "exercises": [
        {
          "exercise_name": "string",
          "target_sets": number,
          "reps_range": "string like 8-12",
          "rest_seconds": number
        }
      ]
    }
  ]
}`;

    try {
      const result = await executeAiTask({
        taskType: TASK_TYPE,
        req: {
          messages: [
            { role: 'system', content: 'You are the Yeti AI Workout Coach. You design effective, evidence-based hypertrophy programs. Return only valid JSON, no markdown or commentary.' },
            { role: 'user', content: prompt },
          ],
          jsonMode: true,
          temperature: 0.7,
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
      let plan: any;
      try {
        plan = JSON.parse(result.text);
      } catch {
        const cleaned = result.text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        plan = JSON.parse(cleaned);
      }

      return new Response(JSON.stringify(plan), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    } catch (providerErr: any) {
      const isNotConfigured = providerErr instanceof AINotConfiguredError || providerErr?.name === 'AINotConfiguredError' || (providerErr?.message && providerErr.message.includes('AI_PROVIDER_NOT_CONFIGURED'));
      if (isNotConfigured) {
        return new Response(JSON.stringify({
          error: 'AI_PROVIDER_NOT_CONFIGURED',
          message: 'No AI provider is configured. Set GEMINI_API_KEY or GROQ_API_KEY.',
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

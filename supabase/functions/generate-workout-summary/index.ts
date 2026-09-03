// generate-workout-summary — Post-workout performance analysis
// Computes total_volume_kg deterministically in TypeScript (Σ weight × reps),
// then uses the dual-provider AI router (Groq llama-3.1-8b-instant Primary → Gemini 2.5 Flash Fallback)
// for fatigue scoring, highlights, and progressive overload recommendations.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createAnonClient, createServiceRoleClient } from "../_shared/supabaseClient.ts";
import { AINotConfiguredError, executeAiTask, sanitizeAthleteErrorMessage } from "../_shared/ai/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TASK_TYPE = 'workout_summary';

/** Deterministic volume calculation — never delegated to the LLM. */
function computeTotalVolume(sets: Array<{ weight_kg: number; reps: number }>): number {
  return sets.reduce((sum, s) => sum + (Number(s.weight_kg) || 0) * (Number(s.reps) || 0), 0);
}

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
    const { workoutData } = await req.json();

    if (!workoutData || typeof workoutData.duration_min !== 'number' || !Array.isArray(workoutData.completed_sets)) {
      return new Response(JSON.stringify({
        error: 'workoutData must include "duration_min" (number) and "completed_sets" (array)',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    if (workoutData.completed_sets.length === 0) {
      return new Response(JSON.stringify({
        error: 'completed_sets must not be empty',
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

    // ── 4. Deterministic volume calculation ────────────────────────────────
    const totalVolumeKg = computeTotalVolume(workoutData.completed_sets);

    // ── 5. Build prompt & call AI Router ───────────────────────────────────
    const tier = isPremium ? (isPremiumPlan ? 'PRO' : 'FREE') : 'FREE';

    // Summarise sets for the LLM context
    const setsSummary = workoutData.completed_sets.map(
      (s: any) => `${s.exercise_name}: Set ${s.set_number} — ${s.weight_kg}kg × ${s.reps} reps`
    ).join('\n');

    const prompt = `Analyze this completed workout and provide coaching feedback.

Workout duration: ${workoutData.duration_min} minutes
Total volume: ${totalVolumeKg} kg (pre-computed — do NOT recalculate this)

Completed sets:
${setsSummary}

Provide your analysis as a JSON object with this exact schema:
{
  "highlights": ["string - 2 to 4 short, specific highlights about the workout performance"],
  "fatigue_score": number between 1 and 10 (1 = very fresh, 10 = extremely fatigued) — estimate based on volume, set count, and duration,
  "progressive_overload_next_time": "string - one concrete, actionable suggestion for progressive overload in the next session"
}

Important:
- Do NOT include total_volume_kg in your response — it is computed separately.
- Keep highlights specific to the exercises performed, not generic.
- The fatigue score should reflect the intensity and volume of the session.`;

    try {
      const result = await executeAiTask({
        taskType: TASK_TYPE,
        req: {
          messages: [
            { role: 'system', content: 'You are the Yeti AI Performance Coach. You analyze workout data and provide actionable, evidence-based feedback. Return only valid JSON, no markdown or commentary.' },
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

      // Parse and merge deterministic + AI fields
      let aiAnalysis: any;
      try {
        aiAnalysis = JSON.parse(result.text);
      } catch {
        const cleaned = result.text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        aiAnalysis = JSON.parse(cleaned);
      }

      const summary = {
        total_volume_kg: totalVolumeKg,
        highlights: aiAnalysis.highlights || [],
        fatigue_score: aiAnalysis.fatigue_score ?? null,
        progressive_overload_next_time: aiAnalysis.progressive_overload_next_time || '',
      };

      return new Response(JSON.stringify(summary), {
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

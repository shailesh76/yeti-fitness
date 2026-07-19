// exercise-guidance — on-demand AI coaching text for a single exercise
// (form explanation, common mistakes, breathing technique, beginner/advanced
// variants, injury modifications). Generated only when the client explicitly
// requests one guidanceType — never eagerly, never cached server-side.
//
// Mirrors ai-coach's conventions (auth, entitlement/rate-limit check via the
// same ai_usage counter, ai_request_logs) but is otherwise a separate,
// stateless, single-shot endpoint — no conversation, no ai_memory writes,
// no safety-keyword scanning (this isn't free-text chat). The only AI
// provider code is the shared service import below; nothing here talks to
// a provider directly.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AINotConfiguredError, generateChat } from "../_shared/ai/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GUIDANCE_TYPES = [
  'form_explanation',
  'common_mistakes',
  'breathing_technique',
  'beginner_version',
  'advanced_version',
  'injury_modifications',
] as const;
type GuidanceType = typeof GUIDANCE_TYPES[number];

function buildPrompt(type: GuidanceType, ex: { name: string; target_muscle?: string; muscle_group?: string; equipment?: string; instructions?: string }): string {
  const muscle = ex.target_muscle || ex.muscle_group || 'the target muscles';
  const equipment = ex.equipment || 'the equipment shown';
  const base = `Exercise: ${ex.name}\nPrimary muscle: ${muscle}\nEquipment: ${equipment}\n${ex.instructions ? `Reference instructions: ${ex.instructions}` : ''}`;

  const asks: Record<GuidanceType, string> = {
    form_explanation: `${base}\n\nExplain correct form for this exercise in 3-5 short sentences a beginner could follow. Be specific and practical, not generic.`,
    common_mistakes: `${base}\n\nList the 3 most common mistakes people make with this exercise, and the one-line fix for each. Format as a short numbered list.`,
    breathing_technique: `${base}\n\nExplain the correct breathing pattern for this exercise (when to inhale, when to exhale) in 2-3 sentences.`,
    beginner_version: `${base}\n\nDescribe a beginner-friendly regression of this exercise in 2-3 sentences — how to make it easier while still training the same muscle.`,
    advanced_version: `${base}\n\nDescribe an advanced progression of this exercise in 2-3 sentences — how to make it harder for an experienced lifter.`,
    injury_modifications: `${base}\n\nGive 2-3 sentences of safe modifications for someone with a minor joint or muscle sensitivity relevant to this exercise. Do not diagnose or prescribe treatment — only suggest exercise modifications, and recommend consulting a professional for anything beyond minor discomfort.`,
  };
  return asks[type];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey,
      { global: { headers: { Authorization: `Bearer ${serviceRoleKey}` } } }
    );

    const { exerciseId, guidanceType } = await req.json();
    if (!exerciseId || !GUIDANCE_TYPES.includes(guidanceType)) {
      return new Response(JSON.stringify({ error: `guidanceType must be one of: ${GUIDANCE_TYPES.join(', ')}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const { data: exercise, error: exError } = await supabaseClient
      .from('exercises')
      .select('name, target_muscle, muscle_group, equipment, instructions')
      .eq('id', exerciseId)
      .maybeSingle();
    if (exError || !exercise) {
      return new Response(JSON.stringify({ error: 'Exercise not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Same free-tier gate as ai-coach: 5/day unless premium or global beta.
    const { data: entitlements } = await supabaseClient
      .from('user_entitlements')
      .select('plan_id')
      .eq('user_id', user.id)
      .eq('status', 'active');
    const isPremiumPlan = (entitlements || []).some((e: any) => e.plan_id === 'PRO' || e.plan_id === 'COACHING');

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
        coach_type: 'exercise_guidance',
      }).then(() => {}).catch(() => {});

      return new Response(JSON.stringify({
        error: 'AI Coach daily limit reached for free tier. Upgrade to Yeti Pro to get unlimited coaching!',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    try {
      const result = await generateChat({
        messages: [
          { role: 'system', content: 'You are the Yeti AI Exercise Coach. Be specific, concise, and safe. Never diagnose medical conditions.' },
          { role: 'user', content: buildPrompt(guidanceType, exercise) },
        ],
        temperature: 0.6,
      });

      await Promise.all([
        supabaseServiceRole
          .from('ai_usage')
          .upsert({
            athlete_id: user.id,
            date: today,
            requests_count: currentRequests + 1,
            subscription_tier: isPremium ? (isPremiumPlan ? 'PRO' : 'FREE') : 'FREE',
            last_request_at: new Date().toISOString(),
          }, { onConflict: 'athlete_id,date' }),
        supabaseServiceRole.from('ai_request_logs').insert({
          athlete_id: user.id,
          subscription_tier: isPremium ? 'PRO' : 'FREE',
          success: true,
          coach_type: 'exercise_guidance',
          provider: result.provider,
          model: result.model,
          input_tokens: result.usage.inputTokens,
          output_tokens: result.usage.outputTokens,
          cost_usd: result.costUsd,
        }),
      ]).catch(() => {});

      return new Response(JSON.stringify({ text: result.text, guidanceType }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (providerErr: any) {
      if (providerErr instanceof AINotConfiguredError) {
        return new Response(JSON.stringify({
          error: 'AI_PROVIDER_NOT_CONFIGURED',
          message: 'No AI provider is configured. Set GEMINI_API_KEY (primary), OPENAI_API_KEY, or ANTHROPIC_API_KEY.',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 503,
        });
      }
      console.error('[exercise-guidance] provider error:', providerErr?.message);
      await supabaseServiceRole.from('ai_request_logs').insert({
        athlete_id: user.id,
        subscription_tier: isPremium ? 'PRO' : 'FREE',
        success: false,
        error_reason: 'provider_error',
        coach_type: 'exercise_guidance',
      }).then(() => {}).catch(() => {});

      return new Response(JSON.stringify({ error: 'AI coach is temporarily unavailable. Try again shortly.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 502,
      });
    }
  } catch (error: any) {
    console.error('[exercise-guidance] error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

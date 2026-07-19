import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AINotConfiguredError, generateChat, healthCheck } from "../_shared/ai/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Provider health check: GET /ai-coach?health=1 — reports which AI providers are live.
  const reqUrl = new URL(req.url);
  if (req.method === 'GET' && reqUrl.searchParams.get('health') === '1') {
    return new Response(JSON.stringify(await healthCheck()), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // 1. Validate User
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    // Instantiate service_role client for RLS-bypassed writes (logs, safety, memory)
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey,
      { global: { headers: { Authorization: `Bearer ${serviceRoleKey}` } } }
    );

    const { type, message, rawContext, conversationId } = await req.json();
    let truncatedMessage = message || '';
    if (truncatedMessage.length > 1000) {
      truncatedMessage = truncatedMessage.substring(0, 1000) + '... [truncated for length]';
    }

    // Guard: message must not exceed 2000 characters
    if (message && message.length > 2000) {
      return new Response(JSON.stringify({ 
        error: 'Message exceeds maximum length (2000 characters).' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 2. Fetch User Entitlements (Check Subscription status)
    const { data: entitlements } = await supabaseClient
      .from('user_entitlements')
      .select('plan_id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    const isPremiumPlan = (entitlements || []).some(
      (e: any) => e.plan_id === 'PRO' || e.plan_id === 'COACHING'
    );
    const subscriptionTier = isPremiumPlan
      ? ((entitlements || []).find((e: any) => e.plan_id === 'COACHING') ? 'COACHING' : 'PRO')
      : 'FREE';

    // Check Global Beta config
    const { data: betaConfig } = await supabaseClient
      .from('beta_mode_config')
      .select('is_global_beta_active')
      .single();
    const isGlobalBeta = betaConfig?.is_global_beta_active ?? false;

    const isPremium = isPremiumPlan || isGlobalBeta;

    // 3. Count daily AI requests
    const today = new Date().toISOString().split('T')[0];
    const { data: usageData } = await supabaseClient
      .from('ai_usage')
      .select('requests_count')
      .eq('athlete_id', user.id)
      .eq('date', today)
      .maybeSingle();

    const currentRequests = usageData?.requests_count || 0;

    // 4. Enforce Premium Limits — log and reject if over limit
    if (!isPremium && currentRequests >= 5) {
      // Log failed request (over limit) — does NOT increment daily count
      await supabaseServiceRole.from('ai_request_logs').insert({
        athlete_id: user.id,
        subscription_tier: subscriptionTier,
        success: false,
        error_reason: 'daily_limit_exceeded',
        message_length: message?.length ?? 0,
      }).then(() => {}).catch(() => {});

      return new Response(JSON.stringify({ 
        error: 'AI Coach daily limit reached for free tier. Upgrade to Yeti Pro to get unlimited coaching!' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // 5. Fetch AI memory for this athlete
    const { data: memories } = await supabaseClient
      .from('ai_memory')
      .select('category, memory_key, memory_value')
      .eq('athlete_id', user.id);

    const memoryString = (memories || [])
      .map(m => `- [${m.category}] ${m.memory_key}: ${m.memory_value}`)
      .join('\n');

    // 6. Fetch pending progression recommendations
    const { data: recommendations } = await supabaseClient
      .from('progression_recommendations')
      .select('exercise_name, suggestion_text')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .limit(3);

    const recommendationsString = (recommendations || [])
      .map(r => `- Suggestion for ${r.exercise_name}: ${r.suggestion_text}`)
      .join('\n');

    // 7. Run safety checks (triggers only, not medical diagnosis)
    const safetyKeywords = ['pain', 'hurt', 'injured', 'sprain', 'tweak', 'ache', 'injury'];
    const messageLower = truncatedMessage.toLowerCase();
    const isSafetyTriggered = safetyKeywords.some(keyword => messageLower.includes(keyword));

    if (isSafetyTriggered) {
      await supabaseServiceRole.from('ai_safety_logs').insert({
        user_id: user.id,
        conversation_id: conversationId || 'general',
        risk_type: 'INJURY_REPORT',
        trigger_text: truncatedMessage,
        category: 'injuries'
      });
    }

    // 8. Build system prompt with context, memories, recommendations, and safety rules
    const systemPromptMap: Record<string, string> = {
      'workout': `You are the Yeti AI Workout Coach. Optimize training for ${rawContext?.goal || 'fitness goals'}.`,
      'nutrition': `You are the Yeti AI Nutrition Coach. Target weight: ${rawContext?.target_weight || 'fitness weight'}.`,
      'recovery': `You are the Yeti AI Recovery Coach. Recovery focus.`,
      'motivation': `You are the Yeti AI Motivation Coach. Be energetic.`
    };

    const sysPromptBase = systemPromptMap[type] || systemPromptMap['workout'];
    const safetyGuardrails = `
CRITICAL SAFETY RULES (MUST OBEY):
1. NEVER diagnose medical conditions or prescribe physical therapy/treatments.
2. NEVER encourage training through joint pain or injuries.
3. IF the user reports injury or joint pain (safety triggered), you MUST recommend:
   - Modifying or changing the exercise.
   - Reducing load/intensity.
   - Consulting a qualified medical professional/physiotherapist.
`;

    const instructionsPrompt = `
You must reply to the user message in structured JSON format. 
Response schema:
{
  "reply": "Your coaching response text here. Address the user directly, incorporating relevant memories or recommendations.",
  "memory_updates": [
    {
      "category": "preferences" | "training goals" | "workout style" | "nutrition preferences" | "equipment preferences" | "injuries",
      "memory_key": "unique_lowercase_key_representing_fact",
      "memory_value": "Short summary of preference or injury learned, OR empty string '' to delete this memory if user asked to forget it"
    }
  ]
}

AI MEMORY QUALITY RULES:
1. ONLY store long-term, meaningful athlete preferences or constraints (e.g. split choice, equipment limitations, chronic pains, calorie goals).
2. NEVER store temporary states (e.g. "is tired today", "had a bad sleep last night", "ate pizza for lunch").
3. NEVER store assumptions or PII (e.g. phone numbers, email).
4. If the user asks you to "forget" or "remove" a preference, output that key with memory_value = "" to delete it.

ATHLETE CURRENT LOCAL CONTEXT:
${JSON.stringify(rawContext || {})}

ATHLETE LONG-TERM MEMORIES:
${memoryString || '(No memories stored yet)'}

PENDING PROGRESSION RECOMMENDATIONS:
${recommendationsString || '(No pending suggestions)'}

SAFETY ALERT: ${isSafetyTriggered ? 'TRUE - Athlete reported joint pain or potential injury. Follow Safety Rules strictly.' : 'FALSE'}
`;

    // 9. Request structured completion via the shared AI provider service
    //    (OpenAI primary → Gemini fallback → Anthropic optional; with retry, token
    //     usage + cost tracking). Fails loudly if no provider is configured.
    let finalReply = '';
    let memoryUpdates: any[] = [];
    let aiProvider = 'unknown';
    let aiModel = 'unknown';
    let usage = { inputTokens: 0, outputTokens: 0 };
    let costUsd = 0;

    try {
      const result = await generateChat({
        messages: [
          { role: 'system', content: `${sysPromptBase}\n${safetyGuardrails}\n${instructionsPrompt}` },
          { role: 'user', content: truncatedMessage },
        ],
        jsonMode: true,
        temperature: 0.7,
      });
      aiProvider = result.provider;
      aiModel = result.model;
      usage = result.usage;
      costUsd = result.costUsd;

      try {
        const parsed = JSON.parse(result.text);
        finalReply = parsed.reply || '';
        memoryUpdates = parsed.memory_updates || [];
      } catch {
        finalReply = result.text;
      }
    } catch (providerErr: any) {
      // No provider configured → explicit 503 instead of a silent mock fallback.
      if (providerErr instanceof AINotConfiguredError) {
        return new Response(JSON.stringify({
          error: 'AI_PROVIDER_NOT_CONFIGURED',
          message: 'No AI provider is configured. Set GEMINI_API_KEY (primary), OPENAI_API_KEY, or ANTHROPIC_API_KEY.',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 503,
        });
      }
      console.error('[ai-coach] provider error:', providerErr?.message);
      finalReply = "I'm having trouble connecting to my neural net right now. Keep pushing!";
      await supabaseServiceRole.from('ai_request_logs').insert({
        athlete_id: user.id,
        subscription_tier: subscriptionTier,
        success: false,
        error_reason: 'provider_error',
        message_length: truncatedMessage.length,
        coach_type: type || 'workout',
      }).then(() => {}).catch(() => {});
    }

    // 10. Process and save memory updates
    if (memoryUpdates.length > 0) {
      const allowedCategories = ['preferences', 'training goals', 'workout style', 'nutrition preferences', 'equipment preferences', 'injuries'];
      for (const update of memoryUpdates) {
        if (!update.memory_key || !allowedCategories.includes(update.category)) continue;

        if (update.memory_value === "") {
          await supabaseServiceRole
            .from('ai_memory')
            .delete()
            .eq('athlete_id', user.id)
            .eq('memory_key', update.memory_key);
        } else {
          await supabaseServiceRole
            .from('ai_memory')
            .upsert({
              athlete_id: user.id,
              category: update.category,
              memory_key: update.memory_key,
              memory_value: update.memory_value,
              updated_at: new Date().toISOString()
            }, { onConflict: 'athlete_id,memory_key' });
        }
      }
    }

    // 11. Increment usage count AND log the successful request (only when a
    //     provider actually responded — a provider error was already logged above).
    if (aiProvider !== 'unknown') {
      await Promise.all([
        supabaseServiceRole
          .from('ai_usage')
          .upsert({
            athlete_id: user.id,
            date: today,
            requests_count: currentRequests + 1,
            subscription_tier: subscriptionTier,
            last_request_at: new Date().toISOString(),
          }, { onConflict: 'athlete_id,date' }),
        supabaseServiceRole.from('ai_request_logs').insert({
          athlete_id: user.id,
          subscription_tier: subscriptionTier,
          success: true,
          message_length: truncatedMessage.length,
          coach_type: type || 'workout',
          provider: aiProvider,
          model: aiModel,
          input_tokens: usage.inputTokens,
          output_tokens: usage.outputTokens,
          cost_usd: costUsd,
        }),
      ]).catch(() => {}); // Non-blocking — never crash the response for logging failures
    }

    // Return compatibility response containing both reply and response keys
    return new Response(JSON.stringify({ reply: finalReply, response: finalReply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('[ai-coach] error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

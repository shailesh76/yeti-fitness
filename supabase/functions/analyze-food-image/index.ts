import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createAnonClient, createServiceRoleClient } from '../_shared/supabaseClient.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight options request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── 1. Authenticate the caller ──────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createAnonClient(authHeader);

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize service role client to check and log requests securely
    const supabaseServiceRole = createServiceRoleClient();

    // Resolve Entitlements
    const { data: entitlements } = await supabaseServiceRole
      .from('user_entitlements')
      .select('plan, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true);

    const isPremiumPlan = (entitlements || []).some(
      (e: any) => e.plan === 'PRO' || e.plan === 'COACHING'
    );

    // Check Global Beta config
    const { data: betaConfig } = await supabaseServiceRole
      .from('beta_mode_config')
      .select('is_global_beta_active')
      .maybeSingle();
    const isGlobalBeta = betaConfig?.is_global_beta_active ?? false;
    const isPremium = isPremiumPlan || isGlobalBeta;
    const subscriptionTier = isPremiumPlan 
      ? ((entitlements || []).find((e: any) => e.plan === 'COACHING') ? 'COACHING' : 'PRO')
      : 'FREE';

    // Count daily food scans
    const today = new Date().toISOString().split('T')[0];
    const { count: currentScans } = await supabaseServiceRole
      .from('ai_request_logs')
      .select('*', { count: 'exact', head: true })
      .eq('athlete_id', user.id)
      .eq('coach_type', 'nutrition_image')
      .eq('success', true)
      .gte('requested_at', `${today}T00:00:00.000Z`);

    const scanCount = currentScans || 0;

    if (!isPremium && scanCount >= 10) {
      // Log failed scan — does NOT increment count
      await supabaseServiceRole.from('ai_request_logs').insert({
        athlete_id: user.id,
        subscription_tier: subscriptionTier,
        success: false,
        error_reason: 'daily_limit_exceeded',
        coach_type: 'nutrition_image',
      });

      return new Response(JSON.stringify({ 
        error: 'Daily food scan limit reached for free tier (max 10 scans/day). Upgrade to Pro for unlimited scans!' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // ── 2. Parse and validate body ─────────────────────────────────────────
    const { image, description } = await req.json()
    
    if (!image && !description) {
      return new Response(JSON.stringify({ error: "Missing image base64 data or description text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Guard: image must not exceed 5MB base64 (~6.86MB encoded)
    const MAX_IMAGE_BYTES = 7 * 1024 * 1024; // 7MB encoded ceiling
    if (image && image.length > MAX_IMAGE_BYTES) {
      return new Response(JSON.stringify({ error: "Image exceeds maximum allowed size (5MB)" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Guard: description must not exceed 2000 characters
    if (description && description.length > 2000) {
      return new Response(JSON.stringify({ error: "Description exceeds maximum length (2000 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    let cleanImage = "";
    if (image) {
      // Clean base64 payload: strip any data URI prefix (e.g. "data:image/jpeg;base64,")
      cleanImage = image;
      if (cleanImage.includes("base64,")) {
        cleanImage = cleanImage.substring(cleanImage.indexOf("base64,") + 7);
      }
      // Remove any whitespace characters (newlines, carriage returns, spaces)
      cleanImage = cleanImage.replace(/\s/g, "");
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY")
    const openrouterApiKey = Deno.env.get("OPENROUTER_API_KEY")

    let foodItems: any[] = [];
    let success = false;
    let lastError: any = null;

    const prompt = description 
      ? `Analyze this meal description: "${description}". Identify the dishes or ingredients. Return a strict JSON array of items with estimated calories (kcal), protein (grams), carbs (grams), fat (grams), and serving size in grams. Output must be raw JSON array ONLY, no markdown wrappers, no backticks, no comments. Format: [{\"name\":\"Grilled Chicken\",\"calories\":165,\"protein\":31,\"carbs\":0,\"fat\":3.6,\"grams\":100}]`
      : "Analyze this food image. Identify the dishes or ingredients. Return a strict JSON array of items with estimated calories (kcal), protein (grams), carbs (grams), fat (grams), and serving size in grams. Output must be raw JSON array ONLY, no markdown wrappers, no backticks, no comments. Format: [{\"name\":\"Grilled Chicken\",\"calories\":165,\"protein\":31,\"carbs\":0,\"fat\":3.6,\"grams\":100}]";

    // 1. Try Gemini 2.5 Flash
    if (geminiApiKey && !success) {
      try {
        console.log(`Attempting food analysis with Gemini 2.5 Flash (${description ? 'description' : 'image'})...`);
        const parts: any[] = [{ text: prompt }];
        if (image) {
          parts.push({
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanImage
            }
          });
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [
              {
                parts: parts
              }
            ],
            generationConfig: {
              responseMimeType: "application/json"
            }
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Gemini 2.5 Flash returned status ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        const candidate = result.candidates?.[0];
        if (candidate?.finishReason && candidate.finishReason !== "STOP" && candidate.finishReason !== "MAX_TOKENS") {
          throw new Error(`Gemini finished with abnormal reason: ${candidate.finishReason}`);
        }
        
        const content = candidate?.content?.parts?.[0]?.text?.trim() || "[]";
        let cleanText = content;
        if (cleanText.startsWith("```")) {
          cleanText = cleanText
            .replace(/^```json\s*/, "")
            .replace(/^```\s*/, "")
            .replace(/\s*```$/, "");
        }

        foodItems = JSON.parse(cleanText);
        success = true;
        console.log("Gemini 2.5 Flash analysis succeeded.");
      } catch (e) {
        console.error("Gemini 2.5 Flash failed:", e);
        lastError = e;
      }
    }

    // 2. Try Gemini 2.5 Flash Lite Fallback
    // Not gemini-1.5-flash: Google has fully retired that model (confirmed
    // live — the v1beta generateContent endpoint 404s on it now, and it's
    // absent from the current model list). A different model name also
    // matters here beyond just "still exists": Gemini's free-tier quota is
    // keyed per-model (generativelanguage.googleapis.com/generate_content_free_tier_requests,
    // 20 req/day for gemini-2.5-flash) — falling back to another 2.5-flash
    // call would share that same exhausted bucket, so this only helps if
    // the fallback is a genuinely separate model with its own quota.
    if (geminiApiKey && !success) {
      try {
        console.log(`Attempting fallback with Gemini 2.5 Flash Lite (${description ? 'description' : 'image'})...`);
        const parts: any[] = [{ text: prompt }];
        if (image) {
          parts.push({
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanImage
            }
          });
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [
              {
                parts: parts
              }
            ],
            generationConfig: {
              responseMimeType: "application/json"
            }
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Gemini 2.5 Flash Lite returned status ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        const candidate = result.candidates?.[0];
        if (candidate?.finishReason && candidate.finishReason !== "STOP" && candidate.finishReason !== "MAX_TOKENS") {
          throw new Error(`Gemini 2.5 Flash Lite finished with abnormal reason: ${candidate.finishReason}`);
        }

        const content = candidate?.content?.parts?.[0]?.text?.trim() || "[]";
        let cleanText = content;
        if (cleanText.startsWith("```")) {
          cleanText = cleanText
            .replace(/^```json\s*/, "")
            .replace(/^```\s*/, "")
            .replace(/\s*```$/, "");
        }

        foodItems = JSON.parse(cleanText);
        success = true;
        console.log("Gemini 2.5 Flash Lite analysis succeeded.");
      } catch (e) {
        console.error("Gemini 2.5 Flash Lite failed:", e);
        lastError = e;
      }
    }

    // 3. Try OpenRouter's free Gemini 2.0 Flash Lite routing — a genuinely
    // separate quota pool from both attempts above (different vendor
    // account entirely, not just a different Google model), for when both
    // of Google's own free-tier buckets are exhausted for the day.
    // OpenRouter's chat/completions endpoint is intentionally OpenAI-request-
    // compatible, so this reuses the same content-array/image_url shape
    // OpenAI used before. Optional: skipped entirely (falls through to the
    // honest failure below) until OPENROUTER_API_KEY is configured — free to
    // create at https://openrouter.ai/keys, no card required for :free models.
    if (openrouterApiKey && !success) {
      try {
        console.log(`Attempting fallback with OpenRouter (Gemini 2.0 Flash Lite, free) (${description ? 'description' : 'image'})...`);
        const openrouterContent: any[] = [{ type: "text", text: prompt }];
        if (image) {
          openrouterContent.push({
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${cleanImage}`
            }
          });
        }

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openrouterApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "google/gemini-2.0-flash-lite-001:free",
            messages: [
              {
                role: "user",
                content: openrouterContent
              }
            ],
            temperature: 0.2
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenRouter returned status ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        const content = result.choices?.[0]?.message?.content?.trim() || "[]";
        let cleanText = content;
        if (cleanText.startsWith("```")) {
          cleanText = cleanText
            .replace(/^```json\s*/, "")
            .replace(/^```\s*/, "")
            .replace(/\s*```$/, "");
        }

        foodItems = JSON.parse(cleanText);
        success = true;
        console.log("OpenRouter (Gemini 2.0 Flash Lite) analysis succeeded.");
      } catch (e) {
        console.error("OpenRouter fallback failed:", e);
        lastError = e;
      }
    }

    // No paid fallback by design: this project runs on free-tier providers
    // only (see AGENTS.md's free-tier-first rule for the shared AI service —
    // the same intent applies here even though this function predates that
    // service). All three attempts above use separate quota pools (two
    // Google models + one separate OpenRouter account); if all are exhausted
    // or erroring, fail honestly instead of chaining into a paid provider.
    if (!success) {
      const isQuotaExhaustion = lastError?.message?.includes('429') || lastError?.message?.includes('RESOURCE_EXHAUSTED');
      throw new Error(
        isQuotaExhaustion
          ? "AI photo analysis has hit its free daily limit. Please try again later, or log this meal manually for now."
          : (lastError?.message || "AI photo analysis is temporarily unavailable. Please try again shortly.")
      );
    }

    // Log successful scan
    await supabaseServiceRole.from('ai_request_logs').insert({
      athlete_id: user.id,
      subscription_tier: subscriptionTier,
      success: true,
      coach_type: 'nutrition_image',
    });

    return new Response(JSON.stringify(foodItems), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (error) {
    console.error("Error in analyze-food-image:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})

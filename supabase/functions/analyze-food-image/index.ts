import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const { image, description } = await req.json()
    
    if (!image && !description) {
      return new Response(JSON.stringify({ error: "Missing image base64 data or description text" }), {
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
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY")

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

    // 2. Try Gemini 1.5 Flash Fallback
    if (geminiApiKey && !success) {
      try {
        console.log(`Attempting fallback with Gemini 1.5 Flash (${description ? 'description' : 'image'})...`);
        const parts: any[] = [{ text: prompt }];
        if (image) {
          parts.push({
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanImage
            }
          });
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
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
          throw new Error(`Gemini 1.5 Flash returned status ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        const candidate = result.candidates?.[0];
        if (candidate?.finishReason && candidate.finishReason !== "STOP" && candidate.finishReason !== "MAX_TOKENS") {
          throw new Error(`Gemini 1.5 finished with abnormal reason: ${candidate.finishReason}`);
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
        console.log("Gemini 1.5 Flash analysis succeeded.");
      } catch (e) {
        console.error("Gemini 1.5 Flash failed:", e);
        lastError = e;
      }
    }

    // 3. Try OpenAI GPT-4o Fallback
    if (openaiApiKey && !success) {
      try {
        console.log(`Attempting fallback with OpenAI GPT-4o (${description ? 'description' : 'image'})...`);
        const openaiContent: any[] = [{ type: "text", text: prompt }];
        if (image) {
          openaiContent.push({
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${cleanImage}`
            }
          });
        }

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openaiApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              {
                role: "user",
                content: openaiContent
              }
            ],
            max_tokens: 1000,
            temperature: 0.2
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenAI API returned status ${response.status}: ${errorText}`);
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
        console.log("OpenAI GPT-4o analysis succeeded.");
      } catch (e) {
        console.error("OpenAI GPT-4o failed:", e);
        lastError = e;
      }
    }

    if (!success) {
      throw new Error(lastError?.message || "Neither Gemini nor OpenAI models could successfully analyze the food.");
    }

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

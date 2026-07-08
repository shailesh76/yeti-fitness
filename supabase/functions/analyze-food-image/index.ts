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
    const { image } = await req.json()
    
    if (!image) {
      return new Response(JSON.stringify({ error: "Missing image base64 data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Clean base64 payload: strip any data URI prefix (e.g. "data:image/jpeg;base64,")
    let cleanImage = image;
    if (cleanImage.includes("base64,")) {
      cleanImage = cleanImage.substring(cleanImage.indexOf("base64,") + 7);
    }
    // Remove any whitespace characters (newlines, carriage returns, spaces)
    cleanImage = cleanImage.replace(/\s/g, "");

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY")
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY")

    let foodItems: any[] = []

    if (geminiApiKey) {
      // Use Gemini Vision API (2.5 Flash has native JSON formatting and is highly accurate)
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: "Analyze this food image. Identify the dishes or ingredients. Return a strict JSON array of items with estimated calories (kcal), protein (grams), carbs (grams), fat (grams), and serving size in grams. Output must be raw JSON array ONLY, no markdown wrappers, no backticks, no comments. Format: [{\"name\":\"Grilled Chicken\",\"calories\":165,\"protein\":31,\"carbs\":0,\"fat\":3.6,\"grams\":100}]"
                },
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: cleanImage
                  }
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      })

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API returned error: ${errorText}`);
      }

      const result = await response.json()
      const content = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "[]"
      foodItems = JSON.parse(content)
    } else if (openaiApiKey) {
      // Use OpenAI GPT-4o Vision API
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
              content: [
                {
                  type: "text",
                  text: "Analyze this food image. Identify the dishes or ingredients. Return a strict JSON array of items with estimated calories (kcal), protein (grams), carbs (grams), fat (grams), and serving size in grams. Output must be raw JSON array ONLY, no markdown wrappers, no backticks, no comments. Format: [{\"name\":\"Grilled Chicken\",\"calories\":165,\"protein\":31,\"carbs\":0,\"fat\":3.6,\"grams\":100}]"
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${cleanImage}`
                  }
                }
              ]
            }
          ],
          max_tokens: 1000,
          temperature: 0.2
        })
      })

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API returned error: ${errorText}`);
      }

      const result = await response.json()
      const content = result.choices?.[0]?.message?.content?.trim() || "[]"
      let cleanText = content;
      if (cleanText.startsWith("```")) {
        cleanText = cleanText
          .replace(/^```json\s*/, "")
          .replace(/^```\s*/, "")
          .replace(/\s*```$/, "");
      }
      foodItems = JSON.parse(cleanText)
    } else {
      return new Response(JSON.stringify({ error: "Neither GEMINI_API_KEY nor OPENAI_API_KEY is configured in Supabase environment." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
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

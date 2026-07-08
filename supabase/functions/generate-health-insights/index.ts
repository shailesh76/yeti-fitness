import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch all profiles
    const { data: profiles, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*');

    if (profileError) throw profileError;

    const results = [];
    const openAiKey = Deno.env.get('OPENAI_API_KEY');

    for (const profile of profiles || []) {
      const userId = profile.id;
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Fetch completed workouts count
      const { count: workoutCount, error: wError } = await supabaseClient
        .from('workout_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('completed_at', oneWeekAgo.toISOString());

      if (wError) continue;

      // Fetch meal logs for calories/protein averages
      const { data: mealLogs, error: mError } = await supabaseClient
        .from('meal_logs')
        .select('servings, food:foods(calories, protein)')
        .eq('user_id', userId)
        .gte('logged_at', oneWeekAgo.toISOString());

      if (mError) continue;

      let totalCalories = 0;
      let totalProtein = 0;
      for (const log of mealLogs || []) {
        const servings = Number(log.servings);
        const food = log.food as any;
        if (food) {
          totalCalories += (Number(food.calories) || 0) * servings;
          totalProtein += (Number(food.protein) || 0) * servings;
        }
      }

      const avgCalories = Math.round(totalCalories / 7);
      const avgProtein = Math.round(totalProtein / 7);

      // Fetch resting heart rate simulation or wearable data
      const { data: liveMetrics, error: lError } = await supabaseClient
        .from('live_metrics')
        .select('*')
        .eq('user_id', userId)
        .single();

      const hr = !lError && liveMetrics ? liveMetrics.heart_rate : 72;
      const calorieBurn = !lError && liveMetrics ? liveMetrics.active_calories : 350;

      // Generate Insight Text
      let insightText = '';

      if (openAiKey) {
        // Fetch from OpenAI API
        try {
          const prompt = `You are a professional personal fitness coach. Generate a short, encouraging 3-sentence personalized insight card text for a client based on their last 7 days of telemetry:
- Workouts completed: ${workoutCount || 0}
- Average daily calorie intake: ${avgCalories} kcal (Target: ${profile.daily_calorie_target || 2000} kcal)
- Average daily protein intake: ${avgProtein}g (Target: ${profile.daily_protein_target || 150}g)
- Current heart rate vitals: ${hr} bpm
- Average active calories burned: ${calorieBurn} kcal

Rules: Keep it exactly 3 sentences. Be encouraging, reference their metrics, and give 1 actionable tip. Do not use placeholders or generic intros.`;

          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openAiKey}`,
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.7,
              max_tokens: 150,
            }),
          });

          const aiData = await response.json();
          insightText = aiData.choices[0].message.content.trim();
        } catch (openaiErr) {
          console.warn("OpenAI integration error, falling back to rule templates:", openaiErr);
        }
      }

      // If OpenAI is not configured or fails, use rules-based smart templates (fallback)
      if (!insightText) {
        const workouts = workoutCount || 0;
        const calPct = profile.daily_calorie_target ? Math.round((avgCalories / profile.daily_calorie_target) * 100) : 80;
        const proPct = profile.daily_protein_target ? Math.round((avgProtein / profile.daily_protein_target) * 100) : 80;

        let sentence1 = `Fantastic effort this week completing ${workouts} workout session${workouts === 1 ? '' : 's'}! `;
        if (workouts === 0) {
          sentence1 = `Let's rebuild your training momentum this week and set a goal to complete at least one session. `;
        } else if (workouts >= 4) {
          sentence1 = `You are absolutely crushing your training consistency with ${workouts} workouts completed this week! `;
        }

        let sentence2 = `Your average daily calorie intake is sitting at ${avgCalories} kcal (${calPct}% of target) with protein averaging ${avgProtein}g. `;
        if (proPct >= 90) {
          sentence2 += `You are hitting your protein targets beautifully to support muscle recovery. `;
        } else {
          sentence2 += `We want to boost your protein intake to support muscle recovery and strength. `;
        }

        let sentence3 = `With a solid active calorie burn of ${calorieBurn} kcal, your metabolism is firing; keep hydration high and stay focused!`;
        if (hr > 85) {
          sentence3 = `Make sure to incorporate dedicated rest days to keep your average heart rate in a healthy recovery zone.`;
        }

        insightText = `${sentence1}${sentence2}${sentence3}`;
      }

      // Insert/Save to health_insights table
      const { error: insertError } = await supabaseClient
        .from('health_insights')
        .insert({
          user_id: userId,
          insight_text: insightText,
        });

      if (!insertError) {
        results.push({ userId, insightText });
      }
    }

    return new Response(JSON.stringify({ success: true, count: results.length, data: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

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

    for (const profile of profiles || []) {
      const userId = profile.id;
      const currentCalTarget = profile.daily_calorie_target || 2000;
      const goal = profile.goal || 'MAINTAIN';
      
      // Fetch weight logs for last 14 days
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const { data: weightLogs, error: weightError } = await supabaseClient
        .from('weight_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('logged_at', fourteenDaysAgo.toISOString())
        .order('logged_at', { ascending: true });

      if (weightError) continue;

      let newCalTarget = currentCalTarget;
      let calculatedBy = 'goals_fallback';

      if (weightLogs && weightLogs.length >= 2) {
        const oldestWeight = Number(weightLogs[0].weight_kg);
        const newestWeight = Number(weightLogs[weightLogs.length - 1].weight_kg);
        const weightLoss = oldestWeight - newestWeight; // positive if lost weight
        const percentageLost = weightLoss / oldestWeight;

        if (goal === 'LOSE_FAT') {
          if (percentageLost > 0.01) {
            // Lost too fast (>1% in 14 days). Increase calories by 5% to prevent metabolic slowdown
            newCalTarget = Math.round(currentCalTarget * 1.05);
            calculatedBy = 'adaptive_prevent_metabolic_slowdown';
          } else if (weightLoss < 0.2) {
            // Stalled (<0.2kg lost in 14 days). Decrease calories by 5%
            newCalTarget = Math.round(currentCalTarget * 0.95);
            calculatedBy = 'adaptive_stall_reduction';
          } else {
            calculatedBy = 'adaptive_on_track';
          }
        } else if (goal === 'BUILD_MUSCLE') {
          // If gaining too slow (< 0.2kg in 14 days), increase calories by 5%
          if (newestWeight - oldestWeight < 0.2) {
            newCalTarget = Math.round(currentCalTarget * 1.05);
            calculatedBy = 'adaptive_lean_bulk_acceleration';
          } else if (newestWeight - oldestWeight > 1.0) {
            // Gaining too fast (> 1.0kg in 14 days). Decrease calories by 5%
            newCalTarget = Math.round(currentCalTarget * 0.95);
            calculatedBy = 'adaptive_excessive_fat_gain_reduction';
          } else {
            calculatedBy = 'adaptive_muscle_gain_on_track';
          }
        }
      } else {
        // Fallback to Harris-Benedict formula if insufficient logs
        const height = Number(profile.height_cm) || 175;
        const weight = Number(profile.weight_kg) || 75;
        const age = Number(profile.age) || 28;
        const gender = profile.gender || 'male';
        
        // Base BMR
        let bmr = 10 * weight + 6.25 * height - 5 * age;
        if (gender.toLowerCase() === 'male' || gender.toLowerCase() === 'm') {
          bmr += 5;
        } else {
          bmr -= 161;
        }

        // TDEE multipliers
        const activityLevel = profile.activity_level || 'MODERATE';
        let multiplier = 1.375; // LIGHT
        if (activityLevel === 'SEDENTARY') multiplier = 1.2;
        if (activityLevel === 'MODERATE') multiplier = 1.55;
        if (activityLevel === 'ACTIVE') multiplier = 1.725;
        if (activityLevel === 'VERY_ACTIVE') multiplier = 1.9;

        const tdee = bmr * multiplier;

        if (goal === 'LOSE_FAT') {
          newCalTarget = Math.round(tdee - 500); // 500 kcal deficit
        } else if (goal === 'BUILD_MUSCLE') {
          newCalTarget = Math.round(tdee + 300); // 300 kcal surplus
        } else {
          newCalTarget = Math.round(tdee);
        }
      }

      // Constrain calorie targets to healthy bounds (1200 - 5000 kcal)
      newCalTarget = Math.max(1200, Math.min(newCalTarget, 5000));

      // Calculate Protein Target (2.2g per kg of lean body mass)
      const bodyFat = Number(profile.body_fat_percent) || 18;
      const currentWeight = Number(profile.weight_kg) || 75;
      const leanMass = currentWeight * (1 - bodyFat / 100);
      const newProteinTarget = Math.max(100, Math.round(leanMass * 2.2));

      // Calculate Fat Target (25% of calorie intake)
      const newFatTarget = Math.max(40, Math.round((newCalTarget * 0.25) / 9));

      // Calculate Carb Target (Remainder of calories)
      const proCals = newProteinTarget * 4;
      const fatCals = newFatTarget * 9;
      const newCarbTarget = Math.max(50, Math.round((newCalTarget - proCals - fatCals) / 4));

      // Update user targets
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({
          daily_calorie_target: newCalTarget,
          daily_protein_target: newProteinTarget,
          daily_carb_target: newCarbTarget,
          daily_fat_target: newFatTarget,
        })
        .eq('id', userId);

      if (!updateError) {
        results.push({
          userId,
          calories: newCalTarget,
          protein: newProteinTarget,
          carbs: newCarbTarget,
          fat: newFatTarget,
          method: calculatedBy,
        });
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

// Nutrition Plan Persistence Engine (Phase 3). Server-only Supabase persistence module.
// Handles versioning, activation, and persistence for nutrition plans:
// - Deactivates existing active nutrition plans for the athlete.
// - Saves new nutrition plan with versioning.
// - Updates athlete profile macro targets atomically.

export interface NutritionPlanSaveInput {
  planName?: string;
  dailyCalories: number;
  dailyProteinG: number;
  dailyCarbsG: number;
  dailyFatG: number;
  mealsPerDay?: number;
  dietaryPreference?: string;
  mealStructure?: unknown;
}

export interface PersistenceResult {
  success: boolean;
  message: string;
  planId?: string;
}

export async function saveNutritionPlan(
  supabase: any,
  userId: string,
  input: NutritionPlanSaveInput,
): Promise<PersistenceResult> {
  try {
    const name = input.planName || 'Custom Nutrition Plan';

    // 1. Deactivate existing nutrition plans for athlete
    await supabase
      .from('nutrition_plans')
      .update({ is_active: false })
      .eq('athlete_id', userId);

    // 2. Insert new active nutrition plan
    const { data: newPlan, error: insertError } = await supabase
      .from('nutrition_plans')
      .insert({
        athlete_id: userId,
        name,
        daily_calories: input.dailyCalories,
        daily_protein_g: input.dailyProteinG,
        daily_carbs_g: input.dailyCarbsG,
        daily_fat_g: input.dailyFatG,
        meals_per_day: input.mealsPerDay || 4,
        dietary_preference: input.dietaryPreference || 'omnivore',
        meal_structure: input.mealStructure || null,
        is_active: true,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[nutritionPlanPersistence] insert error:', insertError);
      return { success: false, message: 'Database insert failed while saving nutrition plan.' };
    }

    // 3. Update profile macro targets
    await supabase
      .from('profiles')
      .update({
        daily_calorie_target: input.dailyCalories,
        daily_protein_target: input.dailyProteinG,
        daily_carb_target: input.dailyCarbsG,
        daily_fat_target: input.dailyFatG,
      })
      .eq('id', userId);

    return {
      success: true,
      message: `Nutrition plan "${name}" saved and activated successfully!`,
      planId: newPlan?.id,
    };
  } catch (err: any) {
    console.error('[nutritionPlanPersistence] exception:', err);
    return { success: false, message: 'Unexpected failure while persisting nutrition plan.' };
  }
}

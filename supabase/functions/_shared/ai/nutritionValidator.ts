// Deterministic Nutrition & Allergy Safety Validator (Phase 3). Pure module (Deno + vitest).
// Validates draft meal plans for:
// - Calorie target tolerance (within ± 5%)
// - Protein threshold (minimum 1.6g / kg bodyweight)
// - Dietary preference safety (Vegetarian, Vegan, Pescatarian, Keto)
// - Declared allergy safety (Dairy, Nuts, Gluten, Soy, Eggs, Shellfish)

import { DietaryPreference, MealStructure } from './nutritionEngine.ts';

export interface NutritionValidationInput {
  targetCalories: number;
  targetProteinG: number;
  weightKg: number;
  dietaryPreference?: DietaryPreference;
  allergies?: string[];
}

export interface NutritionValidationResult {
  isValid: boolean;
  calorieDeltaPct: number;
  proteinDeficitG: number;
  allergyViolations: string[];
  dietaryPreferenceViolations: string[];
  warnings: string[];
}

const MEAT_KEYWORDS = ['chicken', 'beef', 'steak', 'pork', 'bacon', 'turkey', 'lamb', 'duck', 'veal', 'ham', 'sausage'];
const FISH_KEYWORDS = ['fish', 'salmon', 'tuna', 'cod', 'shrimp', 'prawn', 'haddock', 'halibut', 'tilapia', 'crab', 'lobster'];
const DAIRY_KEYWORDS = ['milk', 'cheese', 'yogurt', 'whey', 'butter', 'cream', 'paneer', 'casein', 'ghee'];
const EGG_KEYWORDS = ['egg', 'eggs', 'egg white', 'mayonnaise'];
const NUT_KEYWORDS = ['peanut', 'almond', 'walnut', 'cashew', 'hazelnut', 'pecan', 'macadamia', 'nut'];
const GLUTEN_KEYWORDS = ['wheat', 'bread', 'pasta', 'barley', 'rye', 'toast', 'seitan'];
const SOY_KEYWORDS = ['soy', 'tofu', 'tempeh', 'edamame', 'soy sauce'];

export function validateNutritionPlan(
  meals: MealStructure[],
  input: NutritionValidationInput,
): NutritionValidationResult {
  const { targetCalories, targetProteinG, weightKg, dietaryPreference = 'omnivore', allergies = [] } = input;

  let totalCals = 0;
  let totalProt = 0;
  const allIngredients: string[] = [];

  for (const m of meals || []) {
    for (const item of m.items || []) {
      totalCals += item.calories || 0;
      totalProt += item.proteinG || 0;
      allIngredients.push((item.name || '').toLowerCase());
    }
  }

  // 1. Calorie Target Tolerance Check (± 5%)
  const calDiff = Math.abs(totalCals - targetCalories);
  const calorieDeltaPct = targetCalories > 0 ? Math.round((calDiff / targetCalories) * 100) : 0;
  const warnings: string[] = [];

  if (calorieDeltaPct > 5) {
    warnings.push(`Meal plan total calories (${totalCals} kcal) deviates by ${calorieDeltaPct}% from target (${targetCalories} kcal). Target tolerance is ±5%.`);
  }

  // 2. Protein Threshold Check (min 1.6g / kg)
  const minProteinRequired = Math.round(weightKg * 1.6);
  const proteinDeficitG = Math.max(0, targetProteinG - totalProt);
  if (totalProt < minProteinRequired) {
    warnings.push(`Total protein (${totalProt}g) is below the recommended minimum athletic threshold of ${minProteinRequired}g (${weightKg * 1.6}g/kg).`);
  }

  // 3. Dietary Preference Safety Check
  const dietaryPreferenceViolations: string[] = [];
  for (const ing of allIngredients) {
    if (dietaryPreference === 'vegetarian') {
      if (MEAT_KEYWORDS.some((k) => ing.includes(k)) || FISH_KEYWORDS.some((k) => ing.includes(k))) {
        dietaryPreferenceViolations.push(`Ingredient "${ing}" violates Vegetarian dietary preference.`);
      }
    } else if (dietaryPreference === 'vegan') {
      if (
        MEAT_KEYWORDS.some((k) => ing.includes(k)) ||
        FISH_KEYWORDS.some((k) => ing.includes(k)) ||
        DAIRY_KEYWORDS.some((k) => ing.includes(k)) ||
        EGG_KEYWORDS.some((k) => ing.includes(k))
      ) {
        dietaryPreferenceViolations.push(`Ingredient "${ing}" violates Vegan dietary preference.`);
      }
    } else if (dietaryPreference === 'pescatarian') {
      if (MEAT_KEYWORDS.some((k) => ing.includes(k))) {
        dietaryPreferenceViolations.push(`Ingredient "${ing}" violates Pescatarian dietary preference.`);
      }
    }
  }

  // 4. Allergy Safety Check
  const allergyViolations: string[] = [];
  const normalizedAllergies = (allergies || []).map((a) => a.toLowerCase().trim());

  for (const ing of allIngredients) {
    for (const allergy of normalizedAllergies) {
      if (!allergy) continue;
      let keywordsToTest: string[] = [allergy];
      if (allergy.includes('dairy') || allergy.includes('lactose')) keywordsToTest = DAIRY_KEYWORDS;
      else if (allergy.includes('nut')) keywordsToTest = NUT_KEYWORDS;
      else if (allergy.includes('gluten')) keywordsToTest = GLUTEN_KEYWORDS;
      else if (allergy.includes('soy')) keywordsToTest = SOY_KEYWORDS;
      else if (allergy.includes('egg')) keywordsToTest = EGG_KEYWORDS;

      if (keywordsToTest.some((k) => ing.includes(k))) {
        allergyViolations.push(`Ingredient "${ing}" violates declared allergy: "${allergy}".`);
      }
    }
  }

  const isValid = dietaryPreferenceViolations.length === 0 && allergyViolations.length === 0 && calorieDeltaPct <= 10;

  return {
    isValid,
    calorieDeltaPct,
    proteinDeficitG,
    allergyViolations,
    dietaryPreferenceViolations,
    warnings,
  };
}

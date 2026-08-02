// Deterministic Raw Nutrition Engine (Phase 3). Pure module (Deno + vitest).
// Calculates BMR/TDEE, daily macro cycling, periodization phases, budget-aware food pools,
// equal-macro meal substitutions, grocery lists, dining out advice, and supplement guidance.

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type DietaryPreference = 'omnivore' | 'vegetarian' | 'vegan' | 'pescatarian' | 'keto';
export type NutritionGoal = 'muscle_gain' | 'fat_loss' | 'recomp' | 'maintenance';
export type BudgetLevel = 'low' | 'moderate' | 'high';
export type PeriodizationPhase = 'lean_bulk' | 'mini_cut' | 'diet_break' | 'fat_loss' | 'maintenance';

export interface NutritionEngineInput {
  weightKg: number;
  heightCm?: number;
  age?: number;
  gender?: 'male' | 'female' | string;
  activityLevel?: ActivityLevel;
  goal?: NutritionGoal;
  periodizationPhase?: PeriodizationPhase;
  dietaryPreference?: DietaryPreference;
  allergies?: string[];
  budget?: BudgetLevel;
  mealsPerDay?: number;
  likedFoods?: string[];
  dislikedFoods?: string[];
}

export interface MacroSplit {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface MealItem {
  name: string;
  amountG: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  category: 'protein' | 'carbs' | 'fats' | 'veggies' | 'fruit' | 'snack';
}

export interface MealStructure {
  name: string;
  isPreWorkout?: boolean;
  targetCalories: number;
  items: MealItem[];
}

export interface EqualMacroSubstitution {
  originalFood: string;
  substitutions: {
    foodName: string;
    amountG: number;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    matchNote: string;
  }[];
}

export interface GroceryList {
  proteins: string[];
  carbohydrates: string[];
  fruits: string[];
  vegetables: string[];
  healthyFats: string[];
  snacks: string[];
}

export interface RawNutritionResult {
  baseTdee: number;
  dailyTargetCalories: number;
  trainingDayMacros: MacroSplit;
  restDayMacros: MacroSplit;
  currentPhase: PeriodizationPhase;
  meals: MealStructure[];
  groceryList: GroceryList;
}

/** Computes BMR using Mifflin-St Jeor equation */
export function calculateBmr(weightKg: number, heightCm = 175, age = 28, gender = 'male'): number {
  let bmr = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if ((gender || '').toLowerCase().startsWith('m')) bmr += 5;
  else bmr -= 161;
  return Math.round(bmr);
}

/** Activity Multiplier */
export function getActivityMultiplier(level: ActivityLevel = 'moderate'): number {
  switch (level) {
    case 'sedentary': return 1.2;
    case 'light': return 1.375;
    case 'moderate': return 1.55;
    case 'active': return 1.725;
    case 'very_active': return 1.9;
    default: return 1.55;
  }
}

/** Computes base daily calorie target and periodization phase adjustments */
export function computeCalorieTargets(input: NutritionEngineInput): { baseTdee: number; dailyCalories: number; phase: PeriodizationPhase } {
  const bmr = calculateBmr(input.weightKg, input.heightCm, input.age, input.gender);
  const mult = getActivityMultiplier(input.activityLevel);
  const baseTdee = Math.round(bmr * mult);

  const goal = input.goal || 'maintenance';
  let phase: PeriodizationPhase = input.periodizationPhase || 'maintenance';

  if (!input.periodizationPhase) {
    if (goal === 'muscle_gain') phase = 'lean_bulk';
    else if (goal === 'fat_loss') phase = 'fat_loss';
    else phase = 'maintenance';
  }

  let delta = 0;
  if (phase === 'lean_bulk') delta = 250;
  else if (phase === 'mini_cut') delta = -400;
  else if (phase === 'fat_loss') delta = -500;
  else if (phase === 'diet_break') delta = 0;

  const dailyCalories = Math.max(1200, Math.min(5000, baseTdee + delta));

  return { baseTdee, dailyCalories, phase };
}

/** Computes training-day vs rest-day macro splits */
export function computeMacroCycling(dailyCalories: number, weightKg: number): { trainingDay: MacroSplit; restDay: MacroSplit } {
  // Protein: 2.2g per kg bodyweight
  const proteinG = Math.round(Math.max(100, weightKg * 2.2));
  const proteinCals = proteinG * 4;

  // Training day: 55% remaining cals to carbs, 45% to fats
  const remainingCalsTraining = Math.max(400, dailyCalories - proteinCals);
  const trainingCarbsG = Math.round((remainingCalsTraining * 0.60) / 4);
  const trainingFatG = Math.round((remainingCalsTraining * 0.40) / 9);

  // Rest day: Lower calories (-10%), lower carbs, higher fat
  const restCalories = Math.round(dailyCalories * 0.90);
  const remainingCalsRest = Math.max(400, restCalories - proteinCals);
  const restCarbsG = Math.round((remainingCalsRest * 0.40) / 4);
  const restFatG = Math.round((remainingCalsRest * 0.60) / 9);

  return {
    trainingDay: { calories: dailyCalories, proteinG, carbsG: trainingCarbsG, fatG: trainingFatG },
    restDay: { calories: restCalories, proteinG, carbsG: restCarbsG, fatG: restFatG },
  };
}

/** Equal-macro substitution engine for food swaps */
export function getEqualMacroSubstitutions(foodName: string, originalAmountG = 100): EqualMacroSubstitution {
  const norm = (foodName || '').toLowerCase();
  const result: EqualMacroSubstitution = { originalFood: foodName, substitutions: [] };

  if (norm.includes('tofu')) {
    result.substitutions.push(
      { foodName: 'Paneer', amountG: Math.round(originalAmountG * 0.9), calories: 265, proteinG: 18, carbsG: 3, fatG: 20, matchNote: 'Higher fat vegetarian protein swap' },
      { foodName: 'Greek Yogurt (0% Fat)', amountG: Math.round(originalAmountG * 1.5), calories: 150, proteinG: 22, carbsG: 6, fatG: 0, matchNote: 'High protein lean dairy swap' },
      { foodName: 'Tempeh', amountG: Math.round(originalAmountG * 0.9), calories: 190, proteinG: 20, carbsG: 9, fatG: 11, matchNote: 'High fiber plant protein swap' },
    );
  } else if (norm.includes('oats') || norm.includes('oatmeal')) {
    result.substitutions.push(
      { foodName: 'Cream of Rice', amountG: originalAmountG, calories: 220, proteinG: 4, carbsG: 48, fatG: 0.5, matchNote: 'Fast-digesting carb swap' },
      { foodName: 'Wholegrain Toast', amountG: 70, calories: 180, proteinG: 7, carbsG: 34, fatG: 2, matchNote: 'Convenient carb swap' },
      { foodName: 'Quinoa (cooked)', amountG: 150, calories: 180, proteinG: 6, carbsG: 32, fatG: 3, matchNote: 'Complete protein grain swap' },
    );
  } else if (norm.includes('chicken') || norm.includes('chicken breast')) {
    result.substitutions.push(
      { foodName: 'Turkey Breast', amountG: originalAmountG, calories: 135, proteinG: 30, carbsG: 0, fatG: 1, matchNote: 'Direct ultra-lean protein swap' },
      { foodName: 'White Fish (Cod/Haddock)', amountG: Math.round(originalAmountG * 1.2), calories: 120, proteinG: 26, carbsG: 0, fatG: 1, matchNote: 'Fast-digesting white fish swap' },
      { foodName: 'Tofu (Extra Firm)', amountG: Math.round(originalAmountG * 1.4), calories: 140, proteinG: 17, carbsG: 3, fatG: 8, matchNote: 'Plant-based protein swap' },
    );
  } else {
    result.substitutions.push(
      { foodName: 'Eggs (Whole)', amountG: 120, calories: 180, proteinG: 13, carbsG: 1, fatG: 12, matchNote: 'Whole food protein & fat swap' },
      { foodName: 'Cottage Cheese', amountG: 150, calories: 140, proteinG: 18, carbsG: 5, fatG: 4, matchNote: 'Lean casein protein swap' },
    );
  }

  return result;
}

/** Generates budget-aware grocery list */
export function generateGroceryList(preference: DietaryPreference = 'omnivore', budget: BudgetLevel = 'moderate'): GroceryList {
  const isVeg = preference === 'vegetarian' || preference === 'vegan';
  const isVegan = preference === 'vegan';

  const list: GroceryList = {
    proteins: [],
    carbohydrates: ['Oats / Cream of Rice', 'Brown Rice / Basmati Rice', 'Sweet Potatoes', 'Bananas'],
    fruits: ['Apples', 'Bananas', 'Frozen Berries'],
    vegetables: ['Spinach / Kale', 'Broccoli', 'Bell Peppers', 'Carrots'],
    healthyFats: ['Peanut Butter', 'Olive Oil', 'Almonds'],
    snacks: ['Rice Cakes', 'Dark Chocolate (70%+)'],
  };

  if (budget === 'low') {
    list.proteins = isVegan
      ? ['Tofu', 'Lentils', 'Black Beans', 'Peanuts', 'Chickpeas']
      : isVeg
        ? ['Eggs', 'Paneer', 'Tofu', 'Greek Yogurt', 'Lentils']
        : ['Eggs', 'Canned Tuna', 'Chicken Thighs', 'Greek Yogurt', 'Lentils'];
  } else if (budget === 'high') {
    list.proteins = isVegan
      ? ['Organic Tofu', 'Tempeh', 'Plant Protein Isolate', 'Edamame', 'Hemp Seeds']
      : isVeg
        ? ['Organic Eggs', 'Greek Yogurt (0%)', 'Paneer', 'Halloumi', 'Plant Protein']
        : ['Salmon Fillets', 'Grass-fed Lean Beef', 'Chicken Breast', 'Egg Whites', 'Greek Yogurt'];
    list.fruits.push('Fresh Blueberries', 'Avocados');
    list.healthyFats.push('Walnuts', 'Extra Virgin Olive Oil');
  } else {
    list.proteins = isVegan
      ? ['Tofu', 'Tempeh', 'Lentils', 'Chickpeas']
      : isVeg
        ? ['Eggs', 'Greek Yogurt', 'Paneer', 'Tofu', 'Cottage Cheese']
        : ['Chicken Breast', 'Lean Ground Turkey', 'Eggs', 'Canned Tuna', 'Greek Yogurt'];
  }

  return list;
}

/** Evidence-Based Supplement Advice */
export interface SupplementGuidance {
  name: string;
  dosage: string;
  timing: string;
  evidenceSummary: string;
}

export function getSupplementAdvice(query?: string): SupplementGuidance[] {
  const norm = (query || '').toLowerCase();
  const all: SupplementGuidance[] = [
    { name: 'Creatine Monohydrate', dosage: '5g daily', timing: 'Any time (consistency matters most)', evidenceSummary: 'Increases intramuscular phosphocreatine stores, boosting maximal strength, power output, and muscle volume.' },
    { name: 'Whey / Plant Protein Isolate', dosage: '25-30g per serving', timing: 'Post-workout or between meals', evidenceSummary: 'Convenient high-quality protein source to meet daily amino acid requirements.' },
    { name: 'Caffeine', dosage: '3-6 mg/kg bodyweight', timing: '30-45 minutes pre-workout', evidenceSummary: 'Enhances alertness, reduces rate of perceived exertion (RPE), and improves muscular endurance.' },
    { name: 'Vitamin D3', dosage: '2000-5000 IU daily', timing: 'Morning with fat-containing meal', evidenceSummary: 'Supports bone health, immune function, and optimal natural hormone production.' },
    { name: 'Omega-3 Fish Oil', dosage: '1000-2000 mg EPA/DHA daily', timing: 'With meals', evidenceSummary: 'Reduces systemic inflammation, supports joint health and cardiovascular wellness.' },
    { name: 'Electrolytes (Sodium/Potassium)', dosage: '500mg Sodium pre-workout', timing: 'Intra-workout or intense sessions > 60m', evidenceSummary: 'Maintains fluid balance, nerve conduction, and muscular contraction performance.' },
  ];

  if (norm.includes('creatine')) return [all[0]];
  if (norm.includes('protein') || norm.includes('whey')) return [all[1]];
  if (norm.includes('caffeine') || norm.includes('pre-workout') || norm.includes('preworkout')) return [all[2]];

  return all;
}

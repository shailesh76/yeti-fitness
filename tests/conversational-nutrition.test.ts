import { describe, it, expect } from 'vitest';
import {
  calculateBmr,
  computeCalorieTargets,
  computeMacroCycling,
  getEqualMacroSubstitutions,
  generateGroceryList,
  getSupplementAdvice,
} from '../supabase/functions/_shared/ai/nutritionEngine.ts';
import { validateNutritionPlan } from '../supabase/functions/_shared/ai/nutritionValidator.ts';
import { deriveNutritionIntelligence } from '../supabase/functions/_shared/ai/nutritionIntelligence.ts';
import { classifyIntent } from '../supabase/functions/_shared/ai/intent.ts';
import { foldMemoryRows, buildCoachMemoryCard } from '../supabase/functions/_shared/ai/coachMemory.ts';

describe('Conversational Nutrition Coach — Raw Engine (`nutritionEngine.ts`)', () => {
  it('1. computes BMR and TDEE correctly via Mifflin-St Jeor equation', () => {
    const bmr = calculateBmr(80, 180, 25, 'male'); // 10*80 + 6.25*180 - 5*25 + 5 = 800 + 1125 - 125 + 5 = 1805
    expect(bmr).toBe(1805);

    const { baseTdee, dailyCalories, phase } = computeCalorieTargets({
      weightKg: 80,
      heightCm: 180,
      age: 25,
      gender: 'male',
      activityLevel: 'moderate',
      goal: 'muscle_gain',
    });

    expect(baseTdee).toBe(2798); // 1805 * 1.55
    expect(dailyCalories).toBe(3048); // 2798 + 250
    expect(phase).toBe('lean_bulk');
  });

  it('2. computes distinct Training-Day vs Rest-Day macro cycling', () => {
    const { trainingDay, restDay } = computeMacroCycling(2600, 80);

    expect(trainingDay.calories).toBe(2600);
    expect(trainingDay.proteinG).toBe(176); // 80 * 2.2
    expect(trainingDay.carbsG).toBeGreaterThan(restDay.carbsG);
    expect(restDay.fatG).toBeGreaterThan(trainingDay.fatG);
  });

  it('3. generates equal-macro substitutions for tofu, oats, and chicken', () => {
    const tofuSub = getEqualMacroSubstitutions('Tofu', 100);
    expect(tofuSub.substitutions.some((s) => s.foodName === 'Paneer')).toBe(true);
    expect(tofuSub.substitutions.some((s) => s.foodName.includes('Greek Yogurt'))).toBe(true);

    const oatSub = getEqualMacroSubstitutions('Oats', 60);
    expect(oatSub.substitutions.some((s) => s.foodName === 'Cream of Rice')).toBe(true);

    const chickenSub = getEqualMacroSubstitutions('Chicken Breast', 150);
    expect(chickenSub.substitutions.some((s) => s.foodName === 'Turkey Breast')).toBe(true);
  });

  it('4. builds low vs high budget grocery lists tailored to dietary preferences', () => {
    const lowBudgetVeg = generateGroceryList('vegetarian', 'low');
    expect(lowBudgetVeg.proteins).toContain('Eggs');
    expect(lowBudgetVeg.proteins).toContain('Tofu');

    const highBudgetOmnivore = generateGroceryList('omnivore', 'high');
    expect(highBudgetOmnivore.proteins).toContain('Salmon Fillets');
    expect(highBudgetOmnivore.proteins).toContain('Grass-fed Lean Beef');
  });

  it('5. provides evidence-based supplement guidance', () => {
    const creatine = getSupplementAdvice('creatine');
    expect(creatine[0].name).toBe('Creatine Monohydrate');
    expect(creatine[0].dosage).toBe('5g daily');
  });
});

describe('Conversational Nutrition Coach — Validator (`nutritionValidator.ts`)', () => {
  it('6. validates calorie tolerance, protein threshold, and catches vegetarian violations', () => {
    const validResult = validateNutritionPlan([
      {
        name: 'Breakfast',
        targetCalories: 600,
        items: [
          { name: 'Oats', amountG: 80, calories: 300, proteinG: 10, carbsG: 50, fatG: 4, category: 'carbs' },
          { name: 'Egg Whites', amountG: 200, calories: 100, proteinG: 24, carbsG: 2, fatG: 0, category: 'protein' },
          { name: 'Paneer', amountG: 80, calories: 200, proteinG: 14, carbsG: 3, fatG: 15, category: 'protein' },
        ],
      },
    ], {
      targetCalories: 600,
      targetProteinG: 40,
      weightKg: 80,
      dietaryPreference: 'vegetarian',
    });

    expect(validResult.isValid).toBe(true);
    expect(validResult.dietaryPreferenceViolations.length).toBe(0);

    const invalidResult = validateNutritionPlan([
      {
        name: 'Lunch',
        targetCalories: 500,
        items: [{ name: 'Grilled Chicken Breast', amountG: 150, calories: 250, proteinG: 35, carbsG: 0, fatG: 5, category: 'protein' }],
      },
    ], {
      targetCalories: 500,
      targetProteinG: 35,
      weightKg: 80,
      dietaryPreference: 'vegetarian',
    });

    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.dietaryPreferenceViolations.length).toBeGreaterThan(0);
  });

  it('7. flags declared allergy violations for peanuts and dairy', () => {
    const res = validateNutritionPlan([
      {
        name: 'Snack',
        targetCalories: 250,
        items: [{ name: 'Peanut Butter Toast', amountG: 50, calories: 250, proteinG: 8, carbsG: 20, fatG: 12, category: 'snack' }],
      },
    ], {
      targetCalories: 250,
      targetProteinG: 10,
      weightKg: 70,
      allergies: ['Peanuts', 'Dairy'],
    });

    expect(res.isValid).toBe(false);
    expect(res.allergyViolations.some((v) => v.toLowerCase().includes('peanuts'))).toBe(true);
  });
});


describe('Conversational Nutrition Coach — Decision Engine (`nutritionIntelligence.ts`)', () => {
  it('8. computes Nutrition Score (0-100) and recommends adaptive calorie increase on slow muscle gain', () => {
    const rawResult = {
      baseTdee: 2500,
      dailyTargetCalories: 2800,
      trainingDayMacros: { calories: 2800, proteinG: 180, carbsG: 350, fatG: 70 },
      restDayMacros: { calories: 2500, proteinG: 180, carbsG: 250, fatG: 80 },
      currentPhase: 'lean_bulk' as const,
      meals: [],
      groceryList: generateGroceryList('omnivore', 'moderate'),
    };

    const validation = {
      isValid: true,
      calorieDeltaPct: 0,
      proteinDeficitG: 0,
      allergyViolations: [],
      dietaryPreferenceViolations: [],
      warnings: [],
    };

    const intel = deriveNutritionIntelligence(rawResult, validation, {
      weightLogsKg: [{ daysAgo: 0, weightKg: 75.1 }, { daysAgo: 21, weightKg: 75.0 }],
      consumedCaloriesAvg: 2800,
      targetCalories: 2800,
      consumedProteinAvg: 175,
      targetProtein: 180,
      loggedDaysCount: 6,
    }, { weightKg: 75, goal: 'muscle_gain' });

    expect(intel.nutritionScore.score).toBeGreaterThanOrEqual(80);
    expect(intel.adaptiveDecision.action).toBe('increase_calories');
    expect(intel.adaptiveDecision.deltaKcal).toBe(150);
  });
});

describe('Conversational Nutrition Coach — Intent Routing & Memory', () => {
  it('9. routes nutrition queries to specialized intents', () => {
    expect(classifyIntent('Create a vegetarian meal plan')).toBe('nutrition_plan_generate');
    expect(classifyIntent('Generate a grocery list')).toBe('grocery_list');
    expect(classifyIntent("I'm eating out at a restaurant")).toBe('eating_out_guidance');
    expect(classifyIntent('Should I take creatine monohydrate?')).toBe('supplement_guidance');
    expect(classifyIntent('Review my nutrition for this week')).toBe('nutrition_review');
  });

  it('10. folds food likes, dislikes, and eating patterns into Coach Memory Card', () => {
    const rows = [
      { category: 'liked foods', memory_key: 'food_1', memory_value: 'Paneer' },
      { category: 'disliked foods', memory_key: 'food_2', memory_value: 'Mushrooms' },
      { category: 'eating patterns', memory_key: 'pattern_1', memory_value: '16/8 Intermittent Fasting' },
    ];

    const memory = foldMemoryRows(rows);
    const card = buildCoachMemoryCard(memory);

    expect(memory.likedFoods).toContain('Paneer');
    expect(memory.dislikedFoods).toContain('Mushrooms');
    expect(memory.eatingPatterns).toContain('16/8 Intermittent Fasting');
    expect(card).toContain('Liked Foods: Paneer');
    expect(card).toContain('Disliked Foods: Mushrooms');
    expect(card).toContain('Eating Patterns: 16/8 Intermittent Fasting');
  });
});

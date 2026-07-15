export interface NutritionContext {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: 'MALE' | 'FEMALE';
  goal: 'FAT_LOSS' | 'MAINTENANCE' | 'LEAN_BULK' | 'MUSCLE_GAIN';
  activityLevel: 1.2 | 1.375 | 1.55 | 1.725 | 1.9; 
}

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export class NutritionEngine {
  static calculateTargets(context: NutritionContext): MacroTargets {
    // Mifflin-St Jeor Equation
    let bmr = (10 * context.weightKg) + (6.25 * context.heightCm) - (5 * context.age);
    bmr += context.gender === 'MALE' ? 5 : -161;

    let tdee = bmr * context.activityLevel;
    
    let targetCalories = tdee;
    if (context.goal === 'FAT_LOSS') targetCalories -= 500;
    if (context.goal === 'LEAN_BULK') targetCalories += 250;
    if (context.goal === 'MUSCLE_GAIN') targetCalories += 500;

    // Protein: 2.2g per kg of bodyweight
    const protein = Math.round(context.weightKg * 2.2);
    
    // Fat: 25% of calories
    const fat = Math.round((targetCalories * 0.25) / 9);

    // Carbs: Remainder
    const carbs = Math.round((targetCalories - (protein * 4) - (fat * 9)) / 4);

    return {
      calories: Math.round(targetCalories),
      protein,
      carbs,
      fat
    };
  }
}

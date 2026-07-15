import { Database, Q } from '@nozbe/watermelondb';
import { MealLog } from '../models/MealLog';
import { Food } from '../models/Food';

export class NutritionRepository {
  private db: Database;
  private supabase?: any;

  constructor(db: Database, supabase?: any) {
    this.db = db;
    this.supabase = supabase;
  }

  // --- Food Operations ---

  async createFood(foodData: {
    id?: string;
    name: string;
    brand?: string;
    barcode?: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    serving_size?: string;
  }): Promise<Food> {
    return this.db.write(async () => {
      return this.db.get<Food>('foods').create(f => {
        if (foodData.id) f._raw.id = foodData.id;
        f.name = foodData.name;
        f.brand = foodData.brand;
        f.barcode = foodData.barcode;
        f.calories = foodData.calories;
        f.protein = foodData.protein;
        f.carbs = foodData.carbs;
        f.fat = foodData.fat;
        f.serving_size = foodData.serving_size;
      });
    });
  }

  async searchFoodsLocal(term: string): Promise<Food[]> {
    return this.db.get<Food>('foods')
      .query(Q.where('name', Q.like(`%${term}%`)))
      .fetch();
  }

  async searchFoodsRemote(term: string): Promise<any[]> {
    if (!this.supabase) {
      throw new Error('Supabase client not configured in NutritionRepository');
    }
    const { data, error } = await this.supabase
      .from('foods')
      .select('*')
      .ilike('name', `%${term}%`)
      .limit(20);
    if (error) throw error;
    return data || [];
  }

  async saveFoodRemote(food: any): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase client not configured in NutritionRepository');
    }
    const { error } = await this.supabase
      .from('foods')
      .upsert(food);
    if (error) throw error;
  }

  // --- Meal Log Operations ---

  async logMeal(athleteId: string, foodId: string, servings: number): Promise<MealLog> {
    return this.db.write(async () => {
      return this.db.get<MealLog>('meal_logs').create(log => {
        log.athlete_id = athleteId;
        log.food_id = foodId;
        log.servings = servings;
        log.logged_at = Date.now();
        log.source = 'manual';
      });
    });
  }

  async updateMeal(id: string, updates: Partial<{servings: number}>): Promise<void> {
    await this.db.write(async () => {
      const log = await this.db.get<MealLog>('meal_logs').find(id);
      await log.update(l => {
        if (updates.servings !== undefined) l.servings = updates.servings;
      });
    });
  }

  async deleteMeal(id: string): Promise<void> {
    await this.db.write(async () => {
      const log = await this.db.get<MealLog>('meal_logs').find(id);
      await log.markAsDeleted();
    });
  }

  async calculateDailyNutrition(
    athleteId: string, 
    dateMs: number
  ): Promise<{ calories: number; protein: number; carbs: number; fat: number }> {
    const startOfDay = new Date(dateMs).setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateMs).setHours(23, 59, 59, 999);
    
    const logs = await this.db.get<MealLog>('meal_logs')
      .query(
        Q.where('athlete_id', athleteId),
        Q.where('logged_at', Q.between(startOfDay, endOfDay))
      )
      .fetch();

    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;

    for (const log of logs) {
      const food = await log.food.fetch();
      if (food) {
        calories += (food.calories || 0) * (log.servings || 1);
        protein += (food.protein || 0) * (log.servings || 1);
        carbs += (food.carbs || 0) * (log.servings || 1);
        fat += (food.fat || 0) * (log.servings || 1);
      }
    }

    return { 
      calories: Math.round(calories), 
      protein: Math.round(protein), 
      carbs: Math.round(carbs), 
      fat: Math.round(fat) 
    };
  }
}

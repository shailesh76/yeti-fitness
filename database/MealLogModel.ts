import { Model } from '@nozbe/watermelondb';
import { field, relation } from '@nozbe/watermelondb/decorators';

export default class MealLogModel extends Model {
  static table = 'meal_logs';

  @field('food_id') food_id!: string;
  @field('meal_type') meal_type!: string; // BREAKFAST, LUNCH, DINNER, SNACK
  @field('servings') servings!: number;
  @field('logged_at') logged_at!: number;
  @field('source') source?: 'manual' | 'search' | 'photo' | 'barcode';
  @field('raw_response') raw_response?: string;

  @relation('foods', 'food_id') food!: any;
}

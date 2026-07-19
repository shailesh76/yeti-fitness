import { Model } from '@nozbe/watermelondb';
import { field, relation, date, readonly } from '@nozbe/watermelondb/decorators';

export class MealLog extends Model {
  static table = 'meal_logs';

  @field('athlete_id') athlete_id!: string;
  @field('food_id') food_id!: string;
  @field('meal_type') meal_type!: string; // BREAKFAST, LUNCH, DINNER, SNACK
  @field('servings') servings!: number;
  @field('logged_at') logged_at!: number;
  @field('source') source?: string;
  @field('raw_response') raw_response?: string;

  @relation('foods', 'food_id') food!: any;

  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;
}

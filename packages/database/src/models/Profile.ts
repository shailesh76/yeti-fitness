import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class Profile extends Model {
  static table = 'profiles';

  @field('user_id') user_id!: string;
  @field('role_id') role_id?: string;
  @field('full_name') full_name?: string;
  @field('email') email?: string;
  @field('avatar_url') avatar_url?: string;
  @field('role') role?: string;
  @field('age') age?: number;
  @field('gender') gender?: string;
  @field('weight_kg') weight_kg?: number;
  @field('height_cm') height_cm?: number;
  @field('goal') goal?: string;
  @field('experience_level') experience_level?: string;
  @field('equipment') equipment?: string;
  @field('target_calories') target_calories?: number;
  @field('target_protein') target_protein?: number;
  @field('target_carbs') target_carbs?: number;
  @field('target_fat') target_fat?: number;
  @field('synced_at') synced_at?: number;
  @field('activity_level') activity_level?: string;
  @field('training_experience') training_experience?: string;
  @field('target_weight') target_weight?: number;

  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;
}

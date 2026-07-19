import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class Measurement extends Model {
  static table = 'measurements';

  @field('server_id') server_id?: string;
  @field('user_id') user_id!: string;
  @field('weight_kg') weight_kg?: number;
  @field('body_fat_pct') body_fat_pct?: number;
  @field('chest_cm') chest_cm?: number;
  @field('waist_cm') waist_cm?: number;
  @field('hips_cm') hips_cm?: number;
  @field('arms_cm') arms_cm?: number;
  @field('legs_cm') legs_cm?: number;
  @field('notes') notes?: string;
  @field('logged_at') logged_at!: number;
  @field('is_synced') is_synced!: boolean;

  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;
}

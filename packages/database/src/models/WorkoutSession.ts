import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class WorkoutSession extends Model {
  static table = 'workout_sessions';

  @field('server_id') server_id?: string;
  @field('user_id') user_id!: string;
  @field('plan_day_id') plan_day_id?: string;
  @field('assignment_id') assignment_id?: string;
  @field('name') name!: string;
  @field('status') status!: string; // 'active' | 'completed' | 'abandoned'
  @field('started_at') started_at!: number;
  @field('finished_at') finished_at?: number;
  @field('duration_seconds') duration_seconds?: number;
  @field('total_volume_kg') total_volume_kg?: number;
  @field('notes') notes?: string;
  @field('progression_suggestion') progression_suggestion?: string;
  @field('is_synced') is_synced!: boolean;

  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;
}

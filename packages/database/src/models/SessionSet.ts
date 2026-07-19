import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class SessionSet extends Model {
  static table = 'session_sets';

  @field('server_id') server_id?: string;
  @field('session_id') session_id!: string;
  @field('session_server_id') session_server_id?: string;
  @field('user_id') user_id!: string;
  @field('exercise_id') exercise_id!: string;
  @field('exercise_name') exercise_name!: string;
  @field('set_number') set_number!: number;
  @field('weight_kg') weight_kg!: number;
  @field('reps') reps!: number;
  @field('rpe') rpe?: number;
  @field('tempo') tempo?: string;
  @field('rest_seconds') rest_seconds?: number;
  @field('is_warmup') is_warmup?: boolean;
  @field('is_dropset') is_dropset?: boolean;
  @field('completed_at') completed_at!: number;
  @field('is_synced') is_synced!: boolean;

  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;
}

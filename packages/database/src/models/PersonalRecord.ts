import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class PersonalRecord extends Model {
  static table = 'personal_records';

  @field('athlete_id') athlete_id!: string;
  @field('exercise_id') exercise_id!: string;
  @field('record_type') record_type!: string; // 'max_weight' | 'max_reps' | 'best_time'
  @field('value') value!: number;
  @field('achieved_at') achieved_at!: number;

  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;
}

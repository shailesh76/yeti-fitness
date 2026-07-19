import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class AIUsage extends Model {
  static table = 'ai_usage';

  @field('athlete_id') athlete_id!: string;
  @field('requests_count') requests_count!: number;
  @field('date') date!: string;

  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;
}

import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class AIMemory extends Model {
  static table = 'ai_memory';

  @field('athlete_id') athlete_id!: string;
  @field('category') category!: string;
  @field('key') key!: string;
  @field('value') value!: string;

  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;
}

import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class AIConversation extends Model {
  static table = 'ai_conversations';

  @field('athlete_id') athlete_id!: string;
  @field('title') title?: string;

  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;
}

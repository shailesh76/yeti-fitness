import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class AIMessage extends Model {
  static table = 'ai_messages';

  @field('conversation_id') conversation_id!: string;
  @field('role') role!: string;
  @field('content') content!: string;
  @field('is_synced') is_synced!: boolean;

  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;
}

import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class ProgressPhoto extends Model {
  static table = 'progress_photos';

  @field('server_id') server_id?: string;
  @field('user_id') user_id!: string;
  @field('photo_key') photo_key!: string;
  @field('notes') notes?: string;
  @field('logged_at') logged_at!: number;
  @field('is_synced') is_synced!: boolean;

  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;
}

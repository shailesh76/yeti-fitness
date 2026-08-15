import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class Exercise extends Model {
  static table = 'exercises';

  @field('server_id') server_id!: string;
  @field('slug') slug?: string;
  @field('name') name!: string;
  @field('primary_muscle') primary_muscle?: string;
  @field('muscle_group') muscle_group?: string;
  @field('category') category?: string;
  @field('equipment') equipment?: string;
  @field('movement_pattern') movement_pattern?: string;
  @field('unilateral') unilateral?: boolean;
  @field('setup_instructions') setup_instructions?: string;
  @field('execution_instructions') execution_instructions?: string;
  @field('breathing') breathing?: string;
  @field('coaching_cues') coaching_cues?: string;
  @field('common_mistakes') common_mistakes?: string;
  @field('safety_notes') safety_notes?: string;
  @field('default_sets') default_sets?: number;
  @field('default_reps') default_reps?: number;
  @field('default_reps_prescription') default_reps_prescription?: string;
  @field('tempo') tempo?: string;
  @field('instructions') instructions?: string;
  @field('gif_url') gif_url?: string;
  @field('video_url') video_url?: string;
  @field('is_compound') is_compound?: boolean;
  @field('synced_at') synced_at?: number;
  @field('body_part') body_part?: string;
  @field('target_muscle') target_muscle?: string;
  @field('secondary_muscles') secondary_muscles?: string; // JSON-encoded string[]
  @field('difficulty') difficulty?: string;
  @field('media_type') media_type?: string;
  @field('thumbnail_url') thumbnail_url?: string;
  @field('source') source?: string;
  @field('source_id') source_id?: string;
  @field('is_public') is_public?: boolean;
  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;
}

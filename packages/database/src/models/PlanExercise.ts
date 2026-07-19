import { Model, Relation } from '@nozbe/watermelondb';
import { date, field, readonly, relation } from '@nozbe/watermelondb/decorators';
import { PlanDay } from './PlanDay';

export class PlanExercise extends Model {
  static table = 'plan_exercises';
  static associations = { plan_days: { type: 'belongs_to' as const, key: 'plan_day_id' } };
  @field('plan_day_id') plan_day_id!: string;
  @field('exercise_id') exercise_id!: string;
  @field('sets') sets?: string;
  @field('reps') reps?: string;
  @field('weight') weight?: string;
  @field('target_rpe') target_rpe?: number;
  @field('rest_seconds') rest_seconds?: number;
  @field('notes') notes?: string;
  @field('warmup_sets') warmup_sets?: number;
  @field('is_dropset') is_dropset?: boolean;
  @field('superset_group') superset_group?: string;
  @field('order_index') order_index!: number;
  @relation('plan_days', 'plan_day_id') day!: Relation<PlanDay>;
  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;
}

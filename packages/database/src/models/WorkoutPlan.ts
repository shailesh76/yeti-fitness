import { Model, Query } from '@nozbe/watermelondb';
import { children, date, field, readonly } from '@nozbe/watermelondb/decorators';
import { PlanDay } from './PlanDay';

export class WorkoutPlan extends Model {
  static table = 'workout_plans';
  static associations = { plan_days: { type: 'has_many' as const, foreignKey: 'plan_id' } };
  @field('user_id') user_id?: string;
  @field('coach_id') coach_id?: string;
  @field('name') name!: string;
  @field('notes') notes?: string;
  @children('plan_days') days!: Query<PlanDay>;
  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;
}

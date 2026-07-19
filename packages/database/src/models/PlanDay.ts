import { Model, Query, Relation } from '@nozbe/watermelondb';
import { children, date, field, readonly, relation } from '@nozbe/watermelondb/decorators';
import { PlanExercise } from './PlanExercise';
import { WorkoutPlan } from './WorkoutPlan';

export class PlanDay extends Model {
  static table = 'plan_days';
  static associations = {
    workout_plans: { type: 'belongs_to' as const, key: 'plan_id' },
    plan_exercises: { type: 'has_many' as const, foreignKey: 'plan_day_id' },
  };
  @field('plan_id') plan_id!: string;
  @field('day_number') day_number!: number;
  @field('name') name?: string;
  @relation('workout_plans', 'plan_id') plan!: Relation<WorkoutPlan>;
  @children('plan_exercises') exercises!: Query<PlanExercise>;
  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;
}

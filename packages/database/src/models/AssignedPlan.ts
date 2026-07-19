import { Model, Relation } from '@nozbe/watermelondb';
import { date, field, readonly, relation } from '@nozbe/watermelondb/decorators';
import { WorkoutPlan } from './WorkoutPlan';

export class AssignedPlan extends Model {
  static table = 'assigned_plans';
  static associations = { workout_plans: { type: 'belongs_to' as const, key: 'plan_id' } };
  @field('plan_id') plan_id!: string;
  @field('athlete_id') athlete_id!: string;
  @field('assigned_at') assigned_at!: number;
  @field('start_date') start_date?: string;
  @relation('workout_plans', 'plan_id') plan!: Relation<WorkoutPlan>;
  @readonly @date('updated_at') updatedAt!: number;
}

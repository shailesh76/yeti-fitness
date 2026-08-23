import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { 
  schema, 
  migrations,
  Workout,
  Exercise,
  Food,
  MealLog,
  Measurement,
  Profile,
  WorkoutSession,
  SessionSet,
  PersonalRecord,
  ProgressPhoto,
  AIConversation,
  AIMessage,
  AIMemory,
  AIUsage,
  WorkoutPlan,
  PlanDay,
  PlanExercise,
  AssignedPlan,
} from '@yeti/database';

const ALL_MODELS = [
  Workout,
  Exercise,
  Food,
  MealLog,
  Measurement,
  Profile,
  WorkoutSession,
  SessionSet,
  PersonalRecord,
  ProgressPhoto,
  AIConversation,
  AIMessage,
  AIMemory,
  AIUsage,
  WorkoutPlan,
  PlanDay,
  PlanExercise,
  AssignedPlan,
];

let database: Database;
let isNativeDbAvailable = false;

try {
  const adapter = new SQLiteAdapter({
    schema,
    migrations,
    dbName: 'yeti_v4',
    jsi: false,
    onSetUpError: (error) => {
      console.warn('[WatermelonDB] SQLiteAdapter setup error:', error);
    },
  });

  database = new Database({
    adapter,
    modelClasses: ALL_MODELS,
  });
  isNativeDbAvailable = true;
  console.log('[WatermelonDB] Database initialized (v4) with', ALL_MODELS.length, 'models');
} catch (e) {
  console.warn('[WatermelonDB] Not supported in this environment. Falling back to Supabase direct.');
  database = null as any;
}

export { database, isNativeDbAvailable };

// Re-export aligned models
export {
  Workout,
  Exercise,
  Food,
  MealLog,
  Measurement,
  Profile,
  WorkoutSession,
  SessionSet,
  PersonalRecord,
  ProgressPhoto,
  AIConversation,
  AIMessage,
  AIMemory,
  AIUsage,
  WorkoutPlan,
  PlanDay,
  PlanExercise,
  AssignedPlan,
  schema
};

import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import schema from './schema';
import FoodModel from './FoodModel';
import MealLogModel from './MealLogModel';
import migrations from './migrations';

let database: Database;
let isNativeDbAvailable = false;

try {
  const adapter = new SQLiteAdapter({
    schema,
    migrations,
    dbName: 'dude_nutrition_v1',
    jsi: false, // Safer default for Expo Go compatibility
    onSetUpError: (error) => {
      console.warn("WatermelonDB SQLiteAdapter set up error:", error);
    }
  });

  database = new Database({
    adapter,
    modelClasses: [FoodModel, MealLogModel],
  });
  isNativeDbAvailable = true;
} catch (e) {
  console.warn("WatermelonDB not supported in this environment (likely Expo Go). Falling back to AsyncStorage.");
  database = null as any;
}

export { database, isNativeDbAvailable };
export { default as FoodModel } from './FoodModel';
export { default as MealLogModel } from './MealLogModel';
export { default as schema } from './schema';

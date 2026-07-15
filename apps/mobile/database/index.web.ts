import { Food, MealLog, schema } from '@yeti/database';

// Web does not support native SQLite WatermelonDB adapter, falls back to AsyncStorage in store
const database = null as any;
const isNativeDbAvailable = false;

export { database, isNativeDbAvailable };
export { Food as FoodModel };
export { MealLog as MealLogModel };
export { schema };

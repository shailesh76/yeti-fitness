import FoodModel from './FoodModel';
import MealLogModel from './MealLogModel';
import schema from './schema';

// Web does not support native SQLite WatermelonDB adapter, falls back to AsyncStorage in store
const database = null as any;
const isNativeDbAvailable = false;

export { database, isNativeDbAvailable };
export { default as FoodModel } from './FoodModel';
export { default as MealLogModel } from './MealLogModel';
export { default as schema } from './schema';

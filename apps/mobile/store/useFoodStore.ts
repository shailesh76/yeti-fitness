import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { database, isNativeDbAvailable } from '../database';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';
import { NutritionRepository, Food as DBFood, MealLog as DBMealLog, EventRepository } from '@yeti/database';
import { lookupBarcodeProduct } from '../services/nutritionApi';
import { EVENTS } from '../constants/analyticsEvents';

const nutritionRepository = new NutritionRepository(database, supabase);
const eventRepository = new EventRepository(database, supabase);

export interface Food {
  id: string;
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_size?: string;
  barcode?: string;
}

export interface MealLog {
  id: string;
  athlete_id?: string;
  food_id: string;
  meal_type: string;
  servings: number;
  logged_at: number;
  food?: Food;
  source?: string;
  raw_response?: any;
}

// Helper to generate UUIDs locally if needed
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface FoodStore {
  foods: Food[];
  mealLogs: MealLog[];
  loading: boolean;

  loadLocalCache: () => Promise<void>;
  initSync: () => Promise<void>;
  searchFoods: (term: string) => Promise<Food[]>;
  addFood: (data: Partial<Food>) => Promise<Food>;
  logMeal: (mealDataOrId: any, mealType?: string, servings?: number) => Promise<MealLog>;
  deleteMealLog: (id: string) => Promise<void>;
  updateMealLog: (id: string, servings: number) => Promise<void>;
  scanBarcode: (barcode: string, mealType: string) => Promise<MealLog | null>;
  analyzeFoodPhoto: (base64Image: string) => Promise<Partial<Food>[]>;
}

export const useFoodStore = create<FoodStore>((set, get) => ({
  foods: [],
  mealLogs: [],
  loading: false,

  async loadLocalCache() {
    if (isNativeDbAvailable && database) {
      try {
        const localFoods = await database.get<DBFood>('foods').query().fetch();
        const localLogs = await database.get<DBMealLog>('meal_logs').query().fetch();
        
        const mappedFoods: Food[] = localFoods.map(f => ({
          id: f.id,
          name: f.name,
          brand: f.brand,
          calories: f.calories,
          protein: f.protein,
          carbs: f.carbs,
          fat: f.fat,
          serving_size: f.serving_size,
          barcode: f.barcode,
        }));

        const resolvedLogs: MealLog[] = await Promise.all(
          localLogs.map(async (log) => {
            const food = await log.food.fetch();
            return {
              id: log.id,
              athlete_id: log.athlete_id,
              food_id: log.food_id,
              meal_type: log.meal_type,
              servings: log.servings,
              logged_at: log.logged_at,
              source: log.source,
              raw_response: log.raw_response ? JSON.parse(log.raw_response) : undefined,
              food: food ? {
                id: food.id,
                name: food.name,
                brand: food.brand,
                calories: food.calories,
                protein: food.protein,
                carbs: food.carbs,
                fat: food.fat,
                serving_size: food.serving_size,
                barcode: food.barcode,
              } : undefined,
            };
          })
        );

        set({ 
          foods: mappedFoods, 
          mealLogs: resolvedLogs.sort((a, b) => b.logged_at - a.logged_at) 
        });
      } catch (e) {
        console.warn("Failed to load local WatermelonDB cache:", e);
      }
    } else {
      const foodsVal = await AsyncStorage.getItem('@dude_foods');
      const logsVal = await AsyncStorage.getItem('@dude_meal_logs');
      set({
        foods: foodsVal ? JSON.parse(foodsVal) : [],
        mealLogs: logsVal ? JSON.parse(logsVal) : [],
      });
    }
  },

  async initSync() {
    set({ loading: true });
    await get().loadLocalCache();
    set({ loading: false });
  },

  async searchFoods(term) {
    const localMatches = get().foods.filter(f => 
      f.name.toLowerCase().includes(term.toLowerCase()) || 
      f.brand?.toLowerCase().includes(term.toLowerCase())
    );

    try {
      const remoteMatches = await nutritionRepository.searchFoodsRemote(term);
      if (remoteMatches && remoteMatches.length > 0) {
        const updatedFoods = [...get().foods];
        for (const rf of remoteMatches) {
          if (!updatedFoods.some(lf => lf.id === rf.id)) {
            const mappedFood: Food = {
              id: rf.id,
              name: rf.name,
              brand: rf.brand,
              calories: rf.calories,
              protein: rf.protein,
              carbs: rf.carbs,
              fat: rf.fat,
              serving_size: rf.serving_size,
              barcode: rf.barcode,
            };
            updatedFoods.push(mappedFood);
            if (isNativeDbAvailable && database) {
              await nutritionRepository.createFood(rf);
            }
          }
        }
        set({ foods: updatedFoods });

        const combined = [...localMatches];
        remoteMatches.forEach(rf => {
          if (!combined.some(cf => cf.id === rf.id)) {
            combined.push({
              id: rf.id,
              name: rf.name,
              brand: rf.brand,
              calories: rf.calories,
              protein: rf.protein,
              carbs: rf.carbs,
              fat: rf.fat,
              serving_size: rf.serving_size,
              barcode: rf.barcode,
            });
          }
        });
        return combined;
      }
    } catch (e) {
      console.warn("Remote food search failed, showing local results only:", e);
    }

    return localMatches;
  },

  async addFood(data) {
    const session = useAuthStore.getState().session;
    const userId = session?.user?.id;
    const id = data.id || generateUUID();

    const foodData: Food = {
      id,
      name: data.name ?? 'Unnamed food',
      brand: data.brand ?? '',
      calories: Number(data.calories) || 0,
      protein: Number(data.protein) || 0,
      carbs: Number(data.carbs) || 0,
      fat: Number(data.fat) || 0,
      serving_size: data.serving_size ?? '100g',
      barcode: data.barcode ?? '',
    };

    if (isNativeDbAvailable && database) {
      await nutritionRepository.createFood(foodData);
    } else {
      const updatedFoods = [...get().foods, foodData];
      await AsyncStorage.setItem('@dude_foods', JSON.stringify(updatedFoods));
    }

    set((state) => ({ foods: [...state.foods, foodData] }));

    if (userId) {
      try {
        await nutritionRepository.saveFoodRemote(foodData);
      } catch (e) {
        console.warn("Could not upsert food to Supabase (offline?):", e);
      }
    }

    return foodData;
  },

  async logMeal(mealDataOrId, mealType, servings) {
    const session = useAuthStore.getState().session;
    const userId = session?.user?.id || 'offline_user';

    let foodId: string;
    let mType: string;
    let serv: number;
    let foodObj: Food | undefined;

    if (typeof mealDataOrId === 'object' && mealDataOrId !== null) {
      foodId = mealDataOrId.food_id;
      mType = mealDataOrId.meal_type;
      serv = Number(mealDataOrId.servings);
      foodObj = mealDataOrId.food;
    } else {
      foodId = mealDataOrId;
      mType = mealType || 'BREAKFAST';
      serv = Number(servings) || 1;
      foodObj = get().foods.find(f => f.id === foodId);
    }

    let newLog: MealLog;
    if (isNativeDbAvailable && database) {
      const dbLog = await nutritionRepository.logMeal(userId, foodId, serv);
      newLog = {
        id: dbLog.id,
        athlete_id: dbLog.athlete_id,
        food_id: dbLog.food_id,
        meal_type: dbLog.meal_type,
        servings: dbLog.servings,
        logged_at: dbLog.logged_at,
        source: dbLog.source,
        food: foodObj,
      };
    } else {
      newLog = {
        id: generateUUID(),
        athlete_id: userId,
        food_id: foodId,
        meal_type: mType,
        servings: serv,
        logged_at: Date.now(),
        source: 'manual',
        food: foodObj,
      };
      const updatedLogs = [newLog, ...get().mealLogs];
      await AsyncStorage.setItem('@dude_meal_logs', JSON.stringify(updatedLogs));
    }

    set((state) => ({ mealLogs: [newLog, ...state.mealLogs] }));

    if (userId !== 'offline_user') {
      eventRepository.logActivity(userId, EVENTS.MEAL_LOGGED, {
        food_id: foodId,
        meal_type: mType,
        servings: serv
      }).catch(e => console.warn('[Analytics] Failed to log meal_logged event:', e));
    }

    return newLog;
  },

  async deleteMealLog(id) {
    set((state) => ({ mealLogs: state.mealLogs.filter(l => l.id !== id) }));
    if (isNativeDbAvailable && database) {
      try {
        await nutritionRepository.deleteMeal(id);
      } catch (e) {
        console.warn("Could not delete from WatermelonDB:", e);
      }
    } else {
      const updated = get().mealLogs;
      await AsyncStorage.setItem('@dude_meal_logs', JSON.stringify(updated));
    }
  },

  async updateMealLog(id, servings) {
    set((state) => ({
      mealLogs: state.mealLogs.map(l => l.id === id ? { ...l, servings } : l)
    }));

    if (isNativeDbAvailable && database) {
      try {
        await nutritionRepository.updateMeal(id, { servings });
      } catch (e) {
        console.warn("Could not update WatermelonDB:", e);
      }
    } else {
      const updated = get().mealLogs;
      await AsyncStorage.setItem('@dude_meal_logs', JSON.stringify(updated));
    }
  },

  async scanBarcode(barcode, mealType) {
    try {
      let food = get().foods.find(f => f.barcode === barcode);
      
      if (!food) {
        const product = await lookupBarcodeProduct(barcode);
        if (product) {
          const mapped = {
            name: product.name,
            brand: product.brand,
            calories: product.calories,
            protein: product.protein,
            carbs: product.carbs,
            fat: product.fat,
            serving_size: product.serving_size,
            barcode: barcode,
          };
          food = await get().addFood(mapped);
        }
      }
      
      if (food) {
        const logged = await get().logMeal({
          food_id: food.id,
          meal_type: mealType,
          servings: 1,
          logged_at: Date.now(),
          food: food,
          source: 'barcode',
        });
        return logged;
      }
      
      return null;
    } catch (e) {
      console.error("Error scanning barcode:", e);
      return null;
    }
  },

  async analyzeFoodPhoto(base64Image) {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-food-image', {
        body: { image: base64Image }
      });
      
      if (error) throw error;
      
      return (data || []).map((item: any) => ({
        name: item.name || 'Unnamed food',
        brand: item.brand || 'AI Estimate',
        calories: Number(item.calories) || 0,
        protein: Number(item.protein) || 0,
        carbs: Number(item.carbs) || 0,
        fat: Number(item.fat) || 0,
        serving_size: item.serving_size || `${item.grams || 100}g`,
        barcode: '',
      }));
    } catch (e) {
      console.error("Error analyzing food photo:", e);
      throw e;
    }
  }
}));

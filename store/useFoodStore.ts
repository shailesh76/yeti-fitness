import { create } from 'zustand';
import { database, isNativeDbAvailable } from '../database';
import FoodModel from '../database/FoodModel';
import MealLogModel from '../database/MealLogModel';
import { Q } from '@nozbe/watermelondb';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';
import { generateUUID } from '../utils/uuid';
import { lookupBarcodeProduct } from '../services/nutritionApi';

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
  food_id: string;
  meal_type: string;
  servings: number;
  logged_at: number;
  food?: Food;
  source?: 'manual' | 'search' | 'photo' | 'barcode';
  raw_response?: any;
}

interface FoodStore {
  foods: Food[];
  mealLogs: MealLog[];
  loading: boolean;
  
  initSync: () => Promise<void>;
  searchFoods: (term: string) => Promise<Food[]>;
  addFood: (data: Partial<Food>) => Promise<Food>;
  logMeal: (mealDataOrId: any, mealType?: string, servings?: number) => Promise<MealLog>;
  deleteMealLog: (id: string) => Promise<void>;
  updateMealLog: (id: string, servings: number) => Promise<void>;
  scanBarcode: (barcode: string, mealType: string) => Promise<MealLog | null>;
  analyzeFoodPhoto: (base64Image: string) => Promise<Omit<Food, 'id'>[]>;
  
  // Internal helper to load local cache
  loadLocalCache: () => Promise<void>;
}

export const useFoodStore = create<FoodStore>((set, get) => ({
  foods: [],
  mealLogs: [],
  loading: false,

  async loadLocalCache() {
    if (isNativeDbAvailable && database) {
      try {
        const dbFoods = await database.get<FoodModel>('foods').query().fetch();
        const dbLogs = await database.get<MealLogModel>('meal_logs').query().fetch();
        
        const localFoods: Food[] = dbFoods.map(f => ({
          id: f.id,
          name: f.name,
          brand: f.brand,
          calories: f.calories,
          protein: Number(f.protein),
          carbs: Number(f.carbs),
          fat: Number(f.fat),
          serving_size: f.serving_size,
          barcode: f.barcode,
        }));

        const localLogs: MealLog[] = await Promise.all(dbLogs.map(async l => {
          const foodRecord = await l.food.fetch();
          return {
            id: l.id,
            food_id: l.food_id,
            meal_type: l.meal_type,
            servings: Number(l.servings),
            logged_at: Number(l.logged_at),
            source: (l as any).source,
            raw_response: (l as any).raw_response ? JSON.parse((l as any).raw_response) : undefined,
            food: foodRecord ? {
              id: foodRecord.id,
              name: foodRecord.name,
              brand: foodRecord.brand,
              calories: foodRecord.calories,
              protein: Number(foodRecord.protein),
              carbs: Number(foodRecord.carbs),
              fat: Number(foodRecord.fat),
              serving_size: foodRecord.serving_size,
              barcode: foodRecord.barcode,
            } : undefined,
          };
        }));

        set({ foods: localFoods, mealLogs: localLogs });
        return;
      } catch (e) {
        console.warn("WatermelonDB load failed, falling back to AsyncStorage:", e);
      }
    }

    // AsyncStorage Fallback
    try {
      const foodsStr = await AsyncStorage.getItem('@dude_foods');
      const logsStr = await AsyncStorage.getItem('@dude_meal_logs');
      set({
        foods: foodsStr ? JSON.parse(foodsStr) : [],
        mealLogs: logsStr ? JSON.parse(logsStr) : [],
      });
    } catch (e) {
      console.error("AsyncStorage load failed:", e);
    }
  },

  async initSync() {
    set({ loading: true });
    // 1. Load local cache first so the UI displays something immediately
    await get().loadLocalCache();

    // 2. Try to sync with Supabase if online and session is available
    const session = useAuthStore.getState().session;
    const userId = session?.user?.id;
    if (!userId) {
      set({ loading: false });
      return;
    }

    try {
      // A. Pull foods from Supabase
      const { data: remoteFoods, error: foodsError } = await supabase
        .from('foods')
        .select('*');

      if (foodsError) throw foodsError;

      // Merge remote foods into local foods
      const currentFoods = [...get().foods];
      const mergedFoods = [...currentFoods];
      (remoteFoods || []).forEach(rf => {
        const idx = mergedFoods.findIndex(lf => lf.id === rf.id);
        if (idx === -1) {
          mergedFoods.push(rf);
        } else {
          mergedFoods[idx] = rf;
        }
      });

      // B. Upload any local foods that are not on Supabase
      const unsyncedFoods = currentFoods.filter(lf => 
        !(remoteFoods || []).some(rf => rf.id === lf.id)
      );

      for (const uf of unsyncedFoods) {
        await supabase.from('foods').upsert(uf);
      }

      // C. Pull meal logs from Supabase
      const { data: remoteLogs, error: logsError } = await supabase
        .from('meal_logs')
        .select('*, food:foods(*)')
        .eq('user_id', userId);

      if (logsError) throw logsError;

      // Merge remote logs into local logs
      const currentLogs = [...get().mealLogs];
      const mergedLogs = [...currentLogs];
      (remoteLogs || []).forEach(rl => {
        const idx = mergedLogs.findIndex(ll => ll.id === rl.id);
        const mappedLog: MealLog = {
          id: rl.id,
          food_id: rl.food_id,
          meal_type: rl.meal_type,
          servings: Number(rl.servings),
          logged_at: new Date(rl.logged_at).getTime(),
          food: rl.food,
          source: rl.source || 'manual',
          raw_response: rl.raw_response,
        };
        if (idx === -1) {
          mergedLogs.push(mappedLog);
        } else {
          mergedLogs[idx] = mappedLog;
        }
      });

      // D. Upload any local logs that are not on Supabase
      const unsyncedLogs = currentLogs.filter(ll => 
        !(remoteLogs || []).some(rl => rl.id === ll.id)
      );

      for (const ul of unsyncedLogs) {
        await supabase.from('meal_logs').insert({
          id: ul.id,
          user_id: userId,
          food_id: ul.food_id,
          meal_type: ul.meal_type,
          servings: ul.servings,
          logged_at: new Date(ul.logged_at).toISOString(),
          source: ul.source || 'manual',
          raw_response: ul.raw_response || null,
        });
      }

      // E. Save merged lists locally
      set({ foods: mergedFoods, mealLogs: mergedLogs });

      if (isNativeDbAvailable && database) {
        // Update WatermelonDB
        await database.write(async () => {
          for (const f of mergedFoods) {
            try {
              const record = await database.get<FoodModel>('foods').find(f.id);
              await record.update(r => {
                r.name = f.name;
                r.brand = f.brand;
                r.calories = f.calories;
                r.protein = f.protein;
                r.carbs = f.carbs;
                r.fat = f.fat;
                r.serving_size = f.serving_size;
                r.barcode = f.barcode;
              });
            } catch {
              await database.get<FoodModel>('foods').create(r => {
                r._raw.id = f.id;
                r.name = f.name;
                r.brand = f.brand;
                r.calories = f.calories;
                r.protein = f.protein;
                r.carbs = f.carbs;
                r.fat = f.fat;
                r.serving_size = f.serving_size;
                r.barcode = f.barcode;
              });
            }
          }

          for (const l of mergedLogs) {
            try {
              const record = await database.get<MealLogModel>('meal_logs').find(l.id);
              await record.update(r => {
                r.food_id = l.food_id;
                r.meal_type = l.meal_type;
                r.servings = l.servings;
                r.logged_at = l.logged_at;
                (r as any).source = l.source;
                (r as any).raw_response = l.raw_response ? JSON.stringify(l.raw_response) : undefined;
              });
            } catch {
              await database.get<MealLogModel>('meal_logs').create(r => {
                r._raw.id = l.id;
                r.food_id = l.food_id;
                r.meal_type = l.meal_type;
                r.servings = l.servings;
                r.logged_at = l.logged_at;
                (r as any).source = l.source;
                (r as any).raw_response = l.raw_response ? JSON.stringify(l.raw_response) : undefined;
              });
            }
          }
        });
      } else {
        await AsyncStorage.setItem('@dude_foods', JSON.stringify(mergedFoods));
        await AsyncStorage.setItem('@dude_meal_logs', JSON.stringify(mergedLogs));
      }
    } catch (e) {
      console.warn("Sync with Supabase failed, using local offline cache:", e);
    } finally {
      set({ loading: false });
    }
  },

  async searchFoods(term) {
    // 1. Search locally
    const localMatches = get().foods.filter(f => 
      f.name.toLowerCase().includes(term.toLowerCase()) || 
      f.brand?.toLowerCase().includes(term.toLowerCase())
    );

    // 2. Search Supabase if online
    try {
      const { data: remoteMatches } = await supabase
        .from('foods')
        .select('*')
        .ilike('name', `%${term}%`)
        .limit(20);

      if (remoteMatches && remoteMatches.length > 0) {
        const updatedFoods = [...get().foods];
        remoteMatches.forEach(rf => {
          if (!updatedFoods.some(lf => lf.id === rf.id)) {
            updatedFoods.push(rf);
          }
        });
        set({ foods: updatedFoods });
        
        if (isNativeDbAvailable && database) {
          await database.write(async () => {
            for (const rf of remoteMatches) {
              try {
                await database.get<FoodModel>('foods').find(rf.id);
              } catch {
                await database.get<FoodModel>('foods').create(r => {
                  r._raw.id = rf.id;
                  r.name = rf.name;
                  r.brand = rf.brand;
                  r.calories = rf.calories;
                  r.protein = rf.protein;
                  r.carbs = rf.carbs;
                  r.fat = rf.fat;
                  r.serving_size = rf.serving_size;
                  r.barcode = rf.barcode;
                });
              }
            }
          });
        } else {
          await AsyncStorage.setItem('@dude_foods', JSON.stringify(updatedFoods));
        }

        const combined = [...localMatches];
        remoteMatches.forEach(rf => {
          if (!combined.some(cf => cf.id === rf.id)) {
            combined.push(rf);
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
    
    const id = data.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : generateUUID());
    const newFood: Food = {
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

    const updatedFoods = [...get().foods, newFood];
    set({ foods: updatedFoods });

    if (isNativeDbAvailable && database) {
      await database.write(async () => {
        await database.get<FoodModel>('foods').create(r => {
          r._raw.id = id;
          r.name = newFood.name;
          r.brand = newFood.brand;
          r.calories = newFood.calories;
          r.protein = newFood.protein;
          r.carbs = newFood.carbs;
          r.fat = newFood.fat;
          r.serving_size = newFood.serving_size;
          r.barcode = newFood.barcode;
        });
      });
    } else {
      await AsyncStorage.setItem('@dude_foods', JSON.stringify(updatedFoods));
    }

    if (userId) {
      try {
        await supabase.from('foods').upsert(newFood);
      } catch (e) {
        console.warn("Could not upsert food to Supabase (offline?):", e);
      }
    }

    return newFood;
  },

  async logMeal(mealDataOrId, mealType, servings) {
    const session = useAuthStore.getState().session;
    const userId = session?.user?.id;

    let foodId: string;
    let mType: string;
    let serv: number;
    let loggedAt: number;
    let foodObj: Food | undefined;

    let sourceObj: any;
    let rawResponseObj: any;

    if (typeof mealDataOrId === 'object' && mealDataOrId !== null) {
      foodId = mealDataOrId.food_id;
      mType = mealDataOrId.meal_type;
      serv = Number(mealDataOrId.servings);
      loggedAt = Number(mealDataOrId.logged_at) || Date.now();
      foodObj = mealDataOrId.food;
      sourceObj = mealDataOrId.source || 'manual';
      rawResponseObj = mealDataOrId.raw_response || null;
    } else {
      foodId = mealDataOrId;
      mType = mealType || 'BREAKFAST';
      serv = Number(servings) || 1;
      loggedAt = Date.now();
      foodObj = get().foods.find(f => f.id === foodId);
      sourceObj = 'manual';
      rawResponseObj = null;
    }

    const id = (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : generateUUID());
    const newLog: MealLog = {
      id,
      food_id: foodId,
      meal_type: mType,
      servings: serv,
      logged_at: loggedAt,
      food: foodObj,
      source: sourceObj,
      raw_response: rawResponseObj,
    };

    const updatedLogs = [newLog, ...get().mealLogs];
    set({ mealLogs: updatedLogs });

    if (isNativeDbAvailable && database) {
      await database.write(async () => {
        await database.get<MealLogModel>('meal_logs').create(r => {
          r._raw.id = id;
          r.food_id = foodId;
          r.meal_type = mType;
          r.servings = serv;
          r.logged_at = loggedAt;
          (r as any).source = newLog.source;
          (r as any).raw_response = newLog.raw_response ? JSON.stringify(newLog.raw_response) : undefined;
        });
      });
    } else {
      await AsyncStorage.setItem('@dude_meal_logs', JSON.stringify(updatedLogs));
    }

    if (userId) {
      const { useOfflineSyncStore } = require('./useOfflineSyncStore');
      useOfflineSyncStore.getState().enqueueMutation({
        type: 'INSERT_MEAL_LOG',
        payload: {
          id,
          user_id: userId,
          food_id: foodId,
          meal_type: mType,
          servings: serv,
          logged_at: new Date(loggedAt).toISOString(),
          source: newLog.source || 'manual',
          raw_response: newLog.raw_response || null,
        }
      });
    }

    return newLog;
  },

  async deleteMealLog(id) {
    const updatedLogs = get().mealLogs.filter(l => l.id !== id);
    set({ mealLogs: updatedLogs });

    if (isNativeDbAvailable && database) {
      try {
        const record = await database.get<MealLogModel>('meal_logs').find(id);
        await database.write(async () => {
          await record.destroyPermanently();
        });
      } catch (e) {
        console.warn("Could not delete from WatermelonDB:", e);
      }
    } else {
      await AsyncStorage.setItem('@dude_meal_logs', JSON.stringify(updatedLogs));
    }

    const session = useAuthStore.getState().session;
    if (session?.user?.id) {
      try {
        await supabase.from('meal_logs').delete().eq('id', id);
      } catch (e) {
        console.warn("Could not delete from Supabase (offline?):", e);
      }
    }
  },

  async updateMealLog(id, servings) {
    const updatedLogs = get().mealLogs.map(l => l.id === id ? { ...l, servings } : l);
    set({ mealLogs: updatedLogs });

    if (isNativeDbAvailable && database) {
      try {
        const record = await database.get<MealLogModel>('meal_logs').find(id);
        await database.write(async () => {
          await record.update(r => {
            r.servings = servings;
          });
        });
      } catch (e) {
        console.warn("Could not update WatermelonDB:", e);
      }
    } else {
      await AsyncStorage.setItem('@dude_meal_logs', JSON.stringify(updatedLogs));
    }

    const session = useAuthStore.getState().session;
    if (session?.user?.id) {
      try {
        await supabase.from('meal_logs').update({ servings }).eq('id', id);
      } catch (e) {
        console.warn("Could not update Supabase (offline?):", e);
      }
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

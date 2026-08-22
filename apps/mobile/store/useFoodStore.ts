import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { database, isNativeDbAvailable } from '../database';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';
import { NutritionRepository, Food as DBFood, MealLog as DBMealLog, EventRepository } from '@yeti/database';
import { lookupBarcodeProduct } from '../services/nutritionApi';
import { dedupeRecentFoods, favoritesStorageKey } from '../services/nutritionUtils';
import { EVENTS } from '../constants/analyticsEvents';
import { invalidateScreenData, invalidateScreenDataPrefix } from '../services/screenDataCache';
import { patchHomeSnapshot, sumMealLogsForDay } from '../services/homeSummary';
import { normalizeMealType, restoreMealLogsForUser } from '../services/foodDiaryGroups';

const nutritionRepository = new NutritionRepository(database, supabase);
const eventRepository = new EventRepository(database, supabase);
let initSyncInFlight: Promise<void> | null = null;
let loadedForUserId: string | null = null;

function storageKey(kind: 'foods' | 'meal_logs', userId: string): string {
  return `@dude_${kind}_${userId}`;
}

function invalidateFoodViews(userId: string): void {
  invalidateScreenData(`home:${userId}`);
  invalidateScreenDataPrefix(`food-diary:${userId}:`);
  try {
    const currentLogs = useFoodStore.getState().mealLogs;
    const todayMacros = sumMealLogsForDay(currentLogs, Date.now(), userId);
    patchHomeSnapshot(userId, { consumedMacros: todayMacros });
  } catch {
    /* non-fatal */
  }
}

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

  loadLocalCache: (userIdOverride?: string) => Promise<void>;
  initSync: () => Promise<void>;
  searchFoods: (term: string) => Promise<Food[]>;
  addFood: (data: Partial<Food>) => Promise<Food>;
  logMeal: (mealDataOrId: any, mealType?: string, servings?: number) => Promise<MealLog>;
  deleteMealLog: (id: string) => Promise<void>;
  updateMealLog: (id: string, servings: number) => Promise<void>;
  scanBarcode: (barcode: string, mealType: string) => Promise<MealLog | null>;
  analyzeFoodPhoto: (base64Image: string) => Promise<Partial<Food>[]>;

  // Recent + favorite foods (beta usability)
  favoriteFoodIds: string[];
  resetForAccount: () => void;
  recentFoods: (limit?: number) => Food[];
  loadFavorites: () => Promise<void>;
  toggleFavorite: (food: Food) => Promise<void>;
  isFavorite: (foodId: string) => boolean;
}

export const useFoodStore = create<FoodStore>((set, get) => ({
  foods: [],
  mealLogs: [],
  loading: false,
  favoriteFoodIds: [],

  resetForAccount() {
    loadedForUserId = null;
    initSyncInFlight = null;
    set({ foods: [], mealLogs: [], favoriteFoodIds: [], loading: false });
  },

  async loadLocalCache(userIdOverride) {
    const userId = userIdOverride || useAuthStore.getState().session?.user?.id;
    if (!userId) {
      get().resetForAccount();
      return;
    }
    if (loadedForUserId && loadedForUserId !== userId) get().resetForAccount();
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
          localLogs.filter((log) => log.athlete_id === userId).map(async (log) => {
            const food = await log.food.fetch();
            return {
              id: log.id,
              athlete_id: log.athlete_id,
              food_id: log.food_id,
              meal_type: normalizeMealType(log.meal_type),
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
      const foodsVal = await AsyncStorage.getItem(storageKey('foods', userId));
      const logsVal = await AsyncStorage.getItem(storageKey('meal_logs', userId));
      set({
        foods: foodsVal ? JSON.parse(foodsVal) : [],
        mealLogs: logsVal ? restoreMealLogsForUser(JSON.parse(logsVal), userId) : [],
      });
    }
    loadedForUserId = userId;
  },

  async initSync() {
    if (initSyncInFlight) return initSyncInFlight;
    const hasCachedData = get().foods.length > 0 || get().mealLogs.length > 0;
    if (!hasCachedData) set({ loading: true });
    initSyncInFlight = get().loadLocalCache()
      .then(() => {
        // Favorites are optional remote enrichment and must not delay meal-log hydration.
        void get().loadFavorites().catch(() => {});
      })
      .finally(() => {
        set({ loading: false });
        initSyncInFlight = null;
      });
    return initSyncInFlight;
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
      if (userId) await AsyncStorage.setItem(storageKey('foods', userId), JSON.stringify(updatedFoods));
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

    let newLog: MealLog = {
      id: generateUUID(),
      athlete_id: userId,
      food_id: foodId,
      meal_type: mType,
      servings: serv,
      logged_at: Date.now(),
      source: mealDataOrId?.source || (foodObj ? 'search' : 'manual'),
      food: foodObj,
    };
    const optimisticId = newLog.id;
    set((state) => ({ mealLogs: [newLog, ...state.mealLogs] }));
    if (userId !== 'offline_user') invalidateFoodViews(userId);

    if (isNativeDbAvailable && database) {
      const logSource = mealDataOrId?.source || (foodObj ? 'search' : 'manual');
      const dbLog = await nutritionRepository.logMeal(userId, foodId, serv, mType, logSource);
      newLog = {
        id: dbLog.id,
        athlete_id: dbLog.athlete_id,
        food_id: dbLog.food_id,
        meal_type: dbLog.meal_type || mType,
        servings: dbLog.servings,
        logged_at: dbLog.logged_at,
        source: dbLog.source,
        food: foodObj,
      };
      set((state) => ({ mealLogs: state.mealLogs.map((log) => log.id === optimisticId ? newLog : log) }));
    } else {
      await AsyncStorage.setItem(storageKey('meal_logs', userId), JSON.stringify(get().mealLogs));
    }

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
    const userId = useAuthStore.getState().session?.user?.id;
    set((state) => ({ mealLogs: state.mealLogs.filter(l => l.id !== id) }));
    if (userId) invalidateFoodViews(userId);
    if (isNativeDbAvailable && database) {
      try {
        await nutritionRepository.deleteMeal(id);
      } catch (e) {
        console.warn("Could not delete from WatermelonDB:", e);
      }
    } else {
      const updated = get().mealLogs;
      if (userId) await AsyncStorage.setItem(storageKey('meal_logs', userId), JSON.stringify(updated));
    }
  },

  async updateMealLog(id, servings) {
    const userId = useAuthStore.getState().session?.user?.id;
    set((state) => ({
      mealLogs: state.mealLogs.map(l => l.id === id ? { ...l, servings } : l)
    }));
    if (userId) invalidateFoodViews(userId);

    if (isNativeDbAvailable && database) {
      try {
        await nutritionRepository.updateMeal(id, { servings });
      } catch (e) {
        console.warn("Could not update WatermelonDB:", e);
      }
    } else {
      const updated = get().mealLogs;
      if (userId) await AsyncStorage.setItem(storageKey('meal_logs', userId), JSON.stringify(updated));
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
  },

  // Most-recently-logged unique foods (meal logs are kept newest-first, so we
  // dedupe by food_id preserving the most recent occurrence). Derived — no extra
  // storage, and works offline from the local cache.
  recentFoods(limit = 12) {
    return dedupeRecentFoods<Food>(get().mealLogs, limit);
  },

  isFavorite(foodId) {
    return get().favoriteFoodIds.includes(foodId);
  },

  // Favorites are user-specific and offline-first: the per-user AsyncStorage list
  // is authoritative for the UI; the food_favorites table (RLS-scoped to the user)
  // is a best-effort cross-device mirror that no-ops when offline or not yet added.
  async loadFavorites() {
    const userId = useAuthStore.getState().session?.user?.id;
    if (!userId) { set({ favoriteFoodIds: [] }); return; }

    let ids: string[] = [];
    try {
      const raw = await AsyncStorage.getItem(favoritesStorageKey(userId));
      if (raw) ids = JSON.parse(raw);
    } catch { /* ignore malformed cache */ }

    try {
      const { data } = await supabase
        .from('food_favorites')
        .select('food_id')
        .eq('user_id', userId);
      if (Array.isArray(data)) {
        const serverIds = data.map((r: any) => r.food_id).filter(Boolean);
        ids = Array.from(new Set([...ids, ...serverIds]));
        await AsyncStorage.setItem(favoritesStorageKey(userId), JSON.stringify(ids));
      }
    } catch { /* offline or table not applied yet — local list stands */ }

    set({ favoriteFoodIds: ids });
  },

  async toggleFavorite(food) {
    const userId = useAuthStore.getState().session?.user?.id;
    if (!userId) return;

    const current = get().favoriteFoodIds;
    const has = current.includes(food.id);
    const next = has ? current.filter((id) => id !== food.id) : [...current, food.id];
    set({ favoriteFoodIds: next });

    try {
      await AsyncStorage.setItem(favoritesStorageKey(userId), JSON.stringify(next));
    } catch { /* ignore */ }

    try {
      if (has) {
        await supabase.from('food_favorites').delete().eq('user_id', userId).eq('food_id', food.id);
      } else {
        await supabase.from('food_favorites').upsert(
          { user_id: userId, food_id: food.id },
          { onConflict: 'user_id,food_id' },
        );
      }
    } catch { /* offline or table not applied yet — local state is authoritative */ }
  },
}));

useAuthStore.subscribe((state, previous) => {
  if (state.user?.id !== previous.user?.id) useFoodStore.getState().resetForAccount();
});

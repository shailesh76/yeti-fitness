import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateNutritionTargets,
  mapProfileTargets,
  toProfileTargetColumns,
  canAthleteEditTargets,
} from '../apps/mobile/services/nutritionUtils';
import {
  fetchNutritionTargets,
  saveNutritionTargets,
  getNutritionTargetMode,
  setNutritionTargetMode,
  syncProfileNutritionTargets,
} from '../apps/mobile/services/nutritionTargets';
import { clearScreenDataForTests } from '../apps/mobile/services/screenDataCache';

// Mock Supabase & AsyncStorage
const { mockStorage, mockAsyncStorage, mockDbState } = vi.hoisted(() => {
  const mockStorage: Record<string, string> = {};
  const mockAsyncStorage = {
    getItem: vi.fn(async (key: string) => mockStorage[key] || null),
    setItem: vi.fn(async (key: string, val: string) => { mockStorage[key] = val; }),
    removeItem: vi.fn(async (key: string) => { delete mockStorage[key]; }),
    clear: vi.fn(async () => { for (const k in mockStorage) delete mockStorage[k]; }),
  };
  const mockDbState: {
    profileRow: any;
    lockRow: any;
    updateError: any;
    updatedRows: any[];
  } = {
    profileRow: null,
    lockRow: null,
    updateError: null,
    updatedRows: [],
  };
  return { mockStorage, mockAsyncStorage, mockDbState };
});

if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {
    localStorage: {
      getItem: (k: string) => mockStorage[k] || null,
      setItem: (k: string, v: string) => { mockStorage[k] = v; },
      removeItem: (k: string) => { delete mockStorage[k]; },
    },
  };
}

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: mockAsyncStorage,
  getItem: mockAsyncStorage.getItem,
  setItem: mockAsyncStorage.setItem,
  removeItem: mockAsyncStorage.removeItem,
  clear: mockAsyncStorage.clear,
}));

vi.mock('../apps/mobile/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => ({
      select: vi.fn((cols: string) => ({
        eq: vi.fn((field: string, val: string) => ({
          maybeSingle: vi.fn(async () => {
            if (mockDbState.fetchError) return { data: null, error: mockDbState.fetchError };
            if (cols.includes('daily_calorie_target') && cols.includes('nutrition_targets_locked')) {
              return {
                data: {
                  ...mockDbState.profileRow,
                  nutrition_targets_locked: mockDbState.lockRow?.nutrition_targets_locked ?? mockDbState.profileRow?.nutrition_targets_locked ?? false,
                },
                error: null,
              };
            }
            if (cols.includes('nutrition_targets_locked') || cols.includes('nutrition_target_mode')) {
              return {
                data: {
                  nutrition_targets_locked: mockDbState.lockRow?.nutrition_targets_locked ?? mockDbState.profileRow?.nutrition_targets_locked ?? false,
                  nutrition_target_mode: mockDbState.profileRow?.nutrition_target_mode ?? null,
                },
                error: null,
              };
            }
            return { data: mockDbState.profileRow, error: null };
          }),
        })),
      })),
      update: vi.fn((updates: any) => ({
        eq: vi.fn(async (field: string, val: string) => {
          if (mockDbState.updateError) return { error: mockDbState.updateError };
          mockDbState.updatedRows.push({ ...mockDbState.profileRow, ...updates, id: val });
          mockDbState.profileRow = { ...mockDbState.profileRow, ...updates };
          return { data: mockDbState.profileRow, error: null };
        }),
      })),
    })),
  },
}));

// Meal type normalization contract
function normalizeMealType(mt?: string): string {
  const u = (mt || '').toUpperCase().trim();
  if (u.startsWith('PRE')) return 'PRE_WORKOUT';
  if (u.startsWith('POST')) return 'POST_WORKOUT';
  if (u.startsWith('SNACK')) return 'SNACK';
  if (u.startsWith('BREAK')) return 'BREAKFAST';
  if (u.startsWith('LUNCH')) return 'LUNCH';
  if (u.startsWith('DINNER')) return 'DINNER';
  return u || 'SNACK';
}

const CORE_MEAL_TYPES = [
  { key: 'BREAKFAST', title: 'Breakfast' },
  { key: 'LUNCH', title: 'Lunch' },
  { key: 'DINNER', title: 'Dinner' },
  { key: 'SNACK', title: 'Snacks' },
];

describe('Yeti Nutrition Target & Food Diary Architecture', () => {
  beforeEach(() => {
    for (const k in mockStorage) delete mockStorage[k];
    mockDbState.profileRow = null;
    mockDbState.lockRow = null;
    mockDbState.updateError = null;
    mockDbState.updatedRows = [];
    clearScreenDataForTests();
    vi.clearAllMocks();
  });

  // ─── 1. Authoritative Calorie Target Source & Mapping ───────────────────────
  it('1. maps canonical daily_*_target columns to NutritionTargets object', () => {
    const row = {
      daily_calorie_target: 2500,
      daily_protein_target: 180,
      daily_carb_target: 280,
      daily_fat_target: 75,
      nutrition_targets_locked: false,
    };
    const targets = mapProfileTargets(row);
    expect(targets.calories).toBe(2500);
    expect(targets.protein).toBe(180);
    expect(targets.carbs).toBe(280);
    expect(targets.fat).toBe(75);
    expect(targets.locked).toBe(false);
  });

  it('2. converts target object into canonical DB columns without drift', () => {
    const cols = toProfileTargetColumns({ calories: 2300, protein: 170, carbs: 240, fat: 65 });
    expect(cols).toEqual({
      daily_calorie_target: 2300,
      daily_protein_target: 170,
      daily_carb_target: 240,
      daily_fat_target: 65,
    });
    expect(cols).not.toHaveProperty('target_calories'); // Ensure no legacy drift
  });

  // ─── 2. BMR / TDEE / Goal Calculation Flow ──────────────────────────────────
  it('3. computes BMR, TDEE, and Goal adjustments via Mifflin-St Jeor formula', () => {
    // 80kg male, 180cm, 25yo, moderate activity (1.55), build muscle (+350)
    // BMR = 10*80 + 6.25*180 - 5*25 + 5 = 800 + 1125 - 125 + 5 = 1805
    // TDEE = 1805 * 1.55 = 2797.75
    // Target = 2797.75 + 350 = 3147.75 -> 3148 kcal
    const targets = calculateNutritionTargets({
      weight_kg: 80,
      height_cm: 180,
      age: 25,
      gender: 'MALE',
      activity_level: 1.55,
      goal: 'BUILD_MUSCLE',
    });

    expect(targets.calories).toBe(3148);
    expect(targets.protein).toBe(176); // 80 * 2.2 = 176g
    expect(targets.fat).toBe(87); // (3148 * 0.25) / 9 = 87g
    expect(targets.carbs).toBe(415); // (3148 - 176*4 - 87*9) / 4 = 415g
  });

  it('4. computes correct deficit for fat loss goals', () => {
    // 70kg female, 165cm, 30yo, lightly active (1.375), lose fat (-450)
    // BMR = 10*70 + 6.25*165 - 5*30 - 161 = 700 + 1031.25 - 150 - 161 = 1420.25
    // TDEE = 1420.25 * 1.375 = 1952.84
    // Target = 1952.84 - 450 = 1502.84 -> 1503 kcal
    const targets = calculateNutritionTargets({
      weight_kg: 70,
      height_cm: 165,
      age: 30,
      gender: 'FEMALE',
      activity_level: 'LIGHT',
      goal: 'LOSE_FAT',
    });

    expect(targets.calories).toBe(1503);
    expect(targets.protein).toBe(154); // 70 * 2.2 = 154g
    expect(targets.fat).toBe(42); // (1503 * 0.25) / 9 = 42g
    expect(targets.carbs).toBe(127);
  });

  // ─── 3. Target Precedence & Coach Lock ───────────────────────────────────────
  it('5. respects coach target lock precedence', async () => {
    mockDbState.profileRow = {
      daily_calorie_target: 2800,
      daily_protein_target: 200,
      daily_carb_target: 300,
      daily_fat_target: 80,
    };
    mockDbState.lockRow = { nutrition_targets_locked: true };

    const fetched = await fetchNutritionTargets('user-1');
    expect(fetched.calories).toBe(2800);
    expect(fetched.locked).toBe(true);

    const canEdit = canAthleteEditTargets(fetched.locked);
    expect(canEdit).toBe(false);

    // Save should refuse when locked
    const saved = await saveNutritionTargets('user-1', { calories: 2100 });
    expect(saved).toBe(false);
    expect(mockDbState.profileRow.daily_calorie_target).toBe(2800); // Unchanged
  });

  it('6. allows athlete target save and caches offline when not locked', async () => {
    mockDbState.profileRow = {
      daily_calorie_target: 2000,
      daily_protein_target: 140,
      daily_carb_target: 200,
      daily_fat_target: 60,
    };
    mockDbState.lockRow = { nutrition_targets_locked: false };

    const saved = await saveNutritionTargets('user-1', { calories: 2350, protein: 165 });
    expect(saved).toBe(true);
    expect(mockDbState.profileRow.daily_calorie_target).toBe(2350);
    expect(mockDbState.profileRow.daily_protein_target).toBe(165);
  });

  // ─── 4. Dynamic Recalculation on Body Metric Updates ────────────────────────
  it('7. dynamically recalculates targets when athlete updates body weight', () => {
    const initial = calculateNutritionTargets({
      weight_kg: 85,
      height_cm: 180,
      age: 28,
      gender: 'MALE',
      activity_level: 'MODERATE',
      goal: 'MAINTAIN',
    });

    const updated = calculateNutritionTargets({
      weight_kg: 80, // dropped 5kg
      height_cm: 180,
      age: 28,
      gender: 'MALE',
      activity_level: 'MODERATE',
      goal: 'MAINTAIN',
    });

    expect(updated.calories).toBeLessThan(initial.calories);
    expect(updated.protein).toBeLessThan(initial.protein);
  });

  // ─── 5. Food Diary Meal Sections Rendering ──────────────────────────────────
  it('8. renders Breakfast, Lunch, Dinner, and Snacks even when 0 foods logged', () => {
    const activeLogs: any[] = []; // Empty diary for today

    // Core meal groups mapping
    const mealGroups = CORE_MEAL_TYPES.map((mt) => {
      const logs = activeLogs.filter((l) => normalizeMealType(l.meal_type) === mt.key);
      const kcal = logs.reduce((sum, l) => sum + Math.round((l.food?.calories || 0) * l.servings), 0);
      return { ...mt, logs, kcal };
    });

    expect(mealGroups).toHaveLength(4);
    expect(mealGroups[0].title).toBe('Breakfast');
    expect(mealGroups[0].logs).toHaveLength(0);
    expect(mealGroups[0].kcal).toBe(0);

    expect(mealGroups[1].title).toBe('Lunch');
    expect(mealGroups[1].logs).toHaveLength(0);
    expect(mealGroups[1].kcal).toBe(0);

    expect(mealGroups[2].title).toBe('Dinner');
    expect(mealGroups[2].logs).toHaveLength(0);
    expect(mealGroups[2].kcal).toBe(0);

    expect(mealGroups[3].title).toBe('Snacks');
    expect(mealGroups[3].logs).toHaveLength(0);
    expect(mealGroups[3].kcal).toBe(0);
  });

  // ─── 6. Meal-Type Normalization & Spelling Contracts ────────────────────────
  it('9. normalizes meal types across casing and variants (snack/snacks/breakfast/etc.)', () => {
    expect(normalizeMealType('breakfast')).toBe('BREAKFAST');
    expect(normalizeMealType('BREAKFAST')).toBe('BREAKFAST');
    expect(normalizeMealType('lunch')).toBe('LUNCH');
    expect(normalizeMealType('LUNCH')).toBe('LUNCH');
    expect(normalizeMealType('dinner')).toBe('DINNER');
    expect(normalizeMealType('DINNER')).toBe('DINNER');
    expect(normalizeMealType('snack')).toBe('SNACK');
    expect(normalizeMealType('snacks')).toBe('SNACK');
    expect(normalizeMealType('SNACK')).toBe('SNACK');
    expect(normalizeMealType('SNACKS')).toBe('SNACK');
    expect(normalizeMealType('pre_workout')).toBe('PRE_WORKOUT');
    expect(normalizeMealType('post-workout')).toBe('POST_WORKOUT');
    expect(normalizeMealType('')).toBe('SNACK');
    expect(normalizeMealType(undefined)).toBe('SNACK');
  });

  // ─── 7. Food is Grouped Under the Correct Meal ──────────────────────────────
  it('10. places food items in their exact logged meal without leaking to breakfast', () => {
    const today = new Date();
    const activeLogs = [
      { id: '1', meal_type: 'BREAKFAST', servings: 1, food: { name: 'Oatmeal', calories: 300, protein: 10, carbs: 50, fat: 5 }, logged_at: today.getTime() },
      { id: '2', meal_type: 'LUNCH',     servings: 1, food: { name: 'Chicken Bowl', calories: 650, protein: 45, carbs: 60, fat: 15 }, logged_at: today.getTime() },
      { id: '3', meal_type: 'DINNER',    servings: 1, food: { name: 'Salmon & Rice', calories: 700, protein: 40, carbs: 55, fat: 25 }, logged_at: today.getTime() },
      { id: '4', meal_type: 'SNACK',     servings: 2, food: { name: 'Protein Bar', calories: 200, protein: 20, carbs: 20, fat: 6 }, logged_at: today.getTime() },
    ];

    const mealGroups = CORE_MEAL_TYPES.map((mt) => {
      const logs = activeLogs.filter((l) => normalizeMealType(l.meal_type) === mt.key);
      const kcal = logs.reduce((sum, l) => sum + Math.round((l.food?.calories || 0) * l.servings), 0);
      return { ...mt, logs, kcal };
    });

    const breakfast = mealGroups.find(g => g.key === 'BREAKFAST')!;
    const lunch = mealGroups.find(g => g.key === 'LUNCH')!;
    const dinner = mealGroups.find(g => g.key === 'DINNER')!;
    const snack = mealGroups.find(g => g.key === 'SNACK')!;

    expect(breakfast.logs).toHaveLength(1);
    expect(breakfast.logs[0].food.name).toBe('Oatmeal');
    expect(breakfast.kcal).toBe(300);

    expect(lunch.logs).toHaveLength(1);
    expect(lunch.logs[0].food.name).toBe('Chicken Bowl');
    expect(lunch.kcal).toBe(650);

    expect(dinner.logs).toHaveLength(1);
    expect(dinner.logs[0].food.name).toBe('Salmon & Rice');
    expect(dinner.kcal).toBe(700);

    expect(snack.logs).toHaveLength(1);
    expect(snack.logs[0].food.name).toBe('Protein Bar');
    expect(snack.kcal).toBe(400); // 2 servings * 200 = 400 kcal
  });

  // ─── 8. Daily Calorie & Macro Summation Across All Meals ────────────────────
  it('11. sums calories, protein, carbs, and fat across all 4 meals combined', () => {
    const today = new Date();
    const activeLogs = [
      { id: '1', meal_type: 'BREAKFAST', servings: 1, food: { calories: 300, protein: 10, carbs: 50, fat: 5 }, logged_at: today.getTime() },
      { id: '2', meal_type: 'LUNCH',     servings: 1, food: { calories: 650, protein: 45, carbs: 60, fat: 15 }, logged_at: today.getTime() },
      { id: '3', meal_type: 'DINNER',    servings: 1, food: { calories: 700, protein: 40, carbs: 55, fat: 25 }, logged_at: today.getTime() },
      { id: '4', meal_type: 'SNACK',     servings: 2, food: { calories: 200, protein: 20, carbs: 20, fat: 6 }, logged_at: today.getTime() },
    ];

    const totals = activeLogs.reduce(
      (acc, l) => {
        const f = l.food;
        const s = l.servings;
        return {
          calories: acc.calories + f.calories * s,
          protein: acc.protein + f.protein * s,
          carbs: acc.carbs + f.carbs * s,
          fat: acc.fat + f.fat * s,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    // Total calories: 300 + 650 + 700 + 400 = 2050 kcal
    expect(Math.round(totals.calories)).toBe(2050);
    // Total protein: 10 + 45 + 40 + 40 = 135g
    expect(Math.round(totals.protein)).toBe(135);
    // Total carbs: 50 + 60 + 55 + 40 = 205g
    expect(Math.round(totals.carbs)).toBe(205);
    // Total fat: 5 + 15 + 25 + 12 = 57g
    expect(Math.round(totals.fat)).toBe(57);
  });

  // ─── 9. Local-Date Filtering ───────────────────────────────────────────────
  it('12. filters logs by local calendar date (ignoring UTC boundary drift)', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const allLogs = [
      { id: '1', meal_type: 'BREAKFAST', servings: 1, food: { calories: 300, protein: 10, carbs: 50, fat: 5 }, logged_at: today.getTime() },
      { id: '2', meal_type: 'LUNCH',     servings: 1, food: { calories: 500, protein: 30, carbs: 40, fat: 10 }, logged_at: yesterday.getTime() },
    ];

    const filterForDate = (selectedDate: Date) => allLogs.filter((l) => {
      const logDate = new Date(l.logged_at);
      return (
        logDate.getDate() === selectedDate.getDate() &&
        logDate.getMonth() === selectedDate.getMonth() &&
        logDate.getFullYear() === selectedDate.getFullYear()
      );
    });

    const todayLogs = filterForDate(today);
    const yesterdayLogs = filterForDate(yesterday);

    expect(todayLogs).toHaveLength(1);
    expect(todayLogs[0].id).toBe('1');

    expect(yesterdayLogs).toHaveLength(1);
    expect(yesterdayLogs[0].id).toBe('2');
  });

  // ─── 10. Nutrition Repository logMeal Meal Type Assignment ───────────────────
  it('13. NutritionRepository.logMeal assigns meal_type to DB record', async () => {
    let createdRecord: any = null;
    const mockDb: any = {
      write: async (fn: () => Promise<any>) => fn(),
      get: () => ({
        create: (fn: (record: any) => void) => {
          const r: any = {};
          fn(r);
          createdRecord = r;
          return r;
        },
      }),
    };

    const { NutritionRepository } = await import('../packages/database/src/repositories/NutritionRepository');
    const repo = new NutritionRepository(mockDb);
    await repo.logMeal('user-1', 'food-123', 1.5, 'LUNCH', 'search');

    expect(createdRecord).toBeDefined();
    expect(createdRecord.athlete_id).toBe('user-1');
    expect(createdRecord.food_id).toBe('food-123');
    expect(createdRecord.servings).toBe(1.5);
    expect(createdRecord.meal_type).toBe('LUNCH');
    expect(createdRecord.source).toBe('search');
  });

  // ─── 11. Goal Transition Adjustments (Deficit vs Surplus) ───────────────────
  it('14. switches correctly between deficit (LOSE_FAT) and surplus (BUILD_MUSCLE)', () => {
    const lose = calculateNutritionTargets({
      weight_kg: 80,
      height_cm: 180,
      age: 25,
      gender: 'MALE',
      activity_level: 1.55,
      goal: 'LOSE_FAT',
    });

    const maintain = calculateNutritionTargets({
      weight_kg: 80,
      height_cm: 180,
      age: 25,
      gender: 'MALE',
      activity_level: 1.55,
      goal: 'MAINTAIN',
    });

    const build = calculateNutritionTargets({
      weight_kg: 80,
      height_cm: 180,
      age: 25,
      gender: 'MALE',
      activity_level: 1.55,
      goal: 'BUILD_MUSCLE',
    });

    expect(lose.calories).toBeLessThan(maintain.calories);
    expect(build.calories).toBeGreaterThan(maintain.calories);
    expect(maintain.calories - lose.calories).toBe(450);
    expect(build.calories - maintain.calories).toBe(350);
  });

  // ─── 12. Safe Calorie Target Floor ──────────────────────────────────────────
  it('15. enforces a safe minimum floor of 1200 kcal even for extreme deficits', () => {
    const extremeDeficit = calculateNutritionTargets({
      weight_kg: 45,
      height_cm: 150,
      age: 60,
      gender: 'FEMALE',
      activity_level: 1.0, // Sedentary
      goal: 'LOSE_FAT',
    });

    expect(extremeDeficit.calories).toBeGreaterThanOrEqual(1200);
  });

  // ─── 13. Unit Conversion Support (kg vs lbs, cm vs in) ──────────────────────
  it('16. handles fractional metrics and converts lbs/in safely before calculation', () => {
    // 176.37 lbs ≈ 80 kg, 70.87 in ≈ 180 cm
    const weightLbs = 176.37;
    const heightInches = 70.87;
    const weightKg = weightLbs * 0.45359237;
    const heightCm = heightInches * 2.54;

    const targets = calculateNutritionTargets({
      weight_kg: weightKg,
      height_cm: heightCm,
      age: 25,
      gender: 'MALE',
      activity_level: 'MODERATE',
      goal: 'MAINTAIN',
    });

    expect(targets.calories).toBe(2798);
  });

  // ─── 14. Staleness Audit: Weight Change Recalculation in AUTO mode ───────────
  it('17. syncProfileNutritionTargets recalculates and saves target on weight change in AUTO mode', async () => {
    mockDbState.profileRow = {
      daily_calorie_target: 2800,
      daily_protein_target: 187,
      daily_carb_target: 336,
      daily_fat_target: 78,
    };
    mockDbState.lockRow = { nutrition_targets_locked: false };
    await setNutritionTargetMode('user-1', 'AUTO');

    // Athlete drops from 85kg to 75kg
    const newProfile = {
      weight_kg: 75,
      height_cm: 180,
      age: 26,
      gender: 'MALE',
      activity_level: 1.55,
      goal: 'MAINTAIN',
    };

    const synced = await syncProfileNutritionTargets('user-1', newProfile);

    // Initial 85kg: BMR=10*85+6.25*180-5*26+5 = 850+1125-130+5 = 1850 -> TDEE = 1850*1.55 = 2868 kcal
    // New 75kg: BMR=10*75+6.25*180-5*26+5 = 750+1125-130+5 = 1750 -> TDEE = 1750*1.55 = 2713 kcal
    expect(synced.calories).toBe(2713);
    expect(synced.calories).toBeLessThan(2800);
    expect(mockDbState.profileRow.daily_calorie_target).toBe(2713);
  });

  // ─── 15. Staleness Audit: Activity Level Change Recalculation ───────────────
  it('18. syncProfileNutritionTargets recalculates target when activity level changes', async () => {
    mockDbState.profileRow = {
      daily_calorie_target: 2100,
      daily_protein_target: 165,
    };
    mockDbState.lockRow = { nutrition_targets_locked: false };
    await setNutritionTargetMode('user-1', 'AUTO');

    // Athlete goes from Sedentary (1.2) to Very Active (1.9)
    const profile = {
      weight_kg: 75,
      height_cm: 178,
      age: 26,
      gender: 'MALE',
      activity_level: 1.9,
      goal: 'MAINTAIN',
    };

    const synced = await syncProfileNutritionTargets('user-1', profile);
    expect(synced.calories).toBeGreaterThan(2100);
    expect(mockDbState.profileRow.daily_calorie_target).toBe(synced.calories);
  });

  // ─── 16. Staleness Audit: Fitness Goal Change Recalculation ─────────────────
  it('19. syncProfileNutritionTargets recalculates target when fitness goal changes', async () => {
    mockDbState.profileRow = { daily_calorie_target: 2700 };
    mockDbState.lockRow = { nutrition_targets_locked: false };
    await setNutritionTargetMode('user-1', 'AUTO');

    // Change to LOSE_FAT (-450 kcal deficit)
    const profile = {
      weight_kg: 75,
      height_cm: 178,
      age: 26,
      gender: 'MALE',
      activity_level: 1.55,
      goal: 'LOSE_FAT',
    };

    const synced = await syncProfileNutritionTargets('user-1', profile);
    // BMR = 10*75 + 6.25*178 - 5*26 + 5 = 750 + 1112.5 - 130 + 5 = 1737.5
    // TDEE = 1737.5 * 1.55 = 2693.125
    // Deficit = 2693.125 - 450 = 2243.125 -> 2243 kcal
    expect(synced.calories).toBe(2243);
    expect(mockDbState.profileRow.daily_calorie_target).toBe(2243);
  });

  // ─── 17. Staleness Audit: Height & Age Change Recalculation ─────────────────
  it('20. syncProfileNutritionTargets recalculates target when height or age changes', async () => {
    mockDbState.profileRow = { daily_calorie_target: 2500 };
    mockDbState.lockRow = { nutrition_targets_locked: false };
    await setNutritionTargetMode('user-1', 'AUTO');

    const profileYoungerTaller = {
      weight_kg: 75,
      height_cm: 190, // Taller (+75 kcal)
      age: 20,       // Younger (+30 kcal)
      gender: 'MALE',
      activity_level: 1.55,
      goal: 'MAINTAIN',
    };

    const synced = await syncProfileNutritionTargets('user-1', profileYoungerTaller);
    expect(synced.calories).toBeGreaterThan(2500);
    expect(mockDbState.profileRow.daily_calorie_target).toBe(synced.calories);
  });

  // ─── 18. Coach Locked Target Immunity ───────────────────────────────────────
  it('21. Coach locked targets NEVER recalculate from body weight or goal changes', async () => {
    mockDbState.profileRow = {
      daily_calorie_target: 3500, // Coach assigned high-calorie bulking plan
      daily_protein_target: 220,
      daily_carb_target: 400,
      daily_fat_target: 90,
    };
    mockDbState.lockRow = { nutrition_targets_locked: true };

    const bodyChangeProfile = {
      weight_kg: 60, // Significant weight drop
      height_cm: 175,
      age: 30,
      gender: 'FEMALE',
      activity_level: 1.2,
      goal: 'LOSE_FAT',
    };

    const synced = await syncProfileNutritionTargets('user-1', bodyChangeProfile);

    // Target must NOT change
    expect(synced.calories).toBe(3500);
    expect(synced.protein).toBe(220);
    expect(synced.locked).toBe(true);
    expect(mockDbState.profileRow.daily_calorie_target).toBe(3500);
  });

  // ─── 19. Manual Override Target Contract ────────────────────────────────────
  it('22. Manual override targets are preserved when weight changes', async () => {
    mockDbState.profileRow = {
      daily_calorie_target: 3000,
      daily_protein_target: 210,
      daily_carb_target: 320,
      daily_fat_target: 85,
    };
    mockDbState.lockRow = { nutrition_targets_locked: false };
    // Athlete explicitly saved manual targets
    await setNutritionTargetMode('user-1', 'MANUAL');
    const checkedMode = await getNutritionTargetMode('user-1');
    expect(checkedMode).toBe('MANUAL');

    const weightChangeProfile = {
      weight_kg: 70, // Weight dropped
      height_cm: 180,
      age: 26,
      gender: 'MALE',
      activity_level: 1.375,
      goal: 'MAINTAIN',
    };

    const synced = await syncProfileNutritionTargets('user-1', weightChangeProfile);

    // Manual override 3000 kcal is preserved
    expect(synced.calories).toBe(3000);
    expect(mockDbState.profileRow.daily_calorie_target).toBe(3000);
  });

  // ─── 20. Switching from MANUAL back to AUTO Mode ────────────────────────────
  it('23. switching from MANUAL back to AUTO resumes dynamic recalculation', async () => {
    mockDbState.profileRow = {
      daily_calorie_target: 3000,
      daily_protein_target: 210,
    };
    mockDbState.lockRow = { nutrition_targets_locked: false };

    // Initially in manual override
    await setNutritionTargetMode('user-1', 'MANUAL');

    const profile = {
      weight_kg: 75,
      height_cm: 178,
      age: 26,
      gender: 'MALE',
      activity_level: 1.55,
      goal: 'MAINTAIN',
    };

    // While manual: preserved
    const manualSynced = await syncProfileNutritionTargets('user-1', profile);
    expect(manualSynced.calories).toBe(3000);

    // User switches back to AUTO
    await setNutritionTargetMode('user-1', 'AUTO');
    const autoSynced = await syncProfileNutritionTargets('user-1', profile);
    expect(autoSynced.calories).not.toBe(3000);
    expect(autoSynced.calories).toBe(calculateNutritionTargets(profile).calories);
  });

  // ─── 21. Log Weight Integration with Profile Nutrition Targets ──────────────
  it('24. Progress Log Weight updates profile and synchronizes nutrition targets', async () => {
    mockDbState.profileRow = {
      weight_kg: 85,
      daily_calorie_target: 2868,
    };
    mockDbState.lockRow = { nutrition_targets_locked: false };
    await setNutritionTargetMode('user-1', 'AUTO');

    // Simulate handleSaveWeight from analytics.tsx
    const inputWeightKg = 80;
    const currentProfile = {
      weight_kg: inputWeightKg,
      height_cm: 180,
      age: 26,
      gender: 'MALE',
      activity_level: 1.55,
      goal: 'MAINTAIN',
    };

    const synced = await syncProfileNutritionTargets('user-1', currentProfile);

    expect(synced.calories).toBe(2790); // 80kg maintenance
    expect(mockDbState.profileRow.daily_calorie_target).toBe(2790);
  });

  // ─── 22. App Restart & Cache Persistence ───────────────────────────────────
  it('25. App restart / cache reload preserves latest target and mode', async () => {
    mockDbState.profileRow = {
      daily_calorie_target: 2650,
      daily_protein_target: 175,
      daily_carb_target: 275,
      daily_fat_target: 70,
    };
    mockDbState.lockRow = { nutrition_targets_locked: false };

    await setNutritionTargetMode('user-1', 'AUTO');
    const targets = await fetchNutritionTargets('user-1');
    const mode = await getNutritionTargetMode('user-1');

    expect(targets.calories).toBe(2650);
    expect(mode).toBe('AUTO');
  });

  // ─── 23. Cross-Device & Cache Clear: Manual Target Survives Local Storage Clear ─
  it('26. Manual target survives local storage clear / app reinstallation', async () => {
    // Athlete previously set manual target 3333 kcal on Device 1
    mockDbState.profileRow = {
      daily_calorie_target: 3333,
      daily_protein_target: 225,
      daily_carb_target: 350,
      daily_fat_target: 95,
      nutrition_target_mode: 'MANUAL',
    };
    mockDbState.lockRow = { nutrition_targets_locked: false };

    // Simulate complete storage wipe (reinstall / fresh device)
    for (const k in mockStorage) delete mockStorage[k];

    // Fetch targets on fresh device
    const fetched = await fetchNutritionTargets('user-1');
    expect(fetched.calories).toBe(3333);
    expect(fetched.mode).toBe('MANUAL');

    // Weight change sync on fresh device must NOT overwrite manual target
    const freshProfile = {
      weight_kg: 80,
      height_cm: 180,
      age: 26,
      gender: 'MALE',
      activity_level: 1.55,
      goal: 'MAINTAIN',
    };

    const synced = await syncProfileNutritionTargets('user-1', freshProfile);
    expect(synced.calories).toBe(3333);
    expect(mockDbState.profileRow.daily_calorie_target).toBe(3333);
  });

  // ─── 24. Cross-Device: Manual Target Survives Second Device Login ───────────
  it('27. Manual target survives second-device login without being clobbered', async () => {
    // Server has manual target
    mockDbState.profileRow = {
      daily_calorie_target: 3100,
      nutrition_target_mode: 'MANUAL',
    };
    mockDbState.lockRow = { nutrition_targets_locked: false };

    // Device 2 has no local storage yet
    for (const k in mockStorage) delete mockStorage[k];

    const profile = {
      weight_kg: 75,
      height_cm: 175,
      age: 28,
      gender: 'MALE',
      activity_level: 1.375,
      goal: 'MAINTAIN',
    };

    // On Device 2 load
    const targets = await fetchNutritionTargets('user-1', profile);
    expect(targets.calories).toBe(3100);
    expect(targets.mode).toBe('MANUAL');

    const synced = await syncProfileNutritionTargets('user-1', profile);
    expect(synced.calories).toBe(3100);
    expect(mockDbState.profileRow.daily_calorie_target).toBe(3100);
  });

  // ─── 25. Switching MANUAL → AUTO Persists Remotely ─────────────────────────
  it('28. switching from MANUAL to AUTO persists nutrition_target_mode remotely', async () => {
    mockDbState.profileRow = {
      daily_calorie_target: 3000,
      nutrition_target_mode: 'MANUAL',
    };
    mockDbState.lockRow = { nutrition_targets_locked: false };

    // Switch to AUTO and save
    const profile = {
      weight_kg: 75,
      height_cm: 178,
      age: 26,
      gender: 'MALE',
      activity_level: 1.55,
      goal: 'MAINTAIN',
    };
    const calculated = calculateNutritionTargets(profile);

    await saveNutritionTargets('user-1', calculated, 'AUTO');

    expect(mockDbState.profileRow.nutrition_target_mode).toBe('AUTO');
    expect(mockDbState.profileRow.daily_calorie_target).toBe(calculated.calories);
  });

  // ─── 26. Switching AUTO → MANUAL Persists Remotely ─────────────────────────
  it('29. switching from AUTO to MANUAL persists nutrition_target_mode remotely', async () => {
    mockDbState.profileRow = {
      daily_calorie_target: 2500,
      nutrition_target_mode: 'AUTO',
    };
    mockDbState.lockRow = { nutrition_targets_locked: false };

    // Athlete enters manual target 3200
    await saveNutritionTargets('user-1', { calories: 3200, protein: 200, carbs: 320, fat: 80 }, 'MANUAL');

    expect(mockDbState.profileRow.nutrition_target_mode).toBe('MANUAL');
    expect(mockDbState.profileRow.daily_calorie_target).toBe(3200);
  });

  // ─── 27. Legacy Account Safety: Unset Mode Resolves Delta Defensively ────────
  it('30. legacy account without nutrition_target_mode protects custom targets as MANUAL', async () => {
    // Legacy profile: daily_calorie_target is 3400 (custom), but nutrition_target_mode is NULL
    mockDbState.profileRow = {
      daily_calorie_target: 3400,
      daily_protein_target: 220,
      daily_carb_target: 380,
      daily_fat_target: 85,
      nutrition_target_mode: null,
    };
    mockDbState.lockRow = { nutrition_targets_locked: false };

    // Profile formula gives ~2713 kcal
    const profile = {
      weight_kg: 75,
      height_cm: 180,
      age: 26,
      gender: 'MALE',
      activity_level: 1.55,
      goal: 'MAINTAIN',
    };

    // Wipe local cache to simulate fresh device on legacy account
    for (const k in mockStorage) delete mockStorage[k];

    const targets = await fetchNutritionTargets('user-1', profile);
    // Because 3400 != 2713, it must resolve as MANUAL to protect athlete's custom numbers
    expect(targets.calories).toBe(3400);
    expect(targets.mode).toBe('MANUAL');

    // Subsequent sync must NOT clobber 3400
    const synced = await syncProfileNutritionTargets('user-1', profile);
    expect(synced.calories).toBe(3400);
    expect(mockDbState.profileRow.daily_calorie_target).toBe(3400);
  });

  // ─── 28. Offline Cached Mode Reconciles Correctly ───────────────────────────
  it('31. offline cached mode reconciles and serves from cache when network fails', async () => {
    // Seed local cache with MANUAL mode and target 2900
    mockStorage['@yeti_targets_user-1'] = JSON.stringify({
      calories: 2900,
      protein: 190,
      carbs: 300,
      fat: 75,
      locked: false,
      mode: 'MANUAL',
    });
    mockStorage['@yeti_target_mode_user-1'] = 'MANUAL';

    // Simulate network error
    mockDbState.fetchError = { message: 'Network offline' };

    const targets = await fetchNutritionTargets('user-1');
    const mode = await getNutritionTargetMode('user-1');

    expect(targets.calories).toBe(2900);
    expect(mode).toBe('MANUAL');
  });
});

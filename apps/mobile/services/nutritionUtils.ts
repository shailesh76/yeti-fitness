// Pure, dependency-free nutrition helpers (no react-native / expo / supabase
// imports) so they are unit-testable in the node vitest environment and safely
// reusable across the app. All parsing, validation, unit-normalization, Open
// Food Facts mapping, the dev-only barcode mocks, and the small
// recent/favorites/water helpers live here.

// ─── The one normalized internal nutrition shape (Part 6) ───────────────────────
export type NutritionSource =
  | 'open_food_facts'
  | 'usda'
  | 'yeti_cache'
  | 'ai_estimate'
  | 'manual'
  | 'dev_mock';

export interface NutritionRecord {
  source: NutritionSource;
  external_id: string | null;
  barcode: string | null;
  name: string;
  brand: string | null;
  serving_quantity: number | null;
  serving_unit: string | null;
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
  fiber_per_100g: number | null;
  sugar_per_100g: number | null;
  sodium_mg_per_100g: number | null;
  ingredients: string | null;
  allergens: string | null;
  image_url: string | null;
  nutrition_grade: string | null;
  labels: string[] | null;
  verified_at: string | null;
}

export interface FoodPhotoAnalysis {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number | null;
}

export interface BarcodeProductInfo {
  name: string;
  brand: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_size: string;
  fiber: number | null;
  sugar: number | null;
  sodium_mg: number | null;
  ingredients: string | null;
  allergens: string | null;
  image_url: string | null;
  nutrition_grade: string | null;
  record: NutritionRecord;
}

// ─── numeric validation / unit normalization ────────────────────────────────────
/** Finite, non-negative, within cap → rounded number; otherwise null (never 0). */
export function validNum(value: unknown, maxCap: number): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > maxCap) return null;
  return Math.round(n * 100) / 100;
}

/** Open Food Facts energy → kcal per 100 g (handles kcal and kJ fields). */
export function kcalPer100g(nutriments: Record<string, any>): number | null {
  const kcal = validNum(nutriments['energy-kcal_100g'] ?? nutriments['energy-kcal'], 900);
  if (kcal !== null) return kcal;
  const kj = nutriments['energy-kj_100g'] ?? nutriments['energy_100g'];
  if (kj !== undefined && kj !== null) return validNum(Number(kj) * 0.239006, 900);
  return null;
}

/** OFF sodium_100g is grams → mg; falls back to salt_100g (salt ≈ 2.5 × sodium). */
export function sodiumMgPer100g(nutriments: Record<string, any>): number | null {
  if (nutriments['sodium_100g'] !== undefined && nutriments['sodium_100g'] !== null) {
    return validNum(Number(nutriments['sodium_100g']) * 1000, 100000);
  }
  if (nutriments['salt_100g'] !== undefined && nutriments['salt_100g'] !== null) {
    return validNum((Number(nutriments['salt_100g']) / 2.5) * 1000, 100000);
  }
  return null;
}

// ─── Open Food Facts product → normalized BarcodeProductInfo ─────────────────────
/**
 * Maps a raw Open Food Facts API response to a normalized product, or null when
 * the product is genuinely absent (status 0 / no name). Missing nutrients stay
 * null (never fabricated as 0); the source is always preserved.
 */
export function mapOpenFoodFactsProduct(json: any, barcode: string): BarcodeProductInfo | null {
  if (!json || json.status === 0 || !json.product || !json.product.product_name) return null;

  const p = json.product;
  const n = p.nutriments || {};

  const calories_per_100g = kcalPer100g(n);
  const protein_per_100g = validNum(n.proteins_100g, 100);
  const carbs_per_100g = validNum(n.carbohydrates_100g, 100);
  const fat_per_100g = validNum(n.fat_100g, 100);
  const fiber_per_100g = validNum(n.fiber_100g, 100);
  const sugar_per_100g = validNum(n.sugars_100g, 100);
  const sodium_mg_per_100g = sodiumMgPer100g(n);

  const servingRaw: string = p.serving_size || '';
  const servingMatch = servingRaw.match(/([\d.]+)\s*([a-zA-Z]+)/);
  const serving_quantity = servingMatch ? validNum(servingMatch[1], 100000) : null;
  const serving_unit = servingMatch ? servingMatch[2].toLowerCase() : null;

  const labelsRaw: string = p.labels || '';
  const labels = labelsRaw
    ? labelsRaw.split(',').map((l: string) => l.trim()).filter(Boolean)
    : null;

  const grade = (p.nutrition_grades || p.nutrition_grade_fr || '') as string;

  const record: NutritionRecord = {
    source: 'open_food_facts',
    external_id: String(p.code || barcode),
    barcode,
    name: p.product_name,
    brand: p.brands || null,
    serving_quantity,
    serving_unit,
    calories_per_100g,
    protein_per_100g,
    carbs_per_100g,
    fat_per_100g,
    fiber_per_100g,
    sugar_per_100g,
    sodium_mg_per_100g,
    ingredients: p.ingredients_text || null,
    allergens: p.allergens || null,
    image_url: p.image_url || p.image_front_url || null,
    nutrition_grade: grade ? grade.toLowerCase() : null,
    labels: labels && labels.length ? labels : null,
    verified_at: null,
  };

  return {
    name: record.name,
    brand: record.brand || 'Unknown Brand',
    calories: calories_per_100g ?? 0,
    protein: protein_per_100g ?? 0,
    carbs: carbs_per_100g ?? 0,
    fat: fat_per_100g ?? 0,
    serving_size: servingRaw || '100g',
    fiber: fiber_per_100g,
    sugar: sugar_per_100g,
    sodium_mg: sodium_mg_per_100g,
    ingredients: record.ingredients,
    allergens: record.allergens,
    image_url: record.image_url,
    nutrition_grade: record.nutrition_grade,
    record,
  };
}

// ─── Development-only barcode mocks ──────────────────────────────────────────────
function buildMockRecord(
  barcode: string, name: string, brand: string,
  calories: number, protein: number, carbs: number, fat: number, serving: string,
): BarcodeProductInfo {
  return {
    name, brand, calories, protein, carbs, fat, serving_size: serving,
    fiber: null, sugar: null, sodium_mg: null, ingredients: null, allergens: null,
    image_url: null, nutrition_grade: null,
    record: {
      source: 'dev_mock', external_id: barcode, barcode, name, brand,
      serving_quantity: null, serving_unit: null,
      calories_per_100g: calories, protein_per_100g: protein, carbs_per_100g: carbs, fat_per_100g: fat,
      fiber_per_100g: null, sugar_per_100g: null, sodium_mg_per_100g: null,
      ingredients: null, allergens: null, image_url: null, nutrition_grade: null, labels: null,
      verified_at: null,
    },
  };
}

const DEV_MOCK_PRODUCTS: Record<string, BarcodeProductInfo> = {
  '00123456': buildMockRecord('00123456', 'Chobani Greek Yogurt - Blueberry', 'Chobani', 120, 12, 15, 0, '150g'),
  '4900003675': buildMockRecord('4900003675', 'Coca-Cola Classic', 'Coca-Cola', 140, 0, 39, 0, '355ml'),
  '00705621': buildMockRecord('00705621', 'Quest Protein Bar', 'Quest Nutrition', 200, 21, 21, 9, '60g'),
  '00413310': buildMockRecord('00413310', 'Skippy Creamy Peanut Butter', 'Skippy', 190, 7, 6, 16, '32g'),
};

/**
 * Dev-only stub lookup. Returns a mock ONLY when `isDev` is true, so production
 * builds (isDev === false) can never receive fabricated product data.
 */
export function resolveDevMock(barcode: string, isDev: boolean): BarcodeProductInfo | null {
  if (!isDev) return null;
  return DEV_MOCK_PRODUCTS[barcode] || null;
}

// ─── AI analysis combine (confidence is never fabricated) ────────────────────────
export function combineFoodAnalysis(items: any[]): FoodPhotoAnalysis {
  return {
    name: items.map((item) => item.name || 'Unnamed food').join(' + '),
    calories: Math.round(items.reduce((sum, item) => sum + (Number(item.calories) || 0), 0)),
    protein: Math.round(items.reduce((sum, item) => sum + (Number(item.protein) || 0), 0) * 10) / 10,
    carbs: Math.round(items.reduce((sum, item) => sum + (Number(item.carbs) || 0), 0) * 10) / 10,
    fat: Math.round(items.reduce((sum, item) => sum + (Number(item.fat) || 0), 0) * 10) / 10,
    confidence: null,
  };
}

// ─── Recent / favorites / water helpers (beta usability) ─────────────────────────
/** Most-recently-logged unique foods; expects logs newest-first. */
export function dedupeRecentFoods<T extends { id: string }>(
  logs: { food?: T }[],
  limit = 12,
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const log of logs) {
    const f = log.food;
    if (!f || seen.has(f.id)) continue;
    seen.add(f.id);
    out.push(f);
    if (out.length >= limit) break;
  }
  return out;
}

/** Per-user AsyncStorage key so favorites are strictly user-specific. */
export function favoritesStorageKey(userId: string): string {
  return `@yeti_favorites_${userId}`;
}

/** A single water add must be a positive integer up to a sane per-entry cap. */
export function isValidWaterMl(ml: number): boolean {
  return Number.isFinite(ml) && ml > 0 && ml <= 3000;
}

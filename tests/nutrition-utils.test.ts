import { describe, it, expect } from 'vitest';
import {
  validNum,
  kcalPer100g,
  sodiumMgPer100g,
  mapOpenFoodFactsProduct,
  resolveDevMock,
  combineFoodAnalysis,
  dedupeRecentFoods,
  favoritesStorageKey,
  isValidWaterMl,
  mapProfileTargets,
  toProfileTargetColumns,
  targetsStorageKey,
  canAthleteEditTargets,
} from '../apps/mobile/services/nutritionUtils';

describe('barcode mock gating (production safety)', () => {
  it('never returns a dev mock in production (isDev = false)', () => {
    expect(resolveDevMock('00123456', false)).toBeNull();
    expect(resolveDevMock('4900003675', false)).toBeNull();
  });

  it('returns a clearly-labelled dev mock only in development', () => {
    const mock = resolveDevMock('00123456', true);
    expect(mock).not.toBeNull();
    expect(mock!.record.source).toBe('dev_mock');
  });

  it('returns null for an unknown barcode even in development', () => {
    expect(resolveDevMock('does-not-exist', true)).toBeNull();
  });
});

describe('Open Food Facts mapping — not found', () => {
  it('returns null when status is 0', () => {
    expect(mapOpenFoodFactsProduct({ status: 0 }, '123')).toBeNull();
  });
  it('returns null when there is no product', () => {
    expect(mapOpenFoodFactsProduct({ status: 1 }, '123')).toBeNull();
  });
  it('returns null when the product has no name', () => {
    expect(mapOpenFoodFactsProduct({ status: 1, product: { nutriments: {} } }, '123')).toBeNull();
  });
});

describe('Open Food Facts mapping — missing nutrients stay null (never 0)', () => {
  const mapped = mapOpenFoodFactsProduct(
    { status: 1, product: { product_name: 'Plain Thing', nutriments: {} } },
    '999',
  )!;

  it('keeps every missing per-100g nutrient null', () => {
    expect(mapped.record.calories_per_100g).toBeNull();
    expect(mapped.record.protein_per_100g).toBeNull();
    expect(mapped.record.carbs_per_100g).toBeNull();
    expect(mapped.record.fat_per_100g).toBeNull();
    expect(mapped.record.fiber_per_100g).toBeNull();
    expect(mapped.record.sugar_per_100g).toBeNull();
    expect(mapped.record.sodium_mg_per_100g).toBeNull();
  });

  it('preserves the source and honest legacy-flat zeros only at the compat boundary', () => {
    expect(mapped.record.source).toBe('open_food_facts');
    expect(mapped.calories).toBe(0); // legacy flat field
    expect(mapped.fiber).toBeNull(); // enriched field stays null
  });
});

describe('Open Food Facts mapping — full record + unit normalization', () => {
  const mapped = mapOpenFoodFactsProduct(
    {
      status: 1,
      product: {
        product_name: 'Greek Yogurt',
        brands: 'Chobani',
        code: '9300000000000',
        serving_size: '170 g',
        nutrition_grades: 'B',
        labels: 'Organic, Gluten-free',
        ingredients_text: 'milk, cultures',
        allergens: 'en:milk',
        image_url: 'https://img/x.jpg',
        nutriments: {
          'energy-kcal_100g': 59,
          proteins_100g: 10,
          carbohydrates_100g: 3.6,
          fat_100g: 0.4,
          fiber_100g: 0,
          sugars_100g: 3.2,
          sodium_100g: 0.05, // grams
        },
      },
    },
    '9300000000000',
  )!;

  it('maps per-100g macros', () => {
    expect(mapped.record.calories_per_100g).toBe(59);
    expect(mapped.record.protein_per_100g).toBe(10);
  });
  it('converts sodium grams → mg', () => {
    expect(mapped.record.sodium_mg_per_100g).toBe(50); // 0.05 g * 1000
  });
  it('keeps an explicitly-supplied zero (fiber = 0)', () => {
    expect(mapped.record.fiber_per_100g).toBe(0);
  });
  it('parses serving quantity/unit, grade, labels', () => {
    expect(mapped.record.serving_quantity).toBe(170);
    expect(mapped.record.serving_unit).toBe('g');
    expect(mapped.record.nutrition_grade).toBe('b');
    expect(mapped.record.labels).toEqual(['Organic', 'Gluten-free']);
  });
});

describe('energy + numeric helpers', () => {
  it('converts kJ → kcal when kcal is absent', () => {
    expect(kcalPer100g({ 'energy-kj_100g': 1000 })).toBe(239.01);
  });
  it('salt fallback → sodium mg', () => {
    // salt 1.25 g ⇒ sodium 0.5 g ⇒ 500 mg
    expect(sodiumMgPer100g({ salt_100g: 1.25 })).toBe(500);
  });
  it('rejects invalid numbers instead of storing them', () => {
    expect(validNum(-5, 100)).toBeNull();
    expect(validNum('abc', 100)).toBeNull();
    expect(validNum(999, 100)).toBeNull(); // over cap
    expect(validNum(42.126, 100)).toBe(42.13);
  });
});

describe('AI analysis — no fabricated confidence', () => {
  it('always reports confidence: null and sums macros', () => {
    const r = combineFoodAnalysis([
      { name: 'Rice', calories: 200, protein: 4, carbs: 44, fat: 0.4 },
      { name: 'Dal', calories: 150, protein: 9, carbs: 20, fat: 3 },
    ]);
    expect(r.confidence).toBeNull();
    expect(r.calories).toBe(350);
    expect(r.name).toBe('Rice + Dal');
  });
});

describe('recent foods ordering', () => {
  it('dedupes by food id, newest-first, respecting the limit', () => {
    const logs = [
      { food: { id: 'a', name: 'A' } },
      { food: { id: 'b', name: 'B' } },
      { food: { id: 'a', name: 'A' } }, // older duplicate
      { food: undefined },              // no food — skipped
      { food: { id: 'c', name: 'C' } },
    ];
    const recent = dedupeRecentFoods(logs as any, 2);
    expect(recent.map((f) => f.id)).toEqual(['a', 'b']);
  });
});

describe('favorites are user-specific', () => {
  it('produces a distinct storage key per user', () => {
    const a = favoritesStorageKey('user-a');
    const b = favoritesStorageKey('user-b');
    expect(a).not.toBe(b);
    expect(a).toContain('user-a');
  });
});

describe('custom water amount validation', () => {
  it('accepts sane positive amounts and rejects the rest', () => {
    expect(isValidWaterMl(400)).toBe(true);
    expect(isValidWaterMl(250)).toBe(true);
    expect(isValidWaterMl(0)).toBe(false);
    expect(isValidWaterMl(-100)).toBe(false);
    expect(isValidWaterMl(5000)).toBe(false); // over per-add cap
    expect(isValidWaterMl(NaN)).toBe(false);
  });
});

describe('nutrition targets — canonical field mapping (drift fix)', () => {
  it('maps canonical daily_*_target columns into the app target object', () => {
    const t = mapProfileTargets({
      daily_calorie_target: 2200,
      daily_protein_target: 165,
      daily_carb_target: 240,
      daily_fat_target: 70,
      nutrition_targets_locked: true,
    });
    expect(t).toEqual({ calories: 2200, protein: 165, carbs: 240, fat: 70, locked: true });
  });

  it('keeps unset targets null (never 0) and defaults locked to false', () => {
    const t = mapProfileTargets({ daily_calorie_target: 2000 });
    expect(t.calories).toBe(2000);
    expect(t.protein).toBeNull();
    expect(t.carbs).toBeNull();
    expect(t.fat).toBeNull();
    expect(t.locked).toBe(false);
  });

  it('handles a null/absent row', () => {
    expect(mapProfileTargets(null)).toEqual({ calories: null, protein: null, carbs: null, fat: null, locked: false });
  });

  it('round-trips app object → canonical columns', () => {
    expect(toProfileTargetColumns({ calories: 2200, protein: 165, carbs: 240, fat: 70 })).toEqual({
      daily_calorie_target: 2200,
      daily_protein_target: 165,
      daily_carb_target: 240,
      daily_fat_target: 70,
    });
  });

  it('produces a distinct per-user targets cache key', () => {
    expect(targetsStorageKey('user-a')).not.toBe(targetsStorageKey('user-b'));
    expect(targetsStorageKey('abc')).toContain('abc');
  });

  it('blocks athlete edits only when a coach has locked the targets', () => {
    expect(canAthleteEditTargets(false)).toBe(true);
    expect(canAthleteEditTargets(true)).toBe(false);
  });
});

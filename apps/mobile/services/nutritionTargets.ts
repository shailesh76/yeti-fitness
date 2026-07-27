import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import {
  NutritionTargets,
  mapProfileTargets,
  toProfileTargetColumns,
  targetsStorageKey,
} from './nutritionUtils';

// Canonical target columns that exist on the live `profiles` table today.
const CORE_TARGET_COLUMNS = 'daily_calorie_target,daily_protein_target,daily_carb_target,daily_fat_target';

const EMPTY: NutritionTargets = { calories: null, protein: null, carbs: null, fat: null, locked: false };

/**
 * Reads the athlete's canonical nutrition targets from Supabase, caching them
 * per-user for offline use. On any failure (offline, RLS, etc.) it falls back to
 * the last cached targets. The `nutrition_targets_locked` column is queried
 * defensively so target display keeps working even before that migration is
 * applied to the live DB.
 */
export async function fetchNutritionTargets(userId: string): Promise<NutritionTargets> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(CORE_TARGET_COLUMNS)
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;

    const targets = mapProfileTargets(data);

    // Lock flag is additive (may not be applied yet) — never let it break the read.
    const { data: lockRow, error: lockErr } = await supabase
      .from('profiles')
      .select('nutrition_targets_locked')
      .eq('id', userId)
      .maybeSingle();
    if (!lockErr && lockRow) targets.locked = !!(lockRow as any).nutrition_targets_locked;

    await AsyncStorage.setItem(targetsStorageKey(userId), JSON.stringify(targets)).catch(() => {});
    return targets;
  } catch {
    try {
      const raw = await AsyncStorage.getItem(targetsStorageKey(userId));
      if (raw) return JSON.parse(raw) as NutritionTargets;
    } catch { /* ignore malformed cache */ }
    return { ...EMPTY };
  }
}

/**
 * Athlete self-save of their OWN targets (via the profiles update-own RLS policy).
 * Refuses to overwrite coach-locked targets (returns false), and mirrors the
 * result into the offline cache so the change survives a reload while offline.
 */
export async function saveNutritionTargets(
  userId: string,
  targets: { calories?: number | null; protein?: number | null; carbs?: number | null; fat?: number | null },
): Promise<boolean> {
  const current = await fetchNutritionTargets(userId);
  if (current.locked) return false; // coach-locked — athlete cannot override

  const cols = toProfileTargetColumns(targets);
  const { error } = await supabase.from('profiles').update(cols).eq('id', userId);
  if (error) return false;

  const next: NutritionTargets = { ...current, ...targets, locked: false };
  await AsyncStorage.setItem(targetsStorageKey(userId), JSON.stringify(next)).catch(() => {});
  return true;
}

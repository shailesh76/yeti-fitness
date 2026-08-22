import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import {
  NutritionTargets,
  NutritionTargetMode,
  ProfileMetrics,
  mapProfileTargets,
  toProfileTargetColumns,
  targetsStorageKey,
  targetModeStorageKey,
  calculateNutritionTargets,
} from './nutritionUtils';
import {
  getScreenData,
  invalidateScreenData,
  persistScreenData,
  setScreenData,
} from './screenDataCache';
import { patchHomeSnapshot } from './homeSummary';

// Canonical target columns that exist on the live `profiles` table today.
const CORE_TARGET_COLUMNS = 'daily_calorie_target,daily_protein_target,daily_carb_target,daily_fat_target';

const EMPTY: NutritionTargets = { calories: null, protein: null, carbs: null, fat: null, locked: false, mode: 'AUTO' };

function cacheKey(userId: string): string {
  return `nutrition-targets:${userId}`;
}

export function applyNutritionTargetsLocal(
  userId: string,
  targets: Partial<NutritionTargets>,
  mode?: NutritionTargetMode,
): NutritionTargets {
  const current = getScreenData<NutritionTargets>(cacheKey(userId)) || EMPTY;
  const next: NutritionTargets = { ...current, ...targets, mode: mode || targets.mode || current.mode };
  setScreenData(cacheKey(userId), next);
  void publishNutritionTargets(userId, next);
  patchHomeSnapshot(userId, { targetMacros: next });
  invalidateScreenData(`home:${userId}`);
  invalidateScreenData(`profile:${userId}`);
  invalidateScreenData(`progress:${userId}`);
  if ((globalThis as any).__DEV__) console.log('[YETI CACHE] nutrition-targets updated');
  return next;
}

export async function publishNutritionTargets(userId: string, targets: NutritionTargets): Promise<NutritionTargets> {
  await Promise.all([
    AsyncStorage.setItem(targetsStorageKey(userId), JSON.stringify(targets)),
    AsyncStorage.setItem(targetModeStorageKey(userId), targets.mode),
    persistScreenData(cacheKey(userId), targets),
  ]).catch(() => {});
  return targets;
}

export async function getCachedNutritionTargets(userId: string): Promise<NutritionTargets | null> {
  const session = getScreenData<NutritionTargets>(cacheKey(userId));
  if (session) return session;
  try {
    const raw = await AsyncStorage.getItem(targetsStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NutritionTargets;
    await persistScreenData(cacheKey(userId), parsed).catch(() => {});
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Reads the athlete's target mode ('AUTO' vs 'MANUAL').
 * Priority:
 * 1. Local cached mode (for fast offline responsiveness)
 * 2. If existing targets differ significantly from the profile's BMR/TDEE formula,
 *    safely resolve as 'MANUAL' to prevent clobbering intentional custom targets.
 * 3. Default to 'AUTO'.
 */
export async function getNutritionTargetMode(
  userId: string,
  profile?: ProfileMetrics,
  existingTargets?: NutritionTargets,
): Promise<NutritionTargetMode> {
  try {
    const cachedMode = await AsyncStorage.getItem(targetModeStorageKey(userId));
    if (cachedMode === 'MANUAL' || cachedMode === 'AUTO') return cachedMode;
  } catch {
    /* ignore */
  }

  // If remote profile targets exist without an explicit mode flag,
  // compare against the BMR/TDEE formula to avoid clobbering manual targets.
  if (existingTargets?.calories != null && profile) {
    const calculated = calculateNutritionTargets(profile);
    if (Math.abs(existingTargets.calories - calculated.calories) > 10) {
      return 'MANUAL';
    }
  }

  return 'AUTO';
}

/**
 * Persists the athlete's target mode ('AUTO' vs 'MANUAL') both to local cache
 * and remotely to profiles.nutrition_target_mode.
 */
export async function setNutritionTargetMode(userId: string, mode: NutritionTargetMode): Promise<void> {
  try {
    await AsyncStorage.setItem(targetModeStorageKey(userId), mode);
  } catch {
    /* non-fatal */
  }

  try {
    // Best-effort remote update
    await supabase.from('profiles').update({ nutrition_target_mode: mode }).eq('id', userId);
  } catch {
    /* non-fatal fallback */
  }
}

/**
 * Reads the athlete's canonical nutrition targets from Supabase, caching them
 * per-user for offline use. On any failure (offline, RLS, etc.) it falls back to
 * the last cached targets.
 *
 * Checks `nutrition_targets_locked` and `nutrition_target_mode` defensively.
 */
export async function fetchNutritionTargets(userId: string, profile?: ProfileMetrics): Promise<NutritionTargets> {
  const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if ((globalThis as any).__DEV__) console.log('[YETI PERF] nutrition remote start');
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`${CORE_TARGET_COLUMNS},nutrition_targets_locked,nutrition_target_mode`)
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;

    const targets = mapProfileTargets(data);

    // If remote mode was unset/null on an existing account, check if targets are custom
    if (!data?.nutrition_target_mode && targets.calories != null && profile) {
      const calc = calculateNutritionTargets(profile);
      if (Math.abs(targets.calories - calc.calories) > 10) {
        targets.mode = 'MANUAL';
      }
    }

    const published = await publishNutritionTargets(userId, targets);
    if ((globalThis as any).__DEV__) console.log(`[YETI PERF] nutrition remote finish ${Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - started)}ms`);
    return published;
  } catch {
    const cached = await getCachedNutritionTargets(userId);
    if (cached) return cached;
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
  mode?: NutritionTargetMode,
): Promise<boolean> {
  const current = (await getCachedNutritionTargets(userId)) || (await fetchNutritionTargets(userId));
  if (current.locked) return false; // coach-locked — athlete cannot override

  const targetMode = mode || (await getNutritionTargetMode(userId));
  const cols = toProfileTargetColumns(targets, targetMode);
  const next = applyNutritionTargetsLocal(userId, { ...targets, locked: false }, targetMode);

  // Attempt update with nutrition_target_mode; fallback without it if column is not yet migrated
  const remoteStarted = typeof performance !== 'undefined' ? performance.now() : Date.now();
  let { error } = await supabase.from('profiles').update(cols).eq('id', userId);
  if (error && error.message?.includes('nutrition_target_mode')) {
    const fallbackCols = toProfileTargetColumns(targets);
    const retry = await supabase.from('profiles').update(fallbackCols).eq('id', userId);
    error = retry.error;
  }
  if (error) {
    await publishNutritionTargets(userId, current);
    return false;
  }
  if ((globalThis as any).__DEV__) console.log(`[YETI SYNC] profile remote write ${Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - remoteStarted)}ms`);
  return true;
}

/**
 * Synchronizes nutrition targets with updated profile metrics (weight, height, age, activity, goal).
 * Contract:
 * - COACH LOCKED: Never auto-recalculates (preserves coach targets).
 * - MANUAL OVERRIDE: Never auto-recalculates (preserves athlete custom numbers).
 * - AUTO MODE: Recalculates dynamically using Mifflin-St Jeor formula and updates profiles.
 */
export async function syncProfileNutritionTargets(
  userId: string,
  profile: ProfileMetrics,
  userRepository?: any,
): Promise<NutritionTargets> {
  const current = await fetchNutritionTargets(userId, profile);
  if (current.locked) return current;

  const mode = await getNutritionTargetMode(userId, profile, current);
  if (mode === 'MANUAL' && current.calories != null) {
    // Preserve manual target
    return { ...current, mode: 'MANUAL' };
  }

  const calculated = calculateNutritionTargets(profile);
  const cols = toProfileTargetColumns(calculated, 'AUTO');

  // Update remote profiles
  await saveNutritionTargets(userId, calculated, 'AUTO').catch(() => {});

  // Update local SQLite / WatermelonDB profile if repository provided
  if (userRepository) {
    try {
      await userRepository.updateProfile(userId, cols);
    } catch {
      /* non-fatal */
    }
  }

  return { ...calculated, locked: false, mode: 'AUTO' };
}

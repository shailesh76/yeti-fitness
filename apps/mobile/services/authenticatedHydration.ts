import { useFoodStore } from '../store/useFoodStore';
import { useUserStore } from '../store/useUserStore';
import { hydrateHomeSnapshot, patchHomeSnapshot } from './homeSummary';
import { getCachedNutritionTargets } from './nutritionTargets';
import { hydrateScreenData } from './screenDataCache';
import { getAuthDisplayName, resolveProfileDisplayName } from './profileIdentity';

const inFlight = new Map<string, Promise<void>>();
const completed = new Set<string>();
const seenStages = new Set<string>();

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

const bootStartedAt = now();

export function logBootStage(stage: string, userId?: string): void {
  if (!(globalThis as any).__DEV__) return;
  const key = `${userId || 'app'}:${stage}`;
  if (seenStages.has(key)) return;
  seenStages.add(key);
  console.log(`[YETI BOOT] ${stage} ${Math.round(now() - bootStartedAt)}ms`);
}

/** Starts durable, user-scoped hydration as soon as auth reveals an identity. */
export function beginAuthenticatedHydration(userId: string, authUser?: any): Promise<void> {
  if (!userId || completed.has(userId)) return Promise.resolve();
  const existing = inFlight.get(userId);
  if (existing) return existing;

  logBootStage('AUTH_READY', userId);
  const request = (async () => {
    logBootStage('HOME_CACHE_START', userId);
    logBootStage('FOOD_CACHE_START', userId);
    logBootStage('NUTRITION_CACHE_START', userId);

    const [profile, home, , targets] = await Promise.all([
      hydrateScreenData<Record<string, any>>(`profile:${userId}`)
        .then((value) => { logBootStage('USER_CACHE_READY', userId); return value; }),
      hydrateHomeSnapshot(userId)
        .then((value) => { logBootStage('HOME_CACHE_READY', userId); return value; }),
      useFoodStore.getState().loadLocalCache(userId)
        .then((value) => { logBootStage('FOOD_CACHE_READY', userId); return value; }),
      getCachedNutritionTargets(userId)
        .then((value) => { logBootStage('NUTRITION_CACHE_READY', userId); return value; }),
    ]);

    const authName = getAuthDisplayName(authUser);
    if (profile) {
      useUserStore.getState().initializeFromProfile({
        ...profile,
        full_name: resolveProfileDisplayName(profile.full_name, authUser),
      }, userId);
    } else if (authName) {
      useUserStore.getState().initializeFromProfile({ id: userId, full_name: authName }, userId);
    }
    if (profile || targets || authName) {
      patchHomeSnapshot(userId, {
        ...(profile?.full_name || authName
          ? { athleteName: resolveProfileDisplayName(profile?.full_name, authUser, home?.athleteName) }
          : {}),
        ...(profile?.weight_kg != null ? { currentWeight: Number(profile.weight_kg) } : {}),
        ...(targets ? { targetMacros: targets } : {}),
      });
    } else if (home) {
      // The snapshot was already published by hydrateHomeSnapshot.
    }

    completed.add(userId);
  })().finally(() => inFlight.delete(userId));

  inFlight.set(userId, request);
  return request;
}

export function resetAuthenticatedHydration(userId?: string): void {
  if (userId) completed.delete(userId);
  else completed.clear();
  seenStages.clear();
}

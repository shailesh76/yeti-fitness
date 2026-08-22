import { supabase } from '../lib/supabase';
import { useUserStore } from '../store/useUserStore';
import type { NutritionTargets } from './nutritionUtils';
import { getScreenData, persistScreenData } from './screenDataCache';
import { publishNutritionTargets } from './nutritionTargets';
import { patchHomeSnapshot } from './homeSummary';

const PROFILE_FIELDS = [
  'daily_calorie_target', 'daily_protein_target', 'daily_carb_target', 'daily_fat_target',
  'nutrition_target_mode', 'nutrition_targets_locked', 'weight_kg', 'goal', 'activity_level',
] as const;

let activeUserId: string | null = null;
let activeChannel: ReturnType<typeof supabase.channel> | null = null;
let subscriptionGeneration = 0;
const localWrites = new Map<string, { value: unknown; at: number }>();

export function markLocalProfileWrite(userId: string, patch: Record<string, unknown>): void {
  const now = Date.now();
  Object.entries(patch).forEach(([field, value]) => localWrites.set(`${userId}:${field}`, { value, at: now }));
}

function isRecentEcho(userId: string, field: string, value: unknown): boolean {
  const entry = localWrites.get(`${userId}:${field}`);
  if (!entry) return false;
  if (Date.now() - entry.at > 15_000) {
    localWrites.delete(`${userId}:${field}`);
    return false;
  }
  return Object.is(entry.value, value);
}

export async function applyRealtimeProfileRow(userId: string, row: Record<string, any>): Promise<boolean> {
  if (activeUserId && activeUserId !== userId) return false;
  const currentProfile = getScreenData<Record<string, any>>(`profile:${userId}`) || {};
  const changed: Record<string, any> = {};
  PROFILE_FIELDS.forEach((field) => {
    if (row[field] !== undefined && !Object.is(currentProfile[field], row[field]) && !isRecentEcho(userId, field, row[field])) {
      changed[field] = row[field];
    }
  });
  if (Object.keys(changed).length === 0) return false;

  if ((globalThis as any).__DEV__) console.log('[YETI REALTIME] profile event received');
  const nextProfile = { ...currentProfile, ...changed };
  useUserStore.getState().initializeFromProfile(nextProfile, userId);
  await persistScreenData(`profile:${userId}`, nextProfile);

  const progress = getScreenData<any>(`progress:${userId}`);
  if (progress) await persistScreenData(`progress:${userId}`, { ...progress, profile: { ...(progress.profile || {}), ...changed } });

  const homePatch: Record<string, any> = {};
  if (changed.full_name) homePatch.athleteName = changed.full_name;
  if (changed.weight_kg != null) homePatch.currentWeight = Number(changed.weight_kg);
  if (Object.keys(homePatch).length > 0) patchHomeSnapshot(userId, homePatch);

  if (PROFILE_FIELDS.slice(0, 6).some((field) => field in changed)) {
    const currentTargets = getScreenData<NutritionTargets>(`nutrition-targets:${userId}`);
    await publishNutritionTargets(userId, {
      calories: changed.daily_calorie_target ?? currentTargets?.calories ?? null,
      protein: changed.daily_protein_target ?? currentTargets?.protein ?? null,
      carbs: changed.daily_carb_target ?? currentTargets?.carbs ?? null,
      fat: changed.daily_fat_target ?? currentTargets?.fat ?? null,
      locked: changed.nutrition_targets_locked ?? currentTargets?.locked ?? false,
      mode: changed.nutrition_target_mode ?? currentTargets?.mode ?? 'AUTO',
    });
  }
  return true;
}

export async function stopProfileRealtime(): Promise<void> {
  subscriptionGeneration += 1;
  activeUserId = null;
  localWrites.clear();
  const channel = activeChannel;
  activeChannel = null;
  if (channel) await supabase.removeChannel(channel);
}

export async function startProfileRealtime(userId: string): Promise<void> {
  if (activeUserId === userId && activeChannel) return;
  const generation = ++subscriptionGeneration;
  const previous = activeChannel;
  activeChannel = null;
  activeUserId = userId;
  localWrites.clear();
  if (previous) await supabase.removeChannel(previous);
  if (generation !== subscriptionGeneration || activeUserId !== userId) return;
  activeChannel = supabase
    .channel(`athlete-profile:${userId}`)
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}`,
    }, (payload) => { void applyRealtimeProfileRow(userId, payload.new as Record<string, any>); })
    .subscribe((status) => {
      if ((globalThis as any).__DEV__) console.log(`[YETI REALTIME] profile ${status}`);
    });
}

export function getActiveProfileRealtimeUserForTests(): string | null {
  return activeUserId;
}

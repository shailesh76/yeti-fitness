import { supabase } from '../lib/supabase';
import { database, isNativeDbAvailable } from '../database';
import { SyncManager } from '@yeti/sync';
import { useWorkoutStore } from '../store/useWorkoutStore';
import { invalidateScreenData } from './screenDataCache';

let activeUserId: string | null = null;
let activeChannel: any = null;
let subscriptionGeneration = 0;

/**
 * Handles incoming Realtime events for assigned_plans.
 * Triggers targeted reconciliation for the authenticated athlete without full app reload
 * and preserves in-progress workout sessions.
 */
export async function applyRealtimePlanEvent(
  userId: string,
  eventType: string,
  _record?: Record<string, any>
): Promise<boolean> {
  // Stale-account guard: suppress events if the active user switched or signed out
  if (activeUserId && activeUserId !== userId) return false;

  if ((globalThis as any).__DEV__) {
    console.log(`[YETI REALTIME] assigned_plans ${eventType} event received for user: ${userId}`);
  }

  try {
    // 1. Invalidate cached workout screen data
    invalidateScreenData(`workouts:${userId}`);

    // 2. On Native with WatermelonDB: pull delta changes via SyncManager
    if (isNativeDbAvailable && database) {
      try {
        const syncManager = new SyncManager(database, supabase);
        await syncManager.sync();
      } catch (syncErr) {
        console.warn('[YETI REALTIME] Targeted WatermelonDB sync error on plan event:', syncErr);
      }
    }

    // 3. Patch useWorkoutStore with the latest assigned plan graph
    // (On web, this executes the direct PostgREST fetch; on native, reads local WatermelonDB)
    await useWorkoutStore.getState().syncWorkoutPlans(userId);

    return true;
  } catch (error) {
    console.warn('[YETI REALTIME] Failed to apply realtime plan event:', error);
    return false;
  }
}

/**
 * Unsubscribes from the assigned_plans Realtime channel and cleans up state on logout / account switch.
 */
export async function stopPlanRealtime(): Promise<void> {
  subscriptionGeneration += 1;
  activeUserId = null;
  const channel = activeChannel;
  activeChannel = null;
  if (channel) {
    await supabase.removeChannel(channel);
  }
}

/**
 * Subscribes to Realtime changes on public.assigned_plans filtered by athlete_id.
 * Protected by generation/token guards to prevent duplicate channels and race conditions.
 */
export async function startPlanRealtime(userId: string): Promise<void> {
  if (!userId) return;
  if (activeUserId === userId && activeChannel) return;

  const generation = ++subscriptionGeneration;
  const previous = activeChannel;
  activeChannel = null;
  activeUserId = userId;

  if (previous) {
    await supabase.removeChannel(previous);
  }

  if (generation !== subscriptionGeneration || activeUserId !== userId) return;

  const channel = supabase.channel(`athlete-assigned-plans:${userId}`);
  const reconcile = (payload: any) => {
    void applyRealtimePlanEvent(userId, payload.eventType, payload.new as Record<string, any>);
  };

  // Filtered DELETE delivery requires REPLICA IDENTITY FULL. Assignment
  // removals remain owned by normal sync/tombstone reconciliation; Realtime
  // is used only for immediate discovery of inserts and updates.
  activeChannel = channel
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'assigned_plans',
        filter: `athlete_id=eq.${userId}`,
      },
      reconcile
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'assigned_plans',
        filter: `athlete_id=eq.${userId}`,
      },
      reconcile
    )
    .subscribe((status: string) => {
      if ((globalThis as any).__DEV__) {
        console.log(`[YETI REALTIME] assigned_plans subscription status: ${status}`);
      }
    });
}

export function getActivePlanRealtimeUserForTests(): string | null {
  return activeUserId;
}

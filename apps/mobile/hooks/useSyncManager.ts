import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { database } from '../database';
import { supabase } from '../lib/supabase';
import { SyncManager } from '@yeti/sync';

export function useSyncManager() {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sync = useCallback(async () => {
    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user?.id;
    if (!session.data.session) {
      console.log('[SyncManager] Skip sync: no active auth session.');
      return;
    }

    setSyncing(true);
    setError(null);
    try {
      console.log('[SyncManager] Starting WatermelonDB synchronization...');
      const manager = new SyncManager(database, supabase);
      await manager.sync();
      console.log('[SyncManager] WatermelonDB sync complete.');
    } catch (e: any) {
      console.warn('[SyncManager] Sync failed:', e);
      setError(e);
      // Sync failures were previously console-only and invisible once the
      // session ended — log to the same system_errors table the app's
      // ErrorBoundary already uses, so these show up for admins too.
      supabase.from('system_errors').insert({
        user_id: userId ?? null,
        error_type: 'SYNC_FAILED',
        message: e?.message || String(e),
        stack_trace: e?.stack || null,
        platform: Platform.OS,
        app_version: '1.0.0-beta',
      }).then(({ error: dbErr }) => {
        if (dbErr) console.error('[SyncManager] Failed to log sync failure:', dbErr);
      });
    } finally {
      setSyncing(false);
    }
  }, []);

  return { sync, syncing, error };
}

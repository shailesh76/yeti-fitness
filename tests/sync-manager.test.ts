import { describe, it, expect, vi } from 'vitest';
import { SyncManager } from '../packages/sync/src/SyncManager';

/**
 * SyncManager wraps WatermelonDB's synchronize() utility. synchronize() itself
 * needs a real WatermelonDB Database instance (native SQLite or a browser
 * adapter) to run — neither is available in this Node/Vitest environment, and
 * re-testing WatermelonDB's own sync algorithm isn't the goal anyway (it's a
 * well-tested third-party library). What IS this project's own code, and
 * worth testing directly, is the actual integration boundary: pullChanges/
 * pushChanges, which call the sync-pull/sync-push edge functions. They're
 * exposed as named methods on the class (rather than defined inline inside
 * sync()) specifically so they're testable without needing a real Database
 * or fighting WatermelonDB's synchronize() export (which resisted vi.mock —
 * it's wrapped in a Proxy internally).
 */
function mockSupabase(invokeImpl: (name: string, opts: any) => Promise<any>) {
  return { functions: { invoke: vi.fn(invokeImpl) } } as any;
}

describe('SyncManager.sync', () => {
  it('returns safely without touching the network when the local database is unavailable (web)', async () => {
    const invoke = vi.fn();
    const manager = new SyncManager(null as any, mockSupabase(invoke));

    await expect(manager.sync()).resolves.toBeUndefined();
    expect(invoke).not.toHaveBeenCalled();
  });
});

describe('SyncManager.pullChanges', () => {
  it('invokes sync-pull with the right params and returns changes/timestamp on success', async () => {
    const supabase = mockSupabase(async (name, opts) => {
      expect(name).toBe('sync-pull');
      expect(opts.body).toEqual({ lastPulledAt: 100, schemaVersion: 4, migration: null });
      return { data: { changes: { workouts: { created: [] } }, timestamp: 200 }, error: null };
    });
    const manager = new SyncManager({} as any, supabase);

    const result = await manager.pullChanges({ lastPulledAt: 100, schemaVersion: 4, migration: null });

    expect(result).toEqual({ changes: { workouts: { created: [] } }, timestamp: 200 });
    expect(supabase.functions.invoke).toHaveBeenCalledWith('sync-pull', {
      body: { lastPulledAt: 100, schemaVersion: 4, migration: null },
    });
  });

  it('throws when sync-pull returns an error', async () => {
    const supabase = mockSupabase(async () => ({ data: null, error: { message: 'pull failed' } }));
    const manager = new SyncManager({} as any, supabase);

    await expect(manager.pullChanges({ lastPulledAt: null, schemaVersion: 1, migration: null }))
      .rejects.toThrow('pull failed');
  });
});

describe('SyncManager.pushChanges', () => {
  it('invokes sync-push with the right params on success', async () => {
    const changes = { workout_sessions: { created: [{ id: '1' }], updated: [], deleted: [] } };
    const supabase = mockSupabase(async (name, opts) => {
      expect(name).toBe('sync-push');
      expect(opts.body).toEqual({ changes, lastPulledAt: 100 });
      return { data: { success: true }, error: null };
    });
    const manager = new SyncManager({} as any, supabase);

    await manager.pushChanges({ changes, lastPulledAt: 100 });

    expect(supabase.functions.invoke).toHaveBeenCalledWith('sync-push', {
      body: { changes, lastPulledAt: 100 },
    });
  });

  it('throws when sync-push returns an error', async () => {
    const supabase = mockSupabase(async () => ({ data: null, error: { message: 'push failed' } }));
    const manager = new SyncManager({} as any, supabase);

    await expect(manager.pushChanges({ changes: {}, lastPulledAt: null }))
      .rejects.toThrow('push failed');
  });
});

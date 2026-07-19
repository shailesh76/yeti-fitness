import { Database } from '@nozbe/watermelondb';
import { synchronize, SyncDatabaseChangeSet, SyncPullArgs, SyncPushArgs } from '@nozbe/watermelondb/sync';
import { SupabaseClient } from '@supabase/supabase-js';

export class SyncManager {
  private db: Database;
  private supabase: SupabaseClient;

  constructor(db: Database, supabase: SupabaseClient) {
    this.db = db;
    this.supabase = supabase;
  }

  async sync() {
    // On web the SQLite adapter never initializes, so callers get a null
    // database (see apps/mobile/database/index.ts's isNativeDbAvailable).
    // WatermelonDB's own synchronize() isn't guarded against that and throws
    // a raw null-deref internally — treat "no local database" as "nothing to
    // sync" rather than letting that crash surface as a sync failure.
    if (!this.db) return;
    await synchronize({
      database: this.db,
      pullChanges: this.pullChanges,
      pushChanges: this.pushChanges,
      migrationsEnabledAtVersion: 1,
    });
  }

  // Extracted as named methods (rather than inline in sync()) so the actual
  // integration boundary with the edge functions — the part that's this
  // project's own code, as opposed to WatermelonDB's sync algorithm itself —
  // can be unit tested directly without needing a real Database instance or
  // mocking WatermelonDB's synchronize(). Param/return types match
  // synchronize()'s own pullChanges/pushChanges contract exactly (imported
  // from the library) rather than hand-written duplicates that can drift.
  pullChanges = async ({ lastPulledAt, schemaVersion, migration }: SyncPullArgs) => {
    const { data, error } = await this.supabase.functions.invoke('sync-pull', {
      body: { lastPulledAt, schemaVersion, migration }
    });

    if (error) throw new Error(error.message);

    return {
      changes: data.changes as SyncDatabaseChangeSet,
      timestamp: data.timestamp,
    };
  };

  pushChanges = async ({ changes, lastPulledAt }: SyncPushArgs) => {
    const { error } = await this.supabase.functions.invoke('sync-push', {
      body: { changes, lastPulledAt }
    });

    if (error) throw new Error(error.message);
  };
}

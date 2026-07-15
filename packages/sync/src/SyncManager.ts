import { Database } from '@nozbe/watermelondb';
import { synchronize } from '@nozbe/watermelondb/sync';
import { SupabaseClient } from '@supabase/supabase-js';

export class SyncManager {
  private db: Database;
  private supabase: SupabaseClient;

  constructor(db: Database, supabase: SupabaseClient) {
    this.db = db;
    this.supabase = supabase;
  }

  async sync() {
    await synchronize({
      database: this.db,
      pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
        const { data, error } = await this.supabase.functions.invoke('sync-pull', {
          body: { lastPulledAt, schemaVersion, migration }
        });
        
        if (error) throw new Error(error.message);
        
        return {
          changes: data.changes,
          timestamp: data.timestamp,
        };
      },
      pushChanges: async ({ changes, lastPulledAt }) => {
        const { error } = await this.supabase.functions.invoke('sync-push', {
          body: { changes, lastPulledAt }
        });
        
        if (error) throw new Error(error.message);
      },
      migrationsEnabledAtVersion: 1,
    });
  }
}

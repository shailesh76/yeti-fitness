import { Database } from '@nozbe/watermelondb';
import { Profile } from '../models/Profile';

export class UserRepository {
  private db: Database;
  private supabase?: any;

  constructor(db: Database, supabase?: any) {
    this.db = db;
    this.supabase = supabase;
  }

  /**
   * Guards local WatermelonDB access. The native SQLite adapter is unavailable on
   * web, where `db` is null — fail with a clear, catchable error instead of a
   * cryptic "Cannot read properties of null" crash.
   */
  private requireDb(): Database {
    if (!this.db) {
      throw new Error('LOCAL_DB_UNAVAILABLE: local database is not available on this platform');
    }
    return this.db;
  }

  async getProfile(userId: string): Promise<Profile | null> {
    try {
      const records = await this.db.get<Profile>('profiles').query().fetch();
      // Search by user_id field
      const profile = records.find(r => r.user_id === userId);
      return profile || null;
    } catch {
      return null;
    }
  }

  async updateProfile(userId: string, updates: any): Promise<Profile> {
    this.requireDb();
    return this.db.write(async () => {
      const profile = await this.getProfile(userId);
      if (profile) {
        await profile.update(p => {
          Object.assign(p, updates);
        });
        return profile;
      } else {
        return await this.db.get<Profile>('profiles').create(p => {
          p.user_id = userId;
          Object.assign(p, updates);
        });
      }
    });
  }

  // --- Remote Operations ---

  async fetchProfileRemote(userId: string): Promise<any> {
    if (!this.supabase) {
      throw new Error('Supabase client not configured in UserRepository');
    }
    // Select the columns the local Profile model can cache. Nutrition targets use
    // the canonical daily_*_target columns and are fetched directly by the mobile
    // nutritionTargets service, not cached through this WatermelonDB path.
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', userId)
      .maybeSingle();
    return { data, error };
  }

  async saveBetaConsents(consents: any[]): Promise<{ error: any }> {
    if (!this.supabase) {
      throw new Error('Supabase client not configured in UserRepository');
    }
    const { error } = await this.supabase
      .from('beta_consents')
      .insert(consents);
    return { error };
  }
}

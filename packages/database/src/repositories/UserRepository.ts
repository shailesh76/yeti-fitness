import { Database } from '@nozbe/watermelondb';
import { Profile } from '../models/Profile';

export class UserRepository {
  private db: Database;
  private supabase?: any;

  constructor(db: Database, supabase?: any) {
    this.db = db;
    this.supabase = supabase;
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
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id')
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

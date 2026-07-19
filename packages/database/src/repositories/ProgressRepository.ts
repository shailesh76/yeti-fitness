import { Database, Q } from '@nozbe/watermelondb';
import { Measurement } from '../models/Measurement';

export class ProgressRepository {
  private db: Database;
  private supabase?: any;

  constructor(db: Database, supabase?: any) {
    this.db = db;
    this.supabase = supabase;
  }

  /**
   * Guards local WatermelonDB access for WRITE operations. The native SQLite
   * adapter is unavailable on web, where `db` is null — fail with a clear,
   * catchable error instead of a cryptic "Cannot read properties of null" crash.
   */
  private requireDb(): Database {
    if (!this.db) {
      throw new Error('LOCAL_DB_UNAVAILABLE: local database is not available on this platform');
    }
    return this.db;
  }

  // --- Local Persistence ---

  async saveMeasurement(
    userId: string,
    weightKg?: number,
    bodyFatPct?: number,
    chestCm?: number,
    waistCm?: number,
    hipsCm?: number,
    armsCm?: number,
    legsCm?: number,
    notes?: string
  ): Promise<Measurement> {
    this.requireDb();
    return this.db.write(async () => {
      return this.db.get<Measurement>('measurements').create(m => {
        m.user_id = userId;
        m.weight_kg = weightKg;
        m.body_fat_pct = bodyFatPct;
        m.chest_cm = chestCm;
        m.waist_cm = waistCm;
        m.hips_cm = hipsCm;
        m.arms_cm = armsCm;
        m.legs_cm = legsCm;
        m.notes = notes;
        m.logged_at = Date.now();
        m.is_synced = false;
      });
    });
  }

  async getMeasurements(userId: string): Promise<Measurement[]> {
    // Local DB unavailable on web — an empty list is a reasonable, safe fallback
    // (identical UI state to "no measurements logged yet"), rather than throwing
    // and aborting whatever multi-step load called this.
    if (!this.db) return [];
    return this.db.get<Measurement>('measurements')
      .query(Q.where('user_id', userId), Q.sortBy('logged_at', Q.desc))
      .fetch();
  }

  async getWeightTrend(userId: string, days: number = 30): Promise<Measurement[]> {
    if (!this.db) return [];
    const limitDate = Date.now() - days * 24 * 60 * 60 * 1000;
    return this.db.get<Measurement>('measurements')
      .query(
        Q.where('user_id', userId),
        Q.where('logged_at', Q.gte(limitDate)),
        Q.sortBy('logged_at', Q.asc)
      )
      .fetch();
  }

  // --- Remote Network Operations ---

  async fetchInsightsRemote(userId: string): Promise<any> {
    if (!this.supabase) {
      throw new Error('Supabase client not configured in ProgressRepository');
    }
    const { data, error } = await this.supabase.functions.invoke('generate-health-insights', {
      body: { clientId: userId }
    });
    if (error) throw error;
    return data;
  }
}

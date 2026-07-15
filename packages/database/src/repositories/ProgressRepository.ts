import { Database, Q } from '@nozbe/watermelondb';
import { Measurement } from '../models/Measurement';

export class ProgressRepository {
  private db: Database;
  private supabase?: any;

  constructor(db: Database, supabase?: any) {
    this.db = db;
    this.supabase = supabase;
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
    return this.db.get<Measurement>('measurements')
      .query(Q.where('user_id', userId), Q.sortBy('logged_at', Q.desc))
      .fetch();
  }

  async getWeightTrend(userId: string, days: number = 30): Promise<Measurement[]> {
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

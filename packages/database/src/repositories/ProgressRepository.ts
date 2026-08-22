import { Database, Q } from '@nozbe/watermelondb';
import { Measurement } from '../models/Measurement';

export class ProgressRepository {
  private db: Database;
  private supabase?: any;

  constructor(db: Database, supabase?: any) {
    this.db = db;
    this.supabase = supabase;
  }

  // --- Local & Remote Persistence ---

  async saveMeasurement(
    userId: string,
    weightKg?: number,
    bodyFatPct?: number,
    chestCm?: number,
    waistCm?: number,
    hipsCm?: number,
    armsCm?: number,
    legsCm?: number,
    notes?: string,
    loggedAtTimestamp?: number
  ): Promise<any> {
    const loggedAt = loggedAtTimestamp || Date.now();
    let savedLocal: Measurement | null = null;

    if (this.db) {
      savedLocal = await this.db.write(async () => {
        return this.db.get<Measurement>('measurements').create((m) => {
          m.user_id = userId;
          m.weight_kg = weightKg;
          m.body_fat_pct = bodyFatPct;
          m.chest_cm = chestCm;
          m.waist_cm = waistCm;
          m.hips_cm = hipsCm;
          m.arms_cm = armsCm;
          m.legs_cm = legsCm;
          m.notes = notes;
          m.logged_at = loggedAt;
          m.is_synced = false;
        });
      });
    }

    // Direct Remote Sync (Supabase)
    if (this.supabase && typeof this.supabase.from === 'function') {
      try {
        const rows: any[] = [];
        const nowIso = new Date().toISOString();
        const loggedAtIso = new Date(loggedAt).toISOString();

        if (weightKg != null && !isNaN(weightKg)) {
          rows.push({
            user_id: userId,
            type: 'weight_kg',
            value: weightKg,
            logged_at: loggedAtIso,
            updated_at: nowIso,
          });
        }
        if (bodyFatPct != null && !isNaN(bodyFatPct)) {
          rows.push({
            user_id: userId,
            type: 'body_fat_pct',
            value: bodyFatPct,
            logged_at: loggedAtIso,
            updated_at: nowIso,
          });
        }

        if (rows.length > 0) {
          await this.supabase.from('measurements').insert(rows);
          if (weightKg != null && !isNaN(weightKg)) {
            await this.supabase.from('profiles').update({ weight_kg: weightKg, updated_at: nowIso }).eq('id', userId);
          }
        }
      } catch (err) {
        console.warn('[ProgressRepository] Remote measurement save error (non-fatal):', err);
      }
    }

    if (savedLocal) return savedLocal;

    // Fallback object for web/in-memory
    return {
      id: `meas_${Date.now()}`,
      user_id: userId,
      weight_kg: weightKg,
      body_fat_pct: bodyFatPct,
      chest_cm: chestCm,
      waist_cm: waistCm,
      hips_cm: hipsCm,
      arms_cm: armsCm,
      legs_cm: legsCm,
      notes,
      logged_at: loggedAt,
      is_synced: true,
    };
  }

  async getMeasurements(userId: string): Promise<any[]> {
    if (this.db) {
      try {
        const local = await this.db
          .get<Measurement>('measurements')
          .query(Q.where('user_id', userId), Q.sortBy('logged_at', Q.desc))
          .fetch();
        if (local && local.length > 0) {
          return local;
        }
      } catch (e) {
        console.warn('[ProgressRepository] Local fetch error:', e);
      }
    }

    // Remote fallback (e.g. on Web or before first sync)
    if (this.supabase && typeof this.supabase.from === 'function') {
      try {
        const { data, error } = await this.supabase
          .from('measurements')
          .select('*')
          .eq('user_id', userId)
          .order('logged_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const byTime = new Map<string, any>();
          for (const row of data) {
            const t = new Date(row.logged_at).getTime();
            const minuteKey = Math.floor(t / 60000).toString();
            const existing = byTime.get(minuteKey) || {
              id: row.id,
              user_id: userId,
              logged_at: t,
              weight_kg: undefined,
              body_fat_pct: undefined,
            };
            if (row.type === 'weight_kg' || row.type === 'weight') existing.weight_kg = Number(row.value);
            if (row.type === 'body_fat_pct' || row.type === 'body_fat') existing.body_fat_pct = Number(row.value);
            byTime.set(minuteKey, existing);
          }
          return Array.from(byTime.values()).sort((a, b) => b.logged_at - a.logged_at);
        }
      } catch (err) {
        console.warn('[ProgressRepository] Remote getMeasurements error:', err);
      }
    }

    return [];
  }

  async getWeightTrend(userId: string, days: number = 30): Promise<any[]> {
    const measurements = await this.getMeasurements(userId);
    const limitDate = Date.now() - days * 24 * 60 * 60 * 1000;
    return measurements
      .filter((m) => m.weight_kg != null && m.logged_at >= limitDate)
      .sort((a, b) => a.logged_at - b.logged_at);
  }

  // --- Remote Network Operations ---

  async fetchInsightsRemote(userId: string): Promise<any> {
    if (!this.supabase) {
      throw new Error('Supabase client not configured in ProgressRepository');
    }
    const { data, error } = await this.supabase.functions.invoke('generate-health-insights', {
      body: { clientId: userId },
    });
    if (error) throw error;
    return data;
  }
}

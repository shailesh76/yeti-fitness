import { Database } from '@nozbe/watermelondb';

export class HabitRepository {
  private db: Database;
  constructor(db: Database) { this.db = db; }

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

  async createHabit(athleteId: string, name: string, targetFrequency: number) {
    this.requireDb();
    return this.db.write(async () => {
      return this.db.get('habits').create(h => {
        (h as any).athlete_id = athleteId;
        (h as any).name = name;
        (h as any).target_frequency = targetFrequency;
      });
    });
  }
  async logHabit(habitId: string) {
    this.requireDb();
    return this.db.write(async () => {
      return this.db.get('habit_logs').create(h => {
        (h as any).habit_id = habitId;
        (h as any).completed_at = Date.now();
      });
    });
  }
  async getHabitHistory(habitId: string) {
    this.requireDb();
    return this.db.get('habit_logs').query().fetch();
  }
}

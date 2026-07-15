import { Database } from '@nozbe/watermelondb';

export class HabitRepository {
  private db: Database;
  constructor(db: Database) { this.db = db; }

  async createHabit(athleteId: string, name: string, targetFrequency: number) {
    return this.db.write(async () => {
      return this.db.get('habits').create(h => {
        (h as any).athlete_id = athleteId;
        (h as any).name = name;
        (h as any).target_frequency = targetFrequency;
      });
    });
  }
  async logHabit(habitId: string) {
    return this.db.write(async () => {
      return this.db.get('habit_logs').create(h => {
        (h as any).habit_id = habitId;
        (h as any).completed_at = Date.now();
      });
    });
  }
  async getHabitHistory(habitId: string) {
    return this.db.get('habit_logs').query().fetch();
  }
}

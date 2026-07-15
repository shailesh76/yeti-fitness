import { Database } from '@nozbe/watermelondb';
import { Exercise } from '../models/Exercise';

export class ExerciseRepository {
  private db: Database;
  private supabase?: any;

  constructor(db: Database, supabase?: any) {
    this.db = db;
    this.supabase = supabase;
  }

  async getExercises(): Promise<Exercise[]> {
    try {
      const local = await this.db.get<Exercise>('exercises').query().fetch();
      if (local.length > 0) {
        return local;
      }
    } catch (e) {
      console.warn('Failed to query local exercises, trying remote:', e);
    }

    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('exercises')
        .select('*')
        .order('name');
      if (!error && data) {
        // Save them locally in the background
        this.db.write(async () => {
          for (const ex of data) {
            try {
              await this.db.get<Exercise>('exercises').create(r => {
                r._raw.id = ex.id;
                r.name = ex.name;
                r.muscle_group = ex.muscle_group;
                r.instructions = ex.instructions;
                r.gif_url = ex.gif_url;
                r.video_url = ex.video_url;
              });
            } catch {}
          }
        }).catch(err => console.warn('Could not cache exercises locally:', err));
        return data;
      }
    }

    return [];
  }

  async getExerciseById(id: string): Promise<Exercise | null> {
    try {
      return await this.db.get<Exercise>('exercises').find(id);
    } catch {
      return null;
    }
  }

  async getAlternatives(exerciseId: string): Promise<Exercise[]> {
    const ex = await this.getExerciseById(exerciseId);
    if (!ex) return [];
    // Basic recommendation: same muscle group
    return this.db.get<Exercise>('exercises')
      .query()
      .fetch()
      .then(list => list.filter(item => item.muscle_group === ex.muscle_group && item.id !== ex.id));
  }
}

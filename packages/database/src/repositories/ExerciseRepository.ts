import { Database, Q } from '@nozbe/watermelondb';
import { Exercise } from '../models/Exercise';
import { SessionSet } from '../models/SessionSet';

export type ExerciseGuidanceType =
  | 'form_explanation'
  | 'common_mistakes'
  | 'breathing_technique'
  | 'beginner_version'
  | 'advanced_version'
  | 'injury_modifications';

export interface ExerciseRelations {
  variations: Exercise[];
  alternatives: Exercise[];
}

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
        // Save them locally in the background — best-effort only. The local DB is
        // unavailable on web, so skip caching there rather than throw and lose
        // the remote data we're about to return.
        if (this.db) {
          this.db.write(async () => {
            for (const ex of data) {
              try {
                await this.db.get<Exercise>('exercises').create(r => {
                  r._raw.id = ex.id;
                  r.name = ex.name;
                  r.muscle_group = ex.muscle_group;
                  r.category = ex.category;
                  r.equipment = ex.equipment;
                  r.instructions = ex.instructions;
                  r.gif_url = ex.gif_url;
                  r.video_url = ex.video_url;
                  r.body_part = ex.body_part;
                  r.target_muscle = ex.target_muscle;
                  r.secondary_muscles = ex.secondary_muscles ? JSON.stringify(ex.secondary_muscles) : undefined;
                  r.difficulty = ex.difficulty;
                  r.media_type = ex.media_type;
                  r.thumbnail_url = ex.thumbnail_url;
                  r.source = ex.source;
                  r.source_id = ex.source_id;
                  r.is_public = ex.is_public;
                });
              } catch {}
            }
          }).catch(err => console.warn('Could not cache exercises locally:', err));
        }
        return data;
      }
    }

    return [];
  }

  async getExerciseById(id: string): Promise<Exercise | null> {
    try {
      const local = await this.db.get<Exercise>('exercises').find(id);
      if (local) return local;
    } catch {
      // Not cached locally yet (or local db unavailable, e.g. web) — fall through to remote.
    }

    try {
      if (this.supabase) {
        const { data, error } = await this.supabase.from('exercises').select('*').eq('id', id).maybeSingle();
        if (!error && data) {
          if (this.db) {
            this.db.write(async () => {
              try {
                await this.db.get<Exercise>('exercises').create(r => {
                  r._raw.id = data.id;
                  r.name = data.name;
                  r.muscle_group = data.muscle_group;
                  r.category = data.category;
                  r.equipment = data.equipment;
                  r.instructions = data.instructions;
                  r.gif_url = data.gif_url;
                  r.video_url = data.video_url;
                  r.body_part = data.body_part;
                  r.target_muscle = data.target_muscle;
                  r.secondary_muscles = data.secondary_muscles ? JSON.stringify(data.secondary_muscles) : undefined;
                  r.difficulty = data.difficulty;
                  r.media_type = data.media_type;
                  r.thumbnail_url = data.thumbnail_url;
                  r.source = data.source;
                  r.source_id = data.source_id;
                  r.is_public = data.is_public;
                });
              } catch {}
            }).catch(() => {});
          }
          return data as Exercise;
        }
      }
    } catch {
      // Malformed/unconfigured supabase client — fail closed to null rather than throw.
    }

    return null;
  }

  async getAlternatives(exerciseId: string): Promise<Exercise[]> {
    const ex = await this.getExerciseById(exerciseId);
    if (!ex) return [];
    try {
      // Basic recommendation: same muscle group
      return await this.db.get<Exercise>('exercises')
        .query()
        .fetch()
        .then(list => list.filter(item => item.muscle_group === ex.muscle_group && item.id !== ex.id));
    } catch {
      return [];
    }
  }

  /**
   * Real curated alternatives/variations from exercise_relations (not the
   * muscle_group filter getAlternatives() above uses — that stays as the
   * separate, broader "Similar Exercises" bucket). Relation rows are remote
   * lookup only (exercise_relations isn't cached in WatermelonDB), but each
   * related exercise's details resolve through getExerciseById, which is
   * local-first — so once the catalog is cached, only this one small
   * lookup table needs network.
   */
  async getRelations(exerciseId: string): Promise<ExerciseRelations> {
    if (!this.supabase) return { variations: [], alternatives: [] };
    const { data, error } = await this.supabase
      .from('exercise_relations')
      .select('related_exercise_id, relation_type')
      .eq('exercise_id', exerciseId);
    if (error || !data || data.length === 0) return { variations: [], alternatives: [] };

    const variationIds = data.filter((r: any) => r.relation_type === 'variation').map((r: any) => r.related_exercise_id);
    const alternativeIds = data.filter((r: any) => r.relation_type === 'alternative').map((r: any) => r.related_exercise_id);

    const [variations, alternatives] = await Promise.all([
      Promise.all(variationIds.map((id: string) => this.getExerciseById(id))),
      Promise.all(alternativeIds.map((id: string) => this.getExerciseById(id))),
    ]);

    return {
      variations: variations.filter((e): e is Exercise => e !== null),
      alternatives: alternatives.filter((e): e is Exercise => e !== null),
    };
  }

  /**
   * On-demand AI guidance for one exercise (form explanation, common
   * mistakes, etc). Calls the exercise-guidance Edge Function, which is the
   * only place that talks to the shared AI provider service for this
   * feature — nothing here duplicates provider/model logic.
   */
  async getGuidance(exerciseId: string, guidanceType: ExerciseGuidanceType): Promise<string> {
    if (!this.supabase) throw new Error('AI guidance requires network connectivity');
    const { data, error } = await this.supabase.functions.invoke('exercise-guidance', {
      body: { exerciseId, guidanceType },
    });
    if (error) {
      // supabase-js collapses a non-2xx function response into a generic
      // FunctionsHttpError whose .message is just "…returned a non-2xx status".
      // The real reason (AI_PROVIDER_NOT_CONFIGURED, daily-limit, not-found,
      // provider error) lives in the response body — surface it so callers can
      // show an accurate message instead of a blanket "couldn't reach" error.
      let serverMessage: string | undefined;
      try {
        const body = await (error as any)?.context?.json?.();
        serverMessage = body?.error || body?.message;
      } catch {
        // Body wasn't JSON / already consumed — fall through to the raw error.
      }
      if (serverMessage) throw new Error(serverMessage);
      throw error;
    }
    if (!data?.text) throw new Error('AI_PROVIDER_NOT_CONFIGURED');
    return data.text as string;
  }

  /** Filter dropdown options, grouped by kind ('muscle' | 'equipment' | 'body_part' | 'category'). */
  async getTaxonomy(): Promise<Record<string, string[]>> {
    if (!this.supabase) return {};
    const { data, error } = await this.supabase.from('exercise_taxonomy').select('kind, value');
    if (error || !data) return {};
    const grouped: Record<string, string[]> = {};
    for (const row of data) {
      (grouped[row.kind] = grouped[row.kind] || []).push(row.value);
    }
    return grouped;
  }

  async getFavoriteIds(userId: string): Promise<Set<string>> {
    if (!this.supabase) return new Set();
    const { data, error } = await this.supabase
      .from('exercise_favorites')
      .select('exercise_id')
      .eq('user_id', userId);
    if (error || !data) return new Set();
    return new Set(data.map((r: { exercise_id: string }) => r.exercise_id));
  }

  async addFavorite(userId: string, exerciseId: string): Promise<void> {
    if (!this.supabase) return;
    await this.supabase
      .from('exercise_favorites')
      .upsert({ user_id: userId, exercise_id: exerciseId }, { onConflict: 'user_id,exercise_id' });
  }

  async removeFavorite(userId: string, exerciseId: string): Promise<void> {
    if (!this.supabase) return;
    await this.supabase
      .from('exercise_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId);
  }

  /**
   * Most recently logged exercises for this athlete, most recent first.
   * Reads local session_sets (offline-friendly, no network round trip) rather
   * than a dedicated tracking table — WatermelonDB has no DISTINCT operator,
   * so this scans a bounded recent window and de-dupes exercise_id in JS.
   */
  async getRecentExerciseIds(userId: string, limit = 10): Promise<string[]> {
    if (!this.db) return [];
    try {
      const recentSets = await this.db.get<SessionSet>('session_sets')
        .query(Q.where('user_id', userId), Q.sortBy('completed_at', Q.desc), Q.take(200))
        .fetch();
      const seen = new Set<string>();
      const ids: string[] = [];
      for (const set of recentSets) {
        if (!set.exercise_id || seen.has(set.exercise_id)) continue;
        seen.add(set.exercise_id);
        ids.push(set.exercise_id);
        if (ids.length >= limit) break;
      }
      return ids;
    } catch {
      return [];
    }
  }
}

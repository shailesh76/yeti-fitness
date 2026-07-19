import { Database } from '@nozbe/watermelondb';

export class ChallengeRepository {
  private db: Database;
  private supabase?: any;

  constructor(db: Database, supabase?: any) {
    this.db = db;
    this.supabase = supabase;
  }

  async fetchChallenges(): Promise<any[]> {
    if (!this.supabase) {
      throw new Error('Supabase client not configured in ChallengeRepository');
    }
    const { data, error } = await this.supabase
      .from('challenges')
      .select('*')
      .order('end_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async fetchLeaderboard(challengeId: string): Promise<any[]> {
    if (!this.supabase) {
      throw new Error('Supabase client not configured in ChallengeRepository');
    }
    const { data, error } = await this.supabase
      .from('challenge_participants')
      .select('*, athlete:profiles(full_name)')
      .eq('challenge_id', challengeId)
      .order('score', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async joinChallenge(challengeId: string, athleteId: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase client not configured in ChallengeRepository');
    }
    const { error } = await this.supabase
      .from('challenge_participants')
      .insert({
        challenge_id: challengeId,
        athlete_id: athleteId,
        score: 0
      });
    if (error) throw error;
  }
}

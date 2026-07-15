import { create } from 'zustand';
import { database } from '../database';
import { supabase } from '../lib/supabase';
import { ChallengeRepository } from '@yeti/database';

const challengeRepository = new ChallengeRepository(database, supabase);

export interface LeaderboardEntry {
  id: string;
  rank: number;
  user_id: string;
  user_name: string;
  avatar_initials: string;
  score: number;
  is_current_user?: boolean;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  thumbnail_url?: string;
  start_date: number;
  end_date: number;
  participant_count: number;
  metric: string; 
  top_avatars: string[];
}

interface ChallengeState {
  challenges: Challenge[];
  leaderboards: Record<string, LeaderboardEntry[]>;
  loading: boolean;
  fetchChallenges: () => Promise<void>;
  fetchLeaderboard: (challengeId: string, currentUserId?: string) => Promise<void>;
  joinChallenge: (challengeId: string) => Promise<void>;
}

export const useChallengeStore = create<ChallengeState>((set, get) => ({
  challenges: [],
  leaderboards: {},
  loading: false,

  fetchChallenges: async () => {
    set({ loading: true });
    try {
      const data = await challengeRepository.fetchChallenges();
      const mappedChallenges: Challenge[] = data.map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        thumbnail_url: c.thumbnail_url,
        start_date: new Date(c.start_date).getTime(),
        end_date: new Date(c.end_date).getTime(),
        participant_count: c.participant_count || 0,
        metric: c.metric || 'Workouts',
        top_avatars: (c.top_avatars || []) as string[],
      }));
      set({ challenges: mappedChallenges, loading: false });
    } catch (e) {
      console.error("Failed to fetch challenges:", e);
      set({ loading: false });
    }
  },

  fetchLeaderboard: async (challengeId: string, currentUserId?: string) => {
    set({ loading: true });
    try {
      const data = await challengeRepository.fetchLeaderboard(challengeId);
      const entries: LeaderboardEntry[] = data.map((p, i) => {
        const name = p.athlete?.full_name || 'Athlete';
        const initials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
        return {
          id: p.id,
          rank: i + 1,
          user_id: p.athlete_id,
          user_name: p.athlete_id === currentUserId ? 'You' : name,
          avatar_initials: initials,
          score: p.score || 0,
          is_current_user: p.athlete_id === currentUserId
        };
      });

      set(state => ({
        leaderboards: { ...state.leaderboards, [challengeId]: entries },
        loading: false
      }));
    } catch (e) {
      console.error("Failed to fetch leaderboard:", e);
      set({ loading: false });
    }
  },

  joinChallenge: async (challengeId: string) => {
    const { useAuthStore } = require('./useAuthStore');
    const userId = useAuthStore.getState().session?.user?.id;
    if (!userId) return;
    
    set({ loading: true });
    try {
      await challengeRepository.joinChallenge(challengeId, userId);
      set(state => ({
        challenges: state.challenges.map(c => 
          c.id === challengeId ? { ...c, participant_count: c.participant_count + 1 } : c
        ),
      }));
    } catch (e) {
      console.error("Failed to join challenge:", e);
    } finally {
      set({ loading: false });
    }
  }
}));

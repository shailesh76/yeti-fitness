/**
 * useAICoachStore — Real AI Coach State
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages conversation state, builds user context from real data,
 * and calls the Supabase ai-coach Edge Function.
 * Messages are persisted in Supabase ai_conversations + ai_messages.
 */
import { create } from 'zustand';
import { database, isNativeDbAvailable } from '../database';
import { supabase } from '../lib/supabase';

// The AI Coach persists conversations/messages in the local WatermelonDB, which
// is native-only. On web the adapter is unavailable, so we degrade gracefully with
// a clear message instead of crashing on a null database handle.
const WEB_UNAVAILABLE_MESSAGE =
  'The AI Coach is available in the Yeti mobile app. This feature is not supported on web.';
import { Q } from '@nozbe/watermelondb';
import { 
  AICoachRepository, 
  UserRepository, 
  WorkoutRepository, 
  NutritionRepository,
  SessionSet
} from '@yeti/database';

const aiCoachRepository = new AICoachRepository(database, supabase);
const userRepository = new UserRepository(database, supabase);
const workoutRepository = new WorkoutRepository(database, supabase);
const nutritionRepository = new NutritionRepository(database);

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;   // unix ms
}

interface AICoachState {
  conversationId: string | null;
  messages: AIMessage[];
  isLoading: boolean;
  error: string | null;

  /** Load or create a conversation for the current user */
  initConversation: (userId: string) => Promise<void>;

  /** Send a message and get AI response */
  sendMessage: (userId: string, text: string) => Promise<void>;

  /** Clear the chat (start fresh) */
  resetChat: (userId: string) => Promise<void>;
}

export interface StructuredCoachContext {
  profile: string;
  workout: string;
  nutrition: string;
}

async function buildUserContext(userId: string): Promise<StructuredCoachContext> {
  let profileSection = '';
  let workoutSection = '';
  let nutritionSection = '';

  try {
    // 1. Profile & Goals
    let profile = await userRepository.getProfile(userId);
    if (!profile) {
      const { data } = await userRepository.fetchProfileRemote(userId);
      if (data) {
        profile = await userRepository.updateProfile(userId, data);
      }
    }

    if (profile) {
      profileSection = `ATHLETE PROFILE:
- Name: ${profile.full_name || 'Athlete'}
- Goal: ${profile.goal || 'Not specified'}
- Experience: ${profile.experience_level || 'Unknown'}
- Age: ${profile.age || '?'}, Weight: ${profile.weight_kg || '?'}kg, Height: ${profile.height_cm || '?'}cm`;
    }

    // 2. Last 5 completed workout sessions from local DB
    const sessions = await workoutRepository.getWorkoutHistory(userId);
    const recentSessions = sessions.slice(0, 5);

    if (recentSessions.length) {
      const workoutSummary = await Promise.all(
        recentSessions.map(async (s) => {
          const date = new Date(s.started_at).toLocaleDateString();
          const volume = s.total_volume_kg ? `${Math.round(s.total_volume_kg)}kg total volume` : '';
          
          // Fetch sets for this session
          const sets = await database.get<SessionSet>('session_sets')
            .query(Q.where('session_id', s.id))
            .fetch();

          const exerciseSummary = Object.entries(
            sets.reduce((acc: any, set) => {
              if (!acc[set.exercise_name]) acc[set.exercise_name] = [];
              acc[set.exercise_name].push(`${set.weight_kg}kg×${set.reps}`);
              return acc;
            }, {}),
          )
            .map(([name, setList]: [string, any]) => `  ${name}: ${setList.join(', ')}`)
            .join('\n');

          return `${date} — ${s.name} ${volume}\n${exerciseSummary}`;
        })
      );
      workoutSection = `RECENT WORKOUTS (last 5):\n${workoutSummary.join('\n\n')}`;
    }

    // 3. Nutrition last 7 days (aggregate locally)
    let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;
    
    for (let i = 0; i < 7; i++) {
      const dayMs = Date.now() - i * 24 * 60 * 60 * 1000;
      const daily = await nutritionRepository.calculateDailyNutrition(userId, dayMs);
      totalCalories += daily.calories;
      totalProtein += daily.protein;
      totalCarbs += daily.carbs;
      totalFat += daily.fat;
    }

    nutritionSection = `NUTRITION (7-day average daily):
- Calories: ${Math.round(totalCalories / 7)} kcal
- Protein: ${Math.round(totalProtein / 7)}g
- Carbs: ${Math.round(totalCarbs / 7)}g
- Fat: ${Math.round(totalFat / 7)}g`;
  } catch (e) {
    console.warn('[AICoach] Context build error (non-fatal):', e);
  }

  return {
    profile: profileSection,
    workout: workoutSection,
    nutrition: nutritionSection,
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAICoachStore = create<AICoachState>((set, get) => ({
  conversationId: null,
  messages: [],
  isLoading: false,
  error: null,

  initConversation: async (userId: string) => {
    if (!isNativeDbAvailable || !database) {
      set({
        isLoading: false,
        error: WEB_UNAVAILABLE_MESSAGE,
        messages: [{ id: 'web-unavailable', role: 'assistant', content: WEB_UNAVAILABLE_MESSAGE, createdAt: Date.now() }],
      });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const conv = await aiCoachRepository.getOrCreateConversation(userId);
      const conversationId = conv.id;

      // Load message history from local database
      const messages = await aiCoachRepository.getMessagesLocal(conversationId);

      const mapped: AIMessage[] = messages.map((m) => ({
        id: m.id,
        role: m.role as any,
        content: m.content,
        createdAt: m.createdAt,
      }));

      // Add greeting if empty
      if (mapped.length === 0) {
        mapped.push({
          id: 'greeting',
          role: 'assistant',
          content:
            "Hey! I'm your Yeti AI Coach. I have access to your workout history, nutrition logs, and progress data. Ask me anything — technique, programming, recovery, or nutrition! 💪",
          createdAt: Date.now(),
        });
      }

      set({ conversationId, messages: mapped, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
    }
  },

  sendMessage: async (userId: string, text: string) => {
    const state = get();
    if (!text.trim() || state.isLoading) return;

    if (!isNativeDbAvailable || !database) {
      set({ error: WEB_UNAVAILABLE_MESSAGE });
      return;
    }

    const userMessage: AIMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: Date.now(),
    };

    set({ messages: [...state.messages, userMessage], isLoading: true, error: null });

    try {
      let convId = get().conversationId;
      if (!convId) {
        const conv = await aiCoachRepository.getOrCreateConversation(userId);
        convId = conv.id;
      }

      // 1. Save user message to local DB
      await aiCoachRepository.saveMessageLocal(convId, 'user', text);

      // 2. Build context + call Edge Function via AICoachRepository remote method
      const userContext = await buildUserContext(userId);

      const replyData = await aiCoachRepository.sendMessageRemote(
        userId,
        convId,
        text,
        userContext,
        get().messages.slice(-6).map((m) => ({ role: m.role, content: m.content }))
      );

      const reply = replyData?.reply || "I'm having trouble connecting right now. Please try again in a moment.";

      // 3. Save AI response to local DB
      await aiCoachRepository.saveMessageLocal(convId, 'assistant', reply);

      const aiMessage: AIMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: reply,
        createdAt: Date.now(),
      };

      set({
        messages: [...get().messages, aiMessage],
        isLoading: false,
      });
    } catch (err: any) {
      console.error('[AICoach] sendMessage error:', err);

      const errorMessage: AIMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content:
          "I'm having trouble connecting right now. Check your internet connection and try again. Your question was: *" +
          text +
          '*',
        createdAt: Date.now(),
      };

      set({
        messages: [...get().messages, errorMessage],
        isLoading: false,
        error: err.message,
      });
    }
  },

  resetChat: async (userId: string) => {
    const { conversationId } = get();
    if (conversationId) {
      // Soft reset: we delete the conversation remotely (cascades messages)
      await supabase
        .from('ai_conversations')
        .delete()
        .eq('id', conversationId);
    }
    set({ conversationId: null, messages: [] });
    await get().initConversation(userId);
  },
}));

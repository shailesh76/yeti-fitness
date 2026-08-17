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

export interface AIAction {
  id: string;
  type: 'set_nutrition_targets' | 'create_workout_plan' | 'confirm_workout_plan' | 'edit_workout_plan' | 'confirm_plan_edit' | 'cancel_plan_edit';
  label: string;
  data: any;
  applied?: boolean;
  cancelled?: boolean;
  status?: 'pending' | 'applied' | 'cancelled' | 'expired' | 'stale';
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;   // unix ms
  actions?: AIAction[];
}

interface AICoachState {
  conversationId: string | null;
  messages: AIMessage[];
  isLoading: boolean;
  error: string | null;
  /** True when the last send failed because the session is unrecoverably
   * expired (not an AI/provider failure) — the screen should offer a Sign In
   * action rather than a generic "try again" retry. */
  authError: boolean;

  /** Load or create a conversation for the current user */
  initConversation: (userId: string) => Promise<void>;

  /** Send a message and get AI response */
  sendMessage: (userId: string, text: string) => Promise<void>;

  /** Clear the chat (start fresh) */
  resetChat: (userId: string) => Promise<void>;

  /** Mark an action as applied */
  markActionApplied: (messageId: string, actionId: string) => void;

  /** Mark an action as cancelled */
  markActionCancelled: (messageId: string, actionId: string) => void;

  /** Update action status */
  markActionStatus: (messageId: string, actionId: string, status: 'pending' | 'applied' | 'cancelled' | 'expired' | 'stale') => void;
}

const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign in again.';

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

// NOTE: there was previously a `generateFallbackResponse()` here that returned
// hardcoded, FABRICATED nutrition targets / workout plans / "recovery metrics
// (86%)" text whenever the edge function call failed for any reason. That is
// exactly the "never fabricate workout or nutrition information" violation
// this app must not have — a transient server/network failure was silently
// being dressed up as a confident, personalised answer, with action buttons
// implying data had been generated when nothing had. Do not reintroduce it:
// on failure, say so honestly (see the two call sites below) and let the
// athlete retry — never invent a plan or targets.

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAICoachStore = create<AICoachState>((set, get) => ({
  conversationId: null,
  messages: [],
  isLoading: false,
  error: null,
  authError: false,

  initConversation: async (userId: string) => {
    if (!isNativeDbAvailable || !database) {
      set({
        conversationId: `web_session_${userId}`,
        isLoading: false,
        error: null,
        messages: [{
          id: 'greeting',
          role: 'assistant',
          content: "Hey! I'm your Yeti AI Coach. I have access to your workout history, nutrition logs, and progress data. Ask me anything — technique, programming, recovery, or nutrition! 💪",
          createdAt: Date.now()
        }],
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

    const userMessage: AIMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: Date.now(),
    };

    set({ messages: [...state.messages, userMessage], isLoading: true, error: null, authError: false });

    if (!isNativeDbAvailable || !database) {
      try {
        const convId = state.conversationId || `web_session_${userId}`;
        const replyData = await aiCoachRepository.sendMessageRemote(
          userId,
          convId,
          text,
          'User is interacting via Yeti Web App.',
          get().messages.slice(-6).map((m) => ({ role: m.role, content: m.content }))
        );

        let reply = replyData?.reply;
        const actions: AIAction[] = (replyData?.actions || []).map((a: any, i: number) => ({
          id: `action_${Date.now()}_${i}`,
          type: a.type,
          label: a.label || (a.type === 'set_nutrition_targets' ? '🎯 Set as My Targets' : '➕ Add to My Workouts'),
          data: a.data,
          applied: false,
        }));
        if (!reply) {
          // Honest fallback — NEVER fabricate nutrition targets or a workout
          // plan, and never attach a default action, when the server didn't
          // return a usable reply.
          reply = "I couldn't generate a response just now. Please rephrase or try again in a moment.";
        }

        const aiMessage: AIMessage = {
          id: `ai_${Date.now()}`,
          role: 'assistant',
          content: reply,
          createdAt: Date.now(),
          actions: actions.length > 0 ? actions : undefined,
        };

        set({
          messages: [...get().messages, aiMessage],
          isLoading: false,
        });
      } catch (err: any) {
        // An auth failure (session unrecoverably expired — repository already
        // tried a refresh-and-retry) is NOT an AI failure and must never be
        // shown or treated as one.
        const isAuthError = !!err?.isAuthError;
        const aiMessage: AIMessage = {
          id: `ai_${Date.now()}`,
          role: 'assistant',
          // Transient (non-auth) failure — surface an honest message. NEVER
          // fabricate a nutrition/workout answer or attach a default action.
          content: isAuthError ? SESSION_EXPIRED_MESSAGE : 'Yeti Coach is temporarily unable to respond. Please try again shortly.',
          createdAt: Date.now(),
        };
        set({
          messages: [...get().messages, aiMessage],
          isLoading: false,
          error: null,
          authError: isAuthError,
        });
      }
      return;
    }


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
      const actions: AIAction[] = (replyData?.actions || []).map((a: any, i: number) => ({
        id: `action_${Date.now()}_${i}`,
        type: a.type,
        label: a.label || (a.type === 'set_nutrition_targets' ? '🎯 Set as My Targets' : '➕ Add to My Workouts'),
        data: a.data,
        applied: false,
      }));

      // 3. Save AI response to local DB
      await aiCoachRepository.saveMessageLocal(convId, 'assistant', reply);

      const aiMessage: AIMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: reply,
        createdAt: Date.now(),
        actions: actions.length > 0 ? actions : undefined,
      };

      set({
        messages: [...get().messages, aiMessage],
        isLoading: false,
      });
    } catch (err: any) {
      console.error('[AICoach] sendMessage error:', err);

      // The repository already attempted a refresh-and-retry for a 401
      // before ever throwing, so reaching here means the session is
      // unrecoverably expired — never an AI/provider failure. The string
      // checks stay as a defence-in-depth fallback (e.g. an auth error
      // surfacing from a different call path that doesn't set the flag).
      const errStr = (err?.message || '').toLowerCase();
      const isAuthError = !!err?.isAuthError || errStr.includes('unauthorized') || errStr.includes('auth session missing') || err?.status === 401;

      const userContent = isAuthError
        ? SESSION_EXPIRED_MESSAGE
        : "I'm having trouble connecting right now. Check your internet connection and try again. Your question was: *" +
          text +
          '*';

      const errorMessage: AIMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: userContent,
        createdAt: Date.now(),
      };

      set({
        messages: [...get().messages, errorMessage],
        isLoading: false,
        error: isAuthError ? 'Unauthorized session' : err.message,
        authError: isAuthError,
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

  markActionApplied: (messageId: string, actionId: string) => {
    const messages = get().messages.map((m) => {
      if (m.id !== messageId) return m;
      return {
        ...m,
        actions: m.actions?.map((a) =>
          a.id === actionId ? { ...a, applied: true, status: 'applied' as const } : a
        ),
      };
    });
    set({ messages });
  },

  markActionCancelled: (messageId: string, actionId: string) => {
    const messages = get().messages.map((m) => {
      if (m.id !== messageId) return m;
      return {
        ...m,
        actions: m.actions?.map((a) =>
          a.id === actionId ? { ...a, cancelled: true, status: 'cancelled' as const } : a
        ),
      };
    });
    set({ messages });
  },

  markActionStatus: (messageId: string, actionId: string, status: 'pending' | 'applied' | 'cancelled' | 'expired' | 'stale') => {
    const messages = get().messages.map((m) => {
      if (m.id !== messageId) return m;
      return {
        ...m,
        actions: m.actions?.map((a) =>
          a.id === actionId ? { ...a, status, applied: status === 'applied', cancelled: status === 'cancelled' } : a
        ),
      };
    });
    set({ messages });
  },
}));

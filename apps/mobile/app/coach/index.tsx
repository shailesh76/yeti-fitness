import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  ScrollView,
  Alert as RNAlert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// react-native's bare Alert.alert() is a no-op on web (confirmed live: none
// of this screen's save/error messages were reaching the athlete on the
// deployed PWA). Same shim as food-search.tsx uses for the same reason —
// falls through to a real window.alert/confirm on web, untouched native
// Alert everywhere else.
const Alert = {
  alert: (title: string, message?: string, buttons?: any[]) => {
    if (Platform.OS === 'web') {
      if (buttons && buttons.length > 0) {
        const confirmBtn = buttons.find((b) => b.style === 'destructive' || b.text === 'OK' || !b.style);
        const cancelBtn = buttons.find((b) => b.style === 'cancel' || b.text === 'Cancel');
        const confirmVal = window.confirm(`${title}${message ? `\n\n${message}` : ''}`);
        if (confirmVal && confirmBtn?.onPress) confirmBtn.onPress();
        else if (!confirmVal && cancelBtn?.onPress) cancelBtn.onPress();
      } else {
        window.alert(`${title}${message ? `: ${message}` : ''}`);
      }
    } else {
      RNAlert.alert(title, message, buttons);
    }
  },
};
import { Ionicons } from '@expo/vector-icons';
import { useAICoachStore, AIMessage, AIAction } from '../../store/useAICoachStore';
import { saveNutritionTargets } from '../../services/nutritionTargets';
import {
  saveWorkoutPlanFromAction, buildDraftFromAction, classifyAICoachAction,
  executePlanEditFromAction, cancelPlanEditFromAction,
} from '../../services/aiCoachWorkoutPlan';
import { WorkoutPlanEditConfirmationCard } from '../../components/WorkoutPlanEditConfirmationCard';
import { useWorkoutBuilderStore } from '../../store/useWorkoutBuilderStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useRepositories } from '../../hooks/useRepositories';
import { supabase } from '../../lib/supabase';
import { P } from '../../constants/premiumTheme';
import { EVENTS } from '../../constants/analyticsEvents';
import AppShell from '../../components/AppShell';

import { useRouter } from 'expo-router';

type ActiveTab = 'overview' | 'human' | 'ai';
type AiTopic = 'all' | 'workouts' | 'nutrition' | 'recovery' | 'programming';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export default function CoachHubScreen() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;

  const { messagingRepository, eventRepository, workoutRepository, exerciseRepository, aiCoachRepository } = useRepositories();

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [aiTopic, setAiTopic] = useState<AiTopic>('all');

  // AI Coach State (from Store)
  const {
    messages: aiMessages,
    isLoading: aiLoading,
    conversationId: aiConvId,
    authError: aiAuthError,
    initConversation,
    sendMessage: sendAIMessage,
    resetChat,
    markActionApplied,
  } = useAICoachStore();

  const [aiInputText, setAiInputText] = useState('');
  const aiFlatListRef = useRef<FlatList>(null);
  // Action ids currently mid-save/mid-open, so a second tap on the same
  // button before the first async call finishes is a no-op instead of firing
  // a second createOwnWorkoutPlan/catalog-resolution — the real duplicate-
  // plan guard lives in saveWorkoutPlanFromAction's in-flight map, this is
  // the visible half (disables the button + swaps in a spinner).
  const [applyingActionIds, setApplyingActionIds] = useState<Set<string>>(new Set());

  // Human Coach State
  const [coachProfile, setCoachProfile] = useState<{
    id: string;
    name: string;
    title: string;
    rating: string;
    athletes: number;
    experience: string;
    responseRate: string;
  } | null>(null);
  const [humanConv, setHumanConv] = useState<any | null>(null);
  const [humanMessages, setHumanMessages] = useState<Message[]>([]);
  const [humanLoading, setHumanLoading] = useState(false);
  const [humanInputText, setHumanInputText] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const humanFlatListRef = useRef<FlatList>(null);

  // Init AI conversation on mount
  useEffect(() => {
    if (userId && !aiConvId) {
      initConversation(userId);
    }
  }, [userId]);

  // Load human coach details & messages
  const loadHumanCoachData = async () => {
    if (!userId) return;
    setHumanLoading(true);
    try {
      const { data: rel, error: relErr } = await supabase
        .from('coach_clients')
        .select('coach_id, coach:profiles!coach_clients_coach_id_fkey(full_name)')
        .eq('athlete_id', userId)
        .maybeSingle();

      if (relErr) throw relErr;

      const coachName = rel && (rel.coach as any)?.full_name ? (rel.coach as any).full_name : 'Coach Alex';

      setCoachProfile({
        id: rel?.coach_id || 'coach-alex-id',
        name: coachName,
        title: 'Strength & Conditioning Coach',
        rating: '5.0 ★',
        athletes: 128,
        experience: '3 yrs',
        responseRate: '98%',
      });

      if (rel?.coach_id) {
        const conv = await messagingRepository.getOrCreateDirectConversation(userId, rel.coach_id);
        setHumanConv(conv);
        const msgs = await messagingRepository.getMessages(conv.id);
        if (msgs && msgs.length > 0) {
          setHumanMessages(msgs);
        } else {
          setHumanMessages([
            {
              id: 'msg-welcome-1',
              conversation_id: conv.id,
              sender_id: rel.coach_id,
              content: 'Hi James! 👋 Welcome to your coaching portal. I reviewed your recent workout logs — 92% adherence is fantastic!',
              created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            },
            {
              id: 'msg-welcome-2',
              conversation_id: conv.id,
              sender_id: userId,
              content: 'Thanks Coach Alex! Excited for the Push Pull Legs phase.',
              created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            },
          ]);
        }
        setIsOnline(true);
      } else {
        setHumanMessages([
          {
            id: 'msg-welcome-1',
            conversation_id: 'conv-alex-demo',
            sender_id: 'coach-alex-id',
            content: 'Hi James! 👋 Welcome to your coaching portal. I reviewed your recent workout logs — 92% adherence is fantastic!',
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          },
          {
            id: 'msg-welcome-2',
            conversation_id: 'conv-alex-demo',
            sender_id: userId || 'user-1',
            content: 'Thanks Coach Alex! Excited for the Push Pull Legs phase.',
            created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          },
        ]);
      }
    } catch (e) {
      console.warn('Failed to load human coach data:', e);
      setCoachProfile({
        id: 'coach-alex-id',
        name: 'Coach Alex',
        title: 'Strength & Conditioning Coach',
        rating: '5.0 ★',
        athletes: 128,
        experience: '3 yrs',
        responseRate: '98%',
      });
      setHumanMessages([
        {
          id: 'msg-welcome-1',
          conversation_id: 'conv-alex-demo',
          sender_id: 'coach-alex-id',
          content: 'Hi James! 👋 Welcome to your coaching portal. I reviewed your recent workout logs — 92% adherence is fantastic!',
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        },
      ]);
      setIsOnline(true);
    } finally {
      setHumanLoading(false);
    }
  };

  useEffect(() => {
    loadHumanCoachData();
  }, [userId]);

  // Supabase Realtime Subscription for human messages
  useEffect(() => {
    if (!humanConv?.id) return;

    const channel = supabase
      .channel(`room:${humanConv.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${humanConv.id}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setHumanMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          setTimeout(() => humanFlatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [humanConv?.id]);

  // Scroll to bottom on updates
  useEffect(() => {
    if (aiMessages.length > 0 && activeTab === 'ai') {
      setTimeout(() => aiFlatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [aiMessages.length, activeTab]);

  useEffect(() => {
    if (humanMessages.length > 0 && activeTab === 'human') {
      setTimeout(() => humanFlatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [humanMessages.length, activeTab]);

  // Handlers
  const handleSendAI = useCallback(async (promptText?: string) => {
    const textToSend = promptText || aiInputText;
    if (!userId || !textToSend.trim() || aiLoading) return;
    const text = textToSend.trim();
    if (!promptText) setAiInputText('');

    if (aiMessages.length === 0) {
      eventRepository.logActivity(userId, EVENTS.AI_CHAT_STARTED).catch(() => {});
    }
    await sendAIMessage(userId, text);
  }, [userId, aiInputText, aiLoading, aiMessages.length, sendAIMessage]);

  const handleSendHuman = useCallback(async () => {
    if (!userId || !humanInputText.trim() || !humanConv?.id) return;
    const text = humanInputText.trim();
    setHumanInputText('');

    const clientMsgId = 'msg_' + Math.random().toString(36).substring(7);

    const optimisticMessage: Message = {
      id: clientMsgId,
      conversation_id: humanConv.id,
      sender_id: userId,
      content: text,
      created_at: new Date().toISOString(),
    };
    setHumanMessages((prev) => [...prev, optimisticMessage]);

    eventRepository.logActivity(userId, EVENTS.MESSAGE_SENT, { conversationId: humanConv.id }).catch(() => {});

    try {
      await messagingRepository.sendMessage(humanConv.id, userId, text, clientMsgId);
      setIsOnline(true);
    } catch (e) {
      console.warn('Failed to send message:', e);
      setIsOnline(false);
      setHumanMessages((prev) => prev.filter((m) => m.id !== clientMsgId));
    }
  }, [userId, humanInputText, humanConv?.id]);

  const handleResetAI = useCallback(() => {
    if (!userId) return;
    resetChat(userId);
  }, [userId, resetChat]);

  // Clears the dead local session (never re-attempt with the same expired
  // token) and sends the athlete to the real sign-in screen.
  const handleSignIn = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Best-effort — proceed to the sign-in screen regardless.
    }
    router.replace('/auth');
  }, [router]);

  const handleApplyAction = useCallback(async (messageId: string, action: AIAction) => {
    if (!userId) {
      Alert.alert('Sign in required', 'Please sign in to save targets or workout plans.');
      return;
    }

    const kind = classifyAICoachAction(action.type);

    if (kind === 'nutrition_targets') {
      try {
        const success = await saveNutritionTargets(userId, action.data);
        if (success) {
          Alert.alert(
            '🎯 Nutrition Targets Saved!',
            `Updated your daily targets:\n• Calories: ${action.data.calories ?? '?'} kcal\n• Protein: ${action.data.protein ?? '?'}g\n• Carbs: ${action.data.carbs ?? '?'}g\n• Fat: ${action.data.fat ?? '?'}g`
          );
          markActionApplied(messageId, action.id);
        } else {
          Alert.alert('Notice', 'Your nutrition targets are locked by your human coach.');
        }
      } catch (err: any) {
        console.error('[AICoachAction] set_nutrition_targets error:', err);
        Alert.alert('Error', err.message || 'Failed to apply action.');
      }
      return;
    }

    // Shared save path for both action types: create_workout_plan (legacy
    // type, still used by the pre-first-message demo transcript below) and
    // confirm_workout_plan (what the server actually emits — see
    // coachSchema.ts's computeActions). Same call, same outcome handling —
    // there is no separate persistence logic to drift between them.
    if (kind === 'workout_save') {
      if (applyingActionIds.has(action.id)) return; // already saving this exact action
      setApplyingActionIds((prev) => new Set(prev).add(action.id));
      try {
        const outcome = await saveWorkoutPlanFromAction(action.id, action.data || {}, {
          userId,
          workoutRepository,
          exerciseRepository,
        });
        if (outcome.kind === 'success') {
          Alert.alert(
            '🏋️ Workout Plan Added!',
            `Successfully added "${action.data?.name || 'AI Recommended Plan'}" to your Workouts tab!`
          );
          markActionApplied(messageId, action.id);
        } else if (outcome.kind === 'unresolved') {
          // Never save a partial/corrupted plan — nothing was persisted, and
          // the action stays un-applied so the athlete can retry after
          // fixing it via "Adjust it first".
          Alert.alert(
            'Could Not Save Plan',
            `These exercises couldn't be matched to Yeti's exercise library, so nothing was saved:\n\n${outcome.names.join('\n')}\n\nTry "Adjust it first" to fix them manually.`
          );
        } else if (outcome.kind === 'empty') {
          Alert.alert('Nothing to Save', 'This plan has no exercises yet.');
        } else {
          Alert.alert('Error', outcome.message);
        }
      } finally {
        setApplyingActionIds((prev) => {
          const next = new Set(prev);
          next.delete(action.id);
          return next;
        });
      }
      return;
    }

    if (kind === 'workout_edit') {
      if (applyingActionIds.has(action.id)) return;
      setApplyingActionIds((prev) => new Set(prev).add(action.id));
      try {
        const draft = await buildDraftFromAction(action.data || {}, exerciseRepository);
        if (draft.exercises.length === 0) {
          Alert.alert(
            'Could Not Open Draft',
            draft.unresolvedNames.length > 0
              ? `None of these exercises could be matched to Yeti's exercise library:\n\n${draft.unresolvedNames.join('\n')}`
              : 'This plan has no exercises yet.'
          );
          return;
        }
        // Populate the real builder screen's store BEFORE navigating — the
        // screen reads from it on mount rather than from a route param, so
        // order matters here.
        useWorkoutBuilderStore.getState().loadDraftFromAI(draft.name, draft.notes, draft.exercises);
        if (draft.unresolvedNames.length > 0) {
          Alert.alert(
            'Opened as Draft',
            `Loaded with what could be matched. Add these manually — they weren't found in Yeti's exercise library:\n\n${draft.unresolvedNames.join('\n')}`
          );
        }
        router.push('/workouts/create?fromAI=1');
        markActionApplied(messageId, action.id);
      } catch (err: any) {
        console.error('[AICoachAction] edit_workout_plan error:', err);
        Alert.alert('Error', err.message || 'Failed to open plan for editing.');
      } finally {
        setApplyingActionIds((prev) => {
          const next = new Set(prev);
          next.delete(action.id);
          return next;
        });
      }
      return;
    }

    if (kind === 'plan_edit_confirm') {
      const proposalId = action.data?.proposalId;
      if (!proposalId) {
        Alert.alert('Error', 'Invalid proposal details.');
        return;
      }
      if (applyingActionIds.has(action.id)) return;
      setApplyingActionIds((prev) => new Set(prev).add(action.id));
      try {
        const outcome = await executePlanEditFromAction(action.id, proposalId, aiCoachRepository);

        if (outcome.kind === 'success' || outcome.kind === 'already_applied') {
          Alert.alert(
            '🏋️ Workout Plan Updated!',
            outcome.message || 'Successfully applied change to your workout plan.'
          );
          markActionApplied(messageId, action.id);
        } else if (outcome.kind === 'expired') {
          Alert.alert('Proposal Expired', outcome.message);
          useAICoachStore.getState().markActionStatus(messageId, action.id, 'expired');
        } else if (outcome.kind === 'cancelled') {
          Alert.alert('Proposal Cancelled', outcome.message);
          useAICoachStore.getState().markActionStatus(messageId, action.id, 'cancelled');
        } else if (outcome.kind === 'stale') {
          Alert.alert('Plan State Changed', outcome.message);
          useAICoachStore.getState().markActionStatus(messageId, action.id, 'stale');
        } else {
          Alert.alert('Error', outcome.message);
        }
      } finally {
        setApplyingActionIds((prev) => {
          const next = new Set(prev);
          next.delete(action.id);
          return next;
        });
      }
      return;
    }

    if (kind === 'plan_edit_cancel') {
      const proposalId = action.data?.proposalId;
      if (proposalId) {
        cancelPlanEditFromAction(proposalId, aiCoachRepository).catch(() => {});
      }
      useAICoachStore.getState().markActionCancelled(messageId, action.id);
      return;
    }

    // Any action type the server can emit but this screen doesn't implement
    // yet (e.g. confirm_nutrition_plan — a real type in coachSchema.ts's
    // CoachAction union with no save path here) must never silently no-op:
    // that reads to the athlete as a dead button. Say so plainly instead.
    Alert.alert('Not Available Yet', "This action isn't supported in the app yet.");
  }, [userId, markActionApplied, workoutRepository, exerciseRepository, aiCoachRepository, router, applyingActionIds]);

  // Render AI Message Item
  const renderAIMessage = ({ item }: { item: AIMessage }) => {
    const isUser = item.role === 'user';
    const timeStr = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={[styles.bubbleWrapper, isUser ? styles.userWrapper : styles.aiWrapper]}>
        {!isUser && (
          <View style={styles.avatarDot}>
            <Image
              source={require('../../assets/yeti_mascot_avatar.png')}
              style={{ width: '100%', height: '100%', borderRadius: 14 }}
              resizeMode="cover"
            />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>{item.content}</Text>

          {/* Dedicated confirmation card for plan edit proposals */}
          {!isUser && item.actions && item.actions.some((a) => a.type === 'confirm_plan_edit') && (
            item.actions
              .filter((a) => a.type === 'confirm_plan_edit')
              .map((act) => (
                <WorkoutPlanEditConfirmationCard
                  key={act.id}
                  proposal={act.data}
                  isApplying={applyingActionIds.has(act.id)}
                  applied={act.applied}
                  cancelled={act.cancelled}
                  status={act.status}
                  onConfirm={() => handleApplyAction(item.id, act)}
                  onCancel={() => handleApplyAction(item.id, { ...act, type: 'cancel_plan_edit' })}
                />
              ))
          )}

          {/* Standard action buttons for other action types */}
          {!isUser && item.actions && item.actions.some((a) => a.type !== 'confirm_plan_edit' && a.type !== 'cancel_plan_edit') && (
            <View style={styles.actionBtnContainer}>
              {item.actions
                .filter((a) => a.type !== 'confirm_plan_edit' && a.type !== 'cancel_plan_edit')
                .map((act) => {
                  const isApplying = applyingActionIds.has(act.id);
                  return (
                    <TouchableOpacity
                      key={act.id}
                      style={[styles.aiActionBtn, act.applied && styles.aiActionBtnApplied]}
                      onPress={() => handleApplyAction(item.id, act)}
                      disabled={act.applied || isApplying}
                    >
                      {isApplying ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Ionicons
                          name={act.applied ? 'checkmark-circle' : act.type === 'set_nutrition_targets' ? 'nutrition-outline' : 'barbell-outline'}
                          size={16}
                          color={act.applied ? '#30D158' : '#FFF'}
                        />
                      )}
                      <Text style={[styles.aiActionBtnText, act.applied && styles.aiActionBtnAppliedText]}>
                        {act.applied ? '✓ Applied' : isApplying ? 'Saving…' : act.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
            </View>
          )}

          <Text style={[styles.timestampText, isUser ? { color: 'rgba(255,255,255,0.7)' } : { color: P.TEXT_MUT }]}>
            {timeStr}
          </Text>
        </View>
      </View>
    );
  };

  // Render Human Message Item
  const renderHumanMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender_id === userId;
    const timeStr = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={[styles.bubbleWrapper, isUser ? styles.userWrapper : styles.aiWrapper]}>
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>{item.content}</Text>
          <Text style={[styles.timestampText, isUser ? { color: 'rgba(255,255,255,0.7)' } : { color: P.TEXT_MUT }]}>
            {timeStr}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <AppShell activeTab="coach">
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header & Navigation Segment */}
        <View style={styles.header}>
          <View style={styles.topRow}>
            {activeTab !== 'overview' ? (
              <TouchableOpacity style={styles.backBtn} onPress={() => setActiveTab('overview')}>
                <Ionicons name="arrow-back" size={20} color="#FFF" />
              </TouchableOpacity>
            ) : null}

            <View style={{ flex: 1 }}>
              <Text style={styles.screenTitle}>
                {activeTab === 'overview' ? 'Coach' : activeTab === 'human' ? 'My Coach' : 'AI Coach'}
              </Text>
              <Text style={styles.screenSubtitle}>HUMAN & AI COACHING</Text>
            </View>

            <TouchableOpacity style={styles.iconCircle} onPress={() => router.push('/notifications')}>
              <Ionicons name="notifications-outline" size={20} color={P.TEXT_PRI} />
              <View style={styles.notifBadge} />
            </TouchableOpacity>
          </View>

        {/* 3-Tab Segment Selector */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'overview' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('overview')}
          >
            <Ionicons name="compass-outline" size={14} color={activeTab === 'overview' ? P.BG : P.TEXT_SEC} />
            <Text style={[styles.segmentText, activeTab === 'overview' && styles.segmentTextActive]}>Overview</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'human' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('human')}
          >
            <Ionicons name="person-outline" size={14} color={activeTab === 'human' ? P.BG : P.TEXT_SEC} />
            <Text style={[styles.segmentText, activeTab === 'human' && styles.segmentTextActive]}>My Coach</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'ai' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('ai')}
          >
            <Ionicons name="sparkles" size={14} color={activeTab === 'ai' ? P.BG : P.TEXT_SEC} />
            <Text style={[styles.segmentText, activeTab === 'ai' && styles.segmentTextActive]}>AI Coach</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* TAB 1: OVERVIEW & JOURNEY */}
      {activeTab === 'overview' && (
        <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Dual Coach Cards */}
          <View style={styles.dualCardsRow}>
            <TouchableOpacity style={styles.coachCard} onPress={() => setActiveTab('human')}>
              <View style={styles.coachCardAvatarRow}>
                <View style={styles.humanAvatarContainer}>
                  <Ionicons name="person" size={20} color="#FFF" />
                  <View style={styles.onlineDot} />
                </View>
                <Ionicons name="chevron-forward" size={16} color={P.TEXT_MUT} />
              </View>
              <Text style={styles.coachCardTitle}>My Coach</Text>
              <Text style={styles.coachCardSub}>Human Coach • Coach Alex</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.coachCard, styles.aiCoachCard]} onPress={() => setActiveTab('ai')}>
              <View style={styles.coachCardAvatarRow}>
                <View style={styles.aiMascotContainer}>
                  <Image
                    source={require('../../assets/yeti_mascot_avatar.png')}
                    style={{ width: '100%', height: '100%', borderRadius: 16 }}
                    resizeMode="cover"
                  />
                  <View style={styles.onlineDot} />
                </View>
                <Ionicons name="sparkles" size={16} color={P.PURPLE_AI} />
              </View>
              <Text style={styles.coachCardTitle}>AI Coach</Text>
              <Text style={styles.coachCardSub}>Yeti AI • 24/7 Active</Text>
            </TouchableOpacity>
          </View>

          {/* Your Coaching Journey */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Your Coaching Journey</Text>
            <TouchableOpacity>
              <Text style={styles.sectionLink}>View Progress ›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.journeyGrid}>
            <View style={styles.journeyCard}>
              <View style={styles.journeyIconBg}>
                <Ionicons name="barbell-outline" size={18} color="#3B82F6" />
              </View>
              <Text style={styles.journeyValue}>24</Text>
              <Text style={styles.journeyLabel}>Workouts This Month</Text>
            </View>

            <View style={styles.journeyCard}>
              <View style={[styles.journeyIconBg, { backgroundColor: 'rgba(48, 209, 88, 0.15)' }]}>
                <Ionicons name="analytics-outline" size={18} color="#30D158" />
              </View>
              <Text style={styles.journeyValue}>92%</Text>
              <Text style={styles.journeyLabel}>Adherence (On Track)</Text>
            </View>

            <View style={styles.journeyCard}>
              <View style={[styles.journeyIconBg, { backgroundColor: 'rgba(255, 159, 10, 0.15)' }]}>
                <Ionicons name="pulse-outline" size={18} color="#FF9F0A" />
              </View>
              <Text style={styles.journeyValue}>7.8</Text>
              <Text style={styles.journeyLabel}>Avg. RPE (Moderate)</Text>
            </View>

            <View style={styles.journeyCard}>
              <View style={[styles.journeyIconBg, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                <Ionicons name="trophy-outline" size={18} color="#8B5CF6" />
              </View>
              <Text style={styles.journeyValue}>78</Text>
              <Text style={styles.journeyLabel}>Progress Score (Good)</Text>
            </View>
          </View>

          {/* Recent Conversations */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent Conversations</Text>
            <TouchableOpacity>
              <Text style={styles.sectionLink}>View All ›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.conversationsCard}>
            <TouchableOpacity style={styles.convItem} onPress={() => setActiveTab('human')}>
              <View style={styles.convAvatarCircle}>
                <Ionicons name="person" size={16} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.convHeaderRow}>
                  <Text style={styles.convTitle}>Program adjustments</Text>
                  <View style={styles.newTag}>
                    <Text style={styles.newTagText}>New</Text>
                  </View>
                </View>
                <Text style={styles.convSub}>Coach Alex • 10:30 AM</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={P.TEXT_MUT} />
            </TouchableOpacity>

            <View style={styles.itemDivider} />

            <TouchableOpacity style={styles.convItem} onPress={() => setActiveTab('ai')}>
              <View style={[styles.convAvatarCircle, { backgroundColor: P.PURPLE_AI }]}>
                <Ionicons name="sparkles" size={16} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.convTitle}>Shoulder pain advice</Text>
                <Text style={styles.convSub}>AI Coach • Yesterday</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={P.TEXT_MUT} />
            </TouchableOpacity>

            <View style={styles.itemDivider} />

            <TouchableOpacity style={styles.convItem} onPress={() => setActiveTab('human')}>
              <View style={styles.convAvatarCircle}>
                <Ionicons name="person" size={16} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.convTitle}>Nutrition plan update</Text>
                <Text style={styles.convSub}>Coach Alex • May 18</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={P.TEXT_MUT} />
            </TouchableOpacity>

            <View style={styles.itemDivider} />

            <TouchableOpacity style={styles.convItem} onPress={() => setActiveTab('ai')}>
              <View style={[styles.convAvatarCircle, { backgroundColor: P.PURPLE_AI }]}>
                <Ionicons name="sparkles" size={16} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.convTitle}>Deload week suggestions</Text>
                <Text style={styles.convSub}>AI Coach • May 16</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={P.TEXT_MUT} />
            </TouchableOpacity>
          </View>

          {/* Quick Actions Grid */}
          <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setActiveTab('human')}>
              <View style={styles.actionIconBox}>
                <Ionicons name="chatbubbles-outline" size={20} color="#3B82F6" />
              </View>
              <Text style={styles.actionText}>Message Coach</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={() => setActiveTab('ai')}>
              <View style={[styles.actionIconBox, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                <Ionicons name="sparkles-outline" size={20} color="#8B5CF6" />
              </View>
              <Text style={styles.actionText}>Ask AI Coach</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn}>
              <View style={[styles.actionIconBox, { backgroundColor: 'rgba(48, 209, 88, 0.15)' }]}>
                <Ionicons name="calendar-outline" size={20} color="#30D158" />
              </View>
              <Text style={styles.actionText}>View Plan</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn}>
              <View style={[styles.actionIconBox, { backgroundColor: 'rgba(255, 159, 10, 0.15)' }]}>
                <Ionicons name="document-text-outline" size={20} color="#FF9F0A" />
              </View>
              <Text style={styles.actionText}>Progress Report</Text>
            </TouchableOpacity>
          </View>

          {/* Premium Banner */}
          <View style={styles.premiumBanner}>
            <View style={{ flex: 1 }}>
              <View style={styles.premiumBadgeRow}>
                <Ionicons name="diamond" size={14} color="#FFF" />
                <Text style={styles.premiumBadgeText}>Premium Coaching</Text>
              </View>
              <Text style={styles.premiumSubtext}>
                Unlock unlimited coaching, priority responses, and advanced biometrics insights.
              </Text>
            </View>
            <TouchableOpacity style={styles.upgradeBtn}>
              <Text style={styles.upgradeBtnText}>Upgrade</Text>
            </TouchableOpacity>
          </View>

          {/* This Week's Insights */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>This Week&apos;s Insights</Text>
            <TouchableOpacity>
              <Text style={styles.sectionLink}>View All ›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.insightsCard}>
            <View style={styles.insightRow}>
              <View style={[styles.insightIconBg, { backgroundColor: 'rgba(48, 209, 88, 0.15)' }]}>
                <Ionicons name="fitness-outline" size={18} color="#30D158" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.insightTextHeader}>
                  <Text style={styles.insightTitle}>Training Load</Text>
                  <Text style={[styles.insightStatus, { color: '#30D158' }]}>Good</Text>
                </View>
                <Text style={styles.insightDesc}>You&apos;re training at the right intensity.</Text>
              </View>
            </View>

            <View style={styles.itemDivider} />

            <View style={styles.insightRow}>
              <View style={[styles.insightIconBg, { backgroundColor: 'rgba(255, 159, 10, 0.15)' }]}>
                <Ionicons name="moon-outline" size={18} color="#FF9F0A" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.insightTextHeader}>
                  <Text style={styles.insightTitle}>Recovery</Text>
                  <Text style={[styles.insightStatus, { color: '#FF9F0A' }]}>Needs Attention</Text>
                </View>
                <Text style={styles.insightDesc}>Consider more rest and 8 hours of sleep.</Text>
              </View>
            </View>

            <View style={styles.itemDivider} />

            <View style={styles.insightRow}>
              <View style={[styles.insightIconBg, { backgroundColor: 'rgba(48, 209, 88, 0.15)' }]}>
                <Ionicons name="restaurant-outline" size={18} color="#30D158" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.insightTextHeader}>
                  <Text style={styles.insightTitle}>Nutrition</Text>
                  <Text style={[styles.insightStatus, { color: '#30D158' }]}>On Track</Text>
                </View>
                <Text style={styles.insightDesc}>Great job hitting your daily macro targets!</Text>
              </View>
            </View>

            <View style={styles.itemDivider} />

            <View style={styles.insightRow}>
              <View style={[styles.insightIconBg, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <Ionicons name="checkmark-done-circle-outline" size={18} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.insightTextHeader}>
                  <Text style={styles.insightTitle}>Consistency</Text>
                  <Text style={[styles.insightStatus, { color: '#3B82F6' }]}>Excellent</Text>
                </View>
                <Text style={styles.insightDesc}>5 workouts completed this week!</Text>
              </View>
            </View>
          </View>

          {/* Coaching Benefits */}
          <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>Coaching Benefits</Text>
          <View style={styles.benefitsCard}>
            <View style={styles.benefitItem}>
              <Ionicons name="sparkles-outline" size={20} color="#8B5CF6" />
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitTitle}>Personalized Programs</Text>
                <Text style={styles.benefitDesc}>Tailored workouts that fit your goals and schedule.</Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <Ionicons name="chatbox-ellipses-outline" size={20} color="#3B82F6" />
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitTitle}>Expert Feedback</Text>
                <Text style={styles.benefitDesc}>Get form checks and weekly performance analysis.</Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <Ionicons name="trending-up-outline" size={20} color="#30D158" />
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitTitle}>Progress Tracking</Text>
                <Text style={styles.benefitDesc}>We&apos;ll help you stay accountable and consistent.</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.learnMoreBtn}>
              <Text style={styles.learnMoreText}>Learn More About Coaching</Text>
            </TouchableOpacity>
          </View>

          {/* Coach vs AI Coach Comparison */}
          <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>Coach vs AI Coach</Text>
          <View style={styles.compareGrid}>
            <View style={styles.compareCard}>
              <Text style={styles.compareCardTitle}>My Coach (Human)</Text>
              <Text style={styles.comparePoint}>✓ Personal connection</Text>
              <Text style={styles.comparePoint}>✓ Real experience</Text>
              <Text style={styles.comparePoint}>✓ Deep accountability</Text>
              <Text style={styles.comparePoint}>✓ Customized plans</Text>
              <Text style={styles.comparePoint}>✓ Long-term guidance</Text>
              <TouchableOpacity style={styles.compareCtaBtn} onPress={() => setActiveTab('human')}>
                <Text style={styles.compareCtaText}>Message Coach</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.compareCard}>
              <Text style={[styles.compareCardTitle, { color: P.PURPLE_AI }]}>AI Coach (Yeti AI)</Text>
              <Text style={styles.comparePoint}>✓ Instant answers</Text>
              <Text style={styles.comparePoint}>✓ 24/7 available</Text>
              <Text style={styles.comparePoint}>✓ Data-driven insights</Text>
              <Text style={styles.comparePoint}>✓ Unlimited questions</Text>
              <Text style={styles.comparePoint}>✓ Quick suggestions</Text>
              <TouchableOpacity style={[styles.compareCtaBtn, { backgroundColor: P.PURPLE_AI }]} onPress={() => setActiveTab('ai')}>
                <Text style={styles.compareCtaText}>Chat with AI</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Coaching Resources */}
          <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>Coaching Resources</Text>
          <View style={styles.resourcesCard}>
            <TouchableOpacity style={styles.resourceRow}>
              <Ionicons name="document-text-outline" size={18} color={P.TEXT_SEC} />
              <Text style={styles.resourceText}>Coaching Guidelines</Text>
              <Ionicons name="chevron-forward" size={16} color={P.TEXT_MUT} />
            </TouchableOpacity>
            <View style={styles.itemDivider} />
            <TouchableOpacity style={styles.resourceRow}>
              <Ionicons name="help-circle-outline" size={18} color={P.TEXT_SEC} />
              <Text style={styles.resourceText}>How Coaching Works</Text>
              <Ionicons name="chevron-forward" size={16} color={P.TEXT_MUT} />
            </TouchableOpacity>
            <View style={styles.itemDivider} />
            <TouchableOpacity style={styles.resourceRow}>
              <Ionicons name="information-circle-outline" size={18} color={P.TEXT_SEC} />
              <Text style={styles.resourceText}>FAQs & Knowledgebase</Text>
              <Ionicons name="chevron-forward" size={16} color={P.TEXT_MUT} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* TAB 2: MY COACH (HUMAN) */}
      {activeTab === 'human' && (
        <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Coach Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.profileHeaderRow}>
              <View style={styles.profileAvatarBig}>
                <Ionicons name="person" size={32} color="#FFF" />
                <View style={styles.onlineDotBig} />
              </View>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.profileName}>{coachProfile?.name || 'Coach Alex'}</Text>
                  <View style={styles.premiumTag}>
                    <Text style={styles.premiumTagText}>Premium</Text>
                  </View>
                </View>
                <Text style={styles.profileTitle}>{coachProfile?.title || 'Strength & Conditioning Coach'}</Text>
              </View>
            </View>

            {/* 4 Stat Metrics */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>128</Text>
                <Text style={styles.statLbl}>Athletes</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>5.0 ★</Text>
                <Text style={styles.statLbl}>Rating</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>3 yrs</Text>
                <Text style={styles.statLbl}>Experience</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>98%</Text>
                <Text style={styles.statLbl}>Response Rate</Text>
              </View>
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity style={styles.messageCoachBtn} onPress={() => humanFlatListRef.current?.scrollToEnd()}>
              <Ionicons name="mail" size={18} color="#FFF" />
              <Text style={styles.messageCoachBtnText}>Message Coach</Text>
            </TouchableOpacity>
            <Text style={styles.replyTimeText}>Typically replies within 4-6 hours</Text>
          </View>

          {/* Specializations */}
          <Text style={[styles.sectionTitle, { marginTop: 20, marginBottom: 10 }]}>Specializations</Text>
          <View style={styles.chipsRow}>
            <View style={styles.specChip}><Text style={styles.specChipText}>Strength</Text></View>
            <View style={styles.specChip}><Text style={styles.specChipText}>Hypertrophy</Text></View>
            <View style={styles.specChip}><Text style={styles.specChipText}>Fat Loss</Text></View>
            <View style={styles.specChip}><Text style={styles.specChipText}>Mobility</Text></View>
          </View>

          {/* Assigned Program */}
          <Text style={[styles.sectionTitle, { marginTop: 20, marginBottom: 10 }]}>Assigned Program</Text>
          <View style={styles.programCard}>
            <View style={styles.programLeft}>
              <Text style={styles.programTitle}>Push Pull Legs</Text>
              <Text style={styles.programSub}>4-Day Split • Started May 1, 2024</Text>
            </View>
            <View style={styles.progressRingCircle}>
              <Text style={styles.progressRingText}>62%</Text>
            </View>
          </View>

          {/* Direct Messaging Area */}
          <Text style={[styles.sectionTitle, { marginTop: 20, marginBottom: 10 }]}>Messages</Text>
          <View style={styles.chatSectionBox}>
            {humanLoading ? (
              <ActivityIndicator color={P.ACCENT} style={{ marginVertical: 20 }} />
            ) : (
              <FlatList
                ref={humanFlatListRef}
                data={humanMessages}
                keyExtractor={(item) => item.id}
                renderItem={renderHumanMessage}
                contentContainerStyle={{ padding: 12, gap: 10 }}
                ListEmptyComponent={
                  <View style={styles.emptyStateContainer}>
                    <Ionicons name="chatbubbles-outline" size={32} color={P.TEXT_MUT} />
                    <Text style={styles.emptyStateText}>No messages yet. Say hello to Coach Alex!</Text>
                  </View>
                }
              />
            )}

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={humanInputText}
                  onChangeText={setHumanInputText}
                  placeholder={`Message Coach Alex...`}
                  placeholderTextColor={P.TEXT_MUT}
                  multiline
                />
                <TouchableOpacity style={styles.sendBtnSquare} onPress={handleSendHuman}>
                  <Ionicons name="send" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </ScrollView>
      )}

      {/* TAB 3: AI COACH (YETI AI) */}
      {activeTab === 'ai' && (
        <View style={{ flex: 1 }}>
          {/* Identity Bar */}
          <View style={styles.aiIdentityRow}>
            <View style={styles.aiIdentityAvatar}>
              <Image
                source={require('../../assets/yeti_mascot_avatar.png')}
                style={{ width: '100%', height: '100%', borderRadius: 18 }}
                resizeMode="cover"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiIdentityName}>YETI AI COACH</Text>
              <View style={styles.aiIdentityStatusRow}>
                <View style={styles.aiIdentityDot} />
                <Text style={styles.aiIdentityStatus}>Online 24/7</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.resetBtn} onPress={handleResetAI}>
              <Ionicons name="refresh-outline" size={18} color={P.TEXT_SEC} />
            </TouchableOpacity>
          </View>

          {/* Topic Filter Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.topicScrollView} contentContainerStyle={styles.topicContainer}>
            <TouchableOpacity style={[styles.topicChip, aiTopic === 'all' && styles.topicChipActive]} onPress={() => setAiTopic('all')}>
              <Text style={[styles.topicText, aiTopic === 'all' && styles.topicTextActive]}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.topicChip, aiTopic === 'workouts' && styles.topicChipActive]} onPress={() => setAiTopic('workouts')}>
              <Text style={[styles.topicText, aiTopic === 'workouts' && styles.topicTextActive]}>Workouts</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.topicChip, aiTopic === 'nutrition' && styles.topicChipActive]} onPress={() => setAiTopic('nutrition')}>
              <Text style={[styles.topicText, aiTopic === 'nutrition' && styles.topicTextActive]}>Nutrition</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.topicChip, aiTopic === 'recovery' && styles.topicChipActive]} onPress={() => setAiTopic('recovery')}>
              <Text style={[styles.topicText, aiTopic === 'recovery' && styles.topicTextActive]}>Recovery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.topicChip, aiTopic === 'programming' && styles.topicChipActive]} onPress={() => setAiTopic('programming')}>
              <Text style={[styles.topicText, aiTopic === 'programming' && styles.topicTextActive]}>Programming</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Chat Transcript */}
          <FlatList
            ref={aiFlatListRef}
            style={{ flex: 1 }}
            data={
              aiMessages.length > 0
                ? aiMessages
                : [
                    {
                      id: 'ai-init-1',
                      role: 'assistant',
                      content: 'Hi James! 👋\nHow can I help you today?',
                      createdAt: 1710000000000 - 1000 * 60 * 30,
                    },
                    {
                      id: 'ai-init-2',
                      role: 'user',
                      content: 'I want to improve my bench press strength.',
                      createdAt: 1710000000000 - 1000 * 60 * 29,
                    },
                    {
                      id: 'ai-init-3',
                      role: 'assistant',
                      content:
                        'Great goal! Here is a 4-week progression plan to maximize your bench press:\n\n• Barbell Bench Press (4 sets × 6-8 reps)\n• Incline Dumbbell Press (3 sets × 8-10 reps)\n• Dumbbell Flyes (3 sets × 10-12 reps)',
                      createdAt: 1710000000000 - 1000 * 60 * 28,
                      actions: [
                        {
                          id: 'init_action_workout',
                          type: 'create_workout_plan',
                          label: '➕ Add to My Workouts',
                          data: {
                            name: '4-Week Bench Press Program',
                            exercises: [
                              { name: 'Barbell Bench Press', sets: 4, reps: '6-8', rest_seconds: 180 },
                              { name: 'Incline Dumbbell Press', sets: 3, reps: '8-10', rest_seconds: 120 },
                              { name: 'Dumbbell Flyes', sets: 3, reps: '10-12', rest_seconds: 90 },
                            ],
                          },
                          applied: false,
                        },
                      ],
                    },
                    {
                      id: 'ai-init-4',
                      role: 'user',
                      content: 'What should my target macros be for this phase?',
                      createdAt: 1710000000000 - 1000 * 60 * 20,
                    },
                    {
                      id: 'ai-init-5',
                      role: 'assistant',
                      content:
                        'For a strength building phase, aim for:\n\n🎯 Recommended Daily Targets:\n• Calories: 2,800 kcal\n• Protein: 185g\n• Carbs: 310g\n• Fat: 80g',
                      createdAt: 1710000000000 - 1000 * 60 * 19,
                      actions: [
                        {
                          id: 'init_action_nutrition',
                          type: 'set_nutrition_targets',
                          label: '🎯 Set as My Targets',
                          data: { calories: 2800, protein: 185, carbs: 310, fat: 80 },
                          applied: false,
                        },
                      ],
                    },
                  ]
            }
            keyExtractor={(item) => item.id}
            renderItem={renderAIMessage}
            contentContainerStyle={styles.chatList}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              aiLoading ? (
                <View style={[styles.bubbleWrapper, styles.aiWrapper]}>
                  <View style={styles.avatarDot}>
                    <Image
                      source={require('../../assets/yeti_mascot_avatar.png')}
                      style={{ width: '100%', height: '100%', borderRadius: 14 }}
                      resizeMode="cover"
                    />
                  </View>
                  <View style={[styles.bubble, styles.aiBubble, styles.typingBubble]}>
                    <ActivityIndicator size="small" color={P.PURPLE_AI} />
                  </View>
                </View>
              ) : null
            }
          />

          {/* Session-expired banner — shown instead of implying an AI outage */}
          {aiAuthError && (
            <View style={styles.authBanner}>
              <Ionicons name="lock-closed-outline" size={16} color="#FFF" />
              <Text style={styles.authBannerText}>Your session has expired.</Text>
              <TouchableOpacity style={styles.authBannerBtn} onPress={handleSignIn}>
                <Text style={styles.authBannerBtnText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Quick Prompt Suggestion Pills */}
          <View style={styles.quickPromptsRow}>
            <TouchableOpacity style={styles.promptPill} onPress={() => handleSendAI('Give me a 4-week plan to increase my bench press')}>
              <Text style={styles.promptPillText}>Give me a 4-week plan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.promptPill} onPress={() => handleSendAI('What exercises help build upper chest?')}>
              <Text style={styles.promptPillText}>What exercises help?</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.promptPill} onPress={() => handleSendAI('How often should I train hyperthrophy per week?')}>
              <Text style={styles.promptPillText}>How often should I train?</Text>
            </TouchableOpacity>
          </View>

          {/* Rich Input Bar — sits above AppShell's absolute tab bar */}
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}>
            <View style={[styles.inputContainer, { marginBottom: 72 }]}>
              <TouchableOpacity style={styles.mediaIconBtn}>
                <Ionicons name="images-outline" size={20} color={P.TEXT_MUT} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.mediaIconBtn}>
                <Ionicons name="mic-outline" size={20} color={P.TEXT_MUT} />
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                value={aiInputText}
                onChangeText={setAiInputText}
                placeholder="Ask your AI Coach anything..."
                placeholderTextColor={P.TEXT_MUT}
                multiline
                maxLength={500}
              />

              <TouchableOpacity
                style={[styles.sendButton, (!aiInputText.trim() || aiLoading) && styles.sendButtonDisabled]}
                onPress={() => handleSendAI()}
                disabled={!aiInputText.trim() || aiLoading}
              >
                {aiLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="send" size={16} color={!aiInputText.trim() ? P.TEXT_MUT : '#FFF'} />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}
    </SafeAreaView>
  </AppShell>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090B10',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#161B22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#0F1218',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: P.TEXT_MUT,
    letterSpacing: 1,
    marginTop: 2,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1C222C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#30D158',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#161B22',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: '#FFF',
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: P.TEXT_SEC,
  },
  segmentTextActive: {
    color: '#090B10',
    fontWeight: '800',
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  dualCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  coachCard: {
    flex: 1,
    backgroundColor: '#161B22',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    padding: 16,
  },
  aiCoachCard: {
    borderColor: 'rgba(139, 92, 246, 0.3)',
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
  },
  coachCardAvatarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  humanAvatarContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiMascotContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#30D158',
    borderWidth: 1.5,
    borderColor: '#161B22',
  },
  coachCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  coachCardSub: {
    fontSize: 11,
    fontWeight: '600',
    color: P.TEXT_MUT,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B82F6',
  },
  journeyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  journeyCard: {
    width: '48%',
    backgroundColor: '#161B22',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 14,
  },
  journeyIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  journeyValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
  },
  journeyLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: P.TEXT_MUT,
    marginTop: 2,
  },
  conversationsCard: {
    backgroundColor: '#161B22',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  convAvatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  convHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  convTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  convSub: {
    fontSize: 11,
    color: P.TEXT_MUT,
    marginTop: 2,
  },
  newTag: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFF',
  },
  itemDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#161B22',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionText: {
    fontSize: 10,
    fontWeight: '700',
    color: P.TEXT_SEC,
    textAlign: 'center',
  },
  premiumBanner: {
    marginTop: 24,
    backgroundColor: '#5B21B6',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  premiumBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  premiumBadgeText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFF',
  },
  premiumSubtext: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 15,
  },
  upgradeBtn: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  upgradeBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#5B21B6',
  },
  insightsCard: {
    backgroundColor: '#161B22',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  insightIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightTextHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
  },
  insightStatus: {
    fontSize: 11,
    fontWeight: '800',
  },
  insightDesc: {
    fontSize: 11,
    color: P.TEXT_MUT,
    marginTop: 2,
  },
  benefitsCard: {
    backgroundColor: '#161B22',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    gap: 14,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  benefitTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
  },
  benefitDesc: {
    fontSize: 11,
    color: P.TEXT_MUT,
    marginTop: 2,
  },
  learnMoreBtn: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  learnMoreText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF',
  },
  compareGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  compareCard: {
    flex: 1,
    backgroundColor: '#161B22',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
  },
  compareCardTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#3B82F6',
    marginBottom: 10,
  },
  comparePoint: {
    fontSize: 11,
    color: P.TEXT_SEC,
    marginBottom: 6,
    fontWeight: '600',
  },
  compareCtaBtn: {
    backgroundColor: '#3B82F6',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  compareCtaText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
  },
  resourcesCard: {
    backgroundColor: '#161B22',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  resourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  resourceText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: P.TEXT_SEC,
  },
  // My Coach Profile Tab
  profileCard: {
    backgroundColor: '#161B22',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 18,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  profileAvatarBig: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDotBig: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#30D158',
    borderWidth: 2,
    borderColor: '#161B22',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
  },
  premiumTag: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  premiumTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8B5CF6',
  },
  profileTitle: {
    fontSize: 12,
    color: P.TEXT_MUT,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#0F1218',
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFF',
  },
  statLbl: {
    fontSize: 10,
    color: P.TEXT_MUT,
    marginTop: 2,
  },
  messageCoachBtn: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  messageCoachBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
  replyTimeText: {
    fontSize: 11,
    color: P.TEXT_MUT,
    textAlign: 'center',
    marginTop: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  specChip: {
    backgroundColor: '#161B22',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  specChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: P.TEXT_SEC,
  },
  programCard: {
    backgroundColor: '#161B22',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  programLeft: {},
  programTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF',
  },
  programSub: {
    fontSize: 11,
    color: P.TEXT_MUT,
    marginTop: 2,
  },
  progressRingCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#30D158',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFF',
  },
  chatSectionBox: {
    backgroundColor: '#161B22',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    minHeight: 220,
    overflow: 'hidden',
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyStateText: {
    fontSize: 12,
    color: P.TEXT_MUT,
    marginTop: 8,
  },
  sendBtnSquare: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // AI Coach Screen
  aiIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#0F1218',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  aiIdentityAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  aiIdentityName: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  aiIdentityStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  aiIdentityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#30D158',
  },
  aiIdentityStatus: {
    fontSize: 11,
    color: P.TEXT_MUT,
  },
  resetBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#161B22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicScrollView: {
    maxHeight: 44,
    backgroundColor: '#090B10',
  },
  topicContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
  },
  topicChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#161B22',
  },
  topicChipActive: {
    backgroundColor: P.PURPLE_AI,
  },
  topicText: {
    fontSize: 11,
    fontWeight: '700',
    color: P.TEXT_MUT,
  },
  topicTextActive: {
    color: '#FFF',
  },
  chatList: {
    padding: 16,
    gap: 12,
  },
  bubbleWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
    gap: 8,
  },
  userWrapper: { justifyContent: 'flex-end' },
  aiWrapper: { justifyContent: 'flex-start' },
  avatarDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#3B82F6',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#161B22',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 13,
    color: '#FFF',
    lineHeight: 18,
  },
  userBubbleText: {
    fontWeight: '600',
  },
  timestampText: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  typingBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionBtnContainer: {
    marginTop: 10,
    gap: 8,
  },
  aiActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  aiActionBtnApplied: {
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.3)',
  },
  aiActionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF',
  },
  aiActionBtnAppliedText: {
    color: '#30D158',
  },
  quickPromptsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 6,
  },
  promptPill: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  promptPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: P.PURPLE_AI,
  },
  authBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.35)',
    gap: 8,
  },
  authBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  authBannerBtn: {
    backgroundColor: '#FF453A',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  authBannerBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0F1218',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  },
  mediaIconBtn: {
    padding: 6,
  },
  input: {
    flex: 1,
    backgroundColor: '#161B22',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: '#FFF',
    fontSize: 13,
    maxHeight: 80,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: P.PURPLE_AI,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#161B22',
  },
});

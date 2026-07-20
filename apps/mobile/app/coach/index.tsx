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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAICoachStore, AIMessage } from '../../store/useAICoachStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useRepositories } from '../../hooks/useRepositories';
import { supabase } from '../../lib/supabase';
import { P } from '../../constants/premiumTheme';
import { EVENTS } from '../../constants/analyticsEvents';

type ActiveTab = 'ai' | 'human';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export default function CoachHubScreen() {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;

  const { messagingRepository, eventRepository } = useRepositories();

  const [activeTab, setActiveTab] = useState<ActiveTab>('ai');

  // AI Coach State (from Store)
  const { messages: aiMessages, isLoading: aiLoading, conversationId: aiConvId, initConversation, sendMessage: sendAIMessage, resetChat } =
    useAICoachStore();

  const [aiInputText, setAiInputText] = useState('');
  const aiFlatListRef = useRef<FlatList>(null);

  // Human Coach State
  const [coachProfile, setCoachProfile] = useState<{ id: string; name: string } | null>(null);
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

  // Load human coach details & messages when tab switches to human
  const loadHumanCoachData = async () => {
    if (!userId) return;
    setHumanLoading(true);
    try {
      // 1. Fetch coach client relationship
      const { data: rel, error: relErr } = await supabase
        .from('coach_clients')
        .select('coach_id, coach:profiles!coach_clients_coach_id_fkey(full_name)')
        .eq('athlete_id', userId)
        .maybeSingle();

      if (relErr) throw relErr;

      if (rel && rel.coach) {
        const coach = {
          id: rel.coach_id,
          name: (rel.coach as any).full_name || 'Coach',
        };
        setCoachProfile(coach);

        // 2. Fetch or create direct conversation
        const conv = await messagingRepository.getOrCreateDirectConversation(userId, coach.id);
        setHumanConv(conv);

        // 3. Fetch messages history
        const msgs = await messagingRepository.getMessages(conv.id);
        setHumanMessages(msgs);
        setIsOnline(true);
      } else {
        setCoachProfile(null);
      }
    } catch (e) {
      console.warn("Failed to load human coach chat:", e);
      setIsOnline(false);
    } finally {
      setHumanLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'human') {
      loadHumanCoachData();
    }
  }, [activeTab, userId]);

  // Supabase Realtime Subscription for human messages
  useEffect(() => {
    if (!humanConv?.id || activeTab !== 'human') return;

    const channel = supabase
      .channel(`room:${humanConv.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${humanConv.id}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setHumanMessages((prev) => {
            // Duplicate prevention
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Scroll to end on new message
          setTimeout(() => humanFlatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [humanConv?.id, activeTab]);

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
  const handleSendAI = useCallback(async () => {
    if (!userId || !aiInputText.trim() || aiLoading) return;
    const text = aiInputText.trim();
    setAiInputText('');
    if (aiMessages.length === 0) {
      eventRepository.logActivity(userId, EVENTS.AI_CHAT_STARTED).catch(() => {});
    }
    await sendAIMessage(userId, text);
  }, [userId, aiInputText, aiLoading, aiMessages.length, sendAIMessage]);

  const handleSendHuman = useCallback(async () => {
    if (!userId || !humanInputText.trim() || !humanConv?.id) return;
    const text = humanInputText.trim();
    setHumanInputText('');

    // Generate client-side temp id to prevent duplicates on retry
    const clientMsgId = 'msg_' + Math.random().toString(36).substring(7);

    // Optimistic insert
    const optimisticMessage: Message = {
      id: clientMsgId,
      conversation_id: humanConv.id,
      sender_id: userId,
      content: text,
      created_at: new Date().toISOString(),
    };
    setHumanMessages((prev) => [...prev, optimisticMessage]);

    // Log message_sent event
    eventRepository.logActivity(userId, EVENTS.MESSAGE_SENT, { conversationId: humanConv.id }).catch(() => {});

    try {
      await messagingRepository.sendMessage(humanConv.id, userId, text, clientMsgId);
      setIsOnline(true);
    } catch (e) {
      console.warn("Failed to send message:", e);
      setIsOnline(false);
      // Remove optimistic message on failure
      setHumanMessages((prev) => prev.filter((m) => m.id !== clientMsgId));
    }
  }, [userId, humanInputText, humanConv?.id]);

  const handleResetAI = useCallback(() => {
    if (!userId) return;
    resetChat(userId);
  }, [userId, resetChat]);

  // Bubble Renderers
  const renderAIMessage = ({ item, index }: { item: AIMessage; index: number }) => {
    const isUser = item.role === 'user';
    return (
      <Animated.View
        entering={FadeInDown.duration(300).delay(Math.min(index * 30, 200))}
        style={[styles.bubbleWrapper, isUser ? styles.userWrapper : styles.aiWrapper]}
      >
        {!isUser && (
          <View style={styles.avatarDot}>
            <Text style={styles.avatarText}>Y</Text>
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>
            {item.content}
          </Text>
        </View>
      </Animated.View>
    );
  };

  const renderHumanMessage = ({ item, index }: { item: Message; index: number }) => {
    const isUser = item.sender_id === userId;
    return (
      <Animated.View
        entering={FadeInDown.duration(300).delay(Math.min(index * 30, 200))}
        style={[styles.bubbleWrapper, isUser ? styles.userWrapper : styles.aiWrapper]}
      >
        {!isUser && (
          <View style={[styles.avatarDot, { backgroundColor: '#F59E0B' }]}>
            <Text style={styles.avatarText}>C</Text>
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>
            {item.content}
          </Text>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Segmented Header */}
      <View style={styles.header}>
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            accessible={true}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'ai' }}
            accessibilityLabel="Switch to AI Coach chat"
            style={[styles.segmentBtn, activeTab === 'ai' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('ai')}
          >
            <Ionicons name="sparkles" size={14} color={activeTab === 'ai' ? P.BG : P.TEXT_SEC} />
            <Text style={[styles.segmentText, activeTab === 'ai' && styles.segmentTextActive]}>AI Coach</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessible={true}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'human' }}
            accessibilityLabel="Switch to Human Coach chat"
            style={[styles.segmentBtn, activeTab === 'human' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('human')}
          >
            <Ionicons name="people" size={14} color={activeTab === 'human' ? P.BG : P.TEXT_SEC} />
            <Text style={[styles.segmentText, activeTab === 'human' && styles.segmentTextActive]}>Human Coach</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'ai' && (
          <TouchableOpacity 
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Reset AI Coach chat conversation"
            onPress={handleResetAI} 
            style={styles.resetBtn}
          >
            <Ionicons name="refresh" size={18} color={P.TEXT_SEC} />
          </TouchableOpacity>
        )}
      </View>

      {/* Connection warning bar for human chat */}
      {activeTab === 'human' && !isOnline && (
        <View style={styles.offlineBar}>
          <Text style={styles.offlineText}>You are offline. Reconnect to send messages.</Text>
        </View>
      )}

      {/* Tab AI Coach */}
      {activeTab === 'ai' && (
        <View style={{ flex: 1 }}>
          <FlatList
            ref={aiFlatListRef}
            data={aiMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderAIMessage}
            contentContainerStyle={styles.chatList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <ActivityIndicator color={P.ACCENT} />
                <Text style={styles.emptyText}>Loading your training context...</Text>
              </View>
            }
            ListFooterComponent={
              aiLoading ? (
                <View style={[styles.bubbleWrapper, styles.aiWrapper]}>
                  <View style={styles.avatarDot}>
                    <Text style={styles.avatarText}>Y</Text>
                  </View>
                  <View style={[styles.bubble, styles.aiBubble, styles.typingBubble]}>
                    <ActivityIndicator size="small" color={P.ACCENT} />
                  </View>
                </View>
              ) : null
            }
          />

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={aiInputText}
                onChangeText={setAiInputText}
                placeholder="Ask about training, nutrition, recovery..."
                placeholderTextColor={P.TEXT_MUT}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Send message to AI Coach"
                style={[styles.sendButton, (!aiInputText.trim() || aiLoading) && styles.sendButtonDisabled]}
                onPress={handleSendAI}
                disabled={!aiInputText.trim() || aiLoading}
              >
                <Ionicons name={aiLoading ? 'hourglass' : 'send'} size={18} color={!aiInputText.trim() || aiLoading ? P.TEXT_MUT : P.BG} />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* Tab Human Coach */}
      {activeTab === 'human' && (
        <View style={{ flex: 1 }}>
          {humanLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color={P.ACCENT} />
              <Text style={styles.emptyText}>Opening direct chat...</Text>
            </View>
          ) : !coachProfile ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={48} color={P.TEXT_MUT} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTextTitle}>No Coach Assigned</Text>
              <Text style={styles.emptyTextSub}>Your coach dashboard detail metrics will sync when you are assigned a human trainer.</Text>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <FlatList
                ref={humanFlatListRef}
                data={humanMessages}
                keyExtractor={(item) => item.id}
                renderItem={renderHumanMessage}
                contentContainerStyle={styles.chatList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Ionicons name="chatbubble-ellipses-outline" size={32} color={P.TEXT_MUT} style={{ marginBottom: 12 }} />
                    <Text style={styles.emptyTextSub}>No messages yet. Send a message to say hello to {coachProfile.name}!</Text>
                  </View>
                }
              />

              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.input, !isOnline && styles.inputDisabled]}
                    value={humanInputText}
                    onChangeText={setHumanInputText}
                    placeholder={isOnline ? `Message ${coachProfile.name}...` : 'Reconnect to type...'}
                    placeholderTextColor={P.TEXT_MUT}
                    multiline
                    maxLength={500}
                    editable={isOnline}
                  />
                  <TouchableOpacity
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`Send message to ${coachProfile.name}`}
                    style={[styles.sendButton, (!humanInputText.trim() || !isOnline) && styles.sendButtonDisabled]}
                    onPress={handleSendHuman}
                    disabled={!humanInputText.trim() || !isOnline}
                  >
                    <Ionicons name="send" size={18} color={!humanInputText.trim() || !isOnline ? P.TEXT_MUT : P.BG} />
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: P.BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: P.CARD_BORDER,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: P.CARD_BG,
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    width: '80%',
    minHeight: 44,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: P.ACCENT,
  },
  segmentText: {
    color: P.TEXT_SEC,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  segmentTextActive: {
    color: P.BG,
  },
  resetBtn: {
    width: 44,
    height: 44,
    minHeight: 44,
    minWidth: 44,
    borderRadius: 22,
    backgroundColor: P.CARD_BG,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatList: {
    padding: 16,
    gap: 12,
    paddingBottom: 24,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: P.ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { color: P.BG, fontSize: 13, fontWeight: '900' },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: P.ACCENT,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: P.CARD_BG,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    color: P.TEXT_PRI,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  userBubbleText: {
    color: P.BG,
    fontWeight: '700',
  },
  typingBubble: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: P.CARD_BORDER,
    alignItems: 'center',
    gap: 10,
    backgroundColor: P.BG,
  },
  input: {
    flex: 1,
    backgroundColor: P.CARD_BG,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
    color: P.TEXT_PRI,
    fontSize: 14,
    maxHeight: 100,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  sendButton: {
    width: 44,
    height: 44,
    minHeight: 44,
    minWidth: 44,
    borderRadius: 14,
    backgroundColor: P.ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: P.CARD_BG,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
  },
  offlineBar: {
    backgroundColor: P.RED,
    paddingVertical: 8,
    alignItems: 'center',
  },
  offlineText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: 80,
  },
  emptyTextTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: P.TEXT_PRI,
    marginBottom: 6,
  },
  emptyText: {
    color: P.TEXT_SEC,
    fontSize: 13,
    marginTop: 12,
    fontWeight: '600',
  },
  emptyTextSub: {
    color: P.TEXT_MUT,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
  },
});


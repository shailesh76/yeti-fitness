import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useNotificationHistoryStore, NotificationType } from '../store/useNotificationHistoryStore';
import { P, glowStyle, sharedStyles } from '../constants/premiumTheme';

// Helper to format relative time
const getRelativeTime = (timestamp: number) => {
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${Math.max(0, diffMins)}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
};

// Helper for icon based on type
const getIcon = (type: NotificationType) => {
  switch (type) {
    case 'reminder': return 'barbell-outline';
    case 'coach': return 'chatbubble-ellipses-outline';
    case 'challenge': return 'trophy-outline';
    default: return 'notifications-outline';
  }
};

export default function NotificationCenterScreen() {
  const router = useRouter();
  const { notifications, markAsRead, markAllAsRead, fetchNotifications } = useNotificationHistoryStore();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handlePress = async (id: string, deepLink?: string) => {
    await markAsRead(id);
    if (deepLink) {
      router.push(deepLink as any);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={20} color={P.ACCENT} />
            </TouchableOpacity>
            <Text style={styles.title}>Notifications</Text>
          </View>

          {notifications.length > 0 && (
            <TouchableOpacity
              onPress={markAllAsRead}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Mark all as read"
            >
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>

        {notifications.length === 0 ? (
          <Animated.View entering={FadeIn.duration(500)} style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="notifications-off-outline" size={48} color={P.TEXT_MUT} />
            </View>
            <Text style={styles.emptyTitle}>You&apos;re all caught up</Text>
            <Text style={styles.emptySubtitle}>
              When you get workout reminders, coach messages, or challenge updates, they&apos;ll show up here.
            </Text>
          </Animated.View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            <Animated.View entering={FadeInDown.duration(400)} style={styles.listContainer}>
              {notifications.map((notif) => {
                const isUnread = !notif.read;
                return (
                  <TouchableOpacity
                    key={notif.id}
                    onPress={() => handlePress(notif.id, notif.deepLink)}
                    style={[
                      styles.notifItem,
                      isUnread ? styles.notifItemUnread : null
                    ]}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={`${isUnread ? 'Unread. ' : ''}${notif.title}. ${notif.body}`}
                  >
                    <View style={[
                      styles.iconWrapper,
                      isUnread ? styles.iconWrapperUnread : null
                    ]}>
                      <Ionicons 
                        name={getIcon(notif.type) as any} 
                        size={20} 
                        color={isUnread ? P.ACCENT : P.TEXT_MUT} 
                      />
                    </View>
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                      <View style={styles.itemHeader}>
                        <Text style={[
                          styles.itemTitle,
                          isUnread ? { color: P.TEXT_PRI } : null
                        ]}>
                          {notif.title}
                        </Text>
                        <Text style={[
                          styles.timeText,
                          isUnread ? { color: P.ACCENT } : null
                        ]}>
                          {getRelativeTime(notif.timestamp)}
                        </Text>
                      </View>
                      <Text style={[
                        styles.itemBody,
                        isUnread ? { color: P.TEXT_PRI } : null
                      ]}>
                        {notif.body}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </Animated.View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: P.BG,
  },
  container: {
    flex: 1,
    width: '100%',
    maxW: 640,
    alignSelf: 'center',
  } as any,
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 12 : 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    backgroundColor: P.BG,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: P.ACCENT_DIM,
    borderWidth: 1,
    borderColor: P.ACCENT_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: P.TEXT_PRI,
    letterSpacing: -0.5,
  },
  markAllText: {
    color: P.ACCENT,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: P.TEXT_PRI,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: P.TEXT_SEC,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  listContainer: {
    paddingBottom: 80,
  },
  notifItem: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.02)',
    backgroundColor: P.BG,
  },
  notifItemUnread: {
    backgroundColor: P.ACCENT_DIM,
    borderLeftWidth: 4,
    borderLeftColor: P.ACCENT,
    paddingLeft: 20, // offset the left border width
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  iconWrapperUnread: {
    backgroundColor: P.ACCENT_DIM,
    borderColor: P.ACCENT_BORDER,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: P.TEXT_SEC,
    letterSpacing: -0.2,
    flex: 1,
    paddingRight: 12,
  },
  timeText: {
    fontSize: 9,
    fontWeight: '800',
    color: P.TEXT_MUT,
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    marginTop: 2,
  },
  itemBody: {
    fontSize: 12,
    lineHeight: 17,
    color: P.TEXT_MUT,
    fontWeight: '500',
  },
});

import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useChallengeStore } from '../../store/useChallengeStore';
import { P, glowStyle, sharedStyles } from '../../constants/premiumTheme';

export default function ChallengesListScreen() {
  const router = useRouter();
  const { challenges, fetchChallenges, loading } = useChallengeStore();

  useEffect(() => {
    fetchChallenges();
  }, []);

  const getDaysRemaining = (endDateMs: number) => {
    const diff = endDateMs - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days} days left` : 'Ended';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()} 
            style={styles.backBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color={P.ACCENT} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Challenges</Text>
            <Text style={styles.subtitle}>Push your limits</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={P.ACCENT} />
          </View>
        ) : challenges.length === 0 ? (
          <Animated.View entering={FadeIn.duration(500)} style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="trophy-outline" size={48} color={P.TEXT_MUT} />
            </View>
            <Text style={styles.emptyTitle}>No Active Challenges</Text>
            <Text style={styles.emptySubtitle}>
              There are currently no community challenges available. Check back later to join new events.
            </Text>
            <TouchableOpacity 
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Return to home screen"
              onPress={() => router.back()}
              style={[styles.emptyBtn, glowStyle(P.ACCENT, 12, 0.45)]}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyBtnText}>Back to Home</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            <Animated.View entering={FadeInDown.duration(400)} style={styles.listContainer}>
              {challenges.map((challenge, idx) => (
                <TouchableOpacity 
                  key={challenge.id} 
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${challenge.name} challenge details`}
                  onPress={() => router.push(`/challenges/${challenge.id}`)}
                  style={[sharedStyles.card, styles.challengeCard]}
                  activeOpacity={0.85}
                >

                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1, pr: 16 } as any}>
                      <Text style={styles.challengeName}>{challenge.name}</Text>
                      <Text style={styles.daysText}>
                        {getDaysRemaining(challenge.end_date)}
                      </Text>
                    </View>
                    <View style={styles.flameIconContainer}>
                      <Ionicons name="flame" size={20} color={P.ACCENT} />
                    </View>
                  </View>
                  
                  <Text style={styles.challengeDesc}>
                    {challenge.description}
                  </Text>

                  <View style={styles.cardFooter}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {/* Stacked avatars */}
                      <View style={styles.avatarStack}>
                        {challenge.top_avatars.slice(0, 4).map((initials, i) => (
                          <View 
                            key={i} 
                            style={[
                              styles.avatarDot,
                              { zIndex: 10 - i, marginLeft: i > 0 ? -10 : 0 }
                            ]}
                          >
                            <Text style={styles.avatarText}>{initials}</Text>
                          </View>
                        ))}
                      </View>
                      <Text style={styles.participantCount}>{challenge.participant_count} joined</Text>
                    </View>
                    
                    <View style={styles.viewRankBtn}>
                      <Text style={styles.viewRankText}>View Rank →</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
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
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    backgroundColor: P.BG,
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    minHeight: 44,
    minWidth: 44,
    borderRadius: 22,
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
  subtitle: {
    fontSize: 10,
    color: P.TEXT_SEC,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 28,
    paddingHorizontal: 16,
  },
  emptyBtn: {
    backgroundColor: P.ACCENT,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyBtnText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContainer: {
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  challengeCard: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  challengeName: {
    fontSize: 18,
    fontWeight: '900',
    color: P.TEXT_PRI,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  daysText: {
    color: P.ACCENT,
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  flameIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: P.ACCENT_DIM,
    borderWidth: 1,
    borderColor: P.ACCENT_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeDesc: {
    color: P.TEXT_SEC,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    paddingTop: 14,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#2a2a2a',
    borderWidth: 2,
    borderColor: P.CARD_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '900',
  },
  participantCount: {
    color: P.TEXT_MUT,
    fontSize: 11,
    fontWeight: '700',
  },
  viewRankBtn: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewRankText: {
    color: P.TEXT_PRI,
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});

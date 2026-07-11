import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useChallengeStore, LeaderboardEntry } from '../../store/useChallengeStore';
import * as Sharing from 'expo-sharing';
import { useAuthStore } from '../../store/useAuthStore';
import { P, glowStyle, sharedStyles } from '../../constants/premiumTheme';

// Shimmer skeleton for loading rows
const SkeletonRow = () => {
  const shimmerOpacity = useAnimatedStyle(() => ({
    opacity: withRepeat(
      withSequence(
        withTiming(0.3, { duration: 800 }),
        withTiming(0.7, { duration: 800 })
      ),
      -1,
      true
    )
  }));

  return (
    <Animated.View style={[shimmerOpacity, styles.skeletonRow]}>
      <View style={styles.skeletonRank} />
      <View style={styles.skeletonAvatar} />
      <View style={{ flex: 1 }}>
        <View style={styles.skeletonName} />
        <View style={styles.skeletonSub} />
      </View>
      <View style={styles.skeletonScore} />
    </Animated.View>
  );
};

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = useAuthStore(state => state.session);
  const currentUserId = session?.user?.id || 'u7'; // Fallback for mock if needed
  
  const { challenges, leaderboards, fetchChallenges, fetchLeaderboard, loading } = useChallengeStore();
  const challenge = challenges.find(c => c.id === id);
  const leaderboard = leaderboards[id] || [];

  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    if (!challenge) {
      fetchChallenges();
    }
    fetchLeaderboard(id, currentUserId);
  }, [id]);

  const handleShare = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Share', 'Invite link copied to clipboard!');
      return;
    }
    
    try {
      setIsSharing(true);
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync('https://yeti.app/c/' + id, {
          dialogTitle: `Join me in the ${challenge?.name} challenge!`,
        });
      } else {
        Alert.alert('Sharing Unavailable', 'Cannot share on this device.');
      }
    } catch (e) {
      console.warn("Share failed:", e);
    } finally {
      setIsSharing(false);
    }
  };

  const getDaysRemaining = (endDateMs: number) => {
    const diff = endDateMs - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days} days left` : 'Ended';
  };

  const renderRankBadge = (rank: number) => {
    if (rank === 1) return <Ionicons name="medal" size={16} color={P.GOLD} />; // Gold
    if (rank === 2) return <Ionicons name="medal" size={16} color="#c0c0c0" />; // Silver
    if (rank === 3) return <Ionicons name="medal" size={16} color="#cd7f32" />; // Bronze
    return <Text style={styles.rankNumber}>{rank}</Text>;
  };

  if (!challenge && !loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centeredContainer}>
          <Text style={styles.errorText}>Challenge not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={styles.backBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color={P.ACCENT} />
            </TouchableOpacity>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.title} numberOfLines={1}>
                {challenge?.name || 'Loading...'}
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.daysText}>
                  {challenge ? getDaysRemaining(challenge.end_date) : '--'}
                </Text>
                <Text style={styles.participantCount}>
                  {challenge?.participant_count || 0} participants
                </Text>
              </View>
            </View>
          </View>

          {/* Invite Button */}
          <TouchableOpacity 
            onPress={handleShare}
            disabled={isSharing || !challenge}
            style={styles.inviteBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="share-outline" size={16} color="#FFF" />
            <Text style={styles.inviteBtnText}>Invite a Friend</Text>
          </TouchableOpacity>
        </View>

        {/* Leaderboard List */}
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, backgroundColor: P.BG }}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[sharedStyles.labelCaps, { color: P.TEXT_PRI }]}>Live Leaderboard</Text>
            <Text style={styles.sectionHeaderMetric}>{challenge?.metric || 'Score'}</Text>
          </View>

          {loading || !leaderboard.length ? (
            <Animated.View entering={FadeIn.duration(400)}>
              {Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)}
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.duration(400)}>
              {leaderboard.map((entry: LeaderboardEntry) => {
                const isTop3 = entry.rank <= 3;
                const isMe = entry.is_current_user;

                return (
                  <View 
                    key={entry.id} 
                    style={[
                      styles.entryRow,
                      isMe ? [styles.entryRowMe, glowStyle(P.ACCENT, 8, 0.15)] : null
                    ]}
                  >
                    {/* Rank */}
                    <View style={styles.rankCell}>
                      {renderRankBadge(entry.rank)}
                    </View>

                    {/* Avatar */}
                    <View style={[
                      styles.avatarCell,
                      isMe ? styles.avatarCellMe : (isTop3 ? styles.avatarCellTop3 : null)
                    ]}>
                      <Text style={[
                        styles.avatarText,
                        isMe ? { color: P.ACCENT } : null
                      ]}>
                        {entry.avatar_initials}
                      </Text>
                    </View>

                    {/* Name */}
                    <View style={{ flex: 1, paddingRight: 16 }}>
                      <Text style={[
                        styles.entryName,
                        isMe ? { color: P.ACCENT } : null
                      ]}>
                        {entry.user_name}
                      </Text>
                      {isMe && <Text style={styles.youBadge}>You</Text>}
                    </View>

                    {/* Score */}
                    <Text style={[
                      styles.entryScore,
                      isTop3 ? { color: P.TEXT_PRI } : null
                    ]}>
                      {entry.score}
                    </Text>
                  </View>
                );
              })}
              
              {/* Bottom padding */}
              <View style={{ height: 60 }} />
            </Animated.View>
          )}
        </ScrollView>

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
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    backgroundColor: P.BG,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
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
    fontSize: 20,
    fontWeight: '900',
    color: P.TEXT_PRI,
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 12,
  },
  daysText: {
    color: P.ACCENT,
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  participantCount: {
    color: P.TEXT_MUT,
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inviteBtn: {
    backgroundColor: P.CARD_BG,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  inviteBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.02)',
  },
  sectionHeaderMetric: {
    color: P.TEXT_MUT,
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.02)',
    backgroundColor: P.BG,
  },
  entryRowMe: {
    backgroundColor: P.ACCENT_DIM,
    borderColor: P.ACCENT_BORDER,
  },
  rankCell: {
    width: 32,
    alignItems: 'center',
    marginRight: 8,
  },
  rankNumber: {
    color: P.TEXT_MUT,
    fontWeight: '800',
    fontSize: 12,
  },
  avatarCell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarCellMe: {
    borderColor: P.ACCENT,
    backgroundColor: 'rgba(57,255,106,0.15)',
  },
  avatarCellTop3: {
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  avatarText: {
    fontSize: 10,
    fontWeight: '900',
    color: P.TEXT_MUT,
  },
  entryName: {
    fontSize: 14,
    fontWeight: '800',
    color: P.TEXT_PRI,
    letterSpacing: -0.2,
  },
  youBadge: {
    color: 'rgba(57,255,106,0.7)',
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  entryScore: {
    fontSize: 16,
    fontWeight: '900',
    color: P.TEXT_MUT,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: P.TEXT_PRI,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: P.CARD_BG,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButtonText: {
    color: P.TEXT_PRI,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.02)',
  },
  skeletonRank: {
    width: 24,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 4,
    marginRight: 16,
  },
  skeletonAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginRight: 16,
  },
  skeletonName: {
    width: 120,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 4,
    marginBottom: 6,
  },
  skeletonSub: {
    width: 60,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 2,
  },
  skeletonScore: {
    width: 40,
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 4,
  },
});

import React from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Confetti from '../../components/Confetti';
import { P, glowStyle, sharedStyles } from '../../constants/premiumTheme';

export default function WorkoutSummaryScreen() {
  const router = useRouter();
  const { name, duration, exercises, sets, prHit } = useLocalSearchParams();

  const formatDuration = (secondsStr: string | string[] | undefined) => {
    const totalSeconds = parseInt(Array.isArray(secondsStr) ? secondsStr[0] : secondsStr || '0', 10);
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    if (hrs > 0) return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    return `${pad(mins)}:${pad(secs)}`;
  };

  const workoutName = Array.isArray(name) ? name[0] : name || 'Quick Workout';
  const exCount = Array.isArray(exercises) ? exercises[0] : exercises || '0';
  const setsCount = Array.isArray(sets) ? sets[0] : sets || '0';
  const isPrHit = prHit === 'true';

  return (
    <SafeAreaView style={styles.safeArea}>
      {isPrHit && <Confetti count={80} />}
      <Animated.View entering={FadeIn.duration(600)} style={{ flex: 1 }}>
        <ScrollView 
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Trophy Header */}
          <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.trophyContainer}>
            <View style={[styles.trophyGlow, glowStyle(P.ACCENT, 24, 0.45)]} />
            <Text style={styles.trophyEmoji}>🏆</Text>
            <Text style={styles.congratsText}>Workout Completed!</Text>
            <Text style={styles.congratsSubtitle}>Great job, dude! You crushed it today.</Text>
          </Animated.View>

          {/* Workout Name Card */}
          <Animated.View entering={FadeInDown.duration(500).delay(200)} style={{ width: '100%' }}>
            <View style={sharedStyles.cardGlow}>
              <Text style={styles.cardLabel}>PLAN NAME</Text>
              <Text style={styles.workoutNameText}>{workoutName}</Text>
            </View>
          </Animated.View>

          {/* Stats Grid */}
          <Animated.View entering={FadeInDown.duration(500).delay(300)} style={styles.statsGrid}>
            <View style={[sharedStyles.card, styles.statCard]}>
              <View style={[styles.iconTile, { backgroundColor: 'rgba(0, 212, 255, 0.1)', borderColor: 'rgba(0, 212, 255, 0.2)' }]}>
                <Ionicons name="time-outline" size={20} color={P.BLUE} />
              </View>
              <Text style={styles.statValue}>{formatDuration(duration)}</Text>
              <Text style={styles.statLabel}>DURATION</Text>
            </View>

            <View style={[sharedStyles.card, styles.statCard]}>
              <View style={[styles.iconTile, { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.2)' }]}>
                <Ionicons name="barbell-outline" size={20} color={P.AMBER} />
              </View>
              <Text style={styles.statValue}>{exCount}</Text>
              <Text style={styles.statLabel}>EXERCISES</Text>
            </View>

            <View style={[sharedStyles.card, styles.statCard]}>
              <View style={[styles.iconTile, { backgroundColor: 'rgba(57, 255, 106, 0.1)', borderColor: P.ACCENT_BORDER }]}>
                <Ionicons name="checkmark-circle-outline" size={20} color={P.ACCENT} />
              </View>
              <Text style={styles.statValue}>{setsCount}</Text>
              <Text style={styles.statLabel}>SETS LOGGED</Text>
            </View>
          </Animated.View>

          {/* Bottom Button */}
          <Animated.View entering={FadeInDown.duration(500).delay(400)} style={styles.buttonContainer}>
            <TouchableOpacity 
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Return to Dashboard"
              style={[styles.returnBtn, glowStyle(P.ACCENT, 16, 0.45)]}
              onPress={() => router.replace('/home')}
              activeOpacity={0.85}
            >
              <Text style={styles.returnBtnText}>Return to Dashboard</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: P.BG,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
    paddingBottom: 40,
  },
  trophyContainer: {
    alignItems: 'center',
    marginBottom: 40,
    position: 'relative',
  },
  trophyEmoji: {
    fontSize: 80,
    marginBottom: 16,
    zIndex: 2,
  },
  trophyGlow: {
    position: 'absolute',
    top: 10,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: P.ACCENT_GLOW,
    zIndex: 1,
  },
  congratsText: {
    fontSize: 28,
    color: P.TEXT_PRI,
    textAlign: 'center',
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  congratsSubtitle: {
    fontSize: 14,
    color: P.TEXT_SEC,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '500',
  },
  cardLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: P.TEXT_MUT,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    textAlign: 'center',
  },
  workoutNameText: {
    fontSize: 22,
    color: P.ACCENT,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 40,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 8,
    marginBottom: 0,
  },
  iconTile: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    color: P.TEXT_PRI,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: P.TEXT_MUT,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  buttonContainer: {
    width: '100%',
  },
  returnBtn: {
    backgroundColor: P.ACCENT,
    borderRadius: P.RADIUS_PILL,
    minHeight: 52,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  returnBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});


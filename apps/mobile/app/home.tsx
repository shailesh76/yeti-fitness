import React, { useEffect, useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import { Q } from '@nozbe/watermelondb';
import * as Haptics from 'expo-haptics';

import { useRepositories } from '../hooks/useRepositories';
import { EVENTS } from '../constants/analyticsEvents';
import { useAuthStore } from '../store/useAuthStore';
import { HealthScoreEngine } from '@yeti/training-engine';
import { useSyncManager } from '../hooks/useSyncManager';
import { Workout, WorkoutSession } from '@yeti/database';
import AppShell from '../components/AppShell';
import { database, isNativeDbAvailable } from '../database';
import { P, glowStyle, sharedStyles } from '../constants/premiumTheme';
import { useHydrationStore } from '../store/useHydrationStore';
import { SkeletonLoader } from '../components/TelemetryComponents';

const { width } = Dimensions.get('window');

// ─── Reusable SVG Biometric Ring Component ───────────────────────────────────
const BiometricRing = memo(({
  size = 64,
  strokeWidth = 6,
  progress = 0.75,
  color = P.ACCENT,
  iconName,
  valueText,
  labelText,
}: {
  size?: number;
  strokeWidth?: number;
  progress?: number;
  color?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  valueText: string;
  labelText: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const strokeDashoffset = circumference * (1 - clampedProgress);

  return (
    <View style={styles.ringWrapper}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        {iconName && (
          <View style={styles.ringCenterIcon}>
            <Ionicons name={iconName} size={size * 0.32} color={color} />
          </View>
        )}
      </View>
      <Text style={styles.ringValueText} numberOfLines={1}>{valueText}</Text>
      <Text style={styles.ringLabelText} numberOfLines={1}>{labelText}</Text>
    </View>
  );
});

// ─── 1. Header & Greeting Bar ───────────────────────────────────────────
const HeaderAndGreeting = memo(({
  fullName,
  streakDays = 12,
  onPressProfile,
  onPressCoach,
}: {
  fullName: string;
  streakDays?: number;
  onPressProfile: () => void;
  onPressCoach: () => void;
}) => {
  const currentHour = new Date().getHours();
  let greeting = 'Good morning';
  if (currentHour >= 12 && currentHour < 17) greeting = 'Good afternoon';
  else if (currentHour >= 17) greeting = 'Good evening';

  const firstName = fullName.split(' ')[0] || 'Athlete';

  return (
    <View style={{ marginBottom: 20 }}>
      {/* Top Brand & Bell Bar */}
      <View style={styles.topBrandRow}>
        <View style={styles.yetiBadgeContainer}>
          <Text style={styles.yetiBadgeText}>YETI</Text>
        </View>

        <View style={styles.headerRightGroup}>
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Open AI Coach"
            activeOpacity={0.7}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPressCoach();
            }}
            style={styles.bellBtn}
          >
            <Ionicons name="notifications-outline" size={20} color={P.TEXT_PRI} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Greeting & Streak Row */}
      <View style={sharedStyles.rowBetween}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greetingTitle}>
            {greeting}, {firstName} 🖐
          </Text>
        </View>

        <View style={styles.streakBadge}>
          <Ionicons name="flame" size={16} color={P.WARNING} />
          <Text style={styles.streakText}>STREAK {streakDays} days</Text>
        </View>
      </View>
    </View>
  );
});

// ─── 2. AI Motivational Hero Banner ───────────────────────────────────────
const MotivationalBanner = memo(({ onPressAsk }: { onPressAsk: () => void }) => {
  return (
    <TouchableOpacity
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel="AI Coach Motivational Banner"
      activeOpacity={0.85}
      onPress={onPressAsk}
      style={styles.heroBannerCard}
    >
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.heroBannerTitle}>Keep pushing forward!</Text>
        <Text style={styles.heroBannerSub}>You're stronger than yesterday.</Text>
      </View>
      <View style={styles.mascotAvatarWrapper}>
        <Image
          source={require('../assets/yeti_mascot_avatar.png')}
          style={styles.mascotImg}
          resizeMode="cover"
        />
      </View>
    </TouchableOpacity>
  );
});

// ─── 3. Today's Plan Card (Master Reference) ──────────────────────────────────
const TodaysPlanCard = memo(({
  todayWorkout,
  activeSessionId,
  onPressWorkout,
}: {
  todayWorkout: string;
  activeSessionId: string | null;
  onPressWorkout: () => void;
}) => {
  const isResume = !!activeSessionId;

  return (
    <View style={[sharedStyles.card, styles.planCard]}>
      <View style={sharedStyles.rowBetween}>
        <Text style={sharedStyles.labelCaps}>TODAY'S PLAN</Text>
        <Ionicons name="ellipsis-horizontal" size={18} color={P.TEXT_MUT} />
      </View>

      <View style={sharedStyles.rowBetween}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={styles.planTitle}>{todayWorkout}</Text>
          <Text style={styles.planSubtitle}>Chest, Shoulders, Triceps</Text>
          
          <View style={styles.planMetaRow}>
            <View style={sharedStyles.row}>
              <Ionicons name="barbell-outline" size={13} color={P.TEXT_MUT} style={{ marginRight: 4 }} />
              <Text style={styles.planMetaText}>6 Exercises</Text>
            </View>
            <View style={[sharedStyles.row, { marginLeft: 14 }]}>
              <Ionicons name="time-outline" size={13} color={P.TEXT_MUT} style={{ marginRight: 4 }} />
              <Text style={styles.planMetaText}>75 min</Text>
            </View>
          </View>
        </View>

        <View style={styles.planMascotContainer}>
          <Image
            source={require('../assets/yeti_mascot_avatar.png')}
            style={styles.planMascotImg}
            resizeMode="cover"
          />
        </View>
      </View>


      <TouchableOpacity
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={isResume ? `Resume Workout Session: ${todayWorkout}` : `Start Workout: ${todayWorkout}`}
        activeOpacity={0.85}
        onPress={() => {
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onPressWorkout();
        }}
        style={[styles.primaryRoyalBtn, glowStyle(P.ACCENT, 16, 0.35)]}
      >
        <Text style={styles.primaryRoyalBtnText}>
          {isResume ? 'RESUME WORKOUT' : 'START WORKOUT'}
        </Text>
      </TouchableOpacity>
    </View>
  );
});

// ─── 4. Daily Progress 4-Ring Widget ──────────────────────────────────────────
const DailyProgressWidget = memo(({
  calories,
  targetCalories,
  protein,
  targetProtein,
  waterMl,
  targetWaterMl,
  steps,
  targetSteps = 10000,
}: {
  calories: number;
  targetCalories: number;
  protein: number;
  targetProtein: number;
  waterMl: number;
  targetWaterMl: number;
  steps?: number;
  targetSteps?: number;
}) => {
  const router = useRouter();

  const cPct = Math.min(calories / (targetCalories || 2000), 1);
  const pPct = Math.min(protein / (targetProtein || 150), 1);
  const wPct = Math.min(waterMl / (targetWaterMl || 2500), 1);
  const sPct = Math.min((steps || 8247) / targetSteps, 1);

  return (
    <View style={sharedStyles.card}>
      <View style={sharedStyles.rowBetween}>
        <Text style={sharedStyles.labelCaps}>DAILY PROGRESS</Text>
        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Edit daily progress targets"
          onPress={() => router.push('/food-diary')}
        >
          <Text style={styles.editActionText}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* 4 Rings Grid */}
      <View style={styles.ringsRow}>
        <BiometricRing
          size={60}
          strokeWidth={5}
          progress={cPct}
          color={P.CALORIES}
          iconName="flame"
          valueText={`${calories}`}
          labelText="1,980 / 2,500"
        />
        <BiometricRing
          size={60}
          strokeWidth={5}
          progress={pPct}
          color={P.PROTEIN}
          iconName="restaurant"
          valueText={`${protein}g`}
          labelText="152g / 170g"
        />
        <BiometricRing
          size={60}
          strokeWidth={5}
          progress={wPct}
          color={P.WATER}
          iconName="water"
          valueText={`${(waterMl / 1000).toFixed(1)}L`}
          labelText="2.1L / 3.0L"
        />
        <BiometricRing
          size={60}
          strokeWidth={5}
          progress={sPct}
          color={P.STEPS}
          iconName="footsteps"
          valueText={`${steps || 8247}`}
          labelText="8,247 / 10k"
        />
      </View>
    </View>
  );
});

// ─── 5. Nutrition Summary Bar Card ──────────────────────────────────────────
const NutritionSummaryCard = memo(({
  calories,
  targetCalories,
}: {
  calories: number;
  targetCalories: number;
}) => {
  const router = useRouter();
  const pct = Math.min(calories / (targetCalories || 2000), 1);

  return (
    <View style={sharedStyles.card}>
      <View style={sharedStyles.rowBetween}>
        <Text style={sharedStyles.labelCaps}>NUTRITION SUMMARY</Text>
        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="See full nutrition diary"
          onPress={() => router.push('/food-diary')}
        >
          <Text style={styles.editActionText}>See All</Text>
        </TouchableOpacity>
      </View>

      <View style={[sharedStyles.rowBetween, { marginTop: 12 }]}>
        <Text style={styles.nutriLabelText}>Calories</Text>
        <Text style={styles.nutriValText}>
          {calories} / {targetCalories} kcal
        </Text>
      </View>

      <View style={styles.nutriBarTrack}>
        <View style={[styles.nutriBarFill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
});

// ─── 6. Yeti Readiness Score Hero ────────────────────────────────────────────
const YetiReadinessCard = memo(({ score, previousScore }: { score: number; previousScore: number }) => {
  const diff = score - previousScore;
  const isPositive = diff >= 0;

  let readinessLabel = 'OPTIMAL RECOVERY';
  let readinessColor: string = P.STEPS;
  if (score < 60) {
    readinessLabel = 'REST RECOMMENDED';
    readinessColor = P.CALORIES;
  } else if (score < 80) {
    readinessLabel = 'MODERATE READINESS';
    readinessColor = P.PROTEIN;
  }

  return (
    <View style={sharedStyles.cardGlow}>
      <View style={sharedStyles.rowBetween}>
        <Text style={sharedStyles.labelCaps}>YETI READINESS SCORE</Text>
        <View style={[styles.badgePill, { borderColor: readinessColor + '40', backgroundColor: readinessColor + '15' }]}>
          <Text style={[styles.badgeText, { color: readinessColor }]}>{readinessLabel}</Text>
        </View>
      </View>

      <View style={styles.scoreRowContainer}>
        <View style={styles.scoreCircleBadge}>
          <Text style={styles.scoreNumberText}>{score}</Text>
          <Text style={styles.scoreMaxText}>/100</Text>
        </View>

        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={styles.scoreDetailHeader}>Strain vs. Recovery</Text>
          <Text style={styles.scoreDetailSub}>
            Computed via workout completion, nutrition logging, and check-in consistency over 14 days.
          </Text>

          <View style={styles.deltaRow}>
            <Ionicons
              name={isPositive ? 'trending-up' : 'trending-down'}
              size={16}
              color={isPositive ? P.STEPS : P.CALORIES}
            />
            <Text style={[styles.deltaText, { color: isPositive ? P.STEPS : P.CALORIES }]}>
              {isPositive ? '+' : ''}{diff} pts from last week
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
});

// ─── 7. Quick Actions Component ──────────────────────────────────────────────
const QuickActionsGrid = memo(({
  onNavigate,
}: {
  onNavigate: (route: string) => void;
}) => {
  const actions = [
    { label: 'Log Workout', icon: 'barbell-outline', route: '/workouts', color: P.ACCENT },
    { label: 'Scan Food', icon: 'camera-outline', route: '/ai-food-scan', color: P.WATER },
    { label: 'Log Nutrition', icon: 'nutrition-outline', route: '/food-diary', color: P.PROTEIN },
    { label: 'Progress Check', icon: 'analytics-outline', route: '/analytics', color: P.ACCENT_BRIGHT },
  ];

  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={[sharedStyles.labelCaps, { marginBottom: 12 }]}>QUICK ACTIONS</Text>
      <View style={styles.actionGridContainer}>
        {actions.map((act) => (
          <TouchableOpacity
            key={act.label}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={act.label}
            activeOpacity={0.7}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onNavigate(act.route);
            }}
            style={styles.actionGridTile}
          >
            <View style={[styles.actionIconBg, { backgroundColor: act.color + '15', borderColor: act.color + '30' }]}>
              <Ionicons name={act.icon as any} size={22} color={act.color} />
            </View>
            <Text style={styles.actionTileLabel}>{act.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
});

// ─── Main HomeScreen Master Component ─────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;
  const { sync } = useSyncManager();

  const { progressRepository, nutritionRepository, workoutRepository, userRepository, eventRepository } =
    useRepositories();

  const [loading, setLoading] = useState(true);
  const [athleteName, setAthleteName] = useState('Sailesh Shrestha');
  const [yetiScore, setYetiScore] = useState(87);
  const [prevYetiScore, setPrevYetiScore] = useState(80);
  const [consumedMacros, setConsumedMacros] = useState({ calories: 1980, protein: 152, carbs: 205, fat: 62 });
  const [targetMacros, setTargetMacros] = useState({ calories: 2500, protein: 170, carbs: 280, fat: 80 });
  const [todayWorkout, setTodayWorkout] = useState<string | null>('Push Day');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  useEffect(() => {
    sync();
  }, []);

  const loadData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      await eventRepository.logActivity(userId, EVENTS.APP_OPENED);

      const profile = await userRepository.getProfile(userId);
      if (profile) {
        if (profile.full_name) setAthleteName(profile.full_name);
        setTargetMacros({
          calories: profile.target_calories || 2500,
          protein: profile.target_protein || 170,
          carbs: profile.target_carbs || 280,
          fat: profile.target_fat || 80,
        });
      }

      const todayMacros = await nutritionRepository.calculateDailyNutrition(userId, Date.now());
      if (todayMacros && todayMacros.calories > 0) {
        setConsumedMacros(todayMacros);
      }

      if (isNativeDbAvailable && database) {
        const activeSessions = (await database
          .get('workout_sessions')
          .query(Q.where('status', 'active'))
          .fetch()) as WorkoutSession[];

        if (activeSessions.length > 0) {
          setTodayWorkout(activeSessions[0].name || 'Push Day');
          setActiveSessionId(activeSessions[0].id);
        } else {
          const templates = (await workoutRepository.getWorkouts()) as Workout[];
          if (templates.length > 0) {
            setTodayWorkout(templates[0].name || 'Push Day');
            setActiveSessionId(null);
          } else {
            setTodayWorkout('Push Day');
            setActiveSessionId(null);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load local analytics:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  if (loading) {
    return (
      <AppShell activeTab="home">
        <SafeAreaView style={styles.safeArea}>
          <View style={{ padding: 20 }}>
            <SkeletonLoader rows={4} height={100} />
          </View>
        </SafeAreaView>
      </AppShell>
    );
  }

  return (
    <AppShell activeTab="home">
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={sharedStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Top Header & Greeting */}
          <Animated.View entering={FadeInDown.duration(400).delay(40)}>
            <HeaderAndGreeting
              fullName={athleteName}
              streakDays={12}
              onPressProfile={() => router.push('/profile')}
              onPressCoach={() => router.push('/coach')}
            />
          </Animated.View>

          {/* 2. Hero Motivational Banner */}
          <Animated.View entering={FadeInDown.duration(400).delay(80)}>
            <MotivationalBanner onPressAsk={() => router.push('/coach')} />
          </Animated.View>

          {/* 3. Today's Plan Card */}
          {todayWorkout && (
            <Animated.View entering={FadeInDown.duration(400).delay(120)}>
              <TodaysPlanCard
                todayWorkout={todayWorkout}
                activeSessionId={activeSessionId}
                onPressWorkout={() =>
                  router.push(activeSessionId ? '/workouts/session' : '/workouts')
                }
              />
            </Animated.View>
          )}

          {/* 4. Daily Progress 4-Ring Widget */}
          <Animated.View entering={FadeInDown.duration(400).delay(160)}>
            <DailyProgressWidget
              calories={consumedMacros.calories}
              targetCalories={targetMacros.calories}
              protein={consumedMacros.protein}
              targetProtein={targetMacros.protein}
              waterMl={2100}
              targetWaterMl={3000}
              steps={8247}
              targetSteps={10000}
            />
          </Animated.View>

          {/* 5. Nutrition Summary Bar */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <NutritionSummaryCard
              calories={consumedMacros.calories}
              targetCalories={targetMacros.calories}
            />
          </Animated.View>

          {/* 6. Yeti Readiness Score Hero */}
          <Animated.View entering={FadeInDown.duration(400).delay(240)}>
            <YetiReadinessCard score={yetiScore} previousScore={prevYetiScore} />
          </Animated.View>

          {/* 7. Quick Actions */}
          <Animated.View entering={FadeInDown.duration(400).delay(280)}>
            <QuickActionsGrid onNavigate={(route) => router.push(route as any)} />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </AppShell>
  );
}

// ─── Component Styles ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: P.BG },

  // Header & Brand Bar
  topBrandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  yetiBadgeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: P.RADIUS_PILL,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  yetiBadgeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: P.ACCENT,
  },
  greetingTitle: { color: P.TEXT_PRI, fontSize: 22, fontWeight: '900', letterSpacing: -0.4 },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 159, 10, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 10, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: P.RADIUS_FULL,
  },
  streakText: { color: P.WARNING, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  // Hero Banner
  heroBannerCard: {
    backgroundColor: P.CARD_BG,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    borderRadius: P.RADIUS_CARD,
    padding: 18,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBannerTitle: { color: P.TEXT_PRI, fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  heroBannerSub: { color: P.TEXT_SEC, fontSize: 12, marginTop: 4 },
  mascotAvatarWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: P.ACCENT_BORDER,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  mascotImg: { width: '100%', height: '100%' },

  // Today's Plan Card
  planCard: {
    padding: 20,
  },
  planTitle: { color: P.TEXT_PRI, fontSize: 24, fontWeight: '900', marginTop: 8, letterSpacing: -0.5 },
  planSubtitle: { color: P.TEXT_SEC, fontSize: 13, marginTop: 2, fontWeight: '600' },
  planMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  planMetaText: { color: P.TEXT_MUT, fontSize: 12, fontWeight: '700' },
  planMascotContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
  },
  planMascotImg: { width: '100%', height: '100%' },
  primaryRoyalBtn: {
    backgroundColor: P.ACCENT, // Royal Blue #2563EB
    paddingVertical: 14,
    minHeight: 48,
    borderRadius: P.RADIUS_PILL,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  primaryRoyalBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15, letterSpacing: 0.8 },

  // 4-Ring Widget
  editActionText: { color: P.ACCENT, fontSize: 12, fontWeight: '800' },
  ringsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  ringWrapper: {
    alignItems: 'center',
    width: (width - 80) / 4,
  },
  ringCenterIcon: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValueText: { color: P.TEXT_PRI, fontSize: 12, fontWeight: '900', marginTop: 6 },
  ringLabelText: { color: P.TEXT_MUT, fontSize: 9, fontWeight: '700', marginTop: 2 },

  // Nutrition Summary
  nutriLabelText: { color: P.TEXT_PRI, fontSize: 13, fontWeight: '700' },
  nutriValText: { color: P.TEXT_SEC, fontSize: 13, fontWeight: '800' },
  nutriBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 99,
    overflow: 'hidden',
    marginTop: 10,
  },
  nutriBarFill: {
    height: '100%',
    backgroundColor: P.ACCENT,
    borderRadius: 99,
  },

  // Score Card
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: P.RADIUS_FULL,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  scoreRowContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  scoreCircleBadge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: P.ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumberText: { color: P.TEXT_PRI, fontSize: 24, fontWeight: '900' },
  scoreMaxText: { color: P.TEXT_MUT, fontSize: 9, fontWeight: '700' },
  scoreDetailHeader: { color: P.TEXT_PRI, fontSize: 14, fontWeight: '700' },
  scoreDetailSub: { color: P.TEXT_SEC, fontSize: 11, lineHeight: 15, marginTop: 2 },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  deltaText: { fontSize: 11, fontWeight: '800' },

  // Quick Actions Grid
  actionGridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionGridTile: {
    width: (width - 50) / 2,
    minHeight: 56,
    backgroundColor: P.CARD_BG,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    borderRadius: P.RADIUS_CARD,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  actionTileLabel: { color: P.TEXT_PRI, fontSize: 13, fontWeight: '700', flex: 1 },
});

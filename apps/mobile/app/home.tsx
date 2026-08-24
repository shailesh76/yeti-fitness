import React, { useEffect, useState, useCallback, memo, useRef } from 'react';
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
import { Q } from '@nozbe/watermelondb';
import * as Haptics from 'expo-haptics';

import { useRepositories } from '../hooks/useRepositories';
import { EVENTS } from '../constants/analyticsEvents';
import { useAuthStore } from '../store/useAuthStore';
import { useSyncManager } from '../hooks/useSyncManager';
import { WorkoutSession } from '@yeti/database';
import AppShell from '../components/AppShell';
import { database, isNativeDbAvailable } from '../database';
import { P, glowStyle, sharedStyles } from '../constants/premiumTheme';
import { useHydrationStore } from '../store/useHydrationStore';
import { fetchDailyTelemetry } from '../services/wearableService';
import { fetchNutritionTargets, getCachedNutritionTargets } from '../services/nutritionTargets';
import { useFoodStore } from '../store/useFoodStore';
import { useUserStore } from '../store/useUserStore';
import { useSessionStore } from '../store/useSessionStore';
import { useWorkoutStore } from '../store/useWorkoutStore';
import {
  Macros, ZERO_MACROS, TodaysPlanSummary, ReadinessState,
  resolveConsumedMacros, sumMealLogsForDay, pickRicherMacros,
  buildTodaysPlan, describeReadiness,
  HomeSnapshot, getHomeSnapshot, hydrateHomeSnapshot, patchHomeSnapshot, homeCacheKey,
} from '../services/homeSummary';
import { SkeletonLoader } from '../components/TelemetryComponents';
import { dedupeScreenRefresh, getScreenData, isScreenDataStale, setScreenData, subscribeScreenData } from '../services/screenDataCache';
import type { NutritionTargets } from '../services/nutritionUtils';
import { createScreenPerfTrace } from '../services/screenPerf';
import { logBootStage } from '../services/authenticatedHydration';
import { resolveProfileDisplayName } from '../services/profileIdentity';

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
BiometricRing.displayName = 'BiometricRing';

// ─── 1. Header & Greeting Bar ───────────────────────────────────────────
const HeaderAndGreeting = memo(({
  fullName,
  onPressProfile,
  onPressCoach,
}: {
  fullName: string;
  onPressProfile: () => void;
  onPressCoach: () => void;
}) => {
  const currentHour = new Date().getHours();
  let greeting = 'Good morning';
  if (currentHour >= 12 && currentHour < 17) greeting = 'Good afternoon';
  else if (currentHour >= 17) greeting = 'Good evening';

  const firstName = fullName.split(' ')[0] || 'Athlete';

  return (
    <View style={[sharedStyles.rowBetween, { marginBottom: 20 }]}>
      <TouchableOpacity
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Open profile"
        activeOpacity={0.8}
        onPress={onPressProfile}
        style={sharedStyles.row}
      >
        <View style={styles.avatarCircle}>
          <Image
            source={require('../assets/yeti_avatar_portrait.png')}
            style={styles.avatarImg}
            resizeMode="cover"
          />
        </View>
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.greetingTitle}>
            {greeting}, {firstName} 👋
          </Text>
          <Text style={styles.greetingSub}>Let&apos;s crush your goals today!</Text>
        </View>
      </TouchableOpacity>

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
  );
});
HeaderAndGreeting.displayName = 'HeaderAndGreeting';

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
        <Text style={styles.heroBannerSub}>You&apos;re stronger than yesterday.</Text>
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
MotivationalBanner.displayName = 'MotivationalBanner';

// ─── 3. Today's Plan Card (Master Reference) ──────────────────────────────────
const TodaysPlanCard = memo(({
  plan,
  onPressWorkout,
}: {
  plan: TodaysPlanSummary;
  onPressWorkout: () => void;
}) => {
  const isResume = plan.kind === 'session';

  return (
    <View style={[sharedStyles.card, styles.planCard]}>
      <View style={sharedStyles.rowBetween}>
        <Text style={sharedStyles.labelCaps}>TODAY&apos;S PLAN</Text>
        <Ionicons name="ellipsis-horizontal" size={18} color={P.TEXT_MUT} />
      </View>

      <View style={sharedStyles.rowBetween}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={styles.planTitle}>{plan.name}</Text>
          {!!plan.muscleSummary && <Text style={styles.planSubtitle}>{plan.muscleSummary}</Text>}

          {plan.exerciseCount > 0 && (
            <View style={styles.planMetaRow}>
              <View style={sharedStyles.row}>
                <Ionicons name="barbell-outline" size={13} color={P.TEXT_MUT} style={{ marginRight: 4 }} />
                <Text style={styles.planMetaText}>
                  {plan.exerciseCount} {plan.exerciseCount === 1 ? 'Exercise' : 'Exercises'}
                </Text>
              </View>
              {plan.setCount > 0 && (
                <View style={[sharedStyles.row, { marginLeft: 14 }]}>
                  <Ionicons name="repeat-outline" size={13} color={P.TEXT_MUT} style={{ marginRight: 4 }} />
                  <Text style={styles.planMetaText}>
                    {plan.setCount} {plan.setCount === 1 ? 'Set' : 'Sets'}
                  </Text>
                </View>
              )}
            </View>
          )}
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
        accessibilityLabel={isResume ? `Resume Workout Session: ${plan.name}` : `Start Workout: ${plan.name}`}
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
TodaysPlanCard.displayName = 'TodaysPlanCard';

const TodaysPlanEmptyCard = memo(({ onPressBrowse }: { onPressBrowse: () => void }) => (
  <View style={[sharedStyles.card, styles.planCard]}>
    <View style={sharedStyles.rowBetween}>
      <Text style={sharedStyles.labelCaps}>TODAY&apos;S PLAN</Text>
    </View>

    <View style={sharedStyles.rowBetween}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.planTitle}>No plan yet</Text>
        <Text style={styles.planSubtitle}>Create a workout template to see it here.</Text>
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
      accessibilityLabel="Browse workouts to create a plan"
      activeOpacity={0.85}
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPressBrowse();
      }}
      style={[styles.primaryRoyalBtn, glowStyle(P.ACCENT, 16, 0.35)]}
    >
      <Text style={styles.primaryRoyalBtnText}>BROWSE WORKOUTS</Text>
    </TouchableOpacity>
  </View>
));
TodaysPlanEmptyCard.displayName = 'TodaysPlanEmptyCard';

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
  const sPct = Math.min((steps || 0) / targetSteps, 1);

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
          labelText={`${calories.toLocaleString()} / ${(targetCalories || 2000).toLocaleString()}`}
        />
        <BiometricRing
          size={60}
          strokeWidth={5}
          progress={pPct}
          color={P.PROTEIN}
          iconName="restaurant"
          valueText={`${protein}g`}
          labelText={`${protein}g / ${targetProtein || 150}g`}
        />
        <BiometricRing
          size={60}
          strokeWidth={5}
          progress={wPct}
          color={P.WATER}
          iconName="water"
          valueText={`${(waterMl / 1000).toFixed(1)}L`}
          labelText={`${(waterMl / 1000).toFixed(1)}L / ${((targetWaterMl || 2500) / 1000).toFixed(1)}L`}
        />
        <BiometricRing
          size={60}
          strokeWidth={5}
          progress={sPct}
          color={P.STEPS}
          iconName="footsteps"
          valueText={`${steps || 0}`}
          labelText="8,247 / 10k"
        />
      </View>
    </View>
  );
});
DailyProgressWidget.displayName = 'DailyProgressWidget';

// ─── 5. Nutrition Summary Bar Card (Reference UI Screen 1) ──────────────────
const NutritionSummaryCard = memo(({
  calories,
  targetCalories,
  protein,
  targetProtein,
  carbs,
  targetCarbs,
  fat,
  targetFat,
}: {
  calories: number;
  targetCalories: number;
  protein: number;
  targetProtein: number;
  carbs: number;
  targetCarbs: number;
  fat: number;
  targetFat: number;
}) => {
  const router = useRouter();
  const remaining = Math.max(0, targetCalories - calories);
  const ringSize = 72;
  const strokeWidth = 6;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = targetCalories > 0 ? Math.min(Math.max(calories / targetCalories, 0), 1) : 0;
  const strokeDashoffset = circumference * (1 - clampedProgress);
  const barPct = (value: number, target: number) => (target > 0 ? Math.min((value / target) * 100, 100) : 0);

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

      {/* Consumed / Goal Ring / Remaining Header Row */}
      <View style={[sharedStyles.rowBetween, { marginTop: 14, marginBottom: 16, alignItems: 'center' }]}>
        <View style={{ alignItems: 'flex-start', minWidth: 70 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: P.TEXT_PRI }}>{calories.toLocaleString()}</Text>
          <Text style={{ fontSize: 12, color: P.TEXT_MUT, marginTop: 2 }}>Consumed</Text>
        </View>

        {/* Center Goal Ring */}
        <View style={{ width: ringSize, height: ringSize, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={ringSize} height={ringSize}>
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              stroke={P.ACCENT_BRIGHT}
              strokeWidth={strokeWidth}
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
              transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
            />
          </Svg>
          <View style={{ position: 'absolute', alignItems: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: P.TEXT_PRI }}>{targetCalories.toLocaleString()}</Text>
            <Text style={{ fontSize: 9, color: P.TEXT_MUT }}>Goal</Text>
          </View>
        </View>

        <View style={{ alignItems: 'flex-end', minWidth: 70 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: P.TEXT_PRI }}>{remaining.toLocaleString()}</Text>
          <Text style={{ fontSize: 12, color: P.TEXT_MUT, marginTop: 2 }}>Remaining</Text>
        </View>
      </View>

      {/* 3 Macro Bars Row */}
      <View style={{ gap: 8 }}>
        <View>
          <View style={sharedStyles.rowBetween}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: P.TEXT_MUT }}>Protein</Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: P.TEXT_PRI }}>{protein} / {targetProtein}g</Text>
          </View>
          <View style={[styles.nutriBarTrack, { marginTop: 4 }]}>
            <View style={[styles.nutriBarFill, { width: `${barPct(protein, targetProtein)}%`, backgroundColor: P.PROTEIN }]} />
          </View>
        </View>

        <View>
          <View style={sharedStyles.rowBetween}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: P.TEXT_MUT }}>Carbs</Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: P.TEXT_PRI }}>{carbs} / {targetCarbs}g</Text>
          </View>
          <View style={[styles.nutriBarTrack, { marginTop: 4 }]}>
            <View style={[styles.nutriBarFill, { width: `${barPct(carbs, targetCarbs)}%`, backgroundColor: P.WARNING }]} />
          </View>
        </View>

        <View>
          <View style={sharedStyles.rowBetween}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: P.TEXT_MUT }}>Fat</Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: P.TEXT_PRI }}>{fat} / {targetFat}g</Text>
          </View>
          <View style={[styles.nutriBarTrack, { marginTop: 4 }]}>
            <View style={[styles.nutriBarFill, { width: `${barPct(fat, targetFat)}%`, backgroundColor: P.CALORIES }]} />
          </View>
        </View>
      </View>
    </View>
  );
});
NutritionSummaryCard.displayName = 'NutritionSummaryCard';

// ─── 6. Yeti Readiness Score Hero ────────────────────────────────────────────
const YetiReadinessCard = memo(({ readiness }: { readiness: ReadinessState }) => {
  const TONE_COLORS: Record<'ready' | 'moderate' | 'recover', string> = {
    ready: P.ACCENT,
    moderate: P.PROTEIN,
    recover: P.CALORIES,
  };

  const score = readiness.available ? readiness.score : 0;
  const readinessColor: string = readiness.available ? TONE_COLORS[readiness.tone] : P.TEXT_MUT;
  const readinessLabel = readiness.available ? readiness.label : 'Not available';
  const readinessSub = readiness.available
    ? readiness.sub
    : 'Log workouts and recovery data to unlock this.';
  const diff = readiness.available ? readiness.delta : null;
  const isPositive = (diff ?? 0) >= 0;

  const ringSize = 44;
  const strokeWidth = 4;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(Math.max(score / 100, 0), 1);
  const strokeDashoffset = circumference * (1 - clampedProgress);

  return (
    <View style={[sharedStyles.cardGlow, styles.readinessCard]}>
      <View style={styles.readinessMascotTile}>
        <Image
          source={require('../assets/yeti_mascot_avatar.png')}
          style={styles.readinessMascotImg}
          resizeMode="cover"
        />
      </View>

      <View style={{ flex: 1, marginLeft: 14 }}>
        <View style={sharedStyles.row}>
          <Text style={sharedStyles.labelCaps}>YETI READINESS</Text>
          <Ionicons name="information-circle-outline" size={13} color={P.TEXT_MUT} style={{ marginLeft: 4 }} />
        </View>
        <View style={[sharedStyles.row, { marginTop: 4 }]}>
          {readiness.available && <Text style={styles.readinessPercent}>{score}%</Text>}
          <Text style={[styles.readinessStatus, { color: readinessColor }]}>{readinessLabel}</Text>
        </View>
        <Text style={styles.readinessSub}>{readinessSub}</Text>

        {diff !== null && (
          <View style={styles.deltaRow}>
            <Ionicons
              name={isPositive ? 'trending-up' : 'trending-down'}
              size={13}
              color={isPositive ? P.STEPS : P.CALORIES}
            />
            <Text style={[styles.deltaText, { color: isPositive ? P.STEPS : P.CALORIES }]}>
              {isPositive ? '+' : ''}{diff} pts this week
            </Text>
          </View>
        )}
      </View>

      <View style={{ width: ringSize, height: ringSize, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={ringSize} height={ringSize}>
          <Circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            stroke={readinessColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
          />
        </Svg>
        <View style={{ position: 'absolute' }}>
          <Ionicons name="pulse" size={18} color={readinessColor} />
        </View>
      </View>
    </View>
  );
});
YetiReadinessCard.displayName = 'YetiReadinessCard';

// ─── 7. Quick Actions Component ──────────────────────────────────────────────
const QuickActionsGrid = memo(({
  onNavigate,
}: {
  onNavigate: (route: string) => void;
}) => {
  const actions = [
    { label: 'Log Workout', icon: 'barbell-outline', route: '/workouts' },
    { label: 'Add Meal', icon: 'restaurant-outline', route: '/food-diary' },
    { label: 'Track Weight', icon: 'scale-outline', route: '/analytics' },
    { label: 'Log Water', icon: 'water-outline', route: '/food-diary' },
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
            <View style={styles.actionIconBg}>
              <Ionicons name={act.icon as any} size={22} color={P.ACCENT} />
            </View>
            <Text style={styles.actionTileLabel} numberOfLines={1}>{act.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
});
QuickActionsGrid.displayName = 'QuickActionsGrid';

// ─── 8. Weekly Progress Stat Row ──────────────────────────────────────────────
const WeeklyProgressCard = memo(({
  workoutCount,
  weeklyCalories,
  targetWeeklyCalories,
  readinessScore,
  onPressViewAll,
}: {
  workoutCount: number;
  weeklyCalories: number;
  targetWeeklyCalories: number;
  readinessScore: number | null;
  onPressViewAll: () => void;
}) => {
  const workoutPct = Math.min(workoutCount / 7, 1);
  const caloriePct = Math.min(weeklyCalories / (targetWeeklyCalories || 1), 1);
  const recoveryPct = readinessScore === null ? 0 : Math.min(readinessScore / 100, 1);

  return (
    <View style={{ marginBottom: 20 }}>
      <View style={[sharedStyles.rowBetween, { marginBottom: 12 }]}>
        <Text style={sharedStyles.labelCaps}>WEEKLY PROGRESS</Text>
        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="View all weekly progress"
          onPress={onPressViewAll}
        >
          <Text style={styles.editActionText}>View All</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weeklyStatsRow}>
        <View style={styles.weeklyStatTile}>
          <Text style={styles.weeklyStatLabel}>Workouts</Text>
          <Text style={styles.weeklyStatValue}>{workoutCount}</Text>
          <Text style={styles.weeklyStatSub}>This Week</Text>
          <View style={styles.weeklyStatBarTrack}>
            <View style={[styles.weeklyStatBarFill, { width: `${workoutPct * 100}%`, backgroundColor: P.ACCENT }]} />
          </View>
        </View>

        <View style={styles.weeklyStatTile}>
          <Text style={styles.weeklyStatLabel}>Calories</Text>
          <Text style={styles.weeklyStatValue}>{weeklyCalories.toLocaleString()}</Text>
          <Text style={styles.weeklyStatSub}>This Week</Text>
          <View style={styles.weeklyStatBarTrack}>
            <View style={[styles.weeklyStatBarFill, { width: `${caloriePct * 100}%`, backgroundColor: P.CALORIES }]} />
          </View>
        </View>

        <View style={styles.weeklyStatTile}>
          <Text style={styles.weeklyStatLabel}>Recovery</Text>
          <Text style={styles.weeklyStatValue}>{readinessScore === null ? '—' : `${readinessScore}%`}</Text>
          <Text style={styles.weeklyStatSub}>This Week</Text>
          <View style={styles.weeklyStatBarTrack}>
            <View style={[styles.weeklyStatBarFill, { width: `${recoveryPct * 100}%`, backgroundColor: P.STEPS }]} />
          </View>
        </View>
      </View>
    </View>
  );
});
WeeklyProgressCard.displayName = 'WeeklyProgressCard';

// ─── Main HomeScreen Master Component ─────────────────────────────────────────
export default function HomeScreen() {
  const perf = useRef(createScreenPerfTrace('home')).current;
  perf('T0 route render');
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const userId = session?.user?.id || user?.id;
  const userKey = userId ? homeCacheKey(userId) : 'home:anonymous';
  const { sync } = useSyncManager();

  const { progressRepository, nutritionRepository, workoutRepository, userRepository, eventRepository } =
    useRepositories();

  // 1. Immediate in-memory snapshot read for instant 0ms first paint
  const memorySnapshot = userId ? getHomeSnapshot(userId) : null;
  const initialTargets = userId ? getScreenData<NutritionTargets>(`nutrition-targets:${userId}`) : null;
  const userStoreName = useUserStore.getState().full_name;
  const authDisplayName = resolveProfileDisplayName(null, user, userStoreName);

  const [athleteName, setAthleteName] = useState(
    resolveProfileDisplayName(userStoreName, user, memorySnapshot?.athleteName)
  );
  const yetiScore: number | null = null;
  const prevYetiScore: number | null = null;
  const [consumedMacros, setConsumedMacros] = useState<Macros>(
    memorySnapshot?.consumedMacros ?? ZERO_MACROS
  );
  const [targetMacros, setTargetMacros] = useState<NutritionTargets | null>(
    memorySnapshot?.targetMacros ?? initialTargets ?? null
  );
  const [todayPlan, setTodayPlan] = useState<TodaysPlanSummary | null>(
    memorySnapshot?.todayPlan ?? null
  );
  const [waterMl, setWaterMl] = useState(memorySnapshot?.waterMl ?? 0);
  const [steps, setSteps] = useState(memorySnapshot?.steps ?? 0);
  const [weeklyWorkoutCount, setWeeklyWorkoutCount] = useState(memorySnapshot?.weeklyWorkoutCount ?? 0);
  const [weeklyCalories, setWeeklyCalories] = useState(memorySnapshot?.weeklyCalories ?? 0);

  const hasAnyCachedData = !!(
    memorySnapshot ||
    initialTargets ||
    userStoreName ||
    useFoodStore.getState().mealLogs.length > 0
  );
  const [loading, setLoading] = useState(!hasAnyCachedData);

  const waterGoal = useHydrationStore((s) => s.waterGoal);
  const getWaterForDate = useHydrationStore((s) => s.getWaterForDate);
  const loadHydrationGoal = useHydrationStore((s) => s.loadGoal);

  useEffect(() => {
    sync();
    loadHydrationGoal();
  }, []);

  // Hydrate persistent snapshot on cold launch if memory snapshot was empty
  useEffect(() => {
    if (!userId) return;
    void hydrateHomeSnapshot(userId).then((snapshot) => {
      if (snapshot) {
        if (snapshot.athleteName) setAthleteName(resolveProfileDisplayName(null, user, snapshot.athleteName));
        if (snapshot.consumedMacros) setConsumedMacros(snapshot.consumedMacros);
        if (snapshot.targetMacros) setTargetMacros(snapshot.targetMacros);
        if (snapshot.todayPlan !== undefined) setTodayPlan(snapshot.todayPlan);
        if (snapshot.waterMl !== undefined) setWaterMl(snapshot.waterMl);
        if (snapshot.steps !== undefined) setSteps(snapshot.steps);
        if (snapshot.weeklyWorkoutCount !== undefined) setWeeklyWorkoutCount(snapshot.weeklyWorkoutCount);
        if (snapshot.weeklyCalories !== undefined) setWeeklyCalories(snapshot.weeklyCalories);
        setLoading(false);
      }
    });
  }, [userId]);

  // Subscribe to Home snapshot updates triggered by mutations & Realtime events
  useEffect(() => {
    if (!userId) return;
    return subscribeScreenData<HomeSnapshot>(userKey, (snapshot) => {
      if (!snapshot) return;
      if (snapshot.athleteName) setAthleteName(resolveProfileDisplayName(null, user, snapshot.athleteName));
      if (snapshot.consumedMacros) setConsumedMacros(snapshot.consumedMacros);
      if (snapshot.targetMacros !== undefined) setTargetMacros(snapshot.targetMacros);
      if (snapshot.todayPlan !== undefined) setTodayPlan(snapshot.todayPlan);
      if (snapshot.waterMl !== undefined) setWaterMl(snapshot.waterMl);
      if (snapshot.steps !== undefined) setSteps(snapshot.steps);
      if (snapshot.weeklyWorkoutCount !== undefined) setWeeklyWorkoutCount(snapshot.weeklyWorkoutCount);
      if (snapshot.weeklyCalories !== undefined) setWeeklyCalories(snapshot.weeklyCalories);
      setLoading(false);
    });
  }, [userId, userKey]);

  // Subscribe to direct nutrition target changes
  const nutritionCacheKey = userId ? `nutrition-targets:${userId}` : 'nutrition-targets:anonymous';
  useEffect(() => subscribeScreenData<NutritionTargets>(nutritionCacheKey, (targets) => {
    if (targets) setTargetMacros(targets);
  }), [nutritionCacheKey]);

  const loadData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    return dedupeScreenRefresh(userKey, async () => {
      logBootStage('REMOTE_RECONCILE_START', userId);
      perf('T3 remote start');
      void eventRepository.logActivity(userId, EVENTS.APP_OPENED).catch(() => {});

      // Parallelize independent data fetches so slow requests do not block other cards
      await Promise.allSettled([
        // Branch 1: Profile & Athlete Name
        (async () => {
          try {
            const profile = await userRepository.getProfile(userId);
            if (profile?.full_name) {
              setAthleteName(resolveProfileDisplayName(profile.full_name, user, authDisplayName));
              patchHomeSnapshot(userId, {
                athleteName: profile.full_name,
                currentWeight: profile.weight_kg != null ? Number(profile.weight_kg) : null,
              });
            } else {
              const { data: remoteProfile } = await userRepository.fetchProfileRemote(userId);
              if (remoteProfile?.full_name) {
                setAthleteName(resolveProfileDisplayName(remoteProfile.full_name, user, authDisplayName));
                patchHomeSnapshot(userId, {
                  athleteName: remoteProfile.full_name,
                  currentWeight: remoteProfile.weight_kg != null ? Number(remoteProfile.weight_kg) : null,
                });
              }
            }
          } catch {}
        })(),

        // Branch 2: Nutrition Targets
        (async () => {
          try {
            const localTargets = await getCachedNutritionTargets(userId);
            perf('T1 local cache read');
            if (localTargets) {
              setTargetMacros(localTargets);
              patchHomeSnapshot(userId, { targetMacros: localTargets });
            }
            const targets = await fetchNutritionTargets(userId);
            perf('T4 remote response');
            const resolved = targets.calories == null ? null : targets;
            setTargetMacros(resolved);
            patchHomeSnapshot(userId, { targetMacros: resolved });
          } catch {}
        })(),

        // Branch 3: Consumed Nutrition & Meal Logs
        (async () => {
          try {
            const now = Date.now();
            const [todayMacros] = await Promise.all([
              nutritionRepository.calculateDailyNutrition(userId, now),
              useFoodStore.getState().loadLocalCache(),
            ]);
            perf('T2 local DB/storage read');
            const storeMacros = sumMealLogsForDay(useFoodStore.getState().mealLogs, now, userId);
            const richer = pickRicherMacros(resolveConsumedMacros(todayMacros), storeMacros);
            setConsumedMacros(richer);
            patchHomeSnapshot(userId, { consumedMacros: richer });
          } catch {}
        })(),

        // Branch 4: Hydration & Daily Telemetry
        (async () => {
          try {
            const [loggedWater, telemetry] = await Promise.all([
              getWaterForDate(new Date().toDateString()),
              fetchDailyTelemetry(),
            ]);
            setWaterMl(loggedWater);
            setSteps(telemetry.steps);
            patchHomeSnapshot(userId, { waterMl: loggedWater, steps: telemetry.steps });
          } catch {}
        })(),

        // Branch 5: Today's Plan & Weekly Session Count
        (async () => {
          try {
            const startOfWeek = new Date();
            startOfWeek.setHours(0, 0, 0, 0);
            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
            const [history, ownPlans] = await Promise.all([
              workoutRepository.getWorkoutHistory(userId).catch(() => []),
              workoutRepository.fetchOwnWorkoutPlans(userId).catch(() => []),
            ]);

            const assignedPlans = useWorkoutStore.getState().workoutPlans || [];
            const allCandidatePlans = [...assignedPlans, ...(ownPlans || [])];

            const currentActive = useSessionStore.getState().activeSession;
            let activeSession: { id: string; name?: string | null } | null = currentActive
              ? { id: currentActive.localId, name: currentActive.name }
              : null;

            if (!activeSession && isNativeDbAvailable && database) {
              try {
                const activeSessions = (await database
                  .get('workout_sessions')
                  .query(Q.where('status', 'active'))
                  .fetch()) as WorkoutSession[];
                if (activeSessions.length > 0) {
                  activeSession = { id: activeSessions[0].id, name: activeSessions[0].name };
                }
              } catch {}
            }

            const thisWeekSessions = (history || []).filter((s) => {
              const ts = s.finished_at || (s.completed_at ? new Date(s.completed_at).getTime() : 0);
              return ts >= startOfWeek.getTime();
            });
            const count = thisWeekSessions.length;
            setWeeklyWorkoutCount(count);

            const completedPlanDayIds = new Set<string>();
            (history || []).forEach((h: any) => {
              if (h.plan_day_id) completedPlanDayIds.add(h.plan_day_id);
            });

            const builtPlan = buildTodaysPlan({
              activeSession,
              plans: allCandidatePlans,
              completedPlanDayIds,
            });
            setTodayPlan(builtPlan);
            patchHomeSnapshot(userId, { todayPlan: builtPlan, weeklyWorkoutCount: count });
          } catch {}
        })(),

        // Branch 6: Weekly 7-Day Trailing Calories
        (async () => {
          try {
            const last7Days = Array.from({ length: 7 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - i);
              return d.getTime();
            });
            const dailyTotals = await Promise.all(
              last7Days.map((dayMs) => nutritionRepository.calculateDailyNutrition(userId, dayMs))
            );
            const weekCals = dailyTotals.reduce((sum, d) => sum + d.calories, 0);
            setWeeklyCalories(weekCals);
            patchHomeSnapshot(userId, { weeklyCalories: weekCals });
          } catch {}
        })(),
      ]);

      setLoading(false);
      perf('T5 state reconciliation');
      perf('T6 visible authoritative UI');
      setScreenData(userKey, true);
      logBootStage('REMOTE_RECONCILE_DONE', userId);
    });
  }, [userId, userKey]);

  useFocusEffect(
    useCallback(() => {
      if (!getScreenData(userKey) || isScreenDataStale(userKey)) void loadData();
    }, [loadData, userKey])
  );

  // Cached content becomes meaningful immediately; uncached cards own their neutral loading states.
  const hasRenderableContent = !!(
    memorySnapshot ||
    targetMacros != null ||
    todayPlan != null ||
    consumedMacros.calories > 0 ||
    athleteName !== 'Athlete' ||
    weeklyWorkoutCount > 0 ||
    weeklyCalories > 0 ||
    useFoodStore.getState().mealLogs.length > 0
  );

  useEffect(() => {
    if (userId && hasRenderableContent) logBootStage('HOME_FIRST_MEANINGFUL_RENDER', userId);
  }, [userId, hasRenderableContent]);

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
              onPressProfile={() => router.push('/profile')}
              onPressCoach={() => router.push('/coach')}
            />
          </Animated.View>

          {/* 2. Yeti Readiness Score Hero */}
          <Animated.View entering={FadeInDown.duration(400).delay(80)}>
            <YetiReadinessCard readiness={describeReadiness(yetiScore, prevYetiScore)} />
          </Animated.View>

          {/* 3. Today's Plan Card */}
          <Animated.View entering={FadeInDown.duration(400).delay(120)}>
            {loading && !hasRenderableContent ? (
              <SkeletonLoader rows={1} height={120} />
            ) : todayPlan ? (
              <TodaysPlanCard
                plan={todayPlan}
                onPressWorkout={() =>
                  router.push(todayPlan.kind === 'session' ? '/workouts/session' : '/workouts')
                }
              />
            ) : (
              <TodaysPlanEmptyCard onPressBrowse={() => router.push('/workouts')} />
            )}
          </Animated.View>

          {/* 4. Nutrition Summary Bar */}
          <Animated.View entering={FadeInDown.duration(400).delay(160)}>
            {targetMacros?.calories != null ? (
              <NutritionSummaryCard
                calories={consumedMacros.calories}
                targetCalories={targetMacros.calories}
                protein={consumedMacros.protein}
                targetProtein={targetMacros.protein ?? 0}
                carbs={consumedMacros.carbs}
                targetCarbs={targetMacros.carbs ?? 0}
                fat={consumedMacros.fat}
                targetFat={targetMacros.fat ?? 0}
              />
            ) : (
              <SkeletonLoader rows={1} height={120} />
            )}
          </Animated.View>

          {/* 5. Quick Actions */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <QuickActionsGrid onNavigate={(route) => router.push(route as any)} />
          </Animated.View>

          {/* 6. Weekly Progress */}
          <Animated.View entering={FadeInDown.duration(400).delay(220)}>
            <WeeklyProgressCard
              workoutCount={weeklyWorkoutCount}
              weeklyCalories={weeklyCalories}
              targetWeeklyCalories={(targetMacros?.calories ?? 0) * 7}
              readinessScore={yetiScore}
              onPressViewAll={() => router.push('/analytics')}
            />
          </Animated.View>

          {/* 7. Daily Progress 4-Ring Widget */}
          <Animated.View entering={FadeInDown.duration(400).delay(240)}>
            {targetMacros?.calories != null ? (
              <DailyProgressWidget
                calories={consumedMacros.calories}
                targetCalories={targetMacros.calories}
                protein={consumedMacros.protein}
                targetProtein={targetMacros.protein ?? 0}
                waterMl={waterMl}
                targetWaterMl={waterGoal}
                steps={steps}
                targetSteps={10000}
              />
            ) : (
              <SkeletonLoader rows={1} height={120} />
            )}
          </Animated.View>

          {/* 8. Hero Motivational Banner */}
          <Animated.View entering={FadeInDown.duration(400).delay(280)}>
            <MotivationalBanner onPressAsk={() => router.push('/coach')} />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </AppShell>
  );
}

// ─── Component Styles ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: P.BG },

  // Header & Greeting
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: P.ACCENT_DIM,
    borderWidth: 1,
    borderColor: P.ACCENT_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%', borderRadius: 22 },
  greetingSub: { color: P.TEXT_SEC, fontSize: 12, fontWeight: '600', marginTop: 2 },
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
  greetingTitle: { color: P.TEXT_PRI, fontSize: 19, fontWeight: '900', letterSpacing: -0.4 },

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
    backgroundColor: P.ACCENT,
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

  // Yeti Readiness Card
  readinessCard: { flexDirection: 'row', alignItems: 'center' },
  readinessMascotTile: {
    width: 64,
    height: 72,
    borderRadius: P.RADIUS_PILL,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: P.ACCENT_BORDER,
    backgroundColor: P.ACCENT_DIM,
  },
  readinessMascotImg: { width: '100%', height: '100%' },
  readinessPercent: { color: P.TEXT_PRI, fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  readinessStatus: { fontSize: 13, fontWeight: '800', marginLeft: 8 },
  readinessSub: { color: P.TEXT_MUT, fontSize: 11, fontWeight: '600', marginTop: 2 },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  deltaText: { fontSize: 11, fontWeight: '800' },

  // Quick Actions Grid
  actionGridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionGridTile: {
    width: (width - 50) / 2,
    minHeight: 88,
    backgroundColor: P.CARD_BG,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    borderRadius: P.RADIUS_CARD,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconBg: {
    width: 44,
    height: 44,
    borderRadius: P.RADIUS_SM,
    borderWidth: 1,
    borderColor: P.ACCENT_BORDER,
    backgroundColor: P.ACCENT_DIM,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionTileLabel: { color: P.TEXT_PRI, fontSize: 12, fontWeight: '700', textAlign: 'center' },

  // Weekly Progress
  weeklyStatsRow: { flexDirection: 'row', gap: 10 },
  weeklyStatTile: {
    flex: 1,
    backgroundColor: P.CARD_BG,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    borderRadius: P.RADIUS_CARD,
    padding: 12,
  },
  weeklyStatLabel: { color: P.TEXT_MUT, fontSize: 11, fontWeight: '700' },
  weeklyStatValue: { color: P.TEXT_PRI, fontSize: 20, fontWeight: '900', marginTop: 6, letterSpacing: -0.3 },
  weeklyStatSub: { color: P.TEXT_MUT, fontSize: 10, fontWeight: '600', marginTop: 2, marginBottom: 8 },
  weeklyStatBarTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 99,
    overflow: 'hidden',
  },
  weeklyStatBarFill: { height: '100%', borderRadius: 99 },
});

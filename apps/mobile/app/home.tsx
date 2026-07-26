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
import { fetchDailyTelemetry } from '../services/wearableService';
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
        <Text style={sharedStyles.labelCaps}>TODAY&apos;S PLAN</Text>
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
TodaysPlanCard.displayName = 'TodaysPlanCard';

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
  calories = 1980,
  targetCalories = 2600,
  protein = 152,
  targetProtein = 170,
  carbs = 205,
  targetCarbs = 280,
  fat = 62,
  targetFat = 80,
}: {
  calories?: number;
  targetCalories?: number;
  protein?: number;
  targetProtein?: number;
  carbs?: number;
  targetCarbs?: number;
  fat?: number;
  targetFat?: number;
}) => {
  const router = useRouter();
  const remaining = Math.max(0, targetCalories - calories);
  const ringSize = 72;
  const strokeWidth = 6;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(Math.max(calories / (targetCalories || 2600), 0), 1);
  const strokeDashoffset = circumference * (1 - clampedProgress);

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
        {/* Protein */}
        <View>
          <View style={sharedStyles.rowBetween}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: P.TEXT_MUT }}>Protein</Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: P.TEXT_PRI }}>{protein} / {targetProtein}g</Text>
          </View>
          <View style={[styles.nutriBarTrack, { marginTop: 4 }]}>
            <View style={[styles.nutriBarFill, { width: `${Math.min((protein / targetProtein) * 100, 100)}%`, backgroundColor: P.PROTEIN }]} />
          </View>
        </View>

        {/* Carbs */}
        <View>
          <View style={sharedStyles.rowBetween}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: P.TEXT_MUT }}>Carbs</Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: P.TEXT_PRI }}>{carbs} / {targetCarbs}g</Text>
          </View>
          <View style={[styles.nutriBarTrack, { marginTop: 4 }]}>
            <View style={[styles.nutriBarFill, { width: `${Math.min((carbs / targetCarbs) * 100, 100)}%`, backgroundColor: P.WARNING }]} />
          </View>
        </View>

        {/* Fat */}
        <View>
          <View style={sharedStyles.rowBetween}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: P.TEXT_MUT }}>Fat</Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: P.TEXT_PRI }}>{fat} / {targetFat}g</Text>
          </View>
          <View style={[styles.nutriBarTrack, { marginTop: 4 }]}>
            <View style={[styles.nutriBarFill, { width: `${Math.min((fat / targetFat) * 100, 100)}%`, backgroundColor: P.CALORIES }]} />
          </View>
        </View>
      </View>
    </View>
  );
});
NutritionSummaryCard.displayName = 'NutritionSummaryCard';

// ─── 6. Yeti Readiness Score Hero ────────────────────────────────────────────
const YetiReadinessCard = memo(({ score, previousScore }: { score: number; previousScore: number }) => {
  const diff = score - previousScore;
  const isPositive = diff >= 0;

  let readinessLabel = 'Fully Ready';
  let readinessSub = "You're primed to perform!";
  let readinessColor: string = P.ACCENT;
  if (score < 60) {
    readinessLabel = 'Recovery Needed';
    readinessSub = 'Consider an easier session today.';
    readinessColor = P.CALORIES;
  } else if (score < 80) {
    readinessLabel = 'Getting There';
    readinessSub = 'Moderate intensity recommended.';
    readinessColor = P.PROTEIN;
  }

  // Small ring accent sharing the BiometricRing drawing logic at a compact size
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
          <Text style={styles.readinessPercent}>{score}%</Text>
          <Text style={[styles.readinessStatus, { color: readinessColor }]}>{readinessLabel}</Text>
        </View>
        <Text style={styles.readinessSub}>{readinessSub}</Text>

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
  // Matches the reference's exact 4 actions, in order. Scan Food and Progress
  // Check (both real, previously shown here as a 5th/6th tile) are dropped from
  // this grid — they're still one tap away via the Food Diary's own scan button
  // and the bottom tab bar's Progress tab, so nothing becomes unreachable.
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
  readinessScore: number;
  onPressViewAll: () => void;
}) => {
  // Workouts has no real weekly target anywhere in the schema (plan_days is an
  // ordered list of workout days, not a calendar/weekly schedule) — the bar
  // shows calendar-day coverage (workouts / 7) rather than a fabricated target.
  const workoutPct = Math.min(workoutCount / 7, 1);
  const caloriePct = Math.min(weeklyCalories / (targetWeeklyCalories || 1), 1);
  // Recovery reuses the same Yeti Readiness score shown above — there is no
  // separate real weekly recovery metric computed anywhere yet, so this is a
  // mirror of that (still-placeholder) number, not an independent calculation.
  const recoveryPct = Math.min(readinessScore / 100, 1);

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
          <Text style={styles.weeklyStatValue}>{readinessScore}%</Text>
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
  const [waterMl, setWaterMl] = useState(0);
  const [steps, setSteps] = useState(0);
  const [weeklyWorkoutCount, setWeeklyWorkoutCount] = useState(0);
  const [weeklyCalories, setWeeklyCalories] = useState(0);

  const waterGoal = useHydrationStore((s) => s.waterGoal);
  const getWaterForDate = useHydrationStore((s) => s.getWaterForDate);
  const loadHydrationGoal = useHydrationStore((s) => s.loadGoal);

  useEffect(() => {
    sync();
    loadHydrationGoal();
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

      const loggedWater = await getWaterForDate(new Date().toDateString());
      setWaterMl(loggedWater);

      const telemetry = await fetchDailyTelemetry();
      setSteps(telemetry.steps);

      // Weekly Progress: real completed-session count (this calendar week) and
      // a real 7-day trailing calorie sum — no hardcoded weekly numbers.
      const startOfWeek = new Date();
      startOfWeek.setHours(0, 0, 0, 0);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const history = await workoutRepository.getWorkoutHistory(userId);
      const thisWeekSessions = history.filter((s) => (s.finished_at || 0) >= startOfWeek.getTime());
      setWeeklyWorkoutCount(thisWeekSessions.length);

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.getTime();
      });
      const dailyTotals = await Promise.all(
        last7Days.map((dayMs) => nutritionRepository.calculateDailyNutrition(userId, dayMs))
      );
      setWeeklyCalories(dailyTotals.reduce((sum, d) => sum + d.calories, 0));

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
              onPressProfile={() => router.push('/profile')}
              onPressCoach={() => router.push('/coach')}
            />
          </Animated.View>

          {/* 2. Yeti Readiness Score Hero — matches reference order (second, right
              after the header, before Today's Workout) */}
          <Animated.View entering={FadeInDown.duration(400).delay(80)}>
            <YetiReadinessCard score={yetiScore} previousScore={prevYetiScore} />
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

          {/* 4. Nutrition Summary Bar */}
          <Animated.View entering={FadeInDown.duration(400).delay(160)}>
            <NutritionSummaryCard
              calories={consumedMacros.calories}
              targetCalories={targetMacros.calories}
            />
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
              targetWeeklyCalories={targetMacros.calories * 7}
              readinessScore={yetiScore}
              onPressViewAll={() => router.push('/analytics')}
            />
          </Animated.View>

          {/* 7. Daily Progress 4-Ring Widget — not in the reference; kept below
              the reference-matched flow rather than removed (real, wired data). */}
          <Animated.View entering={FadeInDown.duration(400).delay(240)}>
            <DailyProgressWidget
              calories={consumedMacros.calories}
              targetCalories={targetMacros.calories}
              protein={consumedMacros.protein}
              targetProtein={targetMacros.protein}
              waterMl={waterMl}
              targetWaterMl={waterGoal}
              steps={steps}
              targetSteps={10000}
            />
          </Animated.View>

          {/* 8. Hero Motivational Banner — not in the reference; kept as a
              secondary Coach entry point rather than removed. */}
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

  // Quick Actions Grid — icon centered above label, matching the reference's
  // vertical tile layout (not the previous icon-left/label-right row).
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

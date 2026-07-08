import React, { useEffect, useState } from 'react';
import { CalorieRing } from '../components/CalorieRing';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useWorkoutStore } from '../store/useWorkoutStore';
import { useLogStore } from '../store/useLogStore';
import { useFoodStore } from '../store/useFoodStore';
import { useHydrationStore } from '../store/useHydrationStore';
import { useChallengeStore } from '../store/useChallengeStore';
import { useNotificationHistoryStore } from '../store/useNotificationHistoryStore';
import {
  fetchDailyTelemetry,
  requestWearablePermissions,
  HealthTelemetry,
} from '../services/wearableService';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppShell from '../components/AppShell';
import { SkeletonLoader } from '../components/TelemetryComponents';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendLocalNotification } from '../services/notificationService';

// ─── Theme tokens ────────────────────────────────────────────────────────────
const ACCENT = '#39FF6A';           // Primary neon-green — single source of truth
const ACCENT_DIM = 'rgba(57,255,106,0.12)';
const ACCENT_GLOW = 'rgba(57,255,106,0.25)';
const BG = '#0a0d0a';               // Near-black with green tint
const CARD_BG = '#0d120d';          // Dark green-tinted card
const CARD_BORDER = '#1e2a1e';      // Subtle green border
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#8a9e8a';
const TEXT_MUTED = '#4d6b4d';
const BLUE = '#00D4FF';
const AMBER = '#F59E0B';
const RED = '#EF4444';

// Cross-platform glow helper
const glowStyle = (color: string, radius = 16, opacity = 0.35) =>
  Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: {
      elevation: 8,
      // Android can't render coloured shadows, so we mimic via a tinted border
      borderWidth: 1,
      borderColor: color + '55',
    },
    default: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
  }) ?? {};

// ─── Animated progress bar ───────────────────────────────────────────────────
function AnimatedBar({
  pct,
  color,
  delay = 0,
}: {
  pct: number;
  color: string;
  delay?: number;
}) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withDelay(
      delay,
      withTiming(Math.min(pct, 100), {
        duration: 900,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [pct]);

  const style = useAnimatedStyle(() => ({
    width: `${width.value}%` as any,
  }));

  const barGlow =
    Platform.OS === 'ios'
      ? {
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 4,
        }
      : {};

  return (
    <View style={[styles.barBg, { borderColor: color + '22', borderWidth: 1 }]}>
      <Animated.View style={[styles.barFill, { backgroundColor: color }, barGlow, style]} />
    </View>
  );
}

// CalorieRing is now a shared component imported from components/CalorieRing.tsx

// ─── Notification dedup ───────────────────────────────────────────────────────
const notifiedInviteIdsInMemory = new Set<string>();

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const session = useAuthStore((state) => state.session);
  const { workoutPlans, fetchWorkoutPlans, loading: workoutLoading } = useWorkoutStore();
  const { logsHistory, fetchLogsHistory, loading: logsLoading } = useLogStore();
  const { mealLogs, initSync } = useFoodStore();
  const { waterGoal, getWaterForDate, addWaterForDate, loadGoal } = useHydrationStore();
  const { challenges, fetchChallenges } = useChallengeStore();
  const { unreadCount, fetchNotifications } = useNotificationHistoryStore();

  const [profile, setProfile] = useState<any>(null);
  const [telemetry, setTelemetry] = useState<HealthTelemetry | null>(null);
  const [loading, setLoading] = useState(true);
  const [wearablesConnected, setWearablesConnected] = useState(false);
  const [waterLogged, setWaterLogged] = useState(0);
  const [pendingInvite, setPendingInvite] = useState<any | null>(null);
  const router = useRouter();

  // ── Today's date string ──────────────────────────────────────────────────
  const todayStr = new Date().toDateString();

  useEffect(() => {
    if (session?.user?.id) {
      fetchProfile();
      fetchWorkoutPlans(session.user.id);
      fetchLogsHistory(session.user.id);
      fetchPendingInvites();
      initSync();
      loadGoal();
      fetchChallenges();
      fetchNotifications();

      const checkAndSync = async () => {
        const val = await AsyncStorage.getItem('wearables_connected');
        const isConnected = val === 'true';
        setWearablesConnected(isConnected);
        if (isConnected) {
          try {
            const ok = await requestWearablePermissions();
            if (ok) {
              const data = await fetchDailyTelemetry();
              setTelemetry(data);
            }
          } catch (e) {
            console.warn('Wearables sync failed:', e);
          }
        }
      };
      checkAndSync();

      const fetchTodayWater = async () => {
        const amt = await getWaterForDate(todayStr);
        setWaterLogged(amt);
      };
      fetchTodayWater();
    }
  }, [session]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session?.user?.id)
      .single();
    if (data) setProfile(data);
    setLoading(false);
  };

  const fetchPendingInvites = async () => {
    if (!session?.user?.email) return;
    try {
      const { data, error } = await supabase
        .from('client_invites')
        .select('*, coach:profiles!coach_id(full_name)')
        .ilike('email', session.user.email)
        .eq('status', 'pending')
        .limit(1);

      if (error) console.error('fetchPendingInvites query error:', error);

      if (!error && data && data.length > 0) {
        const invite = data[0];

        if (notifiedInviteIdsInMemory.size === 0) {
          const stored = await AsyncStorage.getItem('@dude_notified_invite_ids');
          if (stored) {
            try {
              JSON.parse(stored).forEach((id: string) => notifiedInviteIdsInMemory.add(id));
            } catch (e) {}
          }
        }

        if (!notifiedInviteIdsInMemory.has(invite.id)) {
          notifiedInviteIdsInMemory.add(invite.id);
          const coachName = invite.coach?.full_name || 'A coach';
          sendLocalNotification(
            'Coach Invitation ✉️',
            `Coach ${coachName} has invited you to train with them!`
          );
          await AsyncStorage.setItem(
            '@dude_notified_invite_ids',
            JSON.stringify(Array.from(notifiedInviteIdsInMemory))
          );
        }
        setPendingInvite(invite);
      } else {
        setPendingInvite(null);
      }
    } catch (e) {
      console.error('fetchPendingInvites exception failed:', e);
    }
  };

  const handleAcceptInvite = async () => {
    if (!pendingInvite || !session?.user?.id) return;
    try {
      const { useOfflineSyncStore } = require('../store/useOfflineSyncStore');
      useOfflineSyncStore.getState().enqueueMutation({
        type: 'INSERT_COACH_CLIENT',
        payload: { coach_id: pendingInvite.coach_id, athlete_id: session.user.id },
      });
      useOfflineSyncStore.getState().enqueueMutation({
        type: 'UPDATE_INVITE_STATUS',
        payload: { id: pendingInvite.id, status: 'accepted' },
      });
      setPendingInvite(null);
      setTimeout(() => {
        if (session?.user?.id) fetchWorkoutPlans(session.user.id);
      }, 1000);
      if (Platform.OS === 'web') {
        alert('Welcome onboard!\nCoach connection established successfully.');
      } else {
        Alert.alert('Invitation Accepted', 'Welcome onboard! You are now connected to your coach.');
      }
    } catch (err) {
      console.warn('Accept invite error:', err);
    }
  };

  const handleDeclineInvite = async () => {
    if (!pendingInvite) return;
    try {
      const { useOfflineSyncStore } = require('../store/useOfflineSyncStore');
      useOfflineSyncStore.getState().enqueueMutation({
        type: 'UPDATE_INVITE_STATUS',
        payload: { id: pendingInvite.id, status: 'declined' },
      });
      setPendingInvite(null);
      if (Platform.OS === 'web') {
        alert('Invitation declined.');
      } else {
        Alert.alert('Invite Declined', 'The coach invitation has been declined.');
      }
    } catch (err) {
      console.warn('Decline invite error:', err);
    }
  };

  // ── Nutrition targets ─────────────────────────────────────────────────────
  const getTargets = () => {
    switch (profile?.goal) {
      case 'BUILD_MUSCLE': return { calories: 2700, protein: 180, carbs: 320, fat: 80 };
      case 'LOSE_FAT':     return { calories: 1900, protein: 165, carbs: 180, fat: 55 };
      default:             return { calories: 2300, protein: 145, carbs: 260, fat: 75 };
    }
  };
  const targets = getTargets();

  // ── Streak calculation (unchanged logic) ──────────────────────────────────
  const getCompletedDates = () => {
    const dates = new Set<string>();
    logsHistory.forEach((log: any) => {
      if (log.completed_at) dates.add(log.completed_at.split('T')[0]);
    });
    try {
      const { useOfflineSyncStore } = require('../store/useOfflineSyncStore');
      const outbox = useOfflineSyncStore.getState().outbox;
      outbox.forEach((m: any) => {
        if (m.type === 'INSERT_WORKOUT_SESSION' && m.payload.completed_at)
          dates.add(m.payload.completed_at.split('T')[0]);
      });
    } catch (e) {
      console.warn('Outbox streak fetch failed:', e);
    }
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  };

  const getAssignedDates = () => {
    const assignedDates = new Set<string>();
    if (!workoutPlans || workoutPlans.length === 0) return assignedDates;
    workoutPlans.forEach((planDay: any) => {
      if (!planDay.start_date) return;
      const baseDate = new Date(planDay.start_date);
      const dayOffset = (planDay.day_number || 1) - 1;
      const targetDate = new Date(baseDate);
      targetDate.setDate(baseDate.getDate() + dayOffset);
      assignedDates.add(targetDate.toISOString().split('T')[0]);
    });
    return assignedDates;
  };

  const calculateStreak = () => {
    const completed = getCompletedDates();
    const assigned = getAssignedDates();
    if (completed.length === 0) return 0;
    let streak = 0;
    const current = new Date();
    for (let i = 0; i < 365; i++) {
      const dateStr = current.toISOString().split('T')[0];
      const isAssigned = assigned.has(dateStr);
      const isCompleted = completed.includes(dateStr);
      if (isAssigned) {
        if (isCompleted) {
          streak++;
        } else {
          if (dateStr !== new Date().toISOString().split('T')[0]) break;
        }
      } else {
        if (isCompleted) streak++;
      }
      current.setDate(current.getDate() - 1);
    }
    return streak;
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const streakCount = calculateStreak();
  const todayLogs = mealLogs.filter((l) => l.logged_at >= new Date().setHours(0, 0, 0, 0));

  const totalCals    = Math.round(todayLogs.reduce((a, l) => a + (l.food?.calories || 0) * l.servings, 0));
  const totalProtein = Math.round(todayLogs.reduce((a, l) => a + (l.food?.protein  || 0) * l.servings, 0));
  const totalCarbs   = Math.round(todayLogs.reduce((a, l) => a + (l.food?.carbs    || 0) * l.servings, 0));
  const totalFat     = Math.round(todayLogs.reduce((a, l) => a + (l.food?.fat      || 0) * l.servings, 0));

  const caloriesLeft  = Math.max(targets.calories - totalCals, 0);
  const proteinPct    = Math.min((totalProtein / targets.protein) * 100, 100);
  const carbsPct      = Math.min((totalCarbs   / targets.carbs)   * 100, 100);
  const fatPct        = Math.min((totalFat     / targets.fat)     * 100, 100);
  const stepPct       = Math.min(((telemetry?.steps || 0) / 10000) * 100, 100);
  const waterPct      = Math.min((waterLogged / waterGoal) * 100, 100);

  // Goal label
  const goalLabel =
    profile?.goal === 'BUILD_MUSCLE' ? 'Build muscle'
    : profile?.goal === 'LOSE_FAT'   ? 'Lose fat'
    : 'Maintain';

  // ── Quick-add water ───────────────────────────────────────────────────────
  const handleAddWater = async () => {
    const ML_PER_CUP = 250;
    const newAmt = await addWaterForDate(ML_PER_CUP, todayStr);
    setWaterLogged(newAmt);
  };

  // ── Greeting ──────────────────────────────────────────────────────────────
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = profile?.full_name?.split(' ')[0] || 'Dude';

  // ── Challenge rank ─────────────────────────────────────────────────────────
  const featuredChallenge = challenges?.[0] ?? null;

  // ── Workouts this week ────────────────────────────────────────────────────
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const workoutsThisWeek = (logsHistory ?? []).filter((l: any) => {
    const d = l.completed_at ? new Date(l.completed_at) : null;
    return d && d >= weekStart;
  }).length;

  const todayPlan = (workoutPlans?.[0]?.workout_plan_exercises && workoutPlans[0].workout_plan_exercises.length > 0)
    ? workoutPlans[0]
    : null;

  const isCompletedToday = React.useMemo(() => {
    if (!todayPlan) return false;
    const todayStr = new Date().toDateString();
    
    // Check history
    const inHistory = logsHistory.some((log: any) => {
      if (!log.completed_at || !log.workout_plan_id) return false;
      const completedDate = new Date(log.completed_at).toDateString();
      return log.workout_plan_id === todayPlan.plan_day_id && completedDate === todayStr;
    });
    if (inHistory) return true;

    // Check offline outbox
    try {
      const { useOfflineSyncStore } = require('../store/useOfflineSyncStore');
      const outbox = useOfflineSyncStore.getState().outbox;
      return outbox.some((m: any) => {
        if (m.type === 'INSERT_WORKOUT_SESSION' && m.payload.completed_at && m.payload.plan_day_id) {
          const completedDate = new Date(m.payload.completed_at).toDateString();
          return m.payload.plan_day_id === todayPlan.plan_day_id && completedDate === todayStr;
        }
        return false;
      });
    } catch (e) {
      return false;
    }
  }, [todayPlan, logsHistory]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading || workoutLoading || logsLoading) {
    return (
      <AppShell activeTab="home">
        <SafeAreaView style={{ flex: 1, backgroundColor: BG, paddingHorizontal: 20, paddingTop: 40 }}>
          <SkeletonLoader rows={3} height={140} />
        </SafeAreaView>
      </AppShell>
    );
  }

  return (
    <AppShell activeTab="home">
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
        <Animated.View entering={FadeIn.duration(500)} style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* ═══════════════════════════════════════════════════════════
                1. HEADER
            ═══════════════════════════════════════════════════════════ */}
            <View style={styles.header}>
              <View>
                <Text style={styles.greetingSmall}>{greeting.toUpperCase()}</Text>
                <Text style={styles.greetingName}>{firstName} 💪</Text>
              </View>

              <View style={styles.headerActions}>
                {/* Notification bell */}
                <TouchableOpacity
                  onPress={() => router.push('/notifications')}
                  style={styles.headerBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="notifications-outline" size={20} color={TEXT_PRIMARY} />
                  {unreadCount > 0 && (
                    <View style={styles.notifDot} />
                  )}
                </TouchableOpacity>

                {/* Profile avatar */}
                <TouchableOpacity
                  onPress={() => router.push('/profile')}
                  style={styles.headerBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="person" size={20} color={TEXT_PRIMARY} />
                </TouchableOpacity>
              </View>
            </View>

            {/* ═══════════════════════════════════════════════════════════
                2. STREAK PILL
            ═══════════════════════════════════════════════════════════ */}
            {streakCount > 0 && (
              <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.streakPill}>
                <Text style={styles.streakText}>🔥 {streakCount} day streak</Text>
              </Animated.View>
            )}

            {/* ═══════════════════════════════════════════════════════════
                INVITE BANNER (preserved logic)
            ═══════════════════════════════════════════════════════════ */}
            {pendingInvite && (
              <Animated.View entering={FadeInDown.duration(400)} style={styles.inviteCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Ionicons name="people" size={18} color={ACCENT} />
                  <Text style={[styles.labelCaps, { color: ACCENT }]}>COACH INVITATION</Text>
                </View>
                <Text style={{ color: TEXT_PRIMARY, fontSize: 13, lineHeight: 19, marginBottom: 12 }}>
                  Coach{' '}
                  <Text style={{ color: ACCENT, fontWeight: '700' }}>
                    {pendingInvite.coach?.full_name || 'Coach'}
                  </Text>{' '}
                  has invited you to train with them. Accept to share logs and receive training plans.
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={handleAcceptInvite}
                    style={[styles.inviteAccept, glowStyle(ACCENT, 10, 0.3)]}
                  >
                    <Text style={styles.inviteAcceptText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDeclineInvite} style={styles.inviteDecline}>
                    <Text style={styles.inviteDeclineText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            {/* ═══════════════════════════════════════════════════════════
                3. NUTRITION OVERVIEW CARD
            ═══════════════════════════════════════════════════════════ */}
            <Animated.View
              entering={FadeInDown.delay(150).duration(500)}
              style={[styles.nutritionCard, glowStyle(ACCENT, 20, 0.18)]}
            >
              {/* Card header row */}
              <View style={styles.cardHeaderRow}>
                <Text style={styles.labelCaps}>NUTRITION OVERVIEW</Text>
                <View style={styles.goalPill}>
                  <Text style={styles.goalPillText}>{goalLabel}</Text>
                </View>
              </View>

              {/* Ring + Macros row */}
              <View style={styles.ringMacroRow}>
                {/* Calorie ring */}
                <View style={{ alignItems: 'center' }}>
                  <CalorieRing remaining={caloriesLeft} total={targets.calories} />
                  <Text style={styles.consumedText}>
                    {totalCals} / {targets.calories} consumed
                  </Text>
                </View>

                {/* Macro bars */}
                <View style={styles.macroBarsCol}>
                  {/* Protein */}
                  <View style={styles.macroRow}>
                    <View style={styles.macroLabelRow}>
                      <Text style={[styles.macroName, { color: ACCENT }]}>PROTEIN</Text>
                      <Text style={styles.macroAmt}>{totalProtein}g / {targets.protein}g</Text>
                    </View>
                    <AnimatedBar pct={proteinPct} color={ACCENT} delay={200} />
                  </View>

                  {/* Carbs */}
                  <View style={styles.macroRow}>
                    <View style={styles.macroLabelRow}>
                      <Text style={[styles.macroName, { color: BLUE }]}>CARBS</Text>
                      <Text style={styles.macroAmt}>{totalCarbs}g / {targets.carbs}g</Text>
                    </View>
                    <AnimatedBar pct={carbsPct} color={BLUE} delay={300} />
                  </View>

                  {/* Fat */}
                  <View style={styles.macroRow}>
                    <View style={styles.macroLabelRow}>
                      <Text style={[styles.macroName, { color: AMBER }]}>FAT</Text>
                      <Text style={styles.macroAmt}>{totalFat}g / {targets.fat}g</Text>
                    </View>
                    <AnimatedBar pct={fatPct} color={AMBER} delay={400} />
                  </View>
                </View>
              </View>

              {/* Water intake row */}
              <View style={styles.waterRow}>
                <Ionicons name="water" size={16} color={BLUE} />
                <Text style={styles.waterLabel}>Water</Text>
                <Text style={styles.waterAmt}>
                  {Math.round(waterLogged / 250)} / {Math.round(waterGoal / 250)} cups
                </Text>
                <View style={styles.waterBarWrap}>
                  <AnimatedBar pct={waterPct} color={BLUE} delay={500} />
                </View>
                <TouchableOpacity onPress={handleAddWater} style={styles.waterAddBtn} activeOpacity={0.7}>
                  <Ionicons name="add" size={14} color={BLUE} />
                </TouchableOpacity>
              </View>

              {/* Log calories CTA */}
              <TouchableOpacity
                onPress={() => router.push('/food-diary')}
                style={styles.logCalBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.logCalText}>+ Log Calories</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* ═══════════════════════════════════════════════════════════
                4. ASSIGNED WORKOUT CARD
            ═══════════════════════════════════════════════════════════ */}
            <Animated.View
              entering={FadeInDown.delay(250).duration(500)}
              style={styles.workoutCard}
            >
              <View style={styles.workoutLabelRow}>
                <Ionicons name="barbell-outline" size={15} color={AMBER} />
                <Text style={[styles.labelCaps, { color: AMBER }]}>ASSIGNED WORKOUT</Text>
              </View>

              {todayPlan ? (
                <>
                  <Text style={styles.workoutName}>
                    {todayPlan.name} {isCompletedToday ? '✓' : ''}
                  </Text>
                  <Text style={styles.workoutMeta}>
                    {isCompletedToday 
                      ? 'Completed today! Great job! 🎉'
                      : `${todayPlan.workout_plan_exercises?.length || 0} exercises · assigned by coach`}
                  </Text>

                  {isCompletedToday ? (
                    <TouchableOpacity
                      onPress={() => router.push(`/workouts/${todayPlan.id}`)}
                      style={[
                        styles.startBtn,
                        { backgroundColor: '#0a140d', borderColor: '#1b4d22', borderWidth: 1 },
                        Platform.OS !== 'android' ? { shadowOpacity: 0 } : {}
                      ]}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.startBtnText, { color: ACCENT }]}>Completed ✓</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => router.push(`/workouts/${todayPlan.id}`)}
                      style={[styles.startBtn, glowStyle(ACCENT, 18, 0.45)]}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.startBtnText}>Start Workout →</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.workoutName}>Rest Day 🌿</Text>
                  <Text style={styles.workoutMeta}>
                    No plan assigned today. Focus on hydration and recovery.
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push('/workouts')}
                    style={[styles.startBtn, { backgroundColor: ACCENT_DIM }, glowStyle(ACCENT, 10, 0.2)]}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.startBtnText, { color: ACCENT }]}>Browse Routines →</Text>
                  </TouchableOpacity>
                </>
              )}
            </Animated.View>

            {/* ═══════════════════════════════════════════════════════════
                5. TODAY'S METRICS (2×2 grid)
            ═══════════════════════════════════════════════════════════ */}
            <Animated.View entering={FadeInDown.delay(350).duration(500)}>
              <Text style={[styles.labelCaps, { marginBottom: 12 }]}>TODAY'S METRICS</Text>
              <View style={styles.metricsGrid}>
                {/* Steps */}
                <View style={styles.metricTile}>
                  <View style={styles.metricIconWrap}>
                    <Ionicons name="footsteps-outline" size={18} color={ACCENT} />
                  </View>
                  {wearablesConnected ? (
                    <>
                      <Text style={[styles.metricValue, { color: ACCENT }]}>
                        {(telemetry?.steps || 0).toLocaleString()}
                      </Text>
                      <Text style={styles.metricLabel}>Steps today</Text>
                      <AnimatedBar pct={stepPct} color={ACCENT} delay={400} />
                    </>
                  ) : (
                    <TouchableOpacity onPress={() => router.push('/profile')}>
                      <Text style={styles.metricValue}>—</Text>
                      <Text style={[styles.metricLabel, { color: ACCENT, textDecorationLine: 'underline' }]}>
                        Connect device
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Heart rate */}
                <View style={styles.metricTile}>
                  <View style={[styles.metricIconWrap, { backgroundColor: RED + '18' }]}>
                    <Ionicons name="heart-outline" size={18} color={RED} />
                  </View>
                  {wearablesConnected ? (
                    <>
                      <Text style={[styles.metricValue, { color: RED }]}>
                        {telemetry?.restingHeartRate || 62}
                        <Text style={{ fontSize: 12, color: TEXT_SECONDARY, fontWeight: '500' }}> bpm</Text>
                      </Text>
                      <Text style={styles.metricLabel}>Resting HR</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
                        <Ionicons name="trending-down" size={11} color="#10B981" />
                        <Text style={{ fontSize: 9, color: '#10B981', fontWeight: '700' }}>Healthy</Text>
                      </View>
                    </>
                  ) : (
                    <TouchableOpacity onPress={() => router.push('/profile')}>
                      <Text style={styles.metricValue}>—</Text>
                      <Text style={[styles.metricLabel, { color: ACCENT, textDecorationLine: 'underline' }]}>
                        Connect device
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Workouts this week */}
                <View style={styles.metricTile}>
                  <View style={[styles.metricIconWrap, { backgroundColor: AMBER + '18' }]}>
                    <Ionicons name="barbell-outline" size={18} color={AMBER} />
                  </View>
                  <Text style={[styles.metricValue, { color: AMBER }]}>
                    {workoutsThisWeek}
                    <Text style={{ fontSize: 12, color: TEXT_SECONDARY, fontWeight: '500' }}> / 5</Text>
                  </Text>
                  <Text style={styles.metricLabel}>Workouts this week</Text>
                </View>

                {/* Challenge rank */}
                <View style={styles.metricTile}>
                  <View style={[styles.metricIconWrap, { backgroundColor: '#FFD70018' }]}>
                    <Ionicons name="trophy-outline" size={18} color="#FFD700" />
                  </View>
                  {featuredChallenge ? (
                    <TouchableOpacity onPress={() => router.push(`/challenges/${featuredChallenge.id}`)}>
                      <Text style={[styles.metricValue, { color: '#FFD700' }]}>#7</Text>
                      <Text style={styles.metricLabel}>
                        {(featuredChallenge.name ?? '').length > 16
                          ? (featuredChallenge.name ?? '').slice(0, 16) + '…'
                          : (featuredChallenge.name ?? 'Challenge')}
                      </Text>
                      <Text style={{ fontSize: 9, color: TEXT_MUTED, fontWeight: '700', marginTop: 2 }}>
                        {featuredChallenge.participant_count} athletes
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => router.push('/challenges')}>
                      <Text style={styles.metricValue}>—</Text>
                      <Text style={[styles.metricLabel, { color: ACCENT, textDecorationLine: 'underline' }]}>
                        Join a challenge
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </Animated.View>

            {/* Bottom padding for tab bar */}
            <View style={{ height: 110 }} />
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </AppShell>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 16 : 24,
    paddingBottom: 20,
    backgroundColor: BG,
  },

  // ── Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greetingSmall: {
    fontSize: 10,
    fontWeight: '700',
    color: TEXT_MUTED,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  greetingName: {
    fontSize: 28,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
    borderWidth: 1.5,
    borderColor: CARD_BG,
    // Small glow on iOS
    ...Platform.select({
      ios: {
        shadowColor: ACCENT,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 4,
      },
    }),
  },

  // ── Streak pill
  streakPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(57,255,106,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 16,
  },
  streakText: {
    fontSize: 11,
    fontWeight: '700',
    color: ACCENT,
    letterSpacing: 0.3,
  },

  // ── Invite card
  inviteCard: {
    backgroundColor: 'rgba(57,255,106,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(57,255,106,0.25)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  inviteAccept: {
    flex: 1,
    backgroundColor: ACCENT,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  inviteAcceptText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inviteDecline: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  inviteDeclineText: {
    color: TEXT_SECONDARY,
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
  },

  // ── Shared label
  labelCaps: {
    fontSize: 10,
    fontWeight: '800',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },

  // ── Nutrition card
  nutritionCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    // Extra coloured border on Android for glow effect
    ...Platform.select({
      android: {
        borderColor: 'rgba(57,255,106,0.22)',
        elevation: 12,
      },
    }),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalPill: {
    backgroundColor: ACCENT_DIM,
    borderWidth: 1,
    borderColor: ACCENT_GLOW,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  goalPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: ACCENT,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Ring + macros side by side
  ringMacroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginBottom: 16,
  },
  consumedText: {
    fontSize: 9,
    color: TEXT_MUTED,
    marginTop: 6,
    fontWeight: '600',
  },
  macroBarsCol: {
    flex: 1,
    gap: 12,
  },
  macroRow: {
    gap: 5,
  },
  macroLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroName: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  macroAmt: {
    fontSize: 9,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },

  // Progress bars
  barBg: {
    height: 5,
    backgroundColor: '#111c11',
    borderRadius: 99,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 99,
  },

  // Water row
  waterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: CARD_BORDER,
    paddingTop: 14,
    marginBottom: 14,
  },
  waterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_SECONDARY,
  },
  waterAmt: {
    fontSize: 11,
    fontWeight: '600',
    color: BLUE,
  },
  waterBarWrap: {
    flex: 1,
  },
  waterAddBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: BLUE + '18',
    borderWidth: 1,
    borderColor: BLUE + '44',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Log calories button
  logCalBtn: {
    backgroundColor: ACCENT_DIM,
    borderWidth: 1,
    borderColor: ACCENT_GLOW,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  logCalText: {
    fontSize: 12,
    fontWeight: '800',
    color: ACCENT,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // ── Workout card
  workoutCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
  },
  workoutLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  workoutName: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  workoutMeta: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginBottom: 16,
  },
  startBtn: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    // Coloured glow border for Android (since elevation is monochrome)
    ...Platform.select({
      android: {
        borderWidth: 2,
        borderColor: ACCENT + '88',
        elevation: 10,
      },
    }),
  },
  startBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 0.3,
  },

  // ── Metrics grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricTile: {
    width: '47.5%',
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  metricIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: ACCENT + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 26,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
});

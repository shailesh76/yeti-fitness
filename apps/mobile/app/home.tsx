import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import { Q } from '@nozbe/watermelondb';
import { useRepositories } from '../hooks/useRepositories';
import { EVENTS } from '../constants/analyticsEvents';
import { useAuthStore } from '../store/useAuthStore';
import { HealthScoreEngine } from '@yeti/training-engine';
import { useSyncManager } from '../hooks/useSyncManager';
import { Workout, WorkoutSession } from '@yeti/database';
import AppShell from '../components/AppShell';
import { database, isNativeDbAvailable } from '../database';

const { width } = Dimensions.get('window');
const ACCENT = '#39FF6A';
const BG = '#0a0d0a';
const CARD_BG = '#0d120d';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#8a9e8a';

// ─── Score Component ────────────────────────────────────────────────────────
const YetiScoreCard = ({ score, previousScore }: { score: number, previousScore: number }) => {
  const animatedScore = useSharedValue(0);
  
  useEffect(() => {
    animatedScore.value = withTiming(score, { duration: 1500 });
  }, [score]);

  const diff = score - previousScore;

  return (
    <View style={[styles.card, { alignItems: 'center', paddingVertical: 32 }]}>
      <Text style={styles.cardTitle}>YETI SCORE</Text>
      <Text style={styles.yetiScoreText}>{score}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
        <Ionicons name={diff >= 0 ? "arrow-up" : "arrow-down"} size={16} color={diff >= 0 ? ACCENT : '#ff4444'} />
        <Text style={{ color: diff >= 0 ? ACCENT : '#ff4444', fontWeight: 'bold' }}>
          {diff >= 0 ? '+' : ''}{diff} points from last week
        </Text>
      </View>
    </View>
  );
};

// ─── Chart Component ────────────────────────────────────────────────────────
const WeightTrendChart = ({ logs }: { logs: any[] }) => {
  if (logs.length < 2) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>WEIGHT TREND (30D)</Text>
        <View style={{ height: 100, justifyContent: 'center', alignItems: 'center', marginTop: 16 }}>
          <Ionicons name="analytics-outline" size={28} color={TEXT_SECONDARY} style={{ marginBottom: 8 }} />
          <Text style={{ color: TEXT_SECONDARY, fontSize: 13, textAlign: 'center', paddingHorizontal: 16 }}>
            Log weight on at least 2 days in the progress tracker to view your trend.
          </Text>
        </View>
      </View>
    );
  }

  // Skia (CanvasKit/WASM) is not reliably available on web — render a graceful
  // fallback instead of crashing when the native canvas is unavailable.
  if (Platform.OS === 'web') {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>WEIGHT TREND (30D)</Text>
        <View style={{ height: 100, justifyContent: 'center', alignItems: 'center', marginTop: 16 }}>
          <Ionicons name="phone-portrait-outline" size={26} color={TEXT_SECONDARY} style={{ marginBottom: 8 }} />
          <Text style={{ color: TEXT_SECONDARY, fontSize: 12, textAlign: 'center', paddingHorizontal: 16 }}>
            Trend charts are available in the Yeti mobile app.
          </Text>
        </View>
      </View>
    );
  }

  const chartH = 80;
  const chartW = width - 80; // card padding accounts for width
  const weights = logs.map(l => l.weight_kg);
  const minW = Math.min(...weights) - 0.5;
  const maxW = Math.max(...weights) + 0.5;
  const wRange = maxW - minW || 1;

  const path = Skia.Path.Make();
  logs.forEach((log, i) => {
    const x = (i / (logs.length - 1)) * chartW;
    const y = chartH - ((log.weight_kg - minW) / wRange) * chartH;
    if (i === 0) {
      path.moveTo(x, y);
    } else {
      path.lineTo(x, y);
    }
  });

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>WEIGHT TREND (30D)</Text>
      <View style={{ height: 100, marginTop: 16 }}>
        <Canvas style={{ flex: 1 }}>
          <Path path={path} color={ACCENT} style="stroke" strokeWidth={3} strokeCap="round" strokeJoin="round" />
        </Canvas>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <Text style={{ color: TEXT_SECONDARY, fontSize: 10 }}>
          {new Date(logs[0].logged_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </Text>
        <Text style={{ color: TEXT_SECONDARY, fontSize: 10 }}>
          {new Date(logs[logs.length - 1].logged_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </Text>
      </View>
    </View>
  );
};

// ─── Macro Component ────────────────────────────────────────────────────────
const MacroProgressCard = ({ consumed, target }: { consumed: any, target: any }) => {
  const cCalories = consumed.calories || 0;
  const tCalories = target.calories || 2000;
  
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={styles.cardTitle}>TODAY&apos;S NUTRITION</Text>
        <Text style={{ color: ACCENT, fontSize: 12, fontWeight: 'bold' }}>
          {cCalories} / {tCalories} kcal
        </Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#00D4FF', fontWeight: 'bold', fontSize: 16 }}>
            {consumed.protein || 0}g / {target.protein || 150}g
          </Text>
          <Text style={{ color: TEXT_SECONDARY, fontSize: 11, marginTop: 2 }}>Protein</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#F59E0B', fontWeight: 'bold', fontSize: 16 }}>
            {consumed.carbs || 0}g / {target.carbs || 220}g
          </Text>
          <Text style={{ color: TEXT_SECONDARY, fontSize: 11, marginTop: 2 }}>Carbs</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 16 }}>
            {consumed.fat || 0}g / {target.fat || 65}g
          </Text>
          <Text style={{ color: TEXT_SECONDARY, fontSize: 11, marginTop: 2 }}>Fats</Text>
        </View>
      </View>
    </View>
  );
};

// ─── Main HomeScreen Component ──────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;
  const { sync } = useSyncManager();

  const { progressRepository, nutritionRepository, workoutRepository, userRepository, eventRepository } = useRepositories();

  const [loading, setLoading] = useState(true);
  const [yetiScore, setYetiScore] = useState(80);
  const [prevYetiScore, setPrevYetiScore] = useState(75);
  const [weightLogs, setWeightLogs] = useState<any[]>([]);
  const [consumedMacros, setConsumedMacros] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [targetMacros, setTargetMacros] = useState({ calories: 2000, protein: 150, carbs: 220, fat: 65 });
  const [todayWorkout, setTodayWorkout] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Sync database on load
  useEffect(() => {
    sync();
  }, []);

  const loadData = async () => {
    if (!userId) return;
    try {
      // 0. Log app opened event
      await eventRepository.logActivity(userId, EVENTS.APP_OPENED);

      // 1. Load targets from profile
      const profile = await userRepository.getProfile(userId);
      if (profile) {
        setTargetMacros({
          calories: profile.target_calories || 2000,
          protein: profile.target_protein || 150,
          carbs: profile.target_carbs || 220,
          fat: profile.target_fat || 65
        });
      }

      // 2. Load today's macros
      const todayMacros = await nutritionRepository.calculateDailyNutrition(userId, Date.now());
      setConsumedMacros(todayMacros);

      // 3. Load 30D Weight history
      const weightTrendData = await progressRepository.getWeightTrend(userId, 30);
      const filteredWeights = weightTrendData
        .filter((m: any) => m.weight_kg !== undefined && m.weight_kg !== null)
        .map((m: any) => ({
          weight_kg: m.weight_kg,
          logged_at: m.logged_at
        }));
      setWeightLogs(filteredWeights);

      // 4 & 5. Active/scheduled workout session + Yeti score (last 14 days).
      // Local WatermelonDB is unavailable on web — skip this section there and
      // keep whatever score/workout state is already showing, rather than
      // throwing (this used to reach into progressRepository's private `db`
      // field via bracket access, bypassing the repository's own guards).
      if (isNativeDbAvailable && database) {
        const activeSessions = (await database.get('workout_sessions')
          .query(Q.where('status', 'active'))
          .fetch()) as WorkoutSession[];

        if (activeSessions.length > 0) {
          setTodayWorkout(`Resume: ${activeSessions[0].name}`);
          setActiveSessionId(activeSessions[0].id);
        } else {
          const templates = (await workoutRepository.getWorkouts()) as Workout[];
          if (templates.length > 0) {
            setTodayWorkout(`Up Next: ${templates[0].name}`);
            setActiveSessionId(null);
          } else {
            setTodayWorkout(null);
            setActiveSessionId(null);
          }
        }

        const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

        // Helper query for 14 day completions
        const workoutsCompleted = await database.get('workout_sessions')
          .query(
            Q.where('user_id', userId),
            Q.where('status', 'completed'),
            Q.where('finished_at', Q.gte(fourteenDaysAgo))
          ).fetchCount();

        const mealsLogged = await database.get('meal_logs')
          .query(
            Q.where('athlete_id', userId),
            Q.where('logged_at', Q.gte(fourteenDaysAgo))
          ).fetchCount();

        const checkInsCompleted = await database.get('check_ins')
          .query(
            Q.where('athlete_id', userId),
            Q.where('created_at', Q.gte(fourteenDaysAgo))
          ).fetchCount();

        const aiInteractions = await database.get('ai_messages')
          .query(
            Q.where('role', 'user'),
            Q.where('created_at', Q.gte(fourteenDaysAgo))
          ).fetchCount();

        // Check activity days (any log in last 14 days counts as an active day)
        const daysActive = Math.min(
          14,
          Math.max(2, workoutsCompleted + Math.min(mealsLogged, 7) + checkInsCompleted + Math.min(aiInteractions, 3))
        );

        const lastSessions = await workoutRepository.getWorkoutHistory(userId);
        const daysSinceLastWorkout = lastSessions.length > 0 && lastSessions[0].finished_at
          ? Math.floor((Date.now() - lastSessions[0].finished_at) / (24 * 60 * 60 * 1000))
          : 14;

        const currentScoreResult = HealthScoreEngine.calculate({
          workoutsCompleted,
          workoutsAssigned: 8, // Standard baseline of 4 workouts per week over 14 days
          mealsLogged,
          aiInteractions,
          checkInsCompleted,
          daysActive,
          daysSinceLastWorkout
        });

        // Calculate last week's score for differential
        const workoutsCompletedPrev = await database.get('workout_sessions')
          .query(
            Q.where('user_id', userId),
            Q.where('status', 'completed'),
            Q.where('finished_at', Q.between(fourteenDaysAgo, weekAgo))
          ).fetchCount();

        const mealsLoggedPrev = await database.get('meal_logs')
          .query(
            Q.where('athlete_id', userId),
            Q.where('logged_at', Q.between(fourteenDaysAgo, weekAgo))
          ).fetchCount();

        const checkInsCompletedPrev = await database.get('check_ins')
          .query(
            Q.where('athlete_id', userId),
            Q.where('created_at', Q.between(fourteenDaysAgo, weekAgo))
          ).fetchCount();

        const aiInteractionsPrev = await database.get('ai_messages')
          .query(
            Q.where('role', 'user'),
            Q.where('created_at', Q.between(fourteenDaysAgo, weekAgo))
          ).fetchCount();

        const prevScoreResult = HealthScoreEngine.calculate({
          workoutsCompleted: workoutsCompletedPrev,
          workoutsAssigned: 4,
          mealsLogged: mealsLoggedPrev,
          aiInteractions: aiInteractionsPrev,
          checkInsCompleted: checkInsCompletedPrev,
          daysActive: Math.min(7, daysActive / 2),
          daysSinceLastWorkout: daysSinceLastWorkout + 7
        });

        setYetiScore(currentScoreResult.score);
        setPrevYetiScore(prevScoreResult.score);
      }

    } catch (e) {
      console.warn("Failed to load local analytics:", e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [userId])
  );

  if (loading) {
    return (
      <AppShell activeTab="home">
        <View style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell activeTab="home">
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingSmall}>GOOD MORNING</Text>
            <Text style={styles.greetingName}>Athlete 💪</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <TouchableOpacity onPress={() => router.push('/coach')}>
              <Ionicons name="sparkles" size={28} color={ACCENT} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/profile')}>
              <Ionicons name="person-circle" size={32} color={TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>
        </View>

        <Animated.View entering={FadeInDown.duration(400).delay(50)}>
          <YetiScoreCard score={yetiScore} previousScore={prevYetiScore} />
        </Animated.View>

        {todayWorkout && (
          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>TODAY&apos;S WORKOUT</Text>
              <Text style={{ color: TEXT_PRIMARY, fontSize: 20, fontWeight: 'bold', marginTop: 8 }}>
                {todayWorkout}
              </Text>
              <TouchableOpacity 
                style={styles.startBtn} 
                onPress={() => router.push(activeSessionId ? '/workouts/session' : '/workouts')}
              >
                <Text style={styles.startBtnText}>
                  {activeSessionId ? 'Resume Session' : 'View Workouts'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <MacroProgressCard consumed={consumedMacros} target={targetMacros} />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(300)}>
          <WeightTrendChart logs={weightLogs} />
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  container: { padding: 20, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greetingSmall: { color: TEXT_SECONDARY, fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  greetingName: { color: TEXT_PRIMARY, fontSize: 28, fontWeight: '900' },
  card: { backgroundColor: CARD_BG, padding: 20, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#1e2a1e' },
  cardTitle: { color: TEXT_SECONDARY, fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  yetiScoreText: { color: TEXT_PRIMARY, fontSize: 64, fontWeight: '900', marginTop: 12 },
  startBtn: { backgroundColor: ACCENT, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  startBtnText: { color: BG, fontWeight: 'bold', fontSize: 16 }
});

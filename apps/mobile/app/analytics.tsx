/**
 * analytics.tsx — Progress screen
 * Matches the Progress reference layout (Yeti Score, Weight Trend, Body
 * Composition, Strength, Consistency) but driven by REAL data:
 *   - Weight trend + body fat come from logged measurements (ProgressRepository)
 *   - Body weight logging modal with immediate local UI update and persistence
 *   - BMI is computed from real weight + profile height
 *   - Strength = the athlete's real personal records
 *   - Consistency + streak + the activity-based Yeti Score come from real
 *     completed-workout history
 *   - Nutrition averages come from real meal logs
 *
 * Data honesty: measurements/workouts/PRs are stored in the local (native)
 * database and synced with Supabase.
 */
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';

import AppShell from '../components/AppShell';
import { useAuthStore } from '../store/useAuthStore';
import { useFoodStore } from '../store/useFoodStore';
import { useLogStore } from '../store/useLogStore';
import { useRepositories } from '../hooks/useRepositories';
import { applyNutritionTargetsLocal, syncProfileNutritionTargets } from '../services/nutritionTargets';
import { calculateNutritionTargets } from '../services/nutritionUtils';
import { useUserStore } from '../store/useUserStore';
import { markLocalProfileWrite } from '../services/profileRealtime';
import { patchHomeSnapshot } from '../services/homeSummary';
import { P, glowStyle } from '../constants/premiumTheme';
import { dedupeScreenRefresh, getScreenData, hydrateScreenData, invalidateScreenData, isScreenDataStale, persistScreenData, subscribeScreenData } from '../services/screenDataCache';
import { createScreenPerfTrace } from '../services/screenPerf';
import { currentPersonalRecords } from '../services/personalRecordPresentation';
import { canonicalExerciseName } from '@yeti/database/src/repositories/ExerciseRepository';
import { buildTrendLinePath, calculateTrendPoints } from '../services/progressChart';

const MASCOT = require('../assets/yeti_2d_mascot_exact.png');

type TabKey = 'overview' | 'workout' | 'nutrition' | 'body' | 'strength';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'workout', label: 'Workout' },
  { key: 'nutrition', label: 'Nutrition' },
  { key: 'body', label: 'Body' },
  { key: 'strength', label: 'Strength' },
];

const RANGE_DAYS: Record<string, number> = { '7D': 7, '30D': 30, '90D': 90, '6M': 180 };

function RingArc({
  size,
  strokeWidth,
  percent,
  color,
  label,
  value,
  change,
  changeUp,
  tracked = true,
}: {
  size: number;
  strokeWidth: number;
  percent: number;
  color: string;
  label: string;
  value: string;
  change?: string;
  changeUp?: boolean;
  tracked?: boolean;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(Math.max(percent, 0), 100) / 100) * circ;
  return (
    <View style={{ alignItems: 'center', width: size + 6 }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.07)" strokeWidth={strokeWidth} fill="none" />
        {tracked && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={circ * 0.25}
            strokeLinecap="round"
          />
        )}
        <SvgText x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize="13" fontWeight="800" fill={tracked ? '#FFFFFF' : '#475569'}>
          {value}
        </SvgText>
      </Svg>
      <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600', marginTop: 6 }}>{label}</Text>
      {change ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
          <Ionicons name={changeUp ? 'arrow-up' : 'arrow-down'} size={10} color={changeUp ? '#22C55E' : '#EF4444'} />
          <Text style={{ fontSize: 10, fontWeight: '700', color: changeUp ? '#22C55E' : '#EF4444', marginLeft: 1 }}>{change}</Text>
        </View>
      ) : (
        <Text style={{ fontSize: 10, color: '#64748B', marginTop: 3 }}>{tracked ? '—' : 'Not tracked'}</Text>
      )}
    </View>
  );
}

// ─── Main screen ────────────────────────────────────────────────────────────
export default function AnalyticsScreen() {
  const perf = useRef(createScreenPerfTrace('progress')).current;
  perf('T0 route render');
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;
  const chartW = Math.min(windowWidth - 72, 520);

  const userId = useAuthStore((s) => s.session?.user?.id);
  const mealLogs = useFoodStore((s) => s.mealLogs);
  const prs = useLogStore((s) => s.prs);
  const history = useLogStore((s) => s.logsHistory);
  const fetchPRs = useLogStore((s) => s.fetchPRs);
  const fetchLogsHistory = useLogStore((s) => s.fetchLogsHistory);
  const { progressRepository, userRepository } = useRepositories();

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const tabsRef = useRef<ScrollView>(null);
  const [dateRange, setDateRange] = useState<'7D' | '30D' | '90D' | '6M'>('30D');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const progressKey = userId ? `progress:${userId}` : 'progress:anonymous';
  const cachedProgress = getScreenData<{ measurements: any[]; profile: any }>(progressKey);
  const [measurements, setMeasurements] = useState<any[]>(cachedProgress?.measurements ?? []);
  const [profile, setProfile] = useState<any>(cachedProgress?.profile ?? null);

  // ── Weight Logging Modal State ───────────────────────────────────────────
  const [showLogModal, setShowLogModal] = useState(false);
  const [inputWeight, setInputWeight] = useState('');
  const [inputUnit, setInputUnit] = useState<'kg' | 'lbs'>('kg');
  const [inputBodyFat, setInputBodyFat] = useState('');
  const [savingWeight, setSavingWeight] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!userId) return;
    return dedupeScreenRefresh(progressKey, async () => {
    perf('T3 remote start');
    void fetchPRs(userId);
    void fetchLogsHistory(userId);
    try {
      const [ms, prof] = await Promise.all([
        progressRepository.getMeasurements(userId),
        userRepository.getProfile(userId),
      ]);
      perf('T2 local DB/storage read');
      perf('T4 remote response');
      setMeasurements(ms || []);
      setProfile(prof || null);
      await persistScreenData(progressKey, { measurements: ms || [], profile: prof || null });
      perf('T5 state reconciliation');
      perf('T6 visible authoritative UI');
    } catch {
      /* Safe fallback */
    }
    });
  }, [userId, fetchPRs, fetchLogsHistory, progressRepository, userRepository]);

  useFocusEffect(
    useCallback(() => {
      if (!cachedProgress || isScreenDataStale(progressKey)) void loadData();
    }, [loadData])
  );

  useEffect(() => {
    if (!userId || cachedProgress) return;
    void hydrateScreenData<{ measurements: any[]; profile: any }>(progressKey).then((cached) => {
      perf('T1 local cache read');
      if (!cached) return;
      setMeasurements(cached.measurements);
      setProfile(cached.profile);
    });
  }, [userId, progressKey]);

  useEffect(() => subscribeScreenData<{ measurements: any[]; profile: any }>(progressKey, (next) => {
    if (!next) return;
    setMeasurements(next.measurements);
    setProfile(next.profile);
  }), [progressKey]);

  // ── Weight trend (real measurements within the selected range) ──────────────
  const nowMs = typeof window !== 'undefined' ? Date.now() : 0;
  const weightSeries = useMemo(() => {
    const days = RANGE_DAYS[dateRange];
    const cutoff = (nowMs || Date.now()) - days * 864e5;
    return (measurements || [])
      .filter((m) => m.weight_kg != null && !isNaN(m.weight_kg) && m.logged_at >= cutoff)
      .sort((a, b) => a.logged_at - b.logged_at)
      .map((m) => ({
        kg: Number(m.weight_kg),
        label: new Date(m.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      }));
  }, [measurements, dateRange]);

  const weightPoints = useMemo(
    () => calculateTrendPoints(weightSeries.map((d) => d.kg), chartW, 120, 8, 10),
    [weightSeries, chartW]
  );
  const weightPath = useMemo(() => buildTrendLinePath(weightPoints), [weightPoints]);
  const weightArea = useMemo(
    () => (weightPoints.length >= 2 ? weightPath + ` L ${chartW - 8},120 L 8,120 Z` : ''),
    [weightPath, weightPoints.length, chartW]
  );

  // Most recent weight value
  const currentWeight = useMemo(() => {
    if (measurements && measurements.length > 0) {
      const latestValid = measurements.find((m) => m.weight_kg != null && !isNaN(m.weight_kg));
      if (latestValid) return Number(latestValid.weight_kg);
    }
    if (weightSeries.length > 0) {
      return weightSeries[weightSeries.length - 1].kg;
    }
    return profile?.weight_kg ? Number(profile.weight_kg) : null;
  }, [measurements, weightSeries, profile]);

  const weightDelta = weightSeries.length >= 2 ? currentWeight! - weightSeries[0].kg : null;

  // ── Body composition (real: body fat + BMI; muscle/water not tracked) ───────
  const latest = measurements[0]; // getMeasurements returns newest-first
  const bodyFat = latest?.body_fat_pct ? Number(latest.body_fat_pct) : null;
  const bmi = useMemo(() => {
    const w = currentWeight ?? (latest?.weight_kg ? Number(latest.weight_kg) : null) ?? (profile?.weight_kg ? Number(profile.weight_kg) : null);
    const h = profile?.height_cm ? Number(profile.height_cm) : null;
    if (!w || !h) return null;
    const m = h / 100;
    return w / (m * m);
  }, [currentWeight, latest, profile]);

  // ── Consistency + streak + Yeti Score (real completed workouts) ─────────────
  const workoutDays = useMemo(() => {
    const set = new Set<string>();
    (history || []).forEach((h) => {
      if (h.completed_at) set.add(new Date(h.completed_at).toDateString());
    });
    return set;
  }, [history]);

  const weekDays = useMemo(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // Monday of this week
    const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    return labels.map((label, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const isFuture = d > today;
      return { label, done: workoutDays.has(d.toDateString()), future: isFuture };
    });
  }, [workoutDays]);

  const workoutsThisWeek = weekDays.filter((d) => d.done).length;

  const streak = useMemo(() => {
    let n = 0;
    for (let i = 0; i < 90; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      if (workoutDays.has(d.toDateString())) n += 1;
      else if (i === 0) continue;
      else break;
    }
    return n;
  }, [workoutDays]);

  // Activity-based score from real recent training (last 14 days), 0–100.
  const yetiScore = useMemo(() => {
    if (workoutDays.size === 0) return null;
    let recent = 0;
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      if (workoutDays.has(d.toDateString())) recent += 1;
    }
    return Math.min(100, Math.round((recent / 6) * 100)); // ~6 sessions / 2 weeks = 100
  }, [workoutDays]);

  const scoreBand =
    yetiScore == null
      ? ''
      : yetiScore >= 80
      ? 'Excellent'
      : yetiScore >= 60
      ? 'Strong'
      : yetiScore >= 40
      ? 'Building'
      : 'Getting started';
  const scoreColor =
    yetiScore != null && yetiScore >= 60 ? '#22C55E' : yetiScore != null && yetiScore >= 40 ? '#EAB308' : '#F97316';
  const scoreR = 52;
  const scoreCirc = 2 * Math.PI * scoreR;
  const scoreDash = ((yetiScore ?? 0) / 100) * scoreCirc;

  // ── Strength (real PRs, newest per exercise) ────────────────────────────────
  const currentPrs = useMemo(() => currentPersonalRecords(prs || []), [prs]);
  const strengthList = useMemo(() => currentPrs.slice(0, 6), [currentPrs]);

  // ── Nutrition averages (real meal logs, last 30 days) ───────────────────────
  const nutritionAvg = useMemo(() => {
    const cutoff = (nowMs || Date.now()) - 30 * 864e5;
    const recent = (mealLogs || []).filter((l) => l.logged_at >= cutoff && l.food);
    if (recent.length === 0) return null;
    const days = new Set(recent.map((l) => new Date(l.logged_at).toDateString())).size || 1;
    const sum = recent.reduce(
      (acc, l) => ({
        cal: acc.cal + (l.food!.calories || 0) * l.servings,
        p: acc.p + (l.food!.protein || 0) * l.servings,
        c: acc.c + (l.food!.carbs || 0) * l.servings,
        f: acc.f + (l.food!.fat || 0) * l.servings,
      }),
      { cal: 0, p: 0, c: 0, f: 0 }
    );
    return {
      cal: Math.round(sum.cal / days),
      p: Math.round(sum.p / days),
      c: Math.round(sum.c / days),
      f: Math.round(sum.f / days),
      days,
    };
  }, [mealLogs]);

  // ── Log Weight Handlers ───────────────────────────────────────────────────
  const handleOpenLogModal = () => {
    if (currentWeight != null) {
      const displayVal =
        inputUnit === 'lbs'
          ? (Math.round(currentWeight * 2.20462 * 10) / 10).toString()
          : (Math.round(currentWeight * 10) / 10).toString();
      setInputWeight(displayVal);
    } else {
      setInputWeight('');
    }
    setInputBodyFat(bodyFat != null ? bodyFat.toString() : '');
    setLogError(null);
    setShowLogModal(true);
  };

  const handleUnitToggle = (unit: 'kg' | 'lbs') => {
    if (unit === inputUnit) return;
    setInputUnit(unit);
    if (inputWeight.trim()) {
      const val = parseFloat(inputWeight);
      if (!isNaN(val)) {
        if (unit === 'lbs') {
          // kg to lbs
          setInputWeight((Math.round(val * 2.20462 * 10) / 10).toString());
        } else {
          // lbs to kg
          setInputWeight((Math.round((val / 2.20462) * 10) / 10).toString());
        }
      }
    }
  };

  const handleSaveWeight = async () => {
    if (!userId) return;
    const rawVal = parseFloat(inputWeight.trim());
    if (isNaN(rawVal) || rawVal <= 0) {
      setLogError('Please enter a valid weight.');
      return;
    }

    const weightInKg = inputUnit === 'lbs' ? rawVal / 2.20462 : rawVal;
    if (weightInKg < 20 || weightInKg > 450) {
      setLogError('Please enter a realistic weight (20 – 450 kg / 45 – 1000 lbs).');
      return;
    }

    let bodyFatVal: number | undefined = undefined;
    if (inputBodyFat.trim()) {
      const bf = parseFloat(inputBodyFat.trim());
      if (!isNaN(bf) && bf >= 2 && bf <= 75) {
        bodyFatVal = Math.round(bf * 10) / 10;
      }
    }

    setSavingWeight(true);
    setLogError(null);

    try {
      const roundedKg = Math.round(weightInKg * 10) / 10;
      const optimistic = {
        id: `pending_${Date.now()}`,
        user_id: userId,
        weight_kg: roundedKg,
        body_fat_pct: bodyFatVal,
        logged_at: Date.now(),
      };
      const optimisticMeasurements = [optimistic, ...measurements];
      const optimisticProfile = { ...(profile || {}), weight_kg: roundedKg };
      setMeasurements(optimisticMeasurements);
      setProfile(optimisticProfile);
      useUserStore.getState().updateField('weight_kg', String(roundedKg));
      void persistScreenData(progressKey, { measurements: optimisticMeasurements, profile: optimisticProfile });
      void persistScreenData(`profile:${userId}`, optimisticProfile);
      markLocalProfileWrite(userId, { weight_kg: roundedKg });
      patchHomeSnapshot(userId, { currentWeight: roundedKg });
      invalidateScreenData(`profile:${userId}`);
      invalidateScreenData(`home:${userId}`);
      const cachedTargets = getScreenData<any>(`nutrition-targets:${userId}`);
      if (cachedTargets?.mode === 'AUTO' && !cachedTargets.locked) {
        applyNutritionTargetsLocal(userId, calculateNutritionTargets(optimisticProfile), 'AUTO');
      }
      setShowLogModal(false);
      setSavingWeight(false);

      void progressRepository.saveMeasurement(
        userId,
        roundedKg,
        bodyFatVal,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        Date.now()
      ).catch(() => {});

      // Also update profile weight and auto-recalculate nutrition targets for immediate cross-app consistency
      void userRepository.updateProfile(userId, { weight_kg: roundedKg }).catch(() => {});
      void syncProfileNutritionTargets(userId, optimisticProfile, userRepository).catch(() => {});
    } catch (err: any) {
      setLogError(err?.message || 'Failed to save weight. Please try again.');
    } finally {
      setSavingWeight(false);
    }
  };

  const showOverviewCards = activeTab === 'overview' || activeTab === 'body';
  const showWorkoutCards = activeTab === 'overview' || activeTab === 'workout';
  const showStrengthCards = activeTab === 'overview' || activeTab === 'strength';

  const selectTab = useCallback((key: TabKey, index: number) => {
    setActiveTab(key);
    tabsRef.current?.scrollTo({ x: Math.max(0, index * 100 - 16), animated: true });
  }, []);

  return (
    <AppShell activeTab="progress">
      <SafeAreaView style={s.container} edges={['top']}>
        <Animated.View entering={FadeIn.duration(400)} style={[s.responsiveWrapper, { maxWidth: isDesktop ? 760 : '100%' }]}>
          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={s.pageTitle}>Progress</Text>
              <Text style={s.pageSubtitle}>Track your results and stay consistent.</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Filter date range"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={s.filterBtn}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="filter" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <ScrollView ref={tabsRef} horizontal showsHorizontalScrollIndicator={false} style={s.tabsScrollView} contentContainerStyle={s.tabsRow}>
            {TABS.map((tab, index) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`${tab.label} tab`}
                  onPress={() => selectTab(tab.key, index)}
                  style={[s.tabBtn, isActive && s.tabBtnActive]}
                  activeOpacity={0.75}
                >
                  <Text style={[s.tabBtnText, isActive && s.tabBtnTextActive]} numberOfLines={1}>{tab.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
            {showOverviewCards && (
              <>
                {/* Yeti Score */}
                <Animated.View entering={FadeInDown.duration(400)} style={[s.card, s.yetiScoreCard]}>
                  <View style={s.cardHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={s.cardTitle}>Yeti Score</Text>
                      <Ionicons name="information-circle-outline" size={16} color="#64748B" style={{ marginLeft: 6 }} />
                    </View>
                  </View>

                  <View style={s.yetiScoreRow}>
                    <View style={s.scoreRingWrapper}>
                      <Svg width={124} height={124}>
                        <Defs>
                          <LinearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                            <Stop offset="0%" stopColor="#38BDF8" stopOpacity="1" />
                            <Stop offset="100%" stopColor="#2563EB" stopOpacity="1" />
                          </LinearGradient>
                        </Defs>
                        <Circle cx={62} cy={62} r={scoreR} stroke="rgba(255,255,255,0.07)" strokeWidth={10} fill="none" />
                        {yetiScore != null && (
                          <Circle
                            cx={62}
                            cy={62}
                            r={scoreR}
                            stroke="url(#scoreGrad)"
                            strokeWidth={10}
                            fill="none"
                            strokeDasharray={`${scoreDash} ${scoreCirc - scoreDash}`}
                            strokeDashoffset={scoreCirc * 0.25}
                            strokeLinecap="round"
                          />
                        )}
                      </Svg>
                      <View style={s.scoreRingCenter} pointerEvents="none">
                        <Text style={s.scoreNumber}>{yetiScore ?? '—'}</Text>
                        <Text style={s.scoreOutOf}>/100</Text>
                        {!!scoreBand && <Text style={[s.scoreLabel, { color: scoreColor }]}>{scoreBand}</Text>}
                      </View>
                    </View>

                    <View style={s.yetiMascotContainer}>
                      <View style={{ flex: 1, paddingRight: 4 }}>
                        <Text style={s.yetiMotivText}>
                          {yetiScore == null ? 'Log a workout to start' : yetiScore >= 60 ? "You're crushing it! 💪" : 'Every session counts'}
                        </Text>
                        <Text style={s.yetiMotivSub}>
                          {yetiScore == null ? 'Your score builds from real training.' : 'Based on your last 2 weeks of training.'}
                        </Text>
                      </View>
                      <Image source={MASCOT} style={s.yetiMascotImage} resizeMode="contain" />
                    </View>
                  </View>

                  {/* Real stats: workouts this week + streak */}
                  <View style={s.scoreStatsRow}>
                    <View style={s.scoreStat}>
                      <View style={s.scoreStatIconRow}>
                        <Ionicons name="barbell" size={13} color="#3B82F6" />
                        <Text style={s.scoreStatValue}>{workoutsThisWeek}</Text>
                      </View>
                      <Text style={s.scoreStatLabel}>this week</Text>
                    </View>
                    <View style={s.scoreStatDivider} />
                    <View style={s.scoreStat}>
                      <View style={s.scoreStatIconRow}>
                        <Ionicons name="flame" size={13} color="#F97316" />
                        <Text style={s.scoreStatValue}>{streak}</Text>
                      </View>
                      <Text style={s.scoreStatLabel}>day streak</Text>
                    </View>
                    <View style={s.scoreStatDivider} />
                    <View style={s.scoreStat}>
                      <View style={s.scoreStatIconRow}>
                        <Ionicons name="trophy" size={13} color="#EAB308" />
                        <Text style={s.scoreStatValue}>{currentPrs.length}</Text>
                      </View>
                      <Text style={s.scoreStatLabel}>PRs set</Text>
                    </View>
                  </View>
                </Animated.View>

                {/* Weight Trend */}
                <Animated.View entering={FadeInDown.delay(80).duration(400)} style={s.card}>
                  <View style={s.cardHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={s.cardTitle}>Weight Trend</Text>
                      <Ionicons name="information-circle-outline" size={16} color="#64748B" style={{ marginLeft: 6 }} />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity
                        style={s.logWeightHeaderBtn}
                        onPress={handleOpenLogModal}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel="Log weight"
                      >
                        <Ionicons name="add" size={14} color="#FFFFFF" />
                        <Text style={s.logWeightHeaderBtnText}>Log Weight</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.dateRangeBtn}
                        onPress={() => setShowDatePicker(true)}
                        accessibilityRole="button"
                        accessibilityLabel="Change date range"
                      >
                        <Text style={s.dateRangeBtnText}>{dateRange === '30D' ? '30 Days' : dateRange}</Text>
                        <Ionicons name="chevron-down" size={13} color="#94A3B8" style={{ marginLeft: 2 }} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {weightSeries.length >= 1 ? (
                    <>
                      <View style={{ marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                          <Text style={s.weightCurrentVal}>{currentWeight!.toFixed(1)} kg</Text>
                          <Text style={{ fontSize: 13, color: '#64748B' }}>
                            ({(currentWeight! * 2.20462).toFixed(1)} lbs)
                          </Text>
                        </View>
                        {weightDelta != null && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                            <Ionicons
                              name={weightDelta <= 0 ? 'arrow-down' : 'arrow-up'}
                              size={13}
                              color={weightDelta <= 0 ? '#22C55E' : '#F97316'}
                            />
                            <Text
                              style={{
                                fontSize: 13,
                                fontWeight: '700',
                                color: weightDelta <= 0 ? '#22C55E' : '#F97316',
                                marginLeft: 2,
                              }}
                            >
                              {Math.abs(weightDelta).toFixed(1)} kg
                            </Text>
                            <Text style={{ fontSize: 12, color: '#64748B', marginLeft: 5 }}>
                              vs {dateRange === '30D' ? '30 days' : 'range'} ago
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={{ overflow: 'hidden' }}>
                        <Svg width={chartW} height={130}>
                          <Defs>
                            <LinearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                              <Stop offset="0%" stopColor="#3B82F6" stopOpacity="0.35" />
                              <Stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                            </LinearGradient>
                          </Defs>
                          {[0, 1, 2, 3].map((i) => (
                            <Path key={i} d={`M 8 ${12 + i * 26} L ${chartW - 8} ${12 + i * 26}`} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
                          ))}
                          <Path d={weightArea} fill="url(#weightGrad)" />
                          <Path d={weightPath} stroke="#3B82F6" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          {weightPoints.map((point, index) => (
                            <Circle key={index} cx={point.x} cy={point.y} r={3.5} fill="#3B82F6" stroke="#141822" strokeWidth={2} />
                          ))}
                        </Svg>
                        <View style={[s.chartXAxisRow, { width: chartW }]}>
                          {weightSeries.filter((_, i) => i % Math.ceil(weightSeries.length / 5) === 0).map((d, i) => (
                            <Text key={i} style={s.chartXLabel}>
                              {d.label}
                            </Text>
                          ))}
                        </View>
                      </View>
                    </>
                  ) : (
                    <View style={s.emptyBox}>
                      <Ionicons name="trending-down-outline" size={28} color="#64748B" />
                      <Text style={s.emptyTitle}>No weight logged yet</Text>
                      <Text style={s.emptySub}>Log your weight regularly to monitor body composition and trend lines.</Text>
                      <TouchableOpacity
                        style={[s.primaryBtn, { marginTop: 12, paddingHorizontal: 20 }]}
                        onPress={handleOpenLogModal}
                        activeOpacity={0.85}
                      >
                        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Log First Weight</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </Animated.View>

                {/* Body Composition */}
                <Animated.View entering={FadeInDown.delay(160).duration(400)} style={s.card}>
                  <View style={s.cardHeaderRow}>
                    <Text style={s.cardTitle}>Body Composition</Text>
                    {latest && (
                      <Text style={{ fontSize: 12, color: '#64748B' }}>
                        {new Date(latest.logged_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                    )}
                  </View>

                  {latest || bmi != null ? (
                    <View style={s.compositionRingsRow}>
                      <RingArc
                        size={80}
                        strokeWidth={8}
                        percent={bodyFat ?? 0}
                        color="#EF4444"
                        label="Body Fat"
                        value={bodyFat != null ? `${bodyFat}%` : '—'}
                        tracked={bodyFat != null}
                      />
                      <RingArc size={80} strokeWidth={8} percent={0} color="#22C55E" label="Muscle Mass" value="—" tracked={false} />
                      <RingArc size={80} strokeWidth={8} percent={0} color="#3B82F6" label="Water" value="—" tracked={false} />
                      <RingArc
                        size={80}
                        strokeWidth={8}
                        percent={bmi != null ? Math.min((bmi / 40) * 100, 100) : 0}
                        color="#8B5CF6"
                        label="BMI"
                        value={bmi != null ? bmi.toFixed(1) : '—'}
                        tracked={bmi != null}
                      />
                    </View>
                  ) : (
                    <View style={s.emptyBox}>
                      <Ionicons name="body-outline" size={28} color="#64748B" />
                      <Text style={s.emptyTitle}>No measurements yet</Text>
                      <Text style={s.emptySub}>Log body fat or weight to see composition metrics.</Text>
                    </View>
                  )}
                </Animated.View>
              </>
            )}

            {showStrengthCards && (
              <>
                {/* Strength Progress */}
                <Animated.View entering={FadeInDown.delay(240).duration(400)} style={s.card}>
                  <View style={s.cardHeaderRow}>
                    <Text style={s.cardTitle}>Strength Progress</Text>
                    <TouchableOpacity onPress={() => router.push('/workouts')} accessibilityRole="button" accessibilityLabel="View all workouts">
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#3B82F6' }}>View All</Text>
                    </TouchableOpacity>
                  </View>

                  {strengthList.length > 0 ? (
                    strengthList.map((pr, idx) => (
                      <React.Fragment key={pr.id || idx}>
                        {idx > 0 && <View style={s.divider} />}
                        <View style={s.strengthRow}>
                          <View style={[s.strengthIconBox, { backgroundColor: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.35)' }]}>
                            <Ionicons name="barbell-outline" size={18} color="#3B82F6" />
                          </View>
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={s.strengthExName}>{canonicalExerciseName(pr.exercises?.name || 'Exercise', pr.exercise_id)}</Text>
                            <Text style={s.strengthExType}>{(pr.record_type || 'PR').replace(/_/g, ' ')}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', minWidth: 60 }}>
                            <Text style={s.strengthWeight}>
                              {pr.value}
                              {String(pr.record_type || '').toLowerCase().includes('rep') ? ' reps' : ' kg'}
                            </Text>
                            <Text style={s.strengthExType}>
                              {new Date(pr.achieved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </Text>
                          </View>
                        </View>
                      </React.Fragment>
                    ))
                  ) : (
                    <View style={s.emptyBox}>
                      <Ionicons name="barbell-outline" size={28} color="#64748B" />
                      <Text style={s.emptyTitle}>No personal records yet</Text>
                      <Text style={s.emptySub}>Complete workouts and log your sets to build strength records.</Text>
                    </View>
                  )}
                </Animated.View>

              </>
            )}

            {showWorkoutCards && (
              <>
                {/* Consistency */}
                <Animated.View entering={FadeInDown.delay(320).duration(400)} style={s.card}>
                  <View style={s.cardHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={s.cardTitle}>Consistency</Text>
                      <Ionicons name="information-circle-outline" size={16} color="#64748B" style={{ marginLeft: 6 }} />
                    </View>
                    <Text style={s.dateRangeBtnText}>This Week</Text>
                  </View>

                  <View style={s.weekRow}>
                    {weekDays.map((day, idx) => (
                      <View key={idx} style={s.weekDayCell}>
                        <Text style={s.weekDayLabel}>{day.label}</Text>
                        <View style={[s.weekDayCircle, day.done && s.weekDayDone]}>
                          {day.done ? (
                            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                          ) : (
                            <Text style={{ fontSize: 11, color: day.future ? '#334155' : '#475569' }}>·</Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>

                  <View style={s.consistencyLegendRow}>
                    <View style={s.legendItem}>
                      <View style={[s.legendDot, { backgroundColor: '#22C55E' }]} />
                      <Text style={s.legendText}>Workout Completed</Text>
                    </View>
                    <Text style={s.consistencyCount}>{workoutsThisWeek} / 7 days</Text>
                  </View>
                </Animated.View>
              </>
            )}

            {activeTab === 'nutrition' && (
              <Animated.View entering={FadeInDown.duration(400)}>
                <View style={s.card}>
                  <Text style={s.cardTitle}>Calorie & Macro Averages</Text>
                  {nutritionAvg ? (
                    <>
                      <Text style={{ fontSize: 13, color: '#94A3B8', marginTop: 4, marginBottom: 14 }}>
                        Daily average over the last {nutritionAvg.days} logged day{nutritionAvg.days === 1 ? '' : 's'}:{' '}
                        {nutritionAvg.cal.toLocaleString()} kcal
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={s.nutriStat}>
                          <Text style={{ fontSize: 18, fontWeight: '800', color: '#8B5CF6' }}>{nutritionAvg.p}g</Text>
                          <Text style={s.nutriStatLabel}>Avg Protein</Text>
                        </View>
                        <View style={s.nutriStat}>
                          <Text style={{ fontSize: 18, fontWeight: '800', color: '#EAB308' }}>{nutritionAvg.c}g</Text>
                          <Text style={s.nutriStatLabel}>Avg Carbs</Text>
                        </View>
                        <View style={s.nutriStat}>
                          <Text style={{ fontSize: 18, fontWeight: '800', color: '#22C55E' }}>{nutritionAvg.f}g</Text>
                          <Text style={s.nutriStatLabel}>Avg Fats</Text>
                        </View>
                      </View>
                    </>
                  ) : (
                    <View style={s.emptyBox}>
                      <Ionicons name="nutrition-outline" size={28} color="#64748B" />
                      <Text style={s.emptyTitle}>No meals logged yet</Text>
                      <Text style={s.emptySub}>Log meals in the Nutrition tab to see your averages here.</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => router.push('/food-diary')}
                    style={[s.primaryBtn, { marginTop: 16 }]}
                    accessibilityRole="button"
                    accessibilityLabel="Open food diary"
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFF' }}>Open Food Diary</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}
          </ScrollView>
        </Animated.View>

        {/* ── Log Weight Modal ──────────────────────────────────────────────── */}
        <Modal visible={showLogModal} transparent animationType="slide">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlay}>
            <View style={s.modalSheet}>
              <View style={s.modalHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="scale-outline" size={20} color="#3B82F6" />
                  <Text style={s.modalTitle}>Log Body Weight</Text>
                </View>
                <TouchableOpacity onPress={() => setShowLogModal(false)} accessibilityRole="button" accessibilityLabel="Close">
                  <Ionicons name="close" size={22} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* Weight input with unit switcher */}
              <Text style={s.inputHeaderLabel}>BODY WEIGHT</Text>
              <View style={s.weightInputRow}>
                <TextInput
                  style={s.weightNumericInput}
                  placeholder={inputUnit === 'kg' ? '75.0' : '165.0'}
                  placeholderTextColor="#475569"
                  keyboardType="decimal-pad"
                  autoFocus={true}
                  value={inputWeight}
                  onChangeText={(val) => {
                    setInputWeight(val);
                    if (logError) setLogError(null);
                  }}
                />
                <View style={s.unitSwitcher}>
                  <TouchableOpacity
                    style={[s.unitBtn, inputUnit === 'kg' && s.unitBtnActive]}
                    onPress={() => handleUnitToggle('kg')}
                  >
                    <Text style={[s.unitBtnText, inputUnit === 'kg' && s.unitBtnTextActive]}>kg</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.unitBtn, inputUnit === 'lbs' && s.unitBtnActive]}
                    onPress={() => handleUnitToggle('lbs')}
                  >
                    <Text style={[s.unitBtnText, inputUnit === 'lbs' && s.unitBtnTextActive]}>lbs</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Optional body fat % input */}
              <Text style={[s.inputHeaderLabel, { marginTop: 14 }]}>BODY FAT % (OPTIONAL)</Text>
              <View style={s.bodyFatInputRow}>
                <TextInput
                  style={s.bodyFatNumericInput}
                  placeholder="e.g. 15.5"
                  placeholderTextColor="#475569"
                  keyboardType="decimal-pad"
                  value={inputBodyFat}
                  onChangeText={setInputBodyFat}
                />
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#94A3B8', paddingHorizontal: 14 }}>%</Text>
              </View>

              {/* Date & time tag */}
              <View style={s.dateTagRow}>
                <Ionicons name="calendar-outline" size={13} color="#64748B" />
                <Text style={{ fontSize: 12, color: '#64748B' }}>
                  Logging for: Today, {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>

              {/* Error banner */}
              {logError ? (
                <View style={s.logErrorBanner}>
                  <Ionicons name="alert-circle" size={14} color="#EF4444" />
                  <Text style={s.logErrorText}>{logError}</Text>
                </View>
              ) : null}

              {/* Action buttons */}
              <View style={s.modalActionsRow}>
                <TouchableOpacity
                  style={s.cancelBtn}
                  onPress={() => setShowLogModal(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                >
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.saveBtn, savingWeight && { opacity: 0.7 }]}
                  onPress={handleSaveWeight}
                  disabled={savingWeight}
                  accessibilityRole="button"
                  accessibilityLabel="Save weight"
                >
                  {savingWeight ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={s.saveBtnText}>Save Weight</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Date range filter */}
        <Modal visible={showDatePicker} transparent animationType="slide">
          <View style={s.modalOverlay}>
            <View style={s.modalSheet}>
              <View style={s.modalHeaderRow}>
                <Text style={s.modalTitle}>Filter Date Range</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)} accessibilityRole="button" accessibilityLabel="Close">
                  <Ionicons name="close" size={22} color="#94A3B8" />
                </TouchableOpacity>
              </View>
              {[
                { id: '7D', label: 'Last 7 Days' },
                { id: '30D', label: 'Last 30 Days' },
                { id: '90D', label: 'Last 90 Days' },
                { id: '6M', label: 'Last 6 Months' },
              ].map((r) => (
                <TouchableOpacity
                  key={r.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: dateRange === r.id }}
                  accessibilityLabel={r.label}
                  style={[s.dateRangeOption, dateRange === r.id && s.dateRangeOptionActive]}
                  onPress={() => {
                    setDateRange(r.id as any);
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={[s.dateRangeOptionText, dateRange === r.id && s.dateRangeOptionTextActive]}>{r.label}</Text>
                  {dateRange === r.id && <Ionicons name="checkmark" size={18} color="#3B82F6" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </AppShell>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090B10' },
  responsiveWrapper: { flex: 1, width: '100%', alignSelf: 'center' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 120 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 24 : 12,
    paddingBottom: 8,
  },
  pageTitle: { fontSize: 30, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  filterBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },

  tabsScrollView: { height: 42, maxHeight: 42, flexGrow: 0, flexShrink: 0, marginBottom: 12 },
  tabsRow: { height: 42, paddingLeft: 20, paddingRight: 28, gap: 8, alignItems: 'center' },
  tabBtn: {
    minWidth: 84,
    height: 36,
    minHeight: 36,
    maxHeight: 36,
    paddingHorizontal: 16,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    flexGrow: 0,
    alignSelf: 'center',
  },
  tabBtnActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  tabBtnTextActive: { color: '#FFFFFF' },

  card: {
    backgroundColor: '#141822',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: 18,
    marginBottom: 14,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 2 },

  emptyBox: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', marginTop: 4 },
  emptySub: { fontSize: 12, color: '#64748B', textAlign: 'center', paddingHorizontal: 12, lineHeight: 17 },

  singleWeightBox: { paddingVertical: 8 },

  yetiScoreCard: { backgroundColor: '#090E17', borderColor: 'rgba(56, 189, 248, 0.22)' },
  yetiScoreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  scoreRingWrapper: { width: 124, height: 124, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  scoreRingCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  scoreNumber: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 },
  scoreOutOf: { fontSize: 12, fontWeight: '600', color: '#64748B', marginTop: -4 },
  scoreLabel: { fontSize: 11, fontWeight: '800', color: '#22C55E', marginTop: 4 },
  yetiMascotContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginLeft: 8 },
  yetiMascotImage: { width: 110, height: 120, backgroundColor: 'transparent' },
  yetiMotivText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  yetiMotivSub: { fontSize: 12, color: '#94A3B8', marginTop: 2, lineHeight: 16 },
  scoreStatsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 14 },
  scoreStat: { flex: 1, alignItems: 'center' },
  scoreStatIconRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  scoreStatValue: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  scoreStatLabel: { fontSize: 11, color: '#64748B', marginTop: 3, textAlign: 'center' },
  scoreStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginHorizontal: 8 },

  weightCurrentVal: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  logWeightHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 3,
  },
  logWeightHeaderBtnText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },

  dateRangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dateRangeBtnText: { fontSize: 12, fontWeight: '600', color: '#94A3B8' },
  chartXAxisRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, marginTop: 6 },
  chartXLabel: { fontSize: 10, color: '#475569', fontWeight: '500' },

  compositionRingsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 4 },

  strengthRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  strengthIconBox: { width: 42, height: 42, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  strengthExName: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  strengthExType: { fontSize: 11, color: '#64748B', marginTop: 1, textTransform: 'capitalize' },
  strengthWeight: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },

  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  weekDayCell: { alignItems: 'center', gap: 6 },
  weekDayLabel: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  weekDayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayDone: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  consistencyLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 12,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  consistencyCount: { marginLeft: 'auto', fontSize: 13, fontWeight: '800', color: '#FFFFFF' },

  nutriStat: { flex: 1, backgroundColor: '#090B10', padding: 12, borderRadius: 12, alignItems: 'flex-start' },
  nutriStatLabel: { fontSize: 11, color: '#64748B', marginTop: 2 },

  primaryBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#161B22',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
  },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },

  inputHeaderLabel: { fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5, marginBottom: 6 },
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#090B10',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  weightNumericInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    paddingVertical: 8,
  },
  unitSwitcher: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 3,
  },
  unitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9,
  },
  unitBtnActive: {
    backgroundColor: '#2563EB',
  },
  unitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  unitBtnTextActive: {
    color: '#FFFFFF',
  },

  bodyFatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#090B10',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  bodyFatNumericInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    paddingVertical: 10,
  },

  dateTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 4,
  },

  logErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
  },
  logErrorText: { fontSize: 12, fontWeight: '600', color: '#EF4444' },

  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: '#94A3B8' },
  saveBtn: {
    flex: 2,
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },

  dateRangeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  dateRangeOptionActive: { backgroundColor: 'rgba(59, 130, 246, 0.12)', borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.3)' },
  dateRangeOptionText: { fontSize: 15, fontWeight: '600', color: '#94A3B8' },
  dateRangeOptionTextActive: { color: '#3B82F6', fontWeight: '700' },
});

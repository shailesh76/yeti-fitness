/**
 * analytics.tsx — Progress screen
 *
 * Five tabs, each with a DISTINCT section tree (see PROGRESS_TAB_SECTIONS in
 * services/progressAnalytics.ts — the single source of truth the render is
 * driven by, so a tab can never silently borrow another tab's cards):
 *   - Overview  → concise cross-section snapshot (Yeti Score, weekly workouts,
 *                 weight preview, strength summary, nutrition summary)
 *   - Workout   → volume / sets / duration / training days + recent sessions
 *   - Nutrition → intake averages, vs-target, logging consistency + trends
 *   - Body      → weight / weight change / BMI / body fat / circumferences
 *                 (measurement data ONLY — no Yeti Score, no workout cards)
 *   - Strength  → current PRs, recent PRs, PR history by exercise
 *
 * Data honesty: every number is derived from real already-loaded rows
 * (useLogStore history + PRs, useFoodStore meal logs, ProgressRepository
 * measurements, cached nutrition targets) via the pure helpers in
 * progressAnalytics.ts. Nothing is fabricated; empty inputs render clean empty
 * states, not placeholders.
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
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
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
import { dedupeScreenRefresh, getScreenData, hydrateScreenData, invalidateScreenData, isScreenDataStale, persistScreenData, subscribeScreenData } from '../services/screenDataCache';
import { createScreenPerfTrace } from '../services/screenPerf';
import { canonicalExerciseName } from '@yeti/database/src/repositories/ExerciseRepository';
import { buildTrendLinePath, calculateTrendPoints, type DailyPoint } from '../services/progressChart';
import {
  deriveWorkoutAnalytics,
  deriveNutritionAnalytics,
  deriveBodyAnalytics,
  deriveStrengthAnalytics,
  sectionsForTab,
  type ProgressSection,
  type StrengthPrSummary,
} from '../services/progressAnalytics';

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

function rangeLabel(range: string): string {
  switch (range) {
    case '7D': return '7 days';
    case '30D': return '30 days';
    case '90D': return '90 days';
    case '6M': return '6 months';
    default: return range;
  }
}

function formatVolumeKg(kg: number): string {
  if (!Number.isFinite(kg) || kg <= 0) return '0 kg';
  return kg >= 1000 ? `${(kg / 1000).toFixed(1)}k kg` : `${Math.round(kg)} kg`;
}

function prUnitSuffix(unit: 'kg' | 'reps'): string {
  return unit === 'reps' ? ' reps' : ' kg';
}

// ─── Reusable daily-trend chart (volume / calories / protein / weight) ───────
// Renders exactly the points buildDailySeries produced — one per logged day, no
// zero-fill. Handles empty ([] → nothing), one-point (single marker) and flat
// (mid-line) series without inventing variation.
function TrendChart({
  points,
  color,
  width,
  height = 120,
}: {
  points: DailyPoint[];
  color: string;
  width: number;
  height?: number;
}) {
  const values = points.map((p) => p.value);
  const chartPoints = calculateTrendPoints(values, width, height, 8, 10);
  const path = buildTrendLinePath(chartPoints);
  const area = chartPoints.length >= 2 ? path + ` L ${width - 8},${height} L 8,${height} Z` : '';
  const gradId = `trendGrad_${color.replace(/[^a-zA-Z0-9]/g, '')}`;
  const gridGap = (height - 24) / 3;
  const step = Math.max(1, Math.ceil(points.length / 5));

  return (
    <View style={{ overflow: 'hidden' }}>
      <Svg width={width} height={height + 10}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <Stop offset="100%" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {[0, 1, 2, 3].map((i) => (
          <Path key={i} d={`M 8 ${12 + i * gridGap} L ${width - 8} ${12 + i * gridGap}`} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
        ))}
        {area ? <Path d={area} fill={`url(#${gradId})`} /> : null}
        {path ? <Path d={path} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
        {chartPoints.map((pt, index) => (
          <Circle key={index} cx={pt.x} cy={pt.y} r={3.5} fill={color} stroke="#141822" strokeWidth={2} />
        ))}
      </Svg>
      <View style={[s.chartXAxisRow, { width }]}>
        {points.filter((_, i) => i % step === 0).map((p, i) => (
          <Text key={i} style={s.chartXLabel}>{p.label}</Text>
        ))}
      </View>
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
  const historyError = useLogStore((s) => s.historyError);
  const prsError = useLogStore((s) => s.prsError);
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

  // Nutrition targets are written to the shared screen-data cache by the
  // nutrition-targets service; read them here (never invent defaults) so the
  // Nutrition tab can show an honest vs-target comparison or a no-target state.
  const targetsKey = userId ? `nutrition-targets:${userId}` : 'nutrition-targets:anonymous';
  const [nutritionTargets, setNutritionTargets] = useState<any>(getScreenData<any>(targetsKey) ?? null);

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

  useEffect(() => {
    let alive = true;
    void hydrateScreenData<any>(targetsKey).then((t) => { if (alive && t) setNutritionTargets(t); });
    const unsub = subscribeScreenData<any>(targetsKey, (next) => setNutritionTargets(next ?? null));
    return () => { alive = false; unsub(); };
  }, [targetsKey]);

  const now = (typeof window !== 'undefined' ? Date.now() : 0) || Date.now();
  const rangeDays = RANGE_DAYS[dateRange];

  // ── Pure derivations over already-loaded state (one dataset → many cards) ──
  const workoutAnalytics = useMemo(
    () => deriveWorkoutAnalytics(history || [], { nowMs: now, rangeDays }),
    // now is intentionally excluded (matches existing memo convention); recompute on data/range change
    [history, dateRange] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const nutritionAnalytics = useMemo(
    () => deriveNutritionAnalytics(mealLogs || [], nutritionTargets, { nowMs: now, rangeDays, athleteId: userId }),
    [mealLogs, nutritionTargets, dateRange, userId] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const bodyAnalytics = useMemo(
    () => deriveBodyAnalytics(measurements || [], profile, { nowMs: now, rangeDays }),
    [measurements, profile, dateRange] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const strengthAnalytics = useMemo(
    () => deriveStrengthAnalytics(prs || [], { nowMs: now }),
    [prs] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Simple derived values reused by the Log Weight modal + Overview preview.
  const currentWeight = bodyAnalytics.currentWeightKg;
  const bodyFat = bodyAnalytics.bodyFatPct;

  // ── Consistency + streak + activity-based Yeti Score (real workouts) ────────
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

  const trainingDaysThisWeek = weekDays.filter((d) => d.done).length;

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

  // ── Which sections this tab shows (single source of truth) ──────────────────
  const sections = sectionsForTab(activeTab);
  const has = (section: ProgressSection) => sections.includes(section);

  const selectTab = useCallback((key: TabKey, index: number) => {
    setActiveTab(key);
    tabsRef.current?.scrollTo({ x: Math.max(0, index * 100 - 16), animated: true });
  }, []);

  // ── Small render helpers ────────────────────────────────────────────────────
  const renderPrRow = (pr: StrengthPrSummary, idx: number, withDivider: boolean) => (
    <React.Fragment key={pr.id || `${pr.exerciseId}:${pr.recordType}:${idx}`}>
      {withDivider && idx > 0 && <View style={s.divider} />}
      <View style={s.strengthRow}>
        <View style={[s.strengthIconBox, { backgroundColor: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.35)' }]}>
          <Ionicons name="barbell-outline" size={18} color="#3B82F6" />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.strengthExName} numberOfLines={1}>{canonicalExerciseName(pr.exerciseName, pr.exerciseId)}</Text>
          <Text style={s.strengthExType}>{pr.recordType.replace(/_/g, ' ')}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', minWidth: 60 }}>
          <Text style={s.strengthWeight}>{pr.value}{prUnitSuffix(pr.unit)}</Text>
          <Text style={s.strengthExType}>{pr.dateLabel}</Text>
        </View>
      </View>
    </React.Fragment>
  );

  const renderTargetBar = (label: string, vs: { avg: number; target: number; pct: number }, unit: string, color: string) => {
    const fillPct = Math.min(100, Math.max(0, vs.pct));
    const over = vs.pct > 105;
    return (
      <View style={{ marginTop: 14 }}>
        <View style={s.targetLabelRow}>
          <Text style={s.targetLabel}>{label}</Text>
          <Text style={s.targetValue}>
            {vs.avg.toLocaleString()} <Text style={s.targetValueDim}>/ {vs.target.toLocaleString()} {unit}</Text>
          </Text>
        </View>
        <View style={s.targetBarTrack}>
          <View style={[s.targetBarFill, { width: `${fillPct}%`, backgroundColor: over ? '#F97316' : color }]} />
        </View>
        <Text style={[s.targetPct, { color: over ? '#F97316' : '#64748B' }]}>{vs.pct}% of target</Text>
      </View>
    );
  };

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
            {/* ═══ OVERVIEW: Yeti Score ═══ */}
            {has('score') && (
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

                {/* Real stats: training days this week + streak + current PRs */}
                <View style={s.scoreStatsRow}>
                  <View style={s.scoreStat}>
                    <View style={s.scoreStatIconRow}>
                      <Ionicons name="barbell" size={13} color="#3B82F6" />
                      <Text style={s.scoreStatValue}>{trainingDaysThisWeek}</Text>
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
                      <Text style={s.scoreStatValue}>{strengthAnalytics.currentPrCount}</Text>
                    </View>
                    <Text style={s.scoreStatLabel}>Current PRs</Text>
                  </View>
                </View>
              </Animated.View>
            )}

            {/* ═══ OVERVIEW: Weekly workout snapshot ═══ */}
            {has('weeklySnapshot') && (
              <Animated.View entering={FadeInDown.delay(60).duration(400)} style={s.card}>
                <View style={s.cardHeaderRow}>
                  <Text style={s.cardTitle}>This Week's Training</Text>
                  <TouchableOpacity onPress={() => selectTab('workout', 1)} accessibilityRole="button" accessibilityLabel="View workout details">
                    <Text style={s.linkText}>Details</Text>
                  </TouchableOpacity>
                </View>
                {workoutAnalytics.hasData ? (
                  <View style={s.tripleStatRow}>
                    <View style={s.tripleStat}>
                      <Text style={s.tripleStatValue}>{workoutAnalytics.workoutsThisWeek}</Text>
                      <Text style={s.tripleStatLabel}>workouts this week</Text>
                    </View>
                    <View style={s.tripleStat}>
                      <Text style={s.tripleStatValue}>{workoutAnalytics.workoutsThisMonth}</Text>
                      <Text style={s.tripleStatLabel}>this month</Text>
                    </View>
                    <View style={s.tripleStat}>
                      <Text style={s.tripleStatValue}>{formatVolumeKg(workoutAnalytics.totalVolumeKg)}</Text>
                      <Text style={s.tripleStatLabel}>volume · {rangeLabel(dateRange)}</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={s.inlineEmpty}>No workouts logged yet. Complete a session to see your weekly training here.</Text>
                )}
              </Animated.View>
            )}

            {/* ═══ OVERVIEW: Weight trend preview ═══ */}
            {has('weightTrendPreview') && (
              <Animated.View entering={FadeInDown.delay(120).duration(400)} style={s.card}>
                <View style={s.cardHeaderRow}>
                  <Text style={s.cardTitle}>Weight Trend</Text>
                  <TouchableOpacity onPress={() => selectTab('body', 3)} accessibilityRole="button" accessibilityLabel="View body details">
                    <Text style={s.linkText}>Details</Text>
                  </TouchableOpacity>
                </View>
                {currentWeight != null ? (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                      <Text style={s.weightCurrentVal}>{currentWeight.toFixed(1)} kg</Text>
                      {bodyAnalytics.weightChangeKg != null && (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons
                            name={bodyAnalytics.weightChangeKg <= 0 ? 'arrow-down' : 'arrow-up'}
                            size={13}
                            color={bodyAnalytics.weightChangeKg <= 0 ? '#22C55E' : '#F97316'}
                          />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: bodyAnalytics.weightChangeKg <= 0 ? '#22C55E' : '#F97316', marginLeft: 2 }}>
                            {Math.abs(bodyAnalytics.weightChangeKg).toFixed(1)} kg
                          </Text>
                        </View>
                      )}
                    </View>
                    {bodyAnalytics.weightTrend.length >= 1 ? (
                      <View style={{ marginTop: 8 }}>
                        <TrendChart points={bodyAnalytics.weightTrend} color="#3B82F6" width={chartW} height={90} />
                      </View>
                    ) : (
                      <Text style={s.inlineEmpty}>Log weight over time to see your trend.</Text>
                    )}
                  </>
                ) : (
                  <Text style={s.inlineEmpty}>No weight logged yet. Add your weight in the Body tab.</Text>
                )}
              </Animated.View>
            )}

            {/* ═══ OVERVIEW: Strength summary ═══ */}
            {has('strengthSummary') && (
              <Animated.View entering={FadeInDown.delay(180).duration(400)} style={s.card}>
                <View style={s.cardHeaderRow}>
                  <Text style={s.cardTitle}>{strengthAnalytics.currentPrCount} Current PRs</Text>
                  <TouchableOpacity onPress={() => selectTab('strength', 4)} accessibilityRole="button" accessibilityLabel="View strength details">
                    <Text style={s.linkText}>Details</Text>
                  </TouchableOpacity>
                </View>
                {strengthAnalytics.currentPrs.length > 0 ? (
                  strengthAnalytics.currentPrs.slice(0, 3).map((pr, idx) => renderPrRow(pr, idx, true))
                ) : (
                  <Text style={s.inlineEmpty}>No personal records yet. Log your sets to build strength records.</Text>
                )}
              </Animated.View>
            )}

            {/* ═══ OVERVIEW: Nutrition summary ═══ */}
            {has('nutritionSummary') && (
              <Animated.View entering={FadeInDown.delay(240).duration(400)} style={s.card}>
                <View style={s.cardHeaderRow}>
                  <Text style={s.cardTitle}>Nutrition</Text>
                  <TouchableOpacity onPress={() => selectTab('nutrition', 2)} accessibilityRole="button" accessibilityLabel="View nutrition details">
                    <Text style={s.linkText}>Details</Text>
                  </TouchableOpacity>
                </View>
                {nutritionAnalytics.hasData ? (
                  <View style={s.tripleStatRow}>
                    <View style={s.tripleStat}>
                      <Text style={s.tripleStatValue}>{nutritionAnalytics.avgCalories.toLocaleString()}</Text>
                      <Text style={s.tripleStatLabel}>avg kcal / day</Text>
                    </View>
                    <View style={s.tripleStat}>
                      <Text style={[s.tripleStatValue, { color: '#8B5CF6' }]}>{nutritionAnalytics.avgProtein}g</Text>
                      <Text style={s.tripleStatLabel}>avg protein</Text>
                    </View>
                    <View style={s.tripleStat}>
                      <Text style={s.tripleStatValue}>{nutritionAnalytics.loggedDays}</Text>
                      <Text style={s.tripleStatLabel}>days logged</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={s.inlineEmpty}>No meals logged yet. Track meals to see your intake averages.</Text>
                )}
              </Animated.View>
            )}

            {/* ═══ WORKOUT: stats + volume trend + recent sessions ═══ */}
            {has('workoutStats') && (
              <Animated.View entering={FadeInDown.duration(400)} style={s.card}>
                <Text style={s.cardTitle}>Workout Summary</Text>
                <Text style={s.cardSubtitle}>Last {rangeLabel(dateRange)}</Text>
                {historyError ? (
                  <View style={s.emptyBox}>
                    <Ionicons name="alert-circle-outline" size={28} color="#EF4444" />
                    <Text style={s.emptyTitle}>Failed to load workout history</Text>
                    <Text style={s.emptySub}>{historyError}</Text>
                    <TouchableOpacity
                      style={[s.primaryBtn, { marginTop: 12, paddingHorizontal: 20 }]}
                      onPress={() => userId && fetchLogsHistory(userId)}
                      activeOpacity={0.85}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                ) : workoutAnalytics.hasData ? (
                  <>
                    {workoutAnalytics.inRangeSessionsCount === 0 && (
                      <View style={{ marginBottom: 12, padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)' }}>
                        <Text style={{ fontSize: 13, color: '#94A3B8' }}>
                          No workouts recorded in the last {rangeLabel(dateRange)}. Showing your recent session history below.
                        </Text>
                      </View>
                    )}
                    <View style={s.statGrid}>
                      <View style={s.statTile}>
                        <Text style={s.statTileValue}>{workoutAnalytics.workoutsThisWeek}</Text>
                        <Text style={s.statTileLabel}>workouts this week</Text>
                      </View>
                      <View style={s.statTile}>
                        <Text style={s.statTileValue}>{workoutAnalytics.workoutsThisMonth}</Text>
                        <Text style={s.statTileLabel}>workouts this month</Text>
                      </View>
                      <View style={s.statTile}>
                        <Text style={s.statTileValue}>{workoutAnalytics.distinctTrainingDays}</Text>
                        <Text style={s.statTileLabel}>training days</Text>
                      </View>
                      <View style={s.statTile}>
                        <Text style={s.statTileValue}>{workoutAnalytics.totalCompletedSets}</Text>
                        <Text style={s.statTileLabel}>completed sets</Text>
                      </View>
                      <View style={s.statTile}>
                        <Text style={s.statTileValue}>{formatVolumeKg(workoutAnalytics.totalVolumeKg)}</Text>
                        <Text style={s.statTileLabel}>total volume</Text>
                      </View>
                      <View style={s.statTile}>
                        <Text style={s.statTileValue}>{workoutAnalytics.avgDurationMin != null ? `${workoutAnalytics.avgDurationMin} min` : '—'}</Text>
                        <Text style={s.statTileLabel}>avg duration</Text>
                      </View>
                    </View>

                    {workoutAnalytics.volumeTrend.length >= 1 && (
                      <>
                        <Text style={s.sectionSubhead}>Training volume</Text>
                        <TrendChart points={workoutAnalytics.volumeTrend} color="#3B82F6" width={chartW} height={110} />
                      </>
                    )}

                    {workoutAnalytics.recentSessions.length > 0 && (
                      <>
                        <Text style={s.sectionSubhead}>Recent sessions</Text>
                        {workoutAnalytics.recentSessions.map((session, idx) => (
                          <React.Fragment key={session.id}>
                            {idx > 0 && <View style={s.divider} />}
                            <View style={s.sessionRow}>
                              <View style={{ flex: 1, paddingRight: 10 }}>
                                <Text style={s.sessionName} numberOfLines={1}>{session.name}</Text>
                                <Text style={s.sessionMeta}>
                                  {session.dateLabel}
                                  {session.setCount > 0 ? ` · ${session.setCount} set${session.setCount === 1 ? '' : 's'}` : ''}
                                  {session.durationMin != null ? ` · ${session.durationMin} min` : ''}
                                </Text>
                              </View>
                              <Text style={s.sessionVolume}>{formatVolumeKg(session.volumeKg)}</Text>
                            </View>
                          </React.Fragment>
                        ))}
                      </>
                    )}
                  </>
                ) : (
                  <View style={s.emptyBox}>
                    <Ionicons name="barbell-outline" size={28} color="#64748B" />
                    <Text style={s.emptyTitle}>No workouts logged yet</Text>
                    <Text style={s.emptySub}>Complete a workout to see volume, sets and training days here.</Text>
                  </View>
                )}
              </Animated.View>
            )}

            {/* ═══ WORKOUT: weekly consistency ═══ */}
            {has('consistency') && (
              <Animated.View entering={FadeInDown.delay(80).duration(400)} style={s.card}>
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
                  <Text style={s.consistencyCount}>{trainingDaysThisWeek} / 7 days</Text>
                </View>
              </Animated.View>
            )}

            {/* ═══ NUTRITION: averages, vs-target, consistency, trends ═══ */}
            {has('nutritionStats') && (
              <Animated.View entering={FadeInDown.duration(400)} style={s.card}>
                <Text style={s.cardTitle}>Calorie & Macro Averages</Text>
                {nutritionAnalytics.hasData ? (
                  <>
                    <Text style={s.cardSubtitle}>
                      Daily average over {nutritionAnalytics.loggedDays} logged day{nutritionAnalytics.loggedDays === 1 ? '' : 's'}: {nutritionAnalytics.avgCalories.toLocaleString()} kcal
                    </Text>
                    <View style={[s.tripleStatRow, { marginTop: 12 }]}>
                      <View style={s.nutriStat}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: '#8B5CF6' }}>{nutritionAnalytics.avgProtein}g</Text>
                        <Text style={s.nutriStatLabel}>Avg Protein</Text>
                      </View>
                      <View style={s.nutriStat}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: '#EAB308' }}>{nutritionAnalytics.avgCarbs}g</Text>
                        <Text style={s.nutriStatLabel}>Avg Carbs</Text>
                      </View>
                      <View style={s.nutriStat}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: '#22C55E' }}>{nutritionAnalytics.avgFats}g</Text>
                        <Text style={s.nutriStatLabel}>Avg Fats</Text>
                      </View>
                    </View>

                    {nutritionAnalytics.hasTargets ? (
                      <>
                        {nutritionAnalytics.caloriesVsTarget && renderTargetBar('Calories vs target', nutritionAnalytics.caloriesVsTarget, 'kcal', '#3B82F6')}
                        {nutritionAnalytics.proteinVsTarget && renderTargetBar('Protein vs target', nutritionAnalytics.proteinVsTarget, 'g', '#8B5CF6')}
                      </>
                    ) : (
                      <View style={s.noTargetNote}>
                        <Ionicons name="flag-outline" size={14} color="#64748B" />
                        <Text style={s.noTargetText}>Set nutrition targets to compare them against your intake.</Text>
                      </View>
                    )}

                    <View style={s.consistencyLegendRow}>
                      <Text style={s.legendText}>Logging consistency</Text>
                      <Text style={s.consistencyCount}>
                        {nutritionAnalytics.loggingConsistencyPct}% · {nutritionAnalytics.loggedDays}/{nutritionAnalytics.calendarDays} days
                      </Text>
                    </View>

                    {nutritionAnalytics.calorieTrend.length >= 1 && (
                      <>
                        <Text style={s.sectionSubhead}>Calorie trend</Text>
                        <TrendChart points={nutritionAnalytics.calorieTrend} color="#3B82F6" width={chartW} height={110} />
                      </>
                    )}
                    {nutritionAnalytics.proteinTrend.length >= 1 && (
                      <>
                        <Text style={s.sectionSubhead}>Protein trend</Text>
                        <TrendChart points={nutritionAnalytics.proteinTrend} color="#8B5CF6" width={chartW} height={110} />
                      </>
                    )}
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
              </Animated.View>
            )}

            {/* ═══ BODY: weight / change / BMI / body fat / circumferences ═══ */}
            {has('bodyStats') && (
              <Animated.View entering={FadeInDown.duration(400)} style={s.card}>
                <View style={s.cardHeaderRow}>
                  <Text style={s.cardTitle}>Body Measurements</Text>
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
                </View>

                {bodyAnalytics.currentWeightKg != null ? (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                      <Text style={s.weightCurrentVal}>{bodyAnalytics.currentWeightKg.toFixed(1)} kg</Text>
                      <Text style={{ fontSize: 13, color: '#64748B' }}>({(bodyAnalytics.currentWeightKg * 2.20462).toFixed(1)} lbs)</Text>
                    </View>
                    {bodyAnalytics.weightChangeKg != null && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Ionicons
                          name={bodyAnalytics.weightChangeKg <= 0 ? 'arrow-down' : 'arrow-up'}
                          size={13}
                          color={bodyAnalytics.weightChangeKg <= 0 ? '#22C55E' : '#F97316'}
                        />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: bodyAnalytics.weightChangeKg <= 0 ? '#22C55E' : '#F97316', marginLeft: 2 }}>
                          {Math.abs(bodyAnalytics.weightChangeKg).toFixed(1)} kg
                        </Text>
                        <Text style={{ fontSize: 12, color: '#64748B', marginLeft: 5 }}>over {rangeLabel(dateRange)}</Text>
                      </View>
                    )}

                    {bodyAnalytics.weightTrend.length >= 1 && (
                      <View style={{ marginTop: 4, marginBottom: 4 }}>
                        <TrendChart points={bodyAnalytics.weightTrend} color="#3B82F6" width={chartW} height={110} />
                      </View>
                    )}

                    <View style={[s.statGrid, { marginTop: 12 }]}>
                      {bodyAnalytics.bmi != null && (
                        <View style={s.statTile}>
                          <Text style={s.statTileValue}>{bodyAnalytics.bmi.toFixed(1)}</Text>
                          <Text style={s.statTileLabel}>BMI</Text>
                        </View>
                      )}
                      {bodyAnalytics.bodyFatPct != null && (
                        <View style={s.statTile}>
                          <Text style={s.statTileValue}>{bodyAnalytics.bodyFatPct}%</Text>
                          <Text style={s.statTileLabel}>Body Fat</Text>
                        </View>
                      )}
                      {bodyAnalytics.circumferences.map((c) => (
                        <View key={c.key} style={s.statTile}>
                          <Text style={s.statTileValue}>{c.valueCm} cm</Text>
                          <Text style={s.statTileLabel}>{c.label}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                ) : (
                  <View style={s.emptyBox}>
                    <Ionicons name="body-outline" size={28} color="#64748B" />
                    <Text style={s.emptyTitle}>No measurements yet</Text>
                    <Text style={s.emptySub}>Log your weight regularly to monitor body composition and trend lines.</Text>
                    <TouchableOpacity style={[s.primaryBtn, { marginTop: 12, paddingHorizontal: 20 }]} onPress={handleOpenLogModal} activeOpacity={0.85}>
                      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Log First Weight</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Animated.View>
            )}

            {/* ═══ BODY: recent measurements ═══ */}
            {has('bodyMeasurements') && bodyAnalytics.recentMeasurements.length > 0 && (
              <Animated.View entering={FadeInDown.delay(80).duration(400)} style={s.card}>
                <Text style={s.cardTitle}>Recent Measurements</Text>
                <View style={{ marginTop: 8 }}>
                  {bodyAnalytics.recentMeasurements.map((m, idx) => (
                    <React.Fragment key={m.loggedAtMs}>
                      {idx > 0 && <View style={s.divider} />}
                      <View style={s.sessionRow}>
                        <Text style={s.measurementDate}>{m.dateLabel}</Text>
                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                          <Text style={s.measurementPrimary}>
                            {m.weightKg != null ? `${m.weightKg} kg` : '—'}
                            {m.bodyFatPct != null ? ` · ${m.bodyFatPct}% BF` : ''}
                          </Text>
                          {m.circumferences.length > 0 && (
                            <Text style={s.measurementMeta} numberOfLines={1}>
                              {m.circumferences.map((c) => `${c.label} ${c.valueCm}`).join(' · ')}
                            </Text>
                          )}
                        </View>
                      </View>
                    </React.Fragment>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* ═══ STRENGTH: current PRs, recent PRs, PR history ═══ */}
            {has('strengthStats') && (
              <Animated.View entering={FadeInDown.duration(400)} style={s.card}>
                <View style={s.cardHeaderRow}>
                  <Text style={s.cardTitle}>{strengthAnalytics.currentPrCount} Current PRs</Text>
                  <TouchableOpacity onPress={() => router.push('/workouts')} accessibilityRole="button" accessibilityLabel="View all workouts">
                    <Text style={s.linkText}>View All</Text>
                  </TouchableOpacity>
                </View>

                {prsError ? (
                  <View style={s.emptyBox}>
                    <Ionicons name="alert-circle-outline" size={28} color="#EF4444" />
                    <Text style={s.emptyTitle}>Failed to load personal records</Text>
                    <Text style={s.emptySub}>{prsError}</Text>
                    <TouchableOpacity
                      style={[s.primaryBtn, { marginTop: 12, paddingHorizontal: 20 }]}
                      onPress={() => userId && fetchPRs(userId)}
                      activeOpacity={0.85}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                ) : strengthAnalytics.currentPrs.length > 0 ? (
                  <>
                    {strengthAnalytics.currentPrs.map((pr, idx) => renderPrRow(pr, idx, true))}

                    {strengthAnalytics.recentPrs.length > 0 && (
                      <>
                        <Text style={s.sectionSubhead}>Set in the last 30 days</Text>
                        {strengthAnalytics.recentPrs.map((pr, idx) => renderPrRow(pr, idx, true))}
                      </>
                    )}

                    {strengthAnalytics.prHistoryByExercise.length > 0 && (
                      <>
                        <Text style={s.sectionSubhead}>PR history</Text>
                        {strengthAnalytics.prHistoryByExercise.map((group) => (
                          <View key={group.exerciseId} style={s.historyBlock}>
                            <Text style={s.historyExName} numberOfLines={1}>{canonicalExerciseName(group.exerciseName, group.exerciseId)}</Text>
                            <View style={s.historyRow}>
                              {group.records.map((r, i) => (
                                <View key={r.id || `${r.recordType}:${i}`} style={s.historyChip}>
                                  <Text style={s.historyChipVal}>{r.value}{prUnitSuffix(r.unit)}</Text>
                                  <Text style={s.historyChipDate}>{r.dateLabel}</Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        ))}
                      </>
                    )}
                  </>
                ) : (
                  <View style={s.emptyBox}>
                    <Ionicons name="barbell-outline" size={28} color="#64748B" />
                    <Text style={s.emptyTitle}>No personal records yet</Text>
                    <Text style={s.emptySub}>Complete workouts and log your sets to build strength records.</Text>
                  </View>
                )}
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

  tabsScrollView: { height: 44, maxHeight: 44, flexGrow: 0, flexShrink: 0, marginBottom: 12 },
  tabsRow: { flexDirection: 'row', height: 44, paddingLeft: 20, paddingRight: 28, gap: 8, alignItems: 'center' },
  tabBtn: {
    minWidth: 84,
    height: 36,
    minHeight: 36,
    maxHeight: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
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
  tabBtnText: { fontSize: 13, fontWeight: '600', color: '#64748B', lineHeight: 18, textAlign: 'center' },
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
  cardSubtitle: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  linkText: { fontSize: 13, fontWeight: '700', color: '#3B82F6' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 2 },
  sectionSubhead: { fontSize: 13, fontWeight: '700', color: '#94A3B8', marginTop: 18, marginBottom: 8 },
  inlineEmpty: { fontSize: 13, color: '#64748B', lineHeight: 18 },

  emptyBox: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', marginTop: 4 },
  emptySub: { fontSize: 12, color: '#64748B', textAlign: 'center', paddingHorizontal: 12, lineHeight: 17 },

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

  dateRangeBtnText: { fontSize: 12, fontWeight: '600', color: '#94A3B8' },
  chartXAxisRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, marginTop: 6 },
  chartXLabel: { fontSize: 10, color: '#475569', fontWeight: '500' },

  // Stat grid (workout / body) — wraps to 2 columns, never overflows.
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  statTile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: '#0E131C',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statTileValue: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  statTileLabel: { fontSize: 11, color: '#64748B', marginTop: 3 },

  // Compact 3-up snapshot row (overview / nutrition macros).
  tripleStatRow: { flexDirection: 'row', gap: 10 },
  tripleStat: { flex: 1, backgroundColor: '#0E131C', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  tripleStatValue: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  tripleStatLabel: { fontSize: 11, color: '#64748B', marginTop: 3 },

  sessionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  sessionName: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  sessionMeta: { fontSize: 11, color: '#64748B', marginTop: 2 },
  sessionVolume: { fontSize: 14, fontWeight: '800', color: '#3B82F6' },

  measurementDate: { fontSize: 13, fontWeight: '700', color: '#94A3B8', width: 70 },
  measurementPrimary: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  measurementMeta: { fontSize: 11, color: '#64748B', marginTop: 2 },

  strengthRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  strengthIconBox: { width: 42, height: 42, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  strengthExName: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  strengthExType: { fontSize: 11, color: '#64748B', marginTop: 1, textTransform: 'capitalize' },
  strengthWeight: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },

  historyBlock: { marginTop: 10 },
  historyExName: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 },
  historyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  historyChip: { backgroundColor: '#0E131C', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  historyChipVal: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  historyChipDate: { fontSize: 10, color: '#64748B', marginTop: 1 },

  targetLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  targetLabel: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  targetValue: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  targetValueDim: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  targetBarTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: 6 },
  targetBarFill: { height: 8, borderRadius: 4 },
  targetPct: { fontSize: 11, marginTop: 4 },

  noTargetNote: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, backgroundColor: '#0E131C', borderRadius: 12, padding: 12 },
  noTargetText: { flex: 1, fontSize: 12, color: '#94A3B8', lineHeight: 17 },

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
    marginTop: 12,
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

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Alert,
  StyleSheet,
  Modal,
  Dimensions,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useLogStore } from '../store/useLogStore';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import AppShell from '../components/AppShell';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { SkeletonLoader } from '../components/TelemetryComponents';
import { Ionicons } from '@expo/vector-icons';
import { P, glowStyle, sharedStyles } from '../constants/premiumTheme';
import * as ImagePicker from 'expo-image-picker';

// ─── Types ────────────────────────────────────────────────────────────────────
interface WeightLog {
  id:         string;
  weight_kg:  number;
  logged_at:  string;
}

type TabKey = 'weight' | 'measurements' | 'photos' | 'prs';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'weight',       label: 'Weight'       },
  { key: 'measurements', label: 'Measurements' },
  { key: 'photos',       label: 'Photos'       },
  { key: 'prs',          label: 'PRs'          },
];

const SCREEN_W = Dimensions.get('window').width;
const CHART_W  = SCREEN_W - 40 - 36; // content width minus card padding×2
const CHART_H  = 140;

// ─── Measurement types definition ────────────────────────────────────────────
const MEASUREMENT_TYPES = [
  { key: 'waist',  label: 'Waist',   icon: 'body-outline',        color: P.AMBER },
  { key: 'chest',  label: 'Chest',   icon: 'body-outline',        color: P.ACCENT },
  { key: 'arms',   label: 'Arms',    icon: 'barbell-outline',     color: P.BLUE  },
  { key: 'hips',   label: 'Hips',    icon: 'body-outline',        color: '#A855F7' },
  { key: 'thighs', label: 'Thighs',  icon: 'fitness-outline',     color: '#F59E0B' },
  { key: 'neck',   label: 'Neck',    icon: 'body-outline',        color: P.TEXT_SEC },
] as const;

// ─── Animated weight chart ─────────────────────────────────────────────────
function WeightChart({ logs }: { logs: WeightLog[] }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) });
  }, [logs.length]);

  if (logs.length < 2) {
    return (
      <View style={styles.emptyChartBox}>
        <Ionicons name="analytics-outline" size={28} color={P.TEXT_MUT} />
        <Text style={styles.emptyChartText}>Log weight on at least 2 days to see your trend line.</Text>
      </View>
    );
  }

  const weights  = logs.map((l) => l.weight_kg);
  const minW     = Math.min(...weights) - 1;
  const maxW     = Math.max(...weights) + 1;
  const wRange   = maxW - minW || 1;
  const margin   = 4;

  const pts = logs.map((log, i) => {
    const x = margin + (i / (logs.length - 1)) * (CHART_W - margin * 2);
    const y = CHART_H - margin - ((log.weight_kg - minW) / wRange) * (CHART_H - margin * 2 - 16);
    return { x, y };
  });

  // Smooth cubic bezier line
  let linePath = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpX  = (prev.x + curr.x) / 2;
    linePath   += ` C ${cpX} ${prev.y} ${cpX} ${curr.y} ${curr.x} ${curr.y}`;
  }

  // Area fill path (same bezier curve, closes at bottom)
  const last   = pts[pts.length - 1];
  const first  = pts[0];
  const fillPath = linePath
    + ` L ${last.x} ${CHART_H} L ${first.x} ${CHART_H} Z`;

  // X-axis labels — show first, midpoint, last dates
  const labelIndices = [
    0,
    Math.floor((logs.length - 1) / 2),
    logs.length - 1,
  ].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <View style={{ marginBottom: 8 }}>
      <Svg width={CHART_W} height={CHART_H + 24}>
        <Defs>
          <LinearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%"   stopColor={P.ACCENT} stopOpacity="0.35" />
            <Stop offset="100%" stopColor={P.ACCENT} stopOpacity="0"    />
          </LinearGradient>
        </Defs>

        {/* Gradient fill */}
        <Path d={fillPath} fill="url(#greenGrad)" />

        {/* Line */}
        <Path
          d={linePath}
          fill="none"
          stroke={P.ACCENT}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Latest point dot */}
        <Circle cx={last.x} cy={last.y} r={5} fill={P.ACCENT} />
      </Svg>

      {/* X-axis labels */}
      <View style={[sharedStyles.rowBetween, { paddingHorizontal: margin }]}>
        {labelIndices.map((i) => (
          <Text key={i} style={styles.chartXLabel}>
            {new Date(logs[i].logged_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ProgressScreen() {
  const router   = useRouter();
  const session  = useAuthStore((state) => state.session);
  const { logsHistory, fetchLogsHistory, loading: logsLoading, prs, fetchPRs } = useLogStore();

  const [activeTab,    setActiveTab]    = useState<TabKey>('weight');
  const [weightLogs,   setWeightLogs]   = useState<WeightLog[]>([]);
  const [newWeight,    setNewWeight]    = useState('');
  const [weightLoading,setWeightLoading]= useState(false);
  const [latestInsight,setLatestInsight]= useState<string>('');
  const [selectedPr,   setSelectedPr]  = useState<any | null>(null);
  const [progressPhotos, setProgressPhotos] = useState<{ uri: string; date: string }[]>([]);

  // Measurement state (stored locally, per‑type current + change)
  const [measurements, setMeasurements] = useState<Record<string, { current: number | null; prev: number | null }>>({});
  const [measInput,    setMeasInput]    = useState<Record<string, string>>({});
  const [measEditKey,  setMeasEditKey]  = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      fetchLogsHistory(session.user.id);
      fetchPRs(session.user.id);
      loadWeightLogs();
      loadLatestInsight();
      loadMeasurements();
      loadProgressPhotos();
    }
  }, [session]);

  const loadWeightLogs = async () => {
    if (!session?.user?.id) return;
    try {
      const { data } = await supabase
        .from('weight_logs')
        .select('*')
        .eq('user_id', session.user.id)
        .order('logged_at', { ascending: true });
      setWeightLogs(data || []);
    } catch (e) {
      console.warn(e);
    }
  };

  const loadLatestInsight = async () => {
    if (!session?.user?.id) return;
    try {
      const { data } = await supabase
        .from('health_insights')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (data && data.length > 0) setLatestInsight(data[0].insight_text);
    } catch (e) {
      console.warn(e);
    }
  };

  const loadMeasurements = async () => {
    if (!session?.user?.id) return;
    try {
      const { data } = await supabase
        .from('measurements')
        .select('*')
        .eq('user_id', session.user.id)
        .order('logged_at', { ascending: false });
      if (!data) return;
      const map: typeof measurements = {};
      MEASUREMENT_TYPES.forEach(({ key }) => {
        const rows = data.filter((r: any) => r.measurement_type === key);
        map[key] = {
          current: rows[0]?.value ?? null,
          prev:    rows[1]?.value ?? null,
        };
      });
      setMeasurements(map);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleSaveMeasurement = async (key: string) => {
    const val = parseFloat(measInput[key] ?? '');
    if (isNaN(val) || val <= 0) { setMeasEditKey(null); return; }
    try {
      await supabase.from('measurements').insert({
        user_id:          session?.user?.id,
        measurement_type: key,
        value:            val,
      });
      setMeasEditKey(null);
      setMeasInput((prev) => ({ ...prev, [key]: '' }));
      loadMeasurements();
    } catch (e) {
      Alert.alert('Error', 'Could not save measurement.');
    }
  };

  const loadProgressPhotos = async () => {
    if (!session?.user?.id) return;
    try {
      const { data } = await supabase
        .from('progress_photos')
        .select('*')
        .eq('user_id', session.user.id)
        .order('taken_at', { ascending: false });
      if (data) {
        setProgressPhotos(data.map((p: any) => ({ uri: p.photo_url, date: p.taken_at })));
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleAddProgressPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality:       0.85,
        aspect:        [3, 4],
      });
      if (result.canceled) return;
      const uri = result.assets[0].uri;
      // Insert with a placeholder photo_url — actual upload logic stays unchanged
      await supabase.from('progress_photos').insert({
        user_id:   session?.user?.id,
        photo_url: uri,
        taken_at:  new Date().toISOString(),
      });
      loadProgressPhotos();
    } catch (e) {
      Alert.alert('Error', 'Could not add progress photo.');
    }
  };

  const handleAddWeight = async () => {
    const val = parseFloat(newWeight);
    if (isNaN(val) || val <= 30 || val >= 300) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight in kg.');
      return;
    }
    setWeightLoading(true);
    try {
      const { error } = await supabase
        .from('weight_logs')
        .insert({ user_id: session?.user?.id, weight_kg: val });
      if (error) throw error;
      setNewWeight('');
      loadWeightLogs();
    } catch (e) {
      Alert.alert('Error', 'Failed to log weight.');
    } finally {
      setWeightLoading(false);
    }
  };

  // ── Derived data ────────────────────────────────────────────────────────────
  const currentPrs = React.useMemo(() => {
    const map = new Map<string, any>();
    prs.forEach((pr) => { if (!map.has(pr.exercise_id)) map.set(pr.exercise_id, pr); });
    return Array.from(map.values());
  }, [prs]);

  const prHistory = React.useMemo(() => {
    if (!selectedPr) return [];
    return prs.filter((p) => p.exercise_id === selectedPr.exercise_id);
  }, [selectedPr, prs]);

  // Weight stats
  const currentWeight    = weightLogs[weightLogs.length - 1]?.weight_kg || 0;
  const startWeight      = weightLogs[0]?.weight_kg                     || 0;
  const weightDiff       = currentWeight - startWeight;

  // 30-day trend: compare most recent to the one closest to 30 days ago
  const monthAgo       = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const monthAgoLog    = weightLogs.filter((l) => new Date(l.logged_at).getTime() <= monthAgo).pop();
  const monthDiff      = monthAgoLog ? currentWeight - monthAgoLog.weight_kg : null;
  const isMonthDown    = (monthDiff ?? 0) < 0;
  const monthDiffText  = monthDiff !== null
    ? `${isMonthDown ? '▼' : '▲'} ${Math.abs(monthDiff).toFixed(1)} kg this month`
    : null;

  // ── Loading state ────────────────────────────────────────────────────────────
  if (logsLoading) {
    return (
      <AppShell activeTab="progress">
        <SafeAreaView style={{ flex: 1, backgroundColor: P.BG, paddingHorizontal: 20, paddingTop: 40 }}>
          <SkeletonLoader rows={2} height={160} />
        </SafeAreaView>
      </AppShell>
    );
  }

  return (
    <AppShell activeTab="progress">
      <SafeAreaView style={{ flex: 1, backgroundColor: P.BG }} edges={['top']}>
        <Animated.View entering={FadeIn.duration(500)} style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={sharedStyles.scrollContent}
          >
            {/* ══════════════════════════════════════════════════════════
                1. HEADER
            ══════════════════════════════════════════════════════════ */}
            <Animated.View entering={FadeInDown.delay(0).duration(400)} style={[sharedStyles.rowBetween, { marginBottom: 4 }]}>
              <View>
                <Text style={sharedStyles.labelCaps}>ANALYTICS</Text>
                <Text style={styles.pageTitle}>Progress 📈</Text>
              </View>
              <TouchableOpacity
                onPress={handleAddProgressPhoto}
                style={sharedStyles.circleBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="camera-outline" size={20} color={P.TEXT_PRI} />
              </TouchableOpacity>
            </Animated.View>

            {/* ══════════════════════════════════════════════════════════
                2. SEGMENTED TAB ROW
            ══════════════════════════════════════════════════════════ */}
            <Animated.View entering={FadeInDown.delay(60).duration(400)} style={styles.tabRow}>
              {TABS.map(({ key, label }) => {
                const active = activeTab === key;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setActiveTab(key)}
                    style={[styles.tabPill, active && styles.tabPillActive]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.tabText, active && styles.tabTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </Animated.View>

            {/* ══════════════════════════════════════════════════════════
                3. WEIGHT TAB
            ══════════════════════════════════════════════════════════ */}
            {activeTab === 'weight' && (
              <>
                {/* Hero weight card */}
                <Animated.View entering={FadeInDown.delay(100).duration(450)} style={sharedStyles.cardGlow}>
                  {/* Card header */}
                  <View style={[sharedStyles.rowBetween, { marginBottom: 10 }]}>
                    <Text style={sharedStyles.labelCaps}>CURRENT WEIGHT</Text>
                    {monthDiffText && (
                      <View style={[styles.trendBadge, { backgroundColor: (isMonthDown ? P.ACCENT : P.AMBER) + '18', borderColor: (isMonthDown ? P.ACCENT : P.AMBER) + '35' }]}>
                        <Text style={[styles.trendText, { color: isMonthDown ? P.ACCENT : P.AMBER }]}>
                          {monthDiffText}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Big weight number */}
                  <View style={styles.currentWeightRow}>
                    <Text style={styles.currentWeightNum}>
                      {currentWeight > 0 ? currentWeight.toFixed(1) : '—'}
                    </Text>
                    <Text style={styles.currentWeightUnit}>kg</Text>
                  </View>

                  {/* Start → Current summary row */}
                  {startWeight > 0 && startWeight !== currentWeight && (
                    <View style={[sharedStyles.row, { gap: 16, marginBottom: 16 }]}>
                      <View style={styles.weightStatBox}>
                        <Text style={sharedStyles.labelCaps}>STARTED</Text>
                        <Text style={styles.weightStatVal}>{startWeight.toFixed(1)} kg</Text>
                      </View>
                      <View style={styles.weightStatDivider} />
                      <View style={styles.weightStatBox}>
                        <Text style={sharedStyles.labelCaps}>TOTAL CHANGE</Text>
                        <Text style={[styles.weightStatVal, { color: weightDiff < 0 ? P.ACCENT : P.AMBER }]}>
                          {weightDiff > 0 ? '+' : ''}{weightDiff.toFixed(1)} kg
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Weight chart */}
                  <WeightChart logs={weightLogs} />

                  {/* Log weight input */}
                  <View style={[sharedStyles.row, { gap: 10, marginTop: 6 }]}>
                    <View style={styles.inputWrap}>
                      <Ionicons name="scale-outline" size={16} color={P.TEXT_MUT} />
                      <TextInput
                        style={styles.input}
                        placeholder="Log weight (kg)"
                        placeholderTextColor={P.TEXT_MUT}
                        keyboardType="numeric"
                        value={newWeight}
                        onChangeText={setNewWeight}
                      />
                    </View>
                    <TouchableOpacity
                      style={[styles.logBtn, glowStyle(P.ACCENT, 10, 0.30)]}
                      onPress={handleAddWeight}
                      disabled={weightLoading}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.logBtnText}>LOG</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>

                {/* AI Insight card */}
                <Animated.View
                  entering={FadeInDown.delay(180).duration(450)}
                  style={[sharedStyles.card, styles.insightCard]}
                >
                  <View style={[sharedStyles.row, { gap: 8, marginBottom: 10 }]}>
                    <Ionicons name="sparkles" size={16} color="#A855F7" />
                    <Text style={[sharedStyles.labelCaps, { color: '#A855F7' }]}>AI INSIGHT</Text>
                  </View>
                  <Text style={styles.insightText}>
                    {latestInsight || 'Keep logging your weight and workouts to generate personalised AI insights about your progress.'}
                  </Text>
                </Animated.View>
              </>
            )}

            {/* ══════════════════════════════════════════════════════════
                4. MEASUREMENTS TAB
            ══════════════════════════════════════════════════════════ */}
            {activeTab === 'measurements' && (
              <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                <Text style={[sharedStyles.labelCaps, { marginBottom: 12 }]}>BODY MEASUREMENTS</Text>
                {MEASUREMENT_TYPES.map((m, idx) => {
                  const data    = measurements[m.key];
                  const current = data?.current;
                  const prev    = data?.prev;
                  const diff    = (current !== null && prev !== null) ? current - prev : null;
                  const editing = measEditKey === m.key;

                  return (
                    <Animated.View
                      key={m.key}
                      entering={FadeInDown.delay(idx * 50).duration(350)}
                      style={sharedStyles.card}
                    >
                      <View style={sharedStyles.rowBetween}>
                        {/* Left: icon + label */}
                        <View style={sharedStyles.row}>
                          <View style={[styles.measIconBox, { backgroundColor: m.color + '18', borderColor: m.color + '30' }]}>
                            <Ionicons name={m.icon as any} size={16} color={m.color} />
                          </View>
                          <View style={{ marginLeft: 12 }}>
                            <Text style={styles.measLabel}>{m.label}</Text>
                            {diff !== null && (
                              <Text style={[styles.measDiff, { color: diff < 0 ? P.ACCENT : P.AMBER }]}>
                                {diff > 0 ? '▲ ' : '▼ '}{Math.abs(diff).toFixed(1)} cm since last
                              </Text>
                            )}
                          </View>
                        </View>

                        {/* Right: value + edit */}
                        <View style={[sharedStyles.row, { gap: 10 }]}>
                          {editing ? (
                            <>
                              <TextInput
                                style={styles.measInput}
                                placeholder="cm"
                                placeholderTextColor={P.TEXT_MUT}
                                keyboardType="numeric"
                                autoFocus
                                value={measInput[m.key] ?? ''}
                                onChangeText={(v) => setMeasInput((prev) => ({ ...prev, [m.key]: v }))}
                              />
                              <TouchableOpacity
                                onPress={() => handleSaveMeasurement(m.key)}
                                style={styles.measSaveBtn}
                                activeOpacity={0.8}
                              >
                                <Ionicons name="checkmark" size={14} color="#000" />
                              </TouchableOpacity>
                            </>
                          ) : (
                            <>
                              <Text style={[styles.measValue, { color: m.color }]}>
                                {current !== null ? `${current} cm` : '—'}
                              </Text>
                              <TouchableOpacity
                                onPress={() => setMeasEditKey(m.key)}
                                style={styles.measEditBtn}
                                activeOpacity={0.7}
                              >
                                <Ionicons name="add" size={14} color={P.TEXT_SEC} />
                              </TouchableOpacity>
                            </>
                          )}
                        </View>
                      </View>
                    </Animated.View>
                  );
                })}
              </Animated.View>
            )}

            {/* ══════════════════════════════════════════════════════════
                5. PHOTOS TAB
            ══════════════════════════════════════════════════════════ */}
            {activeTab === 'photos' && (
              <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                <View style={[sharedStyles.rowBetween, { marginBottom: 14 }]}>
                  <Text style={sharedStyles.labelCaps}>PROGRESS PHOTOS</Text>
                  <TouchableOpacity
                    onPress={handleAddProgressPhoto}
                    style={styles.photoAddBtn}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera" size={13} color={P.ACCENT} />
                    <Text style={styles.photoAddBtnText}>Add Photo</Text>
                  </TouchableOpacity>
                </View>

                {progressPhotos.length === 0 ? (
                  /* Empty state */
                  <View style={[sharedStyles.card, styles.emptyState]}>
                    <Ionicons name="camera-outline" size={40} color={P.TEXT_MUT} style={{ marginBottom: 12 }} />
                    <Text style={styles.emptyTitle}>No Progress Photos Yet</Text>
                    <Text style={styles.emptyText}>Take your first photo to start tracking your visual transformation.</Text>
                    <TouchableOpacity
                      onPress={handleAddProgressPhoto}
                      style={[styles.emptyActionBtn, glowStyle(P.ACCENT, 10, 0.30)]}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="camera" size={16} color="#000" />
                      <Text style={styles.emptyActionText}>Take First Photo</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* Photo grid */
                  <View style={styles.photoGrid}>
                    {progressPhotos.map((photo, idx) => (
                      <Animated.View
                        key={idx}
                        entering={FadeInDown.delay(idx * 40).duration(350)}
                        style={styles.photoTile}
                      >
                        {photo.uri ? (
                          <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill as any} resizeMode="cover" />
                        ) : (
                          <View style={[StyleSheet.absoluteFill, { backgroundColor: P.CARD_BORDER, justifyContent: 'center', alignItems: 'center' } as any]}>
                            <Ionicons name="image-outline" size={24} color={P.TEXT_MUT} />
                          </View>
                        )}
                        <View style={styles.photoDateChip}>
                          <Text style={styles.photoDateText}>
                            {new Date(photo.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </Text>
                        </View>
                      </Animated.View>
                    ))}

                    {/* Add photo tile — dashed green border */}
                    <TouchableOpacity
                      onPress={handleAddProgressPhoto}
                      style={styles.photoAddTile}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="add" size={26} color={P.ACCENT} />
                      <Text style={styles.photoAddTileText}>Add{'\n'}Photo</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Animated.View>
            )}

            {/* ══════════════════════════════════════════════════════════
                6. PRs TAB
            ══════════════════════════════════════════════════════════ */}
            {activeTab === 'prs' && (
              <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                <Text style={[sharedStyles.labelCaps, { marginBottom: 12 }]}>PERSONAL RECORDS</Text>

                {currentPrs.length === 0 ? (
                  <View style={[sharedStyles.card, styles.emptyState]}>
                    <Ionicons name="trophy-outline" size={40} color={P.TEXT_MUT} style={{ marginBottom: 12 }} />
                    <Text style={styles.emptyTitle}>No PRs Yet</Text>
                    <Text style={styles.emptyText}>Keep lifting! Your personal records will appear here as you hit new bests.</Text>
                  </View>
                ) : (
                  currentPrs.map((pr, idx) => (
                    <Animated.View
                      key={pr.id}
                      entering={FadeInDown.delay(idx * 50).duration(350)}
                    >
                      <TouchableOpacity
                        onPress={() => setSelectedPr(pr)}
                        style={sharedStyles.card}
                        activeOpacity={0.8}
                      >
                        <View style={sharedStyles.rowBetween}>
                          {/* Left: trophy icon + name + date */}
                          <View style={sharedStyles.row}>
                            <View style={styles.prTrophyBox}>
                              <Ionicons name="trophy" size={16} color={P.GOLD} />
                            </View>
                            <View style={{ marginLeft: 12 }}>
                              <Text style={styles.prExercise}>{pr.exercises?.name || 'Exercise'}</Text>
                              <Text style={styles.prDate}>
                                {new Date(pr.achieved_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </Text>
                            </View>
                          </View>

                          {/* Right: value */}
                          <View style={[sharedStyles.row, { gap: 6 }]}>
                            <Text style={styles.prValue}>
                              {pr.value}{' '}
                              {pr.record_type === 'max_weight'
                                ? 'kg'
                                : pr.record_type === 'max_reps'
                                ? 'reps'
                                : 's'}
                            </Text>
                            <Ionicons name="chevron-forward" size={14} color={P.TEXT_MUT} />
                          </View>
                        </View>
                      </TouchableOpacity>
                    </Animated.View>
                  ))
                )}
              </Animated.View>
            )}

            {/* Bottom padding */}
            <View style={{ height: 24 }} />
          </ScrollView>
        </Animated.View>

        {/* ══════════════════════════════════════════════════════════
            PR HISTORY MODAL (preserved + restyled)
        ══════════════════════════════════════════════════════════ */}
        <Modal
          visible={!!selectedPr}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedPr(null)}
        >
          <View style={styles.modalOverlay}>
            <Animated.View entering={FadeInDown.duration(350)} style={styles.modalSheet}>
              {/* Sheet handle */}
              <View style={styles.sheetHandle} />

              <View style={[sharedStyles.rowBetween, { marginBottom: 4 }]}>
                <View>
                  <Text style={sharedStyles.labelCaps}>PR HISTORY</Text>
                  <Text style={styles.modalTitle}>{selectedPr?.exercises?.name}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedPr(null)}
                  style={styles.modalCloseBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={16} color={P.TEXT_PRI} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {prHistory.map((item, idx) => (
                  <View key={item.id} style={styles.historyItem}>
                    {/* Timeline dot + line */}
                    <View style={styles.historyDotCol}>
                      <View style={[styles.historyDot, idx === 0 && styles.historyDotActive]} />
                      {idx < prHistory.length - 1 && <View style={styles.historyLine} />}
                    </View>

                    {/* Content */}
                    <View style={styles.historyContent}>
                      <Text style={[styles.historyValue, idx === 0 && { color: P.GOLD }]}>
                        {item.value}{' '}
                        {item.record_type === 'max_weight'
                          ? 'kg'
                          : item.record_type === 'max_reps'
                          ? 'reps'
                          : 's'}
                      </Text>
                      <Text style={styles.historyDate}>
                        {new Date(item.achieved_at).toLocaleDateString(undefined, {
                          month: 'long',
                          day:   'numeric',
                          year:  'numeric',
                        })}
                      </Text>
                      {idx === 0 && (
                        <View style={styles.prNewBadge}>
                          <Text style={styles.prNewBadgeText}>NEW PR 🏆</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </Animated.View>
          </View>
        </Modal>
      </SafeAreaView>
    </AppShell>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  pageTitle: {
    fontSize:      28,
    fontWeight:    '800',
    color:         P.TEXT_PRI,
    letterSpacing: -0.5,
    marginTop:     2,
  },

  // Segmented tabs
  tabRow: {
    flexDirection:   'row',
    gap:             6,
    marginTop:       16,
    marginBottom:    18,
  },
  tabPill: {
    flex:              1,
    paddingVertical:   9,
    alignItems:        'center',
    borderRadius:      P.RADIUS_FULL,
    borderWidth:       1,
    borderColor:       P.CARD_BORDER,
    backgroundColor:   P.CARD_BG,
  },
  tabPillActive: {
    backgroundColor: 'rgba(57,255,106,0.10)',
    borderColor:     P.ACCENT_BORDER,
    ...Platform.select({
      ios: {
        shadowColor:   P.ACCENT,
        shadowOffset:  { width: 0, height: 0 },
        shadowOpacity: 0.30,
        shadowRadius:  8,
      },
    }),
  },
  tabText: {
    fontSize:      9,
    fontWeight:    '800',
    color:         P.TEXT_MUT,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tabTextActive: {
    color:         P.ACCENT,
    letterSpacing: 1,
  },

  // Weight hero card
  trendBadge: {
    borderWidth:       1,
    borderRadius:      P.RADIUS_FULL,
    paddingHorizontal: 10,
    paddingVertical:   4,
  },
  trendText: {
    fontSize:  10,
    fontWeight:'800',
    letterSpacing: 0.3,
  },
  currentWeightRow: {
    flexDirection: 'row',
    alignItems:    'baseline',
    gap:           6,
    marginBottom:  16,
  },
  currentWeightNum: {
    fontSize:      52,
    fontWeight:    '900',
    color:         P.ACCENT,
    letterSpacing: -2,
  },
  currentWeightUnit: {
    fontSize:   16,
    fontWeight: '700',
    color:      P.TEXT_SEC,
    marginBottom: 6,
  },
  weightStatBox: {
    gap: 4,
  },
  weightStatDivider: {
    width:           1,
    height:          32,
    backgroundColor: P.CARD_BORDER,
  },
  weightStatVal: {
    fontSize:   16,
    fontWeight: '800',
    color:      P.TEXT_PRI,
  },

  // Weight chart
  chartXLabel: {
    fontSize:  9,
    fontWeight:'700',
    color:     P.TEXT_MUT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Weight input
  inputWrap: {
    flex:              1,
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   P.BG,
    borderRadius:      P.RADIUS_SM,
    paddingHorizontal: 14,
    height:            46,
    gap:               10,
    borderWidth:       1,
    borderColor:       P.CARD_BORDER,
  },
  input: {
    flex:       1,
    color:      P.TEXT_PRI,
    fontSize:   14,
    fontWeight: '600',
    height:     '100%',
    padding:    0,
  },
  logBtn: {
    backgroundColor: P.ACCENT,
    paddingHorizontal: 22,
    height:          46,
    borderRadius:    P.RADIUS_SM,
    alignItems:      'center',
    justifyContent:  'center',
    ...Platform.select({
      android: { elevation: 8, borderWidth: 1, borderColor: P.ACCENT + '88' },
    }),
  },
  logBtnText: {
    color:         '#000',
    fontWeight:    '900',
    fontSize:      12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Empty chart
  emptyChartBox: {
    height:         140,
    justifyContent: 'center',
    alignItems:     'center',
    backgroundColor:'rgba(255,255,255,0.015)',
    borderRadius:   P.RADIUS_SM,
    borderWidth:    1,
    borderColor:    P.CARD_BORDER,
    marginBottom:   12,
    gap:            8,
  },
  emptyChartText: {
    fontSize:   11,
    color:      P.TEXT_MUT,
    fontWeight: '600',
    textAlign:  'center',
    paddingHorizontal: 20,
  },

  // AI Insight card
  insightCard: {
    borderColor: 'rgba(168,85,247,0.20)',
    ...Platform.select({
      ios: {
        shadowColor:   '#A855F7',
        shadowOffset:  { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius:  16,
      },
    }),
  },
  insightText: {
    fontSize:   13,
    color:      P.TEXT_SEC,
    lineHeight: 22,
    fontWeight: '500',
  },

  // Measurements
  measIconBox: {
    width:          38,
    height:         38,
    borderRadius:   11,
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  measLabel: {
    fontSize:   14,
    fontWeight: '700',
    color:      P.TEXT_PRI,
  },
  measDiff: {
    fontSize:   9,
    fontWeight: '800',
    marginTop:  2,
    textTransform:'uppercase',
    letterSpacing: 0.3,
  },
  measValue: {
    fontSize:   16,
    fontWeight: '800',
  },
  measEditBtn: {
    width:           28,
    height:          28,
    borderRadius:    14,
    backgroundColor: P.CARD_BORDER + '80',
    borderWidth:     1,
    borderColor:     P.CARD_BORDER,
    alignItems:      'center',
    justifyContent:  'center',
  },
  measSaveBtn: {
    width:           32,
    height:          32,
    borderRadius:    16,
    backgroundColor: P.ACCENT,
    alignItems:      'center',
    justifyContent:  'center',
  },
  measInput: {
    backgroundColor:   P.BG,
    color:             P.TEXT_PRI,
    paddingHorizontal: 10,
    paddingVertical:   6,
    borderRadius:      P.RADIUS_SM,
    borderWidth:       1,
    borderColor:       P.CARD_BORDER,
    fontSize:          14,
    fontWeight:        '700',
    minWidth:          70,
    textAlign:         'center',
  },

  // Photos
  photoAddBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               5,
    backgroundColor:   P.ACCENT_DIM,
    borderWidth:       1,
    borderColor:       P.ACCENT_BORDER,
    borderRadius:      P.RADIUS_FULL,
    paddingHorizontal: 12,
    paddingVertical:   6,
  },
  photoAddBtnText: {
    fontSize:      10,
    fontWeight:    '800',
    color:         P.ACCENT,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           10,
  },
  photoTile: {
    width:           '31%',
    aspectRatio:     3 / 4,
    borderRadius:    16,
    overflow:        'hidden',
    backgroundColor: P.CARD_BG,
    borderWidth:     1,
    borderColor:     P.CARD_BORDER,
  },
  photoDateChip: {
    position:          'absolute',
    bottom:            6,
    left:              6,
    backgroundColor:   'rgba(0,0,0,0.72)',
    borderRadius:      P.RADIUS_FULL,
    paddingHorizontal: 8,
    paddingVertical:   3,
  },
  photoDateText: {
    fontSize:   8,
    fontWeight: '800',
    color:      '#fff',
    textTransform:'uppercase',
    letterSpacing:0.5,
  },
  photoAddTile: {
    width:          '31%',
    aspectRatio:    3 / 4,
    borderRadius:   16,
    borderWidth:    2,
    borderStyle:    'dashed',
    borderColor:    P.ACCENT_BORDER,
    backgroundColor:'rgba(57,255,106,0.04)',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            6,
    ...Platform.select({
      ios: {
        shadowColor:   P.ACCENT,
        shadowOffset:  { width: 0, height: 0 },
        shadowOpacity: 0.20,
        shadowRadius:  10,
      },
    }),
  } as any,
  photoAddTileText: {
    fontSize:      9,
    fontWeight:    '800',
    color:         P.ACCENT,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textAlign:     'center',
  },

  // Empty states
  emptyState: {
    alignItems:    'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize:      17,
    fontWeight:    '800',
    color:         P.TEXT_PRI,
    marginBottom:  8,
    letterSpacing: -0.2,
  },
  emptyText: {
    fontSize:   12,
    color:      P.TEXT_MUT,
    textAlign:  'center',
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyActionBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               8,
    backgroundColor:   P.ACCENT,
    paddingHorizontal: 22,
    paddingVertical:   11,
    borderRadius:      P.RADIUS_FULL,
  },
  emptyActionText: {
    color:         '#000',
    fontWeight:    '900',
    fontSize:      12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // PRs
  prTrophyBox: {
    width:          38,
    height:         38,
    borderRadius:   11,
    backgroundColor: P.GOLD + '15',
    borderWidth:    1,
    borderColor:    P.GOLD + '30',
    alignItems:     'center',
    justifyContent: 'center',
  },
  prExercise: {
    fontSize:   14,
    fontWeight: '800',
    color:      P.TEXT_PRI,
    letterSpacing: -0.1,
  },
  prDate: {
    fontSize:   9,
    color:      P.TEXT_MUT,
    fontWeight: '700',
    textTransform:'uppercase',
    letterSpacing: 0.4,
    marginTop:  2,
  },
  prValue: {
    fontSize:   16,
    fontWeight: '900',
    color:      P.GOLD,
    letterSpacing: -0.3,
  },

  // PR Modal sheet
  modalOverlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent:  'flex-end',
  },
  modalSheet: {
    backgroundColor:      P.CARD_BG,
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    borderTopWidth:       1,
    borderColor:          P.CARD_BORDER,
    padding:              24,
    paddingBottom:        Platform.OS === 'ios' ? 44 : 24,
    maxHeight:            '72%',
  },
  sheetHandle: {
    width:           40,
    height:          4,
    borderRadius:    99,
    backgroundColor: P.CARD_BORDER,
    alignSelf:       'center',
    marginBottom:    20,
  },
  modalTitle: {
    fontSize:      20,
    fontWeight:    '800',
    color:         P.TEXT_PRI,
    letterSpacing: -0.3,
  },
  modalCloseBtn: {
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth:     1,
    borderColor:     P.CARD_BORDER,
    alignItems:      'center',
    justifyContent:  'center',
  },
  modalScroll: {
    marginTop: 20,
  },

  // PR history timeline
  historyItem: {
    flexDirection: 'row',
    marginBottom:  20,
  },
  historyDotCol: {
    width:    24,
    alignItems:'center',
  },
  historyDot: {
    width:           10,
    height:          10,
    borderRadius:    5,
    backgroundColor: P.CARD_BORDER,
    zIndex:          2,
    marginTop:       4,
  },
  historyDotActive: {
    backgroundColor: P.GOLD,
    ...Platform.select({
      ios: {
        shadowColor:   P.GOLD,
        shadowOffset:  { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius:  5,
      },
    }),
  },
  historyLine: {
    flex:            1,
    width:           1.5,
    backgroundColor: P.CARD_BORDER,
    marginTop:       4,
  },
  historyContent: {
    flex:       1,
    marginLeft: 14,
    paddingBottom: 4,
  },
  historyValue: {
    fontSize:   16,
    fontWeight: '800',
    color:      P.TEXT_PRI,
  },
  historyDate: {
    fontSize:   10,
    color:      P.TEXT_MUT,
    fontWeight: '700',
    textTransform:'uppercase',
    letterSpacing: 0.4,
    marginTop:  3,
  },
  prNewBadge: {
    alignSelf:         'flex-start',
    marginTop:         8,
    backgroundColor:   P.GOLD + '18',
    borderWidth:       1,
    borderColor:       P.GOLD + '40',
    borderRadius:      P.RADIUS_FULL,
    paddingHorizontal: 10,
    paddingVertical:   4,
  },
  prNewBadgeText: {
    fontSize:   9,
    fontWeight: '900',
    color:      P.GOLD,
    textTransform:'uppercase',
    letterSpacing: 0.8,
  },
});

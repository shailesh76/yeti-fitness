import { useRepositories } from '../hooks/useRepositories';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  TextInput,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/useAuthStore';
import { useFoodStore, MealLog } from '../store/useFoodStore';
import { useHydrationStore } from '../store/useHydrationStore';
/* removed supabase */
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
import { SkeletonLoader } from '../components/TelemetryComponents';
import { CalorieRing } from '../components/CalorieRing';
import { Ionicons } from '@expo/vector-icons';
import { P, glowStyle, sharedStyles } from '../constants/premiumTheme';

// ─── Constants ────────────────────────────────────────────────────────────────
const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS'] as const;

const MEAL_META: Record<string, { icon: string; emoji: string; color: string }> = {
  BREAKFAST: { icon: 'sunny-outline',    emoji: '🌅', color: P.AMBER },
  LUNCH:     { icon: 'partly-sunny-outline', emoji: '☀️', color: P.ACCENT },
  DINNER:    { icon: 'moon-outline',     emoji: '🌙', color: '#A855F7' },
  SNACKS:    { icon: 'nutrition-outline',emoji: '🍎', color: P.BLUE },
};

// Source icon helper
function sourceIcon(source?: string): { name: string; color: string } {
  switch (source) {
    case 'photo':   return { name: 'camera',        color: P.ACCENT };
    case 'barcode': return { name: 'barcode',       color: P.BLUE  };
    case 'manual':  return { name: 'create-outline',color: P.AMBER };
    default:        return { name: 'search',        color: P.TEXT_SEC };
  }
}

// ─── Animated progress bar ────────────────────────────────────────────────────
function AnimatedBar({ pct, color, delay = 0 }: { pct: number; color: string; delay?: number }) {
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withDelay(delay, withTiming(Math.min(pct, 100), { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [pct]);
  const style = useAnimatedStyle(() => ({ width: `${width.value}%` as any }));
  const barGlow = Platform.OS === 'ios'
    ? { shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 4 }
    : {};
  return (
    <View style={[sharedStyles.barBg, { borderColor: color + '22', borderWidth: 1 }]}>
      <Animated.View style={[sharedStyles.barFill, { backgroundColor: color }, barGlow, style]} />
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function FoodDiaryScreen() {
  const router   = useRouter();
  const session  = useAuthStore((s) => s.session);
  
  // Granular Zustand selectors to prevent unnecessary re-renders
  const mealLogs = useFoodStore((s) => s.mealLogs);
  const deleteMealLog = useFoodStore((s) => s.deleteMealLog);
  const updateMealLog = useFoodStore((s) => s.updateMealLog);
  const initSync = useFoodStore((s) => s.initSync);

  const waterGoal = useHydrationStore((s) => s.waterGoal);
  const getWaterForDate = useHydrationStore((s) => s.getWaterForDate);
  const addWaterForDate = useHydrationStore((s) => s.addWaterForDate);
  const resetWaterForDate = useHydrationStore((s) => s.resetWaterForDate);
  const loadGoal = useHydrationStore((s) => s.loadGoal);

  const { userRepository } = useRepositories();

  const [profile,          setProfile]          = useState<any>(null);
  const [loading,          setLoading]          = useState(true);
  const [editingLog,       setEditingLog]       = useState<MealLog | null>(null);
  const [editServingsText, setEditServingsText] = useState('');

  // Calendar states
  const [selectedDate,   setSelectedDate]   = useState<Date>(new Date());
  const [showMonthView,  setShowMonthView]  = useState(false);
  const [waterLogged,    setWaterLogged]    = useState(0);


  // Last 7 calendar days (for week strip)
  const calendarDays = React.useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d);
    }
    return days;
  }, []);

  // Month grid
  const monthDays = React.useMemo(() => {
    const year  = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const numDays  = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDay.getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= numDays; d++)   days.push(new Date(year, month, d));
    return days;
  }, [selectedDate.getFullYear(), selectedDate.getMonth()]);

  const dateStr = selectedDate.toDateString();
  const isToday = selectedDate.toDateString() === new Date().toDateString();

  useEffect(() => {
    if (session?.user?.id) {
      fetchProfile();
      loadGoal();
      initSync().finally(() => setLoading(false));
    }
  }, [session]);

  useEffect(() => {
    getWaterForDate(dateStr).then(setWaterLogged);
  }, [selectedDate]);

  const fetchProfile = async () => {
    try {
      let localProfile = await userRepository.getProfile(session!.user!.id);
      if (!localProfile) {
        const { data } = await userRepository.fetchProfileRemote(session!.user!.id);
        if (data) {
          localProfile = await userRepository.updateProfile(session!.user!.id, data);
        }
      }
      if (localProfile) setProfile(localProfile);
    } catch (e) {
      // Local WatermelonDB is unavailable on web (LOCAL_DB_UNAVAILABLE) — the
      // screen still works using whatever profile-derived defaults it already has.
      console.warn('Could not cache profile locally:', e);
    }
  };

  const getTargets = () => {
    switch (profile?.goal) {
      case 'BUILD_MUSCLE': return { calories: 2700, protein: 180, carbs: 320, fat: 80 };
      case 'LOSE_FAT':     return { calories: 1900, protein: 165, carbs: 180, fat: 55 };
      default:             return { calories: 2300, protein: 145, carbs: 260, fat: 75 };
    }
  };

  const handleEditServings = (log: MealLog) => {
    setEditingLog(log);
    setEditServingsText(log.servings.toString());
  };

  const handleSaveServings = async () => {
    if (!editingLog) return;
    const s = parseFloat(editServingsText);
    if (isNaN(s) || s <= 0) {
      Platform.OS === 'web' ? alert('Enter a positive number') : Alert.alert('Invalid', 'Enter a positive number');
      return;
    }
    await updateMealLog(editingLog.id, s);
    setEditingLog(null);
  };

  const handleAddWater = async () => {
    const newAmount = await addWaterForDate(250, dateStr);
    setWaterLogged(newAmount);
  };

  const handleResetWater = async () => {
    await resetWaterForDate(dateStr);
    setWaterLogged(0);
  };

  const handlePrevMonth = () => {
    const d = new Date(selectedDate);
    d.setMonth(d.getMonth() - 1);
    setSelectedDate(d);
  };

  const handleNextMonth = () => {
    const d = new Date(selectedDate);
    d.setMonth(d.getMonth() + 1);
    setSelectedDate(d);
  };

  // ── Derived nutrition values ────────────────────────────────────────────────
  const targets = getTargets();

  const activeLogs = mealLogs.filter((l) => {
    const logDate = new Date(l.logged_at);
    return (
      logDate.getDate()     === selectedDate.getDate()  &&
      logDate.getMonth()    === selectedDate.getMonth() &&
      logDate.getFullYear() === selectedDate.getFullYear()
    );
  });

  const totals = activeLogs.reduce(
    (acc, l) => {
      const f = l.food;
      if (!f) return acc;
      const s = l.servings;
      return {
        calories: acc.calories + f.calories * s,
        protein:  acc.protein  + f.protein  * s,
        carbs:    acc.carbs    + f.carbs    * s,
        fat:      acc.fat      + f.fat      * s,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const rt       = { calories: Math.round(totals.calories), protein: Math.round(totals.protein), carbs: Math.round(totals.carbs), fat: Math.round(totals.fat) };
  const calLeft  = Math.max(targets.calories - rt.calories, 0);
  const waterPct = Math.min((waterLogged / Math.max(waterGoal, 1)) * 100, 100);
  const proteinPct = Math.min((rt.protein / Math.max(targets.protein, 1)) * 100, 100);
  const carbsPct   = Math.min((rt.carbs   / Math.max(targets.carbs,   1)) * 100, 100);
  const fatPct     = Math.min((rt.fat     / Math.max(targets.fat,     1)) * 100, 100);

  const headerDate = selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

  if (loading) {
    return (
      <AppShell activeTab="nutrition">
        <SafeAreaView style={{ flex: 1, backgroundColor: P.BG, paddingHorizontal: 20, paddingTop: 40 }}>
          <SkeletonLoader rows={3} height={100} />
        </SafeAreaView>
      </AppShell>
    );
  }

  return (
    <AppShell activeTab="nutrition">
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
                <Text style={sharedStyles.labelCaps}>
                  {isToday ? 'TODAY' : headerDate.toUpperCase()}
                </Text>
                <Text style={styles.pageTitle}>Nutrition 🥗</Text>
              </View>
              {/* Calendar toggle button */}
              <TouchableOpacity
                onPress={() => setShowMonthView(!showMonthView)}
                style={sharedStyles.circleBtn}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showMonthView ? 'calendar' : 'calendar-outline'}
                  size={20}
                  color={showMonthView ? P.ACCENT : P.TEXT_PRI}
                />
              </TouchableOpacity>
            </Animated.View>

            {/* ══════════════════════════════════════════════════════════
                2. CALENDAR STRIP / MONTH VIEW
            ══════════════════════════════════════════════════════════ */}
            <Animated.View entering={FadeInDown.delay(50).duration(400)} style={styles.calCard}>
              {/* Month label + toggle */}
              <View style={[sharedStyles.rowBetween, { marginBottom: 10 }]}>
                <Text style={styles.calMonthLabel}>
                  {selectedDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }).toUpperCase()}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowMonthView(!showMonthView)}
                  style={styles.calToggleBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.calToggleText}>
                    {showMonthView ? 'WEEK' : 'MONTH'}
                  </Text>
                </TouchableOpacity>
              </View>

              {!showMonthView ? (
                /* ── Week strip ─────────────────────────────────────── */
                <View style={styles.weekRow}>
                  {calendarDays.map((day, idx) => {
                    const isSel   = day.toDateString() === selectedDate.toDateString();
                    const isTod   = day.toDateString() === new Date().toDateString();
                    return (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => setSelectedDate(day)}
                        style={[styles.calDay, isSel && styles.calDayActive]}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.calDayName, isSel && { color: P.ACCENT }]}>
                          {day.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1).toUpperCase()}
                        </Text>
                        <Text style={[
                          styles.calDayNum,
                          isSel  && { color: P.ACCENT, fontWeight: '900' },
                          isTod  && !isSel && { color: P.ACCENT },
                        ]}>
                          {day.getDate()}
                        </Text>
                        {isTod && !isSel && <View style={styles.calTodayDot} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                /* ── Month grid ─────────────────────────────────────── */
                <View>
                  <View style={[sharedStyles.rowBetween, { marginBottom: 8 }]}>
                    <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
                      <Ionicons name="chevron-back" size={16} color={P.TEXT_PRI} />
                    </TouchableOpacity>
                    <Text style={styles.navMonthText}>
                      {selectedDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    </Text>
                    <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
                      <Ionicons name="chevron-forward" size={16} color={P.TEXT_PRI} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.weekdaysRow}>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((wd, i) => (
                      <Text key={i} style={styles.weekdayHdr}>{wd}</Text>
                    ))}
                  </View>
                  <View style={styles.daysGrid}>
                    {monthDays.map((day, idx) => {
                      if (!day) return <View key={`e-${idx}`} style={styles.gridCell} />;
                      const isSel = day.toDateString() === selectedDate.toDateString();
                      const isTod = day.toDateString() === new Date().toDateString();
                      return (
                        <TouchableOpacity
                          key={day.toDateString()}
                          onPress={() => { setSelectedDate(day); setShowMonthView(false); }}
                          style={[styles.gridCell, isSel && styles.gridCellActive]}
                          activeOpacity={0.8}
                        >
                          <Text style={[
                            styles.gridDayText,
                            isSel && styles.gridDayTextActive,
                            isTod && !isSel && { color: P.ACCENT, fontWeight: '800' },
                          ]}>
                            {day.getDate()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </Animated.View>

            {/* ══════════════════════════════════════════════════════════
                3. CAPTURE TILES  —  Snap Photo (primary) | Barcode | Search
            ══════════════════════════════════════════════════════════ */}
            <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.captureTilesRow}>
              {/* Snap Photo — primary / brighter */}
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/food-search', params: { mealType: 'BREAKFAST', openCamera: 'photo' } })}
                style={[styles.captureTilePrimary, glowStyle(P.ACCENT, 14, 0.30)]}
                activeOpacity={0.8}
              >
                <View style={styles.captureTileIconWrap}>
                  <Ionicons name="camera" size={22} color="#000" />
                </View>
                <Text style={styles.captureTileLabelPrimary}>Snap{'\n'}Photo</Text>
              </TouchableOpacity>

              {/* Barcode — secondary */}
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/food-search', params: { mealType: 'BREAKFAST', openCamera: 'barcode' } })}
                style={styles.captureTileSecondary}
                activeOpacity={0.8}
              >
                <Ionicons name="barcode-outline" size={22} color={P.BLUE} />
                <Text style={styles.captureTileLabelSec}>Scan{'\n'}Barcode</Text>
              </TouchableOpacity>

              {/* Search — secondary */}
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/food-search', params: { mealType: 'BREAKFAST' } })}
                style={styles.captureTileSecondary}
                activeOpacity={0.8}
              >
                <Ionicons name="search" size={22} color={P.TEXT_SEC} />
                <Text style={styles.captureTileLabelSec}>Search{'\n'}Food</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* ══════════════════════════════════════════════════════════
                4. CALORIE RING CARD
            ══════════════════════════════════════════════════════════ */}
            <Animated.View
              entering={FadeInDown.delay(150).duration(500)}
              style={[sharedStyles.cardGlow]}
            >
              {/* Header row */}
              <View style={[sharedStyles.rowBetween, { marginBottom: 16 }]}>
                <Text style={sharedStyles.labelCaps}>NUTRITION OVERVIEW</Text>
                <View style={styles.goalPill}>
                  <Text style={styles.goalPillText}>
                    {profile?.goal === 'BUILD_MUSCLE' ? 'Build Muscle'
                     : profile?.goal === 'LOSE_FAT' ? 'Lose Fat'
                     : 'Maintain'}
                  </Text>
                </View>
              </View>

              {/* Ring + macro columns */}
              <View style={styles.ringRow}>
                {/* Ring */}
                <View style={{ alignItems: 'center' }}>
                  <CalorieRing remaining={calLeft} total={targets.calories} />
                  <Text style={styles.consumedText}>
                    {rt.calories} / {targets.calories} consumed
                  </Text>
                </View>

                {/* Macros */}
                <View style={styles.macroCols}>
                  <MacroCol label="PROTEIN" value={rt.protein}  max={targets.protein}  color={P.ACCENT_CYAN} pct={proteinPct} delay={200} />
                  <MacroCol label="CARBS"   value={rt.carbs}    max={targets.carbs}    color={P.BLUE}        pct={carbsPct}   delay={300} />
                  <MacroCol label="FAT"     value={rt.fat}      max={targets.fat}      color={P.AMBER}       pct={fatPct}     delay={400} />
                </View>
              </View>

              {/* Water intake row */}
              <View style={styles.waterRow}>
                <Ionicons name="water" size={16} color={P.BLUE} />
                <Text style={styles.waterLabel}>Water</Text>
                <Text style={styles.waterAmt}>
                  {Math.round(waterLogged / 250)} / {Math.round(waterGoal / 250)} cups
                </Text>
                <View style={{ flex: 1 }}>
                  <AnimatedBar pct={waterPct} color={P.BLUE} delay={500} />
                </View>
                <TouchableOpacity
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Log 250 milliliters of water"
                  onPress={handleAddWater}
                  style={styles.waterAddBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={16} color={P.BLUE} />
                </TouchableOpacity>
                <TouchableOpacity
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Reset water log for selected date"
                  onPress={handleResetWater}
                  style={styles.waterResetBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh-outline" size={14} color={P.TEXT_MUT} />
                </TouchableOpacity>
              </View>

            </Animated.View>

            {/* ══════════════════════════════════════════════════════════
                5. TODAY'S LOG — per meal-type sections
            ══════════════════════════════════════════════════════════ */}
            <Text style={[sharedStyles.labelCaps, { marginBottom: 10 }]}>TODAY&apos;S LOG</Text>

            {MEAL_TYPES.map((type, idx) => {
              const meta  = MEAL_META[type];
              const items = activeLogs.filter((l) => l.meal_type === type);
              const kcal  = items.reduce((a, l) => a + Math.round((l.food?.calories || 0) * l.servings), 0);

              return (
                <Animated.View
                  key={type}
                  entering={FadeInDown.delay(200 + idx * 60).duration(400)}
                  style={sharedStyles.card}
                >
                  {/* Section header */}
                  <View style={[sharedStyles.rowBetween, { marginBottom: items.length > 0 ? 12 : 0 }]}>
                    <View style={sharedStyles.row}>
                      <View style={[styles.mealIconBox, { backgroundColor: meta.color + '18', borderColor: meta.color + '30' }]}>
                        <Text style={{ fontSize: 15 }}>{meta.emoji}</Text>
                      </View>
                      <View style={{ marginLeft: 10 }}>
                        <Text style={styles.mealTitle}>{type}</Text>
                        {kcal > 0 && (
                          <Text style={[sharedStyles.labelCaps, { color: meta.color, marginTop: 1 }]}>
                            {kcal} kcal
                          </Text>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => router.push({ pathname: '/food-search', params: { mealType: type } })}
                      style={[styles.addBtn, { borderColor: meta.color + '40', backgroundColor: meta.color + '10' }]}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add" size={13} color={meta.color} />
                      <Text style={[styles.addBtnText, { color: meta.color }]}>Add</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Log items */}
                  {items.length === 0 ? (
                    <Text style={styles.emptyHint}>Nothing logged yet</Text>
                  ) : (
                    <View style={{ gap: 0 }}>
                      {items.map((log) => {
                        const src = sourceIcon(log.source);
                        const logTime = new Date(log.logged_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                        return (
                          <View
                            key={log.id}
                            style={[
                              sharedStyles.row,
                              styles.logRow,
                            ]}
                          >
                            {/* Source icon tile */}
                            <View style={[styles.srcIconBox, { backgroundColor: src.color + '15', borderColor: src.color + '30' }]}>
                              <Ionicons name={src.name as any} size={12} color={src.color} />
                            </View>

                            {/* Name + meta */}
                            <View style={{ flex: 1, paddingHorizontal: 10 }}>
                              <Text style={styles.logFoodName} numberOfLines={1}>{log.food?.name}</Text>
                              <Text style={styles.logFoodMeta}>
                                {type.charAt(0) + type.slice(1).toLowerCase()} · {logTime}
                                {'  ·  '}{log.servings}× serving
                              </Text>
                            </View>

                            {/* Kcal + actions */}
                            <View style={{ alignItems: 'flex-end', gap: 4 }}>
                              <Text style={styles.logKcal}>
                                {Math.round((log.food?.calories || 0) * log.servings)} kcal
                              </Text>
                              <View style={[sharedStyles.row, { gap: 6 }]}>
                                <TouchableOpacity
                                  onPress={() => handleEditServings(log)}
                                  style={styles.logActionBtn}
                                  activeOpacity={0.7}
                                >
                                  <Text style={styles.logActionText}>Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => deleteMealLog(log.id)}
                                  style={[styles.logActionBtn, styles.logDeleteBtn]}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="close" size={11} color={P.RED} />
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </Animated.View>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* ══════════════════════════════════════════════════════════
            EDIT SERVINGS MODAL
        ══════════════════════════════════════════════════════════ */}
        {editingLog && (
          <View style={styles.overlay}>
            <Animated.View entering={FadeInDown.duration(300)} style={styles.modal}>
              <Text style={styles.modalTitle}>Edit Servings</Text>
              <Text style={styles.modalSub}>{editingLog.food?.name}</Text>
              <TextInput
                keyboardType="numeric"
                style={styles.modalInput}
                value={editServingsText}
                onChangeText={setEditServingsText}
                selectTextOnFocus
              />
              <View style={[sharedStyles.row, { gap: 12, marginTop: 16 }]}>
                <TouchableOpacity
                  onPress={() => setEditingLog(null)}
                  style={[styles.modalBtn, styles.modalBtnGhost]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalBtnGhostText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveServings}
                  style={[styles.modalBtn, styles.modalBtnPrimary, glowStyle(P.ACCENT, 10, 0.35)]}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalBtnPrimaryText}>Save</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        )}
      </SafeAreaView>
    </AppShell>
  );
}

// ─── Macro column sub-component ──────────────────────────────────────────────
function MacroCol({ label, value, max, color, pct, delay }: {
  label: string; value: number; max: number; color: string; pct: number; delay: number;
}) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={[styles.macroLabel, { color }]}>{label}</Text>
      <Text style={styles.macroValue}>
        {value}g
        <Text style={styles.macroMax}> /{max}g</Text>
      </Text>
      <AnimatedBar pct={pct} color={color} delay={delay} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  pageTitle: {
    fontSize:      28,
    fontWeight:    '800',
    color:         P.TEXT_PRI,
    letterSpacing: -0.5,
  },

  // Calendar
  calCard: {
    backgroundColor: P.CARD_BG,
    borderWidth:     1,
    borderColor:     P.CARD_BORDER,
    borderRadius:    P.RADIUS_CARD,
    padding:         14,
    marginBottom:    14,
  },
  calMonthLabel: {
    fontSize:      10,
    fontWeight:    '800',
    color:         P.TEXT_PRI,
    letterSpacing: 1,
  },
  calToggleBtn: {
    backgroundColor: P.ACCENT_DIM,
    borderWidth:     1,
    borderColor:     P.ACCENT_BORDER,
    borderRadius:    P.RADIUS_FULL,
    paddingHorizontal: 10,
    paddingVertical:   4,
  },
  calToggleText: {
    fontSize:      9,
    fontWeight:    '800',
    color:         P.ACCENT,
    letterSpacing: 0.8,
  },
  weekRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
  },
  calDay: {
    flex:           1,
    alignItems:     'center',
    paddingVertical: 6,
    borderRadius:   10,
    gap:             2,
  },
  calDayActive: {
    backgroundColor: 'rgba(57,255,106,0.08)',
    borderWidth:     2,
    borderColor:     P.ACCENT,
    ...Platform.select({
      ios: { shadowColor: P.ACCENT, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 8 },
    }),
  },
  calDayName: {
    fontSize:      9,
    fontWeight:    '700',
    color:         P.TEXT_SEC,
    letterSpacing: 0.5,
  },
  calDayNum: {
    fontSize:   14,
    fontWeight: '700',
    color:      P.TEXT_PRI,
    marginTop:  2,
  },
  calTodayDot: {
    width:           5,
    height:          5,
    borderRadius:    99,
    backgroundColor: P.ACCENT,
    marginTop:       2,
    ...Platform.select({
      ios: { shadowColor: P.ACCENT, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4 },
    }),
  },
  // Month view
  navBtn: {
    width:           32,
    height:          32,
    borderRadius:    16,
    backgroundColor: P.CARD_BG,
    borderWidth:     1,
    borderColor:     P.CARD_BORDER,
    alignItems:      'center',
    justifyContent:  'center',
  },
  navMonthText: {
    fontSize:   13,
    fontWeight: '700',
    color:      P.TEXT_PRI,
  },
  weekdaysRow: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    paddingHorizontal: 2,
    marginBottom:    4,
  },
  weekdayHdr: {
    width:     '14.28%',
    textAlign: 'center',
    fontSize:  9,
    fontWeight:'800',
    color:     P.TEXT_MUT,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    justifyContent:'flex-start',
  },
  gridCell: {
    width:          '14.28%',
    height:         36,
    alignItems:     'center',
    justifyContent: 'center',
    borderRadius:   8,
    marginVertical: 2,
  },
  gridCellActive: {
    backgroundColor: 'rgba(57,255,106,0.10)',
    borderWidth:     1,
    borderColor:     P.ACCENT_BORDER,
  },
  gridDayText: {
    fontSize:   12,
    fontWeight: '700',
    color:      P.TEXT_SEC,
  },
  gridDayTextActive: {
    color:      P.ACCENT,
    fontWeight: '900',
  },

  // Capture tiles
  captureTilesRow: {
    flexDirection: 'row',
    gap:           10,
    marginBottom:  14,
  },
  captureTilePrimary: {
    flex:            1.3,
    backgroundColor: P.ACCENT,
    borderRadius:    P.RADIUS_CARD,
    padding:         16,
    alignItems:      'center',
    gap:             8,
    ...Platform.select({
      android: { elevation: 10, borderWidth: 1, borderColor: P.ACCENT + '88' },
    }),
  },
  captureTileIconWrap: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  captureTileLabelPrimary: {
    fontSize:      11,
    fontWeight:    '900',
    color:         '#000',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textAlign:     'center',
  },
  captureTileSecondary: {
    flex:            1,
    backgroundColor: P.CARD_BG,
    borderWidth:     1,
    borderColor:     P.CARD_BORDER,
    borderRadius:    P.RADIUS_CARD,
    padding:         16,
    alignItems:      'center',
    gap:             8,
  },
  captureTileLabelSec: {
    fontSize:      10,
    fontWeight:    '700',
    color:         P.TEXT_SEC,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    textAlign:     'center',
  },

  // Calorie ring card
  goalPill: {
    backgroundColor: P.ACCENT_DIM,
    borderWidth:     1,
    borderColor:     P.ACCENT_GLOW,
    borderRadius:    P.RADIUS_FULL,
    paddingHorizontal: 10,
    paddingVertical:   4,
  },
  goalPillText: {
    fontSize:      9,
    fontWeight:    '800',
    color:         P.ACCENT,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  ringRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           18,
    marginBottom:  16,
  },
  consumedText: {
    fontSize:  9,
    color:     P.TEXT_MUT,
    marginTop: 6,
    fontWeight:'600',
  },
  macroCols: {
    flex:          1,
    gap:           12,
  },
  macroLabel: {
    fontSize:      9,
    fontWeight:    '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  macroValue: {
    fontSize:   13,
    fontWeight: '800',
    color:      P.TEXT_PRI,
  },
  macroMax: {
    fontSize:   11,
    fontWeight: '500',
    color:      P.TEXT_MUT,
  },

  // Water row
  waterRow: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             8,
    borderTopWidth:  1,
    borderTopColor:  P.CARD_BORDER,
    paddingTop:      14,
  },
  waterLabel: {
    fontSize:   11,
    fontWeight: '700',
    color:      P.TEXT_SEC,
  },
  waterAmt: {
    fontSize:   11,
    fontWeight: '600',
    color:      P.BLUE,
  },
  waterAddBtn: {
    width:           36,
    height:          36,
    minHeight:       44,
    minWidth:        44,
    borderRadius:    18,
    backgroundColor: P.BLUE + '18',
    borderWidth:     1,
    borderColor:     P.BLUE + '44',
    alignItems:      'center',
    justifyContent:  'center',
  },
  waterResetBtn: {
    width:           36,
    height:          36,
    minHeight:       44,
    minWidth:        44,
    borderRadius:    18,
    backgroundColor: P.CARD_BORDER + '88',
    alignItems:      'center',
    justifyContent:  'center',
  },

  // Meal sections
  mealIconBox: {
    width:          36,
    height:         36,
    borderRadius:   10,
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  mealTitle: {
    fontSize:      13,
    fontWeight:    '800',
    color:         P.TEXT_PRI,
    textTransform: 'capitalize',
  },
  addBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             4,
    paddingHorizontal: 14,
    paddingVertical:   8,
    minHeight:       44,
    justifyContent:  'center',
    borderRadius:    P.RADIUS_FULL,
    borderWidth:     1,
  },
  addBtnText: {
    fontSize:      11,
    fontWeight:    '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyHint: {
    fontSize:   11,
    color:      P.TEXT_MUT,
    fontStyle:  'italic',
    marginTop:  6,
  },

  // Log items
  logRow: {
    paddingVertical:   10,
    borderTopWidth:    1,
    borderTopColor:    P.CARD_BORDER + '60',
    justifyContent:    'space-between',
  },
  srcIconBox: {
    width:          26,
    height:         26,
    borderRadius:   8,
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  logFoodName: {
    fontSize:   13,
    fontWeight: '700',
    color:      P.TEXT_PRI,
  },
  logFoodMeta: {
    fontSize:   9,
    color:      P.TEXT_MUT,
    fontWeight: '600',
    marginTop:  2,
  },
  logKcal: {
    fontSize:   12,
    fontWeight: '800',
    color:      P.ACCENT,
  },
  logActionBtn: {
    paddingHorizontal: 10,
    paddingVertical:   6,
    minHeight:         44,
    minWidth:          44,
    justifyContent:    'center',
    alignItems:        'center',
    backgroundColor:   P.CARD_BORDER + '80',
    borderRadius:      8,
    borderWidth:       1,
    borderColor:       P.CARD_BORDER,
  },

  logDeleteBtn: {
    backgroundColor: P.RED + '10',
    borderColor:     P.RED + '30',
  },
  logActionText: {
    color:     P.TEXT_SEC,
    fontSize:  9,
    fontWeight:'700',
  },

  // Edit modal
  overlay: {
    position:        'absolute',
    inset:           0,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         24,
  } as any,
  modal: {
    backgroundColor: P.CARD_BG,
    borderRadius:    P.RADIUS_CARD,
    padding:         24,
    width:           '100%',
    maxWidth:        380,
    borderWidth:     1,
    borderColor:     P.CARD_BORDER,
  },
  modalTitle: {
    fontSize:      18,
    fontWeight:    '800',
    color:         P.TEXT_PRI,
    letterSpacing: -0.3,
  },
  modalSub: {
    fontSize:   12,
    color:      P.TEXT_MUT,
    marginTop:  4,
    marginBottom: 20,
    fontWeight: '600',
  },
  modalInput: {
    backgroundColor: P.BG,
    color:           P.TEXT_PRI,
    paddingHorizontal: 16,
    paddingVertical:   14,
    borderRadius:    P.RADIUS_SM,
    borderWidth:     1,
    borderColor:     P.CARD_BORDER,
    textAlign:       'center',
    fontSize:        22,
    fontWeight:      '700',
  },
  modalBtn: {
    flex:           1,
    paddingVertical: 14,
    borderRadius:   P.RADIUS_SM,
    alignItems:     'center',
  },
  modalBtnGhost: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth:     1,
    borderColor:     P.CARD_BORDER,
  },
  modalBtnGhostText: {
    color:     P.TEXT_SEC,
    fontWeight:'700',
    fontSize:  13,
  },
  modalBtnPrimary: {
    backgroundColor: P.ACCENT,
    ...Platform.select({
      android: { borderWidth: 1, borderColor: P.ACCENT + '88', elevation: 8 },
    }),
  },
  modalBtnPrimaryText: {
    color:     '#000',
    fontWeight:'900',
    fontSize:  13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

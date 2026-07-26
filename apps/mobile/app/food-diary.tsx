import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  TextInput,
  StyleSheet,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import AppShell from '../components/AppShell';
import CalorieRing from '../components/CalorieRing';
import { useAuthStore } from '../store/useAuthStore';
import { useFoodStore, MealLog } from '../store/useFoodStore';
import { useHydrationStore } from '../store/useHydrationStore';
import { useRepositories } from '../hooks/useRepositories';

// The meal buckets shown in the diary. Real logs are grouped under these by
// their meal_type — no sample/placeholder foods.
const MEAL_TYPES: { key: string; title: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'BREAKFAST', title: 'Breakfast', icon: 'sunny-outline' },
  { key: 'LUNCH',     title: 'Lunch',     icon: 'restaurant-outline' },
  { key: 'DINNER',    title: 'Dinner',    icon: 'moon-outline' },
  { key: 'SNACK',     title: 'Snacks',    icon: 'nutrition-outline' },
];

// Normalise the various meal_type spellings the logging flows may use.
function normalizeMealType(mt?: string): string {
  const u = (mt || '').toUpperCase();
  if (u.startsWith('SNACK')) return 'SNACK';
  if (u.startsWith('BREAK')) return 'BREAKFAST';
  if (u.startsWith('LUNCH')) return 'LUNCH';
  if (u.startsWith('DINNER')) return 'DINNER';
  return u || 'SNACK';
}

export default function FoodDiaryScreen() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const { width: windowWidth } = useWindowDimensions();

  const isDesktop = windowWidth >= 768;
  const isNarrowScreen = windowWidth < 360;

  // Store selectors
  const mealLogs = useFoodStore((s) => s.mealLogs);
  const deleteMealLog = useFoodStore((s) => s.deleteMealLog);
  const updateMealLog = useFoodStore((s) => s.updateMealLog);
  const initSync = useFoodStore((s) => s.initSync);

  const waterGoal = useHydrationStore((s) => s.waterGoal);
  const getWaterForDate = useHydrationStore((s) => s.getWaterForDate);
  const addWaterForDate = useHydrationStore((s) => s.addWaterForDate);
  const loadGoal = useHydrationStore((s) => s.loadGoal);

  const { userRepository } = useRepositories();

  // Selected date & calendar view state — defaults to today, not a fixed date.
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [waterLogged, setWaterLogged] = useState(0);
  const [waterStreak, setWaterStreak] = useState(0);

  // Goal targets — seeded from the user's profile on load (fallbacks only apply
  // if the profile has none), and editable via the Goals modal.
  const [calorieGoal, setCalorieGoal] = useState(2400);
  const [proteinGoal, setProteinGoal] = useState(160);
  const [carbsGoal, setCarbsGoal] = useState(250);
  const [fatGoal, setFatGoal] = useState(80);

  // Modal & Target Adjustment state
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [modalMode, setModalMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [editingLog, setEditingLog] = useState<MealLog | null>(null);
  const [editServingsText, setEditServingsText] = useState('');

  // Selected Meal Detail Modal State
  const [selectedMealTypeModal, setSelectedMealTypeModal] = useState<string | null>(null);

  // BMI & BMR Auto Calculator Inputs
  const [weightKg, setWeightKg] = useState('75');
  const [heightCm, setHeightCm] = useState('178');
  const [age, setAge] = useState('26');
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [activityLevel, setActivityLevel] = useState<number>(1.375); // Light active
  const [fitnessGoal, setFitnessGoal] = useState<'LOSE' | 'MAINTAIN' | 'BUILD'>('MAINTAIN');

  const dateStr = selectedDate.toDateString();

  useEffect(() => {
    if (session?.user?.id) {
      loadGoal();
      initSync().catch(() => {});
      // Seed calorie/macro goals from the athlete's real profile targets.
      userRepository.getProfile(session.user.id).then((profile: any) => {
        if (!profile) return;
        if (profile.target_calories) setCalorieGoal(profile.target_calories);
        if (profile.target_protein) setProteinGoal(profile.target_protein);
        if (profile.target_carbs) setCarbsGoal(profile.target_carbs);
        if (profile.target_fat) setFatGoal(profile.target_fat);
        if (profile.weight_kg) setWeightKg(String(profile.weight_kg));
        if (profile.height_cm) setHeightCm(String(profile.height_cm));
        if (profile.age) setAge(String(profile.age));
      }).catch(() => {});
    }
  }, [session]);

  useEffect(() => {
    getWaterForDate(dateStr).then(setWaterLogged);
  }, [selectedDate]);

  // Real water streak: consecutive days up to the selected date with any water
  // logged (reads the per-day values the hydration store persists).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let streak = 0;
      for (let i = 0; i < 60; i++) {
        const d = new Date(selectedDate);
        d.setDate(selectedDate.getDate() - i);
        const ml = await getWaterForDate(d.toDateString());
        if (ml > 0) streak += 1;
        else if (i === 0) continue; // today not logged yet — don't break the run
        else break;
      }
      if (!cancelled) setWaterStreak(streak);
    })();
    return () => { cancelled = true; };
  }, [selectedDate, waterLogged]);

  // Derived meal items
  const activeLogs = mealLogs.filter((l) => {
    const logDate = new Date(l.logged_at);
    return (
      logDate.getDate() === selectedDate.getDate() &&
      logDate.getMonth() === selectedDate.getMonth() &&
      logDate.getFullYear() === selectedDate.getFullYear()
    );
  });

  const totals = useMemo(() => {
    return activeLogs.reduce(
      (acc, l) => {
        const f = l.food;
        if (!f) return acc;
        const s = l.servings;
        return {
          calories: acc.calories + f.calories * s,
          protein: acc.protein + f.protein * s,
          carbs: acc.carbs + f.carbs * s,
          fat: acc.fat + f.fat * s,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [activeLogs]);

  // Real per-meal-type groups for the selected day (no sample foods).
  const mealGroups = useMemo(() => {
    return MEAL_TYPES.map((mt) => {
      const logs = activeLogs.filter((l) => normalizeMealType(l.meal_type) === mt.key);
      const kcal = logs.reduce((sum, l) => sum + Math.round((l.food?.calories || 0) * l.servings), 0);
      const description = logs.map((l) => l.food?.name).filter(Boolean).join(', ');
      return { ...mt, logs, kcal, description };
    }).filter((g) => g.logs.length > 0);
  }, [activeLogs]);

  // Real nutrition streak: consecutive days (ending today) with ≥1 logged meal.
  const nutritionStreak = useMemo(() => {
    const daysWithLogs = new Set(mealLogs.map((l) => new Date(l.logged_at).toDateString()));
    let streak = 0;
    for (let i = 0; i < 90; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      if (daysWithLogs.has(d.toDateString())) streak += 1;
      else if (i === 0) continue; // today not logged yet
      else break;
    }
    return streak;
  }, [mealLogs]);

  const consumedCalories = Math.round(totals.calories);
  const remainingCalories = Math.max(calorieGoal - consumedCalories, 0);
  const goalPercentage = Math.min(Math.round((consumedCalories / Math.max(calorieGoal, 1)) * 100), 100);

  const proteinVal = Math.round(totals.protein);
  const carbsVal = Math.round(totals.carbs);
  const fatVal = Math.round(totals.fat);

  const proteinPct = Math.min((proteinVal / Math.max(proteinGoal, 1)) * 100, 100);
  const carbsPct = Math.min((carbsVal / Math.max(carbsGoal, 1)) * 100, 100);
  const fatPct = Math.min((fatVal / Math.max(fatGoal, 1)) * 100, 100);

  // Water formatting (2.1 / 3L)
  const waterLiters = (waterLogged / 1000).toFixed(1);
  const waterGoalLiters = (waterGoal / 1000).toFixed(0);
  const filledWaterDropsCount = Math.min(Math.floor((waterLogged / 3000) * 7), 7);

  // Date Header string (e.g. "Monday, 20 May")
  const dateFormatted = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });

  // ─── Automatic BMI & BMR Calculation Logic ─────────────────────────────────
  const calculatedMetrics = useMemo(() => {
    const w = parseFloat(weightKg) || 75;
    const h = parseFloat(heightCm) || 178;
    const a = parseInt(age, 10) || 26;

    const heightM = h / 100;
    const bmi = heightM > 0 ? (w / (heightM * heightM)) : 22;

    let bmiCategory = 'Normal';
    let bmiColor = '#22C55E';
    if (bmi < 18.5) {
      bmiCategory = 'Underweight';
      bmiColor = '#EAB308';
    } else if (bmi >= 25 && bmi < 29.9) {
      bmiCategory = 'Overweight';
      bmiColor = '#F97316';
    } else if (bmi >= 30) {
      bmiCategory = 'Obese';
      bmiColor = '#EF4444';
    }

    let bmr = 10 * w + 6.25 * h - 5 * a + (gender === 'MALE' ? 5 : -161);
    let tdee = bmr * activityLevel;

    if (fitnessGoal === 'LOSE') tdee -= 450;
    if (fitnessGoal === 'BUILD') tdee += 300;

    const calcCalories = Math.round(tdee);
    const calcProtein = Math.round((calcCalories * 0.28) / 4);
    const calcCarbs = Math.round((calcCalories * 0.45) / 4);
    const calcFat = Math.round((calcCalories * 0.27) / 9);

    return {
      bmi: bmi.toFixed(1),
      bmiCategory,
      bmiColor,
      calcCalories,
      calcProtein,
      calcCarbs,
      calcFat,
    };
  }, [weightKg, heightCm, age, gender, activityLevel, fitnessGoal]);

  const handleApplyAutoBMI = () => {
    setCalorieGoal(calculatedMetrics.calcCalories);
    setProteinGoal(calculatedMetrics.calcProtein);
    setCarbsGoal(calculatedMetrics.calcCarbs);
    setFatGoal(calculatedMetrics.calcFat);
    setShowGoalModal(false);
  };

  // Honest insight derived from the day's real numbers — not a canned message.
  const insight = useMemo(() => {
    if (activeLogs.length === 0) {
      return { title: 'Nothing logged yet', text: `Add a meal to start tracking toward your ${calorieGoal.toLocaleString()} kcal goal.`, ok: false };
    }
    if (proteinVal >= proteinGoal * 0.9) {
      return { title: 'Great job!', text: "You're on track to hit your protein goal today.", ok: true };
    }
    if (consumedCalories > calorieGoal) {
      return { title: 'Over your goal', text: `You're ${(consumedCalories - calorieGoal).toLocaleString()} kcal over today's target.`, ok: false };
    }
    return { title: 'Keep going', text: `${remainingCalories.toLocaleString()} kcal and ${Math.max(proteinGoal - proteinVal, 0)}g protein left to reach today's goals.`, ok: true };
  }, [activeLogs.length, proteinVal, proteinGoal, consumedCalories, calorieGoal, remainingCalories]);

  const handleAddWater = async () => {
    const newAmount = await addWaterForDate(300, dateStr);
    setWaterLogged(newAmount || waterLogged + 300);
  };

  const handleEditServings = (log: MealLog) => {
    setEditingLog(log);
    setEditServingsText(log.servings.toString());
  };

  const handleSaveServings = async () => {
    if (!editingLog) return;
    const s = parseFloat(editServingsText);
    if (isNaN(s) || s <= 0) return;
    await updateMealLog(editingLog.id, s);
    setEditingLog(null);
  };

  // ─── Sub-components for Layout Sections ─────────────────────────────────────
  const renderCalorieSummaryCard = () => (
    <View style={styles.card}>
      <Text style={styles.sectionHeaderLabel}>CALORIE SUMMARY</Text>

      <View style={[styles.summarySplitRow, isNarrowScreen && { flexDirection: 'column', alignItems: 'center' }]}>
        <View style={styles.ringWrapper}>
          <CalorieRing
            consumed={consumedCalories}
            total={calorieGoal}
            size={isNarrowScreen ? 125 : 142}
            strokeWidth={isNarrowScreen ? 11 : 13}
            gradientColors={['#FF7A00', '#F97316']}
          />
        </View>

        <View style={[styles.goalsWrapper, isNarrowScreen && { marginLeft: 0, marginTop: 14, alignItems: 'center' }]}>
          <View style={[styles.goalLine, isNarrowScreen && { alignItems: 'center' }]}>
            <Text style={styles.goalLabel}>Daily Goal</Text>
            <View style={styles.rowAlign}>
              <Text style={styles.goalValue}>{calorieGoal.toLocaleString()} kcal</Text>
              <TouchableOpacity
                onPress={() => setShowGoalModal(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ marginLeft: 6 }}
              >
                <Ionicons name="pencil-outline" size={15} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.goalLine, { marginTop: 10 }, isNarrowScreen && { alignItems: 'center' }]}>
            <Text style={styles.goalLabel}>Remaining</Text>
            <Text style={styles.remainingValue}>{remainingCalories.toLocaleString()} kcal</Text>
          </View>

          <View style={styles.percentageBadge}>
            <Text style={styles.percentageBadgeText}>{goalPercentage}% of goal</Text>
          </View>
        </View>
      </View>

      <View style={styles.macrosContainer}>
        {/* Protein */}
        <View style={styles.macroRow}>
          <View style={styles.macroLabelCol}>
            <View style={[styles.macroDot, { backgroundColor: '#A855F7' }]} />
            <Text style={styles.macroNameText}>Protein</Text>
          </View>
          <View style={styles.macroBarTrack}>
            <View style={[styles.macroBarFill, { width: `${proteinPct}%`, backgroundColor: '#8B5CF6' }]} />
          </View>
          <Text style={styles.macroValText}>
            {proteinVal} <Text style={{ color: '#64748B' }}>/ {proteinGoal}g</Text>
          </Text>
        </View>

        {/* Carbs */}
        <View style={styles.macroRow}>
          <View style={styles.macroLabelCol}>
            <View style={[styles.macroDot, { backgroundColor: '#EAB308' }]} />
            <Text style={styles.macroNameText}>Carbs</Text>
          </View>
          <View style={styles.macroBarTrack}>
            <View style={[styles.macroBarFill, { width: `${carbsPct}%`, backgroundColor: '#EAB308' }]} />
          </View>
          <Text style={styles.macroValText}>
            {carbsVal} <Text style={{ color: '#64748B' }}>/ {carbsGoal}g</Text>
          </Text>
        </View>

        {/* Fats */}
        <View style={styles.macroRow}>
          <View style={styles.macroLabelCol}>
            <Ionicons name="water" size={13} color="#22C55E" style={{ marginRight: 6 }} />
            <Text style={styles.macroNameText}>Fats</Text>
          </View>
          <View style={styles.macroBarTrack}>
            <View style={[styles.macroBarFill, { width: `${fatPct}%`, backgroundColor: '#22C55E' }]} />
          </View>
          <Text style={styles.macroValText}>
            {fatVal} <Text style={{ color: '#64748B' }}>/ {fatGoal}g</Text>
          </Text>
        </View>
      </View>
    </View>
  );

  const renderMealsSection = () => (
    <View>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeaderLabel}>MEALS & LOGS</Text>
        <Text style={styles.sectionHeaderSubKcal}>{consumedCalories.toLocaleString()} kcal</Text>
      </View>

      <View style={styles.card}>
        {mealGroups.length > 0 ? (
          mealGroups.map((group, idx) => (
            <React.Fragment key={group.key}>
              {idx > 0 && <View style={styles.divider} />}
              <TouchableOpacity
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={`${group.title}, ${group.kcal} kcal. Tap to view items.`}
                onPress={() => setSelectedMealTypeModal(group.key)}
                style={styles.mealItemRow}
              >
                <View style={styles.loggedSourceBox}>
                  <Ionicons name={group.icon} size={20} color="#38BDF8" />
                </View>
                <View style={styles.mealTextCol}>
                  <Text style={styles.mealTitleText}>{group.title}</Text>
                  <Text style={styles.mealSubText} numberOfLines={1}>{group.description}</Text>
                  <Text style={styles.mealKcalText}>{group.kcal} kcal</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#64748B" />
              </TouchableOpacity>
            </React.Fragment>
          ))
        ) : (
          <View style={styles.emptyMealsBox}>
            <Ionicons name="restaurant-outline" size={30} color="#64748B" />
            <Text style={styles.emptyMealsTitle}>No meals logged yet</Text>
            <Text style={styles.emptyMealsSub}>Scan, search, or add a food to start today&apos;s diary.</Text>
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Add meal or snack"
          onPress={() => router.push('/food-search')}
          style={styles.addMealBtn}
        >
          <Ionicons name="add-circle-outline" size={18} color="#3B82F6" style={{ marginRight: 6 }} />
          <Text style={styles.addMealBtnText}>Add Meal / Snack</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderWaterSection = () => (
    <View>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeaderLabel}>WATER INTAKE</Text>
        <Text style={styles.sectionHeaderSubKcal}>{waterLiters} / {waterGoalLiters}L</Text>
      </View>

      <View style={[styles.card, styles.waterCardRow]}>
        <View style={styles.dropsRow}>
          {[1, 2, 3, 4, 5, 6, 7].map((num) => {
            const isFilled = num <= filledWaterDropsCount;
            return (
              <Ionicons
                key={num}
                name="water"
                size={20}
                color={isFilled ? '#38BDF8' : 'rgba(255, 255, 255, 0.18)'}
                style={{ marginRight: isNarrowScreen ? 4 : 8 }}
              />
            );
          })}
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleAddWater}
          style={styles.waterAddSquareBtn}
        >
          <Ionicons name="add" size={18} color="#38BDF8" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderInsightsSection = () => (
    <View>
      <Text style={styles.sectionHeaderLabel}>NUTRITION INSIGHTS</Text>

      <TouchableOpacity
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`${insight.title}. ${insight.text}. View analytics.`}
        onPress={() => router.push('/analytics')}
        style={[styles.card, styles.insightCardRow]}
      >
        <View style={[styles.insightCheckBadge, !insight.ok && { backgroundColor: '#F97316' }]}>
          <Ionicons name={insight.ok ? 'checkmark' : 'information'} size={16} color="#FFFFFF" />
        </View>
        <View style={styles.insightTextCol}>
          <Text style={styles.insightTitleText}>{insight.title}</Text>
          <Text style={styles.insightSubText}>{insight.text}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#64748B" />
      </TouchableOpacity>
    </View>
  );

  const renderQuickAddSection = () => (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.sectionHeaderLabel}>QUICK ADD</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickAddRow}
      >
        {/* Scan Food → the AI Food Scanner screen */}
        <TouchableOpacity
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Scan food with the AI scanner"
          onPress={() => router.push('/ai-food-scan')}
          style={styles.quickAddTileItem}
        >
          <View style={[styles.quickAddBox, { borderColor: 'rgba(56, 189, 248, 0.35)' }]}>
            <Ionicons name="camera-outline" size={22} color="#38BDF8" />
          </View>
          <Text style={styles.quickAddLabel}>Scan Food</Text>
        </TouchableOpacity>

        {/* Search Food */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/food-search')}
          style={styles.quickAddTileItem}
        >
          <View style={[styles.quickAddBox, { borderColor: 'rgba(59, 130, 246, 0.35)' }]}>
            <Ionicons name="search-outline" size={22} color="#3B82F6" />
          </View>
          <Text style={styles.quickAddLabel}>Search Food</Text>
        </TouchableOpacity>

        {/* Add Recipe */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/food-search')}
          style={styles.quickAddTileItem}
        >
          <View style={[styles.quickAddBox, { borderColor: 'rgba(168, 85, 247, 0.35)' }]}>
            <Ionicons name="restaurant-outline" size={22} color="#C084FC" />
          </View>
          <Text style={styles.quickAddLabel}>Add Recipe</Text>
        </TouchableOpacity>

        {/* Add Water */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleAddWater}
          style={styles.quickAddTileItem}
        >
          <View style={[styles.quickAddBox, { borderColor: 'rgba(56, 189, 248, 0.35)' }]}>
            <Ionicons name="water-outline" size={22} color="#38BDF8" />
          </View>
          <Text style={styles.quickAddLabel}>Add Water</Text>
        </TouchableOpacity>

        {/* Add Snack → food search pre-set to the Snack meal */}
        <TouchableOpacity
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Add a snack"
          onPress={() => router.push({ pathname: '/food-search', params: { mealType: 'SNACK' } })}
          style={styles.quickAddTileItem}
        >
          <View style={[styles.quickAddBox, { borderColor: 'rgba(34, 197, 94, 0.35)' }]}>
            <Ionicons name="nutrition-outline" size={22} color="#4ADE80" />
          </View>
          <Text style={styles.quickAddLabel}>Add Snack</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const activeMealGroup = selectedMealTypeModal ? mealGroups.find((g) => g.key === selectedMealTypeModal) : null;
  const activeMealMacros = activeMealGroup
    ? activeMealGroup.logs.reduce(
        (acc, l) => ({
          protein: acc.protein + Math.round((l.food?.protein || 0) * l.servings),
          carbs: acc.carbs + Math.round((l.food?.carbs || 0) * l.servings),
          fat: acc.fat + Math.round((l.food?.fat || 0) * l.servings),
        }),
        { protein: 0, carbs: 0, fat: 0 }
      )
    : { protein: 0, carbs: 0, fat: 0 };

  return (
    <AppShell activeTab="nutrition">
      <SafeAreaView style={styles.container} edges={['top']}>
        <Animated.View entering={FadeIn.duration(400)} style={[styles.responsiveWrapper, { maxWidth: isDesktop ? 1140 : 580 }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* ══════════════════════════════════════════════════════════
                1. TOP HEADER & STREAKS
            ══════════════════════════════════════════════════════════ */}
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.pageTitle}>Nutrition</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowCalendar(!showCalendar)}
                  style={styles.dateSelectorBtn}
                >
                  <Text style={styles.dateText}>{dateFormatted}</Text>
                  <Ionicons name="chevron-down" size={14} color="#38BDF8" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>

              {/* Real streaks: consecutive days logging meals / water */}
              <View style={styles.streakContainer}>
                <View
                  style={styles.streakBadgeFlame}
                  accessibilityLabel={`Nutrition streak: ${nutritionStreak} days`}
                >
                  <Ionicons name="flame" size={16} color="#F97316" />
                  <Text style={styles.streakBadgeTextFlame}>{nutritionStreak}</Text>
                </View>
                <View
                  style={styles.streakBadgeWater}
                  accessibilityLabel={`Water streak: ${waterStreak} days`}
                >
                  <Ionicons name="water" size={15} color="#38BDF8" />
                  <Text style={styles.streakBadgeTextWater}>{waterStreak}</Text>
                </View>
              </View>
            </View>

            {/* CALENDAR PICKER DRAWER (if toggled) */}
            {showCalendar && (
              <Animated.View entering={FadeInDown.duration(300)} style={styles.calendarDrawer}>
                <View style={styles.calendarHeader}>
                  <Text style={styles.calendarMonthText}>
                    {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}
                  </Text>
                  <TouchableOpacity onPress={() => setShowCalendar(false)}>
                    <Ionicons name="close-circle" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>
                <View style={styles.weekStrip}>
                  {[-3, -2, -1, 0, 1, 2, 3].map((offset) => {
                    const d = new Date(selectedDate);
                    d.setDate(selectedDate.getDate() + offset);
                    const isSel = d.toDateString() === selectedDate.toDateString();
                    return (
                      <TouchableOpacity
                        key={offset}
                        onPress={() => {
                          setSelectedDate(d);
                          setShowCalendar(false);
                        }}
                        style={[styles.weekDayCell, isSel && styles.weekDayCellActive]}
                      >
                        <Text style={[styles.weekDayName, isSel && { color: '#38BDF8' }]}>
                          {d.toLocaleDateString('en-US', { weekday: 'short' })[0]}
                        </Text>
                        <Text style={[styles.weekDayNum, isSel && { color: '#38BDF8', fontWeight: '800' }]}>
                          {d.getDate()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Animated.View>
            )}

            {/* ══════════════════════════════════════════════════════════
                RESPONSIVE 2-COLUMN DESKTOP / LAPTOP WEB GRID
            ══════════════════════════════════════════════════════════ */}
            {isDesktop ? (
              <View style={styles.desktopGridRow}>
                {/* Column 1: Calorie Summary, Insights, Quick Add */}
                <View style={{ flex: 1.15 }}>
                  {renderCalorieSummaryCard()}
                  {renderInsightsSection()}
                  {renderQuickAddSection()}
                </View>

                {/* Column 2: Meals & Water Intake */}
                <View style={{ flex: 1 }}>
                  {renderMealsSection()}
                  {renderWaterSection()}
                </View>
              </View>
            ) : (
              /* Single column for Mobile viewports */
              <View>
                {renderCalorieSummaryCard()}
                {renderMealsSection()}
                {renderWaterSection()}
                {renderInsightsSection()}
                {renderQuickAddSection()}
              </View>
            )}
          </ScrollView>
        </Animated.View>

        {/* ══════════════════════════════════════════════════════════
            DETAILED MEAL ITEM BREAKDOWN MODAL (Breakfast/Lunch/Dinner/Snacks)
        ══════════════════════════════════════════════════════════ */}
        {activeMealGroup && (
          <Modal visible={true} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.loggedSourceBox, { marginRight: 10 }]}>
                      <Ionicons name={activeMealGroup.icon} size={20} color="#38BDF8" />
                    </View>
                    <View>
                      <Text style={styles.modalTitle}>{activeMealGroup.title}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#38BDF8', marginTop: 2 }}>
                        {activeMealGroup.kcal} kcal · {activeMealGroup.logs.length} item{activeMealGroup.logs.length === 1 ? '' : 's'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedMealTypeModal(null)} accessibilityRole="button" accessibilityLabel="Close">
                    <Ionicons name="close" size={24} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                {/* Real macro totals for this meal */}
                <View style={styles.mealMacroPillRow}>
                  <View style={[styles.macroPill, { borderColor: 'rgba(139, 92, 246, 0.4)' }]}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#C084FC' }}>Protein: {activeMealMacros.protein}g</Text>
                  </View>
                  <View style={[styles.macroPill, { borderColor: 'rgba(234, 179, 8, 0.4)' }]}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#FACC15' }}>Carbs: {activeMealMacros.carbs}g</Text>
                  </View>
                  <View style={[styles.macroPill, { borderColor: 'rgba(34, 197, 94, 0.4)' }]}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#4ADE80' }}>Fat: {activeMealMacros.fat}g</Text>
                  </View>
                </View>

                {/* Real logged foods for this meal, with edit/delete */}
                <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                  {activeMealGroup.logs.map((log) => (
                    <View key={log.id} style={styles.foodDetailItemCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.foodDetailNameText}>{log.food?.name}</Text>
                        <Text style={styles.foodDetailPortionText}>{log.servings}× serving · {log.food?.serving_size || ''}</Text>
                        <Text style={styles.foodDetailMacrosText}>
                          P: {Math.round((log.food?.protein || 0) * log.servings)}g · C: {Math.round((log.food?.carbs || 0) * log.servings)}g · F: {Math.round((log.food?.fat || 0) * log.servings)}g
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 6 }}>
                        <Text style={styles.foodDetailKcalText}>{Math.round((log.food?.calories || 0) * log.servings)} kcal</Text>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <TouchableOpacity
                            onPress={() => handleEditServings(log)}
                            style={styles.actionBtnSmall}
                            accessibilityRole="button"
                            accessibilityLabel={`Edit servings for ${log.food?.name}`}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#38BDF8' }}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => deleteMealLog(log.id)}
                            style={[styles.actionBtnSmall, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}
                            accessibilityRole="button"
                            accessibilityLabel={`Delete ${log.food?.name}`}
                          >
                            <Ionicons name="trash-outline" size={13} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                </ScrollView>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Add food to ${activeMealGroup.title}`}
                    onPress={() => {
                      const mealType = selectedMealTypeModal;
                      setSelectedMealTypeModal(null);
                      router.push({ pathname: '/food-search', params: { mealType } });
                    }}
                    style={[styles.modalBtn, styles.modalBtnSave, { flex: 1 }]}
                  >
                    <Ionicons name="add-circle" size={16} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={styles.modalBtnSaveText}>Add Food to {activeMealGroup.title}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* ══════════════════════════════════════════════════════════
            GOALS & TARGETS MODAL (AUTO BMI + MANUAL MODE)
        ══════════════════════════════════════════════════════════ */}
        <Modal visible={showGoalModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <Text style={styles.modalTitle}>Customize Goals & Targets</Text>
                <TouchableOpacity onPress={() => setShowGoalModal(false)}>
                  <Ionicons name="close" size={22} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* Mode Switcher Tabs */}
              <View style={styles.modalTabRow}>
                <TouchableOpacity
                  onPress={() => setModalMode('AUTO')}
                  style={[styles.modalTabBtn, modalMode === 'AUTO' && styles.modalTabBtnActive]}
                >
                  <Ionicons name="calculator-outline" size={15} color={modalMode === 'AUTO' ? '#38BDF8' : '#94A3B8'} style={{ marginRight: 6 }} />
                  <Text style={[styles.modalTabText, modalMode === 'AUTO' && styles.modalTabTextActive]}>Auto BMI & BMR</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setModalMode('MANUAL')}
                  style={[styles.modalTabBtn, modalMode === 'MANUAL' && styles.modalTabBtnActive]}
                >
                  <Ionicons name="create-outline" size={15} color={modalMode === 'MANUAL' ? '#38BDF8' : '#94A3B8'} style={{ marginRight: 6 }} />
                  <Text style={[styles.modalTabText, modalMode === 'MANUAL' && styles.modalTabTextActive]}>Manual Entry</Text>
                </TouchableOpacity>
              </View>

              {modalMode === 'AUTO' ? (
                /* ── AUTO BMI & BMR CALCULATOR ──────────────────────────── */
                <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Weight (kg)</Text>
                      <TextInput
                        style={styles.modalInput}
                        keyboardType="numeric"
                        value={weightKg}
                        onChangeText={setWeightKg}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Height (cm)</Text>
                      <TextInput
                        style={styles.modalInput}
                        keyboardType="numeric"
                        value={heightCm}
                        onChangeText={setHeightCm}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Age</Text>
                      <TextInput
                        style={styles.modalInput}
                        keyboardType="numeric"
                        value={age}
                        onChangeText={setAge}
                      />
                    </View>
                  </View>

                  <Text style={styles.inputLabel}>Gender</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => setGender('MALE')}
                      style={[styles.optionPill, gender === 'MALE' && styles.optionPillActive]}
                    >
                      <Text style={[styles.optionPillText, gender === 'MALE' && styles.optionPillTextActive]}>Male ♂</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setGender('FEMALE')}
                      style={[styles.optionPill, gender === 'FEMALE' && styles.optionPillActive]}
                    >
                      <Text style={[styles.optionPillText, gender === 'FEMALE' && styles.optionPillTextActive]}>Female ♀</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.inputLabel}>Activity Level</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {[
                      { label: 'Sedentary', val: 1.2 },
                      { label: 'Lightly Active', val: 1.375 },
                      { label: 'Moderate', val: 1.55 },
                      { label: 'Very Active', val: 1.725 },
                    ].map((act) => (
                      <TouchableOpacity
                        key={act.val}
                        onPress={() => setActivityLevel(act.val)}
                        style={[styles.optionPillSmall, activityLevel === act.val && styles.optionPillActive]}
                      >
                        <Text style={[styles.optionPillTextSmall, activityLevel === act.val && styles.optionPillTextActive]}>{act.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.inputLabel}>Fitness Goal</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[
                      { id: 'LOSE', label: 'Lose Fat (-450)' },
                      { id: 'MAINTAIN', label: 'Maintain' },
                      { id: 'BUILD', label: 'Build Muscle (+300)' },
                    ].map((g) => (
                      <TouchableOpacity
                        key={g.id}
                        onPress={() => setFitnessGoal(g.id as any)}
                        style={[styles.optionPillSmall, { flex: 1 }, fitnessGoal === g.id && styles.optionPillActive]}
                      >
                        <Text style={[styles.optionPillTextSmall, { textAlign: 'center' }, fitnessGoal === g.id && styles.optionPillTextActive]}>{g.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.bmiResultsCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#94A3B8' }}>BMI RESULT</Text>
                      <View style={[styles.bmiCategoryBadge, { backgroundColor: calculatedMetrics.bmiColor + '20', borderColor: calculatedMetrics.bmiColor }]}>
                        <Text style={[styles.bmiCategoryText, { color: calculatedMetrics.bmiColor }]}>
                          {calculatedMetrics.bmi} BMI · {calculatedMetrics.bmiCategory}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, alignItems: 'baseline' }}>
                      <Text style={{ fontSize: 13, color: '#94A3B8' }}>Target Calories:</Text>
                      <Text style={{ fontSize: 20, fontWeight: '800', color: '#38BDF8' }}>{calculatedMetrics.calcCalories.toLocaleString()} kcal</Text>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                      <Text style={{ fontSize: 11, color: '#8B5CF6', fontWeight: '700' }}>Protein: {calculatedMetrics.calcProtein}g</Text>
                      <Text style={{ fontSize: 11, color: '#EAB308', fontWeight: '700' }}>Carbs: {calculatedMetrics.calcCarbs}g</Text>
                      <Text style={{ fontSize: 11, color: '#22C55E', fontWeight: '700' }}>Fats: {calculatedMetrics.calcFat}g</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={handleApplyAutoBMI}
                    style={[styles.modalBtn, styles.modalBtnSave, { marginTop: 14 }]}
                  >
                    <Text style={styles.modalBtnSaveText}>Apply Calculated BMI Targets</Text>
                  </TouchableOpacity>
                </ScrollView>
              ) : (
                /* ── MANUAL CUSTOM ENTRY ──────────────────────────────── */
                <View>
                  <Text style={styles.inputLabel}>Daily Calorie Goal (kcal)</Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    value={calorieGoal.toString()}
                    onChangeText={(t) => setCalorieGoal(parseInt(t, 10) || 0)}
                  />

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Protein (g)</Text>
                      <TextInput
                        style={styles.modalInput}
                        keyboardType="numeric"
                        value={proteinGoal.toString()}
                        onChangeText={(t) => setProteinGoal(parseInt(t, 10) || 0)}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Carbs (g)</Text>
                      <TextInput
                        style={styles.modalInput}
                        keyboardType="numeric"
                        value={carbsGoal.toString()}
                        onChangeText={(t) => setCarbsGoal(parseInt(t, 10) || 0)}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Fats (g)</Text>
                      <TextInput
                        style={styles.modalInput}
                        keyboardType="numeric"
                        value={fatGoal.toString()}
                        onChangeText={(t) => setFatGoal(parseInt(t, 10) || 0)}
                      />
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                    <TouchableOpacity
                      onPress={() => setShowGoalModal(false)}
                      style={[styles.modalBtn, styles.modalBtnCancel]}
                    >
                      <Text style={styles.modalBtnCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setShowGoalModal(false)}
                      style={[styles.modalBtn, styles.modalBtnSave]}
                    >
                      <Text style={styles.modalBtnSaveText}>Save Custom Targets</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* ══════════════════════════════════════════════════════════
            EDIT SERVINGS MODAL
        ══════════════════════════════════════════════════════════ */}
        {editingLog && (
          <Modal visible={true} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Edit Servings</Text>
                <Text style={{ fontSize: 13, color: '#94A3B8', marginBottom: 12 }}>
                  {editingLog.food?.name}
                </Text>
                <TextInput
                  keyboardType="numeric"
                  style={styles.modalInput}
                  value={editServingsText}
                  onChangeText={setEditServingsText}
                  selectTextOnFocus
                />
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                  <TouchableOpacity
                    onPress={() => setEditingLog(null)}
                    style={[styles.modalBtn, styles.modalBtnCancel]}
                  >
                    <Text style={styles.modalBtnCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveServings}
                    style={[styles.modalBtn, styles.modalBtnSave]}
                  >
                    <Text style={styles.modalBtnSaveText}>Save Servings</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </SafeAreaView>
    </AppShell>
  );
}

// ─── Responsive Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090B10',
  },
  responsiveWrapper: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    paddingBottom: 110,
  },
  desktopGridRow: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
  },

  // 1. Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  dateSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#38BDF8',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakBadgeFlame: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.25)',
    gap: 4,
  },
  streakBadgeTextFlame: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F97316',
  },
  streakBadgeWater: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    gap: 4,
  },
  streakBadgeTextWater: {
    fontSize: 13,
    fontWeight: '800',
    color: '#38BDF8',
  },

  // Calendar Drawer
  calendarDrawer: {
    backgroundColor: '#161B22',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    marginBottom: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  calendarMonthText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekDayCell: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  weekDayCellActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  weekDayName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  weekDayNum: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 8,
  },
  sectionHeaderLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.2,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionHeaderSubKcal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 14,
  },

  // Shared Card Surface
  card: {
    backgroundColor: '#141822',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    padding: 18,
    marginBottom: 8,
  },

  // 2. Calorie Summary Card
  summarySplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  ringWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalsWrapper: {
    flex: 1,
    marginLeft: 20,
    justifyContent: 'center',
  },
  goalLine: {},
  goalLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  goalValue: {
    fontSize: 21,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  remainingValue: {
    fontSize: 19,
    fontWeight: '700',
    color: '#22C55E',
    marginTop: 2,
  },
  percentageBadge: {
    backgroundColor: 'rgba(249, 115, 22, 0.22)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.4)',
  },
  percentageBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFEDD5',
  },

  // Macro Progress Bars
  macrosContainer: {
    marginTop: 18,
    gap: 12,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroLabelCol: {
    minWidth: 70,
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  macroNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  macroBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 99,
    overflow: 'hidden',
    marginHorizontal: 10,
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 99,
  },
  macroValText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    minWidth: 72,
    textAlign: 'right',
  },

  // 3. Meals & Logged Items
  mealItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  emptyMealsBox: {
    alignItems: 'center',
    paddingVertical: 22,
    gap: 6,
  },
  emptyMealsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 6,
  },
  emptyMealsSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  loggedSourceBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealTextCol: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  mealTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mealSubText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  mealKcalText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38BDF8',
    marginTop: 4,
  },
  actionBtnSmall: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  addMealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#2563EB',
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    borderRadius: 16,
    paddingVertical: 12,
    marginTop: 10,
  },
  addMealBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#38BDF8',
  },

  // 4. Water Intake
  waterCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  dropsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
  },
  waterAddSquareBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 5. Nutrition Insights
  insightCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  insightCheckBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  insightTextCol: {
    flex: 1,
  },
  insightTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  insightSubText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },

  // 6. Quick Add
  quickAddRow: {
    gap: 12,
    paddingRight: 18,
    paddingBottom: 16,
  },
  quickAddTileItem: {
    alignItems: 'center',
    width: 68,
  },
  quickAddBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: 'rgba(20, 24, 34, 0.8)',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickAddLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
  },

  // Detailed Meal Modal Items
  mealMacroPillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  macroPill: {
    backgroundColor: '#090B10',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  foodDetailItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#090B10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    marginBottom: 8,
  },
  foodDetailNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  foodDetailPortionText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  foodDetailMacrosText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
  },
  foodDetailKcalText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#38BDF8',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#161B22',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalTabRow: {
    flexDirection: 'row',
    backgroundColor: '#090B10',
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  modalTabBtnActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  modalTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  modalTabTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },

  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 4,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#090B10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  optionPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#090B10',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  optionPillSmall: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#090B10',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionPillActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
    borderColor: '#38BDF8',
  },
  optionPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  optionPillTextSmall: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  optionPillTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  bmiResultsCard: {
    backgroundColor: '#090B10',
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  bmiCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  bmiCategoryText: {
    fontSize: 11,
    fontWeight: '800',
  },

  modalBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  modalBtnCancel: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalBtnCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  modalBtnSave: {
    backgroundColor: '#2563EB',
  },
  modalBtnSaveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

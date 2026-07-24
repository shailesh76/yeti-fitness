import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useWorkoutStore } from '../store/useWorkoutStore';
import { useLogStore } from '../store/useLogStore';
import { useSessionStore } from '../store/useSessionStore';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationHistoryStore } from '../store/useNotificationHistoryStore';
import { useRepositories } from '../hooks/useRepositories';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import AppShell from '../components/AppShell';
import { SkeletonLoader } from '../components/TelemetryComponents';
import { Ionicons } from '@expo/vector-icons';
import { P, sharedStyles } from '../constants/premiumTheme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a 7-day week strip around today. */
function buildWeekDays() {
  const days: { date: Date; label: string; num: number }[] = [];
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    days.push({
      date:  d,
      label: d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1).toUpperCase(),
      num:   d.getDate(),
    });
  }
  return days;
}

const WEEK_DAYS = buildWeekDays();
const todayDateStr = new Date().toDateString();
const { width } = Dimensions.get('window');

// ─── Component ────────────────────────────────────────────────────────────────
export default function WorkoutScreen() {
  const router   = useRouter();
  const session  = useAuthStore((state) => state.session);
  const userId = session?.user?.id;
  const { workoutPlans, syncWorkoutPlans, loading, ownTemplates, ownTemplatesLoading, fetchOwnTemplates, exercises, fetchExercises } = useWorkoutStore();
  // Active-session state lives in useSessionStore (the offline-first, DB-backed
  // tracker the session screen reads). useLogStore is used only for read-only
  // workout history here.
  const startSession = useSessionStore((s) => s.startSession);
  const activeSession = useSessionStore((s) => s.activeSession);
  const { logsHistory, fetchLogsHistory } = useLogStore();
  const { unreadCount, fetchNotifications } = useNotificationHistoryStore();
  const { exerciseRepository } = useRepositories();
  const [expandedLogId, setExpandedLogId] = React.useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = React.useState('All');
  const [favoriteIds, setFavoriteIds] = React.useState<Set<string>>(new Set());

  useEffect(() => {
    if (session?.user?.id) {
      syncWorkoutPlans(session.user.id);
      fetchLogsHistory(session.user.id);
    }
    fetchExercises();
    fetchNotifications();
  }, [session]);

  useEffect(() => {
    if (!userId) return;
    exerciseRepository.getFavoriteIds(userId).then(setFavoriteIds);
  }, [userId]);

  const toggleFavorite = async (exerciseId: string) => {
    if (!userId) return;
    const wasFavorite = favoriteIds.has(exerciseId);
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (wasFavorite) next.delete(exerciseId); else next.add(exerciseId);
      return next;
    });
    try {
      if (wasFavorite) await exerciseRepository.removeFavorite(userId, exerciseId);
      else await exerciseRepository.addFavorite(userId, exerciseId);
    } catch {
      setFavoriteIds(prev => {
        const next = new Set(prev);
        if (wasFavorite) next.add(exerciseId); else next.delete(exerciseId);
        return next;
      });
    }
  };

  // Own templates specifically need to refresh on every return to this screen
  // (not just on session change) — creating/editing one on /workouts/create
  // and navigating back must show the update without a full app reload.
  useFocusEffect(
    React.useCallback(() => {
      if (session?.user?.id) {
        fetchOwnTemplates(session.user.id);
      }
    }, [session?.user?.id])
  );

  // Redirect if a session is already active (returning to Workouts mid-session).
  useEffect(() => {
    if (activeSession) router.replace('/workouts/session');
  }, [activeSession?.localId]);

  // Map a plan's exercises into the session store's ExerciseInSession shape and
  // start a REAL tracked session (the screen no longer seeds demo data).
  const handleStartWorkout = (plan: any) => {
    if (!userId) return;
    const planExercises = plan.workout_plan_exercises || [];
    if (planExercises.length === 0) return;
    startSession({
      userId,
      sessionName: plan.name,
      planDayId: plan.plan_day_id,
      assignmentId: plan.assignment_id,
      exercises: planExercises.map((pe: any) => ({
        exerciseId: pe.exercise_id,
        exerciseName: pe.exercise?.name || 'Exercise',
        targetSets: pe.sets || 3,
        targetReps: String(pe.reps ?? '8-10'),
        targetWeightKg: pe.weight ? parseFloat(pe.weight) : undefined,
        planExerciseId: pe.id,
        muscleGroup: pe.exercise?.muscle_group,
        restSeconds: pe.rest_seconds,
      })),
    });
    router.push('/workouts/session');
  };

  const handleStartEmptyWorkout = () => {
    if (!userId) return;
    startSession({ userId, sessionName: 'Quick Workout', exercises: [] });
    router.push('/workouts/session');
  };

  // Deduplicate plans by name and filter out empty plans (0 exercises)
  const uniquePlans = React.useMemo(() => {
    if (!workoutPlans) return [];
    const seen = new Set<string>();
    return workoutPlans.filter((plan) => {
      if (!plan.workout_plan_exercises || plan.workout_plan_exercises.length === 0) return false;
      const key = plan.name?.toLowerCase().trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [workoutPlans]);

  // Real per-plan muscle-group summary, derived from the plan's own exercises
  // rather than a hardcoded string — e.g. "Chest, Shoulders, Triceps".
  const planMuscleSummary = React.useCallback((plan: any) => {
    const groups = new Set<string>();
    (plan.workout_plan_exercises ?? []).forEach((ex: any) => {
      if (ex.exercise?.muscle_group) groups.add(ex.exercise.muscle_group);
    });
    return Array.from(groups).slice(0, 3).join(' · ');
  }, []);

  // Real muscle-group tiles: count of exercises per group in the actual
  // exercise database, not a fabricated number.
  const muscleGroupCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    exercises.forEach((ex: any) => {
      if (!ex.muscle_group) return;
      counts.set(ex.muscle_group, (counts.get(ex.muscle_group) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [exercises]);

  const categoryPills = React.useMemo(
    () => ['All', ...muscleGroupCounts.slice(0, 4).map((m) => m.name)],
    [muscleGroupCounts]
  );

  // "Popular" has no real ranking signal in the schema (is_compound exists as
  // a column but is never populated by any migration/seed — filtering on it
  // silently returns nothing). Rather than fabricate a popularity score, this
  // shows a real slice of the actual exercise library, filtered by the
  // selected category pill — same real data the Exercise Library uses.
  const popularExercises = React.useMemo(() => {
    return exercises
      .filter((ex: any) => selectedCategory === 'All' || ex.muscle_group === selectedCategory)
      .slice(0, 6);
  }, [exercises, selectedCategory]);

  // Compute completed day date strings from history
  const completedDateStrs = React.useMemo(() => {
    const s = new Set<string>();
    (logsHistory ?? []).forEach((l: any) => {
      if (l.completed_at) s.add(new Date(l.completed_at).toDateString());
    });
    return s;
  }, [logsHistory]);

  // Track completed plan day IDs today
  const completedPlanDayIdsToday = React.useMemo(() => {
    const ids = new Set<string>();
    const todayStr = new Date().toDateString();
    
    // Check history
    (logsHistory ?? []).forEach((log: any) => {
      if (log.completed_at && log.workout_plan_id) {
        const completedDate = new Date(log.completed_at).toDateString();
        if (completedDate === todayStr) {
          ids.add(log.workout_plan_id);
        }
      }
    });

    return ids;
  }, [logsHistory]);

  // Featured plan = first in list (assigned today) — used for the week-strip's
  // "Week X of Y · Plan Name" subtitle; the Featured Workouts cards below
  // render all of uniquePlans, not just this one.
  const featuredPlan = uniquePlans[0] ?? null;

  // Plan summary text
  const currentPlanName = featuredPlan?.name ?? null;

  // Derive total plan days from workoutPlans array
  const totalPlanDays = React.useMemo(() => {
    if (!workoutPlans || workoutPlans.length === 0) return 0;
    // Use the count of unique day_numbers in the first plan group
    const days = new Set<number>();
    workoutPlans.forEach((p: any) => { if ((p as any).day_number) days.add((p as any).day_number); });
    return Math.max(days.size, uniquePlans.length, 1);
  }, [workoutPlans, uniquePlans]);

  // Current week number within the plan (approx based on plan start_date)
  const weekNumber = React.useMemo(() => {
    const startDate = (workoutPlans?.[0] as any)?.start_date;
    if (!startDate) return 1;
    const start = new Date(startDate);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    return Math.max(1, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)));
  }, [workoutPlans]);

  const totalWeeks = Math.max(1, Math.ceil(totalPlanDays / 5));

  if (activeSession) {
    return (
      <View style={{ flex: 1, backgroundColor: P.BG, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={P.ACCENT} />
      </View>
    );
  }

  return (
    <AppShell activeTab="workout">
      <SafeAreaView style={{ flex: 1, backgroundColor: P.BG }} edges={['top']}>
        <Animated.View entering={FadeIn.duration(500)} style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={sharedStyles.scrollContent}
          >
            {/* ── Header ─────────────────────────────────────────────────── */}
            <View style={[sharedStyles.rowBetween, { marginBottom: 16 }]}>
              <TouchableOpacity
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Open profile"
                onPress={() => router.push('/profile')}
                activeOpacity={0.8}
                style={sharedStyles.row}
              >
                <View style={styles.headerAvatar}>
                  <Ionicons name="person" size={18} color={P.ACCENT} />
                </View>
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.pageTitle}>Workouts</Text>
                  <Text style={styles.pageSubtitle}>Find the perfect workout</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
                onPress={() => router.push('/notifications')}
                style={[sharedStyles.circleBtn, { position: 'relative' }]}
                activeOpacity={0.7}
              >
                <Ionicons name="notifications-outline" size={20} color={P.TEXT_PRI} />
                {unreadCount > 0 && (
                  <View style={styles.headerBadge}>
                    <Text style={styles.headerBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* ── Search bar — opens the real Exercise Library search rather
                than duplicating its search/filter logic here ─────────────── */}
            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Search exercises and workouts"
              onPress={() => router.push('/exercises')}
              style={styles.searchBar}
              activeOpacity={0.8}
            >
              <Ionicons name="search" size={16} color={P.TEXT_MUT} />
              <Text style={styles.searchPlaceholder}>Search exercises, workouts...</Text>
              <Ionicons name="options-outline" size={16} color={P.TEXT_MUT} />
            </TouchableOpacity>

            {/* ── Category pills — filters Popular Exercises below ───────── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
            >
              {categoryPills.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Filter by ${cat}`}
                    onPress={() => setSelectedCategory(cat)}
                    style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.categoryPillText, isSelected && styles.categoryPillTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* ── Featured Workouts — real assigned/created plans, in the
                reference's 2-visible-card layout, horizontally scrollable
                so every plan stays reachable (not just the first 2) ─────── */}
            <Text style={[sharedStyles.labelCaps, { marginTop: 20, marginBottom: 12 }]}>FEATURED WORKOUTS</Text>
            {loading && uniquePlans.length === 0 ? (
              <SkeletonLoader rows={1} height={150} />
            ) : uniquePlans.length === 0 ? (
              <View style={[sharedStyles.card, { alignItems: 'center', paddingVertical: 28 }]}>
                <Ionicons name="barbell-outline" size={32} color={P.TEXT_MUT} style={{ marginBottom: 10 }} />
                <Text style={styles.emptyStateText}>No workouts assigned yet</Text>
                <Text style={styles.emptyStateSub}>Ask your coach, or build your own template below.</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
              >
                {uniquePlans.map((plan, idx) => {
                  const isDone = completedPlanDayIdsToday.has(plan.plan_day_id || '');
                  const muscleSummary = planMuscleSummary(plan);
                  return (
                    <Animated.View key={plan.id} entering={FadeInDown.delay(120 + idx * 60).duration(400)}>
                      <TouchableOpacity
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={isDone ? `${plan.name}, completed today` : `Start workout: ${plan.name}`}
                        onPress={() => handleStartWorkout(plan)}
                        style={styles.featuredCard}
                        activeOpacity={0.85}
                      >
                        <View style={styles.featuredIconTile}>
                          <Ionicons name="barbell" size={26} color={P.ACCENT} />
                        </View>
                        {isDone ? (
                          <View style={styles.featuredBadgeDone}>
                            <Ionicons name="checkmark" size={12} color={P.ACCENT} />
                          </View>
                        ) : (
                          <Ionicons name="chevron-forward" size={16} color={P.TEXT_MUT} style={styles.featuredChevron} />
                        )}
                        <Text style={styles.featuredName} numberOfLines={1}>{plan.name}</Text>
                        {!!muscleSummary && (
                          <Text style={styles.featuredMuscle} numberOfLines={1}>{muscleSummary}</Text>
                        )}
                        <View style={[sharedStyles.row, { gap: 4, marginTop: 6 }]}>
                          <Ionicons name="barbell-outline" size={11} color={P.TEXT_MUT} />
                          <Text style={styles.featuredMeta}>
                            {plan.workout_plan_exercises?.length || 0} exercises
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </ScrollView>
            )}

            {/* ── Muscle Groups — real exercise counts per group ─────────── */}
            {muscleGroupCounts.length > 0 && (
              <>
                <View style={[sharedStyles.rowBetween, { marginTop: 24, marginBottom: 12 }]}>
                  <Text style={sharedStyles.labelCaps}>MUSCLE GROUPS</Text>
                  <TouchableOpacity
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="View all muscle groups"
                    onPress={() => router.push('/exercises')}
                  >
                    <Text style={styles.viewAllText}>View all</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {muscleGroupCounts.map((mg) => (
                    <TouchableOpacity
                      key={mg.name}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel={`Browse ${mg.name} exercises, ${mg.count} available`}
                      onPress={() => router.push(`/exercises?muscle=${encodeURIComponent(mg.name)}`)}
                      style={styles.muscleTile}
                      activeOpacity={0.8}
                    >
                      <View style={styles.muscleIconWrap}>
                        <Ionicons name="body-outline" size={26} color={P.ACCENT} />
                      </View>
                      <Text style={styles.muscleName} numberOfLines={1}>{mg.name}</Text>
                      <Text style={styles.muscleCount}>{mg.count} exercises</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* ── Popular Exercises — real compound/staple lifts, filtered
                by the selected category pill, with real favorite toggle ─── */}
            {popularExercises.length > 0 && (
              <>
                <View style={[sharedStyles.rowBetween, { marginTop: 24, marginBottom: 12 }]}>
                  <Text style={sharedStyles.labelCaps}>POPULAR EXERCISES</Text>
                  <TouchableOpacity
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="View all exercises"
                    onPress={() => router.push('/exercises')}
                  >
                    <Text style={styles.viewAllText}>View all</Text>
                  </TouchableOpacity>
                </View>
                {popularExercises.map((ex: any) => {
                  const isFavorite = favoriteIds.has(ex.id);
                  return (
                    <View key={ex.id} style={styles.popularRow}>
                      <TouchableOpacity
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`View ${ex.name}, ${ex.muscle_group || 'Full Body'}`}
                        onPress={() => router.push(`/exercises/${ex.id}`)}
                        style={styles.popularInfo}
                        activeOpacity={0.8}
                      >
                        <View style={styles.popularThumb}>
                          <Ionicons name="barbell-outline" size={18} color={P.ACCENT} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.popularName} numberOfLines={1}>{ex.name}</Text>
                          <Text style={styles.popularMuscle}>{ex.muscle_group || 'Full Body'}</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isFavorite }}
                        accessibilityLabel={isFavorite ? `Remove ${ex.name} from favorites` : `Add ${ex.name} to favorites`}
                        onPress={() => toggleFavorite(ex.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.popularFavoriteBtn}
                      >
                        <Ionicons name={isFavorite ? 'star' : 'star-outline'} size={20} color={isFavorite ? P.ACCENT : P.TEXT_MUT} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </>
            )}

            {/* ── AI Workout Builder banner ───────────────────────────────── */}
            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Ask AI Coach to build a workout"
              onPress={() => router.push('/coach')}
              style={styles.aiBanner}
              activeOpacity={0.85}
            >
              <Image
                source={require('../assets/yeti_mascot_avatar.png')}
                style={styles.aiBannerMascot}
                resizeMode="cover"
              />
              <View style={{ flex: 1, marginLeft: 14, marginRight: 10 }}>
                <Text style={styles.aiBannerTitle}>Can&apos;t decide?</Text>
                <Text style={styles.aiBannerSub}>Let AI Coach build the perfect workout for you.</Text>
              </View>
              <View style={styles.aiBannerBtn}>
                <Text style={styles.aiBannerBtnText}>Get AI Workout</Text>
                <Ionicons name="chevron-forward" size={14} color="#000" />
              </View>
            </TouchableOpacity>

            {/* Plan subtitle — week progress */}
            {currentPlanName && (
              <View style={[styles.planSubtitleRow, { marginTop: 24 }]}>
                <Ionicons name="barbell-outline" size={11} color={P.TEXT_MUT} />
                <Text style={styles.planSubtitle} numberOfLines={1}>
                  Week {Math.min(weekNumber, totalWeeks)} of {totalWeeks}
                  {'  ·  '}{currentPlanName}
                </Text>
              </View>
            )}

            {/* ── Week strip ─────────────────────────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.weekStrip}>
              {WEEK_DAYS.map((day, i) => {
                const isToday     = day.date.toDateString() === todayDateStr;
                const isCompleted = completedDateStrs.has(day.date.toDateString());
                const isPast      = day.date < new Date() && !isToday;

                return (
                  <View
                    key={i}
                    style={[
                      styles.dayTile,
                      isToday     && styles.dayTileToday,
                      isCompleted && styles.dayTileCompleted,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayLabel,
                        isToday && { color: P.ACCENT },
                        isCompleted && { color: P.ACCENT },
                        !isToday && !isCompleted && isPast && { color: P.TEXT_MUT },
                      ]}
                    >
                      {day.label}
                    </Text>
                    {isCompleted ? (
                      <Ionicons name="checkmark-circle" size={18} color={P.ACCENT} style={{ marginTop: 2 }} />
                    ) : (
                      <Text
                        style={[
                          styles.dayNum,
                          isToday && { color: P.ACCENT, fontWeight: '900' },
                          !isToday && isPast && { color: P.TEXT_MUT },
                        ]}
                      >
                        {day.num}
                      </Text>
                    )}
                    {/* Small glowing dot under today's number */}
                    {isToday && !isCompleted && (
                      <View style={styles.todayDot} />
                    )}
                  </View>
                );
              })}
            </Animated.View>

            {/* ── Quick workout ──────────────────────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(300).duration(400)}>
              <TouchableOpacity
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Start a quick blank workout"
                onPress={handleStartEmptyWorkout}
                style={styles.quickCard}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[sharedStyles.labelCaps, { color: P.AMBER, marginBottom: 4 }]}>
                    QUICK WORKOUT
                  </Text>
                  <Text style={styles.quickSubtitle}>
                    Log a blank session and track sets on the fly
                  </Text>
                </View>
                <Ionicons name="flash" size={28} color={P.AMBER} />
              </TouchableOpacity>
            </Animated.View>

            {/* ── My Templates (athlete-authored, Step 4.5) ──────────────── */}
            <Animated.View entering={FadeInDown.delay(390).duration(400)}>
              <View style={[sharedStyles.rowBetween, { marginTop: 24, marginBottom: 10 }]}>
                <Text style={sharedStyles.labelCaps}>MY TEMPLATES</Text>
                <TouchableOpacity
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Create a new workout template"
                  onPress={() => router.push('/workouts/create')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.newTemplateText}>+ New</Text>
                </TouchableOpacity>
              </View>

              {ownTemplatesLoading && ownTemplates.length === 0 ? (
                <SkeletonLoader rows={1} height={64} />
              ) : ownTemplates.length === 0 ? (
                <TouchableOpacity
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Build your own workout template"
                  onPress={() => router.push('/workouts/create')}
                  style={styles.emptyTemplateCard}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle-outline" size={18} color={P.TEXT_MUT} />
                  <Text style={styles.emptyTemplateText}>Build your own workout template</Text>
                </TouchableOpacity>
              ) : (
                ownTemplates.map((template) => (
                  <TouchableOpacity
                    key={template.id}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit template: ${template.name}`}
                    onPress={() => router.push(`/workouts/create?planId=${template.id}`)}
                    style={styles.templateCard}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={styles.templateName} numberOfLines={1}>{template.name}</Text>
                      <Text style={styles.templateMeta}>{template.exerciseCount ?? 0} exercises</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={P.TEXT_MUT} />
                  </TouchableOpacity>
                ))
              )}
            </Animated.View>

            {/* ── Workout History ─────────────────────────────────────────── */}
            {logsHistory && logsHistory.length > 0 && (
              <Animated.View entering={FadeInDown.delay(420).duration(400)}>
                <Text style={[sharedStyles.labelCaps, { marginTop: 24, marginBottom: 10 }]}>
                  WORKOUT HISTORY
                </Text>
                {logsHistory.slice(0, 5).map((log: any, idx: number) => {
                  const isExpanded = expandedLogId === log.id;
                  const dateStr = log.completed_at
                    ? new Date(log.completed_at).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Unknown Date';
                  return (
                    <TouchableOpacity
                      key={log.id || idx}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel={`${log.workout_plans?.name || 'Workout Session'}, ${dateStr}${isExpanded ? ', expanded' : ''}`}
                      activeOpacity={0.85}
                      onPress={() => setExpandedLogId(isExpanded ? null : log.id)}
                      style={[styles.historyCard, { flexDirection: 'column', alignItems: 'stretch' }]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={styles.historyName} numberOfLines={1}>
                            {log.workout_plans?.name || 'Workout Session'}
                          </Text>
                          <Text style={styles.historyMeta}>
                            {dateStr} · {log.total_volume ? `${log.total_volume} kg logged` : 'Completed'}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Ionicons name="checkmark-circle" size={20} color={P.ACCENT} />
                          <Ionicons 
                            name={isExpanded ? "chevron-up" : "chevron-down"} 
                            size={16} 
                            color={P.TEXT_MUT} 
                          />
                        </View>
                      </View>
                      
                      {isExpanded && log.logged_exercises && log.logged_exercises.length > 0 && (
                        <View style={{ marginTop: 6 }}>
                          {log.logged_exercises.map((ex: any, exIdx: number) => (
                            <View key={ex.exercise_id || exIdx} style={styles.historyExerciseRow}>
                              <Text style={styles.historyExerciseName}>{ex.name}</Text>
                              <Text style={styles.historyExerciseSets}>
                                {ex.sets.map((s: any) => `${s.reps}x${s.weight}kg`).join(' · ')}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </Animated.View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </Animated.View>
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
    marginBottom:  2,
  },
  planSubtitleRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            5,
    marginBottom:   14,
  },
  planSubtitle: {
    fontSize:      11,
    color:         P.TEXT_MUT,
    fontWeight:    '600',
    letterSpacing: 0.2,
  },

  // Week strip
  weekStrip: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    backgroundColor: P.CARD_BG,
    borderWidth:     1,
    borderColor:     P.CARD_BORDER,
    borderRadius:    P.RADIUS_CARD,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom:    14,
  },
  dayTile: {
    flex:           1,
    alignItems:     'center',
    paddingVertical: 6,
    borderRadius:   10,
    gap:            2,
  },
  dayTileToday: {
    backgroundColor: P.ACCENT_DIM,
    borderWidth:     2,
    borderColor:     P.ACCENT,
    ...Platform.select({
      ios: {
        shadowColor:   P.ACCENT,
        shadowOffset:  { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius:  8,
      },
    }),
  },
  dayTileCompleted: {
    backgroundColor: 'rgba(37, 99, 235, 0.06)',
  },
  dayLabel: {
    fontSize:   9,
    fontWeight: '700',
    color:      P.TEXT_SEC,
    letterSpacing: 0.5,
  },
  dayNum: {
    fontSize:   14,
    fontWeight: '700',
    color:      P.TEXT_PRI,
    marginTop:  2,
  },
  todayDot: {
    width:           5,
    height:          5,
    borderRadius:    99,
    backgroundColor: P.ACCENT,
    marginTop:       2,
    ...Platform.select({
      ios: {
        shadowColor:   P.ACCENT,
        shadowOffset:  { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius:  4,
      },
    }),
  },

  // Header
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: P.ACCENT_DIM,
    borderWidth: 1,
    borderColor: P.ACCENT_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageSubtitle: {
    fontSize: 12,
    color: P.TEXT_SEC,
    fontWeight: '600',
    marginTop: 2,
  },
  headerBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: P.RED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    borderRadius: 14,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  searchPlaceholder: {
    flex: 1,
    color: P.TEXT_MUT,
    fontSize: 14,
    fontWeight: '500',
  },

  // Category pills
  categoryRow: {
    gap: 8,
    paddingTop: 14,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: P.RADIUS_FULL,
    backgroundColor: P.CARD_BG,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
  },
  categoryPillActive: {
    backgroundColor: P.ACCENT,
    borderColor: P.ACCENT,
  },
  categoryPillText: {
    color: P.TEXT_SEC,
    fontSize: 13,
    fontWeight: '700',
  },
  categoryPillTextActive: {
    color: '#000',
  },

  emptyStateText: {
    fontSize: 14,
    fontWeight: '800',
    color: P.TEXT_PRI,
  },
  emptyStateSub: {
    fontSize: 12,
    color: P.TEXT_MUT,
    marginTop: 4,
    textAlign: 'center',
  },

  // Featured Workouts
  featuredCard: {
    width: (width - 60) / 2,
    backgroundColor: P.CARD_BG,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    borderRadius: P.RADIUS_CARD,
    padding: 14,
  },
  featuredIconTile: {
    width: 48,
    height: 48,
    borderRadius: P.RADIUS_SM,
    backgroundColor: P.ACCENT_DIM,
    borderWidth: 1,
    borderColor: P.ACCENT_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featuredBadgeDone: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: P.ACCENT_DIM,
    borderWidth: 1,
    borderColor: P.ACCENT_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredChevron: {
    position: 'absolute',
    top: 16,
    right: 14,
  },
  featuredName: {
    fontSize: 15,
    fontWeight: '800',
    color: P.TEXT_PRI,
    letterSpacing: -0.2,
  },
  featuredMuscle: {
    fontSize: 11,
    color: P.TEXT_SEC,
    fontWeight: '500',
    marginTop: 2,
  },
  featuredMeta: {
    fontSize: 10,
    color: P.TEXT_MUT,
    fontWeight: '700',
  },

  viewAllText: {
    color: P.ACCENT,
    fontSize: 12,
    fontWeight: '800',
  },

  // Muscle Groups
  muscleTile: {
    width: 84,
    alignItems: 'center',
    backgroundColor: P.CARD_BG,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    borderRadius: P.RADIUS_CARD,
    paddingVertical: 14,
  },
  muscleIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: P.ACCENT_DIM,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  muscleName: {
    fontSize: 12,
    fontWeight: '800',
    color: P.TEXT_PRI,
  },
  muscleCount: {
    fontSize: 9,
    color: P.TEXT_MUT,
    fontWeight: '600',
    marginTop: 2,
  },

  // Popular Exercises
  popularRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.CARD_BG,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    borderRadius: P.RADIUS_CARD,
    marginBottom: 10,
    minHeight: 64,
  },
  popularInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  popularThumb: {
    width: 40,
    height: 40,
    borderRadius: P.RADIUS_SM,
    backgroundColor: P.ACCENT_DIM,
    borderWidth: 1,
    borderColor: P.ACCENT_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popularName: {
    fontSize: 14,
    fontWeight: '800',
    color: P.TEXT_PRI,
  },
  popularMuscle: {
    fontSize: 11,
    color: P.TEXT_SEC,
    marginTop: 2,
  },
  popularFavoriteBtn: {
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
  },

  // AI Workout Builder banner
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.ACCENT_DIM,
    borderWidth: 1,
    borderColor: P.ACCENT_BORDER,
    borderRadius: P.RADIUS_CARD,
    padding: 16,
    marginTop: 24,
    marginBottom: 10,
  },
  aiBannerMascot: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: P.ACCENT_BORDER,
  },
  aiBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: P.TEXT_PRI,
  },
  aiBannerSub: {
    fontSize: 11,
    color: P.TEXT_SEC,
    marginTop: 2,
  },
  aiBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: P.ACCENT,
    borderRadius: P.RADIUS_FULL,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 40,
  },
  aiBannerBtnText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '800',
  },

  // Quick workout
  quickCard: {
    backgroundColor: P.CARD_BG,
    borderWidth: 1,
    borderColor: P.AMBER + '33',
    borderRadius: P.RADIUS_CARD,
    padding: 18,
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
  },
  quickSubtitle: {
    fontSize: 12,
    color: P.TEXT_SEC,
    fontWeight: '500',
    lineHeight: 17,
  },

  // My Templates
  newTemplateText: {
    color: P.ACCENT,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyTemplateCard: {
    backgroundColor: P.CARD_BG,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    borderStyle: 'dashed',
    borderRadius: P.RADIUS_CARD,
    padding: 18,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  emptyTemplateText: {
    color: P.TEXT_MUT,
    fontSize: 12,
    fontWeight: '600',
  },
  templateCard: {
    backgroundColor: P.CARD_BG,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    borderRadius: P.RADIUS_CARD,
    padding: 16,
    minHeight: 56,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  templateName: {
    fontSize: 14,
    fontWeight: '800',
    color: P.TEXT_PRI,
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  templateMeta: {
    fontSize: 11,
    color: P.TEXT_SEC,
    fontWeight: '500',
  },

  // History list styles
  historyCard: {
    backgroundColor: P.CARD_BG,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    borderRadius: P.RADIUS_CARD,
    padding: 16,
    minHeight: 56,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyName: {
    fontSize: 14,
    fontWeight: '800',
    color: P.TEXT_PRI,
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  historyMeta: {
    fontSize: 11,
    color: P.TEXT_MUT,
    fontWeight: '500',
  },
  historyExerciseRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  historyExerciseName: {
    fontSize: 12,
    fontWeight: '700',
    color: P.TEXT_SEC,
    marginBottom: 2,
  },
  historyExerciseSets: {
    fontSize: 11,
    color: P.TEXT_MUT,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
});


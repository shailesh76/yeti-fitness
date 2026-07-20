import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useWorkoutStore } from '../store/useWorkoutStore';
import { useLogStore } from '../store/useLogStore';
import { useAuthStore } from '../store/useAuthStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import AppShell from '../components/AppShell';
import { SkeletonLoader } from '../components/TelemetryComponents';
import { Ionicons } from '@expo/vector-icons';
import { P, glowStyle, sharedStyles } from '../constants/premiumTheme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Return a human-readable "Xh Ym" estimate based on exercise count. */
function estimateDuration(exerciseCount: number) {
  const mins = Math.max(exerciseCount * 6, 10);
  if (mins < 60) return `~${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
}

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

// ─── Component ────────────────────────────────────────────────────────────────
export default function WorkoutScreen() {
  const router   = useRouter();
  const session  = useAuthStore((state) => state.session);
  const { workoutPlans, syncWorkoutPlans, loading, ownTemplates, ownTemplatesLoading, fetchOwnTemplates } = useWorkoutStore();
  const { startSession, activeSession, logsHistory, fetchLogsHistory } = useLogStore();
  const [expandedLogId, setExpandedLogId] = React.useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      syncWorkoutPlans(session.user.id);
      fetchLogsHistory(session.user.id);
    }
  }, [session]);

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

  // Redirect if a session is already active
  useEffect(() => {
    if (activeSession) router.replace('/workouts/session');
  }, [activeSession?.planId]);

  const handleStartWorkout = (plan: any) => {
    if (plan.workout_plan_exercises && plan.workout_plan_exercises.length > 0) {
      startSession(plan.id, plan.name, plan.workout_plan_exercises);
      router.push('/workouts/session');
    }
  };

  const handleStartEmptyWorkout = () => {
    startSession('quick-workout', 'Quick Log Workout', []);
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

  // Featured plan = first in list (assigned today)
  const featuredPlan = uniquePlans[0] ?? null;
  const restPlans    = uniquePlans.slice(1);

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
            <View style={[sharedStyles.rowBetween, { marginBottom: 4 }]}>
              <View>
                <Text style={sharedStyles.labelCaps}>TRAINING</Text>
                <Text style={styles.pageTitle}>Workouts</Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/exercises')}
                style={sharedStyles.circleBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="barbell-outline" size={20} color={P.TEXT_PRI} />
              </TouchableOpacity>
            </View>

            {/* Plan subtitle — week progress */}
            {currentPlanName && (
              <View style={styles.planSubtitleRow}>
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

            {/* ── Today's workout hero card ──────────────────────────────── */}
            {loading && uniquePlans.length === 0 ? (
              <SkeletonLoader rows={2} height={120} />
            ) : featuredPlan ? (
              <Animated.View
                entering={FadeInDown.delay(160).duration(500)}
                style={[sharedStyles.cardGlow, styles.heroCard]}
              >
                {/* Label */}
                <View style={[sharedStyles.row, { gap: 6, marginBottom: 10 }]}>
                  <Ionicons name="barbell-outline" size={14} color={P.AMBER} />
                  <Text style={[sharedStyles.labelCaps, { color: P.AMBER }]}>
                    TODAY · {featuredPlan.name}
                  </Text>
                </View>

                <Text style={styles.heroWorkoutName} numberOfLines={2}>
                  {featuredPlan.name}
                </Text>

                <View style={[sharedStyles.row, { gap: 16, marginTop: 6, marginBottom: 18 }]}>
                  <View style={[sharedStyles.row, { gap: 5 }]}>
                    <Ionicons name="barbell-outline" size={13} color={P.TEXT_SEC} />
                    <Text style={styles.metaText}>
                      {featuredPlan.workout_plan_exercises?.length || 0} exercises
                    </Text>
                  </View>
                  <View style={[sharedStyles.row, { gap: 5 }]}>
                    <Ionicons name="time-outline" size={13} color={P.TEXT_SEC} />
                    <Text style={styles.metaText}>
                      {estimateDuration(featuredPlan.workout_plan_exercises?.length || 0)}
                    </Text>
                  </View>
                  {(featuredPlan as any).coach?.full_name && (
                    <View style={[sharedStyles.row, { gap: 5 }]}>
                      <Ionicons name="person-outline" size={13} color={P.TEXT_SEC} />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {(featuredPlan as any).coach.full_name}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Start button */}
                {featuredPlan && completedPlanDayIdsToday.has(featuredPlan.plan_day_id || '') ? (
                  <TouchableOpacity
                    onPress={() => handleStartWorkout(featuredPlan)}
                    style={[
                      styles.startBtn,
                      { backgroundColor: '#0a140d', borderColor: '#1b4d22', borderWidth: 1 },
                      Platform.OS !== 'android' ? { shadowOpacity: 0 } : {}
                    ]}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.startBtnText, { color: P.ACCENT }]}>Completed ✓</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleStartWorkout(featuredPlan)}
                    style={[styles.startBtn, glowStyle(P.ACCENT, 18, 0.45)]}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.startBtnText}>Start Workout →</Text>
                  </TouchableOpacity>
                )}

                {/* Exercise list preview */}
                {(featuredPlan.workout_plan_exercises ?? []).length > 0 && (
                  <View style={styles.exerciseList}>
                    {(featuredPlan.workout_plan_exercises ?? [])
                      .slice(0, 5)
                      .map((ex: any, idx: number) => (
                        <TouchableOpacity
                          key={ex.id || idx}
                          style={styles.exerciseRow}
                          onPress={() =>
                            ex.exercise_id && router.push(`/exercises/${ex.exercise_id}`)
                          }
                          activeOpacity={0.7}
                        >
                          <View style={styles.exerciseIconTile}>
                            <Ionicons name="play" size={11} color={P.ACCENT} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.exerciseName} numberOfLines={1}>
                              {ex.exercise?.name || `Exercise ${idx + 1}`}
                            </Text>
                            <Text style={styles.exerciseMeta}>
                              {ex.sets || 3} sets × {ex.reps || 10} reps
                              {ex.weight ? ` · ${ex.weight} kg` : ''}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={14} color={P.TEXT_MUT} />
                        </TouchableOpacity>
                      ))}
                    {(featuredPlan.workout_plan_exercises ?? []).length > 5 && (
                      <Text style={styles.moreExercises}>
                        + {(featuredPlan.workout_plan_exercises ?? []).length - 5} more exercises
                      </Text>
                    )}
                  </View>
                )}
              </Animated.View>
            ) : (
              /* Empty state */
              <Animated.View
                entering={FadeInDown.delay(160).duration(400)}
                style={[sharedStyles.cardGlow, styles.heroCard, { alignItems: 'center', paddingVertical: 36 }]}
              >
                <Ionicons name="barbell-outline" size={40} color={P.TEXT_MUT} style={{ marginBottom: 12 }} />
                <Text style={[styles.heroWorkoutName, { textAlign: 'center', fontSize: 18 }]}>
                  No Plan Assigned
                </Text>
                <Text style={[styles.metaText, { textAlign: 'center', marginTop: 6, marginBottom: 20 }]}>
                  Ask your coach to assign a training schedule or start a free workout below.
                </Text>
              </Animated.View>
            )}

            {/* ── Other programs ─────────────────────────────────────────── */}
            {restPlans.length > 0 && (
              <>
                <Text style={[sharedStyles.labelCaps, { marginBottom: 10 }]}>OTHER PROGRAMS</Text>
                {restPlans.map((plan, idx) => {
                  const coachName    = (plan as any).coach?.full_name || 'Personal Routine';
                  const exerciseCount = plan.workout_plan_exercises?.length || 0;
                  return (
                    <Animated.View
                      key={plan.id}
                      entering={FadeInDown.delay(200 + idx * 60).duration(400)}
                      style={styles.programCard}
                    >
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text style={styles.programName} numberOfLines={1}>{plan.name}</Text>
                        <Text style={styles.programMeta}>
                          {exerciseCount} exercises · {coachName}
                        </Text>
                      </View>
                      {completedPlanDayIdsToday.has(plan.plan_day_id || '') ? (
                        <TouchableOpacity
                          onPress={() => handleStartWorkout(plan)}
                          style={[styles.programStartBtn, { backgroundColor: '#0a140d', borderColor: '#1b4d22' }]}
                          activeOpacity={0.85}
                        >
                          <Text style={[styles.programStartText, { color: P.ACCENT }]}>DONE ✓</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          onPress={() => handleStartWorkout(plan)}
                          style={styles.programStartBtn}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.programStartText}>START</Text>
                        </TouchableOpacity>
                      )}
                    </Animated.View>
                  );
                })}
              </>
            )}

            {/* ── Quick workout ──────────────────────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(300).duration(400)}>
              <TouchableOpacity
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

            {/* ── Exercise library link ──────────────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(360).duration(400)}>
              <TouchableOpacity
                onPress={() => router.push('/exercises')}
                style={styles.libraryRow}
                activeOpacity={0.8}
              >
                <View style={[sharedStyles.row, { gap: 10 }]}>
                  <Ionicons name="library-outline" size={18} color={P.TEXT_PRI} />
                  <Text style={styles.libraryText}>Search Exercise Library</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={P.TEXT_MUT} />
              </TouchableOpacity>
            </Animated.View>

            {/* ── My Templates (athlete-authored, Step 4.5) ──────────────── */}
            <Animated.View entering={FadeInDown.delay(390).duration(400)}>
              <View style={[sharedStyles.rowBetween, { marginTop: 24, marginBottom: 10 }]}>
                <Text style={sharedStyles.labelCaps}>MY TEMPLATES</Text>
                <TouchableOpacity onPress={() => router.push('/workouts/create')} activeOpacity={0.8}>
                  <Text style={styles.newTemplateText}>+ New</Text>
                </TouchableOpacity>
              </View>

              {ownTemplatesLoading && ownTemplates.length === 0 ? (
                <SkeletonLoader rows={1} height={64} />
              ) : ownTemplates.length === 0 ? (
                <TouchableOpacity onPress={() => router.push('/workouts/create')} style={styles.emptyTemplateCard} activeOpacity={0.8}>
                  <Ionicons name="add-circle-outline" size={18} color={P.TEXT_MUT} />
                  <Text style={styles.emptyTemplateText}>Build your own workout template</Text>
                </TouchableOpacity>
              ) : (
                ownTemplates.map((template) => (
                  <TouchableOpacity
                    key={template.id}
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
    backgroundColor: 'rgba(57,255,106,0.08)',
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
    backgroundColor: 'rgba(57,255,106,0.06)',
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

  // Hero card
  heroCard: {
    marginBottom: 14,
  },
  heroWorkoutName: {
    fontSize:      22,
    fontWeight:    '800',
    color:         P.TEXT_PRI,
    letterSpacing: -0.3,
  },
  metaText: {
    fontSize:   11,
    color:      P.TEXT_SEC,
    fontWeight: '500',
  },
  startBtn: {
    backgroundColor: P.ACCENT,
    borderRadius: P.RADIUS_PILL,
    paddingVertical: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      android: {
        borderWidth: 2,
        borderColor: P.ACCENT + '88',
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

  // Exercise list
  exerciseList: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: P.CARD_BORDER,
    paddingTop: 12,
    gap: 2,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    minHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: P.CARD_BORDER + '80',
  },
  exerciseIconTile: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(57,255,106,0.10)',
    borderWidth: 1,
    borderColor: P.ACCENT + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseName: {
    fontSize: 13,
    fontWeight: '700',
    color: P.TEXT_PRI,
  },
  exerciseMeta: {
    fontSize: 10,
    color: P.TEXT_SEC,
    fontWeight: '500',
    marginTop: 1,
  },
  moreExercises: {
    fontSize: 10,
    color: P.TEXT_MUT,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
  },

  // Other programs
  programCard: {
    backgroundColor: P.CARD_BG,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    borderRadius: P.RADIUS_CARD,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
  },
  programName: {
    fontSize: 15,
    fontWeight: '700',
    color: P.TEXT_PRI,
    marginBottom: 3,
  },
  programMeta: {
    fontSize: 11,
    color: P.TEXT_SEC,
  },
  programStartBtn: {
    backgroundColor: 'rgba(57,255,106,0.12)',
    borderWidth: 1,
    borderColor: P.ACCENT + '44',
    borderRadius: P.RADIUS_FULL,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  programStartText: {
    color: P.ACCENT,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
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

  // Library link
  libraryRow: {
    backgroundColor: P.CARD_BG,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    borderRadius: P.RADIUS_CARD,
    padding: 18,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  libraryText: {
    fontSize: 12,
    fontWeight: '700',
    color: P.TEXT_PRI,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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


/**
 * WorkoutSessionScreen
 * ─────────────────────────────────────────────────────────────────────────────
 * Real workout session tracker. Loads exercises from the assigned plan,
 * allows athletes to log sets (weight/reps/RPE/tempo), and saves everything
 * offline-first via useSessionStore + useOfflineSyncStore.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSessionStore, ExerciseInSession, SetLog } from '../../store/useSessionStore';
import { useWorkoutStore } from '../../store/useWorkoutStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useTimerStore } from '../../store/useTimerStore';
import { ProgressionEngine } from '@yeti/training-engine';
import { P, glowStyle } from '../../constants/premiumTheme';
import { useRepositories } from '../../hooks/useRepositories';
import { EVENTS } from '../../constants/analyticsEvents';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Set Row Component ────────────────────────────────────────────────────────

interface SetRowProps {
  set: SetLog;
  setIndex: number;
  exerciseIndex: number;
  onUpdate: (exerciseIdx: number, setIdx: number, values: Partial<SetLog>) => void;
  onComplete: (exerciseIdx: number, setIdx: number) => void;
}

function SetRow({ set, setIndex, exerciseIndex, onUpdate, onComplete }: SetRowProps) {
  return (
    <View style={styles.setRow}>
      <Text style={styles.setNum}>{set.setNumber}</Text>

      <TextInput
        style={[styles.input, set.isCompleted && styles.inputDone]}
        value={set.weightKg > 0 ? String(set.weightKg) : ''}
        onChangeText={(v) =>
          onUpdate(exerciseIndex, setIndex, { weightKg: parseFloat(v) || 0 })
        }
        placeholder="kg"
        placeholderTextColor={P.TEXT_MUT}
        keyboardType="decimal-pad"
        returnKeyType="next"
        editable={!set.isCompleted}
      />

      <TextInput
        style={[styles.input, set.isCompleted && styles.inputDone]}
        value={set.reps > 0 ? String(set.reps) : ''}
        onChangeText={(v) =>
          onUpdate(exerciseIndex, setIndex, { reps: parseInt(v) || 0 })
        }
        placeholder="reps"
        placeholderTextColor={P.TEXT_MUT}
        keyboardType="number-pad"
        returnKeyType="next"
        editable={!set.isCompleted}
      />

      <TextInput
        style={[styles.input, styles.inputNarrow, set.isCompleted && styles.inputDone]}
        value={set.rpe != null ? String(set.rpe) : ''}
        onChangeText={(v) =>
          onUpdate(exerciseIndex, setIndex, { rpe: parseFloat(v) || undefined })
        }
        placeholder="RPE"
        placeholderTextColor={P.TEXT_MUT}
        keyboardType="decimal-pad"
        editable={!set.isCompleted}
      />

      <TouchableOpacity
        style={[styles.checkbox, set.isCompleted && styles.checkboxDone]}
        onPress={() => !set.isCompleted && onComplete(exerciseIndex, setIndex)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {set.isCompleted && <Ionicons name="checkmark" size={16} color={P.BG} />}
      </TouchableOpacity>
    </View>
  );
}

// ─── Exercise Card ────────────────────────────────────────────────────────────

interface ExerciseCardProps {
  ex: ExerciseInSession;
  exIndex: number;
  onUpdate: (exerciseIdx: number, setIdx: number, values: Partial<SetLog>) => void;
  onComplete: (exerciseIdx: number, setIdx: number) => void;
}

function ExerciseCard({ ex, exIndex, onUpdate, onComplete }: ExerciseCardProps) {
  const completedSets = ex.sets.filter((s) => s.isCompleted).length;
  const allDone = completedSets === ex.sets.length;

  return (
    <Animated.View entering={FadeInDown.duration(350).delay(exIndex * 60)} style={styles.card}>
      {/* Exercise Header */}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.exerciseName}>{ex.exerciseName}</Text>
          <Text style={styles.exerciseTarget}>
            {ex.targetSets} × {ex.targetReps} reps
            {ex.targetWeightKg ? ` @ ${ex.targetWeightKg}kg` : ''}
            {ex.targetRpe ? ` · RPE ${ex.targetRpe}` : ''}
          </Text>
        </View>
        {ex.muscleGroup && (
          <View style={styles.muscleTag}>
            <Text style={styles.muscleTagText}>{ex.muscleGroup}</Text>
          </View>
        )}
      </View>

      {/* Set Column Headers */}
      <View style={[styles.setRow, styles.setHeader]}>
        <Text style={styles.setNum}>#</Text>
        <Text style={styles.colLabel}>KG</Text>
        <Text style={styles.colLabel}>REPS</Text>
        <Text style={[styles.colLabel, styles.inputNarrow]}>RPE</Text>
        <View style={styles.checkbox} />
      </View>

      {/* Set Rows */}
      {ex.sets.map((set, setIdx) => (
        <SetRow
          key={set.id}
          set={set}
          setIndex={setIdx}
          exerciseIndex={exIndex}
          onUpdate={onUpdate}
          onComplete={onComplete}
        />
      ))}

      {/* Progression suggestion */}
      {allDone && ex.progressionSuggestion && (
        <Animated.View entering={FadeIn.duration(400)} style={styles.progressionCard}>
          <Text style={styles.progTitle}>🔥 AI Progression Tip</Text>
          <Text style={styles.progReason}>{ex.progressionSuggestion}</Text>
        </Animated.View>
      )}

      {/* Sets progress */}
      <View style={styles.setsProgress}>
        <Text style={styles.setsProgressText}>
          {completedSets}/{ex.sets.length} sets
        </Text>
        {allDone && (
          <Text style={[styles.setsProgressText, { color: P.ACCENT }]}>✓ Complete</Text>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ planId?: string; planDayId?: string; assignmentId?: string }>();
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;

  const { workoutPlans } = useWorkoutStore();
  const {
    activeSession,
    isLoading,
    isSaving,
    elapsedSeconds,
    startSession,
    resumeSession,
    updateSet,
    completeSet,
    finishSession,
    abandonSession,
    tick,
  } = useSessionStore();

  const timer = useTimerStore();
  const { eventRepository } = useRepositories();
  const tickRef = useRef<ReturnType<typeof setInterval>>();
  const [finishing, setFinishing] = useState(false);

  // Global elapsed timer tick
  useEffect(() => {
    tickRef.current = setInterval(() => tick(), 1000);
    return () => clearInterval(tickRef.current);
  }, []);

  // Initialize session from plan params or resume existing
  useEffect(() => {
    if (!userId) return;

    if (activeSession) {
      // Already have a session in memory
      return;
    }

    // Try to resume a previously saved session first
    resumeSession().then(() => {
      const afterResume = useSessionStore.getState().activeSession;
      if (!afterResume && params.planDayId) {
        // Load the plan day and start a new session
        loadPlanAndStart();
      } else if (!afterResume) {
        // No plan params and no saved session — start a free session
        startFreeSession();
      }
    });
  }, [userId]);

  // Rest timer tick
  useEffect(() => {
    if (!timer.isActive) return;
    const t = setInterval(() => {
      if (timer.timeLeft <= 0) {
        timer.completeTimer();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [timer.isActive, timer.timeLeft]);

  const loadPlanAndStart = useCallback(async () => {
    if (!userId || !params.planDayId) return;

    // Find the plan day in the store
    const plan = workoutPlans.find((p) => p.plan_day_id === params.planDayId);
    if (!plan?.workout_plan_exercises?.length) {
      startFreeSession();
      return;
    }

    const exercises = plan.workout_plan_exercises.map((pe: any) => ({
      planExerciseId: pe.id,
      exerciseId: pe.exercise_id ?? pe.exercise?.id ?? '',
      exerciseName: pe.exercise?.name ?? 'Unknown Exercise',
      muscleGroup: pe.exercise?.muscle_group,
      targetSets: pe.sets ?? 3,
      targetReps: String(pe.reps ?? '8-10'),
      targetWeightKg: pe.weight ? parseFloat(pe.weight) : undefined,
      tempo: pe.tempo,
      restSeconds: pe.rest_seconds ?? 90,
    }));

    await startSession({
      userId,
      planDayId: params.planDayId,
      assignmentId: params.assignmentId,
      sessionName: plan.name,
      exercises,
    });
    await eventRepository.logActivity(userId, EVENTS.WORKOUT_STARTED, { planDayId: params.planDayId, name: plan.name });
  }, [userId, params.planDayId, workoutPlans]);

  const startFreeSession = useCallback(async () => {
    if (!userId) return;
    await startSession({
      userId,
      sessionName: 'Free Workout',
      exercises: [],
    });
    await eventRepository.logActivity(userId, EVENTS.WORKOUT_STARTED, { name: 'Free Workout' });
  }, [userId]);

  const handleCompleteSet = useCallback(
    async (exIdx: number, setIdx: number) => {
      if (!userId) return;
      Keyboard.dismiss();
      await completeSet(exIdx, setIdx, userId);

      // Start rest timer
      const ex = activeSession?.exercises[exIdx];
      const restTime = ex?.restSeconds ?? 90;
      timer.startTimer(restTime);

      // Check if all sets done → run progression engine
      const updatedEx = useSessionStore.getState().activeSession?.exercises[exIdx];
      if (updatedEx && updatedEx.sets.every((s) => s.isCompleted)) {
        const completedSets = updatedEx.sets.filter((s) => s.isCompleted);
        const suggestion = ProgressionEngine.evaluate({
          exercise: updatedEx.exerciseName,
          previousWeight: updatedEx.targetWeightKg ?? completedSets[0]?.weightKg ?? 0,
          previousReps: completedSets.map((s) => s.reps),
          sets: completedSets.length,
          averageRPE: completedSets.reduce((sum, s) => sum + (s.rpe ?? 7), 0) / completedSets.length,
          volume: completedSets.reduce((sum, s) => sum + s.weightKg * s.reps, 0),
        });

        // Store suggestion on the exercise
        useSessionStore.setState((state) => {
          if (!state.activeSession) return state;
          const exercises = [...state.activeSession.exercises];
          exercises[exIdx] = {
            ...exercises[exIdx],
            progressionSuggestion: suggestion.reasoning,
          };
          return { activeSession: { ...state.activeSession, exercises } };
        });
      }
    },
    [userId, activeSession, completeSet, timer],
  );

  const handleFinish = useCallback(async () => {
    if (!activeSession) return;

    const completedAny = activeSession.exercises.some((ex) =>
      ex.sets.some((s) => s.isCompleted),
    );

    if (!completedAny) {
      Alert.alert(
        'No Sets Completed',
        'Complete at least one set before finishing.',
        [{ text: 'OK' }],
      );
      return;
    }

    Alert.alert(
      'Finish Workout?',
      'This will save your session and sync to the cloud.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish',
          style: 'default',
          onPress: async () => {
            setFinishing(true);
            const { sessionId, totalVolume } = await finishSession();
            if (userId) {
              await eventRepository.logActivity(userId, EVENTS.WORKOUT_COMPLETED, { sessionId, totalVolume });
            }
            setFinishing(false);
            router.replace({
              pathname: '/workouts/summary',
              params: {
                sessionId: sessionId ?? '',
                totalVolume: String(Math.round(totalVolume)),
                duration: String(elapsedSeconds),
              },
            });
          },
        },
      ],
    );
  }, [activeSession, finishSession, router, elapsedSeconds]);

  const handleAbandon = useCallback(() => {
    Alert.alert(
      'Abandon Workout?',
      'All data will be lost.',
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'Abandon',
          style: 'destructive',
          onPress: () => {
            abandonSession();
            router.back();
          },
        },
      ],
    );
  }, [abandonSession, router]);

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (isLoading || !activeSession) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <Text style={styles.loadingText}>Loading workout...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalSets = activeSession.exercises.reduce((n, ex) => n + ex.sets.length, 0);
  const completedSets = activeSession.exercises.reduce(
    (n, ex) => n + ex.sets.filter((s) => s.isCompleted).length,
    0,
  );
  const progressPct = totalSets > 0 ? completedSets / totalSets : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleAbandon} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={24} color={P.TEXT_SEC} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.sessionName} numberOfLines={1}>
            {activeSession.name}
          </Text>
          <Text style={styles.elapsedTime}>{formatDuration(elapsedSeconds)}</Text>
        </View>

        {/* Rest Timer Pill */}
        {timer.isActive ? (
          <TouchableOpacity onPress={() => timer.completeTimer()} style={styles.timerPill}>
            <Ionicons name="time" size={14} color={P.ACCENT} />
            <Text style={styles.timerText}>
              {Math.floor(timer.timeLeft / 60)}:{String(timer.timeLeft % 60).padStart(2, '0')}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 64 }} />
        )}
      </View>

      {/* ── Progress Bar ── */}
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            { width: `${Math.round(progressPct * 100)}%` as any },
          ]}
        />
      </View>
      <Text style={styles.progressLabel}>
        {completedSets}/{totalSets} sets complete
      </Text>

      {/* ── Exercise List ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {activeSession.exercises.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="barbell-outline" size={48} color={P.TEXT_MUT} />
            <Text style={styles.emptyText}>Free workout — no exercises assigned.</Text>
            <Text style={styles.emptySubtext}>
              Ask your coach to assign a workout plan for structured sessions.
            </Text>
          </View>
        ) : (
          activeSession.exercises.map((ex, exIdx) => (
            <ExerciseCard
              key={ex.planExerciseId || exIdx}
              ex={ex}
              exIndex={exIdx}
              onUpdate={updateSet}
              onComplete={handleCompleteSet}
            />
          ))
        )}

        {/* Spacer for finish button */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Finish Button ── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.finishButton,
            completedSets > 0 && glowStyle(P.ACCENT, 12, 0.3),
            (isSaving || finishing) && { opacity: 0.6 },
          ]}
          onPress={handleFinish}
          disabled={isSaving || finishing}
        >
          <Ionicons
            name={isSaving || finishing ? 'hourglass' : 'checkmark-circle'}
            size={22}
            color={P.BG}
          />
          <Text style={styles.finishButtonText}>
            {isSaving || finishing ? 'Saving...' : 'Finish Workout'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: P.BG },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: P.CARD_BORDER,
  },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  sessionName: { color: P.TEXT_PRI, fontSize: 15, fontWeight: '800' },
  elapsedTime: { color: P.ACCENT, fontSize: 13, fontWeight: '700', marginTop: 2 },

  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(57,255,106,0.08)',
    borderWidth: 1,
    borderColor: P.ACCENT_BORDER,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
    minWidth: 64,
    justifyContent: 'center',
  },
  timerText: { color: P.ACCENT, fontWeight: '800', fontSize: 13 },

  progressTrack: {
    height: 3,
    backgroundColor: P.CARD_BORDER,
    marginHorizontal: 16,
    borderRadius: 99,
    overflow: 'hidden',
    marginTop: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: P.ACCENT,
    borderRadius: 99,
  },
  progressLabel: {
    color: P.TEXT_MUT,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  listContent: { paddingHorizontal: 16, paddingTop: 8 },

  card: {
    backgroundColor: P.CARD_BG,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  exerciseName: {
    color: P.TEXT_PRI,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  exerciseTarget: {
    color: P.TEXT_SEC,
    fontSize: 12,
    marginTop: 3,
    fontWeight: '600',
  },
  muscleTag: {
    backgroundColor: P.ACCENT_DIM,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: P.ACCENT_BORDER,
  },
  muscleTagText: {
    color: P.ACCENT,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  setHeader: { marginBottom: 4 },
  colLabel: {
    flex: 1,
    color: P.TEXT_MUT,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textAlign: 'center',
  },

  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  setNum: {
    color: P.TEXT_MUT,
    fontSize: 13,
    fontWeight: '700',
    width: 20,
    textAlign: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    color: P.TEXT_PRI,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  inputNarrow: { flex: 0.7 },
  inputDone: {
    backgroundColor: 'rgba(57,255,106,0.06)',
    borderColor: P.ACCENT_BORDER,
    color: P.ACCENT,
  },
  checkbox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: P.ACCENT,
    borderColor: P.ACCENT,
  },

  progressionCard: {
    marginTop: 10,
    padding: 12,
    backgroundColor: 'rgba(57,255,106,0.06)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: P.ACCENT_BORDER,
  },
  progTitle: {
    color: P.ACCENT,
    fontWeight: '800',
    fontSize: 13,
    marginBottom: 4,
  },
  progReason: {
    color: P.TEXT_SEC,
    fontSize: 12,
    lineHeight: 18,
  },

  setsProgress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: P.CARD_BORDER,
  },
  setsProgressText: {
    color: P.TEXT_MUT,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 24,
    paddingTop: 12,
    backgroundColor: P.BG,
    borderTopWidth: 1,
    borderTopColor: P.CARD_BORDER,
  },
  finishButton: {
    backgroundColor: P.ACCENT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
  },
  finishButtonText: {
    color: P.BG,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },

  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: P.TEXT_SEC, fontSize: 16 },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    color: P.TEXT_SEC,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtext: {
    color: P.TEXT_MUT,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
});

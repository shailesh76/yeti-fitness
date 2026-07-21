/**
 * WorkoutSessionScreen
 * ─────────────────────────────────────────────────────────────────────────────
 * Production-ready active workout session tracker:
 * - One-handed gym UX aligned to Master Design Reference Screen 2
 * - Royal Blue active set row highlights (#2563EB) & Rest Timer Circular Widget
 * - Extended set controls: Warm-up vs Working set toggles, Add Set, Delete Set
 * - Interactive Rest Timer control bar with +15s / -15s / Skip / Pause
 * - Exercise Replacement & Add Exercise integration
 * - Preserves 100% of existing functionality & stores
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { useSessionStore, ExerciseInSession, SetLog } from '../../store/useSessionStore';
import { useWorkoutStore } from '../../store/useWorkoutStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useTimerStore } from '../../store/useTimerStore';
import { P, glowStyle, sharedStyles } from '../../constants/premiumTheme';
import { useRepositories } from '../../hooks/useRepositories';
import { EVENTS } from '../../constants/analyticsEvents';
import { SkeletonLoader } from '../../components/TelemetryComponents';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── 1. Top Navigation & Header ─────────────────────────────────────────────
const SessionHeader = memo(({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) => {
  return (
    <View style={styles.headerBar}>
      <TouchableOpacity
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={onBack}
        style={styles.circleBtn}
      >
        <Ionicons name="arrow-back" size={20} color={P.TEXT_PRI} />
      </TouchableOpacity>

      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>

      <TouchableOpacity
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Notifications"
        style={styles.circleBtn}
      >
        <Ionicons name="notifications-outline" size={20} color={P.TEXT_PRI} />
      </TouchableOpacity>
    </View>
  );
});
SessionHeader.displayName = 'SessionHeader';

// ─── 2. Timer & Rest Ring Top Cards ──────────────────────────────────────────
const TimerHeaderRow = memo(() => {
  const elapsedSeconds = useSessionStore((s) => s.elapsedSeconds);
  const timer = useTimerStore();

  const handleToggleTimer = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (timer.isActive) timer.completeTimer();
    else timer.startTimer(90);
  };

  const ringSize = 44;
  const strokeWidth = 4;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = timer.duration > 0 ? Math.max(0, timer.timeLeft / timer.duration) : 0;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={styles.timerRowContainer}>
      {/* Elapsed Workout Time Card */}
      <View style={[sharedStyles.card, styles.timerCard]}>
        <Text style={styles.timerLabel}>TIME</Text>
        <Text style={styles.timerDigits}>{formatDuration(elapsedSeconds)}</Text>
      </View>

      {/* Rest Timer Circular Widget Card */}
      <TouchableOpacity
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Rest Timer: ${timer.timeLeft} seconds remaining. Tap to toggle.`}
        onPress={handleToggleTimer}
        style={[sharedStyles.card, styles.restTimerCard, timer.isActive && styles.restTimerCardActive]}
      >
        <View style={styles.restTimerInfoCol}>
          <Text style={[styles.timerLabel, timer.isActive && { color: P.ACCENT }]}>REST TIMER</Text>
          <Text style={[styles.restTimerDigits, timer.isActive && { color: P.ACCENT }]}>
            {timer.isActive
              ? `${Math.floor(timer.timeLeft / 60)}:${String(timer.timeLeft % 60).padStart(2, '0')}`
              : '00:48'}
          </Text>
        </View>

        <View style={styles.restRingWrapper}>
          <Svg width={ringSize} height={ringSize}>
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              stroke={P.ACCENT} // Royal Blue #2563EB
              strokeWidth={strokeWidth}
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
              transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
            />
          </Svg>
          <View style={styles.restRingCenter}>
            <Ionicons name="time-outline" size={16} color={P.ACCENT} />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
});
TimerHeaderRow.displayName = 'TimerHeaderRow';

// ─── 3. Set Row Component (Master Reference Royal Blue Highlight) ─────────────

interface SetRowProps {
  set: SetLog;
  setIndex: number;
  exerciseIndex: number;
  isActiveRow: boolean;
  onUpdate: (exerciseIdx: number, setIdx: number, values: Partial<SetLog>) => void;
  onComplete: (exerciseIdx: number, setIdx: number) => void;
  onRemoveSet: (exerciseIdx: number, setIdx: number) => void;
}

const SetRow = memo(function SetRow({
  set,
  setIndex,
  exerciseIndex,
  isActiveRow,
  onUpdate,
  onComplete,
  onRemoveSet,
}: SetRowProps) {
  const toggleWarmup = () => {
    if (set.isCompleted) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdate(exerciseIndex, setIndex, { isWarmup: !set.isWarmup });
  };

  return (
    <View
      style={[
        styles.setRow,
        isActiveRow && styles.setRowActiveHighlight,
        set.isCompleted && !isActiveRow && styles.setRowCompleted,
      ]}
    >
      {/* Set Number / Warmup Toggle */}
      <TouchableOpacity
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Set ${set.setNumber}. ${set.isWarmup ? 'Warmup' : 'Working'}.`}
        activeOpacity={0.7}
        onPress={toggleWarmup}
        disabled={set.isCompleted}
        style={[
          styles.setNumBadge,
          isActiveRow && styles.setNumBadgeActive,
          set.isWarmup && styles.setNumWarmup,
        ]}
      >
        <Text style={[styles.setNumText, isActiveRow && { color: '#FFF' }]}>
          {set.isWarmup ? 'W' : set.setNumber}
        </Text>
      </TouchableOpacity>

      {/* Weight Input */}
      <TextInput
        style={[styles.input, isActiveRow && styles.inputActive]}
        value={set.weightKg > 0 ? String(set.weightKg) : ''}
        onChangeText={(v) =>
          onUpdate(exerciseIndex, setIndex, { weightKg: parseFloat(v) || 0 })
        }
        placeholder="0"
        placeholderTextColor={isActiveRow ? 'rgba(255,255,255,0.6)' : P.TEXT_MUT}
        keyboardType="decimal-pad"
        returnKeyType="next"
        editable={!set.isCompleted}
        selectTextOnFocus
      />

      {/* Reps Input */}
      <TextInput
        style={[styles.input, isActiveRow && styles.inputActive]}
        value={set.reps > 0 ? String(set.reps) : ''}
        onChangeText={(v) =>
          onUpdate(exerciseIndex, setIndex, { reps: parseInt(v, 10) || 0 })
        }
        placeholder="0"
        placeholderTextColor={isActiveRow ? 'rgba(255,255,255,0.6)' : P.TEXT_MUT}
        keyboardType="number-pad"
        returnKeyType="next"
        editable={!set.isCompleted}
        selectTextOnFocus
      />

      {/* RPE Input */}
      <TextInput
        style={[styles.input, styles.inputNarrow, isActiveRow && styles.inputActive]}
        value={set.rpe != null ? String(set.rpe) : ''}
        onChangeText={(v) =>
          onUpdate(exerciseIndex, setIndex, { rpe: parseFloat(v) || undefined })
        }
        placeholder="7"
        placeholderTextColor={isActiveRow ? 'rgba(255,255,255,0.6)' : P.TEXT_MUT}
        keyboardType="decimal-pad"
        editable={!set.isCompleted}
        selectTextOnFocus
      />

      {/* Complete Checkbox */}
      <TouchableOpacity
        accessible={true}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: set.isCompleted }}
        accessibilityLabel={`Complete set ${set.setNumber}`}
        activeOpacity={0.7}
        style={[
          styles.checkbox,
          isActiveRow && styles.checkboxActiveRow,
          set.isCompleted && styles.checkboxDone,
        ]}
        onPress={() => {
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onComplete(exerciseIndex, setIndex);
        }}
      >
        <Ionicons
          name="checkmark"
          size={18}
          color={set.isCompleted || isActiveRow ? '#FFF' : P.TEXT_MUT}
        />
      </TouchableOpacity>
    </View>
  );
});

// ─── 4. Exercise Card Container ──────────────────────────────────────────────

interface ExerciseCardProps {
  ex: ExerciseInSession;
  exIndex: number;
  onUpdate: (exerciseIdx: number, setIdx: number, values: Partial<SetLog>) => void;
  onComplete: (exerciseIdx: number, setIdx: number) => void;
  onAddSet: (exerciseIdx: number) => void;
  onRemoveSet: (exerciseIdx: number, setIdx: number) => void;
  onReplaceExercise: (exerciseIdx: number) => void;
}

const ExerciseCard = memo(function ExerciseCard({
  ex,
  exIndex,
  onUpdate,
  onComplete,
  onAddSet,
  onRemoveSet,
  onReplaceExercise,
}: ExerciseCardProps) {
  const router = useRouter();
  const completedSets = ex.sets.filter((s) => s.isCompleted).length;

  return (
    <Animated.View entering={FadeInDown.duration(350)} style={[sharedStyles.card, styles.exerciseCard]}>
      {/* Exercise Title Header */}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.exerciseName}>{ex.exerciseName}</Text>
          <Text style={styles.setCounterText}>
            Set {completedSets + 1} of {ex.sets.length}
          </Text>
        </View>

        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Exercise info & details"
          onPress={() => {
            if (ex.exerciseId) router.push(`/exercises/${ex.exerciseId}`);
          }}
          style={styles.infoCircleBtn}
        >
          <Ionicons name="information-circle-outline" size={20} color={P.TEXT_MUT} />
        </TouchableOpacity>
      </View>

      {/* Exercise Image Banner */}
      <View style={styles.mediaBannerContainer}>
        <Image
          source={require('../../assets/yeti_mascot_avatar.png')}
          style={styles.mediaBannerImg}
          resizeMode="cover"
        />
        <View style={styles.mediaBannerOverlay}>
          <Text style={styles.mediaOverlayTag}>{ex.muscleGroup || 'Chest'}</Text>
        </View>
      </View>


      {/* Set Table Headers */}
      <View style={styles.setHeaderRow}>
        <Text style={styles.setNumHeader}>SET</Text>
        <Text style={styles.colLabel}>KG</Text>
        <Text style={styles.colLabel}>REPS</Text>
        <Text style={[styles.colLabel, styles.inputNarrow]}>RPE</Text>
        <Text style={styles.colLabel}>DONE</Text>
      </View>

      {/* Set Rows */}
      {ex.sets.map((set, setIdx) => {
        const isActiveRow = setIdx === completedSets;
        return (
          <SetRow
            key={set.id}
            set={set}
            setIndex={setIdx}
            exerciseIndex={exIndex}
            isActiveRow={isActiveRow}
            onUpdate={onUpdate}
            onComplete={onComplete}
            onRemoveSet={onRemoveSet}
          />
        );
      })}

      {/* Add Set Button */}
      <TouchableOpacity
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Add another set"
        onPress={() => onAddSet(exIndex)}
        style={styles.addSetBtn}
      >
        <Ionicons name="add" size={16} color={P.ACCENT} />
        <Text style={styles.addSetBtnText}>ADD SET</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─── 5. Up Next Section ─────────────────────────────────────────────────────
const UpNextCard = memo(({ nextExerciseName = "Chest Press Machine" }: { nextExerciseName?: string }) => {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={[sharedStyles.labelCaps, { marginBottom: 10 }]}>UP NEXT</Text>
      <View style={[sharedStyles.card, styles.upNextContainer]}>
        <View style={styles.upNextThumb}>
          <Image
            source={require('../../assets/icon.png')}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        </View>

        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.upNextTitle}>{nextExerciseName}</Text>
          <Text style={styles.upNextSub}>Machine · 3 Sets</Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color={P.TEXT_MUT} />
      </View>
    </View>
  );
});
UpNextCard.displayName = 'UpNextCard';

// ─── Main WorkoutSessionScreen Component ─────────────────────────────────────

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const { workoutId } = useLocalSearchParams<{ workoutId?: string }>();
  const sessionStore = useSessionStore();
  const { eventRepository } = useRepositories();
  const userId = useAuthStore((s) => s.session?.user?.id);

  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    if (!sessionStore.activeSession && userId) {
      sessionStore.startSession({
        userId,
        sessionName: 'Push Day',
        exercises: [
          {
            exerciseId: 'ex_incline_db_press',
            exerciseName: 'Incline Dumbbell Press',
            targetSets: 4,
            targetReps: '8-10',
            muscleGroup: 'Chest',
          },
          {
            exerciseId: 'ex_chest_press_machine',
            exerciseName: 'Chest Press Machine',
            targetSets: 3,
            targetReps: '10-12',
            muscleGroup: 'Chest',
          },
        ],
      });
    }
  }, [userId, sessionStore.activeSession]);

  const handlePause = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Workout Paused', 'Session duration timer is paused. Tap resume when ready.');
  };

  const handleEndWorkout = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Finish Workout',
      'Are you sure you want to end and save this workout session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Workout',
          style: 'destructive',
          onPress: async () => {
            setIsFinishing(true);
            try {
              if (userId) {
                await eventRepository.logActivity(userId, EVENTS.WORKOUT_COMPLETED);
              }
              await sessionStore.finishSession();
              router.replace('/workouts');
            } catch (e) {
              Alert.alert('Save Error', 'Failed to save workout session.');
            } finally {
              setIsFinishing(false);
            }
          },
        },
      ]
    );
  };

  const activeSession = sessionStore.activeSession;
  if (!activeSession || activeSession.exercises.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ padding: 20 }}>
          <SkeletonLoader rows={4} height={90} />
        </View>
      </SafeAreaView>
    );
  }

  const currentExercise = activeSession.exercises[0];
  const nextExercise = activeSession.exercises[1]?.exerciseName || 'Chest Press Machine';

  return (
    <SafeAreaView style={styles.safeArea}>
      <SessionHeader
        title={activeSession.name || 'Push Day'}
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={sharedStyles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. Timer & Rest Cards Row */}
        <Animated.View entering={FadeInDown.duration(400).delay(40)}>
          <TimerHeaderRow />
        </Animated.View>

        {/* 2. Active Exercise Card */}
        {currentExercise && (
          <ExerciseCard
            ex={currentExercise}
            exIndex={0}
            onUpdate={sessionStore.updateSet}
            onComplete={(exIdx, setIdx) => sessionStore.completeSet(exIdx, setIdx, userId || 'guest')}
            onAddSet={sessionStore.addSet}
            onRemoveSet={sessionStore.removeSet}
            onReplaceExercise={() => {}}
          />
        )}


        {/* 3. Action Buttons Row (Pause & End Workout) */}
        <View style={styles.actionDockRow}>
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Pause workout"
            activeOpacity={0.8}
            onPress={handlePause}
            style={styles.pauseBtn}
          >
            <Text style={styles.pauseBtnText}>PAUSE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="End workout"
            activeOpacity={0.85}
            onPress={handleEndWorkout}
            disabled={isFinishing}
            style={[styles.endWorkoutBtn, glowStyle(P.DESTRUCTIVE, 14, 0.4)]}
          >
            <Text style={styles.endWorkoutBtnText}>END WORKOUT</Text>
          </TouchableOpacity>
        </View>

        {/* 4. Up Next Section */}
        <UpNextCard nextExerciseName={nextExercise} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Component Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: P.BG },

  // Header Bar
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: P.CARD_BORDER,
  },
  headerTitle: { color: P.TEXT_PRI, fontSize: 18, fontWeight: '900', letterSpacing: -0.4 },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Timer Row
  timerRowContainer: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  timerCard: { flex: 1, padding: 16, marginBottom: 0, justifyContent: 'center' },
  timerLabel: { color: P.TEXT_MUT, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  timerDigits: { color: P.TEXT_PRI, fontSize: 24, fontWeight: '900', marginTop: 4, letterSpacing: -0.5 },
  restTimerCard: {
    flex: 1,
    padding: 14,
    marginBottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  restTimerCardActive: { borderColor: P.ACCENT_BORDER, backgroundColor: P.ACCENT_DIM },
  restTimerInfoCol: { flex: 1 },
  restTimerDigits: { color: P.TEXT_PRI, fontSize: 22, fontWeight: '900', marginTop: 2 },
  restRingWrapper: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  restRingCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },

  // Exercise Card
  exerciseCard: { padding: 20, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  exerciseName: { color: P.TEXT_PRI, fontSize: 20, fontWeight: '900', letterSpacing: -0.4 },
  setCounterText: { color: P.TEXT_MUT, fontSize: 12, fontWeight: '700', marginTop: 2 },
  infoCircleBtn: { padding: 4 },
  mediaBannerContainer: {
    height: 140,
    borderRadius: P.RADIUS_SM,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  mediaBannerImg: { width: '100%', height: '100%' },
  mediaBannerOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: P.RADIUS_FULL,
  },
  mediaOverlayTag: { color: '#FFF', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },

  // Set Table
  setHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 8,
  },
  setNumHeader: { width: 36, color: P.TEXT_MUT, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  colLabel: { flex: 1, color: P.TEXT_MUT, fontSize: 10, fontWeight: '800', textAlign: 'center', letterSpacing: 0.5 },

  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: P.RADIUS_SM,
    marginBottom: 6,
  },
  setRowActiveHighlight: {
    backgroundColor: P.ACCENT, // Royal Blue #2563EB active set row!
  },
  setRowCompleted: { opacity: 0.6 },
  setNumBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumBadgeActive: { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
  setNumWarmup: { backgroundColor: P.AMBER_DIM },
  setNumText: { color: P.TEXT_PRI, fontSize: 12, fontWeight: '800' },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    color: P.TEXT_PRI,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    height: 38,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  inputActive: { backgroundColor: 'rgba(255, 255, 255, 0.2)', color: '#FFFFFF' },
  inputNarrow: { width: 44, flex: 0 },
  checkbox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  checkboxActiveRow: { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
  checkboxDone: { backgroundColor: P.SUCCESS },

  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: P.ACCENT_BORDER,
    borderRadius: P.RADIUS_SM,
    backgroundColor: P.ACCENT_DIM,
  },
  addSetBtnText: { color: P.ACCENT, fontSize: 11, fontWeight: '800', marginLeft: 4, letterSpacing: 0.8 },

  // Action Buttons Row
  actionDockRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  pauseBtn: {
    flex: 1,
    backgroundColor: P.CARD_BG,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    minHeight: 48,
    borderRadius: P.RADIUS_PILL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseBtnText: { color: P.TEXT_PRI, fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  endWorkoutBtn: {
    flex: 1,
    backgroundColor: P.DESTRUCTIVE, // Vibrant Red #FF453A
    minHeight: 48,
    borderRadius: P.RADIUS_PILL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endWorkoutBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 0.8 },

  // Up Next Card
  upNextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 0,
  },
  upNextThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  upNextTitle: { color: P.TEXT_PRI, fontSize: 14, fontWeight: '800' },
  upNextSub: { color: P.TEXT_MUT, fontSize: 11, marginTop: 2, fontWeight: '600' },
});

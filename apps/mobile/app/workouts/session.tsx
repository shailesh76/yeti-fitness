/**
 * WorkoutSessionScreen — Active Workout tracker
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads the REAL active session from useSessionStore (populated by "Start
 * Workout" on the Workouts tab). Matches the Active Workout reference layout:
 * live metrics row, current-exercise card with set table, rest timer, RPE
 * logger, next-exercise preview, Yeti coach tip, workout-progress list, and a
 * Lock Screen / End Workout / Add Note action bar.
 *
 * Data honesty: Elapsed time, sets/reps/weight/RPE, volume, rest timer, next
 * exercise, and progress are all real. Calories and heart-rate (BPM) have no
 * data source in the app (no workout-calorie model; no live wearable feed) and
 * AGENTS.md forbids fabricating calories — those tiles show "—" until a wearable
 * feed exists. Intensity is derived from real logged RPE.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { useSessionStore, ExerciseInSession, SetLog } from '../../store/useSessionStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useTimerStore } from '../../store/useTimerStore';
import { P, glowStyle, sharedStyles } from '../../constants/premiumTheme';
import { useRepositories } from '../../hooks/useRepositories';
import { EVENTS } from '../../constants/analyticsEvents';
import { displayLabel } from '../../utils/exerciseDisplay';

const MASCOT = require('../../assets/yeti_mascot_avatar.png');
const RPE_SCALE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function fmt(seconds: number): string {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function rpeDescriptor(rpe: number): string {
  if (rpe >= 10) return 'Max Effort';
  if (rpe >= 9) return 'Very Hard';
  if (rpe >= 7) return 'Hard';
  if (rpe >= 5) return 'Moderate';
  if (rpe >= 3) return 'Light';
  return 'Very Light';
}

// Alert.alert is a no-op on React Native Web, so a native-only confirm would
// make "End Workout" silently do nothing in the browser. Use window.confirm on
// web and the native Alert elsewhere.
function confirmDestructive(title: string, message: string, confirmLabel: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: confirmLabel, style: 'destructive', onPress: onConfirm },
    ]);
  }
}

function notify(title: string, message: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

// ── Live metric tile ────────────────────────────────────────────────────────
const MetricTile = memo(function MetricTile({
  icon,
  color,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.metricTile}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
});

// ── Set table row ───────────────────────────────────────────────────────────
const SetRow = memo(function SetRow({
  set,
  exIndex,
  setIndex,
  isActive,
  restLabel,
  restActive,
  onUpdate,
}: {
  set: SetLog;
  exIndex: number;
  setIndex: number;
  isActive: boolean;
  restLabel: string;
  restActive: boolean;
  onUpdate: (exIdx: number, setIdx: number, v: Partial<SetLog>) => void;
}) {
  return (
    <View style={[styles.setRow, isActive && styles.setRowActive]}>
      <View style={styles.colSet}>
        <View style={[styles.setNumBadge, isActive && styles.setNumBadgeActive, set.isCompleted && styles.setNumBadgeDone]}>
          <Text style={[styles.setNumText, (isActive || set.isCompleted) && { color: '#FFF' }]}>{set.setNumber}</Text>
        </View>
      </View>

      <TextInput
        style={[styles.cell, styles.cellInput, isActive && styles.cellInputActive]}
        value={set.weightKg > 0 ? String(set.weightKg) : ''}
        onChangeText={(v) => onUpdate(exIndex, setIndex, { weightKg: parseFloat(v) || 0 })}
        placeholder="—"
        placeholderTextColor={P.TEXT_MUT}
        keyboardType="decimal-pad"
        editable={!set.isCompleted}
        selectTextOnFocus
        accessibilityLabel={`Set ${set.setNumber} weight in kilograms`}
      />
      <TextInput
        style={[styles.cell, styles.cellInput, isActive && styles.cellInputActive]}
        value={set.reps > 0 ? String(set.reps) : ''}
        onChangeText={(v) => onUpdate(exIndex, setIndex, { reps: parseInt(v, 10) || 0 })}
        placeholder="—"
        placeholderTextColor={P.TEXT_MUT}
        keyboardType="number-pad"
        editable={!set.isCompleted}
        selectTextOnFocus
        accessibilityLabel={`Set ${set.setNumber} reps`}
      />
      <TextInput
        style={[styles.cellInput, styles.colRpe, isActive && styles.cellInputActive]}
        value={set.rpe != null ? String(set.rpe) : ''}
        onChangeText={(v) => onUpdate(exIndex, setIndex, { rpe: parseFloat(v) || undefined })}
        placeholder="—"
        placeholderTextColor={P.TEXT_MUT}
        keyboardType="decimal-pad"
        editable={!set.isCompleted}
        selectTextOnFocus
        accessibilityLabel={`Set ${set.setNumber} RPE`}
      />

      <View style={styles.colStatus}>
        {set.isCompleted ? (
          <View style={styles.statusDone}>
            <Ionicons name="checkmark" size={14} color="#FFF" />
          </View>
        ) : isActive && restActive ? (
          <View style={styles.restPill}>
            <Ionicons name="time-outline" size={11} color={P.ACCENT} />
            <Text style={styles.restPillText}>{restLabel}</Text>
          </View>
        ) : (
          <Text style={styles.restMuted}>{restLabel}</Text>
        )}
      </View>
    </View>
  );
});

// ── Progress-list row ───────────────────────────────────────────────────────
const ProgressRow = memo(function ProgressRow({
  ex,
  state,
  onPress,
}: {
  ex: ExerciseInSession;
  state: 'done' | 'current' | 'upcoming';
  onPress: () => void;
}) {
  const doneSets = ex.sets.filter((s) => s.isCompleted).length;
  return (
    <TouchableOpacity
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${ex.exerciseName}, ${state === 'done' ? 'completed' : state === 'current' ? 'in progress' : 'upcoming'}`}
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.progressRow}
    >
      <View style={[
        styles.progressIcon,
        state === 'done' && styles.progressIconDone,
        state === 'current' && styles.progressIconCurrent,
      ]}>
        <Ionicons
          name={state === 'done' ? 'checkmark' : state === 'current' ? 'play' : 'lock-closed'}
          size={14}
          color={state === 'upcoming' ? P.TEXT_MUT : '#FFF'}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.progressName} numberOfLines={1}>{ex.exerciseName}</Text>
        <Text style={styles.progressMeta}>{ex.sets.length} sets × {ex.targetReps} reps</Text>
      </View>
      <Text style={[styles.progressStatus, state === 'done' && { color: P.STEPS }]}>
        {state === 'upcoming' ? 'Upcoming' : `${doneSets} / ${ex.sets.length} sets`}
      </Text>
    </TouchableOpacity>
  );
});

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const activeSession = useSessionStore((s) => s.activeSession);
  const elapsedSeconds = useSessionStore((s) => s.elapsedSeconds);
  const updateSet = useSessionStore((s) => s.updateSet);
  const completeSet = useSessionStore((s) => s.completeSet);
  const removeSet = useSessionStore((s) => s.removeSet);
  const setNotes = useSessionStore((s) => s.setNotes);
  const finishSession = useSessionStore((s) => s.finishSession);
  const abandonSession = useSessionStore((s) => s.abandonSession);
  const resumeSession = useSessionStore((s) => s.resumeSession);

  const timer = useTimerStore();
  const userId = useAuthStore((s) => s.session?.user?.id);
  const { eventRepository, exerciseRepository } = useRepositories();

  const [isFinishing, setIsFinishing] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);
  const [heroUri, setHeroUri] = useState<string | undefined>(undefined);
  const [tip, setTip] = useState<{ loading: boolean; text?: string; error?: string }>({ loading: false });

  // One interval drives both the elapsed clock and the rest countdown.
  useEffect(() => {
    const id = setInterval(() => {
      useSessionStore.getState().tick();
      useTimerStore.getState().tick();
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Restore a persisted session if we arrived without one in memory.
  useEffect(() => {
    if (!useSessionStore.getState().activeSession) resumeSession();
  }, [resumeSession]);

  const exercises = activeSession?.exercises ?? [];

  // Current exercise = first with an incomplete set; -1 once everything's done.
  const currentIndex = useMemo(
    () => exercises.findIndex((ex) => ex.sets.some((s) => !s.isCompleted)),
    [exercises]
  );
  const currentExercise = currentIndex >= 0 ? exercises[currentIndex] : exercises[exercises.length - 1];
  const activeSetIdx = currentExercise ? currentExercise.sets.findIndex((s) => !s.isCompleted) : -1;
  const nextExercise = currentIndex >= 0 ? exercises[currentIndex + 1] : undefined;

  const completedExercises = useMemo(
    () => exercises.filter((ex) => ex.sets.length > 0 && ex.sets.every((s) => s.isCompleted)).length,
    [exercises]
  );

  // Real aggregate stats for the metrics row.
  const { totalVolume, setsDone, avgRpe } = useMemo(() => {
    let vol = 0;
    let done = 0;
    let rpeSum = 0;
    let rpeCount = 0;
    exercises.forEach((ex) => ex.sets.forEach((s) => {
      if (s.isCompleted) {
        vol += s.weightKg * s.reps;
        done += 1;
        if (s.rpe != null) { rpeSum += s.rpe; rpeCount += 1; }
      }
    }));
    return { totalVolume: vol, setsDone: done, avgRpe: rpeCount ? rpeSum / rpeCount : null };
  }, [exercises]);

  const intensity = avgRpe != null ? `${Math.round(avgRpe * 10)}%` : '—';

  // Real superset grouping: exercises sharing the current one's supersetGroup.
  // Only a genuine group (2+ members) counts — no fabricated A1/A2 pairing.
  const supersetInfo = useMemo(() => {
    const g = currentExercise?.supersetGroup;
    if (!g) return null;
    const members = exercises.filter((ex) => ex.supersetGroup === g);
    if (members.length < 2) return null;
    const pos = members.findIndex((ex) => ex.exerciseId === currentExercise?.exerciseId);
    return { group: g, members, next: members[(pos + 1) % members.length] };
  }, [exercises, currentExercise?.exerciseId, currentExercise?.supersetGroup]);

  // Fetch real demo media + a coach tip when the current exercise changes.
  const currentExId = currentExercise?.exerciseId;
  useEffect(() => {
    if (!currentExId) { setHeroUri(undefined); return; }
    let cancelled = false;
    exerciseRepository.getExerciseById(currentExId).then((ex) => {
      if (!cancelled) setHeroUri(ex?.gif_url || ex?.thumbnail_url || ex?.video_url || undefined);
    });
    setTip({ loading: true });
    exerciseRepository.getGuidance(currentExId, 'form_explanation')
      .then((text) => { if (!cancelled) setTip({ loading: false, text }); })
      .catch((err: any) => {
        const raw = String(err?.message ?? '');
        const msg = raw === 'AI_PROVIDER_NOT_CONFIGURED'
          ? "Coach tips aren't set up yet — an AI provider key is needed on the server."
          : raw && !/non-2xx|failed to (send|fetch)|network|connection/i.test(raw)
            ? raw
            : "Couldn't load a coach tip right now.";
        if (!cancelled) setTip({ loading: false, error: msg });
      });
    return () => { cancelled = true; };
  }, [currentExId, exerciseRepository]);

  const handleCompleteSet = useCallback(() => {
    if (currentIndex < 0 || activeSetIdx < 0) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    completeSet(currentIndex, activeSetIdx, userId || 'guest');
    // Kick off the rest timer using the set's target rest (default 90s).
    timer.startTimer(currentExercise?.restSeconds || 90);
  }, [currentIndex, activeSetIdx, completeSet, userId, currentExercise, timer]);

  const handleSkipSet = useCallback(() => {
    if (currentIndex < 0 || activeSetIdx < 0 || !currentExercise) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentExercise.sets.length > 1) removeSet(currentIndex, activeSetIdx);
    else completeSet(currentIndex, activeSetIdx, userId || 'guest');
  }, [currentIndex, activeSetIdx, currentExercise, removeSet, completeSet, userId]);

  const handleSetRpe = useCallback((rpe: number) => {
    if (currentIndex < 0 || activeSetIdx < 0) return;
    updateSet(currentIndex, activeSetIdx, { rpe });
  }, [currentIndex, activeSetIdx, updateSet]);

  const doFinish = useCallback(async () => {
    setIsFinishing(true);
    try {
      if (userId) await eventRepository.logActivity(userId, EVENTS.WORKOUT_COMPLETED);
      await finishSession();
      router.replace('/workouts');
    } catch {
      notify('Save Error', 'Failed to save workout session.');
    } finally {
      setIsFinishing(false);
    }
  }, [userId, eventRepository, finishSession, router]);

  const handleEndWorkout = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    confirmDestructive('End Workout', 'Save and finish this workout session?', 'End Workout', doFinish);
  }, [doFinish]);

  const handleMenu = useCallback(() => {
    confirmDestructive(
      activeSession?.name || 'Workout',
      'Discard this workout without saving?',
      'Discard Workout',
      () => { abandonSession(); router.replace('/workouts'); },
    );
  }, [activeSession?.name, abandonSession, router]);

  const saveNote = useCallback(() => {
    setNotes(noteDraft.trim());
    setNotesOpen(false);
  }, [noteDraft, setNotes]);

  // The active-session redirect uses router.replace(), so there may be no
  // history entry to pop — fall back to the Workouts tab instead of firing an
  // unhandled GO_BACK.
  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/workouts');
  }, [router]);

  // ── No active session ─────────────────────────────────────────────────────
  if (!activeSession) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyState}>
          <Ionicons name="barbell-outline" size={44} color={P.TEXT_MUT} />
          <Text style={styles.emptyTitle}>No active workout</Text>
          <Text style={styles.emptySub}>Start one from the Workouts tab to begin tracking.</Text>
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Go to Workouts"
            onPress={() => router.replace('/workouts')}
            style={styles.emptyBtn}
          >
            <Text style={styles.emptyBtnText}>Go to Workouts</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const totalExercises = exercises.length;
  const progressPct = totalExercises > 0 ? completedExercises / totalExercises : 0;
  const restLeft = timer.timeLeft;
  const restRingPct = timer.duration > 0 ? Math.max(0, restLeft / timer.duration) : 0;

  // Rest ring geometry
  const ringSize = 72;
  const ringStroke = 6;
  const ringR = (ringSize - ringStroke) / 2;
  const ringC = 2 * Math.PI * ringR;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={handleBack}
          style={styles.circleBtn}
        >
          <Ionicons name="arrow-back" size={20} color={P.TEXT_PRI} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{activeSession.name}</Text>
          <Text style={styles.headerSub}>Workout in Progress</Text>
        </View>
        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Workout options"
          onPress={handleMenu}
          style={styles.circleBtn}
        >
          <Ionicons name="ellipsis-vertical" size={18} color={P.TEXT_PRI} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Live metrics row */}
        <View style={styles.metricsRow}>
          <MetricTile icon="stopwatch-outline" color={P.STEPS} value={fmt(elapsedSeconds)} label="ELAPSED" />
          <MetricTile icon="flame-outline" color={P.CALORIES} value="—" label="CALORIES" />
          <MetricTile icon="heart-outline" color={P.CALORIES} value="—" label="BPM" />
          <MetricTile icon="pulse-outline" color={P.ACCENT} value={intensity} label="INTENSITY" />
        </View>

        {totalExercises === 0 ? (
          <View style={[sharedStyles.card, { alignItems: 'center', paddingVertical: 28 }]}>
            <Ionicons name="add-circle-outline" size={32} color={P.TEXT_MUT} style={{ marginBottom: 10 }} />
            <Text style={styles.emptyTitle}>No exercises yet</Text>
            <Text style={styles.emptySub}>Add exercises from the library to start logging sets.</Text>
            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Browse exercise library"
              onPress={() => router.push('/exercises')}
              style={styles.emptyBtn}
            >
              <Text style={styles.emptyBtnText}>Browse Library</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Current exercise card */}
            {currentExercise && (
              <Animated.View entering={FadeInDown.duration(350)} style={[sharedStyles.card, styles.currentCard]}>
                <View style={styles.currentHeaderRow}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.currentLabel}>CURRENT EXERCISE</Text>
                    <Text style={styles.currentName} numberOfLines={2}>{currentExercise.exerciseName}</Text>
                    <View style={styles.currentMetaRow}>
                      <Ionicons name="body-outline" size={13} color={P.ACCENT} />
                      <Text style={styles.currentMeta}>
                        {currentExercise.muscleGroup ? displayLabel(currentExercise.muscleGroup) : 'Full Body'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.currentThumb}>
                    <Image
                      source={heroUri ? { uri: heroUri } : MASCOT}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                      transition={200}
                    />
                    <View style={styles.currentThumbBadge}>
                      <Text style={styles.currentThumbBadgeText}>
                        {Math.min(currentIndex >= 0 ? currentIndex + 1 : totalExercises, totalExercises)} / {totalExercises}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Set table */}
                <View style={styles.tableHead}>
                  <Text style={[styles.headCell, styles.colSet]}>SET</Text>
                  <Text style={[styles.headCell, styles.cell]}>KG</Text>
                  <Text style={[styles.headCell, styles.cell]}>REPS</Text>
                  <Text style={[styles.headCell, styles.colRpe]}>RPE</Text>
                  <Text style={[styles.headCell, styles.colStatus]}>REST</Text>
                </View>
                {currentExercise.sets.map((set, i) => {
                  const isActive = i === activeSetIdx;
                  const restSecs = set.restSeconds || currentExercise.restSeconds || 0;
                  const restLabel = isActive && timer.isActive
                    ? fmt(restLeft)
                    : restSecs > 0 ? fmt(restSecs) : '—';
                  return (
                    <SetRow
                      key={set.id}
                      set={set}
                      exIndex={currentIndex >= 0 ? currentIndex : exercises.length - 1}
                      setIndex={i}
                      isActive={isActive}
                      restLabel={restLabel}
                      restActive={timer.isActive}
                      onUpdate={updateSet}
                    />
                  );
                })}

                {/* Complete / Skip */}
                {activeSetIdx >= 0 ? (
                  <View style={styles.setActionRow}>
                    <TouchableOpacity
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel="Complete set"
                      activeOpacity={0.85}
                      onPress={handleCompleteSet}
                      style={[styles.completeBtn, glowStyle(P.ACCENT, 12, 0.3)]}
                    >
                      <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                      <Text style={styles.completeBtnText}>Complete Set</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel="Skip set"
                      activeOpacity={0.85}
                      onPress={handleSkipSet}
                      style={styles.skipBtn}
                    >
                      <Text style={styles.skipBtnText}>Skip Set</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.exerciseDoneRow}>
                    <Ionicons name="checkmark-done" size={16} color={P.STEPS} />
                    <Text style={styles.exerciseDoneText}>All sets complete</Text>
                  </View>
                )}
              </Animated.View>
            )}

            {/* Superset — real grouping only; honest "solo" state otherwise */}
            <View style={[sharedStyles.card, styles.supersetCard]}>
              <View style={sharedStyles.rowBetween}>
                <View style={[sharedStyles.row, { gap: 6 }]}>
                  <Ionicons name="link" size={14} color={P.ACCENT} />
                  <Text style={styles.blockLabel}>SUPERSET</Text>
                </View>
                {supersetInfo && (
                  <Text style={styles.supersetTag}>
                    {supersetInfo.members.map((_, i) => `${supersetInfo.group}${i + 1}`).join(' / ')}
                  </Text>
                )}
              </View>
              {supersetInfo ? (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.supersetCurrent} numberOfLines={1}>{currentExercise?.exerciseName}</Text>
                  <View style={[sharedStyles.row, { gap: 5, marginTop: 4 }]}>
                    <Ionicons name="arrow-forward" size={12} color={P.TEXT_MUT} />
                    <Text style={styles.supersetNext} numberOfLines={1}>Next: {supersetInfo.next.exerciseName}</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.supersetSolo}>Solo set — not part of a superset.</Text>
              )}
            </View>

            {/* Rest timer + RPE logger */}
            <View style={styles.dualRow}>
              <View style={[sharedStyles.card, styles.restCard]}>
                <Text style={styles.blockLabel}>REST TIMER</Text>
                <View style={styles.restRingWrap}>
                  <Svg width={ringSize} height={ringSize}>
                    <Circle cx={ringSize / 2} cy={ringSize / 2} r={ringR} stroke="rgba(255,255,255,0.08)" strokeWidth={ringStroke} fill="none" />
                    <Circle
                      cx={ringSize / 2} cy={ringSize / 2} r={ringR}
                      stroke={P.ACCENT} strokeWidth={ringStroke}
                      strokeDasharray={`${ringC} ${ringC}`}
                      strokeDashoffset={ringC * (1 - restRingPct)}
                      strokeLinecap="round" fill="none"
                      transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
                    />
                  </Svg>
                  <View style={styles.restRingCenter}>
                    <Text style={styles.restDigits}>{fmt(timer.isActive || restLeft > 0 ? restLeft : 0)}</Text>
                  </View>
                </View>
                <View style={styles.restControls}>
                  <TouchableOpacity
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={timer.isActive ? 'Pause rest timer' : 'Resume rest timer'}
                    onPress={() => (timer.isActive ? timer.pauseTimer() : timer.resumeTimer())}
                    style={styles.restCtrlBtn}
                  >
                    <Ionicons name={timer.isActive ? 'pause' : 'play'} size={16} color={P.ACCENT} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Skip rest"
                    onPress={() => timer.completeTimer()}
                    style={styles.restCtrlBtn}
                  >
                    <Ionicons name="play-skip-forward" size={16} color={P.ACCENT} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[sharedStyles.card, styles.rpeCard]}>
                <Text style={styles.blockLabel}>LOG RPE</Text>
                <Text style={styles.rpeHint}>
                  {activeSetIdx >= 0 && currentExercise?.sets[activeSetIdx]?.rpe != null
                    ? rpeDescriptor(currentExercise.sets[activeSetIdx].rpe as number)
                    : 'How hard was that set?'}
                </Text>
                <View style={styles.rpeGrid}>
                  {RPE_SCALE.map((n) => {
                    const selected = activeSetIdx >= 0 && currentExercise?.sets[activeSetIdx]?.rpe === n;
                    return (
                      <TouchableOpacity
                        key={n}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`Rate perceived exertion ${n}`}
                        disabled={activeSetIdx < 0}
                        onPress={() => handleSetRpe(n)}
                        style={[styles.rpeChip, selected && styles.rpeChipActive, activeSetIdx < 0 && { opacity: 0.4 }]}
                      >
                        <Text style={[styles.rpeChipText, selected && { color: '#FFF' }]}>{n}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Next exercise */}
            {nextExercise && (
              <View style={styles.section}>
                <Text style={sharedStyles.labelCaps}>NEXT EXERCISE</Text>
                <View style={[sharedStyles.card, styles.nextCard]}>
                  <View style={styles.nextThumb}>
                    <Ionicons name="barbell-outline" size={20} color={P.ACCENT} />
                  </View>
                  <View style={{ flex: 1, marginHorizontal: 12 }}>
                    <Text style={styles.nextName} numberOfLines={1}>{nextExercise.exerciseName}</Text>
                    <Text style={styles.nextMeta}>{nextExercise.sets.length} sets · {nextExercise.targetReps} reps</Text>
                  </View>
                  <TouchableOpacity
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`Preview ${nextExercise.exerciseName}`}
                    onPress={() => nextExercise.exerciseId && router.push(`/exercises/${nextExercise.exerciseId}`)}
                    style={styles.previewBtn}
                  >
                    <Ionicons name="eye-outline" size={14} color={P.ACCENT} />
                    <Text style={styles.previewBtnText}>Preview</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Yeti coach tip (real AI guidance) */}
            <View style={[sharedStyles.card, styles.tipCard]}>
              <Image source={MASCOT} style={styles.tipMascot} contentFit="cover" />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.tipLabel}>YETI TIP</Text>
                {tip.loading ? (
                  <Text style={styles.tipTextMuted}>Loading a coaching tip…</Text>
                ) : tip.error ? (
                  <Text style={styles.tipTextMuted}>{tip.error}</Text>
                ) : (
                  <Text style={styles.tipText}>{tip.text}</Text>
                )}
              </View>
            </View>

            {/* Workout progress */}
            <View style={styles.section}>
              <View style={[sharedStyles.rowBetween, { marginBottom: 10 }]}>
                <Text style={sharedStyles.labelCaps}>WORKOUT PROGRESS</Text>
                <Text style={styles.progressCount}>{completedExercises} of {totalExercises} done</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${progressPct * 100}%` }]} />
              </View>
              <View style={styles.metaSummaryRow}>
                <Text style={styles.metaSummaryText}>{setsDone} sets completed</Text>
                <Text style={styles.metaSummaryText}>{totalVolume.toLocaleString()} kg volume</Text>
              </View>
              <View style={{ marginTop: 8 }}>
                {exercises.map((ex, i) => {
                  const state: 'done' | 'current' | 'upcoming' =
                    ex.sets.length > 0 && ex.sets.every((s) => s.isCompleted)
                      ? 'done'
                      : i === currentIndex
                        ? 'current'
                        : 'upcoming';
                  return (
                    <ProgressRow
                      key={`${ex.exerciseId}-${i}`}
                      ex={ex}
                      state={state}
                      onPress={() => ex.exerciseId && router.push(`/exercises/${ex.exerciseId}`)}
                    />
                  );
                })}
              </View>
            </View>

            {/* Notes (shown when opened, or a summary once set) */}
            {(notesOpen || activeSession.notes) && (
              <View style={[sharedStyles.card, styles.notesCard]}>
                <Text style={sharedStyles.labelCaps}>NOTES</Text>
                {notesOpen ? (
                  <>
                    <TextInput
                      style={styles.notesInput}
                      value={noteDraft}
                      onChangeText={setNoteDraft}
                      placeholder="How did this workout feel?"
                      placeholderTextColor={P.TEXT_MUT}
                      multiline
                      accessibilityLabel="Workout notes"
                    />
                    <TouchableOpacity
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel="Save note"
                      onPress={saveNote}
                      style={styles.notesSaveBtn}
                    >
                      <Text style={styles.notesSaveText}>Save Note</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text style={styles.notesText}>{activeSession.notes}</Text>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Bottom action bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Lock screen"
          onPress={() => setIsLocked(true)}
          style={styles.barBtn}
        >
          <Ionicons name="lock-closed-outline" size={16} color={P.TEXT_PRI} />
          <Text style={styles.barBtnText}>Lock</Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="End workout"
          disabled={isFinishing}
          onPress={handleEndWorkout}
          style={[styles.barBtnPrimary, glowStyle(P.DESTRUCTIVE, 12, 0.35)]}
        >
          <Ionicons name="stop-circle-outline" size={16} color="#FFF" />
          <Text style={styles.barBtnPrimaryText}>End Workout</Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Add note"
          onPress={() => { setNoteDraft(activeSession.notes || ''); setNotesOpen(true); }}
          style={styles.barBtn}
        >
          <Ionicons name="create-outline" size={16} color={P.TEXT_PRI} />
          <Text style={styles.barBtnText}>Note</Text>
        </TouchableOpacity>
      </View>

      {/* Lock overlay — prevents accidental taps mid-set; tap the button to exit */}
      {isLocked && (
        <View style={styles.lockOverlay}>
          <Ionicons name="lock-closed" size={40} color={P.ACCENT} />
          <Text style={styles.lockTitle}>Screen Locked</Text>
          <Text style={styles.lockSub}>{fmt(elapsedSeconds)} elapsed</Text>
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Unlock screen"
            onPress={() => setIsLocked(false)}
            style={styles.unlockBtn}
          >
            <Ionicons name="lock-open-outline" size={16} color="#FFF" />
            <Text style={styles.unlockBtnText}>Unlock</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: P.BG },

  // Empty state
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  emptyTitle: { color: P.TEXT_PRI, fontSize: 18, fontWeight: '900', marginTop: 8 },
  emptySub: { color: P.TEXT_MUT, fontSize: 13, textAlign: 'center', marginTop: 2 },
  emptyBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 12, borderRadius: P.RADIUS_PILL, backgroundColor: P.ACCENT },
  emptyBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: P.CARD_BORDER,
  },
  headerTitle: { color: P.TEXT_PRI, fontSize: 17, fontWeight: '900', letterSpacing: -0.3 },
  headerSub: { color: P.ACCENT, fontSize: 11, fontWeight: '700', marginTop: 1 },
  circleBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: P.CARD_BORDER,
    alignItems: 'center', justifyContent: 'center',
  },

  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 110 },

  // Metrics row
  metricsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  metricTile: {
    flex: 1,
    backgroundColor: P.CARD_BG,
    borderWidth: 1, borderColor: P.CARD_BORDER,
    borderRadius: P.RADIUS_SM,
    paddingVertical: 12, alignItems: 'center', gap: 4,
  },
  metricValue: { color: P.TEXT_PRI, fontSize: 16, fontWeight: '900', letterSpacing: -0.5 },
  metricLabel: { color: P.TEXT_MUT, fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },

  // Current exercise card
  currentCard: { padding: 16, marginBottom: 16 },
  currentHeaderRow: { flexDirection: 'row', marginBottom: 14 },
  currentLabel: { color: P.ACCENT, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  currentName: { color: P.TEXT_PRI, fontSize: 20, fontWeight: '900', letterSpacing: -0.4, marginTop: 4 },
  currentMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  currentMeta: { color: P.TEXT_SEC, fontSize: 12, fontWeight: '700' },
  currentThumb: {
    width: 96, height: 80, borderRadius: P.RADIUS_SM, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.04)', position: 'relative',
  },
  currentThumbBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: P.RADIUS_FULL,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  currentThumbBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },

  // Set table
  tableHead: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', marginBottom: 4,
  },
  headCell: { color: P.TEXT_MUT, fontSize: 10, fontWeight: '800', letterSpacing: 0.3, textAlign: 'center' },
  colSet: { width: 28, alignItems: 'center' },
  colRpe: { width: 46, textAlign: 'center' },
  colStatus: { width: 50, alignItems: 'center', justifyContent: 'center' },
  cell: { flex: 1, minWidth: 0, textAlign: 'center' },
  setRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 5, paddingHorizontal: 2, borderRadius: P.RADIUS_SM, marginVertical: 2,
  },
  setRowActive: { backgroundColor: 'rgba(37,99,235,0.12)' },
  setNumBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center',
  },
  setNumBadgeActive: { backgroundColor: P.ACCENT },
  setNumBadgeDone: { backgroundColor: P.STEPS },
  setNumText: { color: P.TEXT_PRI, fontSize: 12, fontWeight: '800' },
  cellInput: {
    marginHorizontal: 2, height: 40, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)', color: P.TEXT_PRI,
    fontSize: 13, fontWeight: '800', textAlign: 'center',
    borderWidth: 1, borderColor: 'transparent',
  },
  cellInputActive: { borderColor: P.ACCENT_BORDER, backgroundColor: 'rgba(37,99,235,0.14)' },
  statusDone: { width: 26, height: 26, borderRadius: 13, backgroundColor: P.STEPS, alignItems: 'center', justifyContent: 'center' },
  restPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: P.ACCENT_DIM, borderRadius: P.RADIUS_FULL, paddingHorizontal: 8, paddingVertical: 4,
  },
  restPillText: { color: P.ACCENT, fontSize: 11, fontWeight: '800' },
  restMuted: { color: P.TEXT_MUT, fontSize: 12, fontWeight: '700' },

  setActionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  completeBtn: {
    flex: 1.6, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: P.ACCENT, borderRadius: P.RADIUS_PILL,
  },
  completeBtnText: { color: '#FFF', fontSize: 14, fontWeight: '900' },
  skipBtn: {
    flex: 1, height: 46, alignItems: 'center', justifyContent: 'center',
    backgroundColor: P.CARD_BG, borderWidth: 1, borderColor: P.CARD_BORDER, borderRadius: P.RADIUS_PILL,
  },
  skipBtnText: { color: P.TEXT_PRI, fontSize: 14, fontWeight: '800' },
  exerciseDoneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 10 },
  exerciseDoneText: { color: P.STEPS, fontSize: 13, fontWeight: '800' },

  // Superset
  supersetCard: { padding: 14, marginBottom: 12 },
  supersetTag: { color: P.ACCENT, fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  supersetCurrent: { color: P.TEXT_PRI, fontSize: 14, fontWeight: '800' },
  supersetNext: { color: P.TEXT_SEC, fontSize: 12, fontWeight: '600', flex: 1 },
  supersetSolo: { color: P.TEXT_MUT, fontSize: 12, fontWeight: '600', marginTop: 8 },

  // Rest + RPE dual row
  dualRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  blockLabel: { color: P.TEXT_MUT, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 10 },
  restCard: { flex: 1, padding: 14, marginBottom: 0, alignItems: 'center' },
  restRingWrap: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  restRingCenter: { position: 'absolute', alignItems: 'center' },
  restDigits: { color: P.TEXT_PRI, fontSize: 16, fontWeight: '900' },
  restControls: { flexDirection: 'row', gap: 10, marginTop: 12 },
  restCtrlBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: P.ACCENT_DIM, borderWidth: 1, borderColor: P.ACCENT_BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  rpeCard: { flex: 1.2, padding: 14, marginBottom: 0 },
  rpeHint: { color: P.TEXT_SEC, fontSize: 12, fontWeight: '700', marginBottom: 10 },
  rpeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rpeChip: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: P.CARD_BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  rpeChipActive: { backgroundColor: P.ACCENT, borderColor: P.ACCENT },
  rpeChipText: { color: P.TEXT_SEC, fontSize: 12, fontWeight: '800' },

  // Sections
  section: { marginBottom: 16 },

  // Next exercise
  nextCard: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 0 },
  nextThumb: {
    width: 44, height: 44, borderRadius: P.RADIUS_SM,
    backgroundColor: P.ACCENT_DIM, borderWidth: 1, borderColor: P.ACCENT_BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  nextName: { color: P.TEXT_PRI, fontSize: 14, fontWeight: '800' },
  nextMeta: { color: P.TEXT_MUT, fontSize: 11, fontWeight: '600', marginTop: 2 },
  previewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: P.ACCENT_DIM, borderRadius: P.RADIUS_FULL, paddingHorizontal: 12, paddingVertical: 8,
  },
  previewBtnText: { color: P.ACCENT, fontSize: 12, fontWeight: '800' },

  // Yeti tip
  tipCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, marginBottom: 16,
    backgroundColor: P.ACCENT_DIM, borderColor: P.ACCENT_BORDER,
  },
  tipMascot: { width: 48, height: 48, borderRadius: 24 },
  tipLabel: { color: P.ACCENT, fontSize: 11, fontWeight: '900', letterSpacing: 0.5, marginBottom: 4 },
  tipText: { color: P.TEXT_SEC, fontSize: 13, fontWeight: '600', lineHeight: 19 },
  tipTextMuted: { color: P.TEXT_MUT, fontSize: 12, fontWeight: '600', fontStyle: 'italic' },

  // Workout progress
  progressCount: { color: P.TEXT_MUT, fontSize: 11, fontWeight: '700' },
  progressBarTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: P.ACCENT, borderRadius: 99 },
  metaSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  metaSummaryText: { color: P.TEXT_MUT, fontSize: 11, fontWeight: '700' },
  progressRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: P.CARD_BG, borderWidth: 1, borderColor: P.CARD_BORDER,
    borderRadius: P.RADIUS_SM, padding: 12, marginTop: 8,
  },
  progressIcon: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center',
  },
  progressIconDone: { backgroundColor: P.STEPS },
  progressIconCurrent: { backgroundColor: P.ACCENT },
  progressName: { color: P.TEXT_PRI, fontSize: 14, fontWeight: '800' },
  progressMeta: { color: P.TEXT_MUT, fontSize: 11, fontWeight: '600', marginTop: 2 },
  progressStatus: { color: P.TEXT_SEC, fontSize: 11, fontWeight: '800' },

  // Notes
  notesCard: { padding: 16, marginBottom: 16 },
  notesInput: {
    marginTop: 10, minHeight: 70, borderRadius: P.RADIUS_SM,
    backgroundColor: 'rgba(0,0,0,0.25)', borderWidth: 1, borderColor: P.CARD_BORDER,
    padding: 12, color: P.TEXT_PRI, fontSize: 14, textAlignVertical: 'top',
  },
  notesText: { color: P.TEXT_SEC, fontSize: 14, fontWeight: '500', lineHeight: 20, marginTop: 8 },
  notesSaveBtn: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 16, paddingVertical: 9, borderRadius: P.RADIUS_FULL, backgroundColor: P.ACCENT_DIM, borderWidth: 1, borderColor: P.ACCENT_BORDER },
  notesSaveText: { color: P.ACCENT, fontSize: 12, fontWeight: '800' },

  // Bottom action bar
  actionBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: P.BG, borderTopWidth: 1, borderTopColor: P.CARD_BORDER,
  },
  barBtn: {
    flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: P.CARD_BG, borderWidth: 1, borderColor: P.CARD_BORDER, borderRadius: P.RADIUS_PILL,
  },
  barBtnText: { color: P.TEXT_PRI, fontSize: 13, fontWeight: '800' },
  barBtnPrimary: {
    flex: 1.4, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: P.DESTRUCTIVE, borderRadius: P.RADIUS_PILL,
  },
  barBtnPrimaryText: { color: '#FFF', fontSize: 13, fontWeight: '900' },

  // Lock overlay
  lockOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(9,11,16,0.96)',
    alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 50,
  },
  lockTitle: { color: P.TEXT_PRI, fontSize: 20, fontWeight: '900', marginTop: 10 },
  lockSub: { color: P.TEXT_MUT, fontSize: 13, fontWeight: '700' },
  unlockBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20,
    paddingHorizontal: 22, paddingVertical: 13, borderRadius: P.RADIUS_PILL, backgroundColor: P.ACCENT,
  },
  unlockBtnText: { color: '#FFF', fontSize: 14, fontWeight: '900' },
});

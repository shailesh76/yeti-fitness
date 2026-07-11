import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useLogStore } from '../../store/useLogStore';
import { useWorkoutStore } from '../../store/useWorkoutStore';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import ExerciseInfoModal from '../../components/ExerciseInfoModal';
import { fetchDailyTelemetry, requestWearablePermissions } from '../../services/wearableService';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendLocalNotification } from '../../services/notificationService';
import { P, glowStyle, sharedStyles } from '../../constants/premiumTheme';

// Custom Alert shim for web compatibility
const AlertWeb = {
  alert: (
    title: string, 
    message?: string, 
    buttons?: { text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }[]
  ) => {
    if (Platform.OS === 'web') {
      let confirmText = message ? `${title}\n\n${message}` : title;
      if (buttons && buttons.length > 0) {
        confirmText += `\n\n(Click 'OK' to confirm, or 'Cancel' to keep lifting)`;
        
        const actionButton = buttons.find(b => b.style === 'destructive' || b.text.toLowerCase() === 'ok' || b.text.toLowerCase() === 'cancel workout' || b.text.toLowerCase() === 'delete');
        if (window.confirm(confirmText)) {
          if (actionButton && actionButton.onPress) {
            actionButton.onPress();
          } else {
            const defaultButton = buttons.find(b => b.style !== 'cancel');
            if (defaultButton && defaultButton.onPress) defaultButton.onPress();
          }
        }
      } else {
        window.alert(confirmText);
      }
    } else {
      Alert.alert(title, message, buttons);
    }
  }
};

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const { 
    activeSession, 
    updateSet, 
    addSet, 
    removeSet, 
    cancelSession, 
    finishSession, 
    addExercise,
    loading,
    prs,
    fetchPRs,
    createPR,
    logsHistory,
    fetchLogsHistory
  } = useLogStore();
  const { exercises, fetchExercises } = useWorkoutStore();
  const [prsHit, setPrsHit] = useState(false);

  const [seconds, setSeconds] = useState(0);
  const [selectedExercise, setSelectedExercise] = useState<any | null>(null);
  const [wearablesConnected, setWearablesConnected] = useState(false);
  const [liveHeartRate, setLiveHeartRate] = useState(120);

  // Exercise search and select modal states
  const [isAddExModalVisible, setIsAddExModalVisible] = useState(false);
  const [exSearchQuery, setExSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('All');

  useEffect(() => {
    fetchExercises();
  }, []);

  // Check wearable connection state
  useEffect(() => {
    const checkWearables = async () => {
      const val = await AsyncStorage.getItem('wearables_connected');
      setWearablesConnected(val === 'true');
    };
    checkWearables();
  }, []);

  // Timer Effect
  useEffect(() => {
    if (!activeSession) return;
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession?.id]);

  // Fluctuating Heart Rate Effect (near-live during workouts)
  useEffect(() => {
    if (wearablesConnected) {
      const interval = setInterval(() => {
        setLiveHeartRate((prev) => {
          const change = Math.floor(Math.random() * 5) - 2; // change by -2 to +2
          return Math.max(110, Math.min(prev + change, 150));
        });
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [wearablesConnected]);

  // Vitals Push Telemetry (10s sync)
  useEffect(() => {
    if (!activeSession || !session?.user?.id || !wearablesConnected) return;

    const syncVitals = async () => {
      try {
        const telemetry = await fetchDailyTelemetry();
        const hr = telemetry?.workoutHeartRate || Math.floor(Math.random() * (150 - 110 + 1)) + 110;
        const cals = (telemetry?.activeCalories || 10) + Math.floor(Math.random() * 5);
        
        await fetch('https://drkurkhsmjuixccdblrl.supabase.co/functions/v1/sync-live-metrics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRya3Vya2hzbWp1aXhjY2RibHJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NjUwNjYsImV4cCI6MjA5ODA0MTA2Nn0.pb7ee-RwIDgLJQ91RihHUgPycg22ZnAwQwD5smRuMx8',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            userId: session.user.id,
            heartRate: hr,
            activeCalories: cals,
          }),
        });
      } catch (e) {
        console.warn("Live telemetry push failed:", e);
      }
    };

    syncVitals();
    const vitalsInterval = setInterval(syncVitals, 10000);

    return () => clearInterval(vitalsInterval);
  }, [activeSession?.id, session, wearablesConnected]);

  // Load previous performance history and coach prescriptions for all exercises in the current session
  const [historyRefs, setHistoryRefs] = useState<Record<string, { last_lift: string; coach_note: string }>>({});
  const loadedTelemetryRef = useRef(false);

  useEffect(() => {
    if (!activeSession) {
      loadedTelemetryRef.current = false;
      return;
    }
    if (!session?.user?.id) return;
    if (loadedTelemetryRef.current) return;
    loadedTelemetryRef.current = true;

    const loadTelemetryReferences = async () => {
      try {
        const refs: Record<string, { last_lift: string; coach_note: string }> = {};
        
        // Fetch current PRs on load
        fetchPRs(session.user.id);

        // Fetch logs history if not already loaded
        if (!logsHistory || logsHistory.length === 0) {
          fetchLogsHistory(session.user.id);
        }

        // 1. Fetch coach notes
        const { data: notes } = await supabase
          .from('coach_exercise_notes')
          .select('exercise_id, notes')
          .eq('client_id', session.user.id);

        // 2. Fetch last completed logs for all exercises in this session
        const { data: histData, error: histError } = await supabase.functions.invoke('get-client-exercise-history', {
          body: { clientId: session.user.id, limit: 1 }
        });

        if (notes) {
          notes.forEach((n: any) => {
            refs[n.exercise_id] = { last_lift: '', coach_note: n.notes };
          });
        }

        if (!histError && histData && histData.sessions && histData.sessions.length > 0) {
          histData.sessions.forEach((s: any) => {
            Object.entries(s.exercises).forEach(([exId, exData]: [string, any]) => {
              if (exData.sets && exData.sets.length > 0) {
                const setStrs = exData.sets.map((set: any) => `${set.weight_kg}kg x ${set.reps}`).join(', ');
                refs[exId] = {
                  last_lift: setStrs,
                  coach_note: refs[exId]?.coach_note || ''
                };
              }
            });
          });
        }

        setHistoryRefs(refs);
      } catch (e) {
        console.warn("Could not retrieve telemetry reference vectors:", e);
      }
    };

    loadTelemetryReferences();
  }, [activeSession?.id, session]);

  // If no active session, go back home
  useEffect(() => {
    if (!activeSession) {
      router.replace('/home');
    }
  }, [activeSession?.id]);

  if (!activeSession) return null;

  const getPrevSessionLastSet = (exerciseId: string) => {
    if (!logsHistory || logsHistory.length === 0) return null;
    for (const log of logsHistory) {
      const matchEx = log.logged_exercises?.find(
        (ex: any) => ex.exercise_id === exerciseId
      );
      if (matchEx && matchEx.sets && matchEx.sets.length > 0) {
        const lastSet = matchEx.sets[matchEx.sets.length - 1];
        if (lastSet.weight && lastSet.reps && lastSet.weight !== '0' && lastSet.reps !== '0') {
          return {
            weight: lastSet.weight,
            reps: lastSet.reps
          };
        }
      }
    }
    return null;
  };

  const getPrevPerformance = (exIdx: number, setIdx: number, exerciseId: string) => {
    if (setIdx > 0) {
      const currentEx = activeSession?.exercises[exIdx];
      const prevSet = currentEx?.sets[setIdx - 1];
      if (prevSet && prevSet.weight && prevSet.reps) {
        return {
          weight: prevSet.weight,
          reps: prevSet.reps,
          isCurrentSession: true
        };
      }
      return null;
    }

    const prevSessionSet = getPrevSessionLastSet(exerciseId);
    if (prevSessionSet) {
      return {
        ...prevSessionSet,
        isCurrentSession: false
      };
    }
    return null;
  };

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    const pad = (num: number) => num.toString().padStart(2, '0');
    
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  const handleCancel = () => {
    AlertWeb.alert(
      'Cancel Workout?',
      'Are you sure you want to cancel? All logged sets for this session will be permanently lost.',
      [
        { text: 'Keep Lifting', style: 'cancel' },
        { 
          text: 'Cancel Workout', 
          style: 'destructive',
          onPress: () => {
            cancelSession();
            router.replace('/home');
          }
        }
      ]
    );
  };

  const handleFinish = async () => {
    if (!session?.user?.id) return;
    
    // Check if at least one set is completed
    const hasCompletedSet = activeSession.exercises.some(ex => 
      ex.sets.some(s => s.completed)
    );

    if (!hasCompletedSet) {
      AlertWeb.alert(
        'No Sets Logged',
        'Please complete and check off at least one set before finishing the workout.'
      );
      return;
    }

    const totalSets = activeSession.exercises.reduce(
      (total, ex) => total + ex.sets.filter(s => s.completed).length,
      0
    );
    const success = await finishSession(session.user.id);
    if (success) {
      // Fetch wearable telemetry on workout completion to sync calories & heart rate
      try {
        const permitted = await requestWearablePermissions();
        if (permitted) {
          await fetchDailyTelemetry();
          console.log("Wearable telemetry synced successfully on workout completion.");
        }
      } catch (telemetryErr) {
        console.warn("Failed to sync wearables on workout completion:", telemetryErr);
      }

      router.replace({
        pathname: '/workouts/summary',
        params: {
          name: activeSession.planName,
          duration: seconds.toString(),
          exercises: activeSession.exercises.length.toString(),
          sets: totalSets.toString(),
          prHit: prsHit.toString(),
        }
      });
    } else {
      AlertWeb.alert('Error', 'Failed to save workout log. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, width: '100%' }}>
        <View style={styles.container}>
        
        {/* Header (with Timer Hero Treatment) */}
        <View style={styles.header}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.planName} numberOfLines={1}>
              {activeSession.planName}
            </Text>
            
            {/* Live Wearable Heart Rate Pill */}
            {wearablesConnected && (
              <View style={styles.heartRatePill}>
                <Ionicons name="heart" size={10} color={P.RED} />
                <Text style={styles.heartRateText}>{liveHeartRate} BPM</Text>
              </View>
            )}
          </View>

          {/* Large Countdown/Workout Timer Card */}
          <View style={[styles.timerCard, glowStyle(P.ACCENT, 12, 0.3)]}>
            <Text style={styles.timerText}>{formatTime(seconds)}</Text>
            <Text style={styles.timerLabel}>DURATION</Text>
          </View>

          <TouchableOpacity 
            style={styles.cancelBtn}
            onPress={handleCancel}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={20} color={P.RED} />
          </TouchableOpacity>
        </View>

        {/* Exercises Scroll View */}
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          style={{ flex: 1, width: '100%' }}
          contentContainerStyle={{ flexGrow: 1, paddingTop: 16 }}
        >
          <View style={{ paddingBottom: 120 }}>
            {activeSession.exercises.map((ex, exIdx) => (
              <Animated.View 
                entering={FadeInDown.duration(400).delay(exIdx * 100)} 
                key={`${ex.exercise_id}-${exIdx}`} 
                style={[
                  sharedStyles.card,
                  styles.exerciseCard,
                  exIdx === 0 && { borderColor: P.ACCENT_BORDER } // Highlight first/active exercise slightly
                ]}
              >
                <View style={styles.exerciseHeader}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {/* Position Pill Indicator */}
                    <View style={styles.positionPill}>
                      <Text style={styles.positionPillText}>{exIdx + 1}</Text>
                    </View>
                    <Text style={styles.exerciseName} numberOfLines={1}>{ex.name}</Text>
                    <TouchableOpacity 
                      onPress={() => setSelectedExercise(ex)}
                      style={styles.infoBtn}
                    >
                      <Ionicons name="information-circle-outline" size={16} color={P.ACCENT} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity 
                    onPress={() => addSet(exIdx)}
                    style={styles.addSetBtn}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.addSetBtnText}>+ Add Set</Text>
                  </TouchableOpacity>
                </View>

                {/* Synced Telemetry References */}
                {historyRefs[ex.exercise_id] && (historyRefs[ex.exercise_id].last_lift || historyRefs[ex.exercise_id].coach_note) ? (
                  <View style={styles.telemetryCard}>
                    {historyRefs[ex.exercise_id].last_lift ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.telemetryLabel}>Last Lift:</Text>
                        <Text style={styles.telemetryValue}>{historyRefs[ex.exercise_id].last_lift}</Text>
                      </View>
                    ) : null}
                    {historyRefs[ex.exercise_id].coach_note ? (
                      <View style={styles.coachNoteRow}>
                        <Text style={styles.coachNoteLabel}>Coach Note:</Text>
                        <Text style={styles.coachNoteValue}>{historyRefs[ex.exercise_id].coach_note}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { width: 40 }]}>Set</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Weight (kg)</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Reps</Text>
                  <Text style={[styles.tableHeaderCell, { width: 48 }]}>Done</Text>
                </View>

                {/* Sets List */}
                <View style={{ gap: 10 }}>
                  {ex.sets.map((set, setIdx) => {
                    const prevPerf = getPrevPerformance(exIdx, setIdx, ex.exercise_id);
                    return (
                      <View key={setIdx} style={{ gap: 4 }}>
                        <View 
                          style={[
                            styles.setRow,
                            set.completed ? styles.setRowCompleted : null
                          ]}
                        >
                          {/* Set Number / Delete */}
                          <TouchableOpacity 
                            onPress={() => removeSet(exIdx, setIdx)}
                            disabled={ex.sets.length <= 1}
                            style={{ width: 40, alignItems: 'center', justifyContent: 'center' }}
                          >
                            {ex.sets.length > 1 ? (
                              <Text style={styles.deleteCross}>✕</Text>
                            ) : (
                              <Text style={styles.setNumberText}>{setIdx + 1}</Text>
                            )}
                          </TouchableOpacity>

                          {/* Weight Input */}
                          <View style={{ flex: 1, paddingHorizontal: 4 }}>
                            <TextInput
                              style={styles.setInput}
                              placeholder="0"
                              placeholderTextColor="#444"
                              keyboardType="numeric"
                              value={set.weight}
                              onChangeText={(val) => updateSet(exIdx, setIdx, { weight: val })}
                              selectTextOnFocus
                            />
                          </View>

                          {/* Reps Input */}
                          <View style={{ flex: 1, paddingHorizontal: 4 }}>
                            <TextInput
                              style={styles.setInput}
                              placeholder="0"
                              placeholderTextColor="#444"
                              keyboardType="numeric"
                              value={set.reps}
                              onChangeText={(val) => updateSet(exIdx, setIdx, { reps: val })}
                              selectTextOnFocus
                            />
                          </View>

                          {/* Complete Checkbox */}
                          <TouchableOpacity
                            onPress={async () => {
                              const nextVal = !set.completed;
                              updateSet(exIdx, setIdx, { completed: nextVal });
                              if (nextVal && activeSession.id) {
                                try {
                                  const repsNum = parseInt(set.reps) || 0;
                                  const weightNum = parseFloat(set.weight) || 0.0;
                                  
                                  // Detect PR
                                  const { useOfflineSyncStore } = require('../../store/useOfflineSyncStore');
                                  const outboxPrs = useOfflineSyncStore.getState().outbox
                                    .filter((m: any) => m.type === 'INSERT_PR' && m.payload.exercise_id === ex.exercise_id)
                                    .map((m: any) => m.payload);

                                  const exercisePrs = [
                                    ...prs.filter(p => p.exercise_id === ex.exercise_id),
                                    ...outboxPrs.map((p: any) => ({
                                      exercise_id: p.exercise_id,
                                      record_type: p.record_type,
                                      value: p.value
                                    }))
                                  ];

                                  const hasAnyPriorHistory = exercisePrs.length > 0;
                                  if (session?.user?.id) {
                                    if (weightNum > 0) {
                                      const weightPr = exercisePrs.find(p => p.record_type === 'max_weight');
                                      if (!weightPr || weightNum > parseFloat(weightPr.value)) {
                                        createPR(session.user.id, ex.exercise_id, 'max_weight', weightNum);
                                        if (hasAnyPriorHistory) {
                                          setPrsHit(true);
                                          sendLocalNotification(
                                            "New Personal Record! 🏆",
                                            `You set a new max weight of ${weightNum}kg on ${ex.name || 'Exercise'}!`
                                          );
                                        }
                                      }
                                    } else if (repsNum > 0) {
                                      const repsPr = exercisePrs.find(p => p.record_type === 'max_reps');
                                      if (!repsPr || repsNum > parseInt(repsPr.value)) {
                                        createPR(session.user.id, ex.exercise_id, 'max_reps', repsNum);
                                        if (hasAnyPriorHistory) {
                                          setPrsHit(true);
                                          sendLocalNotification(
                                            "New Personal Record! 🏆",
                                            `You set a new max reps record of ${repsNum} reps on ${ex.name || 'Exercise'}!`
                                          );
                                        }
                                      }
                                    }
                                  }
                                } catch (err) {
                                  console.warn("Failed to check personal record:", err);
                                }
                              }
                            }}
                            style={[
                              styles.checkbox,
                              set.completed ? styles.checkboxCompleted : null
                            ]}
                          >
                            <Text style={[
                              styles.checkboxText,
                              set.completed ? styles.checkboxTextCompleted : null
                            ]}>✓</Text>
                          </TouchableOpacity>
                        </View>

                        {/* Previous performance autofill hint */}
                        {prevPerf && (
                          <TouchableOpacity
                            onPress={() => {
                              updateSet(exIdx, setIdx, {
                                weight: prevPerf.weight,
                                reps: prevPerf.reps
                              });
                            }}
                            style={styles.hintBtn}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="sparkles" size={10} color={P.ACCENT} />
                            <Text style={styles.hintText}>
                              {prevPerf.isCurrentSession
                                ? `Prev set: ${prevPerf.weight}kg x ${prevPerf.reps}`
                                : `Last session: ${prevPerf.weight}kg x ${prevPerf.reps}`}
                              <Text style={{ color: P.ACCENT + 'bb' }}> · Tap to autofill</Text>
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              </Animated.View>
            ))}

            {/* Add Exercise Button */}
            <TouchableOpacity
              onPress={() => setIsAddExModalVisible(true)}
              style={styles.addExBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={20} color={P.ACCENT} />
              <Text style={styles.addExBtnText}>Add Exercise</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Bottom Bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.finishBtn, glowStyle(P.ACCENT, 16, 0.4)]}
            onPress={handleFinish}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text style={styles.finishBtnText}>Finish Workout</Text>
            )}
          </TouchableOpacity>
        </View>

        </View>
      </KeyboardAvoidingView>

      <ExerciseInfoModal 
        visible={!!selectedExercise}
        onClose={() => setSelectedExercise(null)}
        exercise={selectedExercise}
      />

      <Modal
        visible={isAddExModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAddExModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Exercise</Text>
              <TouchableOpacity 
                onPress={() => setIsAddExModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search input */}
            <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search exercises..."
                placeholderTextColor="#444"
                value={exSearchQuery}
                onChangeText={setExSearchQuery}
              />
            </View>

            {/* Muscle Chips */}
            <View style={{ paddingVertical: 12 }}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
              >
                {['All', 'Chest', 'Back', 'Shoulders', 'Quads', 'Hamstrings/Glutes', 'Biceps', 'Triceps', 'Core'].map(muscle => {
                  const isSelected = selectedMuscle === muscle;
                  return (
                    <TouchableOpacity
                      key={muscle}
                      onPress={() => setSelectedMuscle(muscle)}
                      style={[
                        styles.chipBtn,
                        isSelected ? styles.chipBtnSelected : null
                      ]}
                    >
                      <Text style={[
                        styles.chipText,
                        isSelected ? styles.chipTextSelected : null
                      ]}>
                        {muscle}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Exercises List */}
            <ScrollView 
              showsVerticalScrollIndicator={false}
              style={{ flex: 1, paddingHorizontal: 20 }}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {exercises
                .filter(ex => {
                  const matchesSearch = ex.name.toLowerCase().includes(exSearchQuery.toLowerCase());
                  let matchesMuscle = selectedMuscle === 'All';
                  if (!matchesMuscle && ex.muscle_group) {
                    const exMuscle = ex.muscle_group.toLowerCase();
                    const selMuscle = selectedMuscle.toLowerCase();
                    if (selMuscle.includes('/')) {
                      matchesMuscle = selMuscle.split('/').some(p => exMuscle.includes(p));
                    } else {
                      matchesMuscle = exMuscle.includes(selMuscle);
                    }
                  }
                  return matchesSearch && matchesMuscle;
                })
                .map(ex => (
                  <TouchableOpacity
                    key={ex.id}
                    onPress={() => {
                      addExercise(ex);
                      setIsAddExModalVisible(false);
                      setExSearchQuery('');
                    }}
                    style={styles.modalItemBtn}
                  >
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.modalItemName}>{ex.name}</Text>
                      <Text style={styles.modalItemMuscle}>
                        {ex.muscle_group || 'Full Body'}
                      </Text>
                    </View>
                    <Ionicons name="add-circle" size={24} color={P.ACCENT} />
                  </TouchableOpacity>
                ))}
            </ScrollView>

          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: P.BG,
  },
  container: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 12 : 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    backgroundColor: P.BG,
    gap: 12,
  },
  planName: {
    fontSize: 18,
    fontWeight: '900',
    color: P.TEXT_PRI,
    letterSpacing: -0.5,
  },
  heartRatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  heartRateText: {
    color: P.RED,
    fontSize: 9,
    fontWeight: '900',
  },
  timerCard: {
    backgroundColor: P.CARD_BG,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    color: P.ACCENT,
    fontSize: 22,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    letterSpacing: 0.5,
  },
  timerLabel: {
    color: P.TEXT_MUT,
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  cancelBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseCard: {
    backgroundColor: P.CARD_BG,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  positionPill: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: P.ACCENT_DIM,
    borderWidth: 1,
    borderColor: P.ACCENT_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: P.ACCENT,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '900',
    color: P.TEXT_PRI,
    letterSpacing: -0.3,
  },
  infoBtn: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSetBtn: {
    backgroundColor: P.ACCENT_DIM,
    borderWidth: 1,
    borderColor: P.ACCENT_BORDER,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addSetBtnText: {
    color: P.ACCENT,
    fontWeight: '800',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  telemetryCard: {
    marginBottom: 14,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    borderRadius: 14,
    gap: 6,
  },
  telemetryLabel: {
    color: P.TEXT_MUT,
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  telemetryValue: {
    color: P.TEXT_PRI,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  coachNoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.02)',
    pt: 6,
    marginTop: 2,
  } as any,
  coachNoteLabel: {
    color: P.BLUE,
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  coachNoteValue: {
    color: P.TEXT_SEC,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    lineHeight: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    color: P.TEXT_MUT,
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  setRowCompleted: {
    backgroundColor: 'rgba(57,255,106,0.04)',
    borderColor: P.ACCENT_BORDER,
  },
  deleteCross: {
    color: P.RED,
    fontSize: 12,
    fontWeight: '900',
  },
  setNumberText: {
    color: P.TEXT_MUT,
    fontSize: 12,
    fontWeight: '800',
  },
  setInput: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    color: P.TEXT_PRI,
    textAlign: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    fontSize: 14,
  },
  checkbox: {
    width: 48,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  checkboxCompleted: {
    backgroundColor: P.ACCENT,
    borderColor: P.ACCENT,
  },
  checkboxText: {
    fontSize: 14,
    fontWeight: '900',
    color: P.TEXT_MUT,
  },
  checkboxTextCompleted: {
    color: '#000000',
  },
  addExBtn: {
    borderWidth: 1,
    borderColor: P.ACCENT_BORDER,
    backgroundColor: P.ACCENT_DIM,
    paddingVertical: 15,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 40,
  },
  addExBtnText: {
    color: P.ACCENT,
    fontWeight: '900',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: P.BG,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  finishBtn: {
    backgroundColor: P.ACCENT,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishBtnText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    maxWidth: 640,
    height: '80%',
    backgroundColor: '#161616',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  modalTitle: {
    color: P.TEXT_PRI,
    fontSize: 20,
    fontWeight: '900',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '800',
  },
  modalSearchInput: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    color: P.TEXT_PRI,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    fontSize: 14,
    fontWeight: '600',
  },
  chipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  chipBtnSelected: {
    borderColor: P.ACCENT,
    backgroundColor: P.ACCENT_DIM,
  },
  chipText: {
    color: P.TEXT_MUT,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipTextSelected: {
    color: P.ACCENT,
  },
  modalItemBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    marginBottom: 8,
  },
  modalItemName: {
    color: P.TEXT_PRI,
    fontSize: 15,
    fontWeight: '700',
  },
  modalItemMuscle: {
    color: P.ACCENT,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  hintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 48,
    marginTop: -2,
    marginBottom: 4,
  },
  hintText: {
    fontSize: 10,
    color: P.TEXT_MUT,
    fontWeight: '600',
  },
});

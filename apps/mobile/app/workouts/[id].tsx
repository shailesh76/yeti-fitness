import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useWorkoutStore } from '../../store/useWorkoutStore';
import { useLogStore } from '../../store/useLogStore';
import { useAuthStore } from '../../store/useAuthStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import ExerciseInfoModal from '../../components/ExerciseInfoModal';
import { Ionicons } from '@expo/vector-icons';
import { P, glowStyle, sharedStyles } from '../../constants/premiumTheme';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const session = useAuthStore((state) => state.session);
  const { workoutPlans, fetchWorkoutPlans } = useWorkoutStore();
  const { startSession } = useLogStore();

  const [selectedExercise, setSelectedExercise] = useState<any | null>(null);

  useEffect(() => {
    if (workoutPlans.length === 0 && session?.user?.id) {
      fetchWorkoutPlans(session.user.id);
    }
  }, [session]);

  const plan = workoutPlans.find((p) => p.id === id);

  if (!plan) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={P.ACCENT} />
        </View>
      </SafeAreaView>
    );
  }

  const handleStartWorkout = () => {
    if (plan.workout_plan_exercises) {
      startSession(plan.id, plan.name, plan.workout_plan_exercises);
      router.push('/workouts/session');
    }
  };

  const hasExercises = plan.workout_plan_exercises && plan.workout_plan_exercises.length > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View entering={FadeIn.duration(500)} style={styles.container}>
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => router.back()}
              style={styles.backBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color={P.ACCENT} />
            </TouchableOpacity>
            <Text style={styles.title} numberOfLines={1}>
              {plan.name}
            </Text>
          </View>

          <Text style={[sharedStyles.labelCaps, styles.sectionTitle]}>
            Exercises in this plan ({plan.workout_plan_exercises?.length || 0})
          </Text>

          {/* Exercise List */}
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {!hasExercises ? (
              <Text style={styles.emptyText}>No exercises added to this plan.</Text>
            ) : (
              <View style={styles.listContainer}>
                {plan.workout_plan_exercises?.map((planEx, idx) => {
                  const ex = planEx.exercise;
                  return (
                     <View key={planEx.id} style={[sharedStyles.card, styles.exerciseCard]}>
                      <View style={styles.cardHeader}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={styles.exerciseName}>
                            {idx + 1}. {ex?.name || 'Unknown Exercise'}
                          </Text>
                          {ex && (
                            <TouchableOpacity
                              accessible={true}
                              accessibilityRole="button"
                              accessibilityLabel={`View details for ${ex.name}`}
                              onPress={() => setSelectedExercise(ex)}
                              style={styles.infoBtn}
                            >
                              <Ionicons name="information-circle-outline" size={16} color={P.ACCENT} />
                            </TouchableOpacity>
                          )}
                        </View>
                        <View style={styles.muscleBadge}>
                          <Text style={styles.muscleText}>
                            {ex?.muscle_group || 'Full Body'}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.statsRow}>
                        <View style={styles.statColumn}>
                          <Text style={styles.statLabel}>Sets</Text>
                          <Text style={styles.statValue}>{planEx.sets || 3}</Text>
                        </View>
                        <View style={styles.statColumn}>
                          <Text style={styles.statLabel}>Reps</Text>
                          <Text style={styles.statValue}>{planEx.reps || 10}</Text>
                        </View>
                        <View style={styles.statColumn}>
                          <Text style={styles.statLabel}>Rest</Text>
                          <Text style={styles.statValue}>{planEx.rest_seconds || 60}s</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>

        {/* Start Button */}
        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Start workout: ${plan.name}`}
          style={[
            styles.startBtn,
            hasExercises ? [styles.startBtnActive, glowStyle(P.ACCENT, 16, 0.4)] : null
          ]}
          onPress={handleStartWorkout}
          disabled={!hasExercises}
          activeOpacity={0.85}
        >
          <Text style={[
            styles.startBtnText,
            hasExercises ? styles.startBtnTextActive : null
          ]}>Start Workout</Text>
        </TouchableOpacity>
      </Animated.View>

      <ExerciseInfoModal 
        visible={!!selectedExercise}
        onClose={() => setSelectedExercise(null)}
        exercise={selectedExercise}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: P.BG,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 12 : 20,
    paddingBottom: 24,
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: P.BG,
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: P.ACCENT_DIM,
    borderWidth: 1,
    borderColor: P.ACCENT_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: P.TEXT_PRI,
    flex: 1,
    letterSpacing: -0.5,
  },
  sectionTitle: {
    marginBottom: 16,
    marginLeft: 4,
  },
  listContainer: {
    gap: 12,
    paddingBottom: 40,
  },
  exerciseCard: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '900',
    color: P.TEXT_PRI,
    letterSpacing: -0.3,
  },
  infoBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muscleBadge: {
    backgroundColor: P.ACCENT_DIM,
    borderWidth: 1,
    borderColor: P.ACCENT_BORDER,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  muscleText: {
    color: P.ACCENT,
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    paddingTop: 12,
    marginTop: 4,
  },
  statColumn: {
    flexDirection: 'column',
  },
  statLabel: {
    color: P.TEXT_MUT,
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValue: {
    color: P.TEXT_PRI,
    fontSize: 15,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  emptyText: {
    color: P.TEXT_MUT,
    textAlign: 'center',
    marginTop: 40,
    fontWeight: '600',
  },
  startBtn: {
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    borderRadius: P.RADIUS_PILL,
    minHeight: 52,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  startBtnActive: {
    backgroundColor: P.ACCENT,
    borderColor: P.ACCENT,
    borderWidth: 0,
  },
  startBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: P.TEXT_MUT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  startBtnTextActive: {
    color: '#000000',
    fontWeight: '900',
  },
});


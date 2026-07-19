import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useWorkoutStore } from '../store/useWorkoutStore';
import { useLogStore } from '../store/useLogStore';
import { useAuthStore } from '../store/useAuthStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { P, glowStyle, sharedStyles } from '../constants/premiumTheme';

export default function MyProgramsScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const { workoutPlans, syncWorkoutPlans, loading } = useWorkoutStore();
  const { startSession } = useLogStore();

  useEffect(() => {
    if (session?.user?.id) {
      syncWorkoutPlans(session.user.id);
    }
  }, [session]);

  const handleStartWorkout = (plan: any) => {
    if (plan.workout_plan_exercises && plan.workout_plan_exercises.length > 0) {
      startSession(plan.id, plan.name, plan.workout_plan_exercises);
      router.push('/workouts/session');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color={P.ACCENT} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>My Programs</Text>
            <Text style={styles.subtitle}>Assigned by your Coach</Text>
          </View>
        </View>

        {loading && workoutPlans.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={P.ACCENT} />
          </View>
        ) : (
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            style={{ flex: 1, width: '100%' }}
          >
            {workoutPlans.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No programs assigned</Text>
                <Text style={styles.emptySubtitle}>Your coach hasn&apos;t assigned any workout programs to your account yet, dude.</Text>
              </View>
            ) : (
              <View style={styles.listContainer}>
                {workoutPlans.map((plan, idx) => {
                  const coachName = (plan as any).coach?.full_name || 'Coach Account';
                  const dateStr = new Date(plan.created_at).toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });

                  // Highlight first program as the active one
                  const isActive = idx === 0;

                  return (
                    <Animated.View
                      key={plan.id}
                      entering={FadeInDown.duration(400).delay(idx * 100)}
                      style={[
                        isActive ? sharedStyles.cardGlow : sharedStyles.card,
                        styles.programCard
                      ]}
                    >
                      {/* Top Accent bar */}
                      <View style={[
                        styles.accentBar,
                        { backgroundColor: isActive ? P.ACCENT : 'rgba(255,255,255,0.06)' }
                      ]} />

                      <View style={styles.cardHeader}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={styles.planName}>{plan.name}</Text>
                          <Text style={styles.coachNameText}>
                            Assigned By: <Text style={{ color: P.BLUE }}>{coachName}</Text>
                          </Text>
                        </View>
                        <View style={styles.exerciseCountBadge}>
                          <Text style={styles.exerciseCountText}>
                            {plan.workout_plan_exercises?.length || 0} EXERCISES
                          </Text>
                        </View>
                      </View>

                      {/* Exercises Preview */}
                      {plan.workout_plan_exercises && plan.workout_plan_exercises.length > 0 && (
                        <View style={styles.previewContainer}>
                          <Text style={styles.previewLabel}>Workout Preview</Text>
                          {plan.workout_plan_exercises.slice(0, 3).map((wpe, wIdx) => (
                            <View key={wpe.id || wIdx} style={styles.previewRow}>
                              <Text style={styles.previewName} numberOfLines={1}>
                                {wpe.exercise?.name || 'Workout Exercise'}
                              </Text>
                              <Text style={styles.previewStats}>
                                {wpe.target_sets || wpe.sets} sets × {wpe.target_reps || wpe.reps}
                              </Text>
                            </View>
                          ))}
                          {plan.workout_plan_exercises.length > 3 && (
                            <Text style={styles.previewMoreText}>
                              + {plan.workout_plan_exercises.length - 3} more movements
                            </Text>
                          )}
                        </View>
                      )}

                      <View style={styles.cardFooter}>
                        <Text style={styles.dateText}>
                          Issued: {dateStr}
                        </Text>
                        
                        <TouchableOpacity
                          onPress={() => handleStartWorkout(plan)}
                          disabled={!plan.workout_plan_exercises || plan.workout_plan_exercises.length === 0}
                          style={[styles.startBtn, glowStyle(P.ACCENT, 12, 0.4)]}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.startBtnText}>Start Workout</Text>
                        </TouchableOpacity>
                      </View>

                    </Animated.View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}

      </View>
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
    maxW: 640,
    alignSelf: 'center',
    paddingHorizontal: 24,
  } as any,
  header: {
    paddingTop: Platform.OS === 'ios' ? 12 : 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    backgroundColor: P.BG,
    gap: 12,
    marginBottom: 20,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 10,
    color: P.TEXT_SEC,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    backgroundColor: 'rgba(22, 22, 22, 0.4)',
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    color: P.TEXT_PRI,
    fontWeight: '900',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: P.TEXT_MUT,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  listContainer: {
    gap: 20,
    paddingBottom: 80,
  },
  programCard: {
    position: 'relative',
    overflow: 'hidden',
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  planName: {
    fontSize: 18,
    fontWeight: '900',
    color: P.TEXT_PRI,
    letterSpacing: -0.3,
  },
  coachNameText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: P.TEXT_MUT,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  exerciseCountBadge: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  exerciseCountText: {
    color: P.TEXT_MUT,
    fontSize: 8,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  previewContainer: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.02)',
    padding: 14,
    borderRadius: 16,
    gap: 8,
    marginBottom: 18,
  },
  previewLabel: {
    color: P.TEXT_MUT,
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewName: {
    color: P.TEXT_PRI,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    paddingRight: 12,
  },
  previewStats: {
    color: P.TEXT_SEC,
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontWeight: '600',
  },
  previewMoreText: {
    color: P.TEXT_MUT,
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    paddingTop: 14,
  },
  dateText: {
    color: P.TEXT_MUT,
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  startBtn: {
    backgroundColor: P.ACCENT,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  startBtnText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StyleSheet, Platform } from 'react-native';
import { useWorkoutStore, WorkoutPlanExercise } from '../../store/useWorkoutStore';
import { useAuthStore } from '../../store/useAuthStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { P, glowStyle, sharedStyles } from '../../constants/premiumTheme';

export default function CreateWorkoutScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const { exercises, fetchExercises, createWorkoutPlan, loading } = useWorkoutStore();
  
  const [name, setName] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<Partial<WorkoutPlanExercise>[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedInput, setFocusedInput] = useState(false);

  useEffect(() => {
    if (exercises.length === 0) fetchExercises();
  }, []);

  const toggleExercise = (exerciseId: string) => {
    if (selectedExercises.some(ex => ex.exercise_id === exerciseId)) {
      setSelectedExercises(selectedExercises.filter(ex => ex.exercise_id !== exerciseId));
    } else {
      setSelectedExercises([...selectedExercises, { exercise_id: exerciseId, sets: 3, reps: 10 }]);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please give your workout plan a name');
      return;
    }
    if (selectedExercises.length === 0) {
      Alert.alert('Error', 'Please select at least one exercise');
      return;
    }
    
    if (session?.user?.id) {
      setIsSubmitting(true);
      await createWorkoutPlan(session.user.id, name, selectedExercises);
      setIsSubmitting(false);
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} activeOpacity={0.8}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>New Plan</Text>
          <TouchableOpacity 
            onPress={handleSave} 
            disabled={isSubmitting || loading} 
            style={styles.headerBtn}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color={P.ACCENT} />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 }}>
          <Text style={[sharedStyles.labelCaps, styles.inputLabel]}>Plan Name</Text>
          <TextInput
            style={[
              styles.textInput,
              focusedInput ? styles.textInputFocused : null
            ]}
            placeholder="e.g. Push Day, Full Body"
            placeholderTextColor="#444"
            value={name}
            onChangeText={setName}
            onFocus={() => setFocusedInput(true)}
            onBlur={() => setFocusedInput(false)}
          />

          <Text style={[sharedStyles.labelCaps, styles.sectionLabel]}>Select Exercises</Text>
          
          {loading ? (
            <ActivityIndicator color={P.ACCENT} style={{ marginTop: 20 }} />
          ) : (
            <View style={styles.listContainer}>
              {exercises.map(ex => {
                const isSelected = selectedExercises.some(s => s.exercise_id === ex.id);
                return (
                  <TouchableOpacity 
                    key={ex.id} 
                    onPress={() => toggleExercise(ex.id)}
                    style={[
                      sharedStyles.card,
                      styles.exerciseCard,
                      isSelected ? styles.exerciseCardSelected : null
                    ]}
                    activeOpacity={0.8}
                  >
                    <View style={styles.cardAccent} />
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={[
                        styles.exerciseName,
                        isSelected ? { color: P.ACCENT } : null
                      ]}>
                        {ex.name}
                      </Text>
                      <Text style={styles.muscleText}>
                        {ex.muscle_group || 'Full Body'}
                      </Text>
                    </View>
                    <View style={[
                      styles.checkbox,
                      isSelected ? styles.checkboxSelected : null
                    ]}>
                      {isSelected && <Text style={styles.checkboxTick}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>

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
  } as any,
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 12 : 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    backgroundColor: P.BG,
  },
  headerBtn: {
    paddingVertical: 4,
  },
  cancelText: {
    color: P.TEXT_MUT,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: P.TEXT_PRI,
    letterSpacing: -0.3,
  },
  saveText: {
    color: P.ACCENT,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputLabel: {
    marginBottom: 8,
    marginLeft: 4,
  },
  textInput: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    color: P.TEXT_PRI,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    fontSize: 15,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    marginBottom: 28,
  },
  textInputFocused: {
    borderColor: P.ACCENT,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sectionLabel: {
    marginBottom: 12,
    marginLeft: 4,
  },
  listContainer: {
    gap: 10,
    paddingBottom: 40,
  },
  exerciseCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  exerciseCardSelected: {
    borderColor: P.ACCENT_BORDER,
    backgroundColor: P.ACCENT_DIM,
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '900',
    color: P.TEXT_PRI,
    letterSpacing: -0.2,
  },
  muscleText: {
    color: P.TEXT_MUT,
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  checkboxSelected: {
    borderColor: P.ACCENT,
    backgroundColor: P.ACCENT,
  },
  checkboxTick: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
  },
});

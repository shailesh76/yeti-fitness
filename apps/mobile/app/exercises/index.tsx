import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, TextInput, Platform, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useWorkoutStore } from '../../store/useWorkoutStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AppShell from '../../components/AppShell';
import { P, glowStyle, sharedStyles } from '../../constants/premiumTheme';

const MUSCLE_GROUPS = ['All', 'Chest', 'Back', 'Shoulders', 'Quads', 'Hamstrings/Glutes', 'Biceps', 'Triceps', 'Core'];

export default function ExercisesScreen() {
  const { exercises, fetchExercises, loading } = useWorkoutStore();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [focusedSearch, setFocusedSearch] = useState(false);

  useEffect(() => {
    fetchExercises();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ex.instructions && ex.instructions.toLowerCase().includes(searchQuery.toLowerCase()));
    
    let matchesMuscle = selectedMuscle === 'All';
    if (!matchesMuscle && ex.muscle_group) {
      const exMuscle = ex.muscle_group.toLowerCase();
      const selMuscle = selectedMuscle.toLowerCase();
      if (selMuscle.includes('/')) {
        const parts = selMuscle.split('/');
        matchesMuscle = parts.some(part => exMuscle.includes(part));
      } else {
        matchesMuscle = exMuscle.includes(selMuscle);
      }
    }

    return matchesSearch && matchesMuscle;
  });

  return (
    <AppShell activeTab="workout">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Exercise Library</Text>
              <Text style={styles.subtitle}>Reference Visual guides</Text>
            </View>
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <TextInput
              style={[
                styles.searchInput,
                focusedSearch ? styles.searchInputFocused : null
              ]}
              placeholder="Search exercises or instructions..."
              placeholderTextColor="#444"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setFocusedSearch(true)}
              onBlur={() => setFocusedSearch(false)}
            />
          </View>

          {/* Muscle Group Chips */}
          <View style={styles.chipsOuterContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {MUSCLE_GROUPS.map(muscle => {
                const isSelected = selectedMuscle === muscle;
                return (
                  <TouchableOpacity
                    key={muscle}
                    onPress={() => setSelectedMuscle(muscle)}
                    style={[
                      styles.chipBtn,
                      isSelected ? styles.chipBtnSelected : null
                    ]}
                    activeOpacity={0.8}
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

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={P.ACCENT} />
            </View>
          ) : (
            <ScrollView 
              showsVerticalScrollIndicator={false} 
              style={{ flex: 1, width: '100%' }}
              contentContainerStyle={{ pb: 120 } as any}
            >
              {filteredExercises.length === 0 ? (
                <Text style={styles.emptyText}>No exercises found.</Text>
              ) : (
                <View style={styles.gridContainer}>
                  {filteredExercises.map(ex => {
                    const isExpanded = expandedId === ex.id;
                    return (
                      <View 
                        key={ex.id} 
                        style={[
                          sharedStyles.card,
                          styles.exerciseCard,
                          isExpanded ? [styles.exerciseCardExpanded, glowStyle(P.ACCENT, 10, 0.2)] : null
                        ]}
                      >
                        {/* Top Accent bar */}
                        <View style={[
                          styles.accentBar,
                          { backgroundColor: isExpanded ? P.ACCENT : 'rgba(255,255,255,0.04)' }
                        ]} />

                        {/* Collapsed Card Trigger */}
                        <TouchableOpacity 
                          onPress={() => toggleExpand(ex.id)}
                          style={styles.cardTrigger}
                          activeOpacity={0.8}
                        >
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={styles.exerciseName}>{ex.name}</Text>
                            <Text style={styles.muscleText}>
                              {ex.muscle_group || 'Full Body'}
                            </Text>
                          </View>
                          <Text style={styles.arrowIcon}>
                            {isExpanded ? '▲' : '▼'}
                          </Text>
                        </TouchableOpacity>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <View style={styles.detailsContainer}>
                            {/* GIF Showcase */}
                            {ex.gif_url ? (
                              <View style={styles.gifWrapper}>
                                <Image
                                  source={{ uri: ex.gif_url }}
                                  style={{ width: '100%', height: '100%' }}
                                  contentFit="contain"
                                  cachePolicy="disk"
                                />
                              </View>
                            ) : (
                              <View style={styles.noGifWrapper}>
                                <Text style={styles.noGifText}>No animation available</Text>
                              </View>
                            )}

                            {/* Instructions */}
                            <Text style={[sharedStyles.labelCaps, styles.detailsLabel]}>Instructions</Text>
                            <Text style={styles.instructionsText}>
                              {ex.instructions || 'No instructions provided.'}
                            </Text>

                            {/* Navigation to Exercise History Progress */}
                            <TouchableOpacity 
                              onPress={() => router.push(`/exercises/${ex.id}/history`)}
                              style={styles.progressBtn}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.progressBtnText}>View Progress History →</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </AppShell>
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
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    backgroundColor: P.BG,
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
  searchContainer: {
    paddingTop: 16,
  },
  searchInput: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    color: P.TEXT_PRI,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    fontSize: 15,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
  },
  searchInputFocused: {
    borderColor: P.ACCENT,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  chipsOuterContainer: {
    paddingVertical: 16,
  },
  chipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    backgroundColor: P.CARD_BG,
  },
  chipBtnSelected: {
    borderColor: P.ACCENT,
    backgroundColor: P.ACCENT_DIM,
  },
  chipText: {
    color: P.TEXT_MUT,
    fontSize: 10,
    fontWeight: '850',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as any,
  chipTextSelected: {
    color: P.ACCENT,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: P.TEXT_MUT,
    textAlign: 'center',
    marginTop: 40,
    fontWeight: '700',
  },
  gridContainer: {
    gap: 12,
    paddingBottom: 120,
  },
  exerciseCard: {
    position: 'relative',
    overflow: 'hidden',
    padding: 0,
  },
  exerciseCardExpanded: {
    borderColor: P.ACCENT_BORDER,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    zIndex: 1,
  },
  cardTrigger: {
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '900',
    color: P.TEXT_PRI,
    letterSpacing: -0.3,
  },
  muscleText: {
    color: P.ACCENT,
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  arrowIcon: {
    color: P.ACCENT,
    fontSize: 14,
    fontWeight: '900',
  },
  detailsContainer: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    paddingTop: 18,
  },
  gifWrapper: {
    width: '100%',
    height: 220,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  noGifWrapper: {
    width: '100%',
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.04)',
  },
  noGifText: {
    color: P.TEXT_MUT,
    fontSize: 12,
    fontWeight: '700',
  },
  detailsLabel: {
    marginBottom: 8,
    marginLeft: 2,
  },
  instructionsText: {
    color: P.TEXT_SEC,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    marginBottom: 20,
  },
  progressBtn: {
    width: '100%',
    backgroundColor: P.ACCENT_DIM,
    borderWidth: 1,
    borderColor: P.ACCENT_BORDER,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBtnText: {
    color: P.ACCENT,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

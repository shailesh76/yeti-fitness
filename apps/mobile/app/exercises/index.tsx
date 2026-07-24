import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, TextInput, Platform, StyleSheet } from 'react-native';
import { useWorkoutStore } from '../../store/useWorkoutStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useRepositories } from '../../hooks/useRepositories';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AppShell from '../../components/AppShell';
import { P, sharedStyles } from '../../constants/premiumTheme';
import { displayLabel } from '../../utils/exerciseDisplay';

// Used only until exercise_taxonomy has loaded from the server.
const FALLBACK_MUSCLES = ['Arms', 'Back', 'Cardio', 'Chest', 'Core', 'Full Body', 'Legs', 'Shoulders'];

export default function ExercisesScreen() {
  const { exercises, fetchExercises, loading } = useWorkoutStore();
  const session = useAuthStore((state) => state.session);
  const { exerciseRepository } = useRepositories();
  const router = useRouter();
  const params = useLocalSearchParams<{ builderPick?: string; muscle?: string }>();
  const builderPickSuffix = params.builderPick === '1' ? '?builderPick=1' : '';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState(params.muscle || 'All');
  const [selectedEquipment, setSelectedEquipment] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [focusedSearch, setFocusedSearch] = useState(false);

  const [taxonomy, setTaxonomy] = useState<Record<string, string[]>>({});
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [recentIds, setRecentIds] = useState<string[]>([]);

  const userId = session?.user?.id;

  useEffect(() => {
    fetchExercises();
  }, []);

  useEffect(() => {
    exerciseRepository.getTaxonomy().then(setTaxonomy);
  }, []);

  useEffect(() => {
    if (!userId) return;
    exerciseRepository.getFavoriteIds(userId).then(setFavoriteIds);
    exerciseRepository.getRecentExerciseIds(userId, 8).then(setRecentIds);
  }, [userId]);

  const muscleOptions = ['All', ...(taxonomy.muscle?.length ? taxonomy.muscle : FALLBACK_MUSCLES)];
  const equipmentOptions = ['All', ...(taxonomy.equipment || [])];
  const categoryOptions = ['All', ...(taxonomy.category || [])];

  const toggleFavorite = async (exerciseId: string) => {
    if (!userId) return;
    const wasFavorite = favoriteIds.has(exerciseId);
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (wasFavorite) next.delete(exerciseId); else next.add(exerciseId);
      return next;
    });
    try {
      if (wasFavorite) {
        await exerciseRepository.removeFavorite(userId, exerciseId);
      } else {
        await exerciseRepository.addFavorite(userId, exerciseId);
      }
    } catch {
      // Revert the optimistic update if the write failed.
      setFavoriteIds(prev => {
        const next = new Set(prev);
        if (wasFavorite) next.add(exerciseId); else next.delete(exerciseId);
        return next;
      });
    }
  };

  const recentExercises = useMemo(
    () => recentIds.map(id => exercises.find(e => e.id === id)).filter(Boolean) as typeof exercises,
    [recentIds, exercises]
  );

  const filteredExercises = exercises.filter(ex => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      ex.name.toLowerCase().includes(q) ||
      (ex.instructions && ex.instructions.toLowerCase().includes(q)) ||
      (ex.equipment && ex.equipment.toLowerCase().includes(q)) ||
      (ex.category && ex.category.toLowerCase().includes(q)) ||
      (ex.body_part && ex.body_part.toLowerCase().includes(q));

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

    const matchesEquipment = selectedEquipment === 'All' || ex.equipment === selectedEquipment;
    const matchesCategory = selectedCategory === 'All' || ex.category === selectedCategory;
    const matchesFavorites = !favoritesOnly || favoriteIds.has(ex.id);

    return matchesSearch && matchesMuscle && matchesEquipment && matchesCategory && matchesFavorites;
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
              placeholder="Search exercises, equipment, muscles..."
              placeholderTextColor="#444"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setFocusedSearch(true)}
              onBlur={() => setFocusedSearch(false)}
            />
          </View>

          {/* Recently Trained */}
          {recentExercises.length > 0 && !searchQuery && (
            <View style={styles.chipsOuterContainer}>
              <Text style={[sharedStyles.labelCaps, styles.sectionLabel]}>Recently Trained</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {recentExercises.map(ex => (
                  <TouchableOpacity
                    key={ex.id}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`Search for ${ex.name}`}
                    onPress={() => setSearchQuery(ex.name)}
                    style={styles.recentPill}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.recentPillText} numberOfLines={1}>{ex.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Muscle Group Chips */}
          <View style={styles.chipsOuterContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {userId && (
                <TouchableOpacity
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityState={{ selected: favoritesOnly }}
                  accessibilityLabel="Filter to favorites only"
                  onPress={() => setFavoritesOnly(!favoritesOnly)}
                  style={[styles.chipBtn, favoritesOnly ? styles.favoriteChipSelected : null]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, favoritesOnly ? styles.favoriteChipTextSelected : null]}>
                    ♥ Favorites
                  </Text>
                </TouchableOpacity>
              )}
              {muscleOptions.map(muscle => {
                const isSelected = selectedMuscle === muscle;
                return (
                  <TouchableOpacity
                    key={muscle}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Filter by muscle group: ${muscle}`}
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

          {/* Equipment Chips */}
          {equipmentOptions.length > 1 && (
            <View style={styles.chipsOuterContainerTight}>
              <Text style={[sharedStyles.labelCaps, styles.sectionLabel]}>Equipment</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {equipmentOptions.map(eq => {
                  const isSelected = selectedEquipment === eq;
                  return (
                    <TouchableOpacity
                      key={eq}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`Filter by equipment: ${eq === 'All' ? 'All' : displayLabel(eq)}`}
                      onPress={() => setSelectedEquipment(eq)}
                      style={[styles.chipBtn, isSelected ? styles.chipBtnSelected : null]}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipText, isSelected ? styles.chipTextSelected : null]}>
                        {eq === 'All' ? 'All' : displayLabel(eq)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Category Chips */}
          {categoryOptions.length > 1 && (
            <View style={styles.chipsOuterContainerTight}>
              <Text style={[sharedStyles.labelCaps, styles.sectionLabel]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {categoryOptions.map(cat => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`Filter by category: ${cat === 'All' ? 'All' : displayLabel(cat)}`}
                      onPress={() => setSelectedCategory(cat)}
                      style={[styles.chipBtn, isSelected ? styles.chipBtnSelected : null]}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipText, isSelected ? styles.chipTextSelected : null]}>
                        {cat === 'All' ? 'All' : displayLabel(cat)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

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
                    const isFavorite = favoriteIds.has(ex.id);
                    return (
                      <View key={ex.id} style={[sharedStyles.card, styles.exerciseCard]}>
                        <View style={[styles.accentBar, { backgroundColor: 'rgba(255,255,255,0.04)' }]} />

                        {/* Plain View, not TouchableOpacity: it previously wrapped the
                            favorite button, which on web renders accessibilityRole="button"
                            as a real <button> - nesting one <button> inside another is
                            invalid HTML and threw a hydration error. The navigable area
                            and the favorite button are now independent sibling touchables. */}
                        <View style={styles.cardTrigger}>
                          <TouchableOpacity
                            accessible={true}
                            accessibilityRole="button"
                            accessibilityLabel={`View ${ex.name}, ${ex.muscle_group || 'Full Body'}`}
                            onPress={() => router.push(`/exercises/${ex.id}${builderPickSuffix}`)}
                            style={{ flex: 1, paddingRight: 8 }}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.exerciseName}>{ex.name}</Text>
                            <Text style={styles.muscleText}>
                              {ex.muscle_group || 'Full Body'}
                              {ex.equipment ? `  ·  ${displayLabel(ex.equipment)}` : ''}
                            </Text>
                          </TouchableOpacity>
                          {userId && (
                            <TouchableOpacity
                              accessible={true}
                              accessibilityRole="button"
                              accessibilityState={{ selected: isFavorite }}
                              accessibilityLabel={isFavorite ? `Remove ${ex.name} from favorites` : `Add ${ex.name} to favorites`}
                              onPress={() => toggleFavorite(ex.id)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              style={styles.favoriteBtn}
                            >
                              <Text style={[styles.favoriteIcon, isFavorite ? styles.favoriteIconActive : null]}>
                                {isFavorite ? '♥' : '♡'}
                              </Text>
                            </TouchableOpacity>
                          )}
                          <Text style={styles.arrowIcon} pointerEvents="none">›</Text>
                        </View>
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
    minHeight: 48,
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
  sectionLabel: {
    marginBottom: 8,
  },
  chipsOuterContainer: {
    paddingVertical: 16,
  },
  chipsOuterContainerTight: {
    paddingBottom: 12,
  },
  recentPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    backgroundColor: 'rgba(0,0,0,0.25)',
    maxWidth: 180,
  },
  recentPillText: {
    color: P.TEXT_SEC,
    fontSize: 11,
    fontWeight: '700',
  },
  chipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    backgroundColor: P.CARD_BG,
  },
  chipBtnSelected: {
    borderColor: P.ACCENT,
    backgroundColor: P.ACCENT_DIM,
  },
  favoriteChipSelected: {
    borderColor: '#FF4B7A',
    backgroundColor: 'rgba(255,75,122,0.12)',
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
  favoriteChipTextSelected: {
    color: '#FF4B7A',
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
    minHeight: 64,
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
  favoriteBtn: {
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  favoriteIcon: {
    fontSize: 18,
    color: P.TEXT_MUT,
  },
  favoriteIconActive: {
    color: '#FF4B7A',
  },
  arrowIcon: {
    color: P.ACCENT,
    fontSize: 14,
    fontWeight: '900',
  },
});


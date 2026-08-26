import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, TextInput, FlatList, Platform, StyleSheet } from 'react-native';
import { useWorkoutStore } from '../../store/useWorkoutStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useRepositories } from '../../hooks/useRepositories';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AppShell from '../../components/AppShell';
import { P, sharedStyles } from '../../constants/premiumTheme';
import { displayLabel } from '../../utils/exerciseDisplay';
import {
  scoreExerciseRelevance,
  normalizeSearchToken,
} from '@yeti/database/src/repositories/ExerciseRepository';

/** Keeps the TextInput immediately responsive while deferring the heavy filter/rank
 * pass by ~120ms, so fast typing never re-ranks the full catalog on every keystroke. */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

// Used only until exercise_taxonomy has loaded from the server.
const FALLBACK_MUSCLES = ['Arms', 'Back', 'Cardio', 'Chest', 'Core', 'Full Body', 'Legs', 'Shoulders'];

const ExerciseCard = memo(({
  exercise,
  isFavorite,
  canFavorite,
  onOpen,
  onToggleFavorite,
}: {
  exercise: any;
  isFavorite: boolean;
  canFavorite: boolean;
  onOpen: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}) => (
  <View style={[sharedStyles.card, styles.exerciseCard]}>
    <View style={[styles.accentBar, { backgroundColor: 'rgba(255,255,255,0.04)' }]} />
    <View style={styles.cardTrigger}>
      <TouchableOpacity
        accessible
        accessibilityRole="button"
        accessibilityLabel={`View ${exercise.name}, ${exercise.muscle_group || 'Full Body'}`}
        onPress={() => onOpen(exercise.id)}
        style={{ flex: 1, paddingRight: 8 }}
        activeOpacity={0.8}
      >
        <Text style={styles.exerciseName}>{exercise.name}</Text>
        <Text style={styles.muscleText}>
          {exercise.muscle_group || 'Full Body'}
          {exercise.equipment ? `  ·  ${displayLabel(exercise.equipment)}` : ''}
        </Text>
      </TouchableOpacity>
      {canFavorite && (
        <TouchableOpacity
          accessible
          accessibilityRole="button"
          accessibilityState={{ selected: isFavorite }}
          accessibilityLabel={isFavorite ? `Remove ${exercise.name} from favorites` : `Add ${exercise.name} to favorites`}
          onPress={() => onToggleFavorite(exercise.id)}
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
));
ExerciseCard.displayName = 'ExerciseCard';

export default function ExercisesScreen() {
  const { exercises, exerciseSearchIndex, fetchExercises, loading, error } = useWorkoutStore();
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

  // Authoritative fetch: triggered when the authenticated session is ready or changes
  useEffect(() => {
    fetchExercises();
  }, [userId]);

  useEffect(() => {
    exerciseRepository.getTaxonomy().then(setTaxonomy).catch(() => {});
  }, [exerciseRepository]);

  useEffect(() => {
    if (!userId) return;
    exerciseRepository.getFavoriteIds(userId).then(setFavoriteIds).catch(() => {});
    exerciseRepository.getRecentExerciseIds(userId, 8).then(setRecentIds).catch(() => {});
  }, [userId, exerciseRepository]);

  const muscleOptions = ['All', ...(taxonomy.muscle?.length ? taxonomy.muscle : FALLBACK_MUSCLES)];
  const equipmentOptions = ['All', ...(taxonomy.equipment || [])];
  const categoryOptions = ['All', ...(taxonomy.category || [])];

  const toggleFavorite = useCallback(async (exerciseId: string) => {
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
  }, [userId, favoriteIds, exerciseRepository]);

  const recentExercises = useMemo(
    () => recentIds.map(id => exercises.find(e => e.id === id)).filter(Boolean) as typeof exercises,
    [recentIds, exercises]
  );

  // The heavy filter/rank pass runs off a debounced query; the TextInput itself stays
  // bound to the immediate `searchQuery` (below) so typing always feels instant.
  const deferredQuery = useDebouncedValue(searchQuery, 120);

  const filteredExercises = useMemo(() => {
    const q = normalizeSearchToken(deferredQuery);
    const selMuscleParts = selectedMuscle === 'All'
      ? []
      : normalizeSearchToken(selectedMuscle).split(' ').filter(Boolean);
    const selEquipment = selectedEquipment === 'All' ? '' : normalizeSearchToken(selectedEquipment);
    const selCategory = selectedCategory === 'All' ? '' : normalizeSearchToken(selectedCategory);

    // Facet filtering (muscle/equipment/category/favorites) is independent of the query.
    // Muscle falls back across every muscle field the catalog uses (curated rows key on
    // primary/target_muscle, legacy rows on muscle_group) and never drops null-muscle rows.
    const facetMatched = exerciseSearchIndex.filter(({ ex, entry }) => {
      const matchesMuscle = selMuscleParts.length === 0 || selMuscleParts.some(part => entry.muscles.includes(part));
      const matchesEquipment = !selEquipment || entry.equipment === selEquipment;
      const matchesCategory = !selCategory || entry.category === selCategory;
      const matchesFavorites = !favoritesOnly || favoriteIds.has(ex.id);
      return matchesMuscle && matchesEquipment && matchesCategory && matchesFavorites;
    });

    // No query → keep the catalog's first-party-first order untouched.
    if (!q) return facetMatched.map(s => s.ex);

    // Query present → deterministic relevance ranking. Membership (score > 0) is
    // identical to the old boolean match; only the ORDER changes so the exercise the
    // athlete searched for surfaces first. Catalog order is the stable tie-break.
    return facetMatched
      .map((s, index) => ({ ex: s.ex, index, score: scoreExerciseRelevance(s.entry, q) }))
      .filter(s => s.score > 0)
      .sort((a, b) => (b.score - a.score) || (a.index - b.index))
      .map(s => s.ex);
  }, [exerciseSearchIndex, deferredQuery, selectedMuscle, selectedEquipment, selectedCategory, favoritesOnly, favoriteIds]);

  const openExercise = useCallback((id: string) => {
    router.push(`/exercises/${id}${builderPickSuffix}`);
  }, [router, builderPickSuffix]);

  const renderExercise = useCallback(({ item }: { item: any }) => (
    <ExerciseCard
      exercise={item}
      isFavorite={favoriteIds.has(item.id)}
      canFavorite={Boolean(userId)}
      onOpen={openExercise}
      onToggleFavorite={toggleFavorite}
    />
  ), [favoriteIds, userId, openExercise, toggleFavorite]);

  const hasActiveFilters = searchQuery || selectedMuscle !== 'All' || selectedEquipment !== 'All' || selectedCategory !== 'All' || favoritesOnly;

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedMuscle('All');
    setSelectedEquipment('All');
    setSelectedCategory('All');
    setFavoritesOnly(false);
  };

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

          {/* Catalog State Management */}
          {loading && exercises.length === 0 ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={P.ACCENT} />
              <Text style={[styles.emptyText, { marginTop: 12 }]}>Loading exercise catalog...</Text>
            </View>
          ) : exercises.length === 0 ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>{error ? 'Failed to Load Exercises' : 'Exercise Catalog Empty'}</Text>
              <Text style={styles.stateSubtitle}>
                {error || 'Unable to load exercises from the server. Please check your connection and reload.'}
              </Text>
              <TouchableOpacity
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Reload exercise catalog"
                onPress={() => fetchExercises()}
                style={styles.retryBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.retryBtnText}>Reload Catalog</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredExercises}
              renderItem={renderExercise}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              style={{ flex: 1, width: '100%' }}
              contentContainerStyle={styles.gridContainer}
              initialNumToRender={12}
              maxToRenderPerBatch={12}
              windowSize={7}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.noMatchesContainer}>
                  <Text style={styles.emptyText}>No exercises match your search and filters.</Text>
                  {hasActiveFilters && (
                    <TouchableOpacity
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel="Clear all filters"
                      onPress={clearAllFilters}
                      style={styles.clearBtn}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.clearBtnText}>Clear Filters</Text>
                    </TouchableOpacity>
                  )}
                </View>
              }
            />
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
    paddingHorizontal: 20,
  },
  header: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: P.TEXT_PRI,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: P.TEXT_SEC,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  searchContainer: {
    marginBottom: 8,
  },
  searchInput: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFF',
    fontSize: 14,
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
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
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
  stateCard: {
    marginTop: 40,
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: P.TEXT_PRI,
    marginBottom: 6,
  },
  stateSubtitle: {
    fontSize: 13,
    color: P.TEXT_MUT,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: P.ACCENT,
    borderRadius: 99,
  },
  retryBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
  },
  noMatchesContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: P.TEXT_MUT,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 13,
  },
  clearBtn: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  clearBtnText: {
    color: P.ACCENT,
    fontSize: 12,
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

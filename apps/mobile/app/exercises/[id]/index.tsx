import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../store/useAuthStore';
import { useRepositories } from '../../../hooks/useRepositories';
import { Exercise, ExerciseGuidanceType } from '@yeti/database';
import ExerciseMedia from '../../../components/ExerciseMedia';
import { useWorkoutBuilderStore } from '../../../store/useWorkoutBuilderStore';
import { P, sharedStyles } from '../../../constants/premiumTheme';
import { displayLabel, parseSecondaryMuscles } from '../../../utils/exerciseDisplay';

const GUIDANCE_OPTIONS: { type: ExerciseGuidanceType; label: string }[] = [
  { type: 'form_explanation', label: 'Explain Form' },
  { type: 'common_mistakes', label: 'Common Mistakes' },
  { type: 'breathing_technique', label: 'Breathing' },
  { type: 'beginner_version', label: 'Beginner Version' },
  { type: 'advanced_version', label: 'Advanced Version' },
  { type: 'injury_modifications', label: 'Injury Modifications' },
];

interface GuidanceState {
  loading: boolean;
  text?: string;
  error?: string;
}

// ─── Metadata badge ───────────────────────────────────────────────────────────

const MetaBadge = memo(function MetaBadge({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.metaBadge}>
      <Text style={styles.metaBadgeLabel}>{label}</Text>
      <Text style={styles.metaBadgeValue}>{displayLabel(value)}</Text>
    </View>
  );
});

// ─── Related exercise row item (used by Alternatives/Variations/Similar) ──────

const RelatedExerciseCard = memo(function RelatedExerciseCard({ exercise, onPress }: { exercise: Exercise; onPress: (id: string) => void }) {
  return (
    <TouchableOpacity style={styles.relatedCard} activeOpacity={0.8} onPress={() => onPress(exercise.id)}>
      <Text style={styles.relatedName} numberOfLines={2}>{exercise.name}</Text>
      <Text style={styles.relatedMuscle} numberOfLines={1}>{exercise.muscle_group || 'Full Body'}</Text>
    </TouchableOpacity>
  );
});

function RelatedExerciseRow({ title, exercises, onPressItem }: { title: string; exercises: Exercise[]; onPressItem: (id: string) => void }) {
  if (exercises.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={[sharedStyles.labelCaps, styles.sectionLabel]}>{title}</Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={exercises}
        keyExtractor={item => item.id}
        contentContainerStyle={{ gap: 10 }}
        renderItem={({ item }) => <RelatedExerciseCard exercise={item} onPress={onPressItem} />}
        // Lazy mount: only render cards near the visible window, not the whole row at once.
        initialNumToRender={4}
        windowSize={3}
        removeClippedSubviews
      />
    </View>
  );
}

// ─── AI guidance button + inline result ───────────────────────────────────────

const GuidanceButton = memo(function GuidanceButton({
  label, state, onPress,
}: { label: string; state: GuidanceState; onPress: () => void }) {
  return (
    <View style={styles.guidanceItem}>
      <TouchableOpacity
        style={[styles.guidanceBtn, state.text ? styles.guidanceBtnDone : null]}
        onPress={onPress}
        activeOpacity={0.8}
        disabled={state.loading}
      >
        {state.loading ? (
          <ActivityIndicator size="small" color={P.ACCENT} />
        ) : (
          <Text style={[styles.guidanceBtnText, state.text ? styles.guidanceBtnTextDone : null]}>{label}</Text>
        )}
      </TouchableOpacity>
      {state.error && <Text style={styles.guidanceError}>{state.error}</Text>}
      {state.text && <Text style={styles.guidanceText}>{state.text}</Text>}
    </View>
  );
});

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function ExerciseDetailScreen() {
  const { id, builderPick } = useLocalSearchParams<{ id: string; builderPick?: string }>();
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const { exerciseRepository } = useRepositories();
  const setPendingPick = useWorkoutBuilderStore((state) => state.setPendingPick);
  const userId = session?.user?.id;
  const isBuilderPick = builderPick === '1';

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  const [variations, setVariations] = useState<Exercise[]>([]);
  const [alternatives, setAlternatives] = useState<Exercise[]>([]);
  const [similar, setSimilar] = useState<Exercise[]>([]);

  const [guidance, setGuidance] = useState<Record<string, GuidanceState>>({});

  // Core metadata: local-first (WatermelonDB), works fully offline once the
  // catalog has been cached once. Only the media URL itself needs network.
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    exerciseRepository.getExerciseById(id).then(ex => {
      setExercise(ex);
      setLoading(false);
    });
  }, [id, exerciseRepository]);

  useEffect(() => {
    if (!userId || !id) return;
    exerciseRepository.getFavoriteIds(userId).then(ids => setIsFavorite(ids.has(id)));
  }, [userId, id, exerciseRepository]);

  // Relations/similar are a separate, non-blocking fetch — network-only,
  // gracefully empty offline (getRelations/getAlternatives already swallow
  // errors and resolve to [] rather than throwing).
  useEffect(() => {
    if (!id) return;
    exerciseRepository.getRelations(id).then(({ variations, alternatives }) => {
      setVariations(variations);
      setAlternatives(alternatives);
    });
    exerciseRepository.getAlternatives(id).then(setSimilar);
  }, [id, exerciseRepository]);

  const toggleFavorite = useCallback(async () => {
    if (!userId || !id) return;
    const wasFavorite = isFavorite;
    setIsFavorite(!wasFavorite);
    try {
      if (wasFavorite) await exerciseRepository.removeFavorite(userId, id);
      else await exerciseRepository.addFavorite(userId, id);
    } catch {
      setIsFavorite(wasFavorite);
    }
  }, [userId, id, isFavorite, exerciseRepository]);

  const requestGuidance = useCallback((type: ExerciseGuidanceType) => {
    if (!id) return;
    setGuidance(prev => ({ ...prev, [type]: { loading: true } }));
    exerciseRepository.getGuidance(id, type)
      .then(text => setGuidance(prev => ({ ...prev, [type]: { loading: false, text } })))
      .catch((err: any) => {
        const message = err?.message === 'AI_PROVIDER_NOT_CONFIGURED'
          ? 'AI coach is not configured right now.'
          : "Couldn't reach the AI coach — check your connection and try again.";
        setGuidance(prev => ({ ...prev, [type]: { loading: false, error: message } }));
      });
  }, [id, exerciseRepository]);

  const goToRelated = useCallback((relatedId: string) => {
    router.push(`/exercises/${relatedId}`);
  }, [router]);

  const secondaryMuscles = useMemo(
    () => parseSecondaryMuscles(exercise?.secondary_muscles),
    [exercise?.secondary_muscles]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={P.ACCENT} />
        </View>
      </SafeAreaView>
    );
  }

  if (!exercise) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Exercise not found. It may not be cached for offline use yet.</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtnStandalone} activeOpacity={0.8}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
            <Text style={styles.backBtnText}>‹ Back</Text>
          </TouchableOpacity>
          {userId && (
            <TouchableOpacity onPress={toggleFavorite} style={styles.favoriteBtn} activeOpacity={0.8}>
              <Text style={[styles.favoriteIcon, isFavorite ? styles.favoriteIconActive : null]}>
                {isFavorite ? '♥' : '♡'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.title}>{exercise.name}</Text>
        <Text style={styles.subtitle}>{exercise.muscle_group || 'Full Body'}</Text>

        {isBuilderPick && (
          <TouchableOpacity
            onPress={() => {
              setPendingPick({ exerciseId: exercise.id, exerciseName: exercise.name, muscleGroup: exercise.muscle_group });
              router.back();
              router.back();
            }}
            style={styles.addToWorkoutBtn}
            activeOpacity={0.85}
          >
            <Text style={styles.addToWorkoutBtnText}>+ Add to Workout</Text>
          </TouchableOpacity>
        )}

        <View style={styles.mediaWrapper}>
          <ExerciseMedia uri={exercise.gif_url || exercise.video_url} />
        </View>

        {/* Metadata grid */}
        <View style={styles.metaGrid}>
          <MetaBadge label="Primary Muscle" value={exercise.muscle_group} />
          <MetaBadge label="Target Muscle" value={exercise.target_muscle} />
          <MetaBadge label="Body Part" value={exercise.body_part} />
          <MetaBadge label="Equipment" value={exercise.equipment} />
          <MetaBadge label="Category" value={exercise.category} />
          <MetaBadge label="Difficulty" value={exercise.difficulty} />
        </View>

        {secondaryMuscles.length > 0 && (
          <View style={styles.section}>
            <Text style={[sharedStyles.labelCaps, styles.sectionLabel]}>Secondary Muscles</Text>
            <Text style={styles.bodyText}>{secondaryMuscles.map(displayLabel).join(', ')}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[sharedStyles.labelCaps, styles.sectionLabel]}>Instructions</Text>
          <Text style={styles.bodyText}>{exercise.instructions || 'No instructions provided.'}</Text>
        </View>

        {/* AI Coaching — generated only on request */}
        <View style={styles.section}>
          <Text style={[sharedStyles.labelCaps, styles.sectionLabel]}>AI Coaching</Text>
          <Text style={styles.sectionHint}>Tap for tips, common mistakes, breathing, and modifications — generated on demand.</Text>
          <View style={styles.guidanceGrid}>
            {GUIDANCE_OPTIONS.map(({ type, label }) => (
              <GuidanceButton
                key={type}
                label={label}
                state={guidance[type] || { loading: false }}
                onPress={() => requestGuidance(type)}
              />
            ))}
          </View>
        </View>

        <RelatedExerciseRow title="Variations" exercises={variations} onPressItem={goToRelated} />
        <RelatedExerciseRow title="Alternatives" exercises={alternatives} onPressItem={goToRelated} />
        <RelatedExerciseRow title="Similar Exercises" exercises={similar} onPressItem={goToRelated} />

        <TouchableOpacity
          onPress={() => router.push(`/exercises/${exercise.id}/history`)}
          style={styles.progressBtn}
          activeOpacity={0.8}
        >
          <Text style={styles.progressBtnText}>View Progress History →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: P.BG },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  emptyText: { color: P.TEXT_MUT, textAlign: 'center', fontWeight: '700' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  backBtn: { paddingVertical: 8, paddingRight: 8 },
  backBtnStandalone: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: P.ACCENT_DIM,
    borderWidth: 1,
    borderColor: P.ACCENT_BORDER,
  },
  backBtnText: { color: P.ACCENT, fontSize: 13, fontWeight: '800' },
  favoriteBtn: { padding: 8 },
  favoriteIcon: { fontSize: 24, color: P.TEXT_MUT },
  favoriteIconActive: { color: '#FF4B7A' },
  title: { fontSize: 26, fontWeight: '900', color: P.TEXT_PRI, letterSpacing: -0.5 },
  subtitle: {
    color: P.ACCENT, fontSize: 11, fontWeight: '900', textTransform: 'uppercase',
    letterSpacing: 0.8, marginTop: 4, marginBottom: 18,
  },
  mediaWrapper: { marginBottom: 18 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  metaBadge: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
    backgroundColor: P.CARD_BG, borderWidth: 1, borderColor: P.CARD_BORDER,
  },
  metaBadgeLabel: {
    color: P.TEXT_MUT, fontSize: 8, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5,
  },
  metaBadgeValue: { color: P.TEXT_PRI, fontSize: 12, fontWeight: '800', marginTop: 2 },
  section: { marginBottom: 22 },
  sectionLabel: { marginBottom: 8, marginLeft: 2 },
  sectionHint: { color: P.TEXT_MUT, fontSize: 11, fontWeight: '600', marginBottom: 12, marginLeft: 2 },
  bodyText: { color: P.TEXT_SEC, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  guidanceGrid: { gap: 10 },
  guidanceItem: { gap: 8 },
  guidanceBtn: {
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14,
    backgroundColor: P.CARD_BG, borderWidth: 1, borderColor: P.CARD_BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  guidanceBtnDone: { borderColor: P.ACCENT_BORDER, backgroundColor: P.ACCENT_DIM },
  guidanceBtnText: {
    color: P.TEXT_PRI, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5,
  },
  guidanceBtnTextDone: { color: P.ACCENT },
  guidanceText: {
    color: P.TEXT_SEC, fontSize: 13, lineHeight: 20, fontWeight: '600',
    paddingHorizontal: 4,
  },
  guidanceError: { color: P.RED, fontSize: 12, fontWeight: '700', paddingHorizontal: 4 },
  relatedCard: {
    width: 140, padding: 14, borderRadius: 14,
    backgroundColor: P.CARD_BG, borderWidth: 1, borderColor: P.CARD_BORDER,
  },
  relatedName: { color: P.TEXT_PRI, fontSize: 13, fontWeight: '800', letterSpacing: -0.2 },
  relatedMuscle: {
    color: P.ACCENT, fontSize: 9, fontWeight: '900', textTransform: 'uppercase',
    letterSpacing: 0.5, marginTop: 6,
  },
  progressBtn: {
    width: '100%', backgroundColor: P.ACCENT_DIM, borderWidth: 1, borderColor: P.ACCENT_BORDER,
    borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  progressBtnText: {
    color: P.ACCENT, fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5,
  },
  addToWorkoutBtn: {
    width: '100%', backgroundColor: P.ACCENT, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', marginTop: 14, marginBottom: 4,
  },
  addToWorkoutBtnText: {
    color: '#000', fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5,
  },
});

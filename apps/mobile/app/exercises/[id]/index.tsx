import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuthStore } from '../../../store/useAuthStore';
import { useRepositories } from '../../../hooks/useRepositories';
import { Exercise, ExerciseGuidanceType } from '@yeti/database';
import { useWorkoutBuilderStore } from '../../../store/useWorkoutBuilderStore';
import { P, glowStyle, sharedStyles } from '../../../constants/premiumTheme';
import { displayLabel, parseSecondaryMuscles } from '../../../utils/exerciseDisplay';

const MASCOT = require('../../../assets/yeti_mascot_avatar.png');

interface GuidanceState {
  loading: boolean;
  text?: string;
  error?: string;
}

// ── Compact stat tile (Primary Muscle / Equipment / Difficulty / Type) ──────
const StatTile = memo(function StatTile({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string | null;
}) {
  return (
    <View style={styles.statTile}>
      <Ionicons name={icon} size={18} color={P.ACCENT} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={2}>
        {value ? displayLabel(value) : '—'}
      </Text>
    </View>
  );
});

// ── Related-exercise card (used for both Alternatives and Variations) ───────
const RelatedCard = memo(function RelatedCard({
  exercise,
  onPress,
}: {
  exercise: Exercise;
  onPress: (id: string) => void;
}) {
  return (
    <TouchableOpacity
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`View ${exercise.name}`}
      activeOpacity={0.8}
      onPress={() => onPress(exercise.id)}
      style={styles.relatedCard}
    >
      <View style={styles.relatedThumb}>
        <Image
          source={exercise.thumbnail_url || exercise.gif_url ? { uri: exercise.thumbnail_url || exercise.gif_url } : MASCOT}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={200}
        />
      </View>
      <Text style={styles.relatedTitle} numberOfLines={1}>{exercise.name}</Text>
      {!!exercise.equipment && (
        <Text style={styles.relatedSub} numberOfLines={1}>{displayLabel(exercise.equipment)}</Text>
      )}
    </TouchableOpacity>
  );
});

export default function ExerciseDetailScreen() {
  const { id, builderPick } = useLocalSearchParams<{ id: string; builderPick?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const session = useAuthStore((state) => state.session);
  const { exerciseRepository } = useRepositories();
  const setPendingPick = useWorkoutBuilderStore((state) => state.setPendingPick);
  const userId = session?.user?.id;
  const isBuilderPick = builderPick === '1';

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [stepsExpanded, setStepsExpanded] = useState(false);

  const [variations, setVariations] = useState<Exercise[]>([]);
  const [alternatives, setAlternatives] = useState<Exercise[]>([]);
  const [similar, setSimilar] = useState<Exercise[]>([]);
  const [guidance, setGuidance] = useState<Record<string, GuidanceState>>({});
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    exerciseRepository.getExerciseById(id).then((ex) => {
      setExercise(ex);
      setLoading(false);
    });
  }, [id, exerciseRepository]);

  useEffect(() => {
    if (!userId || !id) return;
    exerciseRepository.getFavoriteIds(userId).then((ids) => setIsFavorite(ids.has(id)));
  }, [userId, id, exerciseRepository]);

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
    setGuidance((prev) => ({ ...prev, [type]: { loading: true } }));
    exerciseRepository.getGuidance(id, type)
      .then((text) => setGuidance((prev) => ({ ...prev, [type]: { loading: false, text } })))
      .catch((err: any) => {
        const message = err?.message === 'AI_PROVIDER_NOT_CONFIGURED'
          ? 'AI coach is not configured right now.'
          : "Couldn't reach the AI coach — check your connection and try again.";
        setGuidance((prev) => ({ ...prev, [type]: { loading: false, error: message } }));
      });
  }, [id, exerciseRepository]);

  const secondaryMuscles = useMemo(
    () => parseSecondaryMuscles(exercise?.secondary_muscles),
    [exercise?.secondary_muscles]
  );

  // Split the single instructions string into discrete, numbered steps.
  // Prefer explicit line breaks; fall back to sentence boundaries. Strips any
  // leading "1." / "1)" numbering the source text may already carry.
  const steps = useMemo(() => {
    const raw = exercise?.instructions?.trim();
    if (!raw) return [] as string[];
    let parts = raw.split(/\r?\n+/).map((s) => s.trim()).filter(Boolean);
    if (parts.length <= 1) {
      parts = raw.split('.').map((s) => s.trim()).filter(Boolean).map((s) => `${s}.`);
    }
    return parts.map((p) => p.replace(/^\s*\d+[.)]\s*/, '')).filter(Boolean);
  }, [exercise?.instructions]);

  const visibleSteps = stepsExpanded ? steps : steps.slice(0, 4);

  // The Alternatives row prefers explicitly-linked alternatives; if none are
  // defined it falls back to same-muscle "similar" exercises — both real.
  const altList = alternatives.length > 0 ? alternatives : similar;

  const toggleRow = useCallback((key: string) => {
    setExpandedRows((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const openAiRow = useCallback((key: string, type: ExerciseGuidanceType) => {
    const willOpen = !expandedRows[key];
    toggleRow(key);
    if (willOpen && !guidance[type]) requestGuidance(type);
  }, [expandedRows, guidance, toggleRow, requestGuidance]);

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
          <Text style={styles.emptyText}>Exercise not found.</Text>
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.notFoundBtn}
          >
            <Text style={{ color: P.TEXT_PRI, fontWeight: '800' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const primaryMuscle = exercise.target_muscle || exercise.muscle_group;
  const badgeLabel = exercise.muscle_group || exercise.body_part || exercise.category;
  const hasMedia = !!(exercise.gif_url || exercise.video_url || exercise.thumbnail_url);

  return (
    <View style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── Immersive Hero ─────────────────────────────────────────────── */}
        <View style={styles.hero}>
          {hasMedia ? (
            <Image
              source={{ uri: exercise.gif_url || exercise.thumbnail_url || exercise.video_url || undefined }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={250}
              placeholder={{ blurhash: 'L5H2EC=PM+yV0g-mq.wG9c010J}I' }}
            />
          ) : (
            <View style={styles.heroEmpty}>
              <Ionicons name="barbell-outline" size={40} color={P.TEXT_MUT} />
              <Text style={styles.heroEmptyText}>No demonstration media available</Text>
            </View>
          )}
          {/* Bottom scrim so overlaid controls stay legible on bright media */}
          <View style={styles.heroScrim} pointerEvents="none" />

          {/* Overlaid controls */}
          <View style={[styles.heroControls, { top: insets.top + 8 }]}>
            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => router.back()}
              style={styles.heroCircleBtn}
            >
              <Ionicons name="arrow-back" size={20} color={P.TEXT_PRI} />
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                accessible={true}
                accessibilityRole="button"
                accessibilityState={{ selected: isFavorite }}
                accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                onPress={toggleFavorite}
                style={[styles.heroCircleBtn, isFavorite && styles.heroCircleBtnActive]}
              >
                <Ionicons name={isFavorite ? 'star' : 'star-outline'} size={20} color={isFavorite ? P.ACCENT : P.TEXT_PRI} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {/* ── Title block ──────────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.duration(400)}>
            {!!badgeLabel && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{displayLabel(badgeLabel).toUpperCase()}</Text>
              </View>
            )}
            <Text style={styles.title}>{exercise.name}</Text>

            {/* Meta sub-row — real facts only (no fabricated rating/time) */}
            <View style={styles.metaSubRow}>
              {!!exercise.difficulty && (
                <View style={styles.metaSubItem}>
                  <Ionicons name="speedometer-outline" size={14} color={P.TEXT_SEC} />
                  <Text style={styles.metaSubText}>{displayLabel(exercise.difficulty)}</Text>
                </View>
              )}
              {!!exercise.category && (
                <>
                  {!!exercise.difficulty && <View style={styles.metaDot} />}
                  <View style={styles.metaSubItem}>
                    <Ionicons name="pricetag-outline" size={14} color={P.TEXT_SEC} />
                    <Text style={styles.metaSubText}>{displayLabel(exercise.category)}</Text>
                  </View>
                </>
              )}
            </View>
          </Animated.View>

          {/* ── 4-stat grid ──────────────────────────────────────────────── */}
          <View style={styles.statGrid}>
            <StatTile icon="body-outline" label="Primary Muscle" value={primaryMuscle} />
            <StatTile icon="barbell-outline" label="Equipment" value={exercise.equipment} />
            <StatTile icon="speedometer-outline" label="Difficulty" value={exercise.difficulty} />
            <StatTile icon="pricetag-outline" label="Type" value={exercise.category || exercise.body_part} />
          </View>

          {/* ── Muscles Worked ───────────────────────────────────────────── */}
          {(!!primaryMuscle || secondaryMuscles.length > 0) && (
            <View style={styles.section}>
              <Text style={sharedStyles.labelCaps}>MUSCLES WORKED</Text>
              <View style={styles.musclesCard}>
                <View style={styles.muscleFigureCol}>
                  <Ionicons name="body-outline" size={54} color={P.ACCENT} />
                  <Ionicons name="body" size={54} color={P.ACCENT_DIM} />
                </View>
                <View style={{ flex: 1, marginLeft: 16, gap: 12 }}>
                  {!!primaryMuscle && (
                    <View style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: P.ACCENT }]} />
                      <Text style={styles.legendText}>
                        <Text style={styles.legendLabel}>Primary: </Text>
                        {displayLabel(primaryMuscle)}
                      </Text>
                    </View>
                  )}
                  {secondaryMuscles.length > 0 && (
                    <View style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: P.TEXT_MUT }]} />
                      <Text style={styles.legendText}>
                        <Text style={styles.legendLabel}>Secondary: </Text>
                        {secondaryMuscles.map(displayLabel).join(', ')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* ── How To Perform ───────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={sharedStyles.labelCaps}>HOW TO PERFORM</Text>
            {steps.length > 0 ? (
              <View style={{ marginTop: 12, gap: 12 }}>
                {visibleSteps.map((step, idx) => (
                  <View key={idx} style={styles.stepRow}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
                {steps.length > 4 && (
                  <TouchableOpacity
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={stepsExpanded ? 'Show fewer steps' : 'View more steps'}
                    onPress={() => setStepsExpanded((v) => !v)}
                    style={styles.viewMoreBtn}
                  >
                    <Text style={styles.viewMoreText}>{stepsExpanded ? 'View Less' : 'View More'}</Text>
                    <Ionicons name={stepsExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={P.ACCENT} />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <Text style={styles.emptyBodyText}>No instructions available for this exercise yet.</Text>
            )}
          </View>

          {/* ── Expandable rows ──────────────────────────────────────────── */}
          {/* Common Mistakes (AI) */}
          <ExpandableRow
            icon="alert-circle-outline"
            iconColor={P.WARNING}
            label="Common Mistakes"
            expanded={!!expandedRows.mistakes}
            onToggle={() => openAiRow('mistakes', 'common_mistakes')}
          >
            <GuidanceBody state={guidance['common_mistakes']} onRetry={() => requestGuidance('common_mistakes')} />
          </ExpandableRow>

          {/* AI Coach Tips (AI) */}
          <ExpandableRow
            icon="sparkles"
            iconColor={P.ACCENT}
            label="AI Coach Tips"
            expanded={!!expandedRows.tips}
            onToggle={() => openAiRow('tips', 'form_explanation')}
          >
            <GuidanceBody state={guidance['form_explanation']} onRetry={() => requestGuidance('form_explanation')} />
          </ExpandableRow>

          {/* Alternatives (real relations / similar fallback) */}
          <ExpandableRow
            icon="swap-horizontal-outline"
            iconColor={P.ACCENT}
            label="Alternatives"
            expanded={!!expandedRows.alternatives}
            onToggle={() => toggleRow('alternatives')}
          >
            {altList.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {altList.map((alt) => (
                  <RelatedCard key={alt.id} exercise={alt} onPress={(x) => router.push(`/exercises/${x}`)} />
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.emptyBodyText}>No alternative exercises listed yet.</Text>
            )}
          </ExpandableRow>

          {/* Variations (real relations) */}
          <ExpandableRow
            icon="options-outline"
            iconColor={P.ACCENT}
            label="Variations"
            expanded={!!expandedRows.variations}
            onToggle={() => toggleRow('variations')}
            last
          >
            {variations.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {variations.map((v) => (
                  <RelatedCard key={v.id} exercise={v} onPress={(x) => router.push(`/exercises/${x}`)} />
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.emptyBodyText}>No variations listed yet.</Text>
            )}
          </ExpandableRow>
        </View>
      </ScrollView>

      {/* ── Sticky footer actions ──────────────────────────────────────── */}
      <View style={[styles.stickyFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Ask AI Coach about this exercise"
          activeOpacity={0.8}
          onPress={() => router.push('/coach')}
          style={styles.footerSecondaryBtn}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={16} color={P.TEXT_PRI} />
          <Text style={styles.footerSecondaryText}>AI COACH</Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Add to Workout"
          activeOpacity={0.85}
          onPress={() => {
            if (isBuilderPick) {
              setPendingPick({ exerciseId: exercise.id, exerciseName: exercise.name, muscleGroup: exercise.muscle_group });
            }
            router.back();
          }}
          style={[styles.footerPrimaryBtn, glowStyle(P.ACCENT, 16, 0.35)]}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.footerPrimaryText}>ADD TO WORKOUT</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Reusable expandable disclosure row ──────────────────────────────────────
const ExpandableRow = memo(function ExpandableRow({
  icon,
  iconColor,
  label,
  expanded,
  onToggle,
  children,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <View style={[styles.expandCard, last && { marginBottom: 0 }]}>
      <TouchableOpacity
        accessible={true}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={label}
        activeOpacity={0.8}
        onPress={onToggle}
        style={styles.expandHeader}
      >
        <Ionicons name={icon} size={18} color={iconColor} />
        <Text style={styles.expandLabel}>{label}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-forward'} size={16} color={P.TEXT_MUT} />
      </TouchableOpacity>
      {expanded && <View style={styles.expandBody}>{children}</View>}
    </View>
  );
});

// ── AI guidance body (loading / error+retry / text) ─────────────────────────
const GuidanceBody = memo(function GuidanceBody({
  state,
  onRetry,
}: {
  state?: GuidanceState;
  onRetry: () => void;
}) {
  if (!state || state.loading) {
    return (
      <View style={styles.guidanceLoading}>
        <ActivityIndicator size="small" color={P.ACCENT} />
        <Text style={styles.guidanceLoadingText}>Asking the AI coach…</Text>
      </View>
    );
  }
  if (state.error) {
    return (
      <View>
        <Text style={styles.guidanceError}>{state.error}</Text>
        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Retry AI request"
          onPress={onRetry}
          style={styles.retryBtn}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return <Text style={styles.guidanceText}>{state.text}</Text>;
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: P.BG },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyText: { color: P.TEXT_MUT, fontSize: 14, fontWeight: '700' },
  notFoundBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: P.CARD_BG, borderRadius: P.RADIUS_SM },

  scrollContent: { paddingBottom: 120 },

  // Hero
  hero: {
    width: '100%',
    height: 300,
    backgroundColor: 'rgba(0,0,0,0.35)',
    overflow: 'hidden',
  },
  heroEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  heroEmptyText: { color: P.TEXT_MUT, fontSize: 12, fontWeight: '700' },
  heroScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 88,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  heroControls: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCircleBtnActive: {
    backgroundColor: P.ACCENT_DIM,
    borderColor: P.ACCENT_BORDER,
  },

  body: { paddingHorizontal: 20, marginTop: 18 },

  // Title block
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: P.ACCENT_DIM,
    borderWidth: 1,
    borderColor: P.ACCENT_BORDER,
    borderRadius: P.RADIUS_FULL,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
  },
  categoryBadgeText: { color: P.ACCENT, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  title: { color: P.TEXT_PRI, fontSize: 26, fontWeight: '900', letterSpacing: -0.6 },
  metaSubRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  metaSubItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaSubText: { color: P.TEXT_SEC, fontSize: 13, fontWeight: '700' },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: P.TEXT_MUT },

  // 4-stat grid
  statGrid: { flexDirection: 'row', gap: 8, marginTop: 18 },
  statTile: {
    flex: 1,
    backgroundColor: P.CARD_BG,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    borderRadius: P.RADIUS_SM,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 6,
  },
  statLabel: { color: P.TEXT_MUT, fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center' },
  statValue: { color: P.TEXT_PRI, fontSize: 11, fontWeight: '800', textAlign: 'center' },

  // Sections
  section: { marginTop: 26 },
  emptyBodyText: { color: P.TEXT_MUT, fontSize: 13, fontWeight: '600', marginTop: 10 },

  // Muscles Worked
  musclesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: P.CARD_BG,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    borderRadius: P.RADIUS_CARD,
    padding: 16,
  },
  muscleFigureCol: { flexDirection: 'row', gap: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  legendText: { flex: 1, color: P.TEXT_SEC, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  legendLabel: { color: P.TEXT_PRI, fontWeight: '800' },

  // How To Perform
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: P.ACCENT_DIM,
    borderWidth: 1,
    borderColor: P.ACCENT_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: { color: P.ACCENT, fontSize: 12, fontWeight: '900' },
  stepText: { flex: 1, color: P.TEXT_SEC, fontSize: 14, fontWeight: '500', lineHeight: 21 },
  viewMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, marginTop: 2 },
  viewMoreText: { color: P.ACCENT, fontSize: 13, fontWeight: '800' },

  // Expandable rows
  expandCard: {
    backgroundColor: P.CARD_BG,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    borderRadius: P.RADIUS_CARD,
    marginTop: 12,
    overflow: 'hidden',
  },
  expandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  expandLabel: { flex: 1, color: P.TEXT_PRI, fontSize: 14, fontWeight: '800' },
  expandBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },

  // AI guidance body
  guidanceLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 12 },
  guidanceLoadingText: { color: P.TEXT_MUT, fontSize: 12, fontWeight: '600' },
  guidanceError: { color: P.WARNING, fontSize: 13, fontWeight: '600', paddingTop: 12 },
  guidanceText: { color: P.TEXT_SEC, fontSize: 14, fontWeight: '500', lineHeight: 21, paddingTop: 12 },
  retryBtn: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: P.RADIUS_FULL,
    backgroundColor: P.ACCENT_DIM,
    borderWidth: 1,
    borderColor: P.ACCENT_BORDER,
  },
  retryText: { color: P.ACCENT, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Related cards (Alternatives / Variations)
  relatedCard: {
    width: 140,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    borderRadius: P.RADIUS_SM,
    padding: 10,
    marginTop: 12,
  },
  relatedThumb: { width: '100%', height: 70, borderRadius: 8, overflow: 'hidden', marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.04)' },
  relatedTitle: { color: P.TEXT_PRI, fontSize: 12, fontWeight: '800' },
  relatedSub: { color: P.TEXT_MUT, fontSize: 10, marginTop: 2, fontWeight: '600' },

  // Sticky footer
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: P.BG,
    borderTopWidth: 1,
    borderTopColor: P.CARD_BORDER,
  },
  footerSecondaryBtn: {
    flex: 1,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: P.RADIUS_PILL,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
  },
  footerSecondaryText: { color: P.TEXT_PRI, fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  footerPrimaryBtn: {
    flex: 1.6,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: P.RADIUS_PILL,
    backgroundColor: P.ACCENT,
  },
  footerPrimaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
});

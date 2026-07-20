import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, FlatList, Image, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuthStore } from '../../../store/useAuthStore';
import { useRepositories } from '../../../hooks/useRepositories';
import { Exercise, ExerciseGuidanceType } from '@yeti/database';
import ExerciseMedia from '../../../components/ExerciseMedia';
import { useWorkoutBuilderStore } from '../../../store/useWorkoutBuilderStore';
import { P, glowStyle, sharedStyles } from '../../../constants/premiumTheme';
import { displayLabel, parseSecondaryMuscles } from '../../../utils/exerciseDisplay';

const TABS = ['Overview', 'Muscles', 'Instructions', 'Tips'] as const;

const GUIDANCE_OPTIONS: { type: ExerciseGuidanceType; label: string }[] = [
  { type: 'form_explanation', label: 'Form Tips' },
  { type: 'common_mistakes', label: 'Common Mistakes' },
  { type: 'breathing_technique', label: 'Breathing' },
  { type: 'injury_modifications', label: 'Modifications' },
];

interface GuidanceState {
  loading: boolean;
  text?: string;
  error?: string;
}

const MetaRowItem = memo(function MetaRowItem({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <View style={styles.metaRow}>
      <View style={styles.metaIconCol}>
        <Ionicons name={icon} size={18} color={P.ACCENT} />
      </View>
      <Text style={styles.metaLabelText}>{label}</Text>
      <Text style={styles.metaValueText}>{displayLabel(value)}</Text>
    </View>
  );
});

const AlternativeCard = memo(function AlternativeCard({
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
      accessibilityLabel={`View alternative exercise ${exercise.name}`}
      activeOpacity={0.8}
      onPress={() => onPress(exercise.id)}
      style={[sharedStyles.card, styles.altCard]}
    >
      <View style={styles.altThumb}>
        <Image
          source={require('../../../assets/yeti_mascot_avatar.png')}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      </View>
      <Text style={styles.altTitle} numberOfLines={1}>{exercise.name}</Text>
      <Text style={styles.altSub} numberOfLines={1}>{exercise.equipment || 'Equipment'}</Text>
    </TouchableOpacity>
  );
});


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
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Overview');

  const [variations, setVariations] = useState<Exercise[]>([]);
  const [alternatives, setAlternatives] = useState<Exercise[]>([]);
  const [similar, setSimilar] = useState<Exercise[]>([]);
  const [guidance, setGuidance] = useState<Record<string, GuidanceState>>({});

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
          <TouchableOpacity onPress={() => router.back()} style={styles.standaloneBtn}>
            <Text style={{ color: P.TEXT_PRI, fontWeight: '800' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.circleBtn}
        >
          <Ionicons name="arrow-back" size={20} color={P.TEXT_PRI} />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {exercise.name}
        </Text>

        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Toggle favorite exercise"
          onPress={toggleFavorite}
          style={styles.circleBtn}
        >
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={20}
            color={isFavorite ? P.CALORIES : P.TEXT_PRI}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Media Image / Video Banner */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.heroMediaWrapper}>
          <ExerciseMedia uri={exercise.gif_url || exercise.video_url} />
        </Animated.View>

        {/* Segmented Tab Bar */}
        <View style={styles.tabSegmentRow}>
          {TABS.map((tab) => {
            const isSelected = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                accessible={true}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
                onPress={() => setActiveTab(tab)}
                style={[styles.tabPill, isSelected && styles.tabPillActive]}
              >
                <Text style={[styles.tabPillText, isSelected && styles.tabPillTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab 1: Overview */}
        {activeTab === 'Overview' && (
          <Animated.View entering={FadeInDown.duration(300)}>
            {/* Meta Details Card */}
            <View style={sharedStyles.card}>
              <MetaRowItem icon="body-outline" label="Primary Muscles" value={exercise.muscle_group} />
              <MetaRowItem icon="fitness-outline" label="Secondary Muscles" value={secondaryMuscles.map(displayLabel).join(', ') || 'Triceps, Shoulders'} />
              <MetaRowItem icon="hardware-chip-outline" label="Equipment" value={exercise.equipment || 'Dumbbell, Bench'} />
              <MetaRowItem icon="speedometer-outline" label="Difficulty" value={exercise.difficulty || 'Intermediate'} />
            </View>

            {/* Alternatives Row */}
            <View style={{ marginBottom: 20 }}>
              <View style={sharedStyles.rowBetween}>
                <Text style={sharedStyles.labelCaps}>ALTERNATIVES</Text>
                <TouchableOpacity onPress={() => {}}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, marginTop: 10 }}>
                {alternatives.length > 0 ? (
                  alternatives.map((alt) => (
                    <AlternativeCard key={alt.id} exercise={alt} onPress={(id) => router.push(`/exercises/${id}`)} />
                  ))
                ) : (
                  <>
                    <AlternativeCard
                      exercise={{ id: 'alt_1', name: 'Barbell Incline Press', equipment: 'Barbell, Bench', muscle_group: 'Chest' } as any}
                      onPress={() => {}}
                    />
                    <AlternativeCard
                      exercise={{ id: 'alt_2', name: 'Incline Chest Press Machine', equipment: 'Machine', muscle_group: 'Chest' } as any}
                      onPress={() => {}}
                    />
                  </>
                )}
              </ScrollView>
            </View>

            {/* AI Coach Banner */}
            <View style={[sharedStyles.card, styles.aiCoachCard]}>
              <View style={styles.aiCoachHeader}>
                <View style={styles.yetiIconCircle}>
                  <Image source={require('../../../assets/yeti_mascot_avatar.png')} style={{ width: 24, height: 24 }} resizeMode="cover" />
                </View>
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.aiCoachTitle}>AI COACH</Text>
                  <Text style={styles.aiCoachSub}>Get AI tips for this exercise</Text>
                </View>
              </View>
            </View>

          </Animated.View>
        )}

        {/* Tab 2: Muscles */}
        {activeTab === 'Muscles' && (
          <View style={sharedStyles.card}>
            <Text style={sharedStyles.labelCaps}>TARGET MUSCLE GROUPS</Text>
            <Text style={styles.bodyText}>Primary: {exercise.muscle_group || 'Chest'}</Text>
            <Text style={styles.bodyText}>Secondary: {secondaryMuscles.map(displayLabel).join(', ') || 'Shoulders, Triceps'}</Text>
          </View>
        )}

        {/* Tab 3: Instructions */}
        {activeTab === 'Instructions' && (
          <View style={sharedStyles.card}>
            <Text style={sharedStyles.labelCaps}>STEP-BY-STEP INSTRUCTIONS</Text>
            <Text style={styles.bodyText}>{exercise.instructions || 'Adjust bench to 30-45 degree incline. Keep core tight and press dumbbells vertically.'}</Text>
          </View>
        )}

        {/* Tab 4: Tips */}
        {activeTab === 'Tips' && (
          <View style={sharedStyles.card}>
            <Text style={sharedStyles.labelCaps}>AI COACHING TIPS</Text>
            <View style={{ gap: 8, marginTop: 10 }}>
              {GUIDANCE_OPTIONS.map(({ type, label }) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => requestGuidance(type)}
                  style={styles.tipBtn}
                >
                  <Text style={styles.tipBtnText}>{label}</Text>
                  {guidance[type]?.loading ? (
                    <ActivityIndicator size="small" color={P.ACCENT} />
                  ) : (
                    <Ionicons name="sparkles" size={14} color={P.ACCENT} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Action Button (+ ADD TO WORKOUT) */}
      <View style={styles.stickyFooter}>
        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Add to Workout"
          activeOpacity={0.85}
          onPress={() => {
            if (isBuilderPick) {
              setPendingPick({ exerciseId: exercise.id, exerciseName: exercise.name, muscleGroup: exercise.muscle_group });
              router.back();
            } else {
              router.back();
            }
          }}
          style={[styles.primaryRoyalBtn, glowStyle(P.ACCENT, 16, 0.35)]}
        >
          <Text style={styles.primaryRoyalBtnText}>+ ADD TO WORKOUT</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: P.BG },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyText: { color: P.TEXT_MUT, fontSize: 14, fontWeight: '700' },
  standaloneBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: P.CARD_BG, borderRadius: P.RADIUS_SM },

  // Header Bar
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: P.CARD_BORDER,
  },
  headerTitle: { color: P.TEXT_PRI, fontSize: 18, fontWeight: '900', letterSpacing: -0.4, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 110 },

  // Hero Media
  heroMediaWrapper: {
    height: 200,
    borderRadius: P.RADIUS_CARD,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
  },

  // Segmented Tabs
  tabSegmentRow: {
    flexDirection: 'row',
    backgroundColor: P.CARD_BG,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    borderRadius: P.RADIUS_PILL,
    padding: 4,
    marginBottom: 16,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: P.RADIUS_SM,
  },
  tabPillActive: { backgroundColor: P.ACCENT },
  tabPillText: { color: P.TEXT_MUT, fontSize: 12, fontWeight: '800' },
  tabPillTextActive: { color: '#FFFFFF' },

  // Meta Rows
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  metaIconCol: { width: 28 },
  metaLabelText: { color: P.TEXT_SEC, fontSize: 13, fontWeight: '700', flex: 1 },
  metaValueText: { color: P.TEXT_PRI, fontSize: 13, fontWeight: '900' },

  // Alternatives Section
  seeAllText: { color: P.ACCENT, fontSize: 11, fontWeight: '800' },
  altCard: { width: 140, padding: 12, marginBottom: 0 },
  altThumb: { width: '100%', height: 70, borderRadius: 10, overflow: 'hidden', marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.03)' },
  altTitle: { color: P.TEXT_PRI, fontSize: 12, fontWeight: '800' },
  altSub: { color: P.TEXT_MUT, fontSize: 10, marginTop: 2, fontWeight: '600' },

  // AI Coach Card
  aiCoachCard: {
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    borderColor: P.ACCENT_BORDER,
    padding: 16,
  },
  aiCoachHeader: { flexDirection: 'row', alignItems: 'center' },
  yetiIconCircle: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  aiCoachTitle: { color: P.ACCENT, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  aiCoachSub: { color: P.TEXT_SEC, fontSize: 12, marginTop: 1 },

  bodyText: { color: P.TEXT_SEC, fontSize: 13, lineHeight: 19, marginTop: 6, fontWeight: '600' },
  tipBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: P.RADIUS_SM,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
  },
  tipBtnText: { color: P.TEXT_PRI, fontSize: 13, fontWeight: '800' },

  // Sticky Bottom Action CTA
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    backgroundColor: P.BG,
    borderTopWidth: 1,
    borderTopColor: P.CARD_BORDER,
  },
  primaryRoyalBtn: {
    backgroundColor: P.ACCENT, // Royal Blue #2563EB
    minHeight: 48,
    borderRadius: P.RADIUS_PILL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryRoyalBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15, letterSpacing: 0.8 },
});

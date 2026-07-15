import { useRepositories } from '../../hooks/useRepositories';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { SlideInRight } from 'react-native-reanimated';
import { useUserStore } from '../../store/useUserStore';
import { useAuthStore } from '../../store/useAuthStore';
/* removed supabase */
import { P, glowStyle, sharedStyles } from '../../constants/premiumTheme';

const GOALS_DATA = [
  {
    key: 'BUILD_MUSCLE',
    title: 'Build Muscle',
    subtitle: 'Hypertrophy, strength, & athletic gains',
  },
  {
    key: 'LOSE_FAT',
    title: 'Lose Fat',
    subtitle: 'Calorie deficit, lean definition, & toning',
  },
  {
    key: 'MAINTAIN',
    title: 'Maintain',
    subtitle: 'Endurance, body recomposition, & health',
  },
];

const ACTIVITIES_DATA = [
  {
    key: 'SEDENTARY',
    title: 'Sedentary',
    subtitle: 'Desk job, little to no deliberate exercise',
  },
  {
    key: 'LIGHT',
    title: 'Lightly Active',
    subtitle: 'Light exercise or sports 1-3 days/week',
  },
  {
    key: 'MODERATE',
    title: 'Moderately Active',
    subtitle: 'Moderate training/sports 3-5 days/week',
  },
  {
    key: 'ACTIVE',
    title: 'Very Active',
    subtitle: 'Hard exercise/intense sports 6-7 days/week',
  },
  {
    key: 'VERY_ACTIVE',
    title: 'Athlete / Elite',
    subtitle: 'Daily brutal training or physically grueling labor',
  },
];

export default function GoalsScreen() {
  const router = useRouter();
  const userStore = useUserStore();
  const session = useAuthStore((state) => state.session);
  const { userRepository } = useRepositories();
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (!userStore.activity_level || !userStore.goal) return;
    if (!session?.user?.id) {
      Alert.alert('Error', 'No authenticated user found');
      return;
    }

    setLoading(true);
    const { error } = await (userRepository as any).updateProfile({
      id: session.user.id,
      full_name: userStore.full_name,
      age: parseInt(userStore.age),
      gender: userStore.gender,
      height_cm: parseFloat(userStore.height_cm),
      weight_kg: parseFloat(userStore.weight_kg),
      body_fat_percent: userStore.body_fat_percent ? parseFloat(userStore.body_fat_percent) : null,
      activity_level: userStore.activity_level,
      goal: userStore.goal,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Error saving profile', error.message);
    } else {
      router.replace('/onboarding/notifications');
    }
  };

  const isFormValid = userStore.activity_level && userStore.goal;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View 
        entering={SlideInRight.duration(500)} 
        style={styles.container}
      >
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
          {/* Progress Step Indicator (Step 3 of 4) */}
          <View style={styles.stepIndicatorContainer}>
            <View style={styles.stepDot} />
            <View style={styles.stepDot} />
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View style={styles.stepDot} />
          </View>

          <Text style={styles.title}>Your Objectives</Text>
          <Text style={styles.subtitle}>Choose your targets & activity profile</Text>

          {/* Primary Goal Selection */}
          <Text style={[sharedStyles.labelCaps, styles.sectionLabel]}>Primary Goal</Text>
          <View style={styles.selectionGrid}>
            {GOALS_DATA.map((goalItem) => {
              const isSelected = userStore.goal === goalItem.key;
              return (
                <TouchableOpacity
                  key={goalItem.key}
                  onPress={() => userStore.updateField('goal', goalItem.key)}
                  style={[
                    styles.cardBtn,
                    isSelected ? styles.cardBtnSelected : null
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.cardTitle,
                    isSelected ? styles.cardTitleSelected : null
                  ]}>
                    {goalItem.title}
                  </Text>
                  <Text style={[
                    styles.cardSubtitle,
                    isSelected ? styles.cardSubtitleSelected : null
                  ]}>
                    {goalItem.subtitle}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Activity Level Selection */}
          <Text style={[sharedStyles.labelCaps, styles.sectionLabel]}>Activity Level</Text>
          <View style={styles.selectionGrid}>
            {ACTIVITIES_DATA.map((actItem) => {
              const isSelected = userStore.activity_level === actItem.key;
              return (
                <TouchableOpacity
                  key={actItem.key}
                  onPress={() => userStore.updateField('activity_level', actItem.key)}
                  style={[
                    styles.cardBtn,
                    isSelected ? styles.cardBtnSelected : null
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.cardTitle,
                    isSelected ? styles.cardTitleSelected : null
                  ]}>
                    {actItem.title}
                  </Text>
                  <Text style={[
                    styles.cardSubtitle,
                    isSelected ? styles.cardSubtitleSelected : null
                  ]}>
                    {actItem.subtitle}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.nextBtn,
              isFormValid ? [styles.nextBtnActive, glowStyle(P.ACCENT, 12, 0.45)] : null
            ]}
            onPress={handleComplete}
            disabled={!isFormValid || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text style={[
                styles.nextBtnText,
                isFormValid ? styles.nextBtnTextActive : null
              ]}>
                Finish Profile
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
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
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 16 : 24,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  stepDot: {
    height: 6,
    width: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  stepDotActive: {
    width: 20,
    backgroundColor: P.ACCENT,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: P.TEXT_PRI,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: P.TEXT_SEC,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 24,
  },
  sectionLabel: {
    marginBottom: 12,
    marginLeft: 4,
    color: P.TEXT_SEC,
  },
  selectionGrid: {
    marginBottom: 28,
    gap: 10,
  },
  cardBtn: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    backgroundColor: 'rgba(0,0,0,0.3)',
    flexDirection: 'column',
  },
  cardBtnSelected: {
    borderColor: P.ACCENT,
    backgroundColor: P.ACCENT_DIM,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: P.TEXT_PRI,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardTitleSelected: {
    color: P.ACCENT,
  },
  cardSubtitle: {
    fontSize: 11,
    color: P.TEXT_SEC,
  },
  cardSubtitleSelected: {
    color: 'rgba(255,255,255,0.85)',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: P.TEXT_PRI,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nextBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnActive: {
    backgroundColor: P.ACCENT,
    borderColor: P.ACCENT,
    borderWidth: 0,
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: P.TEXT_MUT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nextBtnTextActive: {
    color: '#000000',
    fontWeight: '900',
  },
});

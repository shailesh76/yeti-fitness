import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { useUserStore } from '../../store/useUserStore';
import { P, glowStyle, sharedStyles } from '../../constants/premiumTheme';

export default function BasicInfoScreen() {
  const router = useRouter();
  const { full_name, age, gender, updateField } = useUserStore();
  const [focusedField, setFocusedField] = useState<'name' | 'age' | null>(null);

  const handleNext = () => {
    if (!full_name || !age || !gender) return;
    router.push('/onboarding/body-metrics');
  };

  const isFormValid = full_name?.trim() && age?.trim() && gender;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Animated.View 
          entering={SlideInRight.duration(500)} 
          exiting={SlideOutLeft.duration(500)}
          style={styles.container}
        >
          <View style={{ flex: 1 }}>
            {/* Progress Step Indicator (Step 1 of 4) */}
            <View style={styles.stepIndicatorContainer}>
              <View style={[styles.stepDot, styles.stepDotActive]} />
              <View style={styles.stepDot} />
              <View style={styles.stepDot} />
              <View style={styles.stepDot} />
            </View>

            <Text style={styles.title}>Tell us about you</Text>
            <Text style={styles.subtitle}>Let's personalize your experience</Text>

            <View style={styles.inputContainer}>
              <Text style={[sharedStyles.labelCaps, styles.inputLabel]}>Full Name</Text>
              <TextInput
                style={[
                  styles.textInput,
                  focusedField === 'name' && styles.textInputFocused
                ]}
                placeholder="John Doe"
                placeholderTextColor="#444"
                value={full_name}
                onChangeText={(val) => updateField('full_name', val)}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <View style={styles.rowContainer}>
              <View style={{ flex: 0.4 }}>
                <Text style={[sharedStyles.labelCaps, styles.inputLabel]}>Age</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    { textAlign: 'center' },
                    focusedField === 'age' && styles.textInputFocused
                  ]}
                  placeholder="25"
                  placeholderTextColor="#444"
                  keyboardType="numeric"
                  value={age}
                  onChangeText={(val) => updateField('age', val)}
                  onFocus={() => setFocusedField('age')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
              
              <View style={{ flex: 0.6 }}>
                <Text style={[sharedStyles.labelCaps, styles.inputLabel]}>Gender</Text>
                <View style={styles.genderRow}>
                  {['Male', 'Female', 'Other'].map((g) => {
                    const isSelected = gender === g;
                    return (
                      <TouchableOpacity
                        key={g}
                        onPress={() => updateField('gender', g)}
                        style={[
                          styles.genderBtn,
                          isSelected ? styles.genderBtnSelected : null
                        ]}
                        activeOpacity={0.8}
                      >
                        <Text style={[
                          styles.genderText,
                          isSelected ? styles.genderTextSelected : null
                        ]}>
                          {g}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity 
            style={[
              styles.nextBtn,
              isFormValid ? [styles.nextBtnActive, glowStyle(P.ACCENT, 12, 0.45)] : null
            ]}
            onPress={handleNext}
            disabled={!isFormValid}
            activeOpacity={0.85}
          >
            <Text style={[
              styles.nextBtnText,
              isFormValid ? styles.nextBtnTextActive : null
            ]}>Next Step</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
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
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    marginBottom: 8,
    marginLeft: 4,
    color: P.TEXT_SEC,
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
  },
  textInputFocused: {
    borderColor: P.ACCENT,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  rowContainer: {
    marginBottom: 24,
    flexDirection: 'row',
    gap: 16,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
    height: 50,
    alignItems: 'center',
  },
  genderBtn: {
    flex: 1,
    height: '100%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderBtnSelected: {
    borderColor: P.ACCENT,
    backgroundColor: P.ACCENT_DIM,
  },
  genderText: {
    fontSize: 10,
    fontWeight: '800',
    color: P.TEXT_MUT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  genderTextSelected: {
    color: P.ACCENT,
  },
  nextBtn: {
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

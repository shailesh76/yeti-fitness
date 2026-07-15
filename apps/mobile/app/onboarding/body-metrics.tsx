import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { useUserStore } from '../../store/useUserStore';
import { P, glowStyle, sharedStyles } from '../../constants/premiumTheme';

export default function BodyMetricsScreen() {
  const router = useRouter();
  const { height_cm, weight_kg, body_fat_percent, updateField } = useUserStore();
  const [focusedField, setFocusedField] = useState<'height' | 'weight' | 'body_fat' | null>(null);

  const handleNext = () => {
    if (!height_cm || !weight_kg) return;
    router.push('/onboarding/goals');
  };

  const isFormValid = height_cm?.trim() && weight_kg?.trim();

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Animated.View 
          entering={SlideInRight.duration(500)} 
          exiting={SlideOutLeft.duration(500)}
          style={styles.container}
        >
          <View style={{ flex: 1 }}>
            {/* Progress Step Indicator (Step 2 of 4) */}
            <View style={styles.stepIndicatorContainer}>
              <View style={styles.stepDot} />
              <View style={[styles.stepDot, styles.stepDotActive]} />
              <View style={styles.stepDot} />
              <View style={styles.stepDot} />
            </View>

            <Text style={styles.title}>Your Body Metrics</Text>
            <Text style={styles.subtitle}>This helps us calculate your macros</Text>

            <View style={styles.rowContainer}>
              <View style={{ flex: 1 }}>
                <Text style={[sharedStyles.labelCaps, styles.inputLabel]}>Height (cm)</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    { textAlign: 'center' },
                    focusedField === 'height' && styles.textInputFocused
                  ]}
                  placeholder="180"
                  placeholderTextColor="#444"
                  keyboardType="numeric"
                  value={height_cm}
                  onChangeText={(val) => updateField('height_cm', val)}
                  onFocus={() => setFocusedField('height')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[sharedStyles.labelCaps, styles.inputLabel]}>Weight (kg)</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    { textAlign: 'center' },
                    focusedField === 'weight' && styles.textInputFocused
                  ]}
                  placeholder="75"
                  placeholderTextColor="#444"
                  keyboardType="numeric"
                  value={weight_kg}
                  onChangeText={(val) => updateField('weight_kg', val)}
                  onFocus={() => setFocusedField('weight')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[sharedStyles.labelCaps, styles.inputLabel]}>Body Fat % (Optional)</Text>
              <TextInput
                style={[
                  styles.textInput,
                  focusedField === 'body_fat' && styles.textInputFocused
                ]}
                placeholder="15"
                placeholderTextColor="#444"
                keyboardType="numeric"
                value={body_fat_percent}
                onChangeText={(val) => updateField('body_fat_percent', val)}
                onFocus={() => setFocusedField('body_fat')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

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
              onPress={handleNext}
              disabled={!isFormValid}
              activeOpacity={0.85}
            >
              <Text style={[
                styles.nextBtnText,
                isFormValid ? styles.nextBtnTextActive : null
              ]}>Next Step</Text>
            </TouchableOpacity>
          </View>
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
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 16,
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

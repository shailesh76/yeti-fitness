import { useRepositories } from '../../hooks/useRepositories';
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
/* removed supabase */
import { useAuthStore } from '../../store/useAuthStore';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { P, glowStyle } from '../../constants/premiumTheme';

const CONSENTS = [
  {
    key: 'testing',
    title: 'Beta Testing Agreement',
    text: 'I understand that Yeti is in beta and may contain bugs, incomplete features, or inaccurate data.',
  },
  {
    key: 'data',
    title: 'Data Collection Consent',
    text: 'I agree to have my workouts, app usage, and crash reports collected to improve the product.',
  },
  {
    key: 'ai',
    title: 'AI Safety Disclaimer',
    text: 'I acknowledge the AI Coach is not a medical professional. I will not seek medical diagnosis or physical therapy from the AI.',
  },
  {
    key: 'privacy',
    title: 'Privacy Policy',
    text: 'I agree to the Yeti Privacy Policy and understand how my data is stored and used.',
  },
];

export default function BetaAgreementScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const userId = session?.user?.id;
  const { userRepository } = useRepositories();

  const [agreed, setAgreed] = useState<Record<string, boolean>>({
    testing: false,
    data: false,
    ai: false,
    privacy: false,
  });
  const [saving, setSaving] = useState(false);

  const allConsented = Object.values(agreed).every(Boolean);

  const toggleConsent = (key: string) => {
    setAgreed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleContinue = async () => {
    if (!allConsented || !userId || saving) return;
    setSaving(true);
    try {
      const consents = [
        { user_id: userId, consent_type: 'BETA_TESTING', consent_version: '1.0', accepted: true, app_version: '1.0' },
        { user_id: userId, consent_type: 'DATA_COLLECTION', consent_version: '1.0', accepted: true, app_version: '1.0' },
        { user_id: userId, consent_type: 'AI_DISCLAIMER', consent_version: '1.0', accepted: true, app_version: '1.0' },
        { user_id: userId, consent_type: 'PRIVACY_POLICY', consent_version: '1.0', accepted: true, app_version: '1.0' },
      ];
      const { error } = await userRepository.saveBetaConsents(consents);
      if (error) {
        // If duplicates, just move on
        if (!error.message.includes('duplicate')) throw error;
      }
      router.replace('/onboarding/basic-info');
    } catch (e: any) {
      alert('Error saving consents: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
          <Text style={styles.logoText}>Yeti.</Text>
          <Text style={styles.title}>Beta Access Agreement</Text>
          <Text style={styles.subtitle}>
            Before you begin your journey, please accept all terms below.
          </Text>
        </Animated.View>

        {CONSENTS.map((consent, index) => (
          <Animated.View
            key={consent.key}
            entering={FadeInDown.duration(400).delay(index * 80)}
            style={[
              styles.consentBlock,
              agreed[consent.key] && styles.consentBlockActive,
            ]}
          >
            <View style={styles.consentHeader}>
              <Text
                style={[
                  styles.consentTitle,
                  agreed[consent.key] && styles.consentTitleActive,
                ]}
              >
                {consent.title}
              </Text>
              <Switch
                value={agreed[consent.key]}
                onValueChange={() => toggleConsent(consent.key)}
                trackColor={{ false: '#333', true: P.ACCENT }}
                thumbColor={agreed[consent.key] ? '#000' : '#888'}
                accessibilityRole="switch"
                accessibilityLabel={consent.title}
              />
            </View>
            <Text style={styles.consentText}>{consent.text}</Text>
          </Animated.View>
        ))}

        <Animated.View
          entering={FadeInDown.duration(400).delay(400)}
          style={styles.footer}
        >
          <TouchableOpacity
            style={[
              styles.button,
              allConsented
                ? [styles.buttonActive, glowStyle(P.ACCENT, 14, 0.4)]
                : styles.buttonDisabled,
            ]}
            disabled={!allConsented || saving}
            onPress={handleContinue}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Accept and continue"
            accessibilityState={{ disabled: !allConsented || saving, busy: saving }}
          >
            {saving ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text
                style={[
                  styles.buttonText,
                  allConsented && styles.buttonTextActive,
                ]}
              >
                Accept & Continue
              </Text>
            )}
          </TouchableOpacity>

          {!allConsented && (
            <Text style={styles.warningText}>
              Accept all agreements to continue
            </Text>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: P.BG,
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 16 : 24,
    paddingBottom: 40,
    maxWidth: 540,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    marginBottom: 32,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '900',
    color: P.ACCENT,
    letterSpacing: -1,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: P.TEXT_PRI,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: P.TEXT_SEC,
    fontWeight: '500',
    lineHeight: 20,
  },
  consentBlock: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  consentBlockActive: {
    borderColor: P.ACCENT,
    backgroundColor: 'rgba(37,99,235,0.05)',
  },
  consentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  consentTitle: {
    color: P.TEXT_SEC,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
    paddingRight: 8,
  },
  consentTitleActive: {
    color: P.ACCENT,
  },
  consentText: {
    color: P.TEXT_MUT,
    fontSize: 13,
    lineHeight: 20,
  },
  footer: {
    marginTop: 8,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  buttonActive: {
    backgroundColor: P.ACCENT,
    borderColor: P.ACCENT,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  buttonTextActive: {
    color: '#000000',
    fontWeight: '900',
  },
  warningText: {
    color: P.TEXT_MUT,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '600',
  },
});

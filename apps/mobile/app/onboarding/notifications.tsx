import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { requestPushPermissions, registerPushToken } from '../../services/pushNotificationService';
import { useAuthStore } from '../../store/useAuthStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { P, glowStyle, sharedStyles } from '../../constants/premiumTheme';

export default function NotificationRationaleScreen() {
  const router = useRouter();
  const session = useAuthStore(state => state.session);
  const { setPreference } = useNotificationStore();
  const [loading, setLoading] = useState(false);

  const handleAllow = async () => {
    setLoading(true);
    const granted = await requestPushPermissions();
    if (granted && session?.user?.id) {
      await registerPushToken(session.user.id);
      await setPreference('workoutReminders', true);
      await setPreference('coachMessages', true);
      await setPreference('challengeUpdates', true);
    }
    setLoading(false);
    router.replace('/home');
  };

  const handleNotNow = async () => {
    await setPreference('workoutReminders', false);
    await setPreference('coachMessages', false);
    await setPreference('challengeUpdates', false);
    router.replace('/home');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Progress Step Indicator (Step 4 of 4) */}
        <View style={styles.stepIndicatorContainer}>
          <View style={styles.stepDot} />
          <View style={styles.stepDot} />
          <View style={styles.stepDot} />
          <View style={[styles.stepDot, styles.stepDotActive]} />
        </View>

        <Animated.View entering={FadeInUp.duration(600).delay(100)} style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="notifications" size={48} color={P.ACCENT} />
          </View>
          <Text style={styles.title}>
            Stay on Track
          </Text>
          <Text style={styles.subtitle}>
            Get reminded when it's workout time, receive messages from your coach, and track your challenge rank changes.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(600).delay(300)} style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.allowBtn, glowStyle(P.ACCENT, 12, 0.45)]}
            onPress={handleAllow}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text style={styles.allowBtnText}>
                Allow Notifications
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={handleNotNow}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.skipBtnText}>
              Not Now
            </Text>
          </TouchableOpacity>
        </Animated.View>

      </View>
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
    justifyContent: 'center',
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'absolute',
    top: Platform.OS === 'ios' ? 16 : 24,
    left: 24,
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
  content: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: P.ACCENT_DIM,
    borderWidth: 1,
    borderColor: P.ACCENT_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: P.TEXT_PRI,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: P.TEXT_SEC,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
  actionContainer: {
    gap: 12,
    width: '100%',
  },
  allowBtn: {
    backgroundColor: P.ACCENT,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allowBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  skipBtn: {
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: P.TEXT_PRI,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

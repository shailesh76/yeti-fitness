import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { P, glowStyle, sharedStyles } from '../constants/premiumTheme';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [focused, setFocused] = useState(false);

  async function handleSendResetLink() {
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const redirectTo = Platform.OS === 'web'
        ? (typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined)
        : Linking.createURL('reset-password');

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (resetError) {
        // Supabase returns a generic "user not found"-shaped error for unknown
        // emails in some configs; avoid confirming/denying account existence.
        setError(resetError.message || 'Could not send reset email. Please try again.');
        return;
      }

      setSent(true);
    } catch (e: any) {
      setError(
        e?.message?.includes('Network')
          ? 'Network error — check your connection and try again.'
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View entering={FadeInDown.duration(600).springify()} style={[sharedStyles.cardGlow, styles.card]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={P.TEXT_SEC} />
        </TouchableOpacity>

        {sent ? (
          <View style={styles.successContainer}>
            <View style={styles.successIconWrap}>
              <Ionicons name="mail-open-outline" size={40} color={P.ACCENT} />
            </View>
            <Text style={styles.title}>Check Your Email</Text>
            <Text style={styles.subtitle}>
              If an account exists for {email.trim()}, we&apos;ve sent a link to reset your password.
              The link expires shortly, so use it soon.
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, glowStyle(P.ACCENT, 12, 0.45)]}
              onPress={() => router.replace('/auth')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Back to log in"
            >
              <Text style={styles.primaryBtnText}>Back to Log In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => setSent(false)}
              accessibilityRole="button"
              accessibilityLabel="Didn't get it? Try again"
            >
              <Text style={styles.linkBtnText}>Didn&apos;t get it? Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Enter the email associated with your account and we&apos;ll send you a link to reset your password.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={[sharedStyles.labelCaps, styles.inputLabel]}>Email</Text>
              <TextInput
                style={[styles.textInput, focused && styles.textInputFocused]}
                onChangeText={(t) => { setEmail(t); if (error) setError(null); }}
                value={email}
                placeholder="email@address.com"
                placeholderTextColor="#444"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                editable={!loading}
              />
            </View>

            {error && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={16} color={P.RED} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                glowStyle(P.ACCENT, 12, 0.45),
                (!email.trim() || loading) && styles.primaryBtnDisabled,
              ]}
              onPress={handleSendResetLink}
              disabled={!email.trim() || loading}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Send reset link"
              accessibilityState={{ disabled: !email.trim() || loading, busy: loading }}
            >
              {loading ? (
                <ActivityIndicator color={P.BG} />
              ) : (
                <Text style={styles.primaryBtnText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => router.replace('/auth')}
              accessibilityRole="button"
              accessibilityLabel="Back to log in"
            >
              <Text style={styles.linkBtnText}>Back to Log In</Text>
            </TouchableOpacity>
          </>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: P.BG,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: 32,
    borderRadius: 30,
    backgroundColor: P.CARD_BG,
  },
  backBtn: {
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: P.TEXT_PRI,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: P.TEXT_SEC,
    lineHeight: 20,
    marginBottom: 28,
  },
  inputContainer: {
    marginBottom: 12,
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
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  errorText: {
    color: P.RED,
    fontSize: 13,
    flex: 1,
  },
  primaryBtn: {
    backgroundColor: P.ACCENT,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  linkBtn: {
    marginTop: 18,
    alignItems: 'center',
  },
  linkBtnText: {
    color: P.TEXT_SEC,
    fontSize: 13,
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
  },
  successIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: P.ACCENT_DIM,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
});

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { parseAuthTokensFromUrl } from '../lib/authTokens';
import { P, glowStyle, sharedStyles } from '../constants/premiumTheme';

const MIN_PASSWORD_LENGTH = 8;

/** Recovery-specific: same token extraction as the OAuth callback, but only
 * accepts it if the URL is tagged type=recovery — a plain login/OAuth
 * callback landing here must never be treated as a password-reset session. */
function parseRecoveryTokens(url: string | null): { access_token: string; refresh_token: string } | null {
  const tokens = parseAuthTokensFromUrl(url);
  if (!tokens || tokens.type !== 'recovery') return null;
  return { access_token: tokens.access_token, refresh_token: tokens.refresh_token };
}

type ScreenState = 'checking' | 'ready' | 'invalid' | 'success';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [state, setState] = useState<ScreenState>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<'password' | 'confirm' | null>(null);

  const establishRecoverySession = useCallback(async (url: string | null) => {
    const tokens = parseRecoveryTokens(url);
    if (!tokens) return false;
    const { error: sessionError } = await supabase.auth.setSession(tokens);
    return !sessionError;
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Web: supabase-js's `detectSessionInUrl` already auto-parses the recovery
    // link and establishes a session before this effect even runs — the
    // PASSWORD_RECOVERY event fires when it does. Native: no such auto-detection,
    // so we manually parse the deep link's URL fragment and set the session.
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && !cancelled) {
        setState('ready');
      }
    });

    async function init() {
      const initialUrl = Platform.OS === 'web'
        ? (typeof window !== 'undefined' ? window.location.href : null)
        : await Linking.getInitialURL();

      // Gate on the URL actually being a recovery link BEFORE trusting any
      // session. Without this, a user with an unrelated, pre-existing logged-in
      // session who lands on this screen by any other means (stale bookmark,
      // typo'd URL) would incorrectly be shown the "set new password" form.
      const isRecoveryLink = !!initialUrl && /type=recovery/.test(initialUrl);
      if (!isRecoveryLink) {
        if (!cancelled) setState('invalid');
        return;
      }

      if (Platform.OS !== 'web') {
        const ok = await establishRecoverySession(initialUrl);
        if (!cancelled) setState(ok ? 'ready' : 'invalid');
      } else {
        // Web: detectSessionInUrl auto-parses this in the background. We've
        // already confirmed the URL is a genuine recovery link above, so it's
        // now safe to just wait for the resulting session.
        setTimeout(async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (!cancelled) setState(session ? 'ready' : 'invalid');
        }, 1200);
      }
    }
    init();

    const linkSub = Linking.addEventListener('url', async ({ url }) => {
      const ok = await establishRecoverySession(url);
      if (!cancelled && ok) setState('ready');
    });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
      linkSub.remove();
    };
  }, [establishRecoverySession]);

  async function handleUpdatePassword() {
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message || 'Could not update password. Please try again.');
        return;
      }
      setState('success');
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
        {state === 'checking' && (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={P.ACCENT} />
            <Text style={styles.subtitle}>Verifying your reset link…</Text>
          </View>
        )}

        {state === 'invalid' && (
          <View style={styles.centerState}>
            <View style={[styles.successIconWrap, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
              <Ionicons name="close-circle-outline" size={40} color={P.RED} />
            </View>
            <Text style={styles.title}>Link Expired or Invalid</Text>
            <Text style={styles.subtitle}>
              This password reset link is no longer valid. Request a new one to continue.
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, glowStyle(P.ACCENT, 12, 0.45)]}
              onPress={() => router.replace('/forgot-password')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Request new link"
            >
              <Text style={styles.primaryBtnText}>Request New Link</Text>
            </TouchableOpacity>
          </View>
        )}

        {state === 'success' && (
          <View style={styles.centerState}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark-circle-outline" size={40} color={P.ACCENT} />
            </View>
            <Text style={styles.title}>Password Updated</Text>
            <Text style={styles.subtitle}>Your password has been changed successfully.</Text>
            <TouchableOpacity
              style={[styles.primaryBtn, glowStyle(P.ACCENT, 12, 0.45)]}
              onPress={() => router.replace('/home')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Continue to Yeti"
            >
              <Text style={styles.primaryBtnText}>Continue to Yeti</Text>
            </TouchableOpacity>
          </View>
        )}

        {state === 'ready' && (
          <>
            <Text style={styles.title}>Set New Password</Text>
            <Text style={styles.subtitle}>Choose a new password for your account.</Text>

            <View style={styles.inputContainer}>
              <Text style={[sharedStyles.labelCaps, styles.inputLabel]}>New Password</Text>
              <TextInput
                style={[styles.textInput, focusedField === 'password' && styles.textInputFocused]}
                onChangeText={(t) => { setPassword(t); if (error) setError(null); }}
                value={password}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor="#444"
                autoCapitalize="none"
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[sharedStyles.labelCaps, styles.inputLabel]}>Confirm Password</Text>
              <TextInput
                style={[styles.textInput, focusedField === 'confirm' && styles.textInputFocused]}
                onChangeText={(t) => { setConfirmPassword(t); if (error) setError(null); }}
                value={confirmPassword}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor="#444"
                autoCapitalize="none"
                onFocus={() => setFocusedField('confirm')}
                onBlur={() => setFocusedField(null)}
                editable={!loading}
                onSubmitEditing={handleUpdatePassword}
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
                (!password || !confirmPassword || loading) && styles.primaryBtnDisabled,
              ]}
              onPress={handleUpdatePassword}
              disabled={!password || !confirmPassword || loading}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Update password"
              accessibilityState={{ disabled: !password || !confirmPassword || loading, busy: loading }}
            >
              {loading ? <ActivityIndicator color={P.BG} /> : <Text style={styles.primaryBtnText}>Update Password</Text>}
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
  centerState: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: P.TEXT_PRI,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: P.TEXT_SEC,
    lineHeight: 20,
    marginBottom: 28,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
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
    width: '100%',
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

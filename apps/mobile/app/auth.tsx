import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useRepositories } from '../hooks/useRepositories';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { P, glowStyle, sharedStyles } from '../constants/premiumTheme';
import { EVENTS } from '../constants/analyticsEvents';
import { decidePostLoginRoute } from '@yeti/database';

// Required so openAuthSessionAsync's underlying browser session correctly
// dismisses and returns control to the app once Google redirects back.
WebBrowser.maybeCompleteAuthSession();

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isNetworkError(e: any): boolean {
  const msg = String(e?.message ?? e ?? '');
  return /network|fetch|failed to fetch|connection/i.test(msg);
}

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [profileCheckUserId, setProfileCheckUserId] = useState<string | null>(null);
  const [profileCheckRetrying, setProfileCheckRetrying] = useState(false);
  const router = useRouter();
  const { userRepository, eventRepository } = useRepositories();

  // Alert.alert is a no-op on web — use window.alert as fallback. Reserved for
  // one-off confirmations (e.g. signup verification prompt); everyday form
  // errors are shown inline below instead, so a slow/offline network doesn't
  // leave the user staring at a blocking dialog they have to dismiss.
  function showAlert(title: string, message: string) {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  }

  function describeAuthError(e: any): string {
    if (isNetworkError(e)) return 'Network error — check your connection and try again.';
    const msg = e?.message || 'Something went wrong. Please try again.';
    return msg;
  }

  async function handleResendVerification() {
    if (!unconfirmedEmail || resending) return;
    setResending(true);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: unconfirmedEmail,
      });
      if (resendError) {
        setError(resendError.message);
      } else {
        setError(null);
        showAlert('Verification Email Sent', `Check ${unconfirmedEmail} for a new verification link.`);
      }
    } catch (e: any) {
      setError(describeAuthError(e));
    } finally {
      setResending(false);
    }
  }

  /**
   * Shared post-login routing decision (also used by oauth-callback.tsx via
   * decidePostLoginRoute) so email and Google sign-in never drift: a failed
   * profile lookup must show a retryable error, never a silent onboarding
   * redirect for an existing user.
   */
  async function resolvePostLogin(userId: string) {
    const result = await userRepository.fetchProfileRemote(userId);
    const decision = decidePostLoginRoute(result);

    if (decision.outcome === 'home') {
      setProfileCheckUserId(null);
      router.replace('/home');
    } else if (decision.outcome === 'onboarding') {
      setProfileCheckUserId(null);
      router.replace('/onboarding/BetaAgreementScreen');
    } else {
      eventRepository.logError(userId, 'PostLoginProfileCheck', decision.code).catch(() => {});
      setProfileCheckUserId(userId);
      setError('We couldn’t verify your profile. Please try again.');
    }
  }

  async function handleRetryProfileCheck() {
    if (!profileCheckUserId || profileCheckRetrying) return;
    setProfileCheckRetrying(true);
    setError(null);
    try {
      await resolvePostLogin(profileCheckUserId);
    } catch (e: any) {
      setError(describeAuthError(e));
    } finally {
      setProfileCheckRetrying(false);
    }
  }

  async function handleSignOutFromProfileCheck() {
    setProfileCheckUserId(null);
    setError(null);
    await supabase.auth.signOut();
  }

  async function signInWithEmail() {
    setError(null);
    setUnconfirmedEmail(null);

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) {
        if (/email not confirmed/i.test(signInError.message)) {
          setError('Please verify your email before logging in.');
          setUnconfirmedEmail(email.trim());
        } else {
          setError(signInError.message);
        }
        // Auth failures happen before we have a user id (login didn't
        // succeed), but are still worth capturing for the admin diagnostics
        // page — same system_errors table sync failures and crashes use.
        // Never log the password, only the email and Supabase's own message.
        supabase.from('system_errors').insert({
          user_id: null,
          error_type: 'AUTH_ERROR',
          message: `Login failed for ${email.trim()}: ${signInError.message}`,
          platform: Platform.OS,
          app_version: '1.0.0-beta',
        }).then(({ error: dbErr }) => {
          if (dbErr) console.error('[Auth] Failed to log auth failure:', dbErr);
        });
        return;
      }

      if (data?.user) {
        // Log login completed event
        await eventRepository.logActivity(data.user.id, EVENTS.LOGIN_COMPLETED);

        // Check if user has completed onboarding profile, and route accordingly
        // (a failed lookup shows a retryable error, not a false onboarding redirect).
        await resolvePostLogin(data.user.id);
      }
    } catch (e: any) {
      setError(describeAuthError(e));
    } finally {
      setLoading(false);
    }
  }

  async function signUpWithEmail() {
    setError(null);
    setUnconfirmedEmail(null);

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const redirectTo = Platform.OS === 'web'
        ? (typeof window !== 'undefined' ? window.location.origin : 'https://dist-seven-beta-74.vercel.app')
        : undefined;
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
      });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data?.user) {
        await eventRepository.logActivity(data.user.id, EVENTS.SIGNUP_COMPLETED);
      }
      // If email confirmation is disabled, session is returned immediately
      if (data?.session) {
        router.replace('/onboarding/BetaAgreementScreen');
      } else {
        showAlert(
          'Signup Successful',
          'Please check your email to verify your account before logging in.',
        );
      }
    } catch (e: any) {
      setError(describeAuthError(e));
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setError(null);
    setUnconfirmedEmail(null);
    setLoading(true);
    try {
      const redirectTo = Platform.OS === 'web'
        ? (typeof window !== 'undefined' ? `${window.location.origin}/oauth-callback` : undefined)
        : Linking.createURL('oauth-callback');

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });

      if (oauthError || !data?.url) {
        setError(oauthError?.message || 'Could not start Google sign-in.');
        setLoading(false);
        return;
      }

      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') window.location.href = data.url;
        return; // page is navigating away
      }

      // Native: open the consent screen. oauth-callback.tsx's own deep-link
      // handling owns establishing the session once Google redirects back —
      // identical mechanism to the password-reset deep link.
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success') {
        // User cancelled/dismissed the browser — not an error.
        setLoading(false);
      }
    } catch (e: any) {
      setError(describeAuthError(e));
      setLoading(false);
    }
  }

  const isFormValid = email.trim().length > 0 && password.trim().length > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View 
        entering={FadeInDown.duration(800).springify()}
        style={[sharedStyles.cardGlow, styles.card]}
      >
        <View style={styles.header}>
          <Text style={styles.logoText}>Yeti.</Text>
          <Text style={styles.subtitleText}>Level Up Your Tonnage</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={[sharedStyles.labelCaps, styles.inputLabel]}>Email</Text>
          <TextInput
            style={[
              styles.textInput,
              focusedField === 'email' && styles.textInputFocused
            ]}
            onChangeText={(text) => { setEmail(text); if (error) setError(null); }}
            value={email}
            placeholder="email@address.com"
            placeholderTextColor="#444"
            autoCapitalize="none"
            keyboardType="email-address"
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[sharedStyles.labelCaps, styles.inputLabel]}>Password</Text>
          <TextInput
            style={[
              styles.textInput,
              focusedField === 'password' && styles.textInputFocused
            ]}
            onChangeText={(text) => { setPassword(text); if (error) setError(null); }}
            value={password}
            secureTextEntry={true}
            placeholder="••••••••"
            placeholderTextColor="#444"
            autoCapitalize="none"
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
            onSubmitEditing={signInWithEmail}
          />
        </View>

        <TouchableOpacity
          style={styles.forgotPasswordBtn}
          onPress={() => router.push('/forgot-password')}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Forgot password?"
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

        {error && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle" size={16} color={P.RED} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {unconfirmedEmail && (
          <TouchableOpacity
            style={styles.resendBtn}
            onPress={handleResendVerification}
            disabled={resending}
            accessibilityRole="button"
            accessibilityLabel="Resend verification email"
            accessibilityState={{ disabled: resending, busy: resending }}
          >
            {resending ? (
              <ActivityIndicator size="small" color={P.ACCENT} />
            ) : (
              <Text style={styles.resendBtnText}>Resend Verification Email</Text>
            )}
          </TouchableOpacity>
        )}

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={P.ACCENT} />
          </View>
        ) : profileCheckUserId ? (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.loginBtn, glowStyle(P.ACCENT, 12, 0.45)]}
              onPress={handleRetryProfileCheck}
              disabled={profileCheckRetrying}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Retry"
              accessibilityState={{ disabled: profileCheckRetrying, busy: profileCheckRetrying }}
            >
              {profileCheckRetrying ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Text style={styles.loginBtnText}>Retry</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signUpBtn}
              onPress={handleSignOutFromProfileCheck}
              disabled={profileCheckRetrying}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
            >
              <Text style={styles.signUpBtnText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.loginBtn, glowStyle(P.ACCENT, 12, 0.45)]}
              onPress={signInWithEmail}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Log in"
            >
              <Text style={styles.loginBtnText}>Log In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signUpBtn}
              onPress={signUpWithEmail}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Sign up"
            >
              <Text style={styles.signUpBtnText}>Sign Up</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.googleBtn}
              onPress={signInWithGoogle}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
            >
              <Ionicons name="logo-google" size={18} color={P.TEXT_PRI} />
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>
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
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  logoText: {
    fontSize: 54,
    fontWeight: '900',
    color: P.ACCENT,
    letterSpacing: -2,
  },
  subtitleText: {
    color: P.TEXT_SEC,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 6,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    marginBottom: 8,
    marginLeft: 4,
    color: P.TEXT_SEC,
  },
  forgotPasswordBtn: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  forgotPasswordText: {
    color: P.ACCENT,
    fontSize: 12,
    fontWeight: '700',
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
  resendBtn: {
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  resendBtnText: {
    color: P.ACCENT,
    fontSize: 13,
    fontWeight: '700',
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
  loaderContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  actionContainer: {
    marginTop: 8,
    gap: 12,
  },
  loginBtn: {
    backgroundColor: P.ACCENT,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  signUpBtn: {
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signUpBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: P.TEXT_PRI,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: P.CARD_BORDER,
  },
  dividerText: {
    color: P.TEXT_MUT,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    borderRadius: 14,
    paddingVertical: 14,
  },
  googleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: P.TEXT_PRI,
  },
});

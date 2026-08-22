import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { parseAuthTokensFromUrl } from '../lib/authTokens';
import { useRepositories } from '../hooks/useRepositories';
import { EVENTS } from '../constants/analyticsEvents';
import { P, glowStyle, sharedStyles } from '../constants/premiumTheme';
import { decidePostLoginRoute, POST_LOGIN_PROFILE_COLUMNS } from '@yeti/database';
import { beginAuthenticatedHydration } from '../services/authenticatedHydration';

/**
 * Lands here after a Google (or future Apple) OAuth redirect. Owns the entire
 * post-OAuth flow for both platforms:
 *  - Web: supabase-js's detectSessionInUrl already parses the URL and
 *    establishes the session before this screen finishes mounting.
 *  - Native: no auto-detection, so the deep link's URL fragment is parsed
 *    manually and the session is set explicitly — same mechanism as
 *    reset-password.tsx's recovery-link handling.
 * Once a session exists, this reuses the exact same "route to /home if a
 * profile exists, else onboarding" decision as email/password sign-in, so
 * OAuth and email users go through identical post-login routing.
 */
export default function OAuthCallbackScreen() {
  const router = useRouter();
  const { userRepository, eventRepository } = useRepositories();
  const [status, setStatus] = useState<'working' | 'error' | 'profile-check-failed'>('working');
  const [error, setError] = useState<string | null>(null);
  const [profileCheckUserId, setProfileCheckUserId] = useState<string | null>(null);
  const [profileCheckRetrying, setProfileCheckRetrying] = useState(false);

  // Shared with auth.tsx via decidePostLoginRoute so email and Google sign-in
  // never drift: a failed profile lookup shows a retryable error, never a
  // silent onboarding redirect for an existing user. Also used by the Retry
  // button below, so it's defined outside the mount-only effect.
  async function resolvePostLogin(userId: string, authUser?: any, opts: { skipIfUnmounted?: () => boolean } = {}) {
    void beginAuthenticatedHydration(userId, authUser);
    const result = await userRepository.fetchProfileRemote(userId, POST_LOGIN_PROFILE_COLUMNS);
    if (opts.skipIfUnmounted?.()) return;
    const decision = decidePostLoginRoute(result);

    if (decision.outcome === 'home') {
      router.replace('/home');
    } else if (decision.outcome === 'onboarding') {
      router.replace('/onboarding/BetaAgreementScreen');
    } else {
      eventRepository.logError(userId, 'PostLoginProfileCheck', decision.code).catch(() => {});
      setProfileCheckUserId(userId);
      setStatus('profile-check-failed');
    }
  }

  async function handleRetryProfileCheck() {
    if (!profileCheckUserId || profileCheckRetrying) return;
    setProfileCheckRetrying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await resolvePostLogin(profileCheckUserId, user);
    } finally {
      setProfileCheckRetrying(false);
    }
  }

  async function handleSignOutFromProfileCheck() {
    setProfileCheckUserId(null);
    await supabase.auth.signOut();
    router.replace('/auth');
  }

  useEffect(() => {
    let cancelled = false;

    async function routeAfterAuth(userId: string) {
      await eventRepository.logActivity(userId, EVENTS.LOGIN_COMPLETED);
      const { data: { user } } = await supabase.auth.getUser();
      await resolvePostLogin(userId, user, { skipIfUnmounted: () => cancelled });
    }

    async function finish(url: string | null) {
      if (Platform.OS !== 'web') {
        const tokens = parseAuthTokensFromUrl(url);
        if (tokens) {
          const { error: sessionError } = await supabase.auth.setSession(tokens);
          if (sessionError) {
            if (!cancelled) { setError(sessionError.message); setStatus('error'); }
            return;
          }
        }
      }

      // Web already has the session via detectSessionInUrl; native has it via
      // the manual setSession above. Either way, confirm it actually landed.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        if (!cancelled) {
          setError('Could not complete sign-in. Please try again.');
          setStatus('error');
        }
        return;
      }

      await routeAfterAuth(session.user.id);
    }

    async function init() {
      const url = Platform.OS === 'web'
        ? (typeof window !== 'undefined' ? window.location.href : null)
        : await Linking.getInitialURL();

      // Give web's detectSessionInUrl a brief window to finish parsing.
      if (Platform.OS === 'web') {
        setTimeout(() => finish(url), 800);
      } else {
        finish(url);
      }
    }
    init();

    const linkSub = Linking.addEventListener('url', ({ url }) => finish(url));

    return () => {
      cancelled = true;
      linkSub.remove();
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[sharedStyles.cardGlow, styles.card]}>
        {status === 'working' ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={P.ACCENT} />
            <Text style={styles.subtitle}>Finishing sign-in…</Text>
          </View>
        ) : status === 'profile-check-failed' ? (
          <View style={styles.centerState}>
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
              <Ionicons name="alert-circle-outline" size={40} color={P.RED} />
            </View>
            <Text style={styles.title}>Couldn’t Verify Profile</Text>
            <Text style={styles.subtitle}>We couldn’t verify your profile. Please try again.</Text>
            <TouchableOpacity
              style={[styles.primaryBtn, glowStyle(P.ACCENT, 12, 0.45)]}
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
                <Text style={styles.primaryBtnText}>Retry</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={handleSignOutFromProfileCheck}
              disabled={profileCheckRetrying}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
            >
              <Text style={styles.secondaryBtnText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.centerState}>
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
              <Ionicons name="close-circle-outline" size={40} color={P.RED} />
            </View>
            <Text style={styles.title}>Sign-In Failed</Text>
            <Text style={styles.subtitle}>{error}</Text>
            <TouchableOpacity
              style={[styles.primaryBtn, glowStyle(P.ACCENT, 12, 0.45)]}
              onPress={() => router.replace('/auth')}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Back to Log In</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
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
    marginTop: 16,
    marginBottom: 28,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: P.ACCENT,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  secondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 12,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: P.TEXT_PRI,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

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
  const [status, setStatus] = useState<'working' | 'error'>('working');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function routeAfterAuth(userId: string) {
      await eventRepository.logActivity(userId, EVENTS.LOGIN_COMPLETED);
      const { data: profile } = await userRepository.fetchProfileRemote(userId);
      if (cancelled) return;
      router.replace(profile ? '/home' : '/onboarding/BetaAgreementScreen');
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
});

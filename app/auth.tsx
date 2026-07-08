import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { P, glowStyle, sharedStyles } from '../constants/premiumTheme';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const router = useRouter();

  // Alert.alert is a no-op on web — use window.alert as fallback
  function showAlert(title: string, message: string) {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  }

  async function signInWithEmail() {
    if (!email.trim() || !password.trim()) {
      showAlert('Validation Error', 'Please enter both email and password.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      showAlert('Error', error.message);
      setLoading(false);
      return;
    }

    if (data?.user) {
      // Check if user has completed onboarding profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profile) {
        router.replace('/home');
      } else {
        router.replace('/onboarding/basic-info');
      }
    }
    setLoading(false);
  }

  async function signUpWithEmail() {
    if (!email.trim() || !password.trim()) {
      showAlert('Validation Error', 'Please enter both email and password.');
      return;
    }
    setLoading(true);
    const redirectTo = Platform.OS === 'web'
      ? (typeof window !== 'undefined' ? window.location.origin : 'https://dist-seven-beta-74.vercel.app')
      : undefined;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
    });
    if (error) {
      showAlert('Error', error.message);
    } else {
      // If email confirmation is disabled, session is returned immediately
      if (data?.session) {
        router.replace('/onboarding/basic-info');
      } else {
        showAlert(
          'Signup Successful',
          'Please check your email to verify your account before logging in.',
        );
      }
    }
    setLoading(false);
  }

  const isFormValid = email.trim().length > 0 && password.trim().length > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View 
        entering={FadeInDown.duration(800).springify()}
        style={[sharedStyles.cardGlow, styles.card]}
      >
        <View style={styles.header}>
          <Text style={styles.logoText}>Dude.</Text>
          <Text style={styles.subtitleText}>Level Up Your Tonnage</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={[sharedStyles.labelCaps, styles.inputLabel]}>Email</Text>
          <TextInput
            style={[
              styles.textInput,
              focusedField === 'email' && styles.textInputFocused
            ]}
            onChangeText={(text) => setEmail(text)}
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
            onChangeText={(text) => setPassword(text)}
            value={password}
            secureTextEntry={true}
            placeholder="••••••••"
            placeholderTextColor="#444"
            autoCapitalize="none"
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
          />
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={P.ACCENT} />
          </View>
        ) : (
          <View style={styles.actionContainer}>
            <TouchableOpacity 
              style={[styles.loginBtn, glowStyle(P.ACCENT, 12, 0.45)]}
              onPress={signInWithEmail}
              activeOpacity={0.85}
            >
              <Text style={styles.loginBtnText}>Log In</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.signUpBtn}
              onPress={signUpWithEmail}
              activeOpacity={0.85}
            >
              <Text style={styles.signUpBtnText}>Sign Up</Text>
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
});

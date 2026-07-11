import '../global.css';
import { Stack } from 'expo-router';
import React, { useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { StatusBar } from 'expo-status-bar';
import { View, Text, TouchableOpacity } from 'react-native';

import { registerPushToken, scheduleWorkoutReminder } from '../services/pushNotificationService';
import { useNotificationStore } from '../store/useNotificationStore';
import { P } from '../constants/premiumTheme';
import { useOfflineSyncStore } from '../store/useOfflineSyncStore';

// Error Boundary Component to prevent app crashes
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught rendering exception:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#131313', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#ffb4ab', textAlign: 'center', letterSpacing: -0.5 }}>
            Oops, something went wrong
          </Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 8, marginBottom: 28, maxWidth: 280, lineHeight: 18 }}>
            An unexpected error occurred in the application layer. Let's reload the active view.
          </Text>
          <TouchableOpacity 
            onPress={this.handleReset}
            activeOpacity={0.8}
            style={{ 
              backgroundColor: P.ACCENT, 
              paddingHorizontal: 28, 
              paddingVertical: 14, 
              borderRadius: 16,
              shadowColor: P.ACCENT,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12
            }}
          >
            <Text style={{ color: '#000000', fontWeight: '900', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 }}>
              Reload Screen
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function RootLayout() {
  const setSession = useAuthStore((state) => state.setSession);

  useEffect(() => {
    useOfflineSyncStore.getState().initNetworkListener();
    useNotificationStore.getState().loadPreferences();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.id) {
        registerPushToken(session.user.id);
        const prefs = useNotificationStore.getState();
        if (prefs.workoutReminders) {
          scheduleWorkoutReminder('daily', 8, 0);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.id) {
        registerPushToken(session.user.id);
        const prefs = useNotificationStore.getState();
        if (prefs.workoutReminders) {
          scheduleWorkoutReminder('daily', 8, 0);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <ErrorBoundary>
      <View className="flex-1 bg-background">
        <StatusBar style="light" />
        <Stack screenOptions={{ 
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#131313' }
        }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="home" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="analytics" />
          <Stack.Screen name="exercises/index" />
          <Stack.Screen name="challenges/index" />
          <Stack.Screen name="challenges/[id]" />
        </Stack>
      </View>
    </ErrorBoundary>
  );
}

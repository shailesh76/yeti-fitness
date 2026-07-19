import '../global.css';
import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { StatusBar } from 'expo-status-bar';
import { View, Text, TouchableOpacity, Platform } from 'react-native';

import { registerPushToken, scheduleWorkoutReminder } from '../services/pushNotificationService';
import { useNotificationStore } from '../store/useNotificationStore';

import { useSessionStore } from '../store/useSessionStore';
import { P } from '../constants/premiumTheme';


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
    
    // Log crash to central system_errors table asynchronously
    const userId = useAuthStore.getState().session?.user?.id || null;
    const logErrorAsync = async () => {
      try {
        const { error: dbErr } = await supabase
          .from('system_errors')
          .insert({
            user_id: userId,
            error_type: 'COMPONENT_CRASH',
            message: error?.message || String(error),
            stack_trace: error?.stack || errorInfo?.componentStack || null,
            platform: Platform.OS,
            app_version: '1.0.0-beta'
          });
        if (dbErr) {
          console.error("Failed to write to system_errors table:", dbErr);
        }
      } catch (err: any) {
        console.error("Error inserting system error:", err);
      }
    };

    logErrorAsync();
  }

  private handleReset = () => {
    this.setState({ hasError: false });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#0a0d0a', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: '#ff3b30', fontSize: 18, fontWeight: '900', textTransform: 'uppercase', marginBottom: 12 }}>Application Error</Text>
          <Text style={{ color: '#8e8e93', fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>An unexpected error occurred. Please try restarting the app.</Text>
          <TouchableOpacity onPress={this.handleReset} style={{ backgroundColor: P.ACCENT, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}>
            <Text style={{ color: '#000', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 13 }}>Reload App</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

// Routes reachable while signed out. Any other route needs a redirect to
// /auth when the session expires or is revoked mid-use — protected screens
// otherwise have no way of noticing and just keep rendering with a dead session.
const PUBLIC_ROUTE_ROOTS = new Set(['auth', 'onboarding', 'forgot-password', 'reset-password']);

export default function RootLayout() {
  const setSession = useAuthStore((state) => state.setSession);
  const router = useRouter();
  const segments = useSegments();
  const segmentsRef = useRef(segments);

  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  useEffect(() => {
    // Resume any in-progress workout session from previous app session
    useSessionStore.getState().resumeSession();

    /* migrated initNetworkListener */
    useNotificationStore.getState().loadPreferences();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session as any);
      if (session?.user?.id) {
        registerPushToken(session.user.id);
        const prefs = useNotificationStore.getState();
        if (prefs.workoutReminders) {
          scheduleWorkoutReminder('daily', 8, 0);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session as any);
      if (session?.user?.id) {
        registerPushToken(session.user.id);
        const prefs = useNotificationStore.getState();
        if (prefs.workoutReminders) {
          scheduleWorkoutReminder('daily', 8, 0);
        }
      } else {
        // Session expired / revoked / signed out. Redirect off protected
        // screens rather than leaving them rendering with a dead session.
        const currentRoot = segmentsRef.current[0];
        if (currentRoot && !PUBLIC_ROUTE_ROOTS.has(currentRoot)) {
          router.replace('/auth');
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

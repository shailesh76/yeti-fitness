import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { P, glowStyle, sharedStyles } from '../constants/premiumTheme';

interface AppShellProps {
  activeTab: 'home' | 'workout' | 'nutrition' | 'progress' | 'coach' | 'more';
  children: React.ReactNode;
}

const tabs = [
  { id: 'home',      label: 'Home',      path: '/home' },
  { id: 'workout',   label: 'Workout',   path: '/workouts' },
  { id: 'nutrition', label: 'Nutrition', path: '/food-diary' },
  { id: 'progress',  label: 'Progress',  path: '/analytics' },
  { id: 'coach',     label: 'Coach',     path: '/coach' },
] as const;

export default function AppShell({ activeTab, children }: AppShellProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const up   = () => setIsOffline(false);
      const down = () => setIsOffline(true);
      setIsOffline(!navigator.onLine);
      window.addEventListener('online',  up);
      window.addEventListener('offline', down);
      return () => { window.removeEventListener('online',  up); window.removeEventListener('offline', down); };
    } else {
      const check = async () => {
        try {
          const ctrl = new AbortController();
          const tid  = setTimeout(() => ctrl.abort(), 3000);
          const res  = await fetch('https://drkurkhsmjuixccdblrl.supabase.co/rest/v1/', { method: 'HEAD', signal: ctrl.signal });
          clearTimeout(tid);
          setIsOffline(!res.ok);
        } catch { setIsOffline(true); }
      };
      check();
      const iv = setInterval(check, 5000);
      return () => clearInterval(iv);
    }
  }, []);

  const getTabIcon = (id: string, isFocused: boolean) => {
    switch (id) {
      case 'home':
        return isFocused ? 'home' : 'home-outline';
      case 'workout':
        return isFocused ? 'barbell' : 'barbell-outline';
      case 'nutrition':
        return isFocused ? 'restaurant' : 'restaurant-outline';
      case 'progress':
        return isFocused ? 'analytics' : 'analytics-outline';
      case 'coach':
        return isFocused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline';
      case 'more':
        return isFocused ? 'person' : 'person-outline';
      default:
        return 'ellipse-outline';
    }
  };

  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 12);

  return (
    <View style={{ flex: 1, backgroundColor: P.BG }}>
      {/* Offline banner */}
      {isOffline && (
        <View style={{ backgroundColor: P.RED, paddingVertical: 8, alignItems: 'center', zIndex: 100 }}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 }}>
            ⚠️  No connection — changes queued
          </Text>
        </View>
      )}

      {/* Subtle radial glow behind content */}
      {Platform.OS === 'web' && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: `radial-gradient(ellipse 80% 40% at 50% 0%, ${P.ACCENT_GLOW} 0%, transparent 70%)`,
        } as any} />
      )}

      <View style={{ flex: 1, zIndex: 1 }}>{children}</View>

      {/* ── Glassmorphic Bottom Tab Bar ── */}
      <View style={styles.tabBarContainer}>
        <BlurView 
          intensity={40} 
          tint="dark" 
          style={styles.tabBarBlur}
        >
          <View style={[styles.tabBarInner, { paddingBottom: bottomPadding }]}>
            {tabs.map((tab) => {
              const isFocused = activeTab === tab.id;
              const iconName = getTabIcon(tab.id, isFocused);
              
              return (
                <View key={tab.id} style={styles.tabItem}>
                  <TouchableOpacity
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`${tab.label} tab`}
                    onPress={() => router.replace(tab.path)}
                    activeOpacity={0.7}
                    style={[
                      styles.iconContainer,
                      isFocused && styles.iconContainerActive,
                    ]}
                  >
                    <Ionicons
                      name={iconName as any}
                      size={22}
                      color={isFocused ? P.ACCENT : P.TEXT_MUT}
                    />
                  </TouchableOpacity>
                  <View style={styles.labelContainer}>
                    <View style={[
                      styles.indicator,
                      isFocused && styles.indicatorActive,
                    ]} />
                  </View>
                </View>
              );
            })}
          </View>
        </BlurView>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  tabBarBlur: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  tabBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12, // Safe area for iPhone
    backgroundColor: 'rgba(10, 13, 10, 0.75)',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerActive: {
    backgroundColor: P.ACCENT_DIM,
  },
  labelContainer: {
    marginTop: 4,
    alignItems: 'center',
  },
  indicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  indicatorActive: {
    backgroundColor: P.ACCENT,
    width: 20,
    height: 4,
    borderRadius: 2,
  },
});

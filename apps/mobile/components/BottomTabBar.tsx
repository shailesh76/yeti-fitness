import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { P, glowStyle, sharedStyles } from '../constants/premiumTheme';

interface BottomTabBarProps {
  activeTab: 'logger' | 'nutrition' | 'analytics' | 'library' | 'profile';
}

const tabs = [
  { id: 'logger',    label: 'Logger',    path: '/home' },
  { id: 'nutrition', label: 'Calories',  path: '/food-diary' },
  { id: 'analytics', label: 'Analytics', path: '/analytics' },
  { id: 'library',   label: 'Library',   path: '/workouts' },
  { id: 'profile',   label: 'Profile',   path: '/profile' },
] as const;

export default function BottomTabBar({ activeTab }: BottomTabBarProps) {
  const router = useRouter();

  const getTabIcon = (id: string, isFocused: boolean) => {
    switch (id) {
      case 'logger':
        return isFocused ? 'home' : 'home-outline';
      case 'nutrition':
        return isFocused ? 'nutrition' : 'nutrition-outline';
      case 'analytics':
        return isFocused ? 'analytics' : 'analytics-outline';
      case 'library':
        return isFocused ? 'barbell' : 'barbell-outline';
      case 'profile':
        return isFocused ? 'person' : 'person-outline';
      default:
        return 'ellipse-outline';
    }
  };

  return (
    <View style={styles.tabBarContainer}>
      <BlurView 
        intensity={40} 
        tint="dark" 
        style={styles.tabBarBlur}
      >
        <View style={styles.tabBarInner}>
          {tabs.map((tab) => {
            const isFocused = activeTab === tab.id;
            const iconName = getTabIcon(tab.id, isFocused);

            return (
              <View key={tab.id} style={styles.tabItem}>
                <TouchableOpacity
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

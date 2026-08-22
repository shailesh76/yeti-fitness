import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { P } from '../constants/premiumTheme';

interface BottomTabBarProps {
  activeTab: 'logger' | 'nutrition' | 'analytics' | 'library' | 'profile';
}

const tabs = [
  { id: 'logger',    label: 'Home',      path: '/home' },
  { id: 'library',   label: 'Workouts',  path: '/workouts' },
  { id: 'nutrition', label: 'Nutrition', path: '/food-diary' },
  { id: 'analytics', label: 'Progress',  path: '/analytics' },
  { id: 'profile',   label: 'Profile',   path: '/profile' },
] as const;

export default function BottomTabBar({ activeTab }: BottomTabBarProps) {
  const router = useRouter();

  const getTabIcon = (id: string, isFocused: boolean) => {
    switch (id) {
      case 'logger':
        return isFocused ? 'home' : 'home-outline';
      case 'library':
        return isFocused ? 'barbell' : 'barbell-outline';
      case 'nutrition':
        return 'nutrition';
      case 'analytics':
        return isFocused ? 'stats-chart' : 'stats-chart-outline';
      case 'profile':
        return isFocused ? 'person' : 'person-outline';
      default:
        return 'ellipse-outline';
    }
  };

  return (
    <View style={styles.tabBarContainer}>
      <BlurView intensity={50} tint="dark" style={styles.tabBarBlur}>
        <View style={styles.tabBarInner}>
          {tabs.map((tab) => {
            const isFocused = activeTab === tab.id;
            const iconName = getTabIcon(tab.id, isFocused);

            return (
              <TouchableOpacity
                key={tab.id}
                // `replace` removed the previous tab from the stack, forcing a
                // remount and replaying all mount/focus data effects on return.
                // navigate reuses an existing tab route when possible and keeps
                // its rendered state alive like a conventional tab navigator.
                onPress={() => router.navigate(tab.path)}
                activeOpacity={0.7}
                style={styles.tabItem}
              >
                <View
                  style={[
                    styles.iconBox,
                    isFocused && tab.id === 'nutrition' && styles.iconBoxNutritionActive,
                    isFocused && tab.id !== 'nutrition' && styles.iconBoxGenericActive,
                  ]}
                >
                  <Ionicons
                    name={iconName as any}
                    size={22}
                    color={isFocused ? (tab.id === 'nutrition' ? '#38BDF8' : '#3B82F6') : '#64748B'}
                  />
                </View>
                <Text
                  style={[
                    styles.tabLabel,
                    isFocused && (tab.id === 'nutrition' ? styles.tabLabelNutritionActive : styles.tabLabelActive),
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
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
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    backgroundColor: 'rgba(9, 11, 16, 0.92)',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconBox: {
    width: 42,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  iconBoxNutritionActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  iconBoxGenericActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748B',
  },
  tabLabelActive: {
    color: '#3B82F6',
    fontWeight: '700',
  },
  tabLabelNutritionActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
});

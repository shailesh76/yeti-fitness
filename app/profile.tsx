import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform, Switch, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';
import Animated, { FadeIn } from 'react-native-reanimated';
import AppShell from '../components/AppShell';
import { requestWearablePermissions } from '../services/wearableService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNotificationStore } from '../store/useNotificationStore';
import { P, glowStyle, sharedStyles } from '../constants/premiumTheme';

const GOALS = [
  { id: 'BUILD_MUSCLE', label: 'Build Muscle', desc: 'High calorie & protein surplus' },
  { id: 'LOSE_FAT', label: 'Lose Fat', desc: 'Calorie deficit with high protein' },
  { id: 'MAINTAIN', label: 'Maintain', desc: 'Balanced fuel for consistency' },
] as const;

export default function MoreScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const setSession = useAuthStore((state) => state.setSession);
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [wearablesConnected, setWearablesConnected] = useState(false);

  const notifStore = useNotificationStore();

  useEffect(() => {
    notifStore.loadPreferences();
    if (session?.user?.id) {
      fetchProfile();
      checkWearables();
    } else {
      setLoading(false);
    }
  }, [session]);

  const checkWearables = async () => {
    try {
      const val = await AsyncStorage.getItem('wearables_connected');
      setWearablesConnected(val === 'true');
    } catch (e) {
      console.warn("AsyncStorage check failed:", e);
    }
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session?.user?.id)
        .single();
      if (data) setProfile(data);
      if (error) throw error;
    } catch (e) {
      console.warn("Could not fetch user profile:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGoal = async (goal: 'BUILD_MUSCLE' | 'LOSE_FAT' | 'MAINTAIN') => {
    if (!session?.user?.id || updating) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ goal })
        .eq('id', session.user.id);
      
      if (error) throw error;
      
      setProfile((prev: any) => ({ ...prev, goal }));
      if (Platform.OS === 'web') {
        alert('Goal Updated!\nYour nutrition targets have been adjusted.');
      } else {
        Alert.alert('Goal Updated', 'Your nutrition targets have been adjusted.');
      }
    } catch (e) {
      Alert.alert('Update Failed', 'Failed to save new goal. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      router.replace('/auth');
    } catch (e) {
      Alert.alert('Error', 'Failed to sign out user.');
    }
  };

  const handleEnableWearables = async () => {
    try {
      const granted = await requestWearablePermissions();
      if (granted) {
        await AsyncStorage.setItem('wearables_connected', 'true');
        setWearablesConnected(true);
        if (Platform.OS === 'web') {
          alert('Telemetry Configured!\nWearable telemetry permission granted.');
        } else {
          Alert.alert('Telemetry Configured', 'Wearable telemetry permission granted.');
        }
      } else {
        Alert.alert('Permission Denied', 'Permissions were not granted for Health Telemetry.');
      }
    } catch (e) {
      Alert.alert('Setup Error', 'Failed to configure wearable settings.');
    }
  };

  const handleDisableWearables = async () => {
    try {
      await AsyncStorage.setItem('wearables_connected', 'false');
      setWearablesConnected(false);
      if (Platform.OS === 'web') {
        alert('Telemetry Disconnected!\nWearable telemetry permission disabled.');
      } else {
        Alert.alert('Disconnected', 'Wearables sync has been disabled.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to disconnect wearables.');
    }
  };

  if (loading) {
    return (
      <AppShell activeTab="more">
        <SafeAreaView style={styles.safeArea}>
          <ActivityIndicator size="large" color={P.ACCENT} />
        </SafeAreaView>
      </AppShell>
    );
  }

  return (
    <AppShell activeTab="more">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16 }}>
            <Animated.View entering={FadeIn.duration(400)} style={{ pb: 12 } as any}>
              
              {/* Profile Card Header */}
              <View style={sharedStyles.cardGlow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarEmoji}>👤</Text>
                </View>
                <Text style={styles.profileName}>
                  {profile?.full_name || 'Dude Athlete'}
                </Text>
                <Text style={styles.profileEmail}>
                  {session?.user?.email}
                </Text>
              </View>

              {/* Stats Row */}
              <View style={styles.statsRow}>
                <View style={[styles.statTile, sharedStyles.card]}>
                  <Text style={styles.statLabel}>Height</Text>
                  <Text style={styles.statValue}>{profile?.height_cm || '--'} <Text style={styles.statUnit}>cm</Text></Text>
                </View>
                <View style={[styles.statTile, sharedStyles.card]}>
                  <Text style={styles.statLabel}>Weight</Text>
                  <Text style={styles.statValue}>{profile?.weight_kg || '--'} <Text style={styles.statUnit}>kg</Text></Text>
                </View>
                {profile?.body_fat_percent && (
                  <View style={[styles.statTile, sharedStyles.card]}>
                    <Text style={styles.statLabel}>Body Fat</Text>
                    <Text style={styles.statValue}>{profile?.body_fat_percent} <Text style={styles.statUnit}>%</Text></Text>
                  </View>
                )}
              </View>

              {/* Goal Selection */}
              <Text style={[sharedStyles.labelCaps, styles.sectionHeader]}>Current Goal</Text>
              <View style={styles.cardGroup}>
                {GOALS.map((g) => {
                  const isSelected = profile?.goal === g.id;
                  return (
                    <TouchableOpacity
                      key={g.id}
                      onPress={() => handleUpdateGoal(g.id)}
                      disabled={updating}
                      style={[
                        styles.goalBtn,
                        isSelected ? styles.goalBtnSelected : null
                      ]}
                      activeOpacity={0.8}
                    >
                      <View style={{ flex: 1, paddingRight: 16 }}>
                        <Text style={[
                          styles.goalLabel,
                          isSelected ? styles.goalLabelSelected : null
                        ]}>
                          {g.label}
                        </Text>
                        <Text style={styles.goalDesc}>{g.desc}</Text>
                      </View>
                      {isSelected && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Other Options */}
              <Text style={[sharedStyles.labelCaps, styles.sectionHeader]}>Options</Text>
              <View style={styles.cardGroup}>
                <TouchableOpacity 
                  onPress={wearablesConnected ? handleDisableWearables : handleEnableWearables}
                  style={[
                    styles.optionBtn,
                    wearablesConnected ? [styles.optionBtnConnected, glowStyle(P.ACCENT, 10, 0.25)] : null
                  ]}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={[
                      styles.optionTitle,
                      wearablesConnected ? styles.optionTitleConnected : null
                    ]}>
                      {wearablesConnected ? "Sync Wearables: Connected ✓" : "Sync Wearables"}
                    </Text>
                    <Text style={styles.optionSubtitle}>
                      {wearablesConnected ? "Tap to disconnect wearable data" : "Enable background metrics & steps"}
                    </Text>
                  </View>
                  <Text style={styles.optionIcon}>{wearablesConnected ? "⚡" : "🔌"}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => router.push('/challenges')}
                  style={styles.optionBtn}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.optionTitle}>🏆 Social Challenges</Text>
                    <Text style={styles.optionSubtitle}>View leaderboards & step challenges</Text>
                  </View>
                  <Text style={styles.optionIcon}>→</Text>
                </TouchableOpacity>
              </View>

              {/* Notification Preferences */}
              <Text style={[sharedStyles.labelCaps, styles.sectionHeader]}>Notifications</Text>
              <View style={styles.cardGroup}>
                <View style={styles.switchRow}>
                  <View style={{ flex: 1, paddingRight: 16 }}>
                    <Text style={styles.optionTitle}>Workout Reminders</Text>
                    <Text style={styles.optionSubtitle}>Get reminded on training days</Text>
                  </View>
                  <Switch 
                    value={notifStore.workoutReminders} 
                    onValueChange={(val) => notifStore.setPreference('workoutReminders', val)}
                    trackColor={{ false: '#222', true: P.ACCENT }}
                    thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (notifStore.workoutReminders ? P.ACCENT : '#888888')}
                  />
                </View>

                <View style={styles.switchRow}>
                  <View style={{ flex: 1, paddingRight: 16 }}>
                    <Text style={styles.optionTitle}>Coach Messages</Text>
                    <Text style={styles.optionSubtitle}>Updates from your assigned coach</Text>
                  </View>
                  <Switch 
                    value={notifStore.coachMessages} 
                    onValueChange={(val) => notifStore.setPreference('coachMessages', val)}
                    trackColor={{ false: '#222', true: P.ACCENT }}
                    thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (notifStore.coachMessages ? P.ACCENT : '#888888')}
                  />
                </View>

                <View style={styles.switchRow}>
                  <View style={{ flex: 1, paddingRight: 16 }}>
                    <Text style={styles.optionTitle}>Challenge Updates</Text>
                    <Text style={styles.optionSubtitle}>Rank changes and invites</Text>
                  </View>
                  <Switch 
                    value={notifStore.challengeUpdates} 
                    onValueChange={(val) => notifStore.setPreference('challengeUpdates', val)}
                    trackColor={{ false: '#222', true: P.ACCENT }}
                    thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (notifStore.challengeUpdates ? P.ACCENT : '#888888')}
                  />
                </View>
              </View>

              {/* Log Out */}
              <TouchableOpacity 
                onPress={handleSignOut}
                style={styles.logoutBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.logoutBtnText}>Log Out</Text>
              </TouchableOpacity>
              
              {/* Bottom padding for tab bar */}
              <View style={{ height: 120 }} />

            </Animated.View>
          </ScrollView>

        </View>
      </SafeAreaView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: P.BG,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    width: '100%',
    maxW: 640,
    alignSelf: 'center',
  } as any,
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: P.ACCENT_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    alignSelf: 'center',
  },
  avatarEmoji: {
    fontSize: 24,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '900',
    color: P.TEXT_PRI,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  profileEmail: {
    fontSize: 12,
    fontWeight: '600',
    color: P.TEXT_MUT,
    textAlign: 'center',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 28,
  },
  statTile: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: P.TEXT_MUT,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    color: P.TEXT_PRI,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  statUnit: {
    fontSize: 10,
    color: P.TEXT_MUT,
    fontWeight: '700',
  },
  sectionHeader: {
    marginBottom: 12,
    marginLeft: 4,
  },
  cardGroup: {
    gap: 10,
    marginBottom: 28,
  },
  goalBtn: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    backgroundColor: P.CARD_BG,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goalBtnSelected: {
    borderColor: P.ACCENT,
    backgroundColor: P.ACCENT_DIM,
  },
  goalLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: P.TEXT_PRI,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  goalLabelSelected: {
    color: P.ACCENT,
  },
  goalDesc: {
    fontSize: 11,
    color: P.TEXT_SEC,
    marginTop: 4,
  },
  checkmark: {
    fontSize: 16,
    fontWeight: '900',
    color: P.ACCENT,
  },
  optionBtn: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    backgroundColor: P.CARD_BG,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionBtnConnected: {
    borderColor: P.ACCENT_BORDER,
    backgroundColor: P.ACCENT_DIM,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: P.TEXT_PRI,
  },
  optionTitleConnected: {
    color: P.ACCENT,
  },
  optionSubtitle: {
    fontSize: 11,
    color: P.TEXT_SEC,
    marginTop: 4,
  },
  optionIcon: {
    fontSize: 14,
    color: P.TEXT_MUT,
  },
  switchRow: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    backgroundColor: P.CARD_BG,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoutBtn: {
    width: '100%',
    backgroundColor: 'rgba(239, 68, 68, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  logoutBtnText: {
    color: P.RED,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

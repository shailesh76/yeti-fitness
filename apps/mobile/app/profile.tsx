import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform, Switch, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';
import { useRepositories } from '../hooks/useRepositories';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import AppShell from '../components/AppShell';
import { requestWearablePermissions } from '../services/wearableService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNotificationStore } from '../store/useNotificationStore';
import { useNotificationHistoryStore } from '../store/useNotificationHistoryStore';
import { useLogStore } from '../store/useLogStore';
import { P, glowStyle, sharedStyles } from '../constants/premiumTheme';
import Constants from 'expo-constants';

const GOALS = [
  { id: 'BUILD_MUSCLE', label: 'Build Muscle', desc: 'High calorie & protein surplus' },
  { id: 'LOSE_FAT', label: 'Lose Fat', desc: 'Calorie deficit with high protein' },
  { id: 'MAINTAIN', label: 'Maintain', desc: 'Balanced fuel for consistency' },
] as const;

const GOAL_LABEL: Record<string, string> = {
  BUILD_MUSCLE: 'Build Muscle',
  LOSE_FAT: 'Lose Fat',
  MAINTAIN: 'Maintain',
};

// A single settings row — leading icon tile, title, optional value/subtitle,
// and a trailing chevron or custom accessory. Matches the redesign's
// grouped-list aesthetic while keeping every underlying action intact.
function SettingsRow({
  icon,
  iconColor = P.ACCENT,
  title,
  value,
  subtitle,
  onPress,
  accessory,
  accessibilityLabel,
  danger = false,
  first = false,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  value?: string;
  subtitle?: string;
  onPress?: () => void;
  accessory?: React.ReactNode;
  accessibilityLabel?: string;
  danger?: boolean;
  first?: boolean;
  last?: boolean;
}) {
  const Container: any = onPress ? TouchableOpacity : View;
  return (
    <Container
      onPress={onPress}
      activeOpacity={0.7}
      accessible={true}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel || title}
      style={[
        styles.row,
        first && styles.rowFirst,
        last && styles.rowLast,
      ]}
    >
      <View style={[styles.rowIconTile, { backgroundColor: iconColor + '1f', borderColor: iconColor + '33' }]}>
        <Ionicons name={icon} size={17} color={danger ? P.RED : iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, danger && { color: P.RED }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={styles.rowValue} numberOfLines={1}>{value}</Text> : null}
      {accessory !== undefined ? accessory : (onPress ? <Ionicons name="chevron-forward" size={16} color={P.TEXT_MUT} /> : null)}
    </Container>
  );
}

export default function MoreScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const setSession = useAuthStore((state) => state.setSession);
  const { userRepository } = useRepositories();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [wearablesConnected, setWearablesConnected] = useState(false);
  const [goalsExpanded, setGoalsExpanded] = useState(false);

  const notifStore = useNotificationStore();
  const unreadCount = useNotificationHistoryStore((s) => s.unreadCount);
  const fetchNotifications = useNotificationHistoryStore((s) => s.fetchNotifications);
  const logsHistory = useLogStore((s) => s.logsHistory);
  const prs = useLogStore((s) => s.prs);
  const fetchLogsHistory = useLogStore((s) => s.fetchLogsHistory);
  const fetchPRs = useLogStore((s) => s.fetchPRs);

  useEffect(() => {
    notifStore.loadPreferences();
    fetchNotifications();
    if (session?.user?.id) {
      fetchProfile();
      checkWearables();
      fetchLogsHistory(session.user.id);
      fetchPRs(session.user.id);
    } else {
      setLoading(false);
    }
  }, [session]);

  // Real profile stats (workout history/PRs are native-only, so these read 0
  // on web and populate on device — never fabricated).
  const workoutCount = logsHistory?.length ?? 0;
  const prCount = prs?.length ?? 0;
  const streak = React.useMemo(() => {
    const days = new Set((logsHistory || []).map((l: any) => l.completed_at && new Date(l.completed_at).toDateString()).filter(Boolean));
    let n = 0;
    for (let i = 0; i < 90; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      if (days.has(d.toDateString())) n += 1;
      else if (i === 0) continue;
      else break;
    }
    return n;
  }, [logsHistory]);
  // Activity-based Yeti Score from real recent training (matches the Progress
  // screen's logic); null until there's any workout history.
  const yetiScore = React.useMemo(() => {
    const days = new Set((logsHistory || []).map((l: any) => l.completed_at && new Date(l.completed_at).toDateString()).filter(Boolean));
    if (days.size === 0) return null;
    let recent = 0;
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      if (days.has(d.toDateString())) recent += 1;
    }
    return Math.min(100, Math.round((recent / 6) * 100));
  }, [logsHistory]);

  const memberSince = React.useMemo(() => {
    const created = (session?.user as any)?.created_at;
    if (!created) return null;
    return new Date(created).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }, [session]);
  const isVerified = !!(session?.user as any)?.email_confirmed_at;
  const appVersion = Constants.expoConfig?.version || '1.0.0';

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
      let localProfile = await userRepository.getProfile(session!.user!.id);
      if (!localProfile) {
        const { data, error } = await userRepository.fetchProfileRemote(session!.user!.id);
        if (data) {
          localProfile = await userRepository.updateProfile(session!.user!.id, data);
        } else if (error) {
          throw error;
        }
      }
      if (localProfile) setProfile(localProfile);
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
      const updatedProfile = await userRepository.updateProfile(session.user.id, { goal });
      setProfile(updatedProfile);
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

  const displayName = profile?.full_name || 'Dude Athlete';
  const initial = (displayName || session?.user?.email || 'A').trim().charAt(0).toUpperCase();
  const currentGoal = profile?.goal ? GOAL_LABEL[profile.goal] : undefined;

  if (loading) {
    return (
      <AppShell activeTab="more">
        <SafeAreaView style={[styles.safeArea, { justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color={P.ACCENT} />
        </SafeAreaView>
      </AppShell>
    );
  }

  return (
    <AppShell activeTab="more">
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* ── Top header ───────────────────────────────────────────── */}
        <View style={styles.topHeader}>
          <Text style={styles.topTitle}>Profile</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="System diagnostics and settings"
              onPress={() => router.push('/settings/diagnostics')}
              style={styles.headerIconBtn}
            >
              <Ionicons name="settings-outline" size={19} color={P.TEXT_PRI} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
              onPress={() => router.push('/notifications')}
              style={[styles.headerIconBtn, { position: 'relative' }]}
            >
              <Ionicons name="notifications-outline" size={19} color={P.TEXT_PRI} />
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* ── Profile header card ────────────────────────────────── */}
          <Animated.View entering={FadeIn.duration(400)} style={[sharedStyles.cardGlow, styles.headerCard]}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Edit profile photo and details"
              onPress={() => router.push('/onboarding/basic-info')}
              style={styles.avatarWrap}
              activeOpacity={0.85}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
              <View style={styles.avatarEdit}>
                <Ionicons name="camera" size={11} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
                {isVerified && <Ionicons name="checkmark-circle" size={16} color={P.ACCENT} />}
              </View>
              <Text style={styles.profileEmail} numberOfLines={1}>{session?.user?.email}</Text>
              {memberSince && (
                <View style={[sharedStyles.row, { gap: 5, marginTop: 4 }]}>
                  <Ionicons name="calendar-outline" size={11} color={P.TEXT_MUT} />
                  <Text style={styles.memberSince}>Member since {memberSince}</Text>
                </View>
              )}
              <View style={styles.badge}>
                <Ionicons name="barbell" size={10} color={P.ACCENT} />
                <Text style={styles.badgeText}>{currentGoal ? currentGoal.toUpperCase() : 'YETI ATHLETE'}</Text>
              </View>
            </View>
          </Animated.View>

          {/* ── Real stat cards ────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(60).duration(400)} style={styles.statsRow}>
            <View style={[styles.statTile, sharedStyles.card]}>
              <Ionicons name="flame" size={16} color={P.ACCENT} />
              <Text style={styles.statValueBig}>{yetiScore ?? '—'}</Text>
              <Text style={styles.statCaption}>Yeti Score</Text>
            </View>
            <View style={[styles.statTile, sharedStyles.card]}>
              <Ionicons name="barbell" size={16} color={P.STEPS} />
              <Text style={styles.statValueBig}>{workoutCount}</Text>
              <Text style={styles.statCaption}>Workouts</Text>
            </View>
            <View style={[styles.statTile, sharedStyles.card]}>
              <Ionicons name="trophy" size={16} color={P.WARNING} />
              <Text style={styles.statValueBig}>{prCount}</Text>
              <Text style={styles.statCaption}>PRs</Text>
            </View>
            <View style={[styles.statTile, sharedStyles.card]}>
              <Ionicons name="flash" size={16} color={P.PROTEIN} />
              <Text style={styles.statValueBig}>{streak}</Text>
              <Text style={styles.statCaption}>Day Streak</Text>
            </View>
          </Animated.View>

          {/* ── Account ────────────────────────────────────────────── */}
          <Text style={styles.sectionHeader}>ACCOUNT</Text>
          <View style={styles.group}>
            <SettingsRow
              first
              icon="flag"
              title="Goals"
              value={goalsExpanded ? undefined : (currentGoal || 'Not set')}
              accessibilityLabel="Change fitness goal"
              onPress={() => setGoalsExpanded((v) => !v)}
              accessory={<Ionicons name={goalsExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={P.TEXT_MUT} />}
            />
            {goalsExpanded && (
              <View style={styles.goalPanel}>
                {GOALS.map((g) => {
                  const isSelected = profile?.goal === g.id;
                  return (
                    <TouchableOpacity
                      key={g.id}
                      accessible={true}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isSelected }}
                      accessibilityLabel={`Set fitness goal to ${g.label}: ${g.desc}`}
                      onPress={() => handleUpdateGoal(g.id)}
                      disabled={updating}
                      style={[styles.goalBtn, isSelected && styles.goalBtnSelected]}
                      activeOpacity={0.8}
                    >
                      <View style={{ flex: 1, paddingRight: 16 }}>
                        <Text style={[styles.goalLabel, isSelected && styles.goalLabelSelected]}>{g.label}</Text>
                        <Text style={styles.goalDesc}>{g.desc}</Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color={P.ACCENT} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            <SettingsRow
              icon="person"
              title="Edit Profile"
              subtitle="Update your personal information"
              onPress={() => router.push('/onboarding/basic-info')}
            />
            <SettingsRow
              last
              icon="body"
              title="Body Metrics"
              subtitle="View and update your body measurements"
              onPress={() => router.push('/onboarding/body-metrics')}
            />
          </View>

          {/* ── Connected apps ─────────────────────────────────────── */}
          <Text style={styles.sectionHeader}>CONNECTED APPS</Text>
          <View style={styles.group}>
            <SettingsRow
              first
              last
              icon="link"
              iconColor={wearablesConnected ? P.SUCCESS : P.ACCENT}
              title="Connected Apps"
              subtitle={wearablesConnected ? 'Connected — Apple Health & Google Fit' : 'Manage devices — Apple Health & Google Fit'}
              accessibilityLabel={wearablesConnected ? 'Disconnect background wearables sync' : 'Enable background wearables sync'}
              onPress={wearablesConnected ? handleDisableWearables : handleEnableWearables}
              accessory={
                <View style={[styles.pill, wearablesConnected && styles.pillOn]}>
                  <Text style={[styles.pillText, wearablesConnected && styles.pillTextOn]}>
                    {wearablesConnected ? 'ON' : 'CONNECT'}
                  </Text>
                </View>
              }
            />
          </View>

          {/* ── Notifications ──────────────────────────────────────── */}
          <Text style={styles.sectionHeader}>NOTIFICATIONS</Text>
          <View style={styles.group}>
            {([
              ['workoutReminders', 'Workout Reminders', 'Get reminded on training days'],
              ['coachMessages', 'Coach Messages', 'Updates from your assigned coach'],
              ['challengeUpdates', 'Challenge Updates', 'Rank changes and invites'],
            ] as const).map(([key, title, subtitle], i, arr) => (
              <SettingsRow
                key={key}
                first={i === 0}
                last={i === arr.length - 1}
                icon={key === 'workoutReminders' ? 'alarm' : key === 'coachMessages' ? 'chatbubble-ellipses' : 'trophy'}
                title={title}
                subtitle={subtitle}
                accessory={
                  <Switch
                    accessible={true}
                    accessibilityRole="switch"
                    accessibilityLabel={`Toggle ${title}`}
                    value={notifStore[key]}
                    onValueChange={(val) => notifStore.setPreference(key, val)}
                    trackColor={{ false: '#222', true: P.ACCENT }}
                    thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (notifStore[key] ? P.ACCENT : '#888888')}
                  />
                }
              />
            ))}
          </View>

          {/* ── Support & more ─────────────────────────────────────── */}
          <Text style={styles.sectionHeader}>SUPPORT & MORE</Text>
          <View style={styles.group}>
            <SettingsRow
              first
              icon="trophy"
              iconColor={P.WARNING}
              title="Social Challenges"
              subtitle="Leaderboards & step challenges"
              onPress={() => router.push('/challenges')}
            />
            <SettingsRow
              icon="help-buoy"
              title="Help & Support"
              subtitle="Get help and contact support"
              onPress={() => router.push('/settings/feedback')}
            />
            <SettingsRow
              icon="star"
              iconColor={P.WARNING}
              title="Rate the App"
              subtitle="Share your feedback"
              onPress={() => router.push('/settings/feedback')}
            />
            <SettingsRow
              last
              icon="pulse"
              title="System Diagnostics"
              subtitle="App details, sync state & entitlements"
              onPress={() => router.push('/settings/diagnostics')}
            />
          </View>

          {/* ── Log out ────────────────────────────────────────────── */}
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Log out of Yeti Fitness account"
            onPress={handleSignOut}
            style={styles.logoutBtn}
            activeOpacity={0.85}
          >
            <Ionicons name="log-out-outline" size={16} color={P.RED} />
            <Text style={styles.logoutBtnText}>Log Out</Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>Version {appVersion}</Text>

          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: P.BG },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },

  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  topTitle: { fontSize: 26, fontWeight: '900', color: P.TEXT_PRI, letterSpacing: -0.5 },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: P.RED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },

  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrap: { position: 'relative' },
  avatarEdit: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: P.ACCENT,
    borderWidth: 2,
    borderColor: P.CARD_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberSince: { fontSize: 11, fontWeight: '600', color: P.TEXT_MUT },
  versionText: { fontSize: 11, fontWeight: '600', color: P.TEXT_MUT, textAlign: 'center', marginTop: 16 },
  statValueBig: { fontSize: 20, fontWeight: '900', color: P.TEXT_PRI, marginTop: 6, letterSpacing: -0.5 },
  statCaption: { fontSize: 10, fontWeight: '700', color: P.TEXT_MUT, marginTop: 3 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: P.ACCENT_DIM,
    borderWidth: 1,
    borderColor: P.ACCENT_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    ...glowStyle(P.ACCENT, 12, 0.3),
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: '900',
    color: P.ACCENT,
  },
  profileName: {
    fontSize: 19,
    fontWeight: '900',
    color: P.TEXT_PRI,
    letterSpacing: -0.4,
  },
  profileEmail: {
    fontSize: 12,
    fontWeight: '600',
    color: P.TEXT_MUT,
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: P.ACCENT_DIM,
    borderWidth: 1,
    borderColor: P.ACCENT_BORDER,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: P.ACCENT,
    letterSpacing: 0.6,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    marginBottom: 8,
  },
  statTile: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
  },

  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: P.TEXT_MUT,
    letterSpacing: 0.8,
    marginTop: 22,
    marginBottom: 10,
    marginLeft: 4,
  },
  group: {
    backgroundColor: P.CARD_BG,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    borderRadius: P.RADIUS_CARD,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: P.CARD_BORDER + '80',
  },
  rowFirst: { borderTopWidth: 0 },
  rowLast: {},
  rowIconTile: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: P.TEXT_PRI,
  },
  rowSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: P.TEXT_SEC,
    marginTop: 2,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '700',
    color: P.TEXT_SEC,
    marginRight: 6,
  },

  goalPanel: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  goalBtn: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    backgroundColor: P.BG,
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalBtnSelected: {
    borderColor: P.ACCENT,
    backgroundColor: P.ACCENT_DIM,
  },
  goalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: P.TEXT_PRI,
  },
  goalLabelSelected: { color: P.ACCENT },
  goalDesc: {
    fontSize: 11,
    color: P.TEXT_SEC,
    marginTop: 3,
  },

  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: P.ACCENT_BORDER,
    backgroundColor: P.ACCENT_DIM,
  },
  pillOn: {
    borderColor: (P.SUCCESS || P.ACCENT) + '55',
    backgroundColor: (P.SUCCESS || P.ACCENT) + '1f',
  },
  pillText: {
    fontSize: 10,
    fontWeight: '900',
    color: P.ACCENT,
    letterSpacing: 0.5,
  },
  pillTextOn: { color: P.SUCCESS || P.ACCENT },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    backgroundColor: 'rgba(255,69,58,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,69,58,0.2)',
    borderRadius: P.RADIUS_CARD,
    paddingVertical: 15,
  },
  logoutBtnText: {
    color: P.RED,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

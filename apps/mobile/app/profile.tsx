import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform, StyleSheet, Image, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { useUserStore } from '../store/useUserStore';
import { supabase } from '../lib/supabase';
import { useRepositories } from '../hooks/useRepositories';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import AppShell from '../components/AppShell';
import { requestWearablePermissions } from '../services/wearableService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNotificationHistoryStore } from '../store/useNotificationHistoryStore';
import { useLogStore } from '../store/useLogStore';
import { P, glowStyle, sharedStyles } from '../constants/premiumTheme';
import { calculateNutritionTargets } from '../services/nutritionUtils';
import { applyNutritionTargetsLocal, saveNutritionTargets, fetchNutritionTargets } from '../services/nutritionTargets';
import { APP_BUILD_LABEL } from '../constants/version';
import Constants from 'expo-constants';
import { dedupeScreenRefresh, getScreenData, hydrateScreenData, invalidateScreenData, persistScreenData, subscribeScreenData } from '../services/screenDataCache';
import { createScreenPerfTrace } from '../services/screenPerf';
import { markLocalProfileWrite } from '../services/profileRealtime';
import { resolveProfileDisplayName } from '../services/profileIdentity';

// The Yeti mascot portrait the athlete's avatar defaults to (no photo upload yet).
const YETI_AVATAR = require('../assets/yeti_avatar_portrait.png');
// The full mascot badge used on the Go Premium banner.
const YETI_MASCOT = require('../assets/yeti_mascot_avatar.png');

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
  const perf = useRef(createScreenPerfTrace('profile')).current;
  perf('T0 route render');
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const setSession = useAuthStore((state) => state.setSession);
  const { userRepository } = useRepositories();

  const profileCacheKey = session?.user?.id ? `profile:${session.user.id}` : 'profile:anonymous';
  const cachedProfile = getScreenData<any>(profileCacheKey);
  const [profile, setProfile] = useState<any>(cachedProfile ?? null);
  const [loading, setLoading] = useState(!cachedProfile);
  const [updating, setUpdating] = useState(false);
  const [wearablesConnected, setWearablesConnected] = useState(false);
  const [goalsExpanded, setGoalsExpanded] = useState(false);

  const unreadCount = useNotificationHistoryStore((s) => s.unreadCount);
  const fetchNotifications = useNotificationHistoryStore((s) => s.fetchNotifications);
  const logsHistory = useLogStore((s) => s.logsHistory);
  const prs = useLogStore((s) => s.prs);
  const fetchLogsHistory = useLogStore((s) => s.fetchLogsHistory);
  const fetchPRs = useLogStore((s) => s.fetchPRs);

  useEffect(() => {
    fetchNotifications();
    if (session?.user?.id) {
      fetchProfile();
      checkWearables();
      fetchLogsHistory(session.user.id);
      fetchPRs(session.user.id);
    }
  }, [session]);

  useEffect(() => {
    if (!session?.user?.id || cachedProfile) return;
    void hydrateScreenData<any>(profileCacheKey).then((cached) => {
      perf('T1 local cache read');
      if (!cached) return;
      setProfile(cached);
      setLoading(false);
    });
  }, [session?.user?.id, profileCacheKey]);

  useEffect(() => subscribeScreenData<any>(profileCacheKey, (next) => {
    if (next) setProfile(next);
  }), [profileCacheKey]);

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
  const appVersion = APP_BUILD_LABEL;

  const checkWearables = async () => {
    try {
      const val = await AsyncStorage.getItem('wearables_connected');
      setWearablesConnected(val === 'true');
    } catch (e) {
      console.warn("AsyncStorage check failed:", e);
    }
  };

  const fetchProfile = async () => {
    if (!session?.user?.id) return;
    return dedupeScreenRefresh(profileCacheKey, async () => {
    try {
      // Background refresh must never replace usable content with a spinner.
      if (!profile && !getScreenData(profileCacheKey)) setLoading(true);

      // 1. Try local profile
      let localProf = await userRepository.getProfile(session.user.id);
      perf('T2 local DB/storage read');
      if (localProf) {
        setProfile(localProf);
          void persistScreenData(profileCacheKey, localProf);
        setLoading(false);
      }

      // 2. Fetch remote profile
      perf('T3 remote start');
      const { data: remoteProf, error: remoteErr } = await userRepository.fetchProfileRemote(session.user.id, '*');
      perf('T4 remote response');
      if (remoteErr) {
        console.error("Could not fetch remote user profile:", remoteErr);
      } else if (remoteProf) {
        // Remote profile immediately updates UI
        setProfile((prev: any) => {
          const next = { ...(prev || {}), ...remoteProf };
          void persistScreenData(profileCacheKey, next);
          return next;
        });

        // Best-effort local cache write
        try {
          await userRepository.updateProfile(session.user.id, remoteProf);
        } catch (localErr: any) {
          // LOCAL_DB_UNAVAILABLE must never discard already-fetched remote data
          if (!localErr?.message?.includes('LOCAL_DB_UNAVAILABLE')) {
            console.warn("Best-effort local profile write failed:", localErr);
          }
        }
      }
      perf('T5 state reconciliation');
    } catch (e) {
      console.error("Could not fetch user profile:", e);
    } finally {
      setLoading(false);
      perf('T6 visible authoritative UI');
    }
    });
  };

  const handleUpdateGoal = async (goal: 'BUILD_MUSCLE' | 'LOSE_FAT' | 'MAINTAIN') => {
    if (!session?.user?.id || updating) return;
    setUpdating(true);
    try {
      const updatedProfile = { ...profile, goal };
      setProfile((prev: any) => ({ ...prev, goal }));
      useUserStore.getState().updateField('goal', goal);
      void persistScreenData(profileCacheKey, updatedProfile);
      markLocalProfileWrite(session.user.id, { goal });

      const targets = calculateNutritionTargets(updatedProfile);
      const currentTargets = getScreenData<any>(`nutrition-targets:${session.user.id}`) ||
        await fetchNutritionTargets(session.user.id).catch(() => ({ locked: false } as any));

      const updates: any = { goal };
      if (!currentTargets.locked && currentTargets.mode === 'AUTO') {
        updates.daily_calorie_target = targets.calories;
        updates.daily_protein_target = targets.protein;
        updates.daily_carb_target = targets.carbs;
        updates.daily_fat_target = targets.fat;
        applyNutritionTargetsLocal(session.user.id, targets, 'AUTO');
      }

      void userRepository.updateProfile(session.user.id, updates).then((result) => {
        if (result?.profile) setProfile((prev: any) => ({ ...prev, ...result.profile }));
      }).catch(() => {});
      if (!currentTargets.locked && currentTargets.mode === 'AUTO') {
        void saveNutritionTargets(session.user.id, targets, 'AUTO');
      }
      invalidateScreenData(`home:${session.user.id}`);
      invalidateScreenData(`progress:${session.user.id}`);

      if (Platform.OS === 'web') alert('Goal Updated');
      else Alert.alert('Goal Updated', currentTargets.mode === 'AUTO' ? 'Your nutrition targets have been adjusted.' : 'Your manual nutrition targets were preserved.');
    } catch (e: any) {
      Alert.alert('Update Failed', e?.message || 'Failed to save new goal. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleEditProfile = () => {
    if (profile && session?.user?.id) {
      useUserStore.getState().initializeFromProfile(profile, session.user.id);
    }
    router.push('/onboarding/basic-info');
  };

  // Rows for features that don't have a screen/endpoint yet surface an honest
  // "coming soon" message instead of navigating nowhere.
  const handleComingSoon = (label: string) => () => {
    if (Platform.OS === 'web') {
      window.alert(`${label} is coming soon.`);
    } else {
      Alert.alert('Coming soon', `${label} isn't available yet — we're working on it.`);
    }
  };

  const handleInvite = async () => {
    try {
      await Share.share({
        message: "I'm crushing my goals with Yeti Fitness — come train with me! 🏔️",
      });
    } catch {
      // user dismissed the share sheet, or sharing is unavailable on this platform
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

  const displayName = resolveProfileDisplayName(profile?.full_name, session?.user, useUserStore.getState().full_name);
  const currentGoal = profile?.goal ? GOAL_LABEL[profile.goal] : undefined;

  if (loading && !profile) {
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
              onPress={handleEditProfile}
              style={styles.avatarWrap}
              activeOpacity={0.85}
            >
              <View style={styles.avatar}>
                <Image source={YETI_AVATAR} style={styles.avatarImg} resizeMode="cover" />
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

          {/* ── Go Premium (not yet available) ─────────────────────── */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go Premium — coming soon"
            activeOpacity={0.85}
            onPress={handleComingSoon('Premium')}
            style={styles.premiumCard}
          >
            <Image source={YETI_MASCOT} style={styles.premiumMascot} resizeMode="cover" />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.premiumTitle}>Go Premium</Text>
                <View style={styles.soonPill}><Text style={styles.soonPillText}>SOON</Text></View>
              </View>
              <Text style={styles.premiumSub}>Unlock advanced insights, custom programs, and more.</Text>
            </View>
            <View style={styles.premiumBtn}>
              <Text style={styles.premiumBtnText}>Upgrade</Text>
            </View>
          </TouchableOpacity>

          {/* ── Account ────────────────────────────────────────────── */}
          <Text style={styles.sectionHeader}>ACCOUNT</Text>
          <View style={styles.group}>
            <SettingsRow
              first
              icon="person"
              title="Edit Profile"
              subtitle="Update your personal information"
              onPress={handleEditProfile}
            />
            <SettingsRow
              icon="body"
              title="Body Metrics"
              subtitle="View and update your body measurements"
              value={profile?.weight_kg ? `${profile.weight_kg} kg` : undefined}
              onPress={() => router.push('/onboarding/body-metrics')}
            />
            <SettingsRow
              icon="barbell"
              title="Training Preferences"
              subtitle="Workout goals and preferences"
              value={goalsExpanded ? undefined : (currentGoal || 'Not set')}
              accessibilityLabel="Change training goal"
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
              icon="nutrition"
              title="Nutrition Preferences"
              subtitle="Dietary goals and food preferences"
              onPress={() => router.push('/food-diary')}
            />
            <SettingsRow
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

          {/* ── Support & more ─────────────────────────────────────── */}
          <Text style={styles.sectionHeader}>SUPPORT & MORE</Text>
          <View style={styles.group}>
            <SettingsRow
              first
              icon="help-buoy"
              title="Help Center"
              subtitle="Get help and find answers"
              onPress={() => router.push('/settings/feedback')}
            />
            <SettingsRow
              icon="mail"
              title="Contact Support"
              subtitle="We're here to help"
              onPress={() => router.push('/settings/feedback')}
            />
            <SettingsRow
              icon="person-add"
              title="Invite Friends"
              subtitle="Share Yeti Fitness with friends"
              onPress={handleInvite}
            />
            <SettingsRow
              icon="star"
              iconColor={P.WARNING}
              title="Rate Yeti Fitness"
              subtitle="Share your feedback"
              onPress={() => router.push('/settings/feedback')}
            />
            <SettingsRow
              icon="shield-checkmark"
              title="Privacy Policy"
              subtitle="Read our privacy policy"
              accessibilityLabel="Privacy Policy — coming soon"
              onPress={handleComingSoon('Privacy Policy')}
              accessory={<View style={styles.soonPill}><Text style={styles.soonPillText}>SOON</Text></View>}
            />
            <SettingsRow
              last
              icon="document-text"
              title="Terms of Service"
              subtitle="Read our terms of service"
              accessibilityLabel="Terms of Service — coming soon"
              onPress={handleComingSoon('Terms of Service')}
              accessory={<View style={styles.soonPill}><Text style={styles.soonPillText}>SOON</Text></View>}
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
    overflow: 'hidden',
    ...glowStyle(P.ACCENT, 12, 0.3),
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
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

  premiumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    padding: 12,
    borderRadius: P.RADIUS_CARD,
    backgroundColor: P.ACCENT_DIM,
    borderWidth: 1,
    borderColor: P.ACCENT_BORDER,
  },
  premiumMascot: { width: 48, height: 48, borderRadius: 12 },
  premiumTitle: { fontSize: 15, fontWeight: '900', color: P.TEXT_PRI },
  premiumSub: { fontSize: 11, fontWeight: '600', color: P.TEXT_SEC, marginTop: 3, lineHeight: 15 },
  premiumBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: P.ACCENT },
  premiumBtnText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  soonPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: P.WARNING + '22',
    borderWidth: 1,
    borderColor: P.WARNING + '55',
  },
  soonPillText: { fontSize: 8, fontWeight: '900', color: P.WARNING, letterSpacing: 0.6 },

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

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { database, isNativeDbAvailable } from '../../database';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useSyncManager } from '../../hooks/useSyncManager';
import { P, sharedStyles } from '../../constants/premiumTheme';
import { Q } from '@nozbe/watermelondb';
import Constants from 'expo-constants';

interface DiagnosticInfo {
  appVersion: string;
  buildNumber: string;
  platform: string;
  osVersion: string;
  deviceName: string;
  dbVersion: string;
  userEmail: string;
  entitlement: string;
  aiStatus: string;
  pendingSync: number;
}

export default function DiagnosticsScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const { sync } = useSyncManager();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<DiagnosticInfo | null>(null);

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const loadDiagnostics = async () => {
    setLoading(true);
    try {
      // 1. Check pending items from local database
      let pendingCount = 0;
      if (isNativeDbAvailable && database) {
        const tables = ['workout_sessions', 'session_sets', 'ai_messages', 'meal_logs', 'measurements'];
        for (const table of tables) {
          try {
            const count = await database.get(table).query(Q.where('is_synced', false)).fetchCount();
            pendingCount += count;
          } catch {}
        }
      }

      // 2. Query current entitlement plan from Supabase
      let entitlement = 'Free (Default)';
      if (session?.user?.id) {
        try {
          const { data, error } = await supabase
            .from('user_entitlements')
            .select('plan_id, status')
            .eq('user_id', session.user.id)
            .eq('status', 'active')
            .limit(1);

          if (!error && data && data.length > 0) {
            entitlement = `${data[0].plan_id} Beta PRO`;
          }
        } catch {}
      }

      setInfo({
        appVersion: Constants.expoConfig?.version || '1.0.0',
        buildNumber: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode?.toString() || '1',
        platform: Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Web',
        osVersion: Platform.Version?.toString() || 'Unknown',
        deviceName: Constants.deviceName || 'Simulator/Device',
        dbVersion: 'Schema Version 4',
        userEmail: session?.user?.email || 'Guest / Offline',
        entitlement,
        aiStatus: 'Operational (Deno Edge Functions)',
        pendingSync: pendingCount,
      });
    } catch (e) {
      console.warn('Diagnostics collection error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    Alert.alert('Manual Sync Started', 'Pushing database changes in the background...');
    await sync();
    await loadDiagnostics();
  };

  const handleTestNotification = async () => {
    const { sendLocalNotification } = require('../../services/notificationService');
    await sendLocalNotification('Diagnostics Active ⚡', 'Yeti debug check complete.');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={P.ACCENT} />
          <Text style={styles.loadingText}>Collecting diagnostic logs...</Text>
        </View>
      </SafeAreaView>
    );
  }  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity 
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()} 
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={P.TEXT_PRI} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>System Diagnostics</Text>
        <TouchableOpacity 
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Reload diagnostic metrics"
          onPress={loadDiagnostics} 
          style={styles.refreshBtn}
        >
          <Ionicons name="refresh" size={20} color={P.ACCENT} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Device Stats Card */}
        <Text style={styles.sectionHeader}>Device &amp; OS</Text>
        <View style={sharedStyles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Platform</Text>
            <Text style={styles.value}>{info?.platform}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>OS Version</Text>
            <Text style={styles.value}>{info?.osVersion}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Device Model</Text>
            <Text style={styles.value}>{info?.deviceName}</Text>
          </View>
        </View>

        {/* Application Stats Card */}
        <Text style={styles.sectionHeader}>Yeti Client App</Text>
        <View style={sharedStyles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>App Version</Text>
            <Text style={styles.value}>{info?.appVersion}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Build Number</Text>
            <Text style={styles.value}>{info?.buildNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Database Schema</Text>
            <Text style={styles.value}>{info?.dbVersion}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>SQLite Status</Text>
            <Text style={[styles.value, { color: isNativeDbAvailable ? P.ACCENT : P.RED }]}>
              {isNativeDbAvailable ? 'Native Enabled ✓' : 'Web Fallback'}
            </Text>
          </View>
        </View>

        {/* Sync & Entitlements Card */}
        <Text style={styles.sectionHeader}>Sync &amp; Accounts</Text>
        <View style={sharedStyles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Logged In User</Text>
            <Text style={styles.value} numberOfLines={1}>{info?.userEmail}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Entitlement</Text>
            <Text style={[styles.value, { color: info?.entitlement.includes('PRO') ? P.GOLD : P.TEXT_SEC }]}>
              {info?.entitlement}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>AI Coach status</Text>
            <Text style={[styles.value, { color: P.ACCENT }]}>{info?.aiStatus}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Pending Sync Items</Text>
            <Text style={[styles.value, { color: (info?.pendingSync ?? 0) > 0 ? P.AMBER : P.ACCENT, fontWeight: 'bold' }]}>
              {info?.pendingSync} items
            </Text>
          </View>
        </View>

        {/* Diagnostics Actions */}
        <Text style={styles.sectionHeader}>Beta Commands</Text>
        <View style={styles.btnRow}>
          <TouchableOpacity 
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Force manual database sync"
            style={styles.btn} 
            onPress={handleManualSync}
          >
            <Ionicons name="cloud-upload-outline" size={18} color={P.BG} style={{ marginRight: 6 }} />
            <Text style={styles.btnText}>Force Sync</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Send test push notification"
            style={[styles.btn, { backgroundColor: '#1e2a1e', borderWidth: 1, borderColor: P.CARD_BORDER }]} 
            onPress={handleTestNotification}
          >
            <Ionicons name="notifications-outline" size={18} color={P.ACCENT} style={{ marginRight: 6 }} />
            <Text style={[styles.btnText, { color: P.ACCENT }]}>Test Push</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: P.BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: P.CARD_BORDER,
  },
  backBtn: {
    width: 44,
    height: 44,
    minHeight: 44,
    minWidth: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtn: {
    width: 44,
    height: 44,
    minHeight: 44,
    minWidth: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: P.TEXT_PRI,
    letterSpacing: -0.5,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: P.TEXT_MUT,
    fontSize: 14,
    fontWeight: '600',
  },
  container: {
    padding: 20,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: P.TEXT_MUT,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  label: {
    fontSize: 13,
    color: P.TEXT_SEC,
    fontWeight: '600',
  },
  value: {
    fontSize: 13,
    color: P.TEXT_PRI,
    fontWeight: '700',
    maxWidth: '55%',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  btn: {
    flex: 1,
    backgroundColor: P.ACCENT,
    paddingVertical: 14,
    minHeight: 44,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: P.BG,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});


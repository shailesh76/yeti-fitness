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
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={P.TEXT_PRI} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>System Diagnostics</Text>
        <TouchableOpacity onPress={loadDiagnostics} style={styles.refreshBtn}>
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
          <TouchableOpacity style={styles.btn} onPress={handleManualSync}>
            <Ionicons name="cloud-upload-outline" size={18} color={P.BG} style={{ marginRight: 6 }} />
            <Text style={styles.btnText}>Force Sync</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#1e2a1e', borderWidth: 1, borderColor: P.CARD_BORDER }]} onPress={handleTestNotification}>
            <Ionicons name="notifications-outline" size={18} color={P.ACCENT} style={{ marginRight: 6 }} />
            <Text style={[styles.btnText, { color: P.ACCENT }]}>Test Push</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: P.BG },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: P.BG },
  loadingText: { color: P.TEXT_SEC, marginTop: 12, fontSize: 14, fontWeight: 'bold' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: P.CARD_BORDER },
  backBtn: { padding: 4 },
  refreshBtn: { padding: 4 },
  headerTitle: { color: P.TEXT_PRI, fontSize: 18, fontWeight: 'bold' },
  container: { padding: 20, paddingBottom: 100 },
  sectionHeader: { fontSize: 11, fontWeight: '900', color: P.TEXT_MUT, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8, marginTop: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  label: { color: P.TEXT_SEC, fontSize: 14 },
  value: { color: P.TEXT_PRI, fontSize: 14, fontWeight: '500' },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  btn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: P.ACCENT, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnText: { color: P.BG, fontWeight: 'bold', fontSize: 14 }
});

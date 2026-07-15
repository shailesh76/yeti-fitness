import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// In a real implementation, this would subscribe to WatermelonDB's Sync status observable
export type SyncStatus = 'SYNCED' | 'SYNCING' | 'OFFLINE' | 'FAILED';

export function SyncIndicator({ status }: { status: SyncStatus }) {
  const getStatusConfig = () => {
    switch (status) {
      case 'SYNCED': return { color: '#22c55e', text: 'All data saved' };
      case 'SYNCING': return { color: '#eab308', text: 'Saving changes...' };
      case 'OFFLINE': return { color: '#ef4444', text: 'Offline mode - changes will sync later' };
      case 'FAILED': return { color: '#f97316', text: 'Sync issue - retrying ⚠️' };
      default: return { color: '#6b7280', text: 'Unknown' };
    }
  };

  const config = getStatusConfig();

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={styles.text}>{config.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start'
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  text: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: 'bold'
  }
});

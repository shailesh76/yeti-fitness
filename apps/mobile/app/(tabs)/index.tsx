import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function MobileDashboard() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.greeting}>Good morning, Athlete!</Text>

      {/* Yeti Score */}
      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>DAILY YETI SCORE</Text>
        <Text style={styles.scoreValue}>82</Text>
        <Text style={styles.scoreSubtitle}>Your recovery score suggests maintaining normal volume today.</Text>
      </View>

      {/* Today's Focus */}
      <View style={styles.focusCard}>
        <Text style={styles.focusLabel}>TODAY'S WORKOUT</Text>
        <Text style={styles.focusTitle}>Push Day Hypertrophy</Text>
        <Text style={styles.focusMeta}>65 minutes • Chest, Shoulders, Triceps</Text>
        <View style={styles.button}>
          <Text style={styles.buttonText}>Start Workout</Text>
        </View>
      </View>

      {/* AI Insights */}
      <Text style={styles.sectionTitle}>AI Coach Insights</Text>
      <View style={styles.insightCard}>
        <Text style={styles.insightText}>🔥 Your squat improved 8% this month!</Text>
      </View>
      <View style={[styles.insightCard, { borderLeftColor: '#f59e0b' }]}>
        <Text style={styles.insightText}>⚠ Your protein was below target 3 days this week. Let's aim for 180g today.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20, paddingTop: 60 },
  greeting: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 24 },
  
  scoreCard: { backgroundColor: '#111', padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 20 },
  scoreLabel: { color: '#888', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  scoreValue: { color: '#3b82f6', fontSize: 64, fontWeight: '900', marginVertical: 8 },
  scoreSubtitle: { color: '#aaa', fontSize: 14, textAlign: 'center' },

  focusCard: { backgroundColor: '#1e3a8a', padding: 20, borderRadius: 16, marginBottom: 30 },
  focusLabel: { color: '#93c5fd', fontSize: 12, fontWeight: 'bold', letterSpacing: 1, marginBottom: 8 },
  focusTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  focusMeta: { color: '#bfdbfe', fontSize: 14, marginBottom: 20 },
  button: { backgroundColor: '#fff', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },

  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  insightCard: { backgroundColor: '#111', padding: 16, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#3b82f6', marginBottom: 12 },
  insightText: { color: '#eee', fontSize: 14, lineHeight: 20 }
});

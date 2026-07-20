import { useRepositories } from '../../../hooks/useRepositories';
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Platform, Share, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../../store/useAuthStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Line as SvgLine } from 'react-native-svg';
import { P, glowStyle, sharedStyles } from '../../../constants/premiumTheme';

interface HistoryPoint {
  date: string;
  completed_at: string;
  max_1rm: number;
  max_weight: number;
  workout_name: string;
  sets: Array<{
    reps: number;
    weight_kg: number;
    estimated_1rm: number;
  }>;
}

interface ProgressionHistory {
  history: HistoryPoint[];
  pr: {
    weight_kg: number;
    reps: number;
    estimated_1rm: number;
    date: string;
    workout_name: string;
  } | null;
  trend: string;
}

export default function ExerciseHistoryScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const { exerciseRepository, workoutRepository } = useRepositories();

  const [loading, setLoading] = useState(true);
  const [exerciseName, setExerciseName] = useState('Exercise Progress');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [progressData, setProgressData] = useState<ProgressionHistory | null>(null);

  useEffect(() => {
    if (id && session?.user?.id) {
      loadHistory();
    }
  }, [id, session]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const ex = await exerciseRepository.getExerciseById(id as string);
      if (ex) {
        setExerciseName(ex.name);
        setMuscleGroup(ex.muscle_group || '');
      }

      const data = await workoutRepository.fetchExerciseHistoryRemote(id as string, session!.user!.id);
      if (data && data.success) {
        setProgressData(data.exercise_progress);
      }
    } catch (e) {
      console.warn("Could not retrieve exercise progression stats:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleShareResult = async () => {
    if (!progressData?.pr) return;
    try {
      const message = `🏆 New PR on ${exerciseName}! Crushed ${progressData.pr.weight_kg}kg for ${progressData.pr.reps} reps (Est. 1RM: ${progressData.pr.estimated_1rm}kg). Built different on Yeti app!`;
      await Share.share({ message });
    } catch (error) {
      console.warn("Error sharing:", error);
    }
  };

  const renderSVGChart = (history: HistoryPoint[]) => {
    if (history.length < 2) return null;
    
    const chartData = [...history].reverse();
    const width = 340;
    const height = 180;
    const padding = 30;
    
    const oneRMs = chartData.map(h => h.max_1rm);
    const min1RM = Math.min(...oneRMs);
    const max1RM = Math.max(...oneRMs);
    const valueRange = max1RM - min1RM || 10;
    
    const points = chartData.map((d, index) => {
      const x = padding + (index / (chartData.length - 1)) * (width - padding * 2);
      const y = height - padding - ((d.max_1rm - min1RM) / valueRange) * (height - padding * 2);
      return { x, y, max_1rm: d.max_1rm, date: d.date };
    });
    
    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${points[i].x} ${points[i].y}`;
    }
    
    return (
      <View style={styles.chartBox}>
        <Svg width={width} height={height}>
          <SvgLine x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" />
          <SvgLine x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" />
          <SvgLine x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" />
          <Path d={pathD} fill="none" stroke={P.ACCENT} strokeWidth="3" />
          {points.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r="4" fill={P.BG} stroke={P.ACCENT} strokeWidth="2.5" />
          ))}
        </Svg>
        <View style={sharedStyles.rowBetween}>
          <Text style={styles.chartDateText}>{chartData[0].date}</Text>
          <Text style={styles.chartDateText}>{chartData[chartData.length - 1].date}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={P.ACCENT} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header navigation bar */}
        <View style={styles.header}>
          <TouchableOpacity 
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Text style={styles.backBtnText}>‹ Back</Text>
          </TouchableOpacity>
          
          {progressData?.pr && (
            <TouchableOpacity 
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Share personal record"
              onPress={handleShareResult}
              style={[styles.shareBtn, glowStyle(P.ACCENT, 12, 0.3)]}
            >
              <Text style={styles.shareBtnText}>Share Rank</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Title */}
        <View style={{ marginBottom: 20 }}>
          <Text style={sharedStyles.labelCaps}>{muscleGroup || 'Exercise'}</Text>
          <Text style={styles.title}>{exerciseName}</Text>
          <Text style={styles.subtitle}>Estimated 1RM Progression & Performance Logs</Text>
        </View>

        {progressData ? (
          <View style={{ paddingBottom: 40 }}>
            {progressData.history && progressData.history.length >= 2 ? (
              renderSVGChart(progressData.history)
            ) : (
              <View style={styles.emptyChartCard}>
                <Text style={styles.emptyChartTitle}>Graph Unavailable</Text>
                <Text style={styles.emptyChartSub}>Perform this exercise in at least 2 sessions to visualize progress.</Text>
              </View>
            )}

            {/* Performance Stats Cards */}
            <View style={styles.statsRow}>
              <View style={[sharedStyles.card, styles.statCard]}>
                <Text style={sharedStyles.labelCaps}>Trend Vector</Text>
                <Text style={[
                  styles.statTrendText,
                  progressData.trend === 'Improving' ? { color: P.ACCENT } :
                  progressData.trend === 'Declining' ? { color: P.RED } : { color: P.TEXT_SEC }
                ]}>
                  {progressData.trend}
                </Text>
              </View>

              <View style={[sharedStyles.card, styles.statCard]}>
                <Text style={sharedStyles.labelCaps}>Peak 1RM</Text>
                <Text style={styles.statValText}>
                  {progressData.pr?.estimated_1rm || 0} <Text style={{ fontSize: 11, color: P.TEXT_MUT }}>kg</Text>
                </Text>
              </View>
            </View>

            {/* PR Card */}
            {progressData.pr && (
              <View style={[sharedStyles.card, styles.prCard]}>
                <Text style={[styles.prBadgeText, { color: P.ACCENT }]}>🏆 Personal Record (PR)</Text>
                <View style={[sharedStyles.rowBetween, { marginTop: 12 }]}>
                  <View>
                    <Text style={styles.prWeightText}>{progressData.pr.weight_kg} kg</Text>
                    <Text style={styles.prMetaText}>for {progressData.pr.reps} reps</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.prWorkoutName}>{progressData.pr.workout_name}</Text>
                    <Text style={styles.prDateText}>{progressData.pr.date}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Logs List */}
            <Text style={[sharedStyles.labelCaps, { marginBottom: 12 }]}>Workout Logs</Text>
            <View style={{ gap: 10 }}>
              {progressData.history.map((h, hidx) => (
                <View key={hidx} style={[sharedStyles.card, styles.logCard]}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.logTitle}>{h.workout_name}</Text>
                    <Text style={styles.logDate}>{h.date}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.logMaxWeight}>{h.max_weight} kg max</Text>
                    <Text style={styles.logEstOneRM}>Est. 1RM: {h.max_1rm} kg</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No performance records logged yet.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: P.BG },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  backBtn: { paddingHorizontal: 12, paddingVertical: 8, minHeight: 44, justifyContent: 'center', borderRadius: P.RADIUS_FULL, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: P.CARD_BORDER },
  backBtnText: { color: P.TEXT_PRI, fontSize: 13, fontWeight: '800' },
  shareBtn: { paddingHorizontal: 16, paddingVertical: 8, minHeight: 44, justifyContent: 'center', borderRadius: P.RADIUS_FULL, backgroundColor: P.ACCENT },
  shareBtnText: { color: '#0B0B0F', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 26, fontWeight: '900', color: P.TEXT_PRI, letterSpacing: -0.5, marginTop: 4 },
  subtitle: { fontSize: 12, color: P.TEXT_SEC, fontWeight: '600', marginTop: 4 },
  chartBox: { backgroundColor: P.CARD_BG, padding: 16, borderRadius: P.RADIUS_CARD, borderWidth: 1, borderColor: P.CARD_BORDER, marginBottom: 20, alignItems: 'center' },
  chartDateText: { color: P.TEXT_MUT, fontSize: 10, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  emptyChartCard: { backgroundColor: P.CARD_BG, padding: 24, borderRadius: P.RADIUS_CARD, borderWidth: 1, borderColor: P.CARD_BORDER, marginBottom: 20, alignItems: 'center' },
  emptyChartTitle: { color: P.TEXT_MUT, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  emptyChartSub: { color: P.TEXT_SEC, fontSize: 12, textAlign: 'center', marginTop: 6 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, marginBottom: 0, padding: 14 },
  statTrendText: { fontSize: 16, fontWeight: '900', marginTop: 6 },
  statValText: { fontSize: 20, fontWeight: '900', color: P.TEXT_PRI, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', marginTop: 4 },
  prCard: { marginBottom: 20, padding: 16, borderColor: P.ACCENT_BORDER },
  prBadgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  prWeightText: { fontSize: 28, fontWeight: '900', color: P.TEXT_PRI, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  prMetaText: { fontSize: 12, color: P.TEXT_MUT, fontWeight: '700', marginTop: 2 },
  prWorkoutName: { fontSize: 13, fontWeight: '700', color: P.TEXT_PRI },
  prDateText: { fontSize: 11, color: P.TEXT_MUT, marginTop: 2 },
  logCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, marginBottom: 0 },
  logTitle: { fontSize: 14, fontWeight: '800', color: P.TEXT_PRI },
  logDate: { fontSize: 11, color: P.TEXT_MUT, marginTop: 2 },
  logMaxWeight: { fontSize: 14, fontWeight: '900', color: P.ACCENT },
  logEstOneRM: { fontSize: 11, color: P.TEXT_MUT, marginTop: 2 },
  emptyState: { paddingVertical: 40, alignItems: 'center' },
  emptyStateText: { color: P.TEXT_MUT, fontSize: 13, fontWeight: '600' },
});


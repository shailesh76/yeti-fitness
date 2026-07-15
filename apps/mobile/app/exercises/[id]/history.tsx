import { useRepositories } from '../../../hooks/useRepositories';
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Platform, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
/* removed supabase */
import { useAuthStore } from '../../../store/useAuthStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Line as SvgLine, Rect } from 'react-native-svg';

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

      // Fetch exercise metadata from local database
      const ex = await exerciseRepository.getExerciseById(id as string);

      if (ex) {
        setExerciseName(ex.name);
        setMuscleGroup(ex.muscle_group || '');
      }

      // Invoke exercise progression Edge Function via Repository Remote API
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

  // Render a responsive SVG line chart fallback
  const renderSVGChart = (history: HistoryPoint[]) => {
    if (history.length < 2) return null;
    
    // Sort oldest to newest for graphing
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
      <View className="items-center justify-center bg-black/45 p-4 rounded-3xl border border-white/[0.04] mb-6">
        <Svg width={width} height={height}>
          {/* Horizontal grid guide lines */}
          <SvgLine x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" />
          <SvgLine x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" />
          <SvgLine x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" />
          
          {/* Progression path line */}
          <Path d={pathD} fill="none" stroke="#39FF6A" strokeWidth="3" />
          
          {/* Graph node dots */}
          {points.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r="4" fill="#0a0d0a" stroke="#39FF6A" strokeWidth="2.5" />
          ))}
        </Svg>
        <View className="flex-row justify-between w-full px-8 mt-1">
          <Text className="text-gray-500 font-mono text-[8px] uppercase tracking-wider">{chartData[0].date}</Text>
          <Text className="text-gray-500 font-mono text-[8px] uppercase tracking-wider">{chartData[chartData.length - 1].date}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#0a0d0a] justify-center items-center">
        <ActivityIndicator size="large" color="#39FF6A" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0a0d0a]">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-6 pt-5">
        
        {/* Header navigation bar */}
        <View className="flex-row justify-between items-center mb-6">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="p-3 bg-white/[0.04] border border-white/[0.08] rounded-full"
          >
            <Text className="text-white text-xs font-black uppercase tracking-wider">Back</Text>
          </TouchableOpacity>
          
          {progressData?.pr && (
            <TouchableOpacity 
              onPress={handleShareResult}
              className="px-4 py-2 bg-[#39FF6A] rounded-full"
            >
              <Text className="text-[#0a0d0a] text-xs font-black uppercase tracking-wider">Share Rank</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Title */}
        <View className="mb-6">
          <Text className="text-[#39FF6A] text-[9px] font-black uppercase tracking-wider block">{muscleGroup}</Text>
          <Text className="text-2xl font-black text-white mt-1 leading-tight tracking-tight">{exerciseName}</Text>
          <Text className="text-gray-500 text-xs font-semibold mt-1">Estimated 1RM Progression & Metrics</Text>
        </View>

        {progressData ? (
          <View className="pb-12">
            
            {/* Progression Chart */}
            {progressData.history && progressData.history.length >= 2 ? (
              renderSVGChart(progressData.history)
            ) : (
              <View className="bg-black/35 py-8 rounded-3xl border border-white/[0.04] mb-6 items-center justify-center text-center px-4">
                <Text className="text-gray-500 text-xs font-black uppercase tracking-wider">Graph unavailable</Text>
                <Text className="text-gray-650 text-[10px] font-semibold mt-1 max-w-[200px]">Perform this exercise in at least 2 sessions to visualize progress.</Text>
              </View>
            )}

            {/* Performance Stats Cards */}
            <View className="flex-row gap-4 mb-6">
              
              {/* Trend Vector */}
              <View className="flex-1 bg-[#1c1b1b] border border-white/[0.04] p-4 rounded-3xl justify-between">
                <Text className="text-gray-500 text-[8px] font-black uppercase tracking-wider block">Trend Vector</Text>
                <Text className={`text-lg font-black uppercase tracking-tighter mt-2 ${
                  progressData.trend === 'Improving' ? 'text-[#39FF6A]' : 
                  progressData.trend === 'Declining' ? 'text-red-400' : 'text-gray-300'
                }`}>{progressData.trend}</Text>
              </View>

              {/* Peak 1RM PR */}
              <View className="flex-1 bg-[#1c1b1b] border border-white/[0.04] p-4 rounded-3xl justify-between">
                <Text className="text-gray-500 text-[8px] font-black uppercase tracking-wider block font-bold">Peak 1RM</Text>
                <Text className="text-[#00fbfb] text-xl font-mono font-black mt-2 tracking-tight">
                  {progressData.pr?.estimated_1rm || 0} <Text className="text-[10px] text-gray-500 font-bold font-sans">kg</Text>
                </Text>
              </View>

            </View>

            {/* All-time Best Personal Record (PR) Card */}
            {progressData.pr && (
              <View className="bg-[#1c1b1b] border border-yellow-500/10 rounded-3xl p-5 mb-6 relative overflow-hidden">
                <View className="absolute top-0 left-0 right-0 h-[2px] bg-yellow-500/25" />
                
                <Text className="text-yellow-400 text-[8px] font-black uppercase tracking-wider">🏆 Personal Record (PR)</Text>
                
                <View className="flex-row justify-between items-end mt-4">
                  <View>
                    <Text className="text-white text-3xl font-black font-mono leading-none tracking-tight">
                      {progressData.pr.weight_kg} <Text className="text-xs font-bold text-gray-500 font-sans">kg</Text>
                    </Text>
                    <Text className="text-gray-400 text-[10px] font-black uppercase tracking-wider mt-1 font-mono">
                      for {progressData.pr.reps} reps
                    </Text>
                  </View>
                  <View className="text-right">
                    <Text className="text-gray-500 text-[9px] font-semibold block">{progressData.pr.workout_name}</Text>
                    <Text className="text-gray-600 text-[8px] font-mono mt-0.5">{progressData.pr.date}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Chronological List History of Sets */}
            <Text className="text-white font-black text-xs uppercase tracking-wider mb-3.5 ml-1">Workout Logs</Text>
            <View className="space-y-2">
              {progressData.history.map((h, hidx) => (
                <View 
                  key={hidx} 
                  className="bg-[#1c1b1b] border border-white/[0.03] p-4 rounded-2xl flex-row justify-between items-center"
                >
                  <View className="flex-1 pr-4">
                    <Text className="text-white font-black text-sm tracking-tight">{h.workout_name}</Text>
                    <Text className="text-gray-550 font-mono text-[9px] mt-1">{h.date}</Text>
                  </View>

                  <View className="items-end">
                    <Text className="text-[#39FF6A] font-mono font-black text-sm">{h.max_weight} kg max</Text>
                    <Text className="text-gray-500 font-mono text-[8px] uppercase mt-0.5">Est. 1RM: {h.max_1rm} kg</Text>
                  </View>
                </View>
              ))}
            </View>

          </View>
        ) : (
          <View className="py-12 items-center justify-center text-center">
            <Text className="text-gray-500 text-sm font-semibold">No performance records logged yet, dude.</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

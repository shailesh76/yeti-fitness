import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { COLORS } from '../utils/designSystem';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <View className="flex-1 py-16 px-6 items-center justify-center text-center bg-[#1e1e1e]/60 rounded-3xl border border-white/[0.04] shadow-lg">
      <Text className="text-4xl mb-4">{icon}</Text>
      <Text className="text-white text-lg font-black tracking-tight mb-2 uppercase">{title}</Text>
      <Text className="text-gray-500 text-xs font-semibold max-w-[280px] leading-relaxed mb-6">
        {description}
      </Text>
      {action}
    </View>
  );
}

interface SkeletonLoaderProps {
  rows?: number;
  height?: number;
}

export function SkeletonLoader({ rows = 3, height = 80 }: SkeletonLoaderProps) {
  return (
    <View className="w-full gap-4 flex-col">
      {Array.from({ length: rows }).map((_, idx) => (
        <View 
          key={idx} 
          style={{ height }}
          className="w-full bg-[#1e1e1e]/60 border border-white/[0.04] rounded-3xl p-5 justify-center"
        >
          {/* Animated/pulse simulator effect using a simple layout structure */}
          <View className="w-1/2 h-3.5 bg-white/[0.06] rounded-md mb-2.5 animate-pulse" />
          <View className="w-3/4 h-2 bg-white/[0.03] rounded-md" />
        </View>
      ))}
    </View>
  );
}

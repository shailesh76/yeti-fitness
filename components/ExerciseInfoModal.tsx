import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Image, ScrollView, ActivityIndicator } from 'react-native';

interface ExerciseInfoModalProps {
  visible: boolean;
  onClose: () => void;
  exercise: {
    name: string;
    muscle_group?: string;
    instructions?: string;
    gif_url?: string;
  } | null;
}

export default function ExerciseInfoModal({ visible, onClose, exercise }: ExerciseInfoModalProps) {
  const [gifLoading, setGifLoading] = useState(true);

  if (!exercise) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        activeOpacity={1} 
        onPress={onClose} 
        className="flex-1 bg-black/80 justify-center items-center px-6"
      >
        <TouchableOpacity 
          activeOpacity={1} 
          className="bg-[#121214] w-full h-[70%] rounded-3xl border border-white/[0.04] overflow-hidden flex-col relative"
        >
          <View className="absolute top-0 left-0 right-0 h-[2px] bg-white/[0.02]" />
          {/* Header */}
          <View className="px-6 pt-5 pb-3 flex-row justify-between items-center border-b border-white/[0.04]">
            <View className="flex-1 pr-2">
              <Text className="text-white text-xl font-black tracking-tight" numberOfLines={1}>{exercise.name}</Text>
              <Text className="text-[#00FF88] text-[10px] font-black uppercase tracking-wider mt-0.5">{exercise.muscle_group || 'Full Body'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-2 bg-white/[0.04] border border-white/[0.08] rounded-full">
              <Text className="text-gray-400 font-bold text-xs">✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="flex-1 p-6">
            {/* GIF Media Panel */}
            {exercise.gif_url ? (
              <View className="relative w-full h-56 bg-black/40 rounded-2xl overflow-hidden mb-6 items-center justify-center border border-white/[0.04]">
                {gifLoading && (
                  <View className="absolute z-10">
                    <ActivityIndicator size="small" color="#00FF88" />
                  </View>
                )}
                <Image
                  source={{ uri: exercise.gif_url }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                  onLoadStart={() => setGifLoading(true)}
                  onLoadEnd={() => setGifLoading(false)}
                />
              </View>
            ) : (
              <View className="w-full h-24 bg-black/20 rounded-2xl mb-6 items-center justify-center border border-dashed border-white/[0.04]">
                <Text className="text-gray-500 text-sm font-bold">No demonstration animation available</Text>
              </View>
            )}

            {/* Instructions */}
            <Text className="text-white font-black text-xs uppercase tracking-wider mb-2 ml-1">How to Perform</Text>
            <Text className="text-gray-400 text-sm leading-relaxed font-semibold mb-6">
              {exercise.instructions || 'No instructions provided for this exercise.'}
            </Text>
          </ScrollView>

          {/* Action Button */}
          <View className="p-6 border-t border-white/[0.04] bg-[#0E0E10]">
            <TouchableOpacity 
              onPress={onClose} 
              className="bg-[#00FF88] rounded-xl py-3.5 items-center justify-center shadow-lg shadow-[#00FF88]/20"
            >
              <Text className="text-[#080808] font-black text-sm uppercase tracking-wider">Got it, Dude</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFoodStore } from '../store/useFoodStore';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';

const MEALS = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] as const;

export default function BarcodeScannerScreen() {
  const router = useRouter();
  const { scanBarcode } = useFoodStore();
  
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/food-diary');
    }
  };

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'>('BREAKFAST');
  const [syncing, setSyncing] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');

  // Scanning Red Line Animation
  const translateY = useSharedValue(-100);
  React.useEffect(() => {
    translateY.value = withRepeat(
      withTiming(100, { duration: 2000, easing: Easing.linear }),
      -1,
      true
    );
  }, []);

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!permission) {
    return (
      <View className="flex-1 bg-[#0a0d0a] justify-center items-center">
        <ActivityIndicator size="large" color="#39FF6A" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-[#0a0d0a] justify-center items-center px-6">
        <Text className="text-white text-lg font-black tracking-tight mb-2">Camera Permission Needed</Text>
        <Text className="text-gray-500 text-sm text-center mb-6 font-semibold">We need access to your camera to scan food barcodes.</Text>
        <TouchableOpacity 
          className="bg-[#39FF6A] px-8 py-4 rounded-2xl shadow-lg shadow-[#39FF6A]/20"
          onPress={requestPermission}
        >
          <Text className="text-[#000000] font-black text-base uppercase tracking-wider">Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned || syncing) return;
    setScanned(true);
    setSyncing(true);

    try {
      const logged = await scanBarcode(data, selectedMeal);
      setSyncing(false);

      if (logged) {
        if (Platform.OS === 'web') {
          alert(`Product Logged!\n${logged.food?.name} has been added to your ${selectedMeal.toLowerCase()}.`);
          handleBack();
        } else {
          Alert.alert(
            'Product Logged!',
            `${logged.food?.name} has been added to your ${selectedMeal.toLowerCase()}.`,
            [{ text: 'OK', onPress: handleBack }]
          );
        }
      } else {
        Alert.alert(
          'Product Not Found',
          'This barcode was not found in our database or OpenFoodFacts. Would you like to log a custom item?',
          [
            { text: 'Cancel', onPress: () => setScanned(false) },
            { 
              text: 'Log Custom', 
              onPress: () => router.replace({ pathname: '/food-search', params: { mealType: selectedMeal } })
            }
          ]
        );
      }
    } catch (e) {
      setSyncing(false);
      setScanned(false);
      Alert.alert('Scanner Error', 'Failed to read barcode information. Please try again.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0a0d0a]">
      {/* Header */}
      <View className="px-6 pt-5 pb-5 flex-row items-center border-b border-white/[0.04] bg-[#0a0d0a] z-10">
        <TouchableOpacity 
          onPress={handleBack} 
          className="mr-4 p-2.5 bg-white/[0.04] border border-[#39FF6A]/20 rounded-full"
        >
          <Text className="text-[#39FF6A] font-black">←</Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-2xl font-black text-white tracking-tight">Barcode Scanner</Text>
          <Text className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Point camera at barcode</Text>
        </View>
      </View>

      {/* Target Meal Type Selector */}
      <View className="bg-[#0a0d0a] py-3 px-4 flex-row gap-2 border-b border-white/[0.04] z-10">
        {MEALS.map((meal) => {
          const isSelected = selectedMeal === meal;
          return (
            <TouchableOpacity
              key={meal}
              onPress={() => setSelectedMeal(meal)}
              className={`flex-1 py-2 rounded-xl border items-center justify-center ${
                isSelected ? 'bg-[#39FF6A]/10 border-[#39FF6A]' : 'bg-black/40 border-white/[0.04]'
              }`}
            >
              <Text className={`font-black text-[9px] uppercase tracking-wider ${isSelected ? 'text-[#39FF6A]' : 'text-gray-500'}`}>
                {meal}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Scanner viewfinder / Web Manual Input */}
      {Platform.OS === 'web' ? (
        <View className="flex-1 justify-center items-center px-6 bg-[#0a0d0a]">
          <View className="w-full max-w-md bg-[#1c1b1b] p-6 rounded-3xl border border-white/[0.04] gap-4">
            <Text className="text-white text-lg font-black tracking-tight">Manual Barcode Entry</Text>
            <Text className="text-gray-500 text-xs font-semibold">Webcams are low resolution for barcodes. Type the barcode digits below to query OpenFoodFacts.</Text>
            
            <TextInput
              className="bg-black/40 text-white px-4 py-3.5 rounded-xl border border-white/[0.04] text-base font-bold text-center"
              placeholder="e.g. 5449000000996"
              placeholderTextColor="#444"
              value={manualBarcode}
              onChangeText={setManualBarcode}
              keyboardType="numeric"
            />

            <TouchableOpacity
              onPress={() => handleBarcodeScanned({ data: manualBarcode })}
              disabled={syncing || !manualBarcode}
              className="bg-[#39FF6A] py-4 rounded-xl items-center justify-center shadow-lg shadow-[#39FF6A]/20"
            >
              {syncing ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text className="text-[#000000] font-black text-sm uppercase tracking-wider">Search & Log Product</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View className="flex-1 justify-center items-center relative bg-black">
          <CameraView
            style={StyleSheet.absoluteFill}
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'],
            }}
          />

          {/* Viewfinder Target Mask overlay */}
          <View className="w-72 h-48 border-2 border-white/20 rounded-3xl justify-center items-center relative overflow-hidden bg-transparent">
            {/* Animated red laser scanning line */}
            <Animated.View style={lineStyle} className="h-0.5 w-full bg-[#39FF6A]" />
            
            {/* Loading overlay if fetching */}
            {syncing && (
              <View className="absolute inset-0 bg-black/70 justify-center items-center">
                <ActivityIndicator size="large" color="#39FF6A" />
                <Text className="text-white text-xs font-black uppercase tracking-wider mt-3">Syncing database...</Text>
              </View>
            )}
          </View>

          <Text className="text-white/60 text-xs font-bold uppercase tracking-widest absolute bottom-24 text-center px-6">
            Align barcode inside the central frame
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

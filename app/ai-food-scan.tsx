import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert, TextInput, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useFoodStore, Food } from '../store/useFoodStore';
import Animated, { FadeIn, FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';

const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] as const;

export default function AiFoodScanScreen() {
  const router = useRouter();
  const { analyzeFoodPhoto, addFood, logMeal } = useFoodStore();
  const cameraRef = useRef<CameraView>(null);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/food-diary');
    }
  };

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(Platform.OS !== 'web');
  const [imageUri, setImageUri] = useState<string | null>(null);
  
  // States during analysis
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'>('BREAKFAST');
  
  // Result Editing State
  const [detectedItems, setDetectedItems] = useState<Omit<Food, 'id'>[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Scanning laser animation
  const laserY = useSharedValue(-120);
  React.useEffect(() => {
    if (analyzing) {
      laserY.value = withRepeat(
        withTiming(120, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    }
  }, [analyzing]);

  const laserStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: laserY.value }],
  }));

  if (!cameraPermission) {
    return (
      <View className="flex-1 bg-[#0a0d0a] justify-center items-center">
        <ActivityIndicator size="large" color="#39FF6A" />
      </View>
    );
  }

  const handleCapture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          skipProcessing: false,
        });
        if (photo?.uri) {
          setImageUri(photo.uri);
          setShowCamera(false);
          processImageAndAnalyze(photo.uri);
        }
      } catch (e) {
        Alert.alert('Capture Error', 'Could not capture photo. Please try again.');
      }
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setImageUri(result.assets[0].uri);
        setShowCamera(false);
        processImageAndAnalyze(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Pick Error', 'Could not read image from library.');
    }
  };

  const getBase64FromUri = async (uri: string): Promise<string> => {
    if (uri.startsWith('data:')) {
      return uri.split('base64,')[1];
    }
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split('base64,')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const processImageAndAnalyze = async (uri: string) => {
    setAnalyzing(true);
    try {
      let base64Data = '';

      if (Platform.OS === 'web') {
        base64Data = await getBase64FromUri(uri);
      } else {
        // Compress image to max 1024 width on a native thread
        const manipulated = await manipulateAsync(
          uri,
          [{ resize: { width: 1024 } }],
          { compress: 0.7, format: SaveFormat.JPEG }
        );
        
        // Convert to base64 using fetch + FileReader for reliability on native devices
        const response = await fetch(manipulated.uri);
        const blob = await response.blob();
        base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = (reader.result as string).split('base64,')[1];
            resolve(res || '');
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      if (base64Data) {
        const parsedItems = await analyzeFoodPhoto(base64Data);
        if (parsedItems.length > 0) {
          setDetectedItems(parsedItems);
        } else {
          Alert.alert('AI Analysis', 'No food items could be identified. Try another angle or background.', [
            { text: 'Retry', onPress: () => { setShowCamera(Platform.OS !== 'web'); setImageUri(null); } }
          ]);
        }
      } else {
        throw new Error('Image base64 processing yielded empty result');
      }
    } catch (err) {
      console.error(err);
      Alert.alert(
        'Analysis Failed', 
        'Could not analyze food photo. Please ensure your camera permission is active and try again.'
      );
      setShowCamera(Platform.OS !== 'web');
      setImageUri(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveAll = async () => {
    if (detectedItems.length === 0) return;

    for (const item of detectedItems) {
      // Create local food database entry
      const addedFood = await addFood({
        name: item.name,
        brand: item.brand || 'AI Estimate',
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        serving_size: item.serving_size,
      });

      // Log meal to today's diary
      await logMeal({
        food_id: addedFood.id,
        meal_type: selectedMeal,
        servings: 1,
        logged_at: Date.now(),
        food: addedFood,
      });
    }

    if (Platform.OS === 'web') {
      alert('Gains Synced!\nAll identified items have been added to your log diary.');
      router.replace('/food-diary');
    } else {
      Alert.alert(
        'Gains Synced!',
        'All identified items have been added to your log diary.',
        [{ text: 'Great, Yeti', onPress: () => router.replace('/food-diary') }]
      );
    }
  };

  const updateItemField = (index: number, field: keyof Omit<Food, 'id'>, value: string) => {
    setDetectedItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };

      if (field === 'calories') {
        item.calories = parseInt(value) || 0;
      } else if (field === 'protein') {
        item.protein = parseFloat(value) || 0;
      } else if (field === 'carbs') {
        item.carbs = parseFloat(value) || 0;
      } else if (field === 'fat') {
        item.fat = parseFloat(value) || 0;
      } else if (field === 'name') {
        item.name = value;
      } else if (field === 'serving_size') {
        item.serving_size = value;
      }

      updated[index] = item;
      return updated;
    });
  };

  const handleDeleteItem = (index: number) => {
    setDetectedItems(prev => prev.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
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
          <Text className="text-2xl font-black text-white tracking-tight">AI Food Tracker</Text>
          <Text className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Secure Image Telemetry</Text>
        </View>
      </View>

      {/* Target Meal Type Selector (Before Capture/Show results) */}
      {showCamera && (
        <View className="bg-[#0a0d0a] py-3 px-4 flex-row gap-2 border-b border-white/[0.04] z-10">
          {MEAL_TYPES.map((meal) => {
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
      )}

      {showCamera ? (
        /* Camera Viewfinder Mode */
        !cameraPermission.granted ? (
          <View className="flex-1 justify-center items-center px-6">
            <Text className="text-white text-lg font-black tracking-tight mb-2">Camera Permission Required</Text>
            <Text className="text-gray-500 text-sm text-center mb-6 font-semibold">We need access to your camera to snap meal photos.</Text>
            <TouchableOpacity 
              className="bg-[#39FF6A] px-8 py-4 rounded-2xl shadow-lg shadow-[#39FF6A]/20"
              onPress={requestCameraPermission}
            >
              <Text className="text-[#000000] font-black text-base uppercase tracking-wider">Grant Camera</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-1 relative bg-black">
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
            
            {/* Viewfinder Corner Overlays */}
            <View className="absolute inset-x-12 inset-y-36 border border-white/10 rounded-[40px] items-center justify-center">
              <Text className="text-white/40 text-xs font-black uppercase tracking-widest text-center px-4">
                Frame your plate here
              </Text>
            </View>

            {/* Bottom Camera Action Row */}
            <View className="absolute bottom-10 left-0 right-0 px-8 flex-row justify-between items-center">
              <TouchableOpacity 
                onPress={handlePickImage}
                className="w-14 h-14 bg-black/60 border border-white/10 rounded-full justify-center items-center"
              >
                <Text className="text-white text-lg">🖼️</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={handleCapture}
                className="w-20 h-20 bg-white rounded-full border-4 border-black/40 justify-center items-center shadow-2xl"
              >
                <View className="w-14 h-14 bg-[#39FF6A] rounded-full" />
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => setShowCamera(false)}
                className="w-14 h-14 bg-black/60 border border-white/10 rounded-full justify-center items-center"
              >
                <Text className="text-white text-sm font-black">✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )
      ) : (
        /* Image Preview / Processing & Results Editor */
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-6 pt-6 w-full max-w-2xl self-center">
          {!imageUri ? (
            /* Web upload box or select files option */
            <View className="flex-1 justify-center items-center py-12 bg-[#0a0d0a]">
              <TouchableOpacity 
                onPress={handlePickImage}
                className="w-full max-w-md bg-[#1c1b1b] border-2 border-dashed border-white/[0.08] p-10 rounded-3xl items-center gap-4"
              >
                <Text className="text-4xl">📤</Text>
                <Text className="text-white text-base font-black tracking-tight">Upload Food Image</Text>
                <Text className="text-gray-500 text-xs text-center font-semibold px-4">
                  Select a photo of your meal from your computer to analyze the macros.
                </Text>
                <View className="bg-[#39FF6A]/10 border border-[#39FF6A]/20 px-6 py-3 rounded-xl mt-2">
                  <Text className="text-[#39FF6A] font-black text-xs uppercase tracking-wider">Choose File</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => setShowCamera(true)}
                className="mt-6"
              >
                <Text className="text-gray-500 hover:text-white text-xs font-black uppercase tracking-wider">Or Use Webcam 📷</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View className="relative w-full h-64 bg-black/40 rounded-3xl overflow-hidden mb-6 border border-white/[0.04] justify-center items-center">
                <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                
                {/* Scanning visual laser line effect */}
                {analyzing && (
                  <>
                    <View className="absolute inset-0 bg-black/30" />
                    <Animated.View style={laserStyle} className="absolute left-0 right-0 h-1 bg-[#39FF6A] shadow-lg shadow-[#39FF6A]" />
                  </>
                )}
              </View>

              {analyzing ? (
                <View className="py-8 justify-center items-center">
                  <ActivityIndicator size="large" color="#39FF6A" />
                  <Text className="text-white text-base font-black tracking-tight mt-4">Analyzing Food Image</Text>
                  <Text className="text-gray-500 text-xs mt-1 font-semibold">Running secure AI Vision telemetry...</Text>
                </View>
              ) : (
            /* Results editor */
            <Animated.View entering={FadeIn.duration(400)}>
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-gray-500 text-xs font-bold uppercase tracking-wider">Identified Items</Text>
                <Text className="text-[#39FF6A] text-xs font-bold uppercase tracking-wider">Target: {selectedMeal}</Text>
              </View>

              {detectedItems.length === 0 ? (
                <View className="bg-[#1c1b1b] p-8 rounded-3xl border border-white/[0.04] items-center">
                  <Text className="text-gray-500 text-center font-bold mb-4">Failed to detect any food.</Text>
                  <TouchableOpacity 
                    className="bg-[#39FF6A]/10 border border-[#39FF6A]/20 px-6 py-3 rounded-xl"
                    onPress={() => { setShowCamera(true); setImageUri(null); }}
                  >
                    <Text className="text-[#39FF6A] font-black text-xs uppercase tracking-wider">Try Again</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="mb-10 gap-4">
                  {detectedItems.map((item, index) => {
                    const isEditing = editingIndex === index;
                    return (
                      <View key={index} className="bg-[#1c1b1b] p-5 rounded-3xl border border-white/[0.04] relative overflow-hidden">
                        <View className="absolute top-0 left-0 right-0 h-[2px] bg-white/[0.02]" />
                        
                        {isEditing ? (
                          /* Expanded inputs card */
                          <View className="gap-4">
                            <View className="flex-row justify-between items-center">
                              <TextInput
                                className="bg-black/40 text-white px-3 py-2 rounded-lg border border-white/[0.04] text-base font-black flex-1 mr-2"
                                value={item.name}
                                onChangeText={(val) => updateItemField(index, 'name', val)}
                              />
                              <TouchableOpacity onPress={() => setEditingIndex(null)} className="p-1 bg-[#39FF6A]/10 border border-[#39FF6A]/20 rounded-lg">
                                <Text className="text-[#39FF6A] text-xs font-bold px-2 py-1">Done</Text>
                              </TouchableOpacity>
                            </View>

                            <View className="flex-row gap-2">
                              <View className="flex-1">
                                <Text className="text-gray-500 text-[9px] font-black uppercase tracking-wider mb-1">Calories</Text>
                                <TextInput
                                  className="bg-black/40 text-white text-center py-2 rounded-lg border border-white/[0.04] font-bold"
                                  keyboardType="numeric"
                                  value={String(item.calories)}
                                  onChangeText={(val) => updateItemField(index, 'calories', val)}
                                />
                              </View>
                              <View className="flex-1">
                                <Text className="text-gray-500 text-[9px] font-black uppercase tracking-wider mb-1">Protein (g)</Text>
                                <TextInput
                                  className="bg-black/40 text-white text-center py-2 rounded-lg border border-white/[0.04] font-bold"
                                  keyboardType="numeric"
                                  value={String(item.protein)}
                                  onChangeText={(val) => updateItemField(index, 'protein', val)}
                                />
                              </View>
                              <View className="flex-1">
                                <Text className="text-gray-500 text-[9px] font-black uppercase tracking-wider mb-1">Carbs (g)</Text>
                                <TextInput
                                  className="bg-black/40 text-white text-center py-2 rounded-lg border border-white/[0.04] font-bold"
                                  keyboardType="numeric"
                                  value={String(item.carbs)}
                                  onChangeText={(val) => updateItemField(index, 'carbs', val)}
                                />
                              </View>
                              <View className="flex-1">
                                <Text className="text-gray-500 text-[9px] font-black uppercase tracking-wider mb-1">Fat (g)</Text>
                                <TextInput
                                  className="bg-black/40 text-white text-center py-2 rounded-lg border border-white/[0.04] font-bold"
                                  keyboardType="numeric"
                                  value={String(item.fat)}
                                  onChangeText={(val) => updateItemField(index, 'fat', val)}
                                />
                              </View>
                            </View>

                            <View className="flex-row justify-between items-center">
                              <TextInput
                                className="bg-black/40 text-white px-3 py-2 rounded-lg border border-white/[0.04] text-xs font-semibold w-32"
                                placeholder="Serving Size"
                                value={item.serving_size}
                                onChangeText={(val) => updateItemField(index, 'serving_size', val)}
                              />
                              <TouchableOpacity onPress={() => handleDeleteItem(index)}>
                                <Text className="text-red-400 font-bold text-xs uppercase tracking-wider">Delete Item</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          /* Compact visual view */
                          <View className="flex-row justify-between items-center">
                            <View className="flex-1 pr-2">
                              <Text className="text-white text-base font-black tracking-tight">{item.name}</Text>
                              <Text className="text-gray-550 text-[10px] font-bold uppercase mt-0.5">
                                Serving: {item.serving_size} • {item.calories} kcal
                              </Text>
                              <Text className="text-[#39FF6A] text-[9px] font-black uppercase tracking-wider mt-1">
                                P: {item.protein}g • C: {item.carbs}g • F: {item.fat}g
                              </Text>
                            </View>
                            
                            <View className="flex-row gap-2">
                              <TouchableOpacity 
                                onPress={() => setEditingIndex(index)}
                                className="bg-[#1C1C1F] border border-white/[0.04] px-3.5 py-2 rounded-xl"
                              >
                                <Text className="text-white font-black text-xs uppercase tracking-wider">Edit</Text>
                              </TouchableOpacity>
                              <TouchableOpacity 
                                onPress={() => handleDeleteItem(index)}
                                className="bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl justify-center"
                              >
                                <Text className="text-red-400 font-bold text-xs">✕</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}

                  {/* Actions Row */}
                  <View className="flex-row gap-4 mt-4">
                    <TouchableOpacity 
                      className="flex-1 bg-white/[0.02] border border-white/[0.08] py-4 rounded-xl items-center justify-center"
                      onPress={() => { setShowCamera(Platform.OS !== 'web'); setImageUri(null); setDetectedItems([]); }}
                    >
                      <Text className="text-white font-black text-xs uppercase tracking-wider">Retake</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      className="flex-1 bg-[#39FF6A] py-4 rounded-xl items-center justify-center shadow-lg shadow-[#39FF6A]/20"
                      onPress={handleSaveAll}
                    >
                      <Text className="text-[#000000] font-black text-xs uppercase tracking-wider">Confirm All</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </Animated.View>
          )}
          </>
        )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

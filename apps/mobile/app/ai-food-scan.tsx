import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert, TextInput, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useFoodStore, Food } from '../store/useFoodStore';
import Animated, { FadeIn, FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { P, glowStyle, sharedStyles } from '../constants/premiumTheme';

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
  
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'>('BREAKFAST');
  
  const [detectedItems, setDetectedItems] = useState<Omit<Food, 'id'>[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={P.ACCENT} />
        </View>
      </SafeAreaView>
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
        const manipulated = await manipulateAsync(
          uri,
          [{ resize: { width: 1024 } }],
          { compress: 0.7, format: SaveFormat.JPEG }
        );
        
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
          const mappedItems = parsedItems.map(item => ({
            name: item.name || 'Unnamed food',
            brand: item.brand || 'AI Estimate',
            calories: item.calories || 0,
            protein: item.protein || 0,
            carbs: item.carbs || 0,
            fat: item.fat || 0,
            serving_size: item.serving_size || '100g',
            barcode: item.barcode || '',
          }));
          setDetectedItems(mappedItems);
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
      const addedFood = await addFood({
        name: item.name,
        brand: item.brand || 'AI Estimate',
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        serving_size: item.serving_size,
      });

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
        item.calories = parseInt(value, 10) || 0;
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
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={handleBack} 
          style={styles.backBtn}
        >
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>AI Food Tracker</Text>
          <Text style={styles.headerSub}>Secure Image Telemetry</Text>
        </View>
      </View>

      {/* Target Meal Type Selector */}
      {showCamera && (
        <View style={styles.mealSelectorRow}>
          {MEAL_TYPES.map((meal) => {
            const isSelected = selectedMeal === meal;
            return (
              <TouchableOpacity
                key={meal}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`Target meal ${meal}`}
                onPress={() => setSelectedMeal(meal)}
                style={[styles.mealChip, isSelected && styles.mealChipSelected]}
              >
                <Text style={[styles.mealChipText, isSelected && { color: P.ACCENT }]}>
                  {meal}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {showCamera ? (
        !cameraPermission.granted ? (
          <View style={styles.centered}>
            <Text style={styles.permTitle}>Camera Permission Required</Text>
            <Text style={styles.permSub}>We need access to your camera to snap meal photos.</Text>
            <TouchableOpacity 
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Grant Camera Permission"
              style={[styles.primaryBtn, glowStyle(P.ACCENT, 12, 0.3)]}
              onPress={requestCameraPermission}
            >
              <Text style={styles.primaryBtnText}>Grant Camera</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cameraWrapper}>
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
            <View style={styles.viewfinderFrame}>
              <Text style={styles.viewfinderText}>Frame your plate here</Text>
            </View>
            <View style={styles.cameraActionRow}>
              <TouchableOpacity 
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Upload photo from photo library"
                onPress={handlePickImage}
                style={styles.camIconBtn}
              >
                <Ionicons name="images-outline" size={22} color={P.TEXT_PRI} />
              </TouchableOpacity>

              <TouchableOpacity 
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Snap photo of meal"
                onPress={handleCapture}
                style={styles.shutterOuterBtn}
              >
                <View style={styles.shutterInnerBtn} />
              </TouchableOpacity>

              <TouchableOpacity 
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Close camera"
                onPress={() => setShowCamera(false)}
                style={styles.camIconBtn}
              >
                <Ionicons name="close" size={22} color={P.TEXT_PRI} />
              </TouchableOpacity>
            </View>
          </View>
        )
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {!imageUri ? (
            <View style={styles.uploadContainer}>
              <TouchableOpacity 
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Upload food image from device"
                onPress={handlePickImage}
                style={styles.uploadCard}
              >
                <Ionicons name="cloud-upload-outline" size={40} color={P.ACCENT} />
                <Text style={styles.uploadTitle}>Upload Food Image</Text>
                <Text style={styles.uploadSub}>
                  Select a photo of your meal from your computer to analyze the macros.
                </Text>
                <View style={styles.uploadPill}>
                  <Text style={styles.uploadPillText}>Choose File</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Use camera"
                onPress={() => setShowCamera(true)}
                style={{ marginTop: 20 }}
              >
                <Text style={styles.webcamText}>Or Use Camera 📷</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.imagePreviewWrapper}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
                {analyzing && (
                  <>
                    <View style={styles.scanOverlay} />
                    <Animated.View style={[styles.laserLine, laserStyle]} />
                  </>
                )}
              </View>

              {analyzing ? (
                <View style={styles.analyzingBox}>
                  <ActivityIndicator size="large" color={P.ACCENT} />
                  <Text style={styles.analyzingTitle}>Analyzing Food Image</Text>
                  <Text style={styles.analyzingSub}>Running secure AI Vision telemetry...</Text>
                </View>
              ) : (
                <Animated.View entering={FadeIn.duration(400)}>
                  <View style={sharedStyles.rowBetween}>
                    <Text style={sharedStyles.labelCaps}>Identified Items</Text>
                    <Text style={[sharedStyles.labelCaps, { color: P.ACCENT }]}>Target: {selectedMeal}</Text>
                  </View>

                  {detectedItems.length === 0 ? (
                    <View style={[sharedStyles.card, styles.emptyResultCard]}>
                      <Text style={styles.emptyResultText}>Failed to detect any food.</Text>
                      <TouchableOpacity 
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel="Try photo scan again"
                        style={[styles.primaryBtn, { minHeight: 44, marginTop: 12 }]}
                        onPress={() => { setShowCamera(true); setImageUri(null); }}
                      >
                        <Text style={styles.primaryBtnText}>Try Again</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ marginBottom: 40, gap: 12, marginTop: 12 }}>
                      {detectedItems.map((item, index) => {
                        const isEditing = editingIndex === index;
                        return (
                          <View key={index} style={[sharedStyles.card, { marginBottom: 0 }]}>
                            {isEditing ? (
                              <View style={{ gap: 10 }}>
                                <View style={sharedStyles.rowBetween}>
                                  <TextInput
                                    style={styles.editInputName}
                                    value={item.name}
                                    onChangeText={(val) => updateItemField(index, 'name', val)}
                                    selectTextOnFocus
                                  />
                                  <TouchableOpacity 
                                    onPress={() => setEditingIndex(null)}
                                    style={styles.doneBtn}
                                  >
                                    <Text style={styles.doneBtnText}>Done</Text>
                                  </TouchableOpacity>
                                </View>

                                <View style={styles.macroInputsRow}>
                                  <View style={{ flex: 1 }}>
                                    <Text style={styles.macroInputLabel}>Calories</Text>
                                    <TextInput
                                      style={styles.editInputNum}
                                      keyboardType="number-pad"
                                      value={String(item.calories)}
                                      onChangeText={(val) => updateItemField(index, 'calories', val)}
                                    />
                                  </View>
                                  <View style={{ flex: 1 }}>
                                    <Text style={styles.macroInputLabel}>Protein (g)</Text>
                                    <TextInput
                                      style={styles.editInputNum}
                                      keyboardType="decimal-pad"
                                      value={String(item.protein)}
                                      onChangeText={(val) => updateItemField(index, 'protein', val)}
                                    />
                                  </View>
                                  <View style={{ flex: 1 }}>
                                    <Text style={styles.macroInputLabel}>Carbs (g)</Text>
                                    <TextInput
                                      style={styles.editInputNum}
                                      keyboardType="decimal-pad"
                                      value={String(item.carbs)}
                                      onChangeText={(val) => updateItemField(index, 'carbs', val)}
                                    />
                                  </View>
                                  <View style={{ flex: 1 }}>
                                    <Text style={styles.macroInputLabel}>Fat (g)</Text>
                                    <TextInput
                                      style={styles.editInputNum}
                                      keyboardType="decimal-pad"
                                      value={String(item.fat)}
                                      onChangeText={(val) => updateItemField(index, 'fat', val)}
                                    />
                                  </View>
                                </View>

                                <View style={sharedStyles.rowBetween}>
                                  <TextInput
                                    style={styles.editInputServing}
                                    placeholder="Serving Size"
                                    placeholderTextColor={P.TEXT_MUT}
                                    value={item.serving_size}
                                    onChangeText={(val) => updateItemField(index, 'serving_size', val)}
                                  />
                                  <TouchableOpacity onPress={() => handleDeleteItem(index)}>
                                    <Text style={styles.deleteLinkText}>Delete Item</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            ) : (
                              <View style={sharedStyles.rowBetween}>
                                <View style={{ flex: 1, paddingRight: 8 }}>
                                  <Text style={styles.itemName}>{item.name}</Text>
                                  <Text style={styles.itemMeta}>
                                    Serving: {item.serving_size} • {item.calories} kcal
                                  </Text>
                                  <Text style={styles.itemMacros}>
                                    P: {item.protein}g • C: {item.carbs}g • F: {item.fat}g
                                  </Text>
                                </View>
                                
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                  <TouchableOpacity 
                                    onPress={() => setEditingIndex(index)}
                                    style={styles.itemEditBtn}
                                  >
                                    <Text style={styles.itemEditBtnText}>Edit</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity 
                                    onPress={() => handleDeleteItem(index)}
                                    style={styles.itemDelBtn}
                                  >
                                    <Ionicons name="close" size={14} color={P.RED} />
                                  </TouchableOpacity>
                                </View>
                              </View>
                            )}
                          </View>
                        );
                      })}

                      {/* Actions Row */}
                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                        <TouchableOpacity 
                          style={styles.retakeBtn}
                          onPress={() => { setShowCamera(Platform.OS !== 'web'); setImageUri(null); setDetectedItems([]); }}
                        >
                          <Text style={styles.retakeBtnText}>Retake</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={[styles.primaryBtn, glowStyle(P.ACCENT, 12, 0.3)]}
                          onPress={handleSaveAll}
                        >
                          <Text style={styles.primaryBtnText}>Confirm All</Text>
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: P.BG },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: P.CARD_BORDER },
  backBtn: { width: 44, height: 44, minHeight: 44, borderRadius: 22, backgroundColor: P.CARD_BG, borderWidth: 1, borderColor: P.CARD_BORDER, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  backBtnText: { color: P.ACCENT, fontSize: 20, fontWeight: '800' },
  headerTitle: { fontSize: 22, fontWeight: '900', color: P.TEXT_PRI, letterSpacing: -0.5 },
  headerSub: { fontSize: 11, color: P.TEXT_MUT, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  mealSelectorRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: P.CARD_BORDER },
  mealChip: { flex: 1, minHeight: 44, paddingVertical: 8, borderRadius: 12, backgroundColor: P.CARD_BG, borderWidth: 1, borderColor: P.CARD_BORDER, alignItems: 'center', justifyContent: 'center' },
  mealChipSelected: { backgroundColor: P.ACCENT_DIM, borderColor: P.ACCENT_BORDER },
  mealChipText: { fontSize: 10, fontWeight: '800', color: P.TEXT_MUT, textTransform: 'uppercase', letterSpacing: 0.5 },
  permTitle: { fontSize: 18, fontWeight: '900', color: P.TEXT_PRI, textAlign: 'center' },
  permSub: { fontSize: 13, color: P.TEXT_SEC, textAlign: 'center', marginTop: 8, marginBottom: 20 },
  primaryBtn: { flex: 1, backgroundColor: P.ACCENT, borderRadius: P.RADIUS_PILL, minHeight: 52, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#0B0B0F', fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  cameraWrapper: { flex: 1, backgroundColor: '#000', position: 'relative' },
  viewfinderFrame: { position: 'absolute', top: '25%', left: 40, right: 40, height: 260, borderRadius: 30, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  viewfinderText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  cameraActionRow: { position: 'absolute', bottom: 30, left: 30, right: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  camIconBtn: { width: 52, height: 52, minHeight: 44, borderRadius: 26, backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: P.CARD_BORDER, alignItems: 'center', justifyContent: 'center' },
  shutterOuterBtn: { width: 76, height: 76, borderRadius: 38, backgroundColor: P.TEXT_PRI, alignItems: 'center', justifyContent: 'center' },
  shutterInnerBtn: { width: 58, height: 58, borderRadius: 29, backgroundColor: P.ACCENT },
  uploadContainer: { paddingVertical: 40, alignItems: 'center' },
  uploadCard: { width: '100%', maxWidth: 380, backgroundColor: P.CARD_BG, borderWidth: 1, borderColor: P.CARD_BORDER, borderRadius: P.RADIUS_CARD, padding: 32, alignItems: 'center', gap: 12 },
  uploadTitle: { fontSize: 18, fontWeight: '900', color: P.TEXT_PRI },
  uploadSub: { fontSize: 12, color: P.TEXT_MUT, textAlign: 'center', lineHeight: 18 },
  uploadPill: { backgroundColor: P.ACCENT_DIM, borderWidth: 1, borderColor: P.ACCENT_BORDER, borderRadius: P.RADIUS_PILL, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8 },
  uploadPillText: { color: P.ACCENT, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  webcamText: { color: P.TEXT_MUT, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  imagePreviewWrapper: { width: '100%', height: 240, borderRadius: P.RADIUS_CARD, overflow: 'hidden', marginBottom: 20, backgroundColor: P.CARD_BG, borderWidth: 1, borderColor: P.CARD_BORDER, position: 'relative' },
  previewImage: { width: '100%', height: '100%' },
  scanOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  laserLine: { position: 'absolute', left: 0, right: 0, height: 3, backgroundColor: P.ACCENT },
  analyzingBox: { paddingVertical: 32, alignItems: 'center' },
  analyzingTitle: { color: P.TEXT_PRI, fontSize: 16, fontWeight: '900', marginTop: 12 },
  analyzingSub: { color: P.TEXT_MUT, fontSize: 12, marginTop: 4 },
  emptyResultCard: { alignItems: 'center', padding: 24 },
  emptyResultText: { color: P.TEXT_MUT, fontSize: 13, fontWeight: '700' },
  editInputName: { flex: 1, backgroundColor: P.BG, color: P.TEXT_PRI, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: P.CARD_BORDER, fontSize: 15, fontWeight: '800', marginRight: 8 },
  doneBtn: { backgroundColor: P.ACCENT_DIM, borderWidth: 1, borderColor: P.ACCENT_BORDER, paddingHorizontal: 14, paddingVertical: 8, minHeight: 44, justifyContent: 'center', borderRadius: 10 },
  doneBtnText: { color: P.ACCENT, fontSize: 12, fontWeight: '900' },
  macroInputsRow: { flexDirection: 'row', gap: 8, marginVertical: 8 },
  macroInputLabel: { fontSize: 9, color: P.TEXT_MUT, fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
  editInputNum: { backgroundColor: P.BG, color: P.TEXT_PRI, textAlign: 'center', paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: P.CARD_BORDER, fontSize: 13, fontWeight: '800' },
  editInputServing: { width: 140, backgroundColor: P.BG, color: P.TEXT_PRI, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: P.CARD_BORDER, fontSize: 12, fontWeight: '600' },
  deleteLinkText: { color: P.RED, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  itemName: { fontSize: 15, fontWeight: '900', color: P.TEXT_PRI },
  itemMeta: { fontSize: 11, color: P.TEXT_MUT, fontWeight: '700', marginTop: 2 },
  itemMacros: { fontSize: 11, color: P.ACCENT, fontWeight: '900', marginTop: 4 },
  itemEditBtn: { paddingHorizontal: 14, paddingVertical: 8, minHeight: 44, justifyContent: 'center', backgroundColor: P.CARD_BG, borderWidth: 1, borderColor: P.CARD_BORDER, borderRadius: 10 },
  itemEditBtnText: { color: P.TEXT_PRI, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  itemDelBtn: { width: 44, height: 44, minHeight: 44, borderRadius: 10, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', alignItems: 'center', justifyContent: 'center' },
  retakeBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: P.CARD_BORDER, borderRadius: P.RADIUS_PILL, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  retakeBtnText: { color: P.TEXT_PRI, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
});


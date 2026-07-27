/**
 * ai-food-scan.tsx
 * AI Food Scanner — Complete redesign matching reference UI:
 *   • Camera viewfinder with blue corner brackets + scanning animation
 *   • AI Analysis Result card (High Confidence badge, food name, kcal)
 *   • 4-macro breakdown grid (Protein / Carbs / Fats / Fiber)
 *   • View Full Nutrition link
 *   • Add to Meal selector (Breakfast / Lunch / Dinner / Snack)
 *   • Add to [Meal] + Edit Food action buttons
 *   • Yeti Tip mascot card
 *   • Scan History section
 *   • AppShell bottom navigation
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  StyleSheet,
  Platform,
  useWindowDimensions,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import AppShell from '../components/AppShell';
import { useFoodStore, Food } from '../store/useFoodStore';

const MASCOT = require('../assets/yeti_mascot_avatar.png');

// ─── Types ────────────────────────────────────────────────────────────────────
type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK' | 'PRE_WORKOUT' | 'POST_WORKOUT';

const MEAL_OPTIONS: { id: MealType; label: string; icon: string; emoji: string }[] = [
  { id: 'BREAKFAST',    label: 'Breakfast', icon: 'sunny-outline',      emoji: '☀️' },
  { id: 'LUNCH',        label: 'Lunch',     icon: 'restaurant-outline', emoji: '🍽️' },
  { id: 'DINNER',       label: 'Dinner',    icon: 'moon-outline',       emoji: '🌙' },
  { id: 'SNACK',        label: 'Snack',     icon: 'nutrition-outline',  emoji: '🍎' },
  { id: 'PRE_WORKOUT',  label: 'Pre',       icon: 'barbell-outline',    emoji: '💪' },
  { id: 'POST_WORKOUT', label: 'Post',      icon: 'flash-outline',      emoji: '⚡' },
];

type ScanResult = Omit<Food, 'id'> & { fiber: number; description: string };

// Blank shape used to seed the Edit-Food form before a real result exists.
const BLANK_RESULT: ScanResult = {
  name: '',
  brand: 'AI Estimate',
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  description: '',
  serving_size: '1 serving',
  barcode: '',
};

// Real macro-calorie split (protein & carbs = 4 kcal/g, fat = 9 kcal/g),
// so the % under each macro is computed from the actual values, not hardcoded.
function macroPercents(protein: number, carbs: number, fat: number) {
  const pCal = protein * 4;
  const cCal = carbs * 4;
  const fCal = fat * 9;
  const total = pCal + cCal + fCal;
  if (total <= 0) return { protein: '—', carbs: '—', fat: '—' };
  return {
    protein: `${Math.round((pCal / total) * 100)}%`,
    carbs: `${Math.round((cCal / total) * 100)}%`,
    fat: `${Math.round((fCal / total) * 100)}%`,
  };
}

// A short, honest observation derived from the real macro split — no fabricated
// "this meal is balanced" claim about food the AI only estimated.
function macroObservation(r: ScanResult): string {
  const pct = macroPercents(r.protein, r.carbs, r.fat);
  if (pct.protein === '—') return 'Review the estimated values and edit if needed before logging.';
  const p = parseInt(pct.protein, 10);
  const c = parseInt(pct.carbs, 10);
  const f = parseInt(pct.fat, 10);
  if (p >= 35) return `High in protein (~${pct.protein} of calories) — good for muscle recovery.`;
  if (c >= 55) return `Carb-forward (~${pct.carbs} of calories) — solid pre- or post-workout fuel.`;
  if (f >= 45) return `Higher in fat (~${pct.fat} of calories) — keep an eye on your daily fat target.`;
  return `Roughly balanced macros (${p}/${c}/${f} protein/carbs/fat by calories).`;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AiFoodScanScreen() {
  const router = useRouter();
  const { analyzeFoodPhoto, addFood, logMeal } = useFoodStore();
  const cameraRef = useRef<CameraView>(null);
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/food-diary');
  };

  // ── Camera & image state ───────────────────────────────────────────────────
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(Platform.OS !== 'web');
  const [imageUri, setImageUri] = useState<string | null>(null);

  // ── Analysis state ─────────────────────────────────────────────────────────
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [editingResult, setEditingResult] = useState(false);
  const [editValues, setEditValues] = useState<ScanResult>({ ...BLANK_RESULT });

  // ── Meal selection ─────────────────────────────────────────────────────────
  const [selectedMeal, setSelectedMeal] = useState<MealType>('LUNCH');

  // ── View Full Nutrition modal ──────────────────────────────────────────────
  const [showFullNutrition, setShowFullNutrition] = useState(false);

  // ── Scan animation ─────────────────────────────────────────────────────────
  const scanLineY = useSharedValue(-130);
  const cornerOpacity = useSharedValue(1);

  useEffect(() => {
    scanLineY.value = withRepeat(
      withTiming(130, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    cornerOpacity.value = withRepeat(
      withSequence(withTiming(0.5, { duration: 800 }), withTiming(1, { duration: 800 })),
      -1
    );
  }, []);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
  }));
  const cornerStyle = useAnimatedStyle(() => ({ opacity: cornerOpacity.value }));

  // ── Camera / Image helpers ─────────────────────────────────────────────────
  const getBase64FromUri = async (uri: string): Promise<string> => {
    if (uri.startsWith('data:')) return uri.split('base64,')[1];
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
    setScanError(null);
    setResult(null);
    try {
      let base64Data = '';
      if (Platform.OS === 'web') {
        base64Data = await getBase64FromUri(uri);
      } else {
        const manipulated = await manipulateAsync(uri, [{ resize: { width: 1024 } }], {
          compress: 0.7,
          format: SaveFormat.JPEG,
        });
        const response = await fetch(manipulated.uri);
        const blob = await response.blob();
        base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split('base64,')[1] || '');
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      if (base64Data) {
        const parsedItems = await analyzeFoodPhoto(base64Data);
        if (parsedItems.length > 0) {
          const item = parsedItems[0];
          setResult({
            name: item.name || 'Unknown Food',
            brand: item.brand || 'AI Estimate',
            calories: item.calories || 0,
            protein: item.protein || 0,
            carbs: item.carbs || 0,
            fat: item.fat || 0,
            fiber: 0,
            description: item.serving_size || item.brand || 'AI estimate',
            serving_size: item.serving_size || '1 serving',
            barcode: '',
          });
        } else {
          // No fabricated fallback — the AI genuinely couldn't identify a food.
          setScanError("Couldn't identify a food in that photo. Try a clearer, well-lit shot.");
        }
      }
    } catch (err: any) {
      const raw = String(err?.message ?? '');
      setScanError(
        raw === 'AI_PROVIDER_NOT_CONFIGURED'
          ? "The food AI isn't set up yet — an AI provider key is needed on the server."
          : "Couldn't reach the food AI. Check your connection and try again."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCapture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
        if (photo?.uri) {
          setImageUri(photo.uri);
          setShowCamera(false);
          processImageAndAnalyze(photo.uri);
        }
      } catch {
        Alert.alert('Capture Error', 'Could not capture photo. Please try again.');
      }
    }
  };

  const handlePickImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!res.canceled && res.assets[0]?.uri) {
        setImageUri(res.assets[0].uri);
        setShowCamera(false);
        processImageAndAnalyze(res.assets[0].uri);
      }
    } catch {
      Alert.alert('Pick Error', 'Could not read image from library.');
    }
  };

  const handleRescan = () => {
    setResult(null);
    setScanError(null);
    setImageUri(null);
    setShowCamera(Platform.OS !== 'web');
  };

  const handleAddToMeal = async () => {
    if (!result) return;
    try {
      const food = await addFood({
        name: result.name,
        brand: result.brand,
        calories: result.calories,
        protein: result.protein,
        carbs: result.carbs,
        fat: result.fat,
        serving_size: result.serving_size,
      });
      await logMeal({
        food_id: food.id,
        meal_type: selectedMeal,
        servings: 1,
        logged_at: Date.now(),
        food,
      });

      const label = MEAL_OPTIONS.find((m) => m.id === selectedMeal)?.label ?? selectedMeal;
      if (Platform.OS === 'web') {
        alert(`✅ Added to ${label}!\n${result.name} has been logged to your diary.`);
        router.replace('/food-diary');
      } else {
        Alert.alert('Added! 🎉', `${result.name} has been added to ${label}.`, [
          { text: 'View Diary', onPress: () => router.replace('/food-diary') },
          { text: 'Scan More', onPress: handleRescan },
        ]);
      }
    } catch {
      Alert.alert('Error', 'Could not log food. Please try again.');
    }
  };

  // ─── Derived helpers ────────────────────────────────────────────────────────
  const selectedMealLabel = MEAL_OPTIONS.find((m) => m.id === selectedMeal)?.label ?? selectedMeal;
  const pct = result ? macroPercents(result.protein, result.carbs, result.fat) : { protein: '—', carbs: '—', fat: '—' };

  // ─── Camera Permission Screen ───────────────────────────────────────────────
  if (showCamera && cameraPermission && !cameraPermission.granted) {
    return (
      <AppShell activeTab="nutrition">
        <SafeAreaView style={ss.container} edges={['top']}>
          <View style={ss.permissionScreen}>
            <View style={ss.permissionIcon}>
              <Ionicons name="camera" size={44} color="#3B82F6" />
            </View>
            <Text style={ss.permTitle}>Camera Access Needed</Text>
            <Text style={ss.permSub}>
              Allow camera access to scan your food and get instant AI nutrition analysis.
            </Text>
            <TouchableOpacity style={ss.primaryBtn} onPress={requestCameraPermission}>
              <Ionicons name="camera-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={ss.primaryBtnText}>Grant Camera Access</Text>
            </TouchableOpacity>
            <TouchableOpacity style={ss.secondaryBtn} onPress={handlePickImage}>
              <Ionicons name="images-outline" size={17} color="#94A3B8" style={{ marginRight: 8 }} />
              <Text style={ss.secondaryBtnText}>Upload from Gallery</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </AppShell>
    );
  }

  // ─── Camera View (Native only) ──────────────────────────────────────────────
  if (showCamera && Platform.OS !== 'web') {
    return (
      <AppShell activeTab="nutrition">
        <SafeAreaView style={ss.container} edges={['top']}>
          {/* Header */}
          <View style={ss.header}>
            <TouchableOpacity onPress={handleBack} style={ss.headerIconBtn}>
              <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={ss.headerTitle}>AI Food Scanner</Text>
              <Text style={ss.headerSub}>Scan • Analyze • Track</Text>
            </View>
            <TouchableOpacity onPress={handlePickImage} style={ss.headerIconBtn}>
              <Ionicons name="flash-outline" size={20} color="#38BDF8" />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1, backgroundColor: '#000', position: 'relative' }}>
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

            {/* Scanning overlay & corners */}
            <View style={ss.cameraFrameOuter}>
              <Animated.View style={[ss.cameraFrameBox, cornerStyle]}>
                {/* Corner brackets */}
                <View style={[ss.cornerTL, ss.cornerH]} />
                <View style={[ss.cornerTL, ss.cornerV]} />
                <View style={[ss.cornerTR, ss.cornerH]} />
                <View style={[ss.cornerTR, ss.cornerV]} />
                <View style={[ss.cornerBL, ss.cornerH]} />
                <View style={[ss.cornerBL, ss.cornerV]} />
                <View style={[ss.cornerBR, ss.cornerH]} />
                <View style={[ss.cornerBR, ss.cornerV]} />

                {/* Scanning label */}
                <View style={ss.scanningPill}>
                  <ActivityIndicator size="small" color="#38BDF8" style={{ marginRight: 6 }} />
                  <Text style={ss.scanningText}>Scanning...</Text>
                </View>

                {/* Laser scan line */}
                <Animated.View style={[ss.laserLine, scanLineStyle]} />
              </Animated.View>

              <Text style={ss.cameraHintText}>
                Center your food in the frame{'\n'}Make sure it&apos;s well lit
              </Text>
            </View>

            {/* Camera controls */}
            <View style={ss.cameraControls}>
              <TouchableOpacity onPress={handlePickImage} style={ss.camSideBtn}>
                <Ionicons name="images-outline" size={22} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCapture} style={ss.shutterBtn}>
                <View style={ss.shutterInner} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowCamera(false)} style={ss.camSideBtn}>
                <Ionicons name="close" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </AppShell>
    );
  }

  // ─── Main Scanner UI (Web + post-capture) ──────────────────────────────────
  return (
    <AppShell activeTab="nutrition">
      <SafeAreaView style={ss.container} edges={['top']}>
        <Animated.View
          entering={FadeIn.duration(400)}
          style={[ss.responsiveWrapper, { maxWidth: isDesktop ? 540 : '100%' }]}
        >
          {/* ══ HEADER ═════════════════════════════════════════════════════════ */}
          <View style={ss.header}>
            <TouchableOpacity onPress={handleBack} style={ss.headerIconBtn}>
              <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={ss.headerTitle}>AI Food Scanner</Text>
              <Text style={ss.headerSub}>Scan • Analyze • Track</Text>
            </View>
            <TouchableOpacity
              onPress={handlePickImage}
              style={[ss.headerIconBtn, { borderColor: 'rgba(56, 189, 248, 0.3)' }]}
            >
              <Ionicons name="flash-outline" size={20} color="#38BDF8" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={ss.scrollContent}
          >
            {/* ══ CAMERA / IMAGE VIEWFINDER ══════════════════════════════════ */}
            <View style={ss.viewfinderCard}>
              {/* Captured/uploaded photo, or a placeholder before anything is scanned */}
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={ss.viewfinderImage} resizeMode="cover" />
              ) : (
                <View style={ss.viewfinderPlaceholder}>
                  <Ionicons name="camera-outline" size={40} color="rgba(255,255,255,0.35)" />
                  <Text style={ss.viewfinderPlaceholderText}>No photo yet — upload one to scan</Text>
                </View>
              )}

              {/* Dark overlay */}
              <View style={ss.viewfinderOverlay} />

              {/* Corner scan brackets — only over a real photo */}
              {imageUri && (
                <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, cornerStyle]}>
                  <View style={ss.cameraFrameBox}>
                    <View style={[ss.cornerTL, ss.cornerH]} />
                    <View style={[ss.cornerTL, ss.cornerV]} />
                    <View style={[ss.cornerTR, ss.cornerH]} />
                    <View style={[ss.cornerTR, ss.cornerV]} />
                    <View style={[ss.cornerBL, ss.cornerH]} />
                    <View style={[ss.cornerBL, ss.cornerV]} />
                    <View style={[ss.cornerBR, ss.cornerH]} />
                    <View style={[ss.cornerBR, ss.cornerV]} />

                    {/* Animated scan laser (only while analyzing) */}
                    {analyzing && <Animated.View style={[ss.laserLine, scanLineStyle]} />}

                    {/* Scanning status pill */}
                    {analyzing && (
                      <View style={ss.scanningPill}>
                        <ActivityIndicator size="small" color="#38BDF8" style={{ marginRight: 6 }} />
                        <Text style={ss.scanningText}>Analyzing...</Text>
                      </View>
                    )}
                  </View>
                </Animated.View>
              )}

              {/* Bottom hint */}
              <View style={ss.viewfinderHintBar}>
                <Text style={ss.viewfinderHintText}>
                  Center your food in the frame{'\n'}Make sure it&apos;s well lit
                </Text>
              </View>

              {/* Rescan / Pick Image buttons */}
              <View style={ss.viewfinderActions}>
                <TouchableOpacity style={ss.viewfinderActionBtn} onPress={handleRescan}>
                  <Ionicons name="refresh" size={16} color="#38BDF8" />
                </TouchableOpacity>
                <TouchableOpacity style={ss.viewfinderActionBtn} onPress={handlePickImage}>
                  <Ionicons name="images-outline" size={16} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            {/* ══ AI ANALYSIS RESULT CARD ════════════════════════════════════ */}
            {result ? (
              <Animated.View entering={FadeInDown.duration(500)} style={ss.analysisCard}>
                {/* Card Header */}
                <View style={ss.analysisCardHeader}>
                  <View style={ss.aiIconBadge}>
                    <Ionicons name="sparkles" size={14} color="#38BDF8" />
                  </View>
                  <Text style={ss.analysisCardTitle}>AI Analysis Result</Text>
                  <View style={[ss.confidenceBadge, { borderColor: 'rgba(56,189,248,0.5)', backgroundColor: 'rgba(56,189,248,0.12)' }]}>
                    <Ionicons name="sparkles" size={12} color="#38BDF8" style={{ marginRight: 4 }} />
                    <Text style={[ss.confidenceText, { color: '#38BDF8' }]}>AI Estimate</Text>
                  </View>
                </View>

                {/* Food Name Row */}
                <View style={ss.foodNameRow}>
                  <Image
                    source={imageUri ? { uri: imageUri } : MASCOT}
                    style={ss.foodThumb}
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={ss.foodNameText}>{result.name}</Text>
                    <Text style={ss.foodDescText}>{result.description}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={ss.caloriesValue}>{result.calories}</Text>
                    <Text style={ss.caloriesUnit}>kcal</Text>
                  </View>
                </View>

                {/* Macro Grid */}
                <View style={ss.macroGrid}>
                  <MacroCell
                    icon="flame"
                    iconColor="#F97316"
                    bgColor="rgba(249, 115, 22, 0.15)"
                    label="Protein"
                    value={`${result.protein}g`}
                    pct={pct.protein}
                  />
                  <MacroCell
                    icon="leaf"
                    iconColor="#EAB308"
                    bgColor="rgba(234, 179, 8, 0.15)"
                    label="Carbs"
                    value={`${result.carbs}g`}
                    pct={pct.carbs}
                  />
                  <MacroCell
                    icon="water"
                    iconColor="#3B82F6"
                    bgColor="rgba(59, 130, 246, 0.15)"
                    label="Fats"
                    value={`${result.fat}g`}
                    pct={pct.fat}
                  />
                  <MacroCell
                    icon="nutrition"
                    iconColor="#38BDF8"
                    bgColor="rgba(56, 189, 248, 0.15)"
                    label="Fiber"
                    value={result.fiber > 0 ? `${result.fiber}g` : '—'}
                    pct="—"
                  />
                </View>

                {/* View Full Nutrition */}
                <TouchableOpacity
                  style={ss.viewFullNutritionBtn}
                  onPress={() => setShowFullNutrition(true)}
                >
                  <Text style={ss.viewFullNutritionText}>View Full Nutrition</Text>
                  <Ionicons name="chevron-forward" size={14} color="#3B82F6" />
                </TouchableOpacity>
              </Animated.View>
            ) : analyzing ? (
              <View style={ss.analyzingCard}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={ss.analyzingTitle}>Analyzing your food...</Text>
                <Text style={ss.analyzingSub}>AI is identifying the food and estimating nutrition</Text>
              </View>
            ) : scanError ? (
              <View style={ss.uploadCard}>
                <Ionicons name="alert-circle-outline" size={36} color="#F97316" />
                <Text style={ss.uploadTitle}>Scan Failed</Text>
                <Text style={ss.uploadSub}>{scanError}</Text>
                <TouchableOpacity style={ss.primaryBtn} onPress={handlePickImage}>
                  <Ionicons name="images-outline" size={16} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={ss.primaryBtnText}>Try Another Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={ss.uploadCard}>
                <Ionicons name="camera-outline" size={36} color="#3B82F6" />
                <Text style={ss.uploadTitle}>Scan Your Food</Text>
                <Text style={ss.uploadSub}>Point the camera at a meal, or upload a photo, for an AI nutrition estimate</Text>
                <TouchableOpacity style={ss.primaryBtn} onPress={handlePickImage}>
                  <Ionicons name="images-outline" size={16} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={ss.primaryBtnText}>Upload Photo</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ══ ADD TO MEAL SECTION ════════════════════════════════════════ */}
            {result && (
              <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                <Text style={ss.sectionLabel}>Add to Meal</Text>

                {/* Meal Type Selector */}
                <View style={ss.mealSelectorRow}>
                  {MEAL_OPTIONS.map((meal) => {
                    const isActive = selectedMeal === meal.id;
                    return (
                      <TouchableOpacity
                        key={meal.id}
                        onPress={() => setSelectedMeal(meal.id)}
                        style={[ss.mealOption, isActive && ss.mealOptionActive]}
                        activeOpacity={0.75}
                      >
                        <Ionicons
                          name={meal.icon as any}
                          size={20}
                          color={isActive ? '#38BDF8' : '#64748B'}
                        />
                        <Text style={[ss.mealOptionText, isActive && ss.mealOptionTextActive]}>
                          {meal.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Action Buttons */}
                <View style={ss.actionBtnRow}>
                  <TouchableOpacity style={ss.primaryActionBtn} onPress={handleAddToMeal}>
                    <Ionicons name="checkmark-circle" size={18} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={ss.primaryActionBtnText}>Add to {selectedMealLabel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={ss.secondaryActionBtn}
                    onPress={() => setEditingResult(true)}
                  >
                    <Ionicons name="pencil-outline" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
                    <Text style={ss.secondaryActionBtnText}>Edit Food</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            {/* ══ YETI TIP CARD ══════════════════════════════════════════════ */}
            {result && (
              <Animated.View
                entering={FadeInDown.delay(200).duration(400)}
                style={ss.yetiTipCard}
              >
                <Image source={MASCOT} style={ss.yetiAvatar} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={ss.yetiTipTitle}>Yeti Tip</Text>
                  <Text style={ss.yetiTipText}>{macroObservation(result)}</Text>
                </View>
              </Animated.View>
            )}

          </ScrollView>
        </Animated.View>

        {/* ══ FULL NUTRITION MODAL ══════════════════════════════════════════════ */}
        <Modal visible={showFullNutrition} transparent animationType="slide">
          <View style={ss.modalOverlay}>
            <View style={ss.modalCard}>
              <View style={ss.modalHeaderRow}>
                <Text style={ss.modalTitle}>Full Nutrition Facts</Text>
                <TouchableOpacity onPress={() => setShowFullNutrition(false)}>
                  <Ionicons name="close" size={22} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {result && (
                <>
                  <Text style={ss.modalFoodName}>{result.name}</Text>
                  <Text style={ss.modalServing}>Serving: {result.serving_size}</Text>

                  <View style={ss.nutritionFactDivider} />
                  <NutritionRow label="Calories" value={`${result.calories} kcal`} bold />
                  <View style={ss.nutritionFactDivider} />
                  <NutritionRow label="Total Fat" value={`${result.fat}g`} />
                  <View style={ss.nutritionFactDivider} />
                  <NutritionRow label="Total Carbohydrate" value={`${result.carbs}g`} />
                  {result.fiber > 0 && <NutritionRow label="Dietary Fiber" value={`${result.fiber}g`} sub />}
                  <View style={ss.nutritionFactDivider} />
                  <NutritionRow label="Protein" value={`${result.protein}g`} />
                  <View style={ss.nutritionFactDivider} />

                  <Text style={ss.modalNote}>
                    AI estimate from your photo. Micronutrients (sodium, sugars, vitamins) can&apos;t be read from a
                    photo — tap Edit Food to enter exact values from a nutrition label.
                  </Text>

                  <TouchableOpacity style={[ss.primaryBtn, { marginTop: 16 }]} onPress={() => setShowFullNutrition(false)}>
                    <Text style={ss.primaryBtnText}>Done</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* ══ EDIT FOOD MODAL ═══════════════════════════════════════════════════ */}
        {editingResult && result && (
          <Modal visible transparent animationType="slide">
            <View style={ss.modalOverlay}>
              <View style={ss.modalCard}>
                <View style={ss.modalHeaderRow}>
                  <Text style={ss.modalTitle}>Edit & Customize</Text>
                  <TouchableOpacity onPress={() => setEditingResult(false)}>
                    <Ionicons name="close" size={22} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                <Text style={ss.inputLabel}>Food Name</Text>
                <TextInput
                  style={ss.editInput}
                  value={editValues.name}
                  onChangeText={(v) => setEditValues((p) => ({ ...p, name: v }))}
                />

                <Text style={ss.inputLabel}>Serving Size</Text>
                <TextInput
                  style={ss.editInput}
                  value={editValues.serving_size}
                  onChangeText={(v) => setEditValues((p) => ({ ...p, serving_size: v }))}
                />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {[
                    { field: 'calories', label: 'Calories' },
                    { field: 'protein', label: 'Protein (g)' },
                    { field: 'carbs', label: 'Carbs (g)' },
                    { field: 'fat', label: 'Fat (g)' },
                  ].map((f) => (
                    <View key={f.field} style={{ flex: 1 }}>
                      <Text style={ss.inputLabel}>{f.label}</Text>
                      <TextInput
                        style={ss.editInputNum}
                        keyboardType="numeric"
                        value={String((editValues as any)[f.field])}
                        onChangeText={(v) => setEditValues((p) => ({ ...p, [f.field]: parseFloat(v) || 0 }))}
                      />
                    </View>
                  ))}
                </View>

                <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                  <TouchableOpacity
                    style={[ss.secondaryBtn, { flex: 1 }]}
                    onPress={() => setEditingResult(false)}
                  >
                    <Text style={ss.secondaryBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[ss.primaryBtn, { flex: 1 }]}
                    onPress={() => {
                      setResult((p) => p ? { ...p, ...editValues } : p);
                      setEditingResult(false);
                    }}
                  >
                    <Text style={ss.primaryBtnText}>Save Changes</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </SafeAreaView>
    </AppShell>
  );
}

// ─── MacroCell sub-component ──────────────────────────────────────────────────
function MacroCell({
  icon, iconColor, bgColor, label, value, pct,
}: {
  icon: string; iconColor: string; bgColor: string;
  label: string; value: string; pct: string;
}) {
  return (
    <View style={ss.macroCell}>
      <View style={[ss.macroIconBox, { backgroundColor: bgColor }]}>
        <Ionicons name={icon as any} size={16} color={iconColor} />
      </View>
      <Text style={ss.macroLabel}>{label}</Text>
      <Text style={ss.macroValue}>{value}</Text>
      <Text style={ss.macroPct}>{pct}</Text>
    </View>
  );
}

// ─── NutritionRow sub-component ───────────────────────────────────────────────
function NutritionRow({ label, value, bold, sub }: { label: string; value: string; bold?: boolean; sub?: boolean }) {
  return (
    <View style={ss.nutritionRow}>
      <Text style={[ss.nutritionLabel, bold && { fontWeight: '800', color: '#FFFFFF' }, sub && { marginLeft: 14, color: '#64748B', fontSize: 12 }]}>
        {label}
      </Text>
      <Text style={[ss.nutritionValue, bold && { fontWeight: '800', color: '#FFFFFF' }]}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090B10',
  },
  responsiveWrapper: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },

  // Permission screen
  permissionScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  permissionIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  permTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  permSub: { fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 20 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3B82F6',
    textAlign: 'center',
    marginTop: 1,
  },

  // Camera viewfinder card
  viewfinderCard: {
    width: '100%',
    height: 280,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginTop: 16,
    marginBottom: 16,
    position: 'relative',
  },
  viewfinderImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  viewfinderOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  viewfinderPlaceholder: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#0D1117',
  },
  viewfinderPlaceholderText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
  },
  viewfinderHintBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  viewfinderHintText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 17,
  },
  viewfinderActions: {
    position: 'absolute',
    top: 12,
    right: 12,
    gap: 8,
  },
  viewfinderActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scan frame (corner brackets)
  cameraFrameOuter: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraFrameBox: {
    width: 240,
    height: 180,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cornerTL: { position: 'absolute', top: 0, left: 0, borderColor: '#38BDF8' },
  cornerTR: { position: 'absolute', top: 0, right: 0, borderColor: '#38BDF8' },
  cornerBL: { position: 'absolute', bottom: 0, left: 0, borderColor: '#38BDF8' },
  cornerBR: { position: 'absolute', bottom: 0, right: 0, borderColor: '#38BDF8' },
  cornerH: { width: 28, height: 3, borderTopWidth: 3, borderLeftWidth: 3, borderRightWidth: 0 },
  cornerV: { width: 3, height: 28, borderTopWidth: 0, borderLeftWidth: 3 },

  // Laser scan line
  laserLine: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    opacity: 0.85,
  },

  // Scanning pill
  scanningPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    position: 'absolute',
    top: -36,
  },
  scanningText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
  },
  cameraHintText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    lineHeight: 18,
  },

  // Camera controls (native)
  cameraControls: {
    position: 'absolute',
    bottom: 40,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  camSideBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#2563EB',
  },

  // Analysis Result Card
  analysisCard: {
    backgroundColor: '#141822',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.15)',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#38BDF8',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  analysisCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  aiIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  analysisCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Food Name Row
  foodNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  foodThumb: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#1E293B',
  },
  foodNameText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  foodDescText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 3,
    lineHeight: 17,
  },
  caloriesValue: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  caloriesUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'right',
  },

  // Macro Grid
  macroGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  macroCell: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#0D1117',
    borderRadius: 14,
    paddingVertical: 12,
    gap: 4,
  },
  macroIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  macroPct: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },

  // View Full Nutrition link
  viewFullNutritionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  viewFullNutritionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3B82F6',
  },

  // Analyzing / Upload cards
  analyzingCard: {
    backgroundColor: '#141822',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: 32,
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  analyzingTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  analyzingSub: { fontSize: 13, color: '#94A3B8', textAlign: 'center' },
  uploadCard: {
    backgroundColor: '#141822',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: 32,
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  uploadTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  uploadSub: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 18 },

  // Section headers
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 4,
    marginBottom: 10,
  },

  // Add to Meal selector
  mealSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  mealOption: {
    flexBasis: '31%',
    flexGrow: 1,
    minWidth: 88,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#141822',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    gap: 4,
  },
  mealOptionActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  mealOptionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  mealOptionTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },

  // Action buttons
  actionBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 16,
    paddingVertical: 14,
    shadowColor: '#3B82F6',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  primaryActionBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryActionBtn: {
    flex: 0.7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#141822',
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  secondaryActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
  },

  // Yeti Tip card
  yetiTipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141822',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: 14,
    marginBottom: 20,
  },
  yetiAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  yetiTipTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  yetiTipText: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 18,
  },

  // Buttons (shared)
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowColor: '#3B82F6',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    width: '100%',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    width: '100%',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#161B22',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 24,
    maxHeight: '85%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalFoodName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalServing: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    marginBottom: 12,
  },
  modalNote: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginTop: 10,
  },

  // Nutrition Label
  nutritionFactDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 6,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  nutritionLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  nutritionValue: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Edit Modal inputs
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 6,
  },
  editInput: {
    backgroundColor: '#090B10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    color: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
  },
  editInputNum: {
    backgroundColor: '#090B10',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    color: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },

});


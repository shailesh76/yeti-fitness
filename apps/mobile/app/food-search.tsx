import React, { useState, useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert as RNAlert,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from 'react-native';

const Alert = {
  alert: (title: string, message?: string, buttons?: any[]) => {
    if (Platform.OS === 'web') {
      if (buttons && buttons.length > 0) {
        const confirmBtn = buttons.find(b => b.style === 'destructive' || b.text === 'Delete' || b.text === 'OK' || !b.style);
        const cancelBtn = buttons.find(b => b.style === 'cancel' || b.text === 'Cancel');
        
        const confirmVal = window.confirm(`${title}${message ? `\n\n${message}` : ''}`);
        if (confirmVal && confirmBtn && confirmBtn.onPress) {
          confirmBtn.onPress();
        } else if (!confirmVal && cancelBtn && cancelBtn.onPress) {
          cancelBtn.onPress();
        }
      } else {
        window.alert(`${title}${message ? `: ${message}` : ''}`);
      }
    } else {
      RNAlert.alert(title, message, buttons);
    }
  }
};
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFoodStore, Food } from '../store/useFoodStore';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { analyzeFoodPhoto, lookupBarcodeProduct, analyzeFoodDescription, FoodPhotoAnalysis, BarcodeProductInfo } from '../services/nutritionApi';
import { P, glowStyle, sharedStyles } from '../constants/premiumTheme';

type CameraMode = 'photo' | 'barcode' | null;

interface DraftFood {
  name:         string;
  calories:     string;
  protein:      string;
  carbs:        string;
  fat:          string;
  serving_size: string;
  confidence?:  number | null;
  barcode?:     string;
  raw_response: any;
  source:       'photo' | 'barcode' | 'text';
}

export default function FoodSearchScreen() {
  const router = useRouter();
  const { mealType = 'BREAKFAST', openCamera } = useLocalSearchParams<{
    mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK' | 'PRE_WORKOUT' | 'POST_WORKOUT';
    openCamera?: 'photo' | 'barcode';
  }>();
  const { searchFoods, addFood, logMeal } = useFoodStore();
  const allFoods        = useFoodStore((s) => s.foods);
  const mealLogs        = useFoodStore((s) => s.mealLogs);
  const favoriteFoodIds = useFoodStore((s) => s.favoriteFoodIds);
  const toggleFavorite  = useFoodStore((s) => s.toggleFavorite);
  const recentFoodsFn   = useFoodStore((s) => s.recentFoods);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/food-diary');
    }
  };

  const [query,          setQuery]          = useState('');
  const [results,        setResults]        = useState<Food[]>([]);
  const [searching,      setSearching]      = useState(false);

  // Custom Food Form
  const [showCustomForm,   setShowCustomForm]   = useState(false);
  const [customName,       setCustomName]       = useState('');
  const [customBrand,      setCustomBrand]      = useState('');
  const [customCalories,   setCustomCalories]   = useState('');
  const [customProtein,    setCustomProtein]    = useState('');
  const [customCarbs,      setCustomCarbs]      = useState('');
  const [customFat,        setCustomFat]        = useState('');
  const [customServing,    setCustomServing]    = useState('100g');
  const [customDescription, setCustomDescription] = useState('');
  const [customFormTab,     setCustomFormTab]    = useState<'ai' | 'manual'>('ai');

  // Serving Selector Modal State
  const [selectedFood,   setSelectedFood]   = useState<Food | null>(null);
  const [servings,       setServings]       = useState('1.0');

  // Camera & Capture State
  const [permission,     requestPermission] = useCameraPermissions();
  const [cameraMode,     setCameraMode]     = useState<CameraMode>(null);
  const [draftResult,    setDraftResult]    = useState<DraftFood | null>(null);
  const [isProcessing,   setIsProcessing]   = useState(false);
  const [scanStatus,     setScanStatus]     = useState<'idle' | 'detected' | 'looking' | 'notfound'>('idle');
  const [scannedCode,    setScannedCode]    = useState<string>('');
  const cameraRef       = useRef<CameraView>(null);
  const [webBarcode,    setWebBarcode]      = useState('');

  // Debounce: track the last code we started processing so the same barcode
  // fired 30x/sec by expo-camera does not trigger 30 API calls.
  const lastCodeRef     = useRef<string>('');
  const processingRef   = useRef(false);

  // Green flash animation (opacity 0 -> 1 -> 0 on detect)
  const flashOpacity = useSharedValue(0);

  // Open camera from food-diary deep link param
  useEffect(() => {
    if (openCamera === 'photo' || openCamera === 'barcode') {
      startCamera(openCamera);
    }
  }, []);

  // Scanning laser animation (normalised 0→1 range, mapped to px in style)
  const laserY = useSharedValue(0);
  useEffect(() => {
    if (cameraMode === 'barcode') {
      laserY.value = withRepeat(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    }
  }, [cameraMode]);

  const laserStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (laserY.value - 0.5) * 200 }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  // Reset scan state when entering barcode mode
  useEffect(() => {
    if (cameraMode === 'barcode') {
      lastCodeRef.current   = '';
      processingRef.current = false;
      setScanStatus('idle');
      setScannedCode('');
    }
  }, [cameraMode]);

  useEffect(() => {
    if (!cameraMode && !draftResult) {
      handleSearch(query);
    }
  }, [query, cameraMode, draftResult]);

  const handleSearch = async (text: string) => {
    setSearching(true);
    const matched = await searchFoods(text);
    setResults(matched);
    setSearching(false);
  };

  const handleLogFood = async () => {
    if (!selectedFood) return;
    const servNum = parseFloat(servings);
    if (isNaN(servNum) || servNum <= 0) {
      Alert.alert('Error', 'Please enter a valid serving count');
      return;
    }
    await logMeal({
      food_id:   selectedFood.id,
      meal_type: mealType,
      servings:  servNum,
      logged_at: Date.now(),
      food:      selectedFood,
      source:    'search',
    });
    setSelectedFood(null);
    handleBack();
  };

  const handleCreateCustomFood = async () => {
    if (!customName.trim() || !customCalories.trim() || !customProtein.trim() || !customCarbs.trim() || !customFat.trim()) {
      Alert.alert('Error', 'Please fill out all custom food fields');
      return;
    }
    const cals   = parseInt(customCalories);
    const prot   = parseFloat(customProtein);
    const carb   = parseFloat(customCarbs);
    const fatVal = parseFloat(customFat);
    if (isNaN(cals) || isNaN(prot) || isNaN(carb) || isNaN(fatVal)) {
      Alert.alert('Error', 'Macros must be numeric values');
      return;
    }
    const newFood = await addFood({
      name:         customName,
      brand:        customBrand || 'Custom',
      calories:     cals,
      protein:      prot,
      carbs:        carb,
      fat:          fatVal,
      serving_size: customServing || '1 serving',
    });
    await logMeal({
      food_id:   newFood.id,
      meal_type: mealType,
      servings:  1,
      logged_at: Date.now(),
      food:      newFood,
      source:    'manual',
    });
    setCustomName(''); setCustomBrand(''); setCustomCalories('');
    setCustomProtein(''); setCustomCarbs(''); setCustomFat('');
    setCustomServing('100g');
    setShowCustomForm(false);
    handleBack();
  };

  const handleAnalyzeMealDescription = async () => {
    if (!customDescription.trim()) {
      Alert.alert('Error', 'Please describe your meal first');
      return;
    }
    setIsProcessing(true);
    try {
      const aiData = await analyzeFoodDescription(customDescription);
      setDraftResult({
        name:         aiData.name,
        calories:     String(aiData.calories),
        protein:      String(aiData.protein),
        carbs:        String(aiData.carbs),
        fat:          String(aiData.fat),
        serving_size: '1 serving',
        confidence:   aiData.confidence,
        raw_response: aiData,
        source:       'photo', // Reuse 'photo' to represent AI-derived macros
      });
      setCustomDescription('');
      setShowCustomForm(false);
    } catch (e: any) {
      Alert.alert('Analysis Failed', e.message || 'Could not parse meal description.');
    } finally {
      setIsProcessing(false);
    }
  };

  const startCamera = async (mode: CameraMode) => {
    if (!permission?.granted && Platform.OS !== 'web') {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Yeti needs camera access to log food from photos or barcodes.', [{ text: 'OK' }]);
        return;
      }
    }
    setCameraMode(mode);
  };

  const processPhotoAnalysis = async (uri: string) => {
    setIsProcessing(true);
    try {
      const aiData = await analyzeFoodPhoto(uri);
      setDraftResult({
        name:         aiData.name,
        calories:     String(aiData.calories),
        protein:      String(aiData.protein),
        carbs:        String(aiData.carbs),
        fat:          String(aiData.fat),
        serving_size: '1 serving',
        confidence:   aiData.confidence,
        raw_response: aiData,
        source:       'photo',
      });
      setCameraMode(null);
    } catch (e: any) {
      Alert.alert('Analysis Failed', e?.message || 'Could not process the image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCapturePhoto = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, skipProcessing: false });
        if (photo?.uri) await processPhotoAnalysis(photo.uri);
      } catch (e) {
        Alert.alert('Error', 'Failed to capture photo.');
      }
    }
  };

  const handlePickWebImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
      if (!result.canceled && result.assets[0]?.uri) await processPhotoAnalysis(result.assets[0].uri);
    } catch (e) {
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    // Debounce: expo-camera fires this ~30x/sec for the same barcode in frame.
    // Only process a code if it is different from the last one we started, or
    // if we have explicitly reset (via handleScanAgain).
    if (processingRef.current || data === lastCodeRef.current) return;
    lastCodeRef.current   = data;
    processingRef.current = true;

    // Immediate tactile + green flash feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    flashOpacity.value = withTiming(0.45, { duration: 80 }, () => {
      flashOpacity.value = withTiming(0, { duration: 320 });
    });

    setScannedCode(data);
    setScanStatus('detected');

    // Brief pause so the user registers the detection flash before lookup
    await new Promise((r) => setTimeout(r, 150));
    setScanStatus('looking');
    setIsProcessing(true);

    try {
      const product = await lookupBarcodeProduct(data);
      if (product) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setDraftResult({
          name:         product.name,
          calories:     String(product.calories),
          protein:      String(product.protein),
          carbs:        String(product.carbs),
          fat:          String(product.fat),
          serving_size: product.serving_size || '100g',
          barcode:      data,
          raw_response: product,
          source:       'barcode',
        });
        setCameraMode(null);
      } else {
        // Product not found — show inline scan-again UI, no blocking Alert
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
        setScanStatus('notfound');
        setIsProcessing(false);
        // Auto-reset after 2.5s so a new barcode can be scanned immediately
        setTimeout(() => {
          if (processingRef.current && lastCodeRef.current === data) {
            lastCodeRef.current   = '';
            processingRef.current = false;
            setScanStatus('idle');
          }
        }, 2500);
      }
    } catch {
      setScanStatus('idle');
      processingRef.current = false;
      lastCodeRef.current   = '';
      setIsProcessing(false);
    }
  };

  const handleScanAgain = () => {
    lastCodeRef.current   = '';
    processingRef.current = false;
    setIsProcessing(false);
    setScanStatus('idle');
    setScannedCode('');
  };

  const handleConfirmDraft = async () => {
    if (!draftResult) return;
    const servNum = parseFloat(servings) || 1;
    const newFood = await addFood({
      name:         draftResult.name,
      brand:        draftResult.source === 'photo' ? 'AI Estimate' : '',
      calories:     parseInt(draftResult.calories)   || 0,
      protein:      parseFloat(draftResult.protein)  || 0,
      carbs:        parseFloat(draftResult.carbs)    || 0,
      fat:          parseFloat(draftResult.fat)      || 0,
      serving_size: draftResult.serving_size,
      barcode:      draftResult.barcode,
    });
    await logMeal({
      food_id:      newFood.id,
      meal_type:    mealType,
      servings:     servNum,
      logged_at:    Date.now(),
      food:         newFood,
      source:       draftResult.source,
      raw_response: draftResult.raw_response,
    });
    setDraftResult(null);
    setServings('1.0');
    handleBack();
  };

  // Recent (most-recently-logged) + favorite foods, shown when the search box is
  // empty for one-tap re-logging.
  const recentList = React.useMemo(() => recentFoodsFn(8), [mealLogs, recentFoodsFn]);
  const favoriteList = React.useMemo(
    () => allFoods.filter((f) => favoriteFoodIds.includes(f.id)).slice(0, 12),
    [allFoods, favoriteFoodIds],
  );

  // Shared row for search results / recent / favorites, with a favorite toggle.
  const renderFoodRow = (food: Food) => {
    const fav = favoriteFoodIds.includes(food.id);
    return (
      <View key={food.id} style={styles.resultCard}>
        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Log ${food.name}, ${food.calories} calories`}
          onPress={() => { setSelectedFood(food); setServings('1.0'); }}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.resultName} numberOfLines={1}>{food.name}</Text>
            <Text style={styles.resultMeta}>{food.brand}  ·  {food.serving_size}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.resultKcal}>{food.calories} kcal</Text>
            <Text style={styles.resultMacros}>P: {food.protein}g  C: {food.carbs}g  F: {food.fat}g</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={fav ? `Remove ${food.name} from favorites` : `Add ${food.name} to favorites`}
          onPress={() => toggleFavorite(food)}
          style={{ paddingLeft: 12, paddingVertical: 4 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name={fav ? 'star' : 'star-outline'} size={18} color={fav ? P.AMBER : P.TEXT_MUT} />
        </TouchableOpacity>
      </View>
    );
  };

  // ─── Camera Views (unchanged — transient overlays, not themed) ──────────────
  if (cameraMode) {
    if (Platform.OS === 'web' && cameraMode === 'photo') {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: P.BG }}>
          <View style={styles.camHeader}>
            <TouchableOpacity accessible={true} accessibilityRole="button" accessibilityLabel="Close camera" onPress={() => setCameraMode(null)} style={styles.camBackBtn}>
              <Text style={styles.camBackArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.camTitle}>Upload Photo</Text>
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            {isProcessing ? (
              <View style={{ alignItems: 'center', gap: 16 }}>
                <ActivityIndicator size="large" color={P.ACCENT} />
                <Text style={{ color: P.TEXT_PRI, fontSize: 16, fontWeight: '800', letterSpacing: -0.3 }}>Analyzing Food Photo</Text>
                <Text style={{ color: P.TEXT_MUT, fontSize: 12, textAlign: 'center', maxWidth: 280, fontWeight: '500', lineHeight: 18 }}>
                  Running secure AI Vision telemetry... We are identifying items and calculating nutrients.
                </Text>
              </View>
            ) : (
              <TouchableOpacity accessible={true} accessibilityRole="button" accessibilityLabel="Upload a food photo" onPress={handlePickWebImage} style={styles.uploadBox}>
                <Text style={{ fontSize: 36 }}>📤</Text>
                <Text style={styles.uploadTitle}>Upload Food Image</Text>
                <Text style={styles.uploadSub}>Select a photo from your computer to analyze.</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      );
    }



    // Native Camera View
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          onBarcodeScanned={cameraMode === 'barcode' ? handleBarcodeScanned : undefined}
          barcodeScannerSettings={cameraMode === 'barcode'
            ? { barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'qr'] }
            : undefined}
        />

        {/* Green flash overlay — fires on automatic barcode detect */}
        {cameraMode === 'barcode' && (
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: P.ACCENT }, flashStyle]}
          />
        )}

        {/* Back button + AUTO SCAN badge */}
        <SafeAreaView style={{ position: 'absolute', inset: 0, zIndex: 10 } as any}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 }}>
            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Close camera"
              onPress={() => setCameraMode(null)}
              style={styles.nativeCamBack}
            >
              <Ionicons name="arrow-back" size={18} color="#fff" />
            </TouchableOpacity>
            {cameraMode === 'barcode' && (
              <View style={styles.camModeBadge}>
                <Ionicons name="barcode-outline" size={13} color={P.ACCENT} />
                <Text style={styles.camModeBadgeText}>AUTO SCAN</Text>
              </View>
            )}
          </View>
        </SafeAreaView>

        {cameraMode === 'photo' ? (
          <View style={styles.camViewfinder}>
            <Text style={styles.camViewfinderLabel}>Frame your plate here</Text>
            {isProcessing && (
              <>
                <View style={styles.camOverlay} />
                <Animated.View style={[styles.camLaser, laserStyle]} />
              </>
            )}
          </View>
        ) : (
          /* ── Barcode viewfinder ────────────────────────────────── */
          <View style={{ position: 'absolute', inset: 0, justifyContent: 'center', alignItems: 'center' } as any}>

            {/* Finder box with corner brackets */}
            <View style={styles.barcodeFinder}>
              {/* Scanning laser */}
              <Animated.View
                style={[
                  { position: 'absolute', left: 0, right: 0, height: 2.5, borderRadius: 2 },
                  { backgroundColor: scanStatus === 'notfound' ? P.AMBER : P.ACCENT },
                  laserStyle,
                  Platform.OS === 'ios' ? {
                    shadowColor:   scanStatus === 'notfound' ? P.AMBER : P.ACCENT,
                    shadowOffset:  { width: 0, height: 0 },
                    shadowOpacity: 0.9,
                    shadowRadius:  6,
                  } : {},
                ]}
              />

              {/* Corner bracket — top-left */}
              <View style={[styles.bracket, styles.bracketTL,
                { borderColor: (scanStatus === 'detected' || scanStatus === 'looking') ? P.ACCENT : 'rgba(255,255,255,0.55)' }]} />
              {/* top-right */}
              <View style={[styles.bracket, styles.bracketTR,
                { borderColor: (scanStatus === 'detected' || scanStatus === 'looking') ? P.ACCENT : 'rgba(255,255,255,0.55)' }]} />
              {/* bottom-left */}
              <View style={[styles.bracket, styles.bracketBL,
                { borderColor: (scanStatus === 'detected' || scanStatus === 'looking') ? P.ACCENT : 'rgba(255,255,255,0.55)' }]} />
              {/* bottom-right */}
              <View style={[styles.bracket, styles.bracketBR,
                { borderColor: (scanStatus === 'detected' || scanStatus === 'looking') ? P.ACCENT : 'rgba(255,255,255,0.55)' }]} />

              {/* Processing spinner (while API call in flight) */}
              {isProcessing && (
                <View style={styles.barcodeProcessing}>
                  <ActivityIndicator size="large" color={P.ACCENT} />
                  <Text style={styles.barcodeLookupText}>Looking up product…</Text>
                </View>
              )}
            </View>

            {/* Status label below finder box */}
            <View style={styles.scanStatusBox}>
              {scanStatus === 'idle' && (
                <Text style={styles.scanStatusText}>Point camera at a barcode — scans automatically</Text>
              )}
              {scanStatus === 'detected' && (
                <Text style={[styles.scanStatusText, { color: P.ACCENT, fontWeight: '800' }]}>
                  ✓ Barcode detected!
                </Text>
              )}
              {scanStatus === 'looking' && (
                <Text style={[styles.scanStatusText, { color: P.ACCENT }]}>
                  Looking up product…
                </Text>
              )}
              {scanStatus === 'notfound' && (
                <View style={{ alignItems: 'center', gap: 12 }}>
                  <Text style={[styles.scanStatusText, { color: P.AMBER }]}>
                    Product not found in database
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity accessible={true} accessibilityRole="button" accessibilityLabel="Scan again" onPress={handleScanAgain} style={styles.scanAgainBtn} activeOpacity={0.8}>
                      <Ionicons name="refresh" size={13} color={P.ACCENT} />
                      <Text style={styles.scanAgainText}>Scan Again</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel="Log food manually instead"
                      onPress={() => { setCameraMode(null); setShowCustomForm(true); }}
                      style={styles.scanCustomBtn}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="create-outline" size={13} color={P.AMBER} />
                      <Text style={styles.scanCustomText}>Log Custom</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {cameraMode === 'photo' && (
          <View style={styles.camBottomBar}>
            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Capture photo"
              onPress={handleCapturePhoto}
              disabled={isProcessing}
              style={styles.captureBtn}
            >
              {isProcessing
                ? <ActivityIndicator size="large" color={P.ACCENT} />
                : <View style={styles.captureBtnInner} />}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // ─── MAIN VIEW ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.BG }}>
      <View style={{ flex: 1, maxWidth: 680, width: '100%', alignSelf: 'center' }}>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity accessible={true} accessibilityRole="button" accessibilityLabel="Go back" onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={18} color={P.ACCENT} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Add Food</Text>
            <Text style={styles.headerSub}>Logging for {mealType}</Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1, paddingHorizontal: 20 }}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Capture tiles ─────────────────────────────────────────── */}
          {!showCustomForm && (
            <Animated.View entering={FadeInDown.delay(40).duration(400)} style={styles.captureTilesRow}>
              {/* Snap Photo — primary */}
              <TouchableOpacity
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Snap a photo of your food"
                onPress={() => startCamera('photo')}
                style={[styles.captureTilePrimary, glowStyle(P.ACCENT, 14, 0.30)]}
                activeOpacity={0.8}
              >
                <View style={styles.captureTileIconWrap}>
                  <Ionicons name="camera" size={22} color="#000" />
                </View>
                <Text style={styles.captureTileLabelPrimary}>Snap{'\n'}Photo</Text>
              </TouchableOpacity>

              {/* Barcode — secondary */}
              <TouchableOpacity
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Scan a food barcode"
                onPress={() => startCamera('barcode')}
                style={styles.captureTileSecondary}
                activeOpacity={0.8}
              >
                <Ionicons name="barcode-outline" size={22} color={P.BLUE} />
                <Text style={styles.captureTileLabelSec}>Scan{'\n'}Barcode</Text>
              </TouchableOpacity>

              {/* AI Describe — secondary */}
              <TouchableOpacity
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Describe your meal to AI"
                onPress={() => { setShowCustomForm(true); setCustomFormTab('ai'); }}
                style={styles.captureTileSecondary}
                activeOpacity={0.8}
              >
                <Ionicons name="sparkles" size={22} color={P.ACCENT} />
                <Text style={styles.captureTileLabelSec}>AI{'\n'}Describe</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {!showCustomForm ? (
            <Animated.View entering={FadeIn.duration(300)}>
              {/* ── Search Input ──────────────────────────────────────── */}
              <TextInput
                style={styles.searchInput}
                placeholder="Search food database…"
                placeholderTextColor={P.TEXT_MUT}
                value={query}
                onChangeText={setQuery}
              />

              {/* ── Favorites & Recent (empty query only) ─────────────── */}
              {query.trim() === '' && favoriteList.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={sharedStyles.labelCaps}>⭐ Favorites</Text>
                  <View style={{ gap: 8, marginTop: 10 }}>
                    {favoriteList.map((food) => renderFoodRow(food))}
                  </View>
                </View>
              )}
              {query.trim() === '' && recentList.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={sharedStyles.labelCaps}>Recent</Text>
                  <View style={{ gap: 8, marginTop: 10 }}>
                    {recentList.map((food) => renderFoodRow(food))}
                  </View>
                </View>
              )}

              {/* ── Results ───────────────────────────────────────────── */}
              <View style={[sharedStyles.rowBetween, { marginBottom: 10 }]}>
                <Text style={sharedStyles.labelCaps}>Search Results</Text>
                <TouchableOpacity accessible={true} accessibilityRole="button" accessibilityLabel="Describe your meal to AI" onPress={() => { setShowCustomForm(true); setCustomFormTab('ai'); }}>
                  <Text style={styles.customFoodLink}>✨ Describe Meal</Text>
                </TouchableOpacity>
              </View>

              {searching ? (
                <ActivityIndicator color={P.ACCENT} style={{ marginVertical: 32 }} />
              ) : results.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="search" size={28} color={P.TEXT_MUT} style={{ marginBottom: 10 }} />
                  <Text style={styles.emptyText}>No foods match your search.</Text>
                  <TouchableOpacity
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Describe your meal to AI instead"
                    onPress={() => { setShowCustomForm(true); setCustomFormTab('ai'); }}
                    style={styles.emptyCustomBtn}
                  >
                    <Text style={styles.emptyCustomText}>AI Describe Meal</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  {results.map((food) => renderFoodRow(food))}
                </View>
              )}
            </Animated.View>
          ) : (
            /* ── Custom Food Form ──────────────────────────────────────── */
            <Animated.View entering={FadeIn.duration(300)} style={styles.customForm}>
              <View style={[sharedStyles.rowBetween, { marginBottom: 16 }]}>
                <Text style={styles.customFormTitle}>AI Meal Estimator</Text>
                <TouchableOpacity accessible={true} accessibilityRole="button" accessibilityLabel="Cancel" onPress={() => setShowCustomForm(false)}>
                  <Text style={styles.customFormCancel}>Cancel</Text>
                </TouchableOpacity>
              </View>

              {/* Tabs for AI vs Manual */}
              <View style={{ flexDirection: 'row', backgroundColor: P.BG, borderRadius: 10, padding: 3, marginBottom: 20, borderWidth: 1, borderColor: P.CARD_BORDER }}>
                <TouchableOpacity
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityState={{ selected: customFormTab === 'ai' }}
                  accessibilityLabel="Describe meal with AI"
                  onPress={() => setCustomFormTab('ai')}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    alignItems: 'center',
                    backgroundColor: customFormTab === 'ai' ? P.CARD_BG : 'transparent',
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: customFormTab === 'ai' ? P.ACCENT : P.TEXT_MUT, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    ✨ Describe Meal
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityState={{ selected: customFormTab === 'manual' }}
                  accessibilityLabel="Log food manually"
                  onPress={() => setCustomFormTab('manual')}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    alignItems: 'center',
                    backgroundColor: customFormTab === 'manual' ? P.CARD_BG : 'transparent',
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: customFormTab === 'manual' ? P.ACCENT : P.TEXT_MUT, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    📝 Manual Log
                  </Text>
                </TouchableOpacity>
              </View>

              {customFormTab === 'ai' ? (
                /* AI Meal Estimator Form */
                <View>
                  <View style={{ marginBottom: 16 }}>
                    <Text style={styles.fieldLabel}>Describe what you ate</Text>
                    <TextInput
                      style={[styles.fieldInput, { height: 100, textAlignVertical: 'top', paddingTop: 10, paddingHorizontal: 12 }]}
                      placeholder="e.g. Two scrambled eggs, a piece of whole wheat sourdough toast with butter, and a cup of black coffee."
                      placeholderTextColor={P.TEXT_MUT}
                      multiline
                      numberOfLines={4}
                      value={customDescription}
                      onChangeText={setCustomDescription}
                    />
                    <Text style={{ color: P.TEXT_MUT, fontSize: 10, marginTop: 6, fontStyle: 'italic', lineHeight: 14 }}>
                      Write freely. The AI will estimate your calories and macros, and open a sheet for you to review and save.
                    </Text>
                  </View>

                  <TouchableOpacity
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Analyze meal description with AI"
                    style={[styles.primaryBtn, glowStyle(P.ACCENT, 12, 0.35), isProcessing && { opacity: 0.7 }]}
                    onPress={handleAnalyzeMealDescription}
                    disabled={isProcessing}
                    activeOpacity={0.85}
                  >
                    {isProcessing ? (
                      <ActivityIndicator color="#000" size="small" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Analyze with AI ✨</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                /* Manual Custom Food Form */
                <View>
                  <FieldRow label="Food Name">
                    <TextInput style={styles.fieldInput} placeholder="e.g. Scrambled Eggs" placeholderTextColor={P.TEXT_MUT} value={customName} onChangeText={setCustomName} />
                  </FieldRow>
                  <FieldRow label="Brand (Optional)">
                    <TextInput style={styles.fieldInput} placeholder="e.g. Local Farm" placeholderTextColor={P.TEXT_MUT} value={customBrand} onChangeText={setCustomBrand} />
                  </FieldRow>

                  <View style={[sharedStyles.row, { gap: 12, marginBottom: 14 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>Calories (kcal)</Text>
                      <TextInput style={[styles.fieldInput, { textAlign: 'center' }]} placeholder="140" placeholderTextColor={P.TEXT_MUT} keyboardType="numeric" value={customCalories} onChangeText={setCustomCalories} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>Serving Size</Text>
                      <TextInput style={[styles.fieldInput, { textAlign: 'center' }]} placeholder="2 eggs / 100g" placeholderTextColor={P.TEXT_MUT} value={customServing} onChangeText={setCustomServing} />
                    </View>
                  </View>

                  <View style={[sharedStyles.row, { gap: 8, marginBottom: 20 }]}>
                    {[
                      { label: 'Protein (g)', val: customProtein, set: setCustomProtein, color: P.ACCENT },
                      { label: 'Carbs (g)',   val: customCarbs,   set: setCustomCarbs,   color: P.BLUE  },
                      { label: 'Fat (g)',     val: customFat,     set: setCustomFat,     color: P.AMBER },
                    ].map((f) => (
                      <View key={f.label} style={{ flex: 1 }}>
                        <Text style={[styles.fieldLabel, { color: f.color }]}>{f.label}</Text>
                        <TextInput
                          style={[styles.fieldInput, { textAlign: 'center', borderColor: f.color + '30' }]}
                          placeholder="0"
                          placeholderTextColor={P.TEXT_MUT}
                          keyboardType="numeric"
                          value={f.val}
                          onChangeText={f.set}
                        />
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Save food and log it"
                    style={[styles.primaryBtn, glowStyle(P.ACCENT, 12, 0.35)]}
                    onPress={handleCreateCustomFood}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.primaryBtnText}>Save Food & Log</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Animated.View>
          )}
        </ScrollView>

        {/* ── Draft Confirmation Sheet (Photo / Barcode) ───────────── */}
        {draftResult && (
          <View style={styles.sheetOverlay}>
            <Animated.View entering={FadeInDown.duration(400)} style={styles.sheet}>
              <View style={[sharedStyles.rowBetween, { marginBottom: 4 }]}>
                <Text style={styles.sheetTitle}>
                  {draftResult.source === 'photo' ? '📸 Verify Detected Food' : '🏷️ Verify Scanned Product'}
                </Text>
                <TouchableOpacity
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Discard and close"
                  onPress={() => setDraftResult(null)}
                  style={styles.sheetCloseBtn}
                >
                  <Ionicons name="close" size={16} color={P.TEXT_PRI} />
                </TouchableOpacity>
              </View>

              {draftResult.source === 'photo' && (
                <View style={styles.lowConfidenceWarn}>
                  <Ionicons name="sparkles" size={15} color={P.AMBER} />
                  <Text style={styles.lowConfidenceText}>AI estimate — please confirm the macros before saving.</Text>
                </View>
              )}

              <View style={{ marginBottom: 14 }}>
                <Text style={styles.fieldLabel}>Food Name</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={draftResult.name}
                  onChangeText={(val) => setDraftResult((prev) => prev ? { ...prev, name: val } : prev)}
                />
              </View>

              <View style={[sharedStyles.row, { gap: 8, marginBottom: 14 }]}>
                {[
                  { label: 'Calories', key: 'calories', color: P.ACCENT },
                  { label: 'Protein',  key: 'protein',  color: P.ACCENT },
                  { label: 'Carbs',    key: 'carbs',    color: P.BLUE   },
                  { label: 'Fat',      key: 'fat',      color: P.AMBER  },
                ].map((f) => (
                  <View key={f.key} style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: f.color }]}>{f.label}</Text>
                    <TextInput
                      style={[styles.fieldInput, { textAlign: 'center', borderColor: f.color + '30', color: f.key === 'calories' ? P.ACCENT : P.TEXT_PRI }]}
                      keyboardType="numeric"
                      value={(draftResult as any)[f.key]}
                      onChangeText={(val) => setDraftResult((prev) => prev ? { ...prev, [f.key]: val } : prev)}
                    />
                  </View>
                ))}
              </View>

              <View style={[sharedStyles.row, { gap: 12, marginBottom: 20 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Servings</Text>
                  <TextInput
                    style={[styles.fieldInput, { textAlign: 'center', fontSize: 18 }]}
                    keyboardType="numeric"
                    value={servings}
                    onChangeText={setServings}
                    selectTextOnFocus
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Serving Size</Text>
                  <TextInput
                    style={[styles.fieldInput, { textAlign: 'center' }]}
                    value={draftResult.serving_size}
                    onChangeText={(val) => setDraftResult((prev) => prev ? { ...prev, serving_size: val } : prev)}
                  />
                </View>
              </View>

              <TouchableOpacity
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Confirm and log food"
                onPress={handleConfirmDraft}
                style={[styles.primaryBtn, glowStyle(P.ACCENT, 12, 0.35)]}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>Confirm & Log</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}

        {/* ── Serving Selector Modal (standard Search) ──────────────── */}
        {!draftResult && selectedFood && (
          <View style={styles.sheetOverlay}>
            <View style={styles.sheet}>
              <View style={[sharedStyles.rowBetween, { marginBottom: 16 }]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.sheetTitle}>{selectedFood.name}</Text>
                  <Text style={styles.sheetSub}>{selectedFood.brand}  ·  {selectedFood.serving_size}</Text>
                </View>
                <TouchableOpacity accessible={true} accessibilityRole="button" accessibilityLabel="Close" onPress={() => setSelectedFood(null)}>
                  <Ionicons name="close" size={20} color={P.TEXT_MUT} />
                </TouchableOpacity>
              </View>

              <View style={styles.servingCard}>
                <View>
                  <Text style={styles.fieldLabel}>Enter Servings</Text>
                  <TextInput
                    style={styles.servingInput}
                    keyboardType="numeric"
                    value={servings}
                    onChangeText={setServings}
                    selectTextOnFocus
                  />
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.fieldLabel}>Estimated Energy</Text>
                  <Text style={styles.servingKcal}>
                    {Math.round(selectedFood.calories * (parseFloat(servings) || 0))} kcal
                  </Text>
                </View>
              </View>

              <View style={[sharedStyles.row, { gap: 12, paddingTop: 8 }]}>
                <TouchableOpacity
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  onPress={() => setSelectedFood(null)}
                  style={[styles.ghostBtn, { flex: 1 }]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.ghostBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Confirm log"
                  onPress={handleLogFood}
                  style={[styles.primaryBtn, { flex: 1 }, glowStyle(P.ACCENT, 12, 0.35)]}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryBtnText}>Confirm Log</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Field row helper ─────────────────────────────────────────────────────────
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: 20,
    paddingVertical:   16,
    borderBottomWidth: 1,
    borderBottomColor: P.CARD_BORDER,
    backgroundColor:   P.BG,
    gap:               12,
  },
  backBtn: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: P.ACCENT_DIM,
    borderWidth:     1,
    borderColor:     P.ACCENT_BORDER,
    alignItems:      'center',
    justifyContent:  'center',
  },
  headerTitle: {
    fontSize:      22,
    fontWeight:    '800',
    color:         P.TEXT_PRI,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize:      10,
    fontWeight:    '700',
    color:         P.TEXT_MUT,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop:     2,
  },

  // Capture tiles
  captureTilesRow: {
    flexDirection:  'row',
    gap:            10,
    marginBottom:   16,
  },
  captureTilePrimary: {
    flex:            1.3,
    backgroundColor: P.ACCENT,
    borderRadius:    P.RADIUS_CARD,
    padding:         16,
    alignItems:      'center',
    gap:             8,
    ...Platform.select({
      android: { elevation: 10, borderWidth: 1, borderColor: P.ACCENT + '88' },
    }),
  },
  captureTileIconWrap: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  captureTileLabelPrimary: {
    fontSize:      11,
    fontWeight:    '900',
    color:         '#000',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textAlign:     'center',
  },
  captureTileSecondary: {
    flex:            1,
    backgroundColor: P.CARD_BG,
    borderWidth:     1,
    borderColor:     P.CARD_BORDER,
    borderRadius:    P.RADIUS_CARD,
    padding:         16,
    alignItems:      'center',
    gap:             8,
  },
  captureTileLabelSec: {
    fontSize:      10,
    fontWeight:    '700',
    color:         P.TEXT_SEC,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    textAlign:     'center',
  },

  // Search
  searchInput: {
    backgroundColor:  P.CARD_BG,
    color:            P.TEXT_PRI,
    paddingHorizontal: 16,
    paddingVertical:   14,
    borderRadius:      P.RADIUS_SM,
    borderWidth:       1,
    borderColor:       P.CARD_BORDER,
    fontSize:          14,
    fontWeight:        '600',
    marginBottom:      14,
  },
  customFoodLink: {
    fontSize:      10,
    fontWeight:    '800',
    color:         P.ACCENT,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  emptyCard: {
    backgroundColor: P.CARD_BG,
    borderWidth:     1,
    borderColor:     P.CARD_BORDER,
    borderRadius:    P.RADIUS_CARD,
    padding:         32,
    alignItems:      'center',
    justifyContent:  'center',
  },
  emptyText: {
    color:     P.TEXT_MUT,
    fontSize:  13,
    fontWeight:'600',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyCustomBtn: {
    backgroundColor: P.ACCENT_DIM,
    borderWidth:     1,
    borderColor:     P.ACCENT_BORDER,
    paddingHorizontal: 20,
    paddingVertical:   10,
    borderRadius:    P.RADIUS_FULL,
  },
  emptyCustomText: {
    color:         P.ACCENT,
    fontWeight:    '800',
    fontSize:      11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  resultCard: {
    backgroundColor: P.CARD_BG,
    borderWidth:     1,
    borderColor:     P.CARD_BORDER,
    borderRadius:    P.RADIUS_CARD,
    padding:         14,
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
  },
  resultName: {
    color:      P.TEXT_PRI,
    fontSize:   14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  resultMeta: {
    color:      P.TEXT_MUT,
    fontSize:   10,
    fontWeight: '600',
    marginTop:  2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  resultKcal: {
    color:      P.ACCENT,
    fontWeight: '800',
    fontSize:   13,
  },
  resultMacros: {
    color:      P.TEXT_MUT,
    fontSize:   9,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop:  2,
  },

  // Custom form
  customForm: {
    backgroundColor: P.CARD_BG,
    borderWidth:     1,
    borderColor:     P.CARD_BORDER,
    borderRadius:    P.RADIUS_CARD,
    padding:         18,
    marginBottom:    24,
  },
  customFormTitle: {
    fontSize:      16,
    fontWeight:    '800',
    color:         P.TEXT_PRI,
    letterSpacing: -0.2,
  },
  customFormCancel: {
    color:         P.TEXT_MUT,
    fontWeight:    '700',
    fontSize:      11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  fieldLabel: {
    fontSize:      9,
    fontWeight:    '800',
    color:         P.TEXT_MUT,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom:  6,
  },
  fieldInput: {
    backgroundColor:  P.BG,
    color:            P.TEXT_PRI,
    paddingHorizontal: 12,
    paddingVertical:   12,
    borderRadius:      P.RADIUS_SM,
    borderWidth:       1,
    borderColor:       P.CARD_BORDER,
    fontSize:          13,
    fontWeight:        '600',
  },

  // Buttons
  primaryBtn: {
    backgroundColor: P.ACCENT,
    borderRadius:    P.RADIUS_SM,
    paddingVertical: 15,
    minHeight:       44,
    alignItems:      'center',
    justifyContent:  'center',
    ...Platform.select({
      android: { elevation: 8, borderWidth: 1, borderColor: P.ACCENT + '88' },
    }),
  },
  primaryBtnText: {
    color:         '#000',
    fontWeight:    '900',
    fontSize:      13,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  ghostBtn: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth:     1,
    borderColor:     P.CARD_BORDER,
    borderRadius:    P.RADIUS_SM,
    paddingVertical: 15,
    minHeight:       44,
    alignItems:      'center',
    justifyContent:  'center',
  },
  ghostBtnText: {
    color:     P.TEXT_SEC,
    fontWeight:'700',
    fontSize:  13,
  },

  // Sheets / Modals
  sheetOverlay: {
    position:        'absolute',
    inset:           0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent:  'flex-end',
    zIndex:          50,
  } as any,
  sheet: {
    backgroundColor: P.CARD_BG,
    borderTopLeftRadius:  P.RADIUS_CARD,
    borderTopRightRadius: P.RADIUS_CARD,
    borderWidth:     1,
    borderColor:     P.CARD_BORDER,
    padding:         24,
    paddingBottom:   Platform.OS === 'ios' ? 40 : 24,
    gap:             0,
  },
  sheetTitle: {
    fontSize:      18,
    fontWeight:    '800',
    color:         P.TEXT_PRI,
    letterSpacing: -0.3,
    flex:          1,
  },
  sheetSub: {
    fontSize:      10,
    fontWeight:    '700',
    color:         P.TEXT_MUT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop:     3,
  },
  sheetCloseBtn: {
    width:           44,
    height:          44,
    minHeight:       44,
    minWidth:        44,
    borderRadius:    22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems:      'center',
    justifyContent:  'center',
  },

  lowConfidenceWarn: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             10,
    backgroundColor: P.AMBER + '12',
    borderWidth:     1,
    borderColor:     P.AMBER + '30',
    borderRadius:    10,
    padding:         12,
    marginBottom:    14,
    marginTop:       8,
  },
  lowConfidenceText: {
    color:     '#fbbf24',
    fontSize:  11,
    fontWeight:'700',
    flex:      1,
  },
  servingCard: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    backgroundColor: P.BG,
    borderWidth:     1,
    borderColor:     P.CARD_BORDER,
    borderRadius:    P.RADIUS_SM,
    padding:         16,
    marginBottom:    16,
  },
  servingInput: {
    color:      P.TEXT_PRI,
    fontSize:   24,
    fontWeight: '800',
    marginTop:  4,
    minWidth:   80,
  },
  servingKcal: {
    color:      P.ACCENT,
    fontSize:   20,
    fontWeight: '800',
    marginTop:  4,
  },

  // Camera views (web fallbacks)
  camHeader: {
    flexDirection:   'row',
    alignItems:      'center',
    paddingHorizontal: 20,
    paddingVertical:   16,
    borderBottomWidth: 1,
    borderBottomColor: P.CARD_BORDER,
    gap:              12,
  },
  camTitle: {
    fontSize:   22,
    fontWeight: '800',
    color:      P.TEXT_PRI,
  },
  camBackBtn: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: P.ACCENT_DIM,
    borderWidth:     1,
    borderColor:     P.ACCENT_BORDER,
    alignItems:      'center',
    justifyContent:  'center',
  },
  camBackArrow: {
    color:      P.ACCENT,
    fontWeight: '900',
    fontSize:   16,
  },
  uploadBox: {
    width:           '100%',
    maxWidth:        400,
    backgroundColor: P.CARD_BG,
    borderWidth:     2,
    borderStyle:     'dashed',
    borderColor:     P.CARD_BORDER,
    borderRadius:    P.RADIUS_CARD,
    padding:         40,
    alignItems:      'center',
    gap:             12,
  } as any,
  uploadTitle: {
    color:      P.TEXT_PRI,
    fontSize:   15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  uploadSub: {
    color:     P.TEXT_MUT,
    fontSize:  11,
    textAlign: 'center',
    fontWeight:'600',
  },
  webBarcodeCard: {
    width:           '100%',
    maxWidth:        400,
    backgroundColor: P.CARD_BG,
    borderRadius:    P.RADIUS_CARD,
    borderWidth:     1,
    borderColor:     P.CARD_BORDER,
    padding:         20,
    gap:             12,
  },
  webBarcodeInput: {
    backgroundColor:  P.BG,
    color:            P.TEXT_PRI,
    paddingHorizontal: 16,
    paddingVertical:   14,
    borderRadius:      P.RADIUS_SM,
    borderWidth:       1,
    borderColor:       P.CARD_BORDER,
    fontSize:          14,
    fontWeight:        '600',
    textAlign:         'center',
  },
  webBarcodBtn: {
    backgroundColor: P.ACCENT,
    paddingVertical:  14,
    borderRadius:     P.RADIUS_SM,
    alignItems:      'center',
  },
  webBarcodeText: {
    color:         '#000',
    fontWeight:    '900',
    fontSize:      12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Native camera overlays
  nativeCamBack: {
    margin:          20,
    width:           48,
    height:          48,
    borderRadius:    24,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.10)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  camViewfinder: {
    position:       'absolute',
    left:           48,
    right:          48,
    top:            '25%' as any,
    bottom:         '25%' as any,
    borderWidth:    1,
    borderColor:    'rgba(255,255,255,0.10)',
    borderRadius:   40,
    alignItems:     'center',
    justifyContent: 'center',
  },
  camViewfinderLabel: {
    color:         'rgba(255,255,255,0.4)',
    fontSize:      11,
    fontWeight:    '800',
    textTransform: 'uppercase',
    letterSpacing: 2,
    textAlign:     'center',
    paddingHorizontal: 16,
  },
  camOverlay: {
    position:        'absolute',
    inset:           0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius:    40,
  } as any,
  camLaser: {
    position:        'absolute',
    left:            0,
    right:           0,
    height:          2,
    backgroundColor: P.ACCENT,
    ...Platform.select({
      ios: { shadowColor: P.ACCENT, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 6 },
    }),
  },
  barcodeFinder: {
    width:          300,
    height:         180,
    borderColor:    'transparent', // corners drawn separately via bracket styles
    borderRadius:   20,
    overflow:       'hidden',
    position:       'relative',
  },
  // Corner brackets
  bracket: {
    position:    'absolute',
    width:       28,
    height:      28,
    borderLeftWidth:  3,
    borderTopWidth:   3,
    borderRadius:     4,
  },
  bracketTL: { top: 0,  left:  0 },
  bracketTR: { top: 0,  right: 0, transform: [{ scaleX: -1 }] },
  bracketBL: { bottom: 0, left: 0,  transform: [{ scaleY: -1 }] },
  bracketBR: { bottom: 0, right: 0, transform: [{ scaleX: -1 }, { scaleY: -1 }] },
  barcodeProcessing: {
    position:        'absolute',
    inset:           0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent:  'center',
    alignItems:      'center',
    gap:             10,
  } as any,
  barcodeLookupText: {
    color:      P.ACCENT,
    fontSize:   11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  scanStatusBox: {
    marginTop:  22,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  scanStatusText: {
    color:      'rgba(255,255,255,0.65)',
    fontSize:   12,
    fontWeight: '700',
    textAlign:  'center',
    letterSpacing: 0.3,
  },
  camModeBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    backgroundColor:   'rgba(0,0,0,0.65)',
    borderWidth:       1,
    borderColor:       P.ACCENT_BORDER,
    borderRadius:      P.RADIUS_FULL,
    paddingHorizontal: 12,
    paddingVertical:   6,
  },
  camModeBadgeText: {
    color:         P.ACCENT,
    fontSize:      10,
    fontWeight:    '900',
    letterSpacing: 1,
  },
  scanAgainBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    backgroundColor:   P.ACCENT_DIM,
    borderWidth:       1,
    borderColor:       P.ACCENT_BORDER,
    borderRadius:      P.RADIUS_FULL,
    paddingHorizontal: 14,
    paddingVertical:   8,
  },
  scanAgainText: {
    color:         P.ACCENT,
    fontSize:      11,
    fontWeight:    '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  scanCustomBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    backgroundColor:   P.AMBER + '15',
    borderWidth:       1,
    borderColor:       P.AMBER + '40',
    borderRadius:      P.RADIUS_FULL,
    paddingHorizontal: 14,
    paddingVertical:   8,
  },
  scanCustomText: {
    color:         P.AMBER,
    fontSize:      11,
    fontWeight:    '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  camBottomBar: {
    position:       'absolute',
    bottom:         40,
    left:           0,
    right:          0,
    alignItems:     'center',
  },
  captureBtn: {
    width:           80,
    height:          80,
    backgroundColor: '#FFF',
    borderRadius:    40,
    borderWidth:     4,
    borderColor:     'rgba(0,0,0,0.4)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  captureBtnInner: {
    width:           56,
    height:          56,
    backgroundColor: P.ACCENT,
    borderRadius:    28,
  },
});

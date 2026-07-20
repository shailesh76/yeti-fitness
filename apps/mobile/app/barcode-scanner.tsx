import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFoodStore } from '../store/useFoodStore';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { P, glowStyle, sharedStyles } from '../constants/premiumTheme';

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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={P.ACCENT} />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.permTitle}>Camera Permission Needed</Text>
          <Text style={styles.permSub}>We need access to your camera to scan food barcodes.</Text>
          <TouchableOpacity 
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Grant camera permission"
            style={[styles.primaryBtn, glowStyle(P.ACCENT, 12, 0.3)]}
            onPress={requestPermission}
          >
            <Text style={styles.primaryBtnText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
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
          <Text style={styles.headerTitle}>Barcode Scanner</Text>
          <Text style={styles.headerSub}>Point camera at barcode</Text>
        </View>
      </View>

      {/* Target Meal Type Selector */}
      <View style={styles.mealSelectorRow}>
        {MEALS.map((meal) => {
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

      {/* Scanner viewfinder / Web Manual Input */}
      {Platform.OS === 'web' ? (
        <View style={styles.webContainer}>
          <View style={styles.webCard}>
            <Text style={styles.webCardTitle}>Manual Barcode Entry</Text>
            <Text style={styles.webCardSub}>Webcams are low resolution for barcodes. Type the barcode digits below to query OpenFoodFacts.</Text>
            
            <TextInput
              style={styles.webInput}
              placeholder="e.g. 5449000000996"
              placeholderTextColor={P.TEXT_MUT}
              value={manualBarcode}
              onChangeText={setManualBarcode}
              keyboardType="numeric"
            />

            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Search and log barcode product"
              onPress={() => handleBarcodeScanned({ data: manualBarcode })}
              disabled={syncing || !manualBarcode}
              style={[styles.primaryBtn, glowStyle(P.ACCENT, 12, 0.3)]}
            >
              {syncing ? (
                <ActivityIndicator color="#0B0B0F" />
              ) : (
                <Text style={styles.primaryBtnText}>Search & Log Product</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.cameraWrapper}>
          <CameraView
            style={StyleSheet.absoluteFill}
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'],
            }}
          />

          <View style={styles.viewfinderFrame}>
            <Animated.View style={[styles.laserLine, lineStyle]} />
            
            {syncing && (
              <View style={styles.syncOverlay}>
                <ActivityIndicator size="large" color={P.ACCENT} />
                <Text style={styles.syncText}>Syncing database...</Text>
              </View>
            )}
          </View>

          <Text style={styles.hintText}>
            Align barcode inside the central frame
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: P.BG },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
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
  primaryBtn: { width: '100%', backgroundColor: P.ACCENT, borderRadius: P.RADIUS_PILL, minHeight: 52, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#0B0B0F', fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  webContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  webCard: { width: '100%', maxWidth: 420, backgroundColor: P.CARD_BG, borderWidth: 1, borderColor: P.CARD_BORDER, borderRadius: P.RADIUS_CARD, padding: 24, gap: 14 },
  webCardTitle: { fontSize: 18, fontWeight: '900', color: P.TEXT_PRI },
  webCardSub: { fontSize: 12, color: P.TEXT_MUT, lineHeight: 18 },
  webInput: { backgroundColor: P.BG, color: P.TEXT_PRI, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: P.CARD_BORDER, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  cameraWrapper: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  viewfinderFrame: { width: 280, height: 190, borderRadius: P.RADIUS_CARD, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' },
  laserLine: { height: 2, width: '100%', backgroundColor: P.ACCENT },
  syncOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  syncText: { color: P.TEXT_PRI, fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10 },
  hintText: { position: 'absolute', bottom: 40, color: P.TEXT_MUT, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center', paddingHorizontal: 20 },
});


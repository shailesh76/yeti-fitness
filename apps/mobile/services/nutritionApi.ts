import { supabase } from '../lib/supabase';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';
import {
  FoodPhotoAnalysis,
  BarcodeProductInfo,
  mapOpenFoodFactsProduct,
  resolveDevMock,
  combineFoodAnalysis,
} from './nutritionUtils';

// Re-export the normalized types so existing importers keep their import path.
export type {
  NutritionSource,
  NutritionRecord,
  FoodPhotoAnalysis,
  BarcodeProductInfo,
} from './nutritionUtils';

/**
 * Analyzes a food photo using the Supabase edge function 'analyze-food-image'.
 */
export const analyzeFoodPhoto = async (imageUri: string): Promise<FoodPhotoAnalysis> => {
  try {
    let base64 = '';
    const isBase64 = imageUri.startsWith('data:') ||
      (!imageUri.includes('://') && !imageUri.startsWith('/') && !imageUri.startsWith('file:'));

    if (isBase64) {
      base64 = imageUri.includes('base64,') ? imageUri.split('base64,')[1] : imageUri;
    } else if (Platform.OS === 'web' || imageUri.startsWith('http') || imageUri.startsWith('https')) {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split('base64,')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      // Resize + compress local URIs on native (ph://, content://, file://).
      const manipulated = await manipulateAsync(
        imageUri,
        [{ resize: { width: 1024 } }],
        { compress: 0.7, format: SaveFormat.JPEG }
      );
      const response = await fetch(manipulated.uri);
      const blob = await response.blob();
      base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split('base64,')[1] || '');
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    if (!base64) throw new Error("Could not process image to base64");

    const { data, error } = await supabase.functions.invoke('analyze-food-image', {
      body: { image: base64 }
    });

    if (error) throw error;
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error("No food items could be identified.");
    }

    return combineFoodAnalysis(data);
  } catch (e: any) {
    console.error("Error analyzing food photo:", e);
    throw new Error(e.message || "Failed to analyze food image.");
  }
};

/**
 * Looks up barcode product info. Production results come only from the Yeti cache
 * (handled by the caller) or Open Food Facts. Returns `null` when Open Food Facts
 * has no valid product — callers surface an honest "not found" state and never
 * fabricate a name/serving/macros. Development-only stub products are gated behind
 * __DEV__ and can never appear in a production build.
 */
export const lookupBarcodeProduct = async (barcode: string): Promise<BarcodeProductInfo | null> => {
  const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
  const mock = resolveDevMock(barcode, isDev);
  if (mock) return mock;

  try {
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (Platform.OS !== 'web') {
      headers['User-Agent'] = 'YetiFitness/1.0 (support@dude.com)';
    }

    const resp = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`, { headers });
    if (!resp.ok) return null;

    const json = await resp.json();
    return mapOpenFoodFactsProduct(json, barcode);
  } catch (e) {
    console.error("Error looking up barcode:", e);
    return null;
  }
};

/**
 * Analyzes a text description of a meal using the Supabase edge function 'analyze-food-image'.
 */
export const analyzeFoodDescription = async (description: string): Promise<FoodPhotoAnalysis> => {
  try {
    const { data, error } = await supabase.functions.invoke('analyze-food-image', {
      body: { description }
    });

    if (error) throw error;
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error("Could not parse meal description.");
    }

    return combineFoodAnalysis(data);
  } catch (e: any) {
    console.error("Error analyzing food description:", e);
    throw new Error(e.message || "Failed to analyze meal description.");
  }
};

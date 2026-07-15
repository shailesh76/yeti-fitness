import { supabase } from '../lib/supabase';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

export interface FoodPhotoAnalysis {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
}

export interface BarcodeProductInfo {
  name: string;
  brand: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_size: string;
}

/**
 * Analyzes a food photo using the Supabase edge function 'analyze-food-image'.
 */
export const analyzeFoodPhoto = async (imageUri: string): Promise<FoodPhotoAnalysis> => {
  try {
    let base64 = '';
    // If it's already a base64 data URL or a raw base64 string
    const isBase64 = imageUri.startsWith('data:') || 
      (!imageUri.includes('://') && !imageUri.startsWith('/') && !imageUri.startsWith('file:'));

    if (isBase64) {
      base64 = imageUri.includes('base64,') ? imageUri.split('base64,')[1] : imageUri;
    } else if (Platform.OS === 'web' || imageUri.startsWith('http') || imageUri.startsWith('https')) {
      // For web platform or remote HTTP URLs, use fetch to convert to base64
      const response = await fetch(imageUri);
      const blob = await response.blob();
      base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = (reader.result as string).split('base64,')[1];
          resolve(res);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      // Resize and compress the photo for local URIs on native platforms (ph://, content://, file://)
      const manipulated = await manipulateAsync(
        imageUri,
        [{ resize: { width: 1024 } }],
        { compress: 0.7, format: SaveFormat.JPEG }
      );
      
      // Convert the local file URI to base64 using fetch + FileReader for mobile stability
      const response = await fetch(manipulated.uri);
      const blob = await response.blob();
      base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = (reader.result as string).split('base64,')[1];
          resolve(res || '');
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    if (!base64) {
      throw new Error("Could not process image to base64");
    }

    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('analyze-food-image', {
      body: { image: base64 }
    });

    if (error) throw error;
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error("No food items could be identified.");
    }

    // Map/reduce array response to a single FoodPhotoAnalysis object
    const combined: FoodPhotoAnalysis = {
      name: data.map((item: any) => item.name || 'Unnamed food').join(' + '),
      calories: Math.round(data.reduce((sum: number, item: any) => sum + (Number(item.calories) || 0), 0)),
      protein: Math.round(data.reduce((sum: number, item: any) => sum + (Number(item.protein) || 0), 0) * 10) / 10,
      carbs: Math.round(data.reduce((sum: number, item: any) => sum + (Number(item.carbs) || 0), 0) * 10) / 10,
      fat: Math.round(data.reduce((sum: number, item: any) => sum + (Number(item.fat) || 0), 0) * 10) / 10,
      confidence: 0.95
    };

    return combined;
  } catch (e: any) {
    console.error("Error analyzing food photo:", e);
    throw new Error(e.message || "Failed to analyze food image.");
  }
};

/**
 * Looks up barcode product info using the OpenFoodFacts API.
 */
export const lookupBarcodeProduct = async (barcode: string): Promise<BarcodeProductInfo | null> => {
  // 1. Check local mock products first (for testing/demo using stub barcodes)
  const mockProducts: Record<string, BarcodeProductInfo> = {
    "00123456": {
      name: "Chobani Greek Yogurt - Blueberry",
      brand: "Chobani",
      calories: 120,
      protein: 12,
      carbs: 15,
      fat: 0,
      serving_size: "150g"
    },
    "4900003675": {
      name: "Coca-Cola Classic",
      brand: "Coca-Cola",
      calories: 140,
      protein: 0,
      carbs: 39,
      fat: 0,
      serving_size: "355ml"
    },
    "00705621": {
      name: "Quest Protein Bar - Chocolate Chip Cookie Dough",
      brand: "Quest Nutrition",
      calories: 200,
      protein: 21,
      carbs: 21,
      fat: 9,
      serving_size: "60g"
    },
    "00413310": {
      name: "Skippy Creamy Peanut Butter",
      brand: "Skippy",
      calories: 190,
      protein: 7,
      carbs: 6,
      fat: 16,
      serving_size: "32g"
    }
  };

  if (mockProducts[barcode]) {
    return mockProducts[barcode];
  }

  // 2. Query real OpenFoodFacts database
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (Platform.OS !== 'web') {
      headers['User-Agent'] = 'DudeApp/1.0 (support@dude.com)';
    }

    const resp = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`, {
      headers
    });
    if (!resp.ok) return null;

    const json = await resp.json();
    if (!json.product) return null;

    const p = json.product;
    const nutriments = p.nutriments || {};

    // OpenFoodFacts returns energy-kcal_100g or energy-kcal_serving, or energy-kj_100g.
    // We resolve the calories in a robust way:
    let calories = 0;
    if (nutriments['energy-kcal_100g'] !== undefined) {
      calories = Number(nutriments['energy-kcal_100g']);
    } else if (nutriments['energy-kcal'] !== undefined) {
      calories = Number(nutriments['energy-kcal']);
    } else if (nutriments['energy-kcal_serving'] !== undefined) {
      calories = Number(nutriments['energy-kcal_serving']);
    } else if (nutriments['energy-kj_100g'] !== undefined) {
      calories = Math.round(Number(nutriments['energy-kj_100g']) * 0.239006);
    } else if (nutriments['energy_100g'] !== undefined) {
      calories = Math.round(Number(nutriments['energy_100g']) * 0.239006);
    }

    return {
      name: p.product_name || 'Unnamed Product',
      brand: p.brands || 'Unknown Brand',
      calories: calories || 0,
      protein: Number(nutriments.proteins_100g) || Number(nutriments.proteins_serving) || 0,
      carbs: Number(nutriments.carbohydrates_100g) || Number(nutriments.carbohydrates_serving) || 0,
      fat: Number(nutriments.fat_100g) || Number(nutriments.fat_serving) || 0,
      serving_size: p.serving_size || '100g',
    };
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

    const combined: FoodPhotoAnalysis = {
      name: data.map((item: any) => item.name || 'Unnamed food').join(' + '),
      calories: Math.round(data.reduce((sum: number, item: any) => sum + (Number(item.calories) || 0), 0)),
      protein: Math.round(data.reduce((sum: number, item: any) => sum + (Number(item.protein) || 0), 0) * 10) / 10,
      carbs: Math.round(data.reduce((sum: number, item: any) => sum + (Number(item.carbs) || 0), 0) * 10) / 10,
      fat: Math.round(data.reduce((sum: number, item: any) => sum + (Number(item.fat) || 0), 0) * 10) / 10,
      confidence: 0.95
    };

    return combined;
  } catch (e: any) {
    console.error("Error analyzing food description:", e);
    throw new Error(e.message || "Failed to analyze meal description.");
  }
};

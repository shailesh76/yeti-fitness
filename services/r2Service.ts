import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

interface CachedUrl {
  url: string;
  expiresAt: number;
}

// In-memory cache for signed URLs (valid for 50 minutes to stay within the 1-hour expiry)
const urlCache: Record<string, CachedUrl> = {};
const CACHE_DURATION_MS = 50 * 60 * 1000;

/**
 * Compresses an image on mobile and uploads it to Cloudflare R2 via Edge Function.
 * @param fileUri The local file URI (e.g., from camera or image picker)
 * @param folder The target folder ('progress-photos' or 'food-scans')
 * @param fileName Optional custom filename, defaults to timestamp-based name
 */
export async function uploadFileToR2(
  fileUri: string,
  folder: 'progress-photos' | 'food-scans',
  fileName?: string
): Promise<{ success: boolean; key: string; error?: string }> {
  try {
    let base64Data: string;
    let finalFileName = fileName || `${Date.now()}.jpg`;
    let contentType = 'image/jpeg';

    if (Platform.OS === 'web') {
      // On web, if it's already a base64 string or blob URL
      if (fileUri.startsWith('data:')) {
        base64Data = fileUri;
      } else {
        const response = await fetch(fileUri);
        const blob = await response.blob();
        base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } else {
      // On mobile, compress first using expo-image-manipulator to limit image sizes
      // Resize to max width 1920, compress at 80% quality
      const manipulated = await manipulateAsync(
        fileUri,
        [{ resize: { width: 1920 } }],
        { compress: 0.8, format: SaveFormat.JPEG }
      );

      // Convert to base64 using fetch + FileReader for reliability on mobile
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

      if (!base64Data) {
        throw new Error('Image manipulation failed to produce base64 output');
      }
    }

    // Call Supabase Edge Function to perform upload
    const { data, error } = await supabase.functions.invoke('upload-to-r2', {
      body: {
        file: base64Data,
        fileName: finalFileName,
        contentType,
        folder,
      },
    });

    if (error) {
      throw error;
    }

    if (!data || !data.success) {
      throw new Error(data?.error || 'Upload failed');
    }

    return {
      success: true,
      key: data.key,
    };
  } catch (err: any) {
    console.error('Error uploading file to R2:', err);
    return {
      success: false,
      key: '',
      error: err.message || 'Unknown error occurred during upload',
    };
  }
}

/**
 * Obtains a secure signed URL to view a private file, with 50-minute local caching.
 * @param objectKey The full object key (e.g., 'progress-photos/user-id/filename.jpg')
 */
export async function getSignedUrl(objectKey: string): Promise<string> {
  if (!objectKey) return '';

  const now = Date.now();
  const cached = urlCache[objectKey];

  // Return cached URL if it hasn't expired yet
  if (cached && cached.expiresAt > now) {
    return cached.url;
  }

  try {
    const { data, error } = await supabase.functions.invoke('get-r2-signed-url', {
      body: { key: objectKey },
    });

    if (error) throw error;
    if (!data || !data.url) throw new Error('Signed URL generation failed');

    // Store in cache
    urlCache[objectKey] = {
      url: data.url,
      expiresAt: now + CACHE_DURATION_MS,
    };

    return data.url;
  } catch (err) {
    console.error(`Failed to generate signed URL for key ${objectKey}:`, err);
    // If generation fails, we return empty so UI handles it gracefully
    return '';
  }
}

/**
 * Helper to clear the signed URL cache if needed (e.g. on logout)
 */
export function clearSignedUrlCache() {
  Object.keys(urlCache).forEach((key) => {
    delete urlCache[key];
  });
}

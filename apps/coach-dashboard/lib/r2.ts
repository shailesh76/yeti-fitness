import { supabase } from './supabase';

export interface ProgressPhotoView {
  id: string;
  photoKey: string;
  notes: string | null;
  createdAt: string;
  url: string | null;
  error: string | null;
}

export function orderProgressPhotos(photos: ProgressPhotoView[]) {
  return [...photos].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getCoachProgressPhotos(userId: string): Promise<ProgressPhotoView[]> {
  const { data, error } = await supabase.functions.invoke('get-r2-signed-url', {
    body: { action: 'list-progress-photos', userId },
  });
  if (error) throw error;
  if (!data?.success || !Array.isArray(data.photos)) throw new Error(data?.error || 'Could not load progress photos');
  return orderProgressPhotos(data.photos.map((photo: any) => ({
    id: String(photo.id),
    photoKey: String(photo.photoKey),
    notes: photo.notes ?? null,
    createdAt: String(photo.createdAt),
    url: typeof photo.url === 'string' ? photo.url : null,
    error: typeof photo.error === 'string' ? photo.error : null,
  })));
}

/**
 * Converts a browser File object to a base64 string.
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Uploads a file from the coach dashboard to Cloudflare R2 via the Edge Function.
 * @param file The browser File object
 * @param folder The target folder (e.g. 'exercises/gifs' or 'exercises/videos')
 */
export async function uploadFileToR2(
  file: File,
  folder: string
): Promise<{ success: boolean; key: string; url: string | null; error?: string }> {
  try {
    const base64Data = await fileToBase64(file);
    
    // Sanitize filename to prevent special character issues in URLs
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const fileName = `${Date.now()}_${sanitizedName}`;
    const contentType = file.type || 'application/octet-stream';

    const { data, error } = await supabase.functions.invoke('upload-to-r2', {
      body: {
        file: base64Data,
        fileName,
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
      url: data.url,
    };
  } catch (err: any) {
    console.error('Error uploading file to R2:', err);
    return {
      success: false,
      key: '',
      url: null,
      error: err.message || 'Upload failed',
    };
  }
}

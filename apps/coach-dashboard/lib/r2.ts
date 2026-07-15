import { supabase } from './supabase';

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

import { ExerciseMedia, MediaType, FileFormat } from '@yeti/types';

export interface R2Config {
  bucketName: string;
  publicUrl: string;
}

export class R2MediaService {
  private bucketName: string;
  private publicUrl: string;

  constructor(config?: Partial<R2Config>) {
    this.bucketName = config?.bucketName || (typeof process !== 'undefined' ? process.env.R2_BUCKET_NAME : undefined) || 'dude-media';
    this.publicUrl = config?.publicUrl || (typeof process !== 'undefined' ? process.env.R2_PUBLIC_URL : undefined) || 'https://media.yetifitness.app';
  }

  /**
   * Builds the canonical R2 storage key for an exercise media asset.
   * Path pattern: exercises/{exerciseSlug|exerciseId}/{mediaType}_{hash}.{format}
   */
  buildR2Key(exerciseIdentifier: string, mediaType: MediaType, fileFormat: FileFormat): string {
    const cleanId = exerciseIdentifier.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const timestamp = Date.now();
    return `exercises/${cleanId}/${mediaType}_${timestamp}.${fileFormat}`;
  }

  /**
   * Resolves a public CDN URL from an R2 bucket and key.
   */
  getPublicUrl(r2Key: string): string {
    if (!r2Key) return '';
    if (r2Key.startsWith('http://') || r2Key.startsWith('https://')) return r2Key;
    const cleanPublicUrl = this.publicUrl.replace(/\/$/, '');
    const cleanKey = r2Key.replace(/^\//, '');
    return `${cleanPublicUrl}/${cleanKey}`;
  }

  /**
   * Enriches an ExerciseMedia reference with fully resolved URLs.
   */
  resolveMediaUrls(media: ExerciseMedia): ExerciseMedia {
    const resolvedUrl = media.url || this.getPublicUrl(media.r2_key);
    const resolvedThumbnail = media.thumbnail_url || (media.media_type === 'thumbnail' ? resolvedUrl : null);
    return {
      ...media,
      r2_bucket: media.r2_bucket || this.bucketName,
      url: resolvedUrl,
      thumbnail_url: resolvedThumbnail,
    };
  }
}

export const defaultR2Service = new R2MediaService();

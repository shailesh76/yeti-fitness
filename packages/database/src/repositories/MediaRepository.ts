import { Database, Q } from '@nozbe/watermelondb';
import { ProgressPhoto } from '../models/ProgressPhoto';

export class MediaRepository {
  private db: Database;
  private supabase?: any;

  constructor(db: Database, supabase?: any) {
    this.db = db;
    this.supabase = supabase;
  }

  /**
   * Guards local WatermelonDB access. The native SQLite adapter is unavailable on
   * web, where `db` is null — fail with a clear, catchable error instead of a
   * cryptic "Cannot read properties of null" crash.
   */
  private requireDb(): Database {
    if (!this.db) {
      throw new Error('LOCAL_DB_UNAVAILABLE: local database is not available on this platform');
    }
    return this.db;
  }

  // --- Local Persistence ---

  async savePhotoMetadata(
    userId: string,
    photoKey: string,
    notes?: string
  ): Promise<ProgressPhoto> {
    this.requireDb();
    return this.db.write(async () => {
      return this.db.get<ProgressPhoto>('progress_photos').create(p => {
        p.user_id = userId;
        p.photo_key = photoKey;
        p.notes = notes;
        p.logged_at = Date.now();
        p.is_synced = false;
      });
    });
  }

  async getPhotoMetadata(userId: string): Promise<ProgressPhoto[]> {
    this.requireDb();
    return this.db.get<ProgressPhoto>('progress_photos')
      .query(Q.where('user_id', userId), Q.sortBy('logged_at', Q.desc))
      .fetch();
  }

  // --- Remote Operations ---

  async getUploadUrl(userId: string, extension: string = 'jpg'): Promise<{ uploadUrl: string; key: string }> {
    if (!this.supabase) {
      throw new Error('Supabase client not configured in MediaRepository');
    }
    const { data, error } = await this.supabase.functions.invoke('get-r2-signed-url', {
      body: { userId, extension }
    });
    if (error) throw error;
    return data; // returns { uploadUrl, key }
  }

  async deletePhotoRemote(photoId: string, photoKey: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase client not configured in MediaRepository');
    }
    // Delete photo metadata from remote Supabase table
    const { error: dbError } = await this.supabase
      .from('progress_photos')
      .delete()
      .eq('id', photoId);
    if (dbError) throw dbError;

    // Delete photo file from remote storage via Edge Function
    const { error: storageError } = await this.supabase.functions.invoke('upload-to-r2', {
      method: 'DELETE',
      body: { key: photoKey }
    });
    if (storageError) throw storageError;
  }
}

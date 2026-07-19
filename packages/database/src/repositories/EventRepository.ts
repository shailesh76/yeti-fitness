import { Database } from '@nozbe/watermelondb';

export class EventRepository {
  private db: Database;
  private supabase?: any;

  constructor(db: Database, supabase?: any) {
    this.db = db;
    this.supabase = supabase;
  }

  /**
   * Logs a product/athlete analytics event directly to Supabase.
   */
  async logActivity(userId: string, eventName: string, metadata: Record<string, any> = {}): Promise<void> {
    if (!this.supabase) {
      console.warn('[EventRepository] Supabase client missing. Skipping activity log:', eventName);
      return;
    }

    try {
      const { error } = await this.supabase
        .from('activity_logs')
        .insert({
          user_id: userId,
          event_name: eventName,
          metadata
        });

      if (error) throw error;
    } catch (e) {
      console.error('[EventRepository] Failed to log activity event:', eventName, e);
    }
  }

  /**
   * Logs application crashes, network errors, and database exceptions.
   * Excludes stack traces and internal errors from user-facing screens for security.
   */
  async logError(
    userId: string | null,
    context: string,
    errorMessage: string,
    stackTrace?: string
  ): Promise<void> {
    if (!this.supabase) {
      console.warn('[EventRepository] Supabase client missing. Cannot send error log:', errorMessage);
      return;
    }

    try {
      const { error } = await this.supabase
        .from('error_logs')
        .insert({
          user_id: userId || null,
          context,
          error_message: errorMessage,
          stack_trace: stackTrace || null
        });

      if (error) throw error;
    } catch (e) {
      console.error('[EventRepository] Failed to push central error log:', e);
    }
  }
}

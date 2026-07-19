import { Database } from '@nozbe/watermelondb';

export class NotificationRepository {
  private db: Database;
  private supabase?: any;

  constructor(db: Database, supabase?: any) {
    this.db = db;
    this.supabase = supabase;
  }

  async fetchNotifications(userId: string): Promise<any[]> {
    if (!this.supabase) {
      throw new Error('Supabase client not configured in NotificationRepository');
    }
    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async markAsRead(id: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase client not configured in NotificationRepository');
    }
    const { error } = await this.supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    if (error) throw error;
  }

  async markAllAsRead(userId: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase client not configured in NotificationRepository');
    }
    const { error } = await this.supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
    if (error) throw error;
  }
}

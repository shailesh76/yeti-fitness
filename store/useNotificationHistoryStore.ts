import { create } from 'zustand';

export type NotificationType = 'reminder' | 'coach' | 'challenge';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  timestamp: number;
  deepLink?: string;
}

interface NotificationHistoryState {
  notifications: AppNotification[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Omit<AppNotification, 'id' | 'read' | 'timestamp'>) => void;
}

export const useNotificationHistoryStore = create<NotificationHistoryState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async () => {
    const { useAuthStore } = require('./useAuthStore');
    const userId = useAuthStore.getState().session?.user?.id;
    if (!userId) return;

    try {
      const { supabase } = require('../lib/supabase');
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mapped: AppNotification[] = (data || []).map((n: any) => ({
        id: n.id,
        type: n.type as NotificationType,
        title: n.title,
        body: n.body,
        read: n.read,
        timestamp: new Date(n.created_at).getTime(),
        deepLink: n.deep_link,
      }));

      set({ 
        notifications: mapped, 
        unreadCount: mapped.filter((n: any) => !n.read).length 
      });
    } catch (e) {
      console.warn("Failed to fetch notifications:", e);
    }
  },

  markAsRead: async (id: string) => {
    set((state) => {
      const updated = state.notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      );
      return {
        notifications: updated,
        unreadCount: updated.filter(n => !n.read).length
      };
    });
    
    try {
      const { supabase } = require('../lib/supabase');
      await supabase.from('notifications').update({ read: true }).eq('id', id);
    } catch (e) {
      console.error("Failed to mark read:", e);
    }
  },

  markAllAsRead: async () => {
    set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0
    }));
    
    try {
      const { useAuthStore } = require('./useAuthStore');
      const userId = useAuthStore.getState().session?.user?.id;
      if (userId) {
        const { supabase } = require('../lib/supabase');
        await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
      }
    } catch (e) {
      console.error("Failed to mark all read:", e);
    }
  },

  addNotification: (payload) => {
    const newNotif: AppNotification = {
      ...payload,
      id: Math.random().toString(36).substring(7),
      read: false,
      timestamp: Date.now(),
    };

    set((state) => ({
      notifications: [newNotif, ...state.notifications],
      unreadCount: state.unreadCount + 1
    }));
  }
}));

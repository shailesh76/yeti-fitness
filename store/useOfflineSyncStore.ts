import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';

export interface SyncMutation {
  id: string;
  type: 'INSERT_WORKOUT_SESSION' | 'INSERT_SESSION_SET' | 'INSERT_MEAL_LOG' | 'INSERT_PR' | 'UPDATE_INVITE_STATUS' | 'INSERT_COACH_CLIENT';
  payload: any;
  timestamp: number;
}

interface OfflineSyncState {
  outbox: SyncMutation[];
  isOnline: boolean;
  isSyncing: boolean;
  enqueueMutation: (mutation: Omit<SyncMutation, 'id' | 'timestamp'>) => Promise<void>;
  flushQueue: () => Promise<void>;
  initNetworkListener: () => void;
  loadQueue: () => Promise<void>;
}

export const useOfflineSyncStore = create<OfflineSyncState>((set, get) => ({
  outbox: [],
  isOnline: typeof window !== 'undefined' && 'navigator' in window && 'onLine' in window.navigator ? window.navigator.onLine : true,
  isSyncing: false,

  enqueueMutation: async (mutation) => {
    const newMutation: SyncMutation = {
      ...mutation,
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
    };

    set((state) => {
      const updatedOutbox = [...state.outbox, newMutation];
      AsyncStorage.setItem('@dude_offline_outbox', JSON.stringify(updatedOutbox));
      return { outbox: updatedOutbox };
    });

    // Try to flush immediately if online
    if (get().isOnline && !get().isSyncing) {
      get().flushQueue();
    }
  },

  loadQueue: async () => {
    try {
      const stored = await AsyncStorage.getItem('@dude_offline_outbox');
      if (stored) {
        set({ outbox: JSON.parse(stored) });
      }
    } catch (e) {
      console.warn('Failed to load outbox', e);
    }
  },

  flushQueue: async () => {
    const { outbox, isOnline, isSyncing } = get();
    if (!isOnline || isSyncing || outbox.length === 0) return;

    console.log("Offline Sync Queue starting. Outbox contents:", outbox);
    set({ isSyncing: true });

    const processedIds = new Set<string>();

    for (const mutation of outbox) {
      try {
        let error = null;

        if (mutation.type === 'INSERT_WORKOUT_SESSION') {
          const { error: err } = await supabase.from('workout_sessions').insert(mutation.payload);
          error = err;
        } else if (mutation.type === 'INSERT_SESSION_SET') {
          const { error: err } = await supabase.from('session_sets').insert(mutation.payload);
          error = err;
        } else if (mutation.type === 'INSERT_MEAL_LOG') {
          const { error: err } = await supabase.from('meal_logs').insert(mutation.payload);
          error = err;
        } else if (mutation.type === 'INSERT_PR') {
          const { error: err } = await supabase.from('personal_records').insert(mutation.payload);
          error = err;
        } else if (mutation.type === 'UPDATE_INVITE_STATUS') {
          const { id: inviteId, status } = mutation.payload;
          const { error: err } = await supabase.from('client_invites').update({ status }).eq('id', inviteId);
          error = err;
        } else if (mutation.type === 'INSERT_COACH_CLIENT') {
          const { error: err } = await supabase.from('coach_clients').insert(mutation.payload);
          error = err;
        }

        if (!error) {
          processedIds.add(mutation.id);
        } else if (error.code === '23505' || error.code === '22P02') {
          console.warn(`Discarding mutation ${mutation.id} due to permanent database error (${error.code}).`);
          processedIds.add(mutation.id);
        } else {
          console.error(`Error processing mutation ${mutation.id}:`, error);
          break; 
        }
      } catch (e) {
        console.error(`Exception processing mutation ${mutation.id}:`, e);
        break;
      }
    }

    set((state) => {
      const updatedOutbox = state.outbox.filter((m) => !processedIds.has(m.id));
      AsyncStorage.setItem('@dude_offline_outbox', JSON.stringify(updatedOutbox));
      return { outbox: updatedOutbox, isSyncing: false };
    });
  },

  initNetworkListener: () => {
    get().loadQueue();

    if (Platform.OS === 'web') {
      const checkOnline = () => {
        const online = typeof window !== 'undefined' && 'navigator' in window && 'onLine' in window.navigator
          ? window.navigator.onLine
          : true;
        set({ isOnline: online });
        if (online) {
          get().flushQueue();
        }
      };
      
      if (typeof window !== 'undefined') {
        window.addEventListener('online', checkOnline);
        window.addEventListener('offline', checkOnline);
      }
      checkOnline();
    } else {
      NetInfo.addEventListener((state) => {
        const online = state.isConnected && state.isInternetReachable !== false;
        set({ isOnline: !!online });
        
        if (online) {
          get().flushQueue();
        }
      });
    }
  },
}));

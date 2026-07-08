import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationState {
  workoutReminders: boolean;
  coachMessages: boolean;
  challengeUpdates: boolean;
  loadPreferences: () => Promise<void>;
  setPreference: (key: 'workoutReminders' | 'coachMessages' | 'challengeUpdates', value: boolean) => Promise<void>;
}

const STORAGE_KEY = '@dude_notification_prefs';

export const useNotificationStore = create<NotificationState>((set, get) => ({
  workoutReminders: true,
  coachMessages: true,
  challengeUpdates: true,

  loadPreferences: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const prefs = JSON.parse(stored);
        set({ ...prefs });
      }
    } catch (e) {
      console.warn("Failed to load notification preferences", e);
    }
  },

  setPreference: async (key, value) => {
    set({ [key]: value });
    try {
      const currentState = get();
      const prefs = {
        workoutReminders: currentState.workoutReminders,
        coachMessages: currentState.coachMessages,
        challengeUpdates: currentState.challengeUpdates,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (e) {
      console.warn("Failed to save notification preferences", e);
    }
  }
}));

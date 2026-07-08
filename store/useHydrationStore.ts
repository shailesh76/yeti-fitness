import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface HydrationState {
  waterGoal: number;
  loading: boolean;
  getWaterForDate: (dateStr: string) => Promise<number>;
  addWaterForDate: (ml: number, dateStr: string) => Promise<number>;
  resetWaterForDate: (dateStr: string) => Promise<void>;
  loadGoal: () => Promise<void>;
}

export const useHydrationStore = create<HydrationState>((set) => ({
  waterGoal: 2500,
  loading: true,

  async getWaterForDate(dateStr) {
    try {
      const val = await AsyncStorage.getItem(`water_log_${dateStr}`);
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  },

  async addWaterForDate(ml, dateStr) {
    try {
      const val = await AsyncStorage.getItem(`water_log_${dateStr}`);
      const current = val ? parseInt(val, 10) : 0;
      const newAmount = Math.max(current + ml, 0);
      await AsyncStorage.setItem(`water_log_${dateStr}`, newAmount.toString());
      return newAmount;
    } catch {
      return 0;
    }
  },

  async resetWaterForDate(dateStr) {
    try {
      await AsyncStorage.setItem(`water_log_${dateStr}`, '0');
    } catch (e) {
      console.warn(e);
    }
  },

  async loadGoal() {
    set({ loading: true });
    try {
      const goalVal = await AsyncStorage.getItem('water_goal');
      set({
        waterGoal: goalVal ? parseInt(goalVal, 10) : 2500,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },
}));

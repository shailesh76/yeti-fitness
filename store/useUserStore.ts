import { create } from 'zustand';

interface UserState {
  full_name: string;
  age: string;
  gender: string;
  height_cm: string;
  weight_kg: string;
  body_fat_percent: string;
  activity_level: string;
  goal: string;
  updateField: (field: keyof Omit<UserState, 'updateField' | 'reset'>, value: string) => void;
  reset: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  full_name: '',
  age: '',
  gender: '',
  height_cm: '',
  weight_kg: '',
  body_fat_percent: '',
  activity_level: '',
  goal: '',
  updateField: (field, value) => set((state) => ({ ...state, [field]: value })),
  reset: () => set({
    full_name: '', age: '', gender: '', height_cm: '', weight_kg: '', body_fat_percent: '', activity_level: '', goal: ''
  })
}));

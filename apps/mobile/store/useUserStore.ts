import { create } from 'zustand';

interface UserState {
  userId: string | null;
  full_name: string;
  age: string;
  gender: string;
  height_cm: string;
  weight_kg: string;
  body_fat_percent: string;
  activity_level: string;
  goal: string;
  updateField: (field: keyof Omit<UserState, 'updateField' | 'reset' | 'initializeFromProfile' | 'setUserId' | 'userId'>, value: string) => void;
  setUserId: (userId: string | null) => void;
  initializeFromProfile: (profile: any, userId?: string) => void;
  reset: () => void;
}

const initialValues = {
  userId: null as string | null,
  full_name: '',
  age: '',
  gender: '',
  height_cm: '',
  weight_kg: '',
  body_fat_percent: '',
  activity_level: '',
  goal: '',
};

export const useUserStore = create<UserState>((set) => ({
  ...initialValues,
  updateField: (field, value) => set((state) => ({ ...state, [field]: value })),
  setUserId: (userId) => set((state) => ({ ...state, userId })),
  initializeFromProfile: (profile, userId) => {
    if (!profile) return;
    set({
      userId: userId ?? profile.id ?? profile.user_id ?? null,
      full_name: profile.full_name ?? '',
      age: profile.age != null ? String(profile.age) : '',
      gender: profile.gender ?? '',
      height_cm: profile.height_cm != null ? String(profile.height_cm) : '',
      weight_kg: profile.weight_kg != null ? String(profile.weight_kg) : '',
      body_fat_percent: profile.body_fat_percent != null ? String(profile.body_fat_percent) : '',
      activity_level: profile.activity_level ?? '',
      goal: profile.goal ?? '',
    });
  },
  reset: () => set({ ...initialValues }),
}));


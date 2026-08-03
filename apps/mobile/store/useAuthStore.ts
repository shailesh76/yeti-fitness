import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { useUserStore } from './useUserStore';

interface AuthState {
  session: Session | null;
  user: User | null;
  setSession: (session: Session | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  setSession: (session) => {
    const currentUserId = get().user?.id;
    const nextUserId = session?.user?.id;
    if (!nextUserId || (currentUserId && currentUserId !== nextUserId)) {
      useUserStore.getState().reset();
    }
    set({ session, user: session?.user || null });
  },
}));


import { create } from 'zustand';

interface TimerState {
  isActive: boolean;
  timeLeft: number;
  duration: number;
  startTimer: (durationSeconds: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  extendTimer: (additionalSeconds: number) => void;
  completeTimer: () => void;
  tick: () => void;
}

export const useTimerStore = create<TimerState>((set, get) => ({
  isActive: false,
  timeLeft: 0,
  duration: 0,
  
  startTimer: (durationSeconds: number) => {
    set({ isActive: true, duration: durationSeconds, timeLeft: durationSeconds });
  },
  
  pauseTimer: () => {
    set({ isActive: false });
  },
  
  resumeTimer: () => {
    if (get().timeLeft > 0) {
      set({ isActive: true });
    }
  },
  
  extendTimer: (additionalSeconds: number) => {
    set((state) => ({ 
      timeLeft: state.timeLeft + additionalSeconds,
      duration: state.duration + additionalSeconds
    }));
  },
  
  completeTimer: () => {
    set({ isActive: false, timeLeft: 0, duration: 0 });
  },
  
  tick: () => {
    const { isActive, timeLeft } = get();
    if (isActive && timeLeft > 0) {
      set({ timeLeft: timeLeft - 1 });
    } else if (isActive && timeLeft <= 0) {
      set({ isActive: false, timeLeft: 0 });
    }
  }
}));

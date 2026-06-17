import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemeMode = 'system' | 'light' | 'dark';

type ThemeState = {
  mode: ThemeMode;
  transition: { id: number; color: string } | null;
  setMode: (mode: ThemeMode) => void;
  toggleDarkMode: (fromColor?: string) => void;
  clearTransition: () => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      transition: null,
      setMode: (mode) => set({ mode }),
      toggleDarkMode: (fromColor) => {
        const nextMode = get().mode === 'dark' ? 'light' : 'dark';
        if (!fromColor) {
          set({ mode: nextMode });
          return;
        }
        set({ transition: { id: Date.now(), color: fromColor } });
        requestAnimationFrame(() => set({ mode: nextMode }));
      },
      clearTransition: () => set({ transition: null }),
    }),
    {
      name: 'moneycopilot-theme',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ mode: state.mode }),
      skipHydration: typeof window === 'undefined',
    },
  ),
);

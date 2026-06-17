import { useColorScheme } from 'react-native';

import { useThemeStore } from '@/store/themeStore';

export const lightColors = {
  bg: '#F7F7F2',
  surface: '#FFFFFF',
  elevated: '#FCFCF8',
  ink: '#111827',
  muted: '#6B7280',
  line: '#E7E5DA',
  subtle: '#F1F0E8',
  green: '#22A06B',
  red: '#E95440',
  gold: '#D9A441',
  blue: '#2F80ED',
};

export const darkColors = {
  bg: '#0E1116',
  surface: '#171B22',
  elevated: '#202633',
  ink: '#F8FAFC',
  muted: '#9CA3AF',
  line: '#2B3240',
  subtle: '#202633',
  green: '#4ADE80',
  red: '#FB7185',
  gold: '#FBBF24',
  blue: '#60A5FA',
};

export const colors = lightColors;

export function useTheme() {
  const scheme = useColorScheme();
  const mode = useThemeStore((state) => state.mode);
  const effectiveScheme = mode === 'system' ? scheme : mode;
  const isDark = effectiveScheme === 'dark';
  const palette = isDark ? darkColors : lightColors;
  return { colors: palette, isDark, mode };
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

import { useEffect, useState } from 'react';

import { useThemeStore } from '@/store/themeStore';

export const lightColors = {
  bg: '#F6F8FC',
  surface: '#FFFFFF',
  elevated: '#FFFFFF',
  ink: '#13243A',
  muted: '#7A88A6',
  line: '#E6ECF5',
  subtle: '#F0F4FA',
  green: '#10C960',
  red: '#FF4438',
  gold: '#F2A900',
  blue: '#2F80FF',
};

export const darkColors = {
  bg: '#000813',
  surface: '#031B32',
  elevated: '#062846',
  ink: '#EEF6FF',
  muted: '#86A0C1',
  line: '#0E365D',
  subtle: '#082542',
  green: '#5FDA57',
  red: '#FF4D73',
  gold: '#F5A400',
  blue: '#5EA7FF',
};

export const colors = lightColors;

export function useTheme() {
  const mode = useThemeStore((state) => state.mode);
  const [scheme, setScheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setScheme(media.matches ? 'dark' : 'light');
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

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

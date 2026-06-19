import { useEffect, useState } from 'react';

import { useThemeStore } from '@/store/themeStore';

const lightColors = {
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

const darkColors = {
  bg: '#0D1117',
  surface: '#161C2D',
  elevated: '#1A2035',
  ink: '#E8EAF0',
  muted: '#6B7A99',
  line: 'rgba(255, 255, 255, 0.07)',
  subtle: '#1E2A42',
  green: '#22C55E',
  red: '#EF4444',
  gold: '#EAB308',
  blue: '#3B82F6',
};

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

'use client';

import { ReactNode, useEffect, useRef } from 'react';

import { AppLoading } from './AppLoading';
import { DisableMobileZoom } from './DisableMobileZoom';
import { useTheme } from '@/lib/theme';
import { useAppStore } from '@/store/appStore';

export function AppProviders({ children }: { children: ReactNode }) {
  const bootstrap = useAppStore((state) => state.bootstrap);
  const bootstrapped = useAppStore((state) => state.bootstrapped);
  const { colors, isDark } = useTheme();
  const bootstrapStarted = useRef(false);

  useEffect(() => {
    if (bootstrapStarted.current) return;
    bootstrapStarted.current = true;
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.setProperty('--mc-bg', colors.bg);
    document.documentElement.style.setProperty('--mc-ink', colors.ink);
  }, [colors.bg, colors.ink, isDark]);

  if (!bootstrapped) {
    return (
      <>
        <DisableMobileZoom />
        <AppLoading />
      </>
    );
  }

  return (
    <>
      <DisableMobileZoom />
      {children}
    </>
  );
}

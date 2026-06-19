'use client';

import { BrandLogo } from '@/components/BrandLogo';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useTheme } from '@/lib/theme';

export function AppLoading() {
  const { colors } = useTheme();

  return (
    <main className="loading-screen" style={{ background: colors.bg, color: colors.ink }}>
      <div className="loading-brand">
        <BrandLogo size={72} tagline="Organizando seu painel" />
        <Spinner className="loading-spinner" aria-label="Carregando" />
        <div className="loading-skeletons" aria-hidden="true">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      </div>
    </main>
  );
}

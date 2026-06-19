'use client';

import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

import { AppLoading } from '../../_components/AppLoading';
import { isSupabaseConfigured } from '@/lib/env';
import { useAppStore } from '@/store/appStore';

import { AppShell } from './AppShell';

export function AuthenticatedApp({ children }: { children: ReactNode }) {
  const router = useRouter();
  const session = useAppStore((state) => state.session);
  const requiresSignIn = isSupabaseConfigured() && !session;

  useEffect(() => {
    if (requiresSignIn) router.replace('/entrar');
  }, [requiresSignIn, router]);

  if (requiresSignIn) return <AppLoading />;

  return <AppShell>{children}</AppShell>;
}

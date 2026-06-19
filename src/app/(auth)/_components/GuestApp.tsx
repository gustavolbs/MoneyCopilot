'use client';

import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

import { AppLoading } from '../../_components/AppLoading';
import { isSupabaseConfigured } from '@/lib/env';
import { useAppStore } from '@/store/appStore';

export function GuestApp({ children }: { children: ReactNode }) {
  const router = useRouter();
  const session = useAppStore((state) => state.session);
  const alreadySignedIn = isSupabaseConfigured() && Boolean(session);

  useEffect(() => {
    if (alreadySignedIn) router.replace('/');
  }, [alreadySignedIn, router]);

  if (alreadySignedIn) return <AppLoading />;

  return children;
}

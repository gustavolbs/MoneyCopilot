'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';

import { AppLoading } from './AppLoading';
import { DisableMobileZoom } from './DisableMobileZoom';
import { ServiceWorkerRegister } from './ServiceWorkerRegister';
import { useTheme } from '@/lib/theme';
import { useAppStore } from '@/store/appStore';

export function AppProviders({ children }: { children: ReactNode }) {
  const bootstrap = useAppStore((state) => state.bootstrap);
  const bootstrapped = useAppStore((state) => state.bootstrapped);
  const setConnectivity = useAppStore((state) => state.setConnectivity);
  const sync = useAppStore((state) => state.sync);
  const { colors, isDark } = useTheme();
  const bootstrapStarted = useRef(false);
  const [waitingServiceWorker, setWaitingServiceWorker] = useState<ServiceWorker | null>(null);

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

  useEffect(() => {
    const registerBackgroundSync = async () => {
      if (!('serviceWorker' in navigator)) return;
      const registration = await navigator.serviceWorker.ready;
      const syncRegistration = registration as ServiceWorkerRegistration & {
        sync?: { register: (tag: string) => Promise<void> };
      };
      await syncRegistration.sync?.register('moneycopilot-sync');
    };
    const online = () => {
      setConnectivity(true);
      void registerBackgroundSync();
      void sync();
    };
    const offline = () => setConnectivity(false);
    const message = (event: MessageEvent) => {
      if (event.data?.type === 'MONEYCOPILOT_SYNC') void sync();
    };

    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    navigator.serviceWorker?.addEventListener('message', message);
    setConnectivity(navigator.onLine);

    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
      navigator.serviceWorker?.removeEventListener('message', message);
    };
  }, [setConnectivity, sync]);

  useEffect(() => {
    const updateReady = (event: Event) => {
      const registration = (event as CustomEvent<ServiceWorkerRegistration>).detail;
      if (registration.waiting) setWaitingServiceWorker(registration.waiting);
    };
    const controllerChange = () => window.location.reload();

    window.addEventListener('moneycopilot:update-ready', updateReady);
    navigator.serviceWorker?.addEventListener('controllerchange', controllerChange);
    return () => {
      window.removeEventListener('moneycopilot:update-ready', updateReady);
      navigator.serviceWorker?.removeEventListener('controllerchange', controllerChange);
    };
  }, []);

  const updateNotice = waitingServiceWorker ? (
    <div className="fixed bottom-4 left-1/2 z-[80] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-[var(--mc-line)] bg-[var(--mc-surface)] px-4 py-3 text-sm text-[var(--mc-ink)] shadow-2xl shadow-black/30">
      <span>Nova versão disponível.</span>
      <button
        type="button"
        className="rounded-xl bg-blue-500 px-3 py-2 text-xs font-semibold text-white"
        onClick={() => waitingServiceWorker.postMessage({ type: 'MONEYCOPILOT_SKIP_WAITING' })}
      >
        Atualizar
      </button>
    </div>
  ) : null;

  if (!bootstrapped) {
    return (
      <>
        <ServiceWorkerRegister />
        <DisableMobileZoom />
        <AppLoading />
        {updateNotice}
      </>
    );
  }

  return (
    <>
      <ServiceWorkerRegister />
      <DisableMobileZoom />
      {children}
      {updateNotice}
    </>
  );
}

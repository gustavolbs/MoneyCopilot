'use client';

import { BarChart3, Home, Lightbulb, Settings, WalletCards } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { AppShell } from '@/components/AppShell';
import { SignInScreen } from '@/screens/SignInScreen';
import { BudgetsScreen } from '@/screens/BudgetsScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { InsightsScreen } from '@/screens/InsightsScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { TransactionsScreen } from '@/screens/TransactionsScreen';
import { isSupabaseConfigured } from '@/lib/env';
import { useTheme } from '@/lib/theme';
import { useAppStore } from '@/store/appStore';

type TabId = 'home' | 'transactions' | 'budgets' | 'insights' | 'settings';

const tabs: Array<{ id: TabId; label: string; icon: React.ComponentType<{ size?: number; color?: string }> }> = [
  { id: 'home', label: 'Início', icon: Home },
  { id: 'transactions', label: 'Transações', icon: WalletCards },
  { id: 'budgets', label: 'Orçamentos', icon: BarChart3 },
  { id: 'insights', label: 'Insights', icon: Lightbulb },
  { id: 'settings', label: 'Ajustes', icon: Settings },
];

export default function Page() {
  const { bootstrap, bootstrapped, session } = useAppStore();
  const { colors, isDark } = useTheme();
  const [tab, setTab] = useState<TabId>('home');

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    document.documentElement.style.setProperty('--mc-bg', colors.bg);
    document.documentElement.style.setProperty('--mc-ink', colors.ink);
  }, [colors.bg, colors.ink, isDark]);

  const content = useMemo(() => {
    if (!bootstrapped) {
      return (
        <main className="loading-screen" style={{ background: colors.bg, color: colors.ink }}>
          <div className="spinner" aria-label="Carregando" />
        </main>
      );
    }

    if (isSupabaseConfigured() && !session) return <SignInScreen onSignedIn={() => setTab('home')} />;

    const screens: Record<TabId, React.ReactNode> = {
      home: <HomeScreen />,
      transactions: <TransactionsScreen />,
      budgets: <BudgetsScreen />,
      insights: <InsightsScreen />,
      settings: <SettingsScreen onSignedOut={() => setTab('home')} />,
    };

    return (
      <AppShell
        tabs={tabs}
        activeTab={tab}
        onTabChange={setTab}
      >
        {screens[tab]}
      </AppShell>
    );
  }, [bootstrapped, colors.bg, colors.ink, session, tab]);

  return content;
}

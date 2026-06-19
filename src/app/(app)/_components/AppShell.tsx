'use client';

import { BarChart3, Home, Lightbulb, PiggyBank, Settings, WalletCards } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

import { BrandLogo } from '@/components/BrandLogo';
import { useTheme } from '@/lib/theme';

type NavigationItem = {
  href: Route;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
};

const navigation: NavigationItem[] = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/transacoes', label: 'Transações', icon: WalletCards },
  { href: '/cofrinhos', label: 'Cofrinhos', icon: PiggyBank },
  { href: '/orcamentos', label: 'Orçamentos', icon: BarChart3 },
  { href: '/insights', label: 'Insights', icon: Lightbulb },
  { href: '/ajustes', label: 'Ajustes', icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const pathname = usePathname();

  return (
    <div className="app-shell" style={{ background: colors.bg }}>
      <div className="app-content">
        <header className="mobile-brand-bar" style={{ backgroundColor: colors.surface, borderColor: colors.line }}>
          <BrandLogo size={34} tagline="Painel financeiro" />
        </header>
        {children}
      </div>
      <aside className="shell-navigation" style={{ background: colors.surface, borderColor: colors.line }}>
        <div className="desktop-brand">
          <BrandLogo size={42} tagline="Painel financeiro" />
        </div>
        <nav className="tab-bar" aria-label="Navegação principal" style={{ background: colors.surface, borderColor: colors.line }}>
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`tab-button${active ? ' active' : ''}`}
                aria-current={active ? 'page' : undefined}
                style={{ color: active ? colors.ink : colors.muted }}
              >
                <Icon size={21} color={active ? colors.ink : colors.muted} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}

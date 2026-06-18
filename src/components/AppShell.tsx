'use client';

import { ReactNode } from 'react';

import { useTheme } from '@/lib/theme';

type Tab<T extends string> = {
  id: T;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
};

export function AppShell<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  children,
}: {
  tabs: Array<Tab<T>>;
  activeTab: T;
  onTabChange: (tab: T) => void;
  children: ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <div className="app-shell" style={{ background: colors.bg }}>
      <div className="app-content">{children}</div>
      <aside className="shell-navigation" style={{ background: colors.surface, borderColor: colors.line }}>
        <div className="desktop-brand">
          <div className="desktop-brand-mark" style={{ backgroundColor: colors.ink, color: colors.bg }}>M</div>
          <div>
            <strong style={{ color: colors.ink }}>MoneyCopilot</strong>
            <span style={{ color: colors.muted }}>Painel financeiro</span>
          </div>
        </div>
        <nav className="tab-bar" aria-label="Navegacao principal" style={{ background: colors.surface, borderColor: colors.line }}>
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = item.id === activeTab;
            return (
              <button
                key={item.id}
                type="button"
                className={`tab-button${active ? ' active' : ''}`}
                onClick={() => onTabChange(item.id)}
                style={{ color: active ? colors.ink : colors.muted }}
              >
                <Icon size={21} color={active ? colors.ink : colors.muted} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}

'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Moon, Sun } from 'lucide-react';

import { CategoryBars } from '@/components/FinanceCharts';
import { QuickEntry } from '@/components/QuickEntry';
import { SyncPill } from '@/components/SyncPill';
import { TransactionRow } from '@/components/TransactionRow';
import { Card, Label, Screen, Title } from '@/components/ui';
import { metricsForMonth } from '@/domain/finance';
import { formatCurrency, monthKey } from '@/domain/normalize';
import { useTheme } from '@/lib/theme';
import { useAppStore } from '@/store/appStore';
import { useThemeStore } from '@/store/themeStore';

export function HomeScreen() {
  const { transactions, categories, recurrences, accounts } = useAppStore();
  const { colors, isDark } = useTheme();
  const toggleDarkMode = useThemeStore((state) => state.toggleDarkMode);
  const metrics = metricsForMonth(transactions, categories, monthKey(), recurrences, accounts);
  const monthLabel = format(new Date(), 'MMMM yyyy', { locale: ptBR });

  return (
    <Screen>
      <div className="stack small">
        <SyncPill />
        <Label>{monthLabel}</Label>
        <div className="title-row">
          <Title>Inicio</Title>
          <button
            type="button"
            onClick={() => toggleDarkMode(colors.bg)}
            className="icon-button"
            aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
            style={{ borderColor: colors.line, backgroundColor: colors.surface }}
          >
            {isDark ? <Sun size={19} color={colors.ink} strokeWidth={1.8} /> : <Moon size={19} color={colors.ink} strokeWidth={1.8} />}
          </button>
        </div>
      </div>

      <Card
        style={{
          gap: 8,
          backgroundColor: isDark ? '#111827' : '#FFFDF5',
          borderColor: isDark ? '#273244' : '#ECE6D1',
          boxShadow: isDark ? '0 14px 28px rgba(0,0,0,0.22)' : '0 14px 28px rgba(217,164,65,0.12)',
        }}
      >
        <div style={{ color: isDark ? '#A7B0C0' : '#7C6A3A', fontWeight: 500 }}>Saldo disponivel para gastar</div>
        <div className="hero-amount" style={{ color: isDark ? '#F8FAFC' : '#171717' }}>{formatCurrency(metrics.availableToSpend)}</div>
        <div style={{ color: isDark ? '#8B95A7' : '#7A7464' }}>Contas correntes, dinheiro e outros saldos livres.</div>
      </Card>

      <div className="grid two">
        <Card style={{ gap: 6 }}>
          <Label>Guardado</Label>
          <div className="metric gold">{formatCurrency(metrics.reserveTotal)}</div>
        </Card>
        <Card style={{ gap: 6 }}>
          <Label>Patrimonio</Label>
          <div className="metric green">{formatCurrency(metrics.netWorth)}</div>
        </Card>
      </div>

      <div className="grid two">
        <Card style={{ gap: 6 }}>
          <Label>Sobra prevista</Label>
          <div className="metric">{formatCurrency(metrics.projectedClose)}</div>
        </Card>
        <Card style={{ gap: 6 }}>
          <Label>Despesas mes</Label>
          <div className="metric red">{formatCurrency(metrics.expense)}</div>
        </Card>
      </div>

      <Card style={{ gap: 14 }}>
        <Label>Lancamento rapido</Label>
        <QuickEntry />
      </Card>

      <Card style={{ gap: 14 }}>
        <Label>Gasto por categoria</Label>
        <CategoryBars metrics={metrics} />
      </Card>

      <Card>
        <Label>Recentes</Label>
        {transactions.slice(0, 6).map((transaction) => (
          <TransactionRow key={transaction.id} transaction={transaction} category={categories.find((item) => item.id === transaction.category_id)} />
        ))}
        {!transactions.length ? <p className="muted" style={{ color: colors.muted }}>Nenhum lancamento ainda.</p> : null}
      </Card>
    </Screen>
  );
}

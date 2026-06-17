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
          backgroundColor: isDark ? '#06233F' : '#FFFFFF',
          backgroundImage: isDark
            ? 'linear-gradient(135deg, rgba(94, 167, 255, 0.18), rgba(6, 35, 63, 0.98) 46%, rgba(6, 55, 96, 0.62))'
            : 'linear-gradient(180deg, #FFFFFF 0%, #F9FBFE 100%)',
          borderColor: isDark ? '#124A7B' : '#E6ECF5',
          boxShadow: isDark
            ? '0 24px 60px rgba(0, 6, 17, 0.58), inset 0 1px 0 rgba(125, 188, 255, 0.16)'
            : '0 18px 36px rgba(19, 36, 58, 0.08)',
        }}
      >
        <div style={{ color: isDark ? '#9DCCFF' : '#7A88A6', fontWeight: 700 }}>Saldo disponivel para gastar</div>
        <div className="hero-amount" style={{ color: isDark ? '#F4FAFF' : '#171717' }}>{formatCurrency(metrics.availableToSpend)}</div>
        <div style={{ color: isDark ? '#A9BED6' : '#7A88A6' }}>Contas correntes, dinheiro e outros saldos livres.</div>
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
        {transactions.length ? (
          <div className="transaction-table-wrap compact">
            <table className="transaction-table">
              <tbody>
                {transactions.slice(0, 6).map((transaction) => (
                  <TransactionRow key={transaction.id} transaction={transaction} category={categories.find((item) => item.id === transaction.category_id)} />
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {!transactions.length ? <p className="muted" style={{ color: colors.muted }}>Nenhum lancamento ainda.</p> : null}
      </Card>
    </Screen>
  );
}

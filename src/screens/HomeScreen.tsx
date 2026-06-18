"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Moon, Sun } from "lucide-react";

import { CategoryBars } from "@/components/FinanceCharts";
import { DesktopDashboard } from "@/components/DesktopDashboard";
import { PeriodNotice } from "@/components/PeriodNotice";
import { QuickEntry } from "@/components/QuickEntry";
import { SyncPill } from "@/components/SyncPill";
import { TransactionRow } from "@/components/TransactionRow";
import { Card, Label, Screen, Title } from "@/components/ui";
import { metricsForMonth } from "@/domain/finance";
import { formatCurrency, monthKey } from "@/domain/normalize";
import { useTheme } from "@/lib/theme";
import { useAppStore } from "@/store/appStore";
import { useThemeStore } from "@/store/themeStore";

export function HomeScreen() {
  const { transactions, categories, recurrences, accounts } = useAppStore();
  const { colors, isDark } = useTheme();
  const toggleDarkMode = useThemeStore((state) => state.toggleDarkMode);
  const metrics = metricsForMonth(
    transactions,
    categories,
    monthKey(),
    recurrences,
    accounts,
  );
  const monthLabel = format(new Date(), "MMMM yyyy", { locale: ptBR });
  const periodLabel = `Período observado: ${format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}`;

  return (
    <Screen>
      <div className="mobile-home-dashboard">
      <div className="stack small home-dashboard-header">
        <SyncPill />
        <Label>{monthLabel}</Label>
        <div className="title-row">
          <Title>Início</Title>
          <button
            type="button"
            onClick={() => toggleDarkMode(colors.bg)}
            className="icon-button"
            aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
            style={{
              borderColor: colors.line,
              backgroundColor: colors.surface,
            }}
          >
            {isDark ? (
              <Sun size={19} color={colors.ink} strokeWidth={1.8} />
            ) : (
              <Moon size={19} color={colors.ink} strokeWidth={1.8} />
            )}
          </button>
        </div>
      </div>

      <div className="home-dashboard-period">
        <PeriodNotice
          label={periodLabel}
          detail="Compras à vista entram na data da compra. Compras no cartão entram no mês do vencimento da fatura."
        />
      </div>

      <div className="home-dashboard-metrics">
        <Card
          style={{
            gap: 8,
            backgroundColor: isDark ? "#06233F" : "#FFFFFF",
            backgroundImage: isDark
              ? "linear-gradient(135deg, rgba(94, 167, 255, 0.18), rgba(6, 35, 63, 0.98) 46%, rgba(6, 55, 96, 0.62))"
              : "linear-gradient(180deg, #FFFFFF 0%, #F9FBFE 100%)",
            borderColor: isDark ? "#124A7B" : "#E6ECF5",
            boxShadow: isDark
              ? "0 24px 60px rgba(0, 6, 17, 0.58), inset 0 1px 0 rgba(125, 188, 255, 0.16)"
              : "0 18px 36px rgba(19, 36, 58, 0.08)",
          }}
        >
          <div style={{ color: isDark ? "#9DCCFF" : "#7A88A6", fontWeight: 700 }}>Saldo disponível para gastar</div>
          <div className="hero-amount" style={{ color: isDark ? "#F4FAFF" : "#171717" }}>{formatCurrency(metrics.availableToSpend)}</div>
          <div style={{ color: isDark ? "#A9BED6" : "#7A88A6" }}>Contas correntes, dinheiro e outros saldos livres.</div>
        </Card>
        <Card style={{ gap: 6 }}>
          <Label>Guardado</Label>
          <div className="metric gold">{formatCurrency(metrics.reserveTotal)}</div>
        </Card>
        <Card style={{ gap: 6 }}>
          <Label>Patrimônio</Label>
          <div className="metric green">{formatCurrency(metrics.netWorth)}</div>
        </Card>
        <Card style={{ gap: 6 }}>
          <Label>Sobra prevista</Label>
          <div className="metric">{formatCurrency(metrics.projectedClose)}</div>
        </Card>
        <Card style={{ gap: 6 }}>
          <Label>Despesas do mês</Label>
          <div className="metric red">{formatCurrency(metrics.expense)}</div>
        </Card>
      </div>

      <div className="home-dashboard-panels">
        <Card style={{ gap: 14 }}>
          <Label>Lançamento rápido</Label>
          <QuickEntry />
        </Card>

        <Card style={{ gap: 14 }}>
          <Label>Gasto por categoria</Label>
          <CategoryBars metrics={metrics} />
        </Card>

        <Card>
        <Label>Recentes (todo o histórico)</Label>
          {transactions.length ? (
            <div className="transaction-table-wrap compact">
              <table className="transaction-table">
                <tbody>
                  {transactions.slice(0, 6).map((transaction) => (
                    <TransactionRow
                      key={transaction.id}
                      transaction={transaction}
                      category={categories.find((item) => item.id === transaction.category_id)}
                      accounts={accounts}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {!transactions.length ? <p className="muted" style={{ color: colors.muted }}>Nenhum lançamento ainda.</p> : null}
        </Card>
      </div>
      </div>
      <DesktopDashboard />
    </Screen>
  );
}

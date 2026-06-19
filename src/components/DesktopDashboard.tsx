"use client";

import { subMonths } from "date-fns";

import { FaturasDoMes } from "@/app/(app)/(dashboard)/_components/faturas-do-mes";
import { FluxoChart } from "@/app/(app)/(dashboard)/_components/fluxo-chart";
import { Header } from "@/app/(app)/(dashboard)/_components/header";
import { Insights } from "@/app/(app)/(dashboard)/_components/insights";
import { LancamentoRapido } from "@/app/(app)/(dashboard)/_components/lancamento-rapido";
import { MetricCards } from "@/app/(app)/(dashboard)/_components/metric-cards";
import { Patrimonio } from "@/app/(app)/(dashboard)/_components/patrimonio";
import { PrincipaisCategorias } from "@/app/(app)/(dashboard)/_components/principais-categorias";
import { ProximosCompromissos } from "@/app/(app)/(dashboard)/_components/proximos-compromissos";
import { TransacoesRecentes } from "@/app/(app)/(dashboard)/_components/transacoes-recentes";
import {
  isReserveMovement,
  metricsForMonth,
  transactionMonth,
} from "@/domain/finance";
import { formatMonthShort, monthKey } from "@/domain/normalize";
import { useAppStore } from "@/store/appStore";

export function DesktopDashboard() {
  const { transactions, categories, recurrences, accounts, budgets, insights } =
    useAppStore();
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) =>
    subMonths(now, 5 - index),
  );
  const series = months.map((date) => ({
    key: monthKey(date),
    label: formatMonthShort(date),
    metrics: metricsForMonth(
      transactions,
      categories,
      monthKey(date),
      recurrences,
      accounts,
    ),
  }));
  const current = series.at(-1)!.metrics;
  const previous = series.at(-2)?.metrics;
  const expenseChange = previous?.expense
    ? (current.expense - previous.expense) / previous.expense
    : 0;
  const incomeChange = previous?.income
    ? (current.income - previous.income) / previous.income
    : 0;
  const savingsRate = current.income > 0 ? current.balance / current.income : 0;
  const activeTransactions = transactions
    .filter(
      (transaction) =>
        !transaction.deleted_at && !isReserveMovement(transaction, accounts),
    )
    .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
  const cardInvoices = accounts
    .filter((account) => account.type === "credit_card")
    .map((account) => ({
      account,
      total: transactions
        .filter(
          (transaction) =>
            !transaction.deleted_at &&
            transaction.account_id === account.id &&
            transactionMonth(transaction, accounts) === monthKey(),
        )
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    }));
  return (
    <>
      <Header />
      <div className="desktop-dashboard">
        <section
          className="desktop-metric-section"
          aria-label="Indicadores principais"
        >
          <MetricCards
            available={current.availableToSpend}
            income={current.income}
            expense={current.expense}
            projectedClose={current.projectedClose}
            incomeChange={incomeChange}
            expenseChange={expenseChange}
            savingsRate={savingsRate}
          />
        </section>

        <section className="desktop-dashboard-grid">
          <LancamentoRapido className="desktop-quick-card mobile-dashboard-section" />

          <FluxoChart
            className="desktop-spending-card mobile-dashboard-section"
            series={series.map((item) => ({
              label: item.label,
              expense: item.metrics.expense,
              income: item.metrics.income,
            }))}
            expense={current.expense}
            income={current.income}
          />

          <section
            className="mobile-metric-section"
            aria-label="Resumo financeiro"
          >
            <MetricCards
              compact
              available={current.availableToSpend}
              income={current.income}
              expense={current.expense}
              projectedClose={current.projectedClose}
              incomeChange={incomeChange}
              expenseChange={expenseChange}
              savingsRate={savingsRate}
            />
          </section>

          <TransacoesRecentes
            className="desktop-transactions-card mobile-dashboard-section"
            transactions={activeTransactions}
            categories={categories}
            accounts={accounts}
          />

          <PrincipaisCategorias
            className="desktop-categories-card mobile-dashboard-section"
            categories={current.byCategory}
            allCategories={categories}
            budgets={budgets}
            transactions={transactions}
            accounts={accounts}
            month={monthKey()}
          />

          <Insights
            className="desktop-insights-card mobile-dashboard-section"
            insights={insights}
          />

          <Patrimonio
            className="desktop-networth-card mobile-dashboard-section"
            netWorth={current.netWorth}
            available={current.availableToSpend}
            reserves={current.reserveTotal}
            accounts={current.accountBalances}
          />

          <FaturasDoMes
            className="desktop-cards-card mobile-dashboard-section"
            invoices={cardInvoices}
          />

          <ProximosCompromissos
            className="desktop-upcoming-card mobile-dashboard-section"
            recurrences={recurrences}
          />
        </section>
      </div>
    </>
  );
}

"use client";

import { subMonths } from "date-fns";
import { ArrowDownRight, ArrowUpRight, CalendarDays, CreditCard, Lightbulb, Moon, Sun, WalletCards } from "lucide-react";
import { useState } from "react";

import { isReserveMovement, metricsForMonth, transactionMonth } from "@/domain/finance";
import { formatCurrency, formatDate, formatMonthShort, formatMonthYear, monthKey } from "@/domain/normalize";
import { useTheme } from "@/lib/theme";
import { useAppStore } from "@/store/appStore";
import { useThemeStore } from "@/store/themeStore";

import { QuickEntry } from "./QuickEntry";
import { categoryEmoji } from "./CategoryBadge";
import { SyncPill } from "./SyncPill";
import { TransactionRow } from "./TransactionRow";

const compactCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function DesktopDashboard() {
  const { transactions, categories, recurrences, accounts, insights } = useAppStore();
  const { colors, isDark } = useTheme();
  const toggleDarkMode = useThemeStore((state) => state.toggleDarkMode);
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => subMonths(now, 5 - index));
  const series = months.map((date) => ({
    key: monthKey(date),
    label: formatMonthShort(date),
    metrics: metricsForMonth(transactions, categories, monthKey(date), recurrences, accounts),
  }));
  const current = series.at(-1)!.metrics;
  const previous = series.at(-2)?.metrics;
  const expenseChange = previous?.expense ? (current.expense - previous.expense) / previous.expense : 0;
  const savingsRate = current.income > 0 ? current.balance / current.income : 0;
  const activeTransactions = transactions
    .filter((transaction) => !transaction.deleted_at && !isReserveMovement(transaction, accounts))
    .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
  const maxCategory = Math.max(...current.byCategory.map((item) => item.amount), 1);
  const accountBalances = current.accountBalances
    .filter(({ account }) => account.type !== "credit_card")
    .sort((a, b) => b.balance - a.balance);
  const maxAccountBalance = Math.max(...accountBalances.map((item) => Math.abs(item.balance)), 1);
  const cardInvoices = accounts
    .filter((account) => account.type === "credit_card")
    .map((account) => ({
      account,
      total: transactions
        .filter((transaction) => !transaction.deleted_at && transaction.account_id === account.id && transactionMonth(transaction, accounts) === monthKey())
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    }));
  const upcomingRecurrences = recurrences
    .filter((recurrence) => recurrence.active && !recurrence.deleted_at)
    .sort((a, b) => a.next_due_date.localeCompare(b.next_due_date))
    .slice(0, 5);

  return (
    <div className="desktop-dashboard">
      <header className="desktop-dashboard-header">
        <div>
          <span className="desktop-eyebrow">Visão geral</span>
          <h1>Dashboard</h1>
          <p>{formatMonthYear(now)} · despesas de cartão pela fatura</p>
        </div>
        <div className="desktop-header-actions">
          <SyncPill />
          <button
            type="button"
            className="icon-button"
            aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
            onClick={() => toggleDarkMode(colors.bg)}
            style={{ borderColor: colors.line, backgroundColor: colors.surface }}
          >
            {isDark ? <Sun size={18} color={colors.ink} /> : <Moon size={18} color={colors.ink} />}
          </button>
        </div>
      </header>

      <section className="desktop-kpi-grid" aria-label="Indicadores principais">
        <Kpi label="Disponível" value={formatCurrency(current.availableToSpend)} detail="Saldos livres" tone="blue" />
        <Kpi label="Receitas" value={formatCurrency(current.income)} detail="Nesta competência" tone="green" />
        <Kpi label="Despesas" value={formatCurrency(current.expense)} detail={`${Math.abs(expenseChange * 100).toFixed(0)}% vs. mês anterior`} tone="red" trend={expenseChange} />
        <Kpi label="Sobra prevista" value={formatCurrency(current.projectedClose)} detail={`${Math.round(savingsRate * 100)}% da renda`} tone="gold" />
      </section>

      <section className="desktop-dashboard-grid">
        <DashboardCard className="desktop-spending-card" title="Fluxo mensal" action="Últimos 6 meses">
          <div className="desktop-chart-summary">
            <div><span>Despesas</span><strong>{formatCurrency(current.expense)}</strong></div>
            <div><span>Receitas</span><strong className="positive">{formatCurrency(current.income)}</strong></div>
          </div>
          <CashFlowChart series={series.map((item) => ({ label: item.label, expense: item.metrics.expense, income: item.metrics.income }))} />
        </DashboardCard>

        <DashboardCard className="desktop-networth-card" title="Patrimônio" action={formatCurrency(current.netWorth)}>
          <div className="desktop-networth-summary">
            <div><span>Disponível</span><strong>{formatCurrency(current.availableToSpend)}</strong></div>
            <div><span>Reservas</span><strong>{formatCurrency(current.reserveTotal)}</strong></div>
          </div>
          <div className="desktop-account-list">
            {accountBalances.slice(0, 5).map(({ account, balance }) => (
              <div className="desktop-account-row" key={account.id}>
                <div><span>{account.name}</span><strong>{compactCurrency.format(balance)}</strong></div>
                <div className="desktop-track"><i style={{ width: `${Math.max((Math.abs(balance) / maxAccountBalance) * 100, 4)}%` }} /></div>
              </div>
            ))}
            {!accountBalances.length ? <EmptyState text="Cadastre contas para acompanhar seu patrimônio." /> : null}
          </div>
        </DashboardCard>

        <DashboardCard className="desktop-transactions-card" title="Transações recentes" action={`${activeTransactions.length} lançamentos`}>
          {activeTransactions.length ? (
            <div className="transaction-table-wrap compact">
              <table className="transaction-table">
                <tbody>
                  {activeTransactions.slice(0, 7).map((transaction) => (
                    <TransactionRow
                      key={transaction.id}
                      transaction={transaction}
                      category={categories.find((category) => category.id === transaction.category_id)}
                      accounts={accounts}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState text="Nenhuma transação registrada." />}
        </DashboardCard>

        <DashboardCard className="desktop-categories-card" title="Principais categorias" action={`${current.byCategory.length} categorias`}>
          <div className="desktop-category-list">
            {current.byCategory.slice(0, 6).map((item) => (
              <div className="desktop-category-row" key={item.category.id}>
                <span className="desktop-category-icon" style={{ backgroundColor: `${item.category.color}24`, color: item.category.color }}>{categoryEmoji(item.category)}</span>
                <div className="desktop-category-main">
                  <div><span>{item.category.name}</span><strong>{formatCurrency(item.amount)}</strong></div>
                  <div className="desktop-track"><i style={{ width: `${(item.amount / maxCategory) * 100}%`, backgroundColor: item.category.color }} /></div>
                </div>
                <small>{Math.round(item.percent * 100)}%</small>
              </div>
            ))}
            {!current.byCategory.length ? <EmptyState text="As categorias aparecerão conforme você registrar despesas." /> : null}
          </div>
        </DashboardCard>

        <DashboardCard className="desktop-quick-card" title="Lançamento rápido" action="Linguagem natural">
          <QuickEntry />
        </DashboardCard>

        <DashboardCard className="desktop-cards-card" title="Faturas do mês" action={`${cardInvoices.length} cartões`}>
          <div className="desktop-invoice-list">
            {cardInvoices.map(({ account, total }) => (
              <div className="desktop-invoice-row" key={account.id}>
                <span className="desktop-list-icon"><CreditCard size={17} /></span>
                <div><strong>{account.name}</strong><small>Vence dia {account.credit_card_due_day ?? "-"}</small></div>
                <b>{formatCurrency(total)}</b>
              </div>
            ))}
            {!cardInvoices.length ? <EmptyState text="Nenhum cartão de crédito cadastrado." /> : null}
          </div>
        </DashboardCard>

        <DashboardCard className="desktop-insights-card" title="Insights" action="Análise automática">
          <div className="desktop-insight-list">
            {insights.slice(0, 4).map((insight) => (
              <div className={`desktop-insight ${insight.tone}`} key={insight.id}>
                <span><Lightbulb size={16} /></span>
                <div><strong>{insight.title}</strong><p>{insight.body}</p></div>
              </div>
            ))}
            {!insights.length ? (
              <div className="desktop-insight good">
                <span><WalletCards size={16} /></span>
                <div><strong>Resumo da competência</strong><p>Registre mais transações para receber comparações e alertas personalizados.</p></div>
              </div>
            ) : null}
          </div>
        </DashboardCard>

        <DashboardCard className="desktop-upcoming-card" title="Próximos compromissos" action={`${upcomingRecurrences.length} previstos`}>
          <div className="desktop-invoice-list">
            {upcomingRecurrences.map((recurrence) => (
              <div className="desktop-invoice-row" key={recurrence.id}>
                <span className="desktop-list-icon"><CalendarDays size={17} /></span>
                <div><strong>{recurrence.description}</strong><small>{formatDate(recurrence.next_due_date)} · {recurrence.frequency}</small></div>
                <b>{formatCurrency(recurrence.amount)}</b>
              </div>
            ))}
            {!upcomingRecurrences.length ? <EmptyState text="Nenhuma recorrência ativa para os próximos dias." /> : null}
          </div>
        </DashboardCard>
      </section>
    </div>
  );
}

function Kpi({ label, value, detail, tone, trend }: { label: string; value: string; detail: string; tone: string; trend?: number }) {
  return (
    <article className={`desktop-kpi ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{trend === undefined ? null : trend <= 0 ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}{detail}</small>
    </article>
  );
}

function DashboardCard({ title, action, className, children }: { title: string; action: string; className: string; children: React.ReactNode }) {
  return (
    <article className={`desktop-panel ${className}`}>
      <header><h2>{title}</h2><span>{action}</span></header>
      {children}
    </article>
  );
}

function CashFlowChart({ series }: { series: Array<{ label: string; expense: number; income: number }> }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const width = 620;
  const height = 210;
  const padding = 18;
  const max = Math.max(...series.flatMap((item) => [item.expense, item.income]), 1);
  const pointsFor = (key: "expense" | "income") => series.map((item, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(series.length - 1, 1);
    const y = height - padding - (item[key] / max) * (height - padding * 2);
    return { x, y };
  });
  const expenseCoordinates = pointsFor("expense");
  const incomeCoordinates = pointsFor("income");
  const expensePoints = expenseCoordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const incomePoints = incomeCoordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const active = activeIndex === null ? null : series[activeIndex];
  const activePoint = activeIndex === null ? null : expenseCoordinates[activeIndex];
  const activeTop = activeIndex === null ? null : Math.min(expenseCoordinates[activeIndex].y, incomeCoordinates[activeIndex].y);

  return (
    <div className="desktop-cashflow-chart" onMouseLeave={() => setActiveIndex(null)}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Gráfico de receitas e despesas dos últimos seis meses">
        <defs>
          <linearGradient id="desktopExpenseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--mc-blue)" stopOpacity=".3" /><stop offset="1" stopColor="var(--mc-blue)" stopOpacity="0" /></linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((ratio) => <line key={ratio} x1={padding} x2={width - padding} y1={height * ratio} y2={height * ratio} className="chart-grid-line" />)}
        <polygon points={`${padding},${height - padding} ${expensePoints} ${width - padding},${height - padding}`} fill="url(#desktopExpenseFill)" />
        <polyline points={expensePoints} className="chart-line expense" />
        <polyline points={incomePoints} className="chart-line income" />
        {series.map((item, index) => {
          const expensePoint = expenseCoordinates[index];
          const incomePoint = incomeCoordinates[index];
          const segmentWidth = (width - padding * 2) / Math.max(series.length - 1, 1);
          return (
            <g
              key={item.label}
              className={`chart-hit-area${activeIndex === index ? " active" : ""}`}
              role="button"
              tabIndex={0}
              aria-label={`${item.label}: receitas ${formatCurrency(item.income)}, despesas ${formatCurrency(item.expense)}`}
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
              onClick={() => setActiveIndex(index)}
            >
              <rect x={Math.max(expensePoint.x - segmentWidth / 2, 0)} y="0" width={segmentWidth} height={height} fill="transparent" />
              <line x1={expensePoint.x} x2={expensePoint.x} y1={padding} y2={height - padding} className="chart-hover-line" />
              <circle cx={expensePoint.x} cy={expensePoint.y} r="5" className="chart-point expense" />
              <circle cx={incomePoint.x} cy={incomePoint.y} r="4" className="chart-point income" />
            </g>
          );
        })}
      </svg>
      {active && activePoint && activeTop !== null ? (
        <div className={`desktop-chart-tooltip${activeIndex === 0 ? " start" : activeIndex === series.length - 1 ? " end" : ""}${activeTop < height * 0.48 ? " below" : ""}`} style={{ left: `${(activePoint.x / width) * 100}%`, top: `${(activeTop / height) * 100}%` }}>
          <strong>{active.label}</strong>
          <span><i className="income" />Receitas <b>{formatCurrency(active.income)}</b></span>
          <span><i className="expense" />Despesas <b>{formatCurrency(active.expense)}</b></span>
          <small>Saldo {formatCurrency(active.income - active.expense)}</small>
        </div>
      ) : null}
      <div className="desktop-chart-labels">{series.map((item) => <span key={item.label}>{item.label}</span>)}</div>
      <div className="desktop-chart-legend"><span className="expense">Despesas</span><span className="income">Receitas</span></div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="desktop-empty">{text}</p>;
}

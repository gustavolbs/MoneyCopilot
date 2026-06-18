"use client";

import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDownRight, ArrowUpRight, Lightbulb, PiggyBank, ReceiptText, TrendingUp, WalletCards } from "lucide-react";

import { PeriodNotice } from "@/components/PeriodNotice";
import { Card, Label, Screen, Title } from "@/components/ui";
import { metricsForMonth } from "@/domain/finance";
import { formatCurrency, monthKey } from "@/domain/normalize";
import { useTheme } from "@/lib/theme";
import { useAppStore } from "@/store/appStore";

export function InsightsScreen() {
  const { colors } = useTheme();
  const { insights, transactions, categories, recurrences, accounts } = useAppStore();
  const now = new Date();
  const monthlySeries = [3, 2, 1, 0].map((offset) => {
    const date = subMonths(now, offset);
    return {
      label: format(date, "MMM", { locale: ptBR }).replace(".", ""),
      metrics: metricsForMonth(transactions, categories, monthKey(date), recurrences, accounts),
    };
  });
  const metrics = monthlySeries.at(-1)!.metrics;
  const previousMetrics = monthlySeries.at(-2)!.metrics;
  const previousMonthsWithExpenses = monthlySeries.slice(0, -1).filter((item) => item.metrics.expense > 0);
  const previousExpenseAverage = previousMonthsWithExpenses.length
    ? previousMonthsWithExpenses.reduce((sum, item) => sum + item.metrics.expense, 0) / previousMonthsWithExpenses.length
    : 0;
  const expenseChange = percentChange(metrics.expense, previousMetrics.expense);
  const incomeChange = percentChange(metrics.income, previousMetrics.income);
  const averageExpenseChange = percentChange(metrics.expense, previousExpenseAverage);
  const savingsRate = metrics.income > 0 ? (metrics.balance / metrics.income) * 100 : null;
  const maxMonthlyValue = Math.max(...monthlySeries.flatMap((item) => [item.metrics.expense, item.metrics.income]), 1);
  const topCategory = metrics.byCategory[0];
  const largestExpense = metrics.largestExpenses[0];
  const transferCount = transactions.filter((transaction) => transaction.type === "transfer" && transaction.transaction_date.startsWith(monthKey())).length;

  return (
    <Screen>
      <div className="stack small">
        <Label>Leitura da competência</Label>
        <Title>Insights</Title>
      </div>

      <PeriodNotice label={`Período observado: ${monthKey()}`} detail="Comparações por competência, incluindo cartões no mês de vencimento da fatura." />

      <div className="insights-kpi-grid">
        <VisualMetric icon={<ReceiptText size={18} />} label="Despesas" value={formatCurrency(metrics.expense)} percentage={expenseChange} inverse />
        <VisualMetric icon={<TrendingUp size={18} />} label="Receitas" value={formatCurrency(metrics.income)} percentage={incomeChange} />
        <VisualMetric icon={<PiggyBank size={18} />} label="Taxa de economia" value={savingsRate === null ? "-" : `${Math.round(savingsRate)}%`} percentage={savingsRate} percentageIsValue />
        <VisualMetric icon={<WalletCards size={18} />} label="Média de despesas" value={formatCurrency(previousExpenseAverage)} percentage={averageExpenseChange} inverse />
      </div>

      <Card style={{ gap: 16 }}>
        <div className="insights-section-head">
          <div><Label>Evolução</Label><strong>Receitas e despesas</strong></div>
          <div className="insights-chart-legend"><span className="income">Receitas</span><span className="expense">Despesas</span></div>
        </div>
        <div className="insights-month-chart" aria-label="Comparativo dos últimos quatro meses">
          {monthlySeries.map((item) => (
            <div className="insights-month-column" key={item.label}>
              <div className="insights-bars">
                <i className="income" style={{ height: `${Math.max((item.metrics.income / maxMonthlyValue) * 100, item.metrics.income > 0 ? 4 : 0)}%` }} title={`Receitas: ${formatCurrency(item.metrics.income)}`} />
                <i className="expense" style={{ height: `${Math.max((item.metrics.expense / maxMonthlyValue) * 100, item.metrics.expense > 0 ? 4 : 0)}%` }} title={`Despesas: ${formatCurrency(item.metrics.expense)}`} />
              </div>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="insights-visual-grid">
        <Card style={{ gap: 16 }}>
          <div className="insights-section-head"><div><Label>Distribuição</Label><strong>Principais categorias</strong></div></div>
          {topCategory ? (
            <div className="insights-category-overview">
              <div className="insights-donut" style={{ background: `conic-gradient(${topCategory.category.color} ${topCategory.percent * 100}%, ${colors.subtle} 0)` }}>
                <div style={{ backgroundColor: colors.surface }}><strong>{Math.round(topCategory.percent * 100)}%</strong><span>do total</span></div>
              </div>
              <div className="insights-category-ranking">
                {metrics.byCategory.slice(0, 4).map((item) => (
                  <div key={item.category.id}>
                    <span><i style={{ backgroundColor: item.category.color }} />{item.category.name}</span>
                    <strong>{Math.round(item.percent * 100)}%</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="insights-empty" style={{ color: colors.muted }}>Sem despesas nesta competência.</p>}
        </Card>

        <Card style={{ gap: 14 }}>
          <div className="insights-section-head"><div><Label>Destaques</Label><strong>Resumo rápido</strong></div></div>
          <div className="insights-highlights">
            <Highlight label="Sobra prevista" value={formatCurrency(metrics.projectedClose)} color={metrics.projectedClose >= 0 ? colors.green : colors.red} />
            <Highlight label="Maior despesa" value={largestExpense ? formatCurrency(largestExpense.amount) : "-"} detail={largestExpense?.description} color={colors.red} />
            <Highlight label="Transferências" value={String(transferCount)} detail="movimentos internos" color={colors.blue} />
          </div>
        </Card>
      </div>

      <div className="insights-section-head insights-feed-title">
        <div><Label>Tendências</Label><strong>Análise automática</strong></div>
      </div>
      <div className="insights-feed-grid">
        {insights.map((insight) => (
          <Card key={insight.id} style={{ gap: 8, borderColor: insight.tone === "warning" ? `${colors.red}66` : colors.line }}>
            <div className={`insight-visual-icon ${insight.tone}`}><Lightbulb size={16} /></div>
            {insight.percentage !== undefined ? <PercentageValue value={insight.percentage} inverse={insight.id.startsWith("expense") || insight.id.startsWith("growth") || insight.id.startsWith("budget")} /> : null}
            <strong className="insight-visual-title">{insight.title}</strong>
            <small style={{ color: colors.muted }}>{insight.comparison ?? insight.body}</small>
          </Card>
        ))}
      </div>
      {!insights.length ? <Card><p className="insights-empty" style={{ color: colors.muted }}>Registre mais transações para visualizar tendências.</p></Card> : null}
    </Screen>
  );
}

function percentChange(current: number, reference: number) {
  return reference > 0 ? ((current - reference) / reference) * 100 : null;
}

function VisualMetric({ icon, label, value, percentage, inverse = false, percentageIsValue = false }: { icon: React.ReactNode; label: string; value: string; percentage: number | null; inverse?: boolean; percentageIsValue?: boolean }) {
  const { colors } = useTheme();
  return (
    <Card style={{ gap: 8 }}>
      <div className="insight-metric-top"><span style={{ color: colors.blue, backgroundColor: `${colors.blue}18` }}>{icon}</span><Label>{label}</Label></div>
      <strong className="insight-metric-value">{value}</strong>
      {percentageIsValue ? <small style={{ color: colors.muted }}>sobre a receita do mês</small> : <PercentageValue value={percentage} inverse={inverse} />}
    </Card>
  );
}

function PercentageValue({ value, inverse = false }: { value: number | null; inverse?: boolean }) {
  const { colors } = useTheme();
  if (value === null) return <span className="percentage-value" style={{ color: colors.muted, backgroundColor: colors.subtle }}>Sem base</span>;
  const favorable = inverse ? value <= 0 : value >= 0;
  const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight;
  return <span className="percentage-value" style={{ color: favorable ? colors.green : colors.red, backgroundColor: favorable ? `${colors.green}18` : `${colors.red}18` }}><Icon size={13} />{value > 0 ? "+" : ""}{Math.round(value)}%</span>;
}

function Highlight({ label, value, detail, color }: { label: string; value: string; detail?: string; color: string }) {
  return <div className="insight-highlight"><i style={{ backgroundColor: color }} /><div><span>{label}</span>{detail ? <small>{detail}</small> : null}</div><strong style={{ color }}>{value}</strong></div>;
}

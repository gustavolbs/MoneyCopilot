import type { ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  PiggyBank,
  ReceiptText,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import { formatCurrency } from "@/domain/normalize";
import { useTheme } from "@/lib/theme";

type MetricAccent = "red" | "green" | "gold" | "blue";

type InsightsMetricCardsProps = {
  averageExpense: number;
  averageExpenseChange: number | null;
  expense: number;
  expenseChange: number | null;
  income: number;
  incomeChange: number | null;
  savingsRate: number | null;
};

export function InsightsMetricCards({
  averageExpense,
  averageExpenseChange,
  expense,
  expenseChange,
  income,
  incomeChange,
  savingsRate,
}: InsightsMetricCardsProps) {
  const cards = [
    {
      accent: "red" as const,
      detail: "Saídas da competência",
      icon: <ReceiptText size={17} />,
      inverse: true,
      label: "Despesas",
      percentage: expenseChange,
      value: formatCurrency(expense),
    },
    {
      accent: "green" as const,
      detail: "Entradas da competência",
      icon: <TrendingUp size={17} />,
      label: "Receitas",
      percentage: incomeChange,
      value: formatCurrency(income),
    },
    {
      accent: "gold" as const,
      detail: "Sobra sobre receitas",
      icon: <PiggyBank size={17} />,
      label: "Taxa de economia",
      percentage: savingsRate,
      percentageIsValue: true,
      value: savingsRate === null ? "-" : `${Math.round(savingsRate)}%`,
    },
    {
      accent: "blue" as const,
      detail: "Média dos meses anteriores",
      icon: <WalletCards size={17} />,
      inverse: true,
      label: "Média de despesas",
      percentage: averageExpenseChange,
      value: formatCurrency(averageExpense),
    },
  ];

  return (
    <section className="insights-kpi-grid" aria-label="Indicadores financeiros">
      {cards.map((card) => (
        <InsightsMetricCard key={card.label} {...card} />
      ))}
    </section>
  );
}

function InsightsMetricCard({
  accent,
  detail,
  icon,
  inverse = false,
  label,
  percentage,
  percentageIsValue = false,
  value,
}: {
  accent: MetricAccent;
  detail: string;
  icon: ReactNode;
  inverse?: boolean;
  label: string;
  percentage: number | null;
  percentageIsValue?: boolean;
  value: string;
}) {
  return (
    <article className={`insight-metric-card ${accent}`}>
      <div className="insight-metric-top">
        <span>{icon}</span>
        <div>
          <strong>{label}</strong>
          <small>{detail}</small>
        </div>
      </div>
      <div className="insight-metric-bottom">
        <b>{value}</b>
        {percentageIsValue ? (
          <small>sobre a receita</small>
        ) : (
          <PercentageValue value={percentage} inverse={inverse} />
        )}
      </div>
    </article>
  );
}

function PercentageValue({
  value,
  inverse = false,
}: {
  value: number | null;
  inverse?: boolean;
}) {
  const { colors } = useTheme();
  if (value === null) {
    return (
      <span
        className="percentage-value"
        style={{ backgroundColor: colors.subtle, color: colors.muted }}
      >
        Sem base
      </span>
    );
  }

  const favorable = inverse ? value <= 0 : value >= 0;
  const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className="percentage-value"
      style={{
        backgroundColor: favorable ? `${colors.green}18` : `${colors.red}18`,
        color: favorable ? colors.green : colors.red,
      }}
    >
      <Icon size={13} />
      {value > 0 ? "+" : ""}
      {Math.round(value)}%
    </span>
  );
}

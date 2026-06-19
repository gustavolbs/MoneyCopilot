import { ArrowDownRight, ArrowUpRight, Scale } from "lucide-react";

import { formatCurrency } from "@/domain/normalize";
import { cn } from "@/lib/utils";

interface TransactionSummaryCardsProps {
  income: number;
  expense: number;
}

export function TransactionSummaryCards({
  income,
  expense,
}: TransactionSummaryCardsProps) {
  const balance = income - expense;
  const flow = income + expense;
  const sharePct = (part: number) =>
    flow > 0 ? `${Math.round((part / flow) * 100)}% do fluxo` : "Sem fluxo";

  const cards = [
    {
      label: "Entradas",
      sublabel: "Receitas no filtro",
      value: formatCurrency(income),
      detail: sharePct(income),
      trendTone: "positive",
      accent: "green",
      valueColor: "var(--mc-ink)",
      icon: <ArrowUpRight size={16} />,
    },
    {
      label: "Saídas",
      sublabel: "Despesas no filtro",
      value: formatCurrency(expense),
      detail: sharePct(expense),
      trendTone: "negative",
      accent: "red",
      valueColor: "var(--mc-ink)",
      icon: <ArrowDownRight size={16} />,
    },
    {
      label: "Saldo filtrado",
      sublabel: "Entradas − saídas",
      value: formatCurrency(balance),
      detail:
        income > 0
          ? `${Math.round((balance / income) * 100)}% das entradas`
          : balance >= 0
            ? "Positivo"
            : "Negativo",
      trendTone: balance >= 0 ? "positive" : "negative",
      accent: "gold",
      valueColor: balance >= 0 ? "var(--mc-green)" : "var(--mc-red)",
      icon: <Scale size={16} />,
    },
  ];

  return (
    <>
      <section className="mobile-metric-section" aria-label="Resumo financeiro">
        <div className="mobile-metric-compact-list">
          {cards.map((metric) => (
            <div className="mobile-metric-compact-row" key={metric.label}>
              <span className={cn("mobile-metric-dot", metric.accent)} />
              <span>{metric.label}</span>
              <strong className={metric.accent}>{metric.value}</strong>
              <small className={metric.trendTone}>{metric.detail}</small>
            </div>
          ))}
        </div>
      </section>

      <div className="transaction-summary-cards grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 hidden md:grid">
        {cards.map((card) => (
          <div
            key={card.label}
            className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-[var(--mc-line)] bg-[var(--mc-surface)] p-4 sm:p-5"
            style={{ borderTopColor: card.accent, borderTopWidth: 2 }}
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--mc-muted)]">
                  {card.label}
                </p>
                <p className="mt-0.5 text-[10px] text-[var(--mc-muted)]">
                  {card.sublabel}
                </p>
              </div>
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${card.accent}18` }}
              >
                <span style={{ color: card.accent }}>{card.icon}</span>
              </div>
            </div>
            <p
              className="mt-3 truncate text-xl font-bold tracking-tight tabular-nums sm:text-2xl"
              style={{ color: card.valueColor }}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}

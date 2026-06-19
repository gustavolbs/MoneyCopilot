import { TrendingDown, TrendingUp, Wallet, Target } from "lucide-react";
import { formatCurrency } from "@/domain/normalize";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  sublabel: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  accentColor: string;
  icon: React.ReactNode;
}

function MetricCard({
  label,
  sublabel,
  value,
  trend,
  trendUp,
  accentColor,
  icon,
}: MetricCardProps) {
  return (
    <div
      className="mobile-metric-card relative flex flex-col justify-between overflow-hidden rounded-xl border border-[var(--mc-line)] bg-[var(--mc-surface)] p-4 sm:p-5"
      style={{ borderTopColor: accentColor, borderTopWidth: 2 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--mc-muted)]">
            {label}
          </p>
          <p className="mt-0.5 text-[10px] text-[var(--mc-muted)]">
            {sublabel}
          </p>
        </div>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${accentColor}18` }}
        >
          <span style={{ color: accentColor }}>{icon}</span>
        </div>
      </div>
      <div className="mt-3">
        <p className="text-xl font-bold tracking-tight text-[var(--mc-ink)] sm:text-2xl">
          {value}
        </p>
        {trend && (
          <div className="mt-1.5 flex items-center gap-1">
            {trendUp !== undefined &&
              (trendUp ? (
                <TrendingUp size={12} className="text-[var(--mc-green)]" />
              ) : (
                <TrendingDown size={12} className="text-[var(--mc-red)]" />
              ))}
            <span
              className={cn(
                "text-xs",
                trendUp === undefined
                  ? "text-[var(--mc-muted)]"
                  : trendUp
                    ? "text-[var(--mc-green)]"
                    : "text-[var(--mc-red)]",
              )}
            >
              {trend}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface MetricCardsProps {
  available: number;
  income: number;
  expense: number;
  projectedClose: number;
  incomeChange?: number;
  expenseChange: number;
  savingsRate: number;
  compact?: boolean;
}

export function MetricCards({
  available,
  income,
  expense,
  projectedClose,
  incomeChange = 0,
  expenseChange,
  savingsRate,
  compact = false,
}: MetricCardsProps) {
  const expenseChangeLabel = `${Math.abs(expenseChange * 100).toFixed(0)}% vs. mês anterior`;
  const savingsRateLabel = `${Math.round(savingsRate * 100)}% da renda`;

  if (compact) {
    const metrics = [
      {
        label: "Disponível",
        value: formatCurrency(available),
        detail: "Saldo atual",
        accent: "blue",
        trendTone: "neutral",
      },
      {
        label: "Receitas",
        value: formatCurrency(income),
        detail: `${incomeChange >= 0 ? "subiu" : "caiu"} ${Math.abs(incomeChange * 100).toFixed(0)}%`,
        accent: "green",
        trendTone: incomeChange >= 0 ? "positive" : "negative",
      },
      {
        label: "Despesas",
        value: formatCurrency(expense),
        detail: `${expenseChange > 0 ? "subiu" : "caiu"} ${Math.abs(expenseChange * 100).toFixed(0)}%`,
        accent: "red",
        trendTone: expenseChange > 0 ? "negative" : "positive",
      },
      {
        label: "Sobra prevista",
        value: formatCurrency(projectedClose),
        detail: savingsRateLabel,
        accent: "gold",
        trendTone: projectedClose >= 0 ? "neutral" : "negative",
      },
    ];

    return (
      <div className="mobile-metric-compact-list">
        {metrics.map((metric) => (
          <div className="mobile-metric-compact-row" key={metric.label}>
            <span className={cn("mobile-metric-dot", metric.accent)} />
            <span>{metric.label}</span>
            <strong className={metric.accent}>{metric.value}</strong>
            <small className={metric.trendTone}>{metric.detail}</small>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mobile-metric-strip grid grid-cols-2 gap-4 lg:grid-cols-4">
      <MetricCard
        label="Disponível"
        sublabel="Saldos livres"
        value={formatCurrency(available)}
        trend="Saldo atual"
        accentColor="#3b82f6"
        icon={<Wallet size={16} />}
      />
      <MetricCard
        label="Receitas"
        sublabel="Nesta competência"
        value={formatCurrency(income)}
        trend="Mês atual"
        accentColor="#22c55e"
        icon={<TrendingUp size={16} />}
      />
      <MetricCard
        label="Despesas"
        sublabel={expenseChangeLabel}
        value={formatCurrency(expense)}
        trend={expenseChangeLabel}
        trendUp={expenseChange <= 0}
        accentColor="#ef4444"
        icon={<TrendingDown size={16} />}
      />
      <MetricCard
        label="Sobra prevista"
        sublabel={savingsRateLabel}
        value={formatCurrency(projectedClose)}
        trend={savingsRateLabel}
        trendUp={projectedClose >= 0}
        accentColor="#eab308"
        icon={<Target size={16} />}
      />
    </div>
  );
}

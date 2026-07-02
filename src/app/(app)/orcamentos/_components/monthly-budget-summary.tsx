"use client";

import { AlertTriangle, CheckCircle2, Target } from "lucide-react";

import { formatCurrency } from "@/domain/normalize";
import { useTheme } from "@/lib/theme";

type MonthlyBudgetSummaryProps = {
  okCount: number;
  overCount: number;
  percent: number;
  planned: number;
  remaining: number;
  spent: number;
  warningCount: number;
};

export function MonthlyBudgetSummary({
  okCount,
  overCount,
  percent,
  planned,
  remaining,
  spent,
  warningCount,
}: MonthlyBudgetSummaryProps) {
  const { colors } = useTheme();
  const ringColor =
    percent >= 1 ? colors.red : percent >= 0.8 ? colors.gold : colors.green;

  return (
    <section className="budget-summary-panel" aria-label="Planejamento mensal">
      <div className="budget-overview">
        <div
          className="budget-ring"
          style={{
            background: `conic-gradient(${ringColor} ${Math.min(percent * 100, 100)}%, ${colors.subtle} 0)`,
          }}
        >
          <div style={{ backgroundColor: colors.surface }}>
            <strong>{Math.round(percent * 100)}%</strong>
            <span style={{ color: colors.muted }}>utilizado</span>
          </div>
        </div>

        <div className="budget-overview-main">
          <span className="budget-summary-kicker">Planejamento mensal</span>
          <strong>{formatCurrency(planned)}</strong>
          <div className="budget-overview-values">
            <div>
              <span style={{ color: colors.muted }}>Gasto</span>
              <b style={{ color: colors.red }}>{formatCurrency(spent)}</b>
            </div>
            <div>
              <span style={{ color: colors.muted }}>Disponível</span>
              <b style={{ color: remaining >= 0 ? colors.green : colors.red }}>
                {formatCurrency(remaining)}
              </b>
            </div>
          </div>
        </div>
      </div>

      <div className="budget-status-strip">
        <BudgetStatus
          icon={<CheckCircle2 size={15} />}
          count={okCount}
          label="No limite"
          color={colors.green}
        />
        <BudgetStatus
          icon={<AlertTriangle size={15} />}
          count={warningCount}
          label="Atenção"
          color={colors.gold}
        />
        <BudgetStatus
          icon={<Target size={15} />}
          count={overCount}
          label="Estourados"
          color={colors.red}
        />
      </div>
    </section>
  );
}

function BudgetStatus({
  color,
  count,
  icon,
  label,
}: {
  color: string;
  count: number;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="budget-status">
      <span style={{ color, backgroundColor: `${color}18` }}>{icon}</span>
      <strong>{count}</strong>
      <small>{label}</small>
    </div>
  );
}

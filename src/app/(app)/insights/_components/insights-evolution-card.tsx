import { DataTooltip } from "@/components/InsightTooltip";
import { Label } from "@/components/ui";
import type { DashboardMetrics } from "@/domain/finance";
import { formatCurrency } from "@/domain/normalize";

type MonthlyInsightPoint = {
  label: string;
  metrics: DashboardMetrics;
};

type InsightsEvolutionCardProps = {
  maxValue: number;
  series: MonthlyInsightPoint[];
};

export function InsightsEvolutionCard({
  maxValue,
  series,
}: InsightsEvolutionCardProps) {
  return (
    <section className="insights-evolution-card">
      <div className="insights-section-head">
        <div>
          <Label>Evolução</Label>
          <strong>Receitas e despesas</strong>
        </div>
        <div className="insights-chart-legend">
          <span className="income">Receitas</span>
          <span className="expense">Despesas</span>
        </div>
      </div>

      <div
        className="insights-month-chart"
        aria-label="Comparativo dos últimos quatro meses"
      >
        {series.map((item) => (
          <div className="insights-month-column" key={item.label}>
            <div className="insights-bars">
              <ChartBar
                maxValue={maxValue}
                month={item.label}
                type="income"
                value={item.metrics.income}
              />
              <ChartBar
                maxValue={maxValue}
                month={item.label}
                type="expense"
                value={item.metrics.expense}
              />
            </div>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ChartBar({
  maxValue,
  month,
  type,
  value,
}: {
  maxValue: number;
  month: string;
  type: "income" | "expense";
  value: number;
}) {
  const label = type === "income" ? "Receitas" : "Despesas";

  return (
    <div className="insights-bar-slot">
      <DataTooltip
        body={formatCurrency(value)}
        detail="Competência mensal"
        title={`${label} em ${month}`}
      >
        <div
          className={`insights-bar ${type}`}
          style={{ height: `${Math.max((value / maxValue) * 100, value > 0 ? 4 : 0)}%` }}
        />
      </DataTooltip>
    </div>
  );
}

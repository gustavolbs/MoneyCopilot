import { CalendarDays, CreditCard, TrendingUp } from "lucide-react";

type InsightsPeriodCardProps = {
  monthLabel: string;
};

export function InsightsPeriodCard({ monthLabel }: InsightsPeriodCardProps) {
  return (
    <section className="insights-period-card" aria-label="Período observado">
      <span className="insights-period-icon">
        <CalendarDays size={18} aria-hidden="true" />
      </span>
      <div>
        <span>Período observado</span>
        <strong>{monthLabel}</strong>
        <small>
          Comparações por competência, incluindo cartões no mês de vencimento da
          fatura.
        </small>
      </div>
      <div className="insights-period-tags" aria-hidden="true">
        <span>
          <TrendingUp size={13} />
          Tendências
        </span>
        <span>
          <CreditCard size={13} />
          Faturas
        </span>
      </div>
    </section>
  );
}

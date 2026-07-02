"use client";

import { CalendarClock } from "lucide-react";

type BudgetPeriodNoticeProps = {
  label: string;
};

export function BudgetPeriodNotice({ label }: BudgetPeriodNoticeProps) {
  return (
    <section className="budget-observed-period" aria-label="Período observado">
      <span className="budget-observed-icon" aria-hidden="true">
        <CalendarClock size={18} />
      </span>
      <div>
        <span>Período observado</span>
        <strong>{label}</strong>
        <small>Limites acompanham a competência da compra e o vencimento das faturas.</small>
      </div>
    </section>
  );
}

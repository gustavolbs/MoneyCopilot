"use client";

import { CalendarDays, ClipboardList, Repeat } from "lucide-react";
import type { ReactNode } from "react";

import { formatCurrency, formatDate } from "@/domain/normalize";
import type { PlannedExpenses } from "@/domain/finance";
import { useTheme } from "@/lib/theme";

type PlannedExpensesSectionProps = {
  monthLabel: string;
  plannedBudget: number;
  plannedExpenses: PlannedExpenses;
};

export function PlannedExpensesSection({
  monthLabel,
  plannedBudget,
  plannedExpenses,
}: PlannedExpensesSectionProps) {
  const { colors } = useTheme();
  const freeToPlan = plannedBudget - plannedExpenses.total;
  const visibleItems = plannedExpenses.items.slice(0, 6);

  return (
    <section className="budget-planned-panel" aria-label="Gastos planejados">
      <div className="budget-planned-header">
        <div>
          <span>Decisão do mês</span>
          <strong>Gastos planejados</strong>
          <small>{monthLabel}</small>
        </div>
        <div
          className="budget-planned-free"
          data-negative={freeToPlan < 0}
        >
          <span>{freeToPlan >= 0 ? "Livre para planejar" : "Acima do plano"}</span>
          <strong>{formatCurrency(Math.abs(freeToPlan))}</strong>
        </div>
      </div>

      <div className="budget-planned-metrics">
        <PlannedMetric
          icon={<ClipboardList size={15} />}
          label="Orçado"
          value={plannedBudget}
          color={colors.blue}
        />
        <PlannedMetric
          icon={<CalendarDays size={15} />}
          label="Já comprometido"
          value={plannedExpenses.total}
          color={plannedExpenses.total > plannedBudget ? colors.red : colors.gold}
        />
        <PlannedMetric
          icon={<Repeat size={15} />}
          label="Recorrências previstas"
          value={plannedExpenses.recurrenceTotal}
          color={colors.green}
        />
      </div>

      {visibleItems.length ? (
        <div className="budget-planned-list">
          {visibleItems.map((item) => (
            <div key={item.id} className="budget-planned-item">
              <span
                className="budget-planned-item-icon"
                data-source={item.source}
              >
                {item.source === "recurrence" ? <Repeat size={13} /> : <CalendarDays size={13} />}
              </span>
              <div>
                <strong>{item.description}</strong>
                <small>{formatDate(item.date)} · {item.source === "recurrence" ? "recorrência" : "lançamento"}</small>
              </div>
              <b>{formatCurrency(item.amount)}</b>
            </div>
          ))}
        </div>
      ) : (
        <p className="budget-planned-empty">
          Nenhum gasto já comprometido para este mês. Use os limites ativos para decidir quanto reservar por categoria.
        </p>
      )}
    </section>
  );
}

function PlannedMetric({
  color,
  icon,
  label,
  value,
}: {
  color: string;
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="budget-planned-metric">
      <span style={{ backgroundColor: `${color}18`, color }}>{icon}</span>
      <small>{label}</small>
      <strong>{formatCurrency(value)}</strong>
    </div>
  );
}

"use client";

import { CalendarDays, ChevronLeft, ChevronRight, History } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type PeriodFilter = "previous" | "current" | "next" | "all";

export interface TransactionPeriodOption {
  id: PeriodFilter;
  label: string;
  month: string | null;
  detail: string;
}

interface TransactionPeriodCardsProps {
  options: TransactionPeriodOption[];
  value: PeriodFilter;
  counts: Map<PeriodFilter, number>;
  onValueChange: (value: PeriodFilter) => void;
}

const periodIcon = {
  previous: ChevronLeft,
  current: CalendarDays,
  next: ChevronRight,
  all: History,
} as const;

export function TransactionPeriodCards({
  options,
  value,
  counts,
  onValueChange,
}: TransactionPeriodCardsProps) {
  return (
    <section className="transaction-period-section" aria-label="Competência">
      <div className="transaction-period-section-heading">
        <span>Período</span>
        <small>Compras no cartão seguem o mês da fatura</small>
      </div>

      <ToggleGroup
        value={[value]}
        onValueChange={(values) =>
          onValueChange((values[0] ?? value) as PeriodFilter)
        }
        className="transaction-period-grid"
        aria-label="Período"
      >
        {options.map((option) => {
          const Icon = periodIcon[option.id];
          const active = value === option.id;
          const count = counts.get(option.id) ?? 0;

          return (
            <ToggleGroupItem
              variant="outline"
              key={option.id}
              value={option.id}
              className={`transaction-period-card${active ? " active" : ""}`}
              aria-label={`${option.label}, ${option.detail}, ${count} transações`}
            >
              <span className="transaction-period-icon" aria-hidden="true">
                <Icon size={16} />
              </span>
              <span className="transaction-period-copy">
                <span>{option.label}</span>
                <strong>{option.detail}</strong>
                <small>
                  {count} {count === 1 ? "transação" : "transações"}
                </small>
              </span>
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </section>
  );
}

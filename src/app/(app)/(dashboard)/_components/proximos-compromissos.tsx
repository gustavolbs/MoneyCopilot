"use client";

import { CalendarDays } from "lucide-react";

import { formatCurrency, formatDate } from "@/domain/normalize";
import type { Recurrence } from "@/domain/types";
import { cn } from "@/lib/utils";

interface ProximosCompromissosProps {
  recurrences: Recurrence[];
  limit?: number;
  className?: string;
}

const frequencyLabel: Record<Recurrence["frequency"], string> = {
  weekly: "Semanal",
  monthly: "Mensal",
  yearly: "Anual",
};

export function ProximosCompromissos({
  recurrences,
  limit = 5,
  className,
}: ProximosCompromissosProps) {
  const upcoming = recurrences
    .filter((recurrence) => recurrence.active && !recurrence.deleted_at)
    .sort((a, b) => a.next_due_date.localeCompare(b.next_due_date))
    .slice(0, limit);

  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--mc-line)] bg-[var(--mc-surface)] p-4 sm:p-5",
        className,
      )}
    >
      <div className="mobile-section-header mb-4 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--mc-ink)]">
          Próximos compromissos
        </h3>
        <span className="text-xs text-[var(--mc-muted)]">
          {upcoming.length} previstos
        </span>
      </div>

      {upcoming.length ? (
        <div className="mobile-compact-list flex flex-col gap-0.5">
          {upcoming.map((recurrence) => (
            <div
              key={recurrence.id}
              className="mobile-compact-row flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-[var(--mc-subtle)]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--mc-subtle)]">
                <CalendarDays size={14} className="text-[var(--mc-muted)]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--mc-ink)]">
                  {recurrence.description}
                </p>
                <p className="text-[10px] text-[var(--mc-muted)]">
                  {formatDate(recurrence.next_due_date)} ·{" "}
                  {frequencyLabel[recurrence.frequency]}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--mc-ink)]">
                {formatCurrency(recurrence.amount)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-[var(--mc-muted)]">
          Nenhuma recorrência ativa para os próximos dias.
        </p>
      )}
    </div>
  );
}

"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button as ShadcnButton } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";

type BudgetMonthSelectorProps = {
  isCurrentMonth: boolean;
  label: string;
  onCurrentMonth: () => void;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
};

export function BudgetMonthSelector({
  isCurrentMonth,
  label,
  onCurrentMonth,
  onNextMonth,
  onPreviousMonth,
}: BudgetMonthSelectorProps) {
  const { colors } = useTheme();

  return (
    <section className="budget-period-panel" aria-label="Competência do orçamento">
      <div className="budget-period-copy">
        <span>Mês selecionado</span>
        <strong>{label}</strong>
        <small>Consulte e edite limites de qualquer competência.</small>
      </div>

      <div className="budget-period-controls">
        <ShadcnButton
          type="button"
          variant="outline"
          className="budget-month-button"
          onClick={onPreviousMonth}
          style={{ borderColor: colors.line, color: colors.ink }}
        >
          <ChevronLeft size={16} />
          Anterior
        </ShadcnButton>
        <ShadcnButton
          type="button"
          variant="outline"
          className="budget-month-button"
          onClick={onNextMonth}
          style={{ borderColor: colors.line, color: colors.ink }}
        >
          Próximo
          <ChevronRight size={16} />
        </ShadcnButton>
        {!isCurrentMonth ? (
          <ShadcnButton
            type="button"
            variant="ghost"
            className="budget-month-today"
            onClick={onCurrentMonth}
            style={{ color: colors.blue, backgroundColor: colors.subtle }}
          >
            Mês atual
          </ShadcnButton>
        ) : null}
      </div>
    </section>
  );
}

import { ChevronLeft, ChevronRight, Lightbulb } from "lucide-react";

type InsightsPageHeaderProps = {
  isCurrentMonth: boolean;
  monthLabel: string;
  onCurrentMonth: () => void;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
};

export function InsightsPageHeader({
  isCurrentMonth,
  monthLabel,
  onCurrentMonth,
  onNextMonth,
  onPreviousMonth,
}: InsightsPageHeaderProps) {
  return (
    <header className="insights-page-header">
      <div className="insights-page-heading">
        <p>Análise financeira</p>
        <h1>Insights</h1>
        <span>{monthLabel}</span>
      </div>

      <div className="insights-page-actions">
        <div className="insights-month-controls" aria-label="Selecionar mês">
          <button type="button" onClick={onPreviousMonth} aria-label="Mês anterior">
            <ChevronLeft size={16} />
          </button>
          <button type="button" onClick={onNextMonth} aria-label="Próximo mês">
            <ChevronRight size={16} />
          </button>
          {!isCurrentMonth ? (
            <button type="button" onClick={onCurrentMonth}>
              Mês atual
            </button>
          ) : null}
        </div>

        <div className="insights-page-badge">
          <Lightbulb size={16} aria-hidden="true" />
          <strong>Automático</strong>
          <span>por competência</span>
        </div>
      </div>
    </header>
  );
}

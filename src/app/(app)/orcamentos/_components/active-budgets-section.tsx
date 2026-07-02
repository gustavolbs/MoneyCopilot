"use client";

import { Target } from "lucide-react";

import { categoryEmoji } from "@/components/CategoryBadge";
import { Card } from "@/components/ui";
import { Button as ShadcnButton } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/domain/normalize";
import type { Budget, Category } from "@/domain/types";
import { useTheme } from "@/lib/theme";

type BudgetProgress = {
  spent: number;
  percent: number;
  status: "ok" | "warning" | "over";
};

export type ActiveBudgetItem = {
  budget: Budget;
  category: Category | undefined;
  progress: BudgetProgress;
};

type ActiveBudgetsSectionProps = {
  items: ActiveBudgetItem[];
  monthLabel: string;
  onInspect: (budgetId: string) => void;
  selectedBudgetId: string | null;
};

export function ActiveBudgetsSection({
  items,
  monthLabel,
  onInspect,
  selectedBudgetId,
}: ActiveBudgetsSectionProps) {
  const { colors } = useTheme();

  return (
    <section className="budget-active-section" aria-label="Limites ativos">
      <div className="budget-active-heading">
        <div>
          <span>Por categoria</span>
          <strong>Limites ativos</strong>
          <small>{monthLabel}</small>
        </div>
        <div className="budget-active-count">
          <Target size={15} aria-hidden="true" />
          <span>{items.length} categorias</span>
        </div>
      </div>

      {items.length ? (
        <div className="budget-card-grid" data-swipe-ignore>
          {items.map((item) => (
            <ActiveBudgetCard
              key={item.budget.id}
              item={item}
              onInspect={onInspect}
              selected={selectedBudgetId === item.budget.id}
            />
          ))}
        </div>
      ) : (
        <Card style={{ backgroundColor: colors.surface, borderColor: colors.line }}>
          <p className="budget-empty" style={{ color: colors.muted }}>
            Escolha uma categoria abaixo para criar o primeiro limite de {monthLabel}.
          </p>
        </Card>
      )}
    </section>
  );
}

function ActiveBudgetCard({
  item,
  onInspect,
  selected,
}: {
  item: ActiveBudgetItem;
  onInspect: (budgetId: string) => void;
  selected: boolean;
}) {
  const { colors } = useTheme();
  const { budget, category, progress } = item;
  const statusColor =
    progress.status === "over"
      ? colors.red
      : progress.status === "warning"
        ? colors.gold
        : category?.color ?? colors.green;
  const remaining = budget.amount - progress.spent;
  const progressPercent = Math.min(progress.percent * 100, 100);

  return (
    <ShadcnButton
      type="button"
      variant="outline"
      className={`budget-visual-card${selected ? " selected" : ""}`}
      aria-pressed={selected}
      onClick={() => onInspect(budget.id)}
      style={{
        backgroundColor: colors.surface,
        borderColor: selected ? colors.blue : colors.line,
      }}
    >
      <div className="budget-card-top">
        <span
          className="budget-category-icon"
          style={{
            backgroundColor: `${category?.color ?? colors.blue}20`,
            color: category?.color ?? colors.blue,
          }}
        >
          {categoryEmoji(category)}
        </span>
        <div>
          <strong style={{ color: colors.ink }}>
            {category?.name ?? "Categoria"}
          </strong>
          <small style={{ color: colors.muted }}>
            {formatCurrency(progress.spent)} de {formatCurrency(budget.amount)}
          </small>
        </div>
        <b style={{ color: statusColor }}>{Math.round(progress.percent * 100)}%</b>
      </div>

      <Progress
        value={progressPercent}
        className="app-progress budget-visual-track"
        style={
          { "--primary": statusColor, "--muted": colors.subtle } as React.CSSProperties
        }
      />

      <div className="budget-card-bottom" style={{ color: colors.muted }}>
        <span>{remaining >= 0 ? "Restam" : "Excedeu"}</span>
        <strong style={{ color: remaining >= 0 ? colors.ink : colors.red }}>
          {formatCurrency(Math.abs(remaining))}
        </strong>
      </div>
    </ShadcnButton>
  );
}

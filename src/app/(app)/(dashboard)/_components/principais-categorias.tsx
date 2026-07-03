"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { categoryEmoji } from "@/components/CategoryBadge";
import { effectiveBudgetsForMonth } from "@/domain/finance";
import { formatCurrency } from "@/domain/normalize";
import type { Budget, Category } from "@/domain/types";
import { cn } from "@/lib/utils";

interface CategoriaItem {
  category: Category;
  amount: number;
  percent: number;
}

interface PrincipaisCategoriasProps {
  categories: CategoriaItem[];
  budgets: Budget[];
  month: string;
  limit?: number;
  className?: string;
}

export function PrincipaisCategorias({
  categories,
  budgets,
  month,
  limit = 6,
  className,
}: PrincipaisCategoriasProps) {
  const items = categories.slice(0, limit);
  const maxAmount = Math.max(...categories.map((item) => item.amount), 1);
  const budgetsByCategory = new Map(
    effectiveBudgetsForMonth(budgets, month).map((budget) => [
      budget.category_id,
      budget,
    ]),
  );

  return (
    <div
      className={cn(
        "principais-categorias-card rounded-xl border border-[var(--mc-line)] bg-[var(--mc-surface)] p-4 sm:p-5",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="mobile-category-heading text-sm font-semibold text-[var(--mc-ink)]">
          Principais categorias
        </h3>
        <Link
          href="/orcamentos"
          className="mobile-category-count flex items-center gap-1 text-[var(--mc-muted)] hover:text-[var(--mc-blue)]"
        >
          <span className="flex items-center gap-1 text-xs ">
            {categories.length} categorias
            <ArrowRight size={12} />
          </span>
        </Link>
      </div>

      <div className="mobile-category-budgets">
        {items.length ? (
          <div className="mobile-budget-scroll">
            {items.map((item) => {
              const budget = budgetsByCategory.get(item.category.id);
              const budgetPercent = budget
                ? Math.min(Math.max((item.amount / budget.amount) * 100, 0), 100)
                : Math.min(Math.max(item.percent * 100, 0), 100);
              const budgetBalance = budget ? budget.amount - item.amount : null;
              const budgetLabel = budget
                ? budgetBalance !== null && budgetBalance < 0
                  ? `${formatCurrency(Math.abs(budgetBalance))} acima`
                  : `${formatCurrency(budgetBalance ?? 0)} livre`
                : `${Math.round(item.percent * 100)}% do mês`;
              const ariaLabel = budget
                ? `${item.category.name}: ${formatCurrency(item.amount)} gastos de ${formatCurrency(budget.amount)} orçados`
                : `${item.category.name}: ${Math.round(item.percent * 100)}% das despesas do mês`;

              return (
                <div
                  key={item.category.id}
                  className={cn(
                    "mobile-budget-item",
                    budgetBalance !== null && budgetBalance < 0 && "is-over-budget",
                  )}
                  title={item.category.name}
                >
                  <div
                    className="mobile-budget-ring"
                    role="progressbar"
                    aria-label={ariaLabel}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(budgetPercent)}
                    style={
                      {
                        "--budget-progress": `${budgetPercent}%`,
                        "--budget-color": item.category.color,
                      } as React.CSSProperties
                    }
                  >
                    <span aria-hidden>{categoryEmoji(item.category)}</span>
                  </div>
                  <strong>{formatCurrency(item.amount)}</strong>
                  <small>
                    {budget ? `de ${formatCurrency(budget.amount)}` : "sem orçamento"}
                  </small>
                  <small className="mobile-budget-balance">{budgetLabel}</small>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mobile-budget-empty">
            As categorias aparecerão conforme você registrar despesas.
          </p>
        )}
      </div>

      {items.length ? (
        <div className="desktop-category-ranking flex flex-col gap-3">
          {items.map((item) => {
            const budget = budgetsByCategory.get(item.category.id);
            const barWidth = (item.amount / maxAmount) * 100;
            const pct = Math.round(item.percent * 100);
            const budgetPercent = budget
              ? Math.min(Math.max((item.amount / budget.amount) * 100, 0), 100)
              : 0;
            const budgetBalance = budget ? budget.amount - item.amount : null;
            return (
              <div key={item.category.id} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs"
                      style={{
                        backgroundColor: `${item.category.color}18`,
                        borderColor: `${item.category.color}66`,
                      }}
                    >
                      <span aria-hidden>{categoryEmoji(item.category)}</span>
                    </div>
                    <span className="truncate text-xs font-medium text-[var(--mc-ink)]">
                      {item.category.name}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs font-semibold tabular-nums text-[var(--mc-ink)]">
                      {formatCurrency(item.amount)}
                    </span>
                    <span className="w-10 text-right text-[10px] tabular-nums text-[var(--mc-muted)]">
                      {pct}%
                    </span>
                  </div>
                </div>
                <div className="desktop-category-budget-row">
                  {budget ? (
                    <>
                      <span>
                        {formatCurrency(item.amount)} de{" "}
                        {formatCurrency(budget.amount)} orçados
                      </span>
                      <strong
                        className={cn(
                          budgetBalance !== null &&
                            budgetBalance < 0 &&
                            "is-over-budget",
                        )}
                      >
                        {budgetBalance !== null && budgetBalance < 0
                          ? `${formatCurrency(Math.abs(budgetBalance))} acima`
                          : `${formatCurrency(budgetBalance ?? 0)} livre`}
                      </strong>
                    </>
                  ) : (
                    <span>Sem orçamento definido para esta categoria</span>
                  )}
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--mc-subtle)]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: item.category.color,
                    }}
                  />
                </div>
                {budget ? (
                  <div className="desktop-category-budget-track">
                    <span
                      style={{
                        width: `${budgetPercent}%`,
                        backgroundColor: item.category.color,
                      }}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="desktop-category-ranking py-6 text-center text-sm text-[var(--mc-muted)]">
          As categorias aparecerão conforme você registrar despesas.
        </p>
      )}
    </div>
  );
}

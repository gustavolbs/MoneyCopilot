"use client";

import { ArrowRight } from "lucide-react";

import { categoryEmoji } from "@/components/CategoryBadge";
import { budgetProgress } from "@/domain/finance";
import { formatCurrency } from "@/domain/normalize";
import type { Account, Budget, Category, Transaction } from "@/domain/types";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface CategoriaItem {
  category: Category;
  amount: number;
  percent: number;
}

interface PrincipaisCategoriasProps {
  categories: CategoriaItem[];
  allCategories: Category[];
  budgets: Budget[];
  transactions: Transaction[];
  accounts: Account[];
  month: string;
  limit?: number;
  className?: string;
}

const budgetStatusColor: Record<string, string> = {
  ok: "#22c55e",
  warning: "#f59e0b",
  over: "#ef4444",
} as const;

export function PrincipaisCategorias({
  categories,
  allCategories,
  budgets,
  transactions,
  accounts,
  month,
  limit = 6,
  className,
}: PrincipaisCategoriasProps) {
  const items = categories.slice(0, limit);
  const maxAmount = Math.max(...categories.map((item) => item.amount), 1);
  const mobileItems = budgets
    .filter((budget) => budget.month === month && !budget.deleted_at)
    .map((budget) => ({
      budget,
      category: allCategories.find(
        (category) => category.id === budget.category_id,
      ),
      progress: budgetProgress(transactions, budget, accounts),
    }))
    .filter(
      (
        item,
      ): item is typeof item & {
        category: Category;
      } => Boolean(item.category),
    )
    .sort((a, b) => b.progress.percent - a.progress.percent)
    .slice(0, limit);

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
        {mobileItems.length ? (
          <div className="mobile-budget-scroll">
            {mobileItems.map(({ budget, category, progress }) => {
              const difference = budget.amount - progress.spent;
              const progressPercent = Math.min(
                Math.max(progress.percent * 100, 0),
                100,
              );
              const stateLabel =
                difference < 0
                  ? "excedeu"
                  : difference === 0
                    ? "no limite"
                    : "restam";

              return (
                <div
                  key={budget.id}
                  className="mobile-budget-item"
                  title={category.name}
                >
                  <div
                    className="mobile-budget-ring"
                    role="progressbar"
                    aria-label={`${category.name}: ${Math.round(progress.percent * 100)}% do orçamento utilizado`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progressPercent)}
                    style={
                      {
                        "--budget-progress": `${progressPercent}%`,
                        "--budget-color": budgetStatusColor[progress.status],
                      } as React.CSSProperties
                    }
                  >
                    <span aria-hidden>{categoryEmoji(category)}</span>
                  </div>
                  <strong>{formatCurrency(Math.abs(difference))}</strong>
                  <small
                    className={cn(
                      progress.status === "over" && "is-over-budget",
                    )}
                  >
                    {stateLabel}
                  </small>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mobile-budget-empty">
            Defina limites em Orçamentos para acompanhar o saldo por categoria.
          </p>
        )}
      </div>

      {items.length ? (
        <div className="desktop-category-ranking flex flex-col gap-3">
          {items.map((item) => {
            const barWidth = (item.amount / maxAmount) * 100;
            const pct = Math.round(item.percent * 100);
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
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--mc-subtle)]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: item.category.color,
                    }}
                  />
                </div>
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

"use client";

import { isToday, isYesterday, parseISO } from "date-fns";
import { ArrowRight, CreditCard } from "lucide-react";

import { transactionEffectiveDate } from "@/domain/finance";
import { formatCurrency, formatDate } from "@/domain/normalize";
import type { Account, Category, Transaction } from "@/domain/types";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface TransacoesRecentesProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  limit?: number;
  className?: string;
}

function groupLabel(value: string) {
  const date = parseISO(value);
  if (isToday(date)) return "Hoje";
  if (isYesterday(date)) return "Ontem";
  return formatDate(value);
}

export function TransacoesRecentes({
  transactions,
  categories,
  accounts,
  limit = 8,
  className,
}: TransacoesRecentesProps) {
  const recent = transactions.slice(0, limit);

  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--mc-line)] bg-[var(--mc-surface)] p-4 sm:p-5",
        className,
      )}
    >
      <div className="mobile-section-header mb-4 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--mc-ink)]">
          Transações recentes
        </h3>
        <Link
          href="/transacoes"
          className="flex items-center gap-1 text-[var(--mc-muted)] hover:text-[var(--mc-blue)] transition-colors"
        >
          <span className="flex items-center gap-1 text-xs ">
            {transactions.length} lançamentos
            <ArrowRight size={12} />
          </span>
        </Link>
      </div>

      {recent.length ? (
        <div className="mobile-transaction-list flex flex-col gap-0.5">
          {recent.map((transaction, index) => {
            const category = categories.find(
              (item) => item.id === transaction.category_id,
            );
            const card = accounts.find(
              (account) =>
                account.id === transaction.account_id &&
                account.type === "credit_card",
            );
            const previousDate = recent[index - 1]?.transaction_date;
            const showDateLabel = previousDate !== transaction.transaction_date;
            const categoryColor = category?.color ?? "var(--mc-muted)";
            const categoryLabel =
              category?.name ??
              (transaction.type === "income" ? "Receita" : "Outros");
            const accountLabel =
              card?.name ??
              (transaction.type === "income" ? "Conta corrente" : "À vista");
            const sign =
              transaction.type === "income"
                ? "+"
                : transaction.type === "expense"
                  ? "-"
                  : "";
            const valueColor =
              transaction.type === "income"
                ? "text-[var(--mc-green)]"
                : transaction.type === "transfer"
                  ? "text-[var(--mc-muted)]"
                  : "text-[var(--mc-red)]";
            const isRecurring =
              transaction.source === "recurring" ||
              Boolean(transaction.recurrence_id);

            return (
              <div key={transaction.id}>
                {showDateLabel && (
                  <p className="mobile-list-date mb-2 mt-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--mc-muted)]">
                    {groupLabel(transaction.transaction_date)}
                  </p>
                )}
                <div className="mobile-transaction-row flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-[var(--mc-subtle)]">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--mc-subtle)]">
                    <CreditCard size={14} className="text-[var(--mc-muted)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--mc-ink)]">
                      {transaction.description}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      <span
                        className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                        style={{
                          color: categoryColor,
                          backgroundColor: category
                            ? `${category.color}18`
                            : "var(--mc-subtle)",
                        }}
                      >
                        {categoryLabel}
                      </span>
                      <span className="rounded bg-[var(--mc-subtle)] px-1.5 py-0.5 text-[9px] font-semibold uppercase text-[var(--mc-muted)]">
                        {accountLabel}
                      </span>
                      {transaction.installment_total ? (
                        <span className="rounded bg-[var(--mc-blue)]/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-[var(--mc-blue)]">
                          {transaction.installment_index}/{transaction.installment_total}
                        </span>
                      ) : null}
                      {isRecurring ? (
                        <span className="transaction-recurring-badge">
                          Recorrente
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        valueColor,
                      )}
                    >
                      {sign}
                      {formatCurrency(transaction.amount)}
                    </p>
                    <p className="text-[10px] text-[var(--mc-muted)]">
                      {card
                        ? `Fatura em ${formatDate(transactionEffectiveDate(transaction, accounts))}`
                        : formatDate(transaction.transaction_date)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-[var(--mc-muted)]">
          Nenhuma transação registrada.
        </p>
      )}
    </div>
  );
}

"use client";

import { isToday, isYesterday, parseISO } from "date-fns";
import { CreditCard, Wallet } from "lucide-react";

import { categoryEmoji } from "@/components/CategoryBadge";
import { transactionEffectiveDate } from "@/domain/finance";
import { formatCurrency, formatDate } from "@/domain/normalize";
import type { Account, Category, Transaction } from "@/domain/types";
import { cn } from "@/lib/utils";

interface TransactionsListProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  onSelect: (transaction: Transaction) => void;
}

function groupLabel(value: string) {
  const date = parseISO(value);
  if (isToday(date)) return "Hoje";
  if (isYesterday(date)) return "Ontem";
  return formatDate(value);
}

export function TransactionsList({
  transactions,
  categories,
  accounts,
  onSelect,
}: TransactionsListProps) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-[var(--mc-subtle)] pt-2">
      <h4 className="text-lg font-semibold text-[var(--mc-blue)]">
        Movimentações
      </h4>
      {transactions.map((transaction, index) => {
        const category = categories.find(
          (item) => item.id === transaction.category_id,
        );
        const card = accounts.find(
          (account) =>
            account.id === transaction.account_id &&
            account.type === "credit_card",
        );
        const previousDate = transactions[index - 1]?.transaction_date;
        const showDateLabel = previousDate !== transaction.transaction_date;
        const categoryColor = category?.color ?? "var(--mc-muted)";
        const categoryLabel =
          category?.name ??
          (transaction.type === "income"
            ? "Receita"
            : transaction.type === "transfer"
              ? "Transferência"
              : "Outros");
        const paymentLabel =
          transaction.type === "expense"
            ? transaction.payment_method === "credit_card"
              ? (card?.name ?? "Cartão de crédito")
              : "À vista"
            : transaction.type === "income"
              ? "Entrada"
              : "Transferência";
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

        return (
          <div key={transaction.id}>
            {showDateLabel && (
              <p className="mb-2 mt-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--mc-muted)] first:mt-0">
                {groupLabel(transaction.transaction_date)}
              </p>
            )}
            <button
              type="button"
              onClick={() => onSelect(transaction)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-[var(--mc-subtle)]"
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm"
                style={{
                  backgroundColor: category
                    ? `${category.color}18`
                    : "var(--mc-subtle)",
                }}
              >
                {category ? (
                  <span aria-hidden="true">{categoryEmoji(category)}</span>
                ) : transaction.payment_method === "credit_card" ? (
                  <CreditCard size={15} className="text-[var(--mc-muted)]" />
                ) : (
                  <Wallet size={15} className="text-[var(--mc-muted)]" />
                )}
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
                    {paymentLabel}
                  </span>
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
                <p className="mt-0.5 text-[10px] text-[var(--mc-muted)]">
                  {card
                    ? `Fatura em ${formatDate(transactionEffectiveDate(transaction, accounts))}`
                    : formatDate(transaction.transaction_date)}
                </p>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}

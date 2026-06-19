"use client";

import { CreditCard } from "lucide-react";

import { formatCurrency } from "@/domain/normalize";
import type { Account } from "@/domain/types";
import { cn } from "@/lib/utils";

interface CardInvoice {
  account: Account;
  total: number;
}

interface FaturasDoMesProps {
  invoices: CardInvoice[];
  className?: string;
}

export function FaturasDoMes({ invoices, className }: FaturasDoMesProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--mc-line)] bg-[var(--mc-surface)] p-4 sm:p-5",
        className,
      )}
    >
      <div className="mobile-section-header mb-4 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--mc-ink)]">
          Faturas do mês
        </h3>
        <span className="text-xs text-[var(--mc-muted)]">
          {invoices.length} {invoices.length === 1 ? "cartão" : "cartões"}
        </span>
      </div>

      {invoices.length ? (
        <div className="mobile-compact-list flex flex-col gap-0.5">
          {invoices.map(({ account, total }) => (
            <div
              key={account.id}
              className="mobile-compact-row flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-[var(--mc-subtle)]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--mc-subtle)]">
                <CreditCard size={14} className="text-[var(--mc-muted)]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--mc-ink)]">
                  {account.name}
                </p>
                <p className="text-[10px] text-[var(--mc-muted)]">
                  Vence dia {account.credit_card_due_day ?? "-"}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--mc-ink)]">
                {formatCurrency(total)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-[var(--mc-muted)]">
          Nenhum cartão de crédito cadastrado.
        </p>
      )}
    </div>
  );
}

"use client";

import { formatCurrency } from "@/domain/normalize";
import type { Account } from "@/domain/types";
import { cn } from "@/lib/utils";

interface AccountBalance {
  account: Account;
  balance: number;
}

interface PatrimonioProps {
  netWorth: number;
  available: number;
  reserves: number;
  accounts: AccountBalance[];
  limit?: number;
  className?: string;
}

const compactCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

const accountVisual: Record<Account["type"], { color: string; emoji: string }> =
  {
    checking: { color: "#3b82f6", emoji: "🏦" },
    credit_card: { color: "#ef4444", emoji: "💳" },
    cash: { color: "#eab308", emoji: "👛" },
    reserve: { color: "#22c55e", emoji: "🐷" },
    investment: { color: "#8b5cf6", emoji: "📈" },
    other: { color: "#64748b", emoji: "💰" },
  };

export function Patrimonio({
  netWorth,
  available,
  reserves,
  accounts,
  limit = 5,
  className,
}: PatrimonioProps) {
  const balances = accounts
    .filter(({ account }) => account.type !== "credit_card")
    .sort((a, b) => b.balance - a.balance);
  const maxBalance = Math.max(
    ...balances.map((item) => Math.abs(item.balance)),
    1,
  );
  const items = balances.slice(0, limit);

  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--mc-line)] bg-[var(--mc-surface)] p-4 sm:p-5",
        className,
      )}
    >
      <div className="mobile-section-header mb-4 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--mc-ink)]">
          Patrimônio
        </h3>
        <span className="text-xs font-semibold tabular-nums text-[var(--mc-ink)]">
          {formatCurrency(netWorth)}
        </span>
      </div>

      {items.length ? (
        <div className="mobile-patrimonio-scroll">
          {items.map(({ account, balance }) => {
            const visual = accountVisual[account.type];
            const ringProgress = Math.max(
              (Math.abs(balance) / maxBalance) * 100,
              5,
            );

            return (
              <div
                className="mobile-patrimonio-item"
                key={account.id}
                title={account.name}
              >
                <div
                  className="mobile-patrimonio-ring"
                  role="img"
                  aria-label={`${account.name}: ${formatCurrency(balance)}`}
                  style={
                    {
                      "--account-progress": `${ringProgress}%`,
                      "--account-color":
                        balance < 0 ? "var(--mc-red)" : visual.color,
                    } as React.CSSProperties
                  }
                >
                  <span aria-hidden>{visual.emoji}</span>
                </div>
                <strong className={cn(balance < 0 && "is-negative")}>
                  {compactCurrency.format(balance)}
                </strong>
                <small>{account.name}</small>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mobile-patrimonio-empty">
          Cadastre contas para acompanhar seu patrimônio.
        </p>
      )}

      <div className="desktop-patrimonio-content">
        <div className="mobile-networth-summary mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-[var(--mc-subtle)] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-[var(--mc-muted)]">
              Disponível
            </p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-[var(--mc-ink)]">
              {formatCurrency(available)}
            </p>
          </div>
          <div className="rounded-lg bg-[var(--mc-subtle)] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-[var(--mc-muted)]">
              Reservas
            </p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-[var(--mc-ink)]">
              {formatCurrency(reserves)}
            </p>
          </div>
        </div>

        {items.length ? (
          <div className="mobile-account-list flex flex-col gap-3">
            {items.map(({ account, balance }) => (
              <div
                key={account.id}
                className="mobile-account-row flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium text-[var(--mc-ink)]">
                    {account.name}
                  </span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-[var(--mc-muted)]">
                    {compactCurrency.format(balance)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--mc-subtle)]">
                  <div
                    className="h-full rounded-full bg-[var(--mc-blue)] transition-all"
                    style={{
                      width: `${Math.max((Math.abs(balance) / maxBalance) * 100, 4)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-[var(--mc-muted)]">
            Cadastre contas para acompanhar seu patrimônio.
          </p>
        )}
      </div>
    </div>
  );
}

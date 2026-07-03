"use client";

import { SendHorizonal } from "lucide-react";
import { useMemo, useState } from "react";

import { CategoryBadge } from "@/components/CategoryBadge";
import { formatCurrency } from "@/domain/normalize";
import { parseTransactionInput } from "@/domain/parser";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";

interface LancamentoRapidoProps {
  className?: string;
}

export function LancamentoRapido({ className }: LancamentoRapidoProps) {
  const [value, setValue] = useState("");
  const { addQuickInput, categories, rules, accounts } = useAppStore();
  const preview = useMemo(
    () =>
      value.trim()
        ? parseTransactionInput(value, { categories, rules, accounts })
        : [],
    [accounts, categories, rules, value],
  );

  const submit = async () => {
    if (!value.trim()) return;
    await addQuickInput(value);
    setValue("");
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--mc-line)] bg-[var(--mc-surface)] p-4 sm:p-5",
        className,
      )}
    >
      <div className="mobile-quick-header mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--mc-ink)]">
          Lançamento rápido
        </h3>
        <span className="text-xs text-[var(--mc-muted)]">
          Linguagem natural
        </span>
      </div>

      <div className="mobile-quick-control flex items-end gap-2">
        <div className="relative flex-1">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void submit();
            }}
            placeholder="Adicionar lançamento..."
            rows={2}
            className="mobile-quick-input w-full resize-none rounded-lg border border-[var(--mc-line)] bg-[var(--mc-subtle)] px-3 py-2.5 text-sm text-[var(--mc-ink)] outline-none transition-colors placeholder:text-[var(--mc-muted)] focus:border-[var(--mc-blue)] focus:ring-1 focus:ring-[var(--mc-blue)]/40 sm:px-4 sm:py-3"
          />
        </div>
        <button
          onClick={() => void submit()}
          className="mobile-quick-send mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--mc-blue)] text-white transition-opacity hover:opacity-90"
          aria-label="Enviar lançamento"
        >
          <SendHorizonal size={16} />
        </button>
      </div>

      {preview.length > 0 ? (
        <div className="mobile-quick-preview mt-3 overflow-hidden rounded-lg border border-[var(--mc-line)]">
          {preview.slice(0, 4).map((item) => (
            <div
              key={item.raw}
              className="mobile-quick-preview-row flex flex-col gap-1 border-b border-[var(--mc-line)] px-3 py-2 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
            >
              <span className="truncate text-sm text-[var(--mc-ink)]">
                {item.description}
              </span>
              <span className="flex items-center gap-2 text-xs text-[var(--mc-muted)]">
                <CategoryBadge
                  category={categories.find(
                    (category) => category.id === item.category_id,
                  )}
                  label={
                    item.type === "transfer"
                      ? `Transferência${item.transfer_account_name_hint ? ` para ${item.transfer_account_name_hint}` : ""}`
                      : item.category_name
                  }
                  compact
                />
                <span>{Math.round(item.confidence * 100)}%</span>
                {item.installment_count && item.installment_amount ? (
                  <span>{item.installment_count}x de {formatCurrency(item.installment_amount)}</span>
                ) : null}
                <span
                  className="font-semibold"
                  style={{
                    color:
                      item.type === "income"
                        ? "var(--mc-green)"
                        : item.type === "transfer"
                          ? "var(--mc-blue)"
                          : "var(--mc-red)",
                  }}
                >
                  {item.type === "income"
                    ? "+"
                    : item.type === "transfer"
                      ? ""
                      : "-"}
                  {formatCurrency(item.amount)}
                </span>
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

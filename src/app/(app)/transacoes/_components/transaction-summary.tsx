import { ArrowDownRight, ArrowUpRight, Scale } from "lucide-react";

import { MetricCard } from "@/components/MetricCard";
import { formatCurrency } from "@/domain/normalize";

interface TransactionSummaryProps {
  income: number;
  expense: number;
}

export function TransactionSummary({ income, expense }: TransactionSummaryProps) {
  const balance = income - expense;
  const balancePositive = balance >= 0;

  return (
    <section
      className="tx-summary mobile-metric-strip grid grid-cols-3 gap-3 sm:gap-4"
      aria-label="Resumo do período"
    >
      <MetricCard
        label="Entradas"
        sublabel="No período filtrado"
        value={formatCurrency(income)}
        valueColor="var(--mc-green)"
        accentColor="#22c55e"
        icon={<ArrowUpRight size={16} />}
      />
      <MetricCard
        label="Saídas"
        sublabel="No período filtrado"
        value={formatCurrency(expense)}
        valueColor="var(--mc-red)"
        accentColor="#ef4444"
        icon={<ArrowDownRight size={16} />}
      />
      <MetricCard
        label="Saldo filtrado"
        sublabel="Entradas menos saídas"
        value={formatCurrency(balance)}
        valueColor={balancePositive ? "var(--mc-green)" : "var(--mc-red)"}
        accentColor="#3b82f6"
        icon={<Scale size={16} />}
      />
    </section>
  );
}

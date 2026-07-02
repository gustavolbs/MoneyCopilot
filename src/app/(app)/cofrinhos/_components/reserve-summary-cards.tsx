import { Banknote, CircleDollarSign, PiggyBank } from "lucide-react";
import type { ReactNode } from "react";

import { formatCurrency } from "@/domain/normalize";

interface ReserveSummaryCardsProps {
  reserveTotal: number;
  selectedBalance: number;
  selectedName: string | null;
  reserveCount: number;
  accountCount: number;
}

export function ReserveSummaryCards({
  reserveTotal,
  selectedBalance,
  selectedName,
  reserveCount,
  accountCount,
}: ReserveSummaryCardsProps) {
  return (
    <section className="reserves-summary-grid" aria-label="Resumo de patrimonio">
      <SummaryCard
        icon={<PiggyBank size={18} />}
        label="Total guardado"
        value={formatCurrency(reserveTotal)}
        detail={`${reserveCount} cofrinho(s)`}
        tone="gold"
      />
      <SummaryCard
        icon={<CircleDollarSign size={18} />}
        label="Saldo selecionado"
        value={formatCurrency(selectedBalance)}
        detail={selectedName ?? "Nenhuma fonte selecionada"}
        tone="blue"
      />
      <SummaryCard
        icon={<Banknote size={18} />}
        label="Fontes disponíveis"
        value={String(accountCount)}
        detail="Contas e cofrinhos movimentáveis"
        tone="green"
      />
    </section>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "green" | "gold";
}) {
  return (
    <article className="reserves-summary-card" data-tone={tone}>
      <span className="reserves-summary-icon">{icon}</span>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

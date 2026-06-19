import { formatMonthYear } from "@/domain/normalize";

import { SyncPill } from "../../_components/SyncPill";
import { ThemeToggleButton } from "../../_components/ThemeToggleButton";

export function Header() {
  const now = new Date();

  return (
    <header className="mobile-dashboard-header flex shrink-0 flex-col gap-3 border-b border-[var(--mc-line)] py-4 md:px-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
      <div className="mobile-dashboard-heading">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--mc-muted)]">
          Visão Geral
        </p>
        <h1 className="text-xl font-bold text-[var(--mc-ink)]">Dashboard</h1>
        <p className="text-[11px] text-[var(--mc-muted)]">
          <span className="capitalize">{formatMonthYear(now)}</span> &middot;
          Despesas de cartão pela fatura
        </p>
      </div>
      <div className="mobile-dashboard-actions flex items-center gap-3">
        <SyncPill />
        <ThemeToggleButton />
      </div>
    </header>
  );
}

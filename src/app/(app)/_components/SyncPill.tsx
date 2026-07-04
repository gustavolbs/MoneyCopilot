"use client";

import { Bell, CircleAlert, CloudOff, RefreshCcw } from "lucide-react";

import { useAppStore } from "@/store/appStore";

export function SyncPill() {
  const { syncStatus, pendingMutations, pendingMutationSummary, sync } = useAppStore();
  const offline = syncStatus === "offline";
  const syncing = syncStatus === "syncing";
  const failed = syncStatus === "error";
  const Icon = offline
    ? CloudOff
    : failed
      ? CircleAlert
      : syncing
        ? RefreshCcw
        : Bell;
  const label = offline
    ? "Offline"
    : failed
      ? "Erro ao sincronizar"
      : syncing
        ? "Sincronizando..."
        : `${pendingMutations} pendente(s)`;
  const details = pendingMutationSummary.length
    ? pendingMutationSummary.map((item) => `${item.label}: ${item.count}`).join(" · ")
    : pendingMutations
      ? `${pendingMutations} alteração(ões) aguardando envio`
      : "Tudo sincronizado";
  const accessibleLabel = `${label}. ${details}`;

  return (
    <button
      type="button"
      onClick={() => void sync()}
      disabled={syncing}
      aria-live="polite"
      aria-label={accessibleLabel}
      title={accessibleLabel}
      className="sync-pill flex items-center gap-2 rounded-lg border border-[var(--mc-line)] bg-[var(--mc-surface)] px-3 py-2 text-[var(--mc-muted)] transition-colors hover:bg-[var(--mc-subtle)] disabled:opacity-70"
    >
      <Icon size={14} className={syncing ? "animate-spin" : undefined} />
      <span className="text-[10px]">{label}</span>
      {pendingMutationSummary[0] ? (
        <span className="hidden max-w-28 truncate text-[10px] text-[var(--mc-muted)]/70 xl:inline">
          {pendingMutationSummary[0].label}
        </span>
      ) : null}
    </button>
  );
}

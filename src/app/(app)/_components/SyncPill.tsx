"use client";

import { Bell, CircleAlert, CloudOff, RefreshCcw } from "lucide-react";

import { useAppStore } from "@/store/appStore";

export function SyncPill() {
  const { syncStatus, pendingMutations, sync } = useAppStore();
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

  return (
    <button
      type="button"
      onClick={() => void sync()}
      disabled={syncing}
      aria-live="polite"
      className="sync-pill flex items-center gap-2 rounded-lg border border-[var(--mc-line)] bg-[var(--mc-surface)] px-3 py-2 text-[var(--mc-muted)] transition-colors hover:bg-[var(--mc-subtle)] disabled:opacity-70"
    >
      <Icon size={14} className={syncing ? "animate-spin" : undefined} />
      <span className="text-[10px]">{label}</span>
    </button>
  );
}

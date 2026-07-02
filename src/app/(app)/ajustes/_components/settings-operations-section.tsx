"use client";

import {
  Cloud,
  Database,
  LogOut,
  Repeat2,
  ShieldAlert,
  Tags,
  WandSparkles,
} from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui";
import { Button as ShadcnButton } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatDateTime } from "@/domain/normalize";
import { isSupabaseConfigured } from "@/lib/env";
import { useTheme } from "@/lib/theme";

import { SettingsConfirmAction } from "./settings-confirm-action";

type SyncStatus = "idle" | "offline" | "syncing" | "error";

type SettingsOperationsSectionProps = {
  categoryCount: number;
  onResetCache: () => void | Promise<void>;
  onSignOut: () => void | Promise<void>;
  onSync: () => void;
  recurrenceCount: number;
  ruleCount: number;
  syncFeedback: { tone: "success" | "warning" | "error"; message: string } | null;
  syncLatestLog: { created_at: string; message: string } | undefined;
  syncLogCount: number;
  syncStatus: SyncStatus;
};

export function SettingsOperationsSection({
  categoryCount,
  onResetCache,
  onSignOut,
  onSync,
  recurrenceCount,
  ruleCount,
  syncFeedback,
  syncLatestLog,
  syncLogCount,
  syncStatus,
}: SettingsOperationsSectionProps) {
  const { colors } = useTheme();

  return (
    <section className="settings-operations-grid" aria-label="Operações do app">
      <article className="settings-operation-card settings-operation-card-wide">
        <SettingsOperationHeader
          color={colors.gold}
          detail="Classificação e previsões"
          icon={<WandSparkles size={18} />}
          title="Automações"
        />
        <div className="settings-automation-panel">
          <div className="settings-automation-copy">
            <strong>{categoryCount + ruleCount + recurrenceCount} itens ativos</strong>
            <small>
              Categorias, regras aprendidas e recorrências mantêm os lançamentos
              organizados automaticamente.
            </small>
          </div>
          <div className="settings-automation-grid">
            <AutomationItem
              color={colors.blue}
              detail="disponíveis"
              icon={<Tags size={17} />}
              title="Categorias"
              value={categoryCount}
            />
            <AutomationItem
              color={colors.gold}
              detail="aprendidas"
              icon={<WandSparkles size={17} />}
              title="Regras"
              value={ruleCount}
            />
            <AutomationItem
              color={colors.green}
              detail="ativas"
              icon={<Repeat2 size={17} />}
              title="Recorrências"
              value={recurrenceCount}
            />
          </div>
        </div>
      </article>

      <article className="settings-operation-card">
        <SettingsOperationHeader
          action="Sincronizar"
          actionLoading={syncStatus === "syncing"}
          color={isSupabaseConfigured() ? colors.green : colors.gold}
          detail={
            syncStatus === "syncing"
              ? "Sincronizando dados..."
              : isSupabaseConfigured()
                ? "Nuvem configurada"
                : "Somente neste dispositivo"
          }
          icon={<Cloud size={18} />}
          onAction={onSync}
          title="Dados e sincronização"
        />
        <div className="settings-sync-panel" role="status" aria-live="polite">
          <span
            className="settings-status-pill"
            style={{
              backgroundColor: `${getSyncColor(syncStatus, colors)}18`,
              color: getSyncColor(syncStatus, colors),
            }}
          >
            {getSyncLabel(syncStatus)}
          </span>
          <strong>{isSupabaseConfigured() ? "Nuvem ativa" : "Modo local"}</strong>
          <small
            style={{
              color:
                syncFeedback?.tone === "error"
                  ? colors.red
                  : syncFeedback?.tone === "warning"
                    ? colors.gold
                    : syncFeedback?.tone === "success"
                      ? colors.green
                      : colors.muted,
            }}
          >
            {syncFeedback?.message ??
              (syncLatestLog
                ? `${formatDateTime(syncLatestLog.created_at)} · ${syncLatestLog.message}`
                : "Nenhuma sincronização registrada.")}
          </small>
          <div className="settings-sync-count">
            <Cloud size={14} />
            <span>{syncLogCount} evento(s) de sincronização</span>
          </div>
        </div>
      </article>

      <article className="settings-operation-card settings-maintenance-card">
        <SettingsOperationHeader
          color={colors.red}
          detail="Dados locais e acesso"
          icon={<Database size={18} />}
          title="Manutenção"
        />
        <div className="settings-maintenance-panel">
          <div className="settings-maintenance-warning">
            <span style={{ backgroundColor: `${colors.red}16`, color: colors.red }}>
              <ShieldAlert size={16} />
            </span>
            <div>
              <strong>Ações sensíveis</strong>
              <small>
                Limpar cache remove dados locais deste dispositivo. Sair encerra a
                sessão atual.
              </small>
            </div>
          </div>
          <div className="settings-maintenance-actions">
            <SettingsConfirmAction
              title="Limpar dados locais?"
              description="O cache deste dispositivo será apagado. Dados já sincronizados poderão ser recuperados da nuvem."
              onConfirm={onResetCache}
              trigger={
                <Button onPress={() => undefined} variant="danger">
                  <Database size={15} /> Limpar cache
                </Button>
              }
            />
            <Button onPress={() => void onSignOut()} variant="ghost">
              <LogOut size={15} /> Sair
            </Button>
          </div>
        </div>
      </article>
    </section>
  );
}

function SettingsOperationHeader({
  action,
  actionLoading = false,
  color,
  detail,
  icon,
  onAction,
  title,
}: {
  action?: string;
  actionLoading?: boolean;
  color: string;
  detail: string;
  icon: ReactNode;
  onAction?: () => void;
  title: string;
}) {
  return (
    <div className="settings-section-heading">
      <span style={{ backgroundColor: `${color}18`, color }}>{icon}</span>
      <div>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
      {action && onAction ? (
        <ShadcnButton
          type="button"
          variant="ghost"
          className="settings-card-action"
          onClick={onAction}
          disabled={actionLoading}
          style={{ backgroundColor: `${color}12`, color }}
        >
          {actionLoading ? <Spinner /> : action}
        </ShadcnButton>
      ) : null}
    </div>
  );
}

function AutomationItem({
  color,
  detail,
  icon,
  title,
  value,
}: {
  color: string;
  detail: string;
  icon: ReactNode;
  title: string;
  value: number;
}) {
  return (
    <div className="settings-automation-item">
      <span style={{ backgroundColor: `${color}18`, color }}>{icon}</span>
      <div>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
      <b style={{ color }}>{value}</b>
    </div>
  );
}

function getSyncLabel(syncStatus: SyncStatus) {
  if (syncStatus === "syncing") return "Sincronizando";
  if (syncStatus === "error") return "Erro";
  if (syncStatus === "offline") return "Offline";
  return isSupabaseConfigured() ? "Nuvem ativa" : "Modo local";
}

function getSyncColor(syncStatus: SyncStatus, colors: ReturnType<typeof useTheme>["colors"]) {
  if (syncStatus === "error") return colors.red;
  if (syncStatus === "offline") return colors.gold;
  return colors.green;
}

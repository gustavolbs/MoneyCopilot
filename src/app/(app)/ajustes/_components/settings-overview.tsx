import {
  Building2,
  Cloud,
  CreditCard,
  PiggyBank,
  UserPlus,
  Users,
  WalletCards,
  WandSparkles,
} from "lucide-react";
import type { ReactNode } from "react";

import { Button as ShadcnButton } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { isSupabaseConfigured } from "@/lib/env";
import { useTheme } from "@/lib/theme";

type FamilyMemberPreview = {
  isYou: boolean;
  name: string;
  user_id: string;
};

type SettingsOverviewProps = {
  accountCount: number;
  automationCount: number;
  cardCount: number;
  familyInviteCount: number;
  familyMembers: FamilyMemberPreview[];
  householdName: string | undefined;
  isOwner: boolean;
  onManageAccounts: () => void;
  onManageFamily: () => void;
  reserveCount: number;
  syncLogCount: number;
};

export function SettingsOverview({
  accountCount,
  automationCount,
  cardCount,
  familyInviteCount,
  familyMembers,
  householdName,
  isOwner,
  onManageAccounts,
  onManageFamily,
  reserveCount,
  syncLogCount,
}: SettingsOverviewProps) {
  const { colors } = useTheme();

  return (
    <>
      <section className="settings-overview-grid" aria-label="Resumo dos ajustes">
        <SettingsStat
          color={colors.blue}
          icon={<Users size={17} />}
          label="membros"
          value={familyMembers.length}
        />
        <SettingsStat
          color={colors.green}
          icon={<WalletCards size={17} />}
          label="contas"
          value={accountCount}
        />
        <SettingsStat
          color={colors.gold}
          icon={<WandSparkles size={17} />}
          label="automações"
          value={automationCount}
        />
        <SettingsStat
          color={isSupabaseConfigured() ? colors.green : colors.gold}
          icon={<Cloud size={17} />}
          label="eventos de sync"
          value={syncLogCount}
        />
      </section>

      <section className="settings-top-grid" aria-label="Atalhos de ajustes">
        <article className="settings-overview-card">
          <SettingsCardHeader
            action="Gerenciar"
            color={colors.blue}
            detail={householdName ?? "Dados compartilhados"}
            icon={<Users size={18} />}
            onAction={onManageFamily}
            title="Família"
          />
          <div className="settings-family-preview">
            <div
              className="settings-avatar-stack"
              aria-label={`${familyMembers.length} membros`}
            >
              {familyMembers.slice(0, 4).map((member, index) => (
                <span
                  key={member.user_id}
                  style={{
                    backgroundColor: member.isYou ? colors.blue : colors.subtle,
                    color: member.isYou ? "#00111F" : colors.ink,
                    zIndex: 4 - index,
                  }}
                >
                  {member.name.trim().charAt(0).toUpperCase() || "?"}
                </span>
              ))}
              {!familyMembers.length ? (
                <span style={{ backgroundColor: colors.subtle, color: colors.muted }}>
                  <Users size={15} />
                </span>
              ) : null}
            </div>
            <div className="settings-preview-copy">
              <strong>{familyMembers.length} membro(s)</strong>
              <small style={{ color: colors.muted }}>
                {familyInviteCount
                  ? `${familyInviteCount} convite(s) pendente(s)`
                  : "Nenhum convite pendente"}
              </small>
            </div>
            {isOwner && isSupabaseConfigured() ? (
              <ShadcnButton
                type="button"
                variant="ghost"
                size="icon"
                className="settings-icon-action"
                onClick={onManageFamily}
                style={{ color: colors.blue, backgroundColor: colors.subtle }}
                aria-label="Convidar membro"
              >
                <UserPlus size={17} />
              </ShadcnButton>
            ) : null}
          </div>
        </article>

        <article className="settings-overview-card">
          <SettingsCardHeader
            action="Gerenciar"
            color={colors.green}
            detail="Contas, cartões e reservas"
            icon={<WalletCards size={18} />}
            onAction={onManageAccounts}
            title="Patrimônio e pagamentos"
          />
          <div className="settings-mini-metrics">
            <MiniMetric icon={<Building2 size={16} />} label="Contas" value={accountCount} />
            <MiniMetric icon={<CreditCard size={16} />} label="Cartões" value={cardCount} />
            <MiniMetric icon={<PiggyBank size={16} />} label="Reservas" value={reserveCount} />
          </div>
        </article>

      </section>
    </>
  );
}

function SettingsStat({
  color,
  icon,
  label,
  value,
}: {
  color: string;
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="settings-stat" style={{ borderColor: `${color}35` }}>
      <span style={{ backgroundColor: `${color}18`, color }}>{icon}</span>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}

function SettingsCardHeader({
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

function MiniMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div>
      <span>{icon}</span>
      <p>
        <strong>{value}</strong>
        <small>{label}</small>
      </p>
    </div>
  );
}

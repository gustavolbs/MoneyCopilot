"use client";

import { Mail, Shield, UserMinus, UserPlus, Users } from "lucide-react";

import { Button, Field, Label } from "@/components/ui";
import { Button as ShadcnButton } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/env";
import { useTheme } from "@/lib/theme";

import { SettingsConfirmAction } from "./settings-confirm-action";
import { SettingsManagerModal } from "./settings-manager-modal";

type FamilyMember = {
  isYou: boolean;
  name: string;
  role: string;
  user_id: string;
};

type FamilyInvite = {
  email: string;
  id: string;
};

type FamilySettingsModalProps = {
  familyError: string | null;
  familyInvites: FamilyInvite[];
  familyMembers: FamilyMember[];
  householdName: string | undefined;
  inviteEmail: string;
  isOwner: boolean;
  onClose: () => void;
  onInvite: () => void;
  onInviteEmailChange: (email: string) => void;
  onRemoveMember: (userId: string) => void | Promise<void>;
};

export function FamilySettingsModal({
  familyError,
  familyInvites,
  familyMembers,
  householdName,
  inviteEmail,
  isOwner,
  onClose,
  onInvite,
  onInviteEmailChange,
  onRemoveMember,
}: FamilySettingsModalProps) {
  const { colors } = useTheme();

  return (
    <SettingsManagerModal
      className="settings-family-manager-modal"
      title="Gerenciar família"
      subtitle={`${familyMembers.length} membro(s) · ${familyInvites.length} convite(s)`}
      onClose={onClose}
    >
      <div className="settings-family-sidebar">
        <section className="settings-family-hero">
          <span className="settings-family-hero-icon">
            <Users size={20} />
          </span>
          <div>
            <small>Ambiente compartilhado</small>
            <strong>{householdName ?? "Família"}</strong>
            <p>
              Membros dessa família enxergam os mesmos dados financeiros e
              colaboram na organização das contas.
            </p>
          </div>
        </section>

        <div className="settings-family-summary-strip" aria-label="Resumo da família">
          <div>
            <strong>{familyMembers.length}</strong>
            <small>Membros</small>
          </div>
          <div>
            <strong>{familyInvites.length}</strong>
            <small>Convites</small>
          </div>
        </div>

        <section className="settings-manager-form settings-family-invite-card">
          {!isSupabaseConfigured() ? (
            <p style={{ color: colors.muted }}>
              Configure o Supabase para convidar membros.
            </p>
          ) : isOwner ? (
            <>
              <div className="settings-invite-heading">
                <span style={{ backgroundColor: `${colors.blue}16`, color: colors.blue }}>
                  <UserPlus size={15} />
                </span>
                <div>
                  <Label>Convidar por e-mail</Label>
                  <small style={{ color: colors.muted }}>
                    A pessoa entra na família usando este endereço.
                  </small>
                </div>
              </div>
              <div className="settings-invite-row">
                <Field
                  value={inviteEmail}
                  onChangeText={onInviteEmailChange}
                  placeholder="email@exemplo.com"
                  keyboardType="email-address"
                />
                <Button onPress={onInvite} variant="ghost">
                  Convidar
                </Button>
              </div>
              {familyError ? (
                <p className="settings-form-error" style={{ color: colors.red }}>
                  {familyError}
                </p>
              ) : null}
            </>
          ) : (
            <p style={{ color: colors.muted }}>
              Apenas o responsável pode convidar novos membros.
            </p>
          )}
        </section>
      </div>

      <section className="settings-family-grid" aria-label="Membros da família">
        {familyMembers.map((member) => (
          <article className="settings-family-member-card" key={member.user_id}>
            <div className="settings-family-member-main">
              <span
                className="settings-family-member-avatar"
                style={{
                  backgroundColor: member.isYou ? colors.blue : colors.subtle,
                  color: member.isYou ? "#00111F" : colors.ink,
                }}
              >
                {member.name.trim().charAt(0).toUpperCase() || "?"}
              </span>
              <div className="settings-family-member-copy">
                <strong>{member.isYou ? `${member.name} (você)` : member.name}</strong>
                <small>
                  {member.role === "owner" ? "Responsável" : "Membro da família"}
                </small>
              </div>
            </div>
            <div className="settings-family-member-meta">
              <span
                className="settings-family-role-pill"
                style={{
                  backgroundColor:
                    member.role === "owner" ? `${colors.gold}18` : colors.subtle,
                  color: member.role === "owner" ? colors.gold : colors.muted,
                }}
              >
                <Shield size={12} />
                {member.role === "owner" ? "Owner" : "Membro"}
              </span>
              {isOwner && !member.isYou ? (
                <SettingsConfirmAction
                  title={`Remover ${member.name}?`}
                  description="A pessoa perderá o acesso aos dados compartilhados desta família."
                  onConfirm={() => onRemoveMember(member.user_id)}
                  trigger={
                    <ShadcnButton
                      type="button"
                      variant="ghost"
                      className="settings-row-danger settings-family-remove"
                      style={{
                        backgroundColor: `${colors.red}12`,
                        color: colors.red,
                      }}
                    >
                      <UserMinus size={14} /> Remover
                    </ShadcnButton>
                  }
                />
              ) : null}
            </div>
          </article>
        ))}

        {familyInvites.map((invite) => (
          <article className="settings-family-member-card is-pending" key={invite.id}>
            <div className="settings-family-member-main">
              <span
                className="settings-family-member-avatar"
                style={{ backgroundColor: `${colors.gold}18`, color: colors.gold }}
              >
                <Mail size={15} />
              </span>
              <div className="settings-family-member-copy">
                <strong>{invite.email}</strong>
                <small>Convite pendente</small>
              </div>
            </div>
            <div className="settings-family-member-meta">
              <span
                className="settings-family-role-pill"
                style={{ backgroundColor: `${colors.gold}18`, color: colors.gold }}
              >
                Aguardando
              </span>
            </div>
          </article>
        ))}
      </section>
    </SettingsManagerModal>
  );
}

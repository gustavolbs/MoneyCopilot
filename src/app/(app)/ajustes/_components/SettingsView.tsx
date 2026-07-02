"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Screen } from "@/components/ui";
import { Account } from "@/domain/types";
import { isSupabaseConfigured } from "@/lib/env";
import { useAppStore } from "@/store/appStore";

import { FamilySettingsModal } from "./family-settings-modal";
import { PaymentSettingsModal } from "./payment-settings-modal";
import { SettingsHeader } from "./settings-header";
import { SettingsOperationsSection } from "./settings-operations-section";
import { SettingsOverview } from "./settings-overview";

type Manager = "family" | "accounts" | null;

export function SettingsView() {
  const router = useRouter();
  const {
    household,
    accounts,
    categories,
    rules,
    recurrences,
    syncStatus,
    syncLogs,
    resetCache,
    signOut,
    sync,
    addAccount,
    editAccount,
    deleteAccount,
    familyMembers,
    familyInvites,
    loadFamily,
    inviteMember,
    removeMember,
  } = useAppStore();
  const [manager, setManager] = useState<Manager>(null);
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState<Account["type"]>("reserve");
  const [cardDueDay, setCardDueDay] = useState("10");
  const [cardBestPurchaseDay, setCardBestPurchaseDay] = useState("3");
  const [inviteEmail, setInviteEmail] = useState("");
  const [familyError, setFamilyError] = useState<string | null>(null);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(
    null,
  );
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{
    tone: "success" | "warning" | "error";
    message: string;
  } | null>(null);
  const isOwner = familyMembers.some(
    (member) => member.isYou && member.role === "owner",
  );
  const cardCount = accounts.filter(
    (account) => account.type === "credit_card",
  ).length;
  const reserveCount = accounts.filter(
    (account) => account.type === "reserve",
  ).length;
  const automationCount = rules.length + recurrences.length;

  useEffect(() => {
    if (isSupabaseConfigured() && household) void loadFamily();
  }, [household, loadFamily]);

  const handleInvite = async () => {
    setFamilyError(null);
    try {
      await inviteMember(inviteEmail);
      setInviteEmail("");
    } catch (error) {
      setFamilyError(
        error instanceof Error ? error.message : "Não foi possível convidar.",
      );
    }
  };

  const handleSync = async () => {
    if (syncStatus === "syncing") return;
    setSyncFeedback(null);
    const result = await sync();
    setSyncFeedback(
      result === "idle"
        ? { tone: "success", message: "Sincronização concluída." }
        : result === "offline"
          ? {
              tone: "warning",
              message: "Sem conexão. A sincronização ficou pendente.",
            }
          : { tone: "error", message: "Não foi possível sincronizar agora." },
    );
  };

  const handleDeleteAccount = async (account: Account) => {
    setDeletingAccountId(account.id);
    try {
      await deleteAccount(account);
      if (editingAccountId === account.id) setEditingAccountId(null);
    } finally {
      setDeletingAccountId(null);
    }
  };

  const accountTypes: Array<{ label: string; value: Account["type"] }> = [
    { label: "Conta corrente", value: "checking" },
    { label: "Cartão de crédito", value: "credit_card" },
    { label: "Dinheiro", value: "cash" },
    { label: "Cofrinho/Reserva", value: "reserve" },
    { label: "Investimento", value: "investment" },
    { label: "Outros", value: "other" },
  ];

  return (
    <Screen>
      <SettingsHeader />

      <SettingsOverview
        accountCount={accounts.length}
        automationCount={automationCount}
        cardCount={cardCount}
        familyInviteCount={familyInvites.length}
        familyMembers={familyMembers}
        householdName={household?.name}
        isOwner={isOwner}
        onManageAccounts={() => setManager("accounts")}
        onManageFamily={() => setManager("family")}
        reserveCount={reserveCount}
        syncLogCount={syncLogs.length}
      />

      <SettingsOperationsSection
        categoryCount={categories.length}
        onResetCache={resetCache}
        onSignOut={() => void signOut().then(() => router.replace("/entrar"))}
        onSync={() => void handleSync()}
        recurrenceCount={recurrences.length}
        ruleCount={rules.length}
        syncFeedback={syncFeedback}
        syncLatestLog={syncLogs[0]}
        syncLogCount={syncLogs.length}
        syncStatus={syncStatus}
      />

      {manager === "family" ? (
        <FamilySettingsModal
          familyError={familyError}
          familyInvites={familyInvites}
          familyMembers={familyMembers}
          householdName={household?.name}
          inviteEmail={inviteEmail}
          isOwner={isOwner}
          onClose={() => setManager(null)}
          onInvite={() => void handleInvite()}
          onInviteEmailChange={setInviteEmail}
          onRemoveMember={removeMember}
        />
      ) : null}

      {manager === "accounts" ? (
        <PaymentSettingsModal
          accountName={accountName}
          accountType={accountType}
          accountTypes={accountTypes}
          accounts={accounts}
          cardBestPurchaseDay={cardBestPurchaseDay}
          cardCount={cardCount}
          cardDueDay={cardDueDay}
          deletingAccountId={deletingAccountId}
          editingAccountId={editingAccountId}
          onAddAccount={addAccount}
          onClose={() => setManager(null)}
          onDeleteAccount={handleDeleteAccount}
          onEditAccount={editAccount}
          onSetAccountName={setAccountName}
          onSetAccountType={setAccountType}
          onSetCardBestPurchaseDay={setCardBestPurchaseDay}
          onSetCardDueDay={setCardDueDay}
          onSetEditingAccountId={setEditingAccountId}
          onSetShowAccountForm={setShowAccountForm}
          reserveCount={reserveCount}
          showAccountForm={showAccountForm}
        />
      ) : null}
    </Screen>
  );
}

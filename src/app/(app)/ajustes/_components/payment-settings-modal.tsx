"use client";

import {
  Building2,
  CreditCard,
  Pencil,
  PiggyBank,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, Field, Label } from "@/components/ui";
import { Button as ShadcnButton } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Account } from "@/domain/types";
import { useTheme } from "@/lib/theme";

import { SettingsConfirmAction } from "./settings-confirm-action";
import { SettingsManagerModal } from "./settings-manager-modal";

type AccountTypeOption = {
  label: string;
  value: Account["type"];
};

type PaymentSettingsModalProps = {
  accountName: string;
  accountType: Account["type"];
  accountTypes: AccountTypeOption[];
  accounts: Account[];
  cardBestPurchaseDay: string;
  cardCount: number;
  cardDueDay: string;
  deletingAccountId: string | null;
  editingAccountId: string | null;
  onAddAccount: (
    name: string,
    type: Account["type"],
    cardSettings?: { dueDay: number; bestPurchaseDay: number },
  ) => Promise<void>;
  onClose: () => void;
  onDeleteAccount: (account: Account) => Promise<void>;
  onEditAccount: (
    account: Account,
    patch: Partial<
      Pick<
        Account,
        | "name"
        | "type"
        | "initial_balance"
        | "credit_card_due_day"
        | "credit_card_best_purchase_day"
      >
    >,
  ) => Promise<void>;
  onSetAccountName: (value: string) => void;
  onSetAccountType: (value: Account["type"]) => void;
  onSetCardBestPurchaseDay: (value: string) => void;
  onSetCardDueDay: (value: string) => void;
  onSetEditingAccountId: (value: string | null) => void;
  onSetShowAccountForm: (value: boolean | ((visible: boolean) => boolean)) => void;
  reserveCount: number;
  showAccountForm: boolean;
};

export function PaymentSettingsModal({
  accountName,
  accountType,
  accountTypes,
  accounts,
  cardBestPurchaseDay,
  cardCount,
  cardDueDay,
  deletingAccountId,
  editingAccountId,
  onAddAccount,
  onClose,
  onDeleteAccount,
  onEditAccount,
  onSetAccountName,
  onSetAccountType,
  onSetCardBestPurchaseDay,
  onSetCardDueDay,
  onSetEditingAccountId,
  onSetShowAccountForm,
  reserveCount,
  showAccountForm,
}: PaymentSettingsModalProps) {
  const { colors } = useTheme();
  const liquidAccountCount = accounts.filter((account) =>
    ["checking", "cash", "investment", "other"].includes(account.type),
  ).length;

  return (
    <SettingsManagerModal
      title="Patrimônio e pagamentos"
      subtitle={`${accounts.length} conta(s) · ${cardCount} cartão(ões)`}
      onClose={onClose}
    >
      <section className="settings-payment-summary">
        <PaymentSummaryCard
          color={colors.blue}
          icon={<Building2 size={17} />}
          label="Contas"
          value={liquidAccountCount}
        />
        <PaymentSummaryCard
          color={colors.green}
          icon={<PiggyBank size={17} />}
          label="Reservas"
          value={reserveCount}
        />
        <PaymentSummaryCard
          color={colors.gold}
          icon={<CreditCard size={17} />}
          label="Cartões"
          value={cardCount}
        />
      </section>

      <div className="settings-manager-toolbar settings-payment-toolbar">
        <span style={{ color: colors.muted }}>
          Edite saldos, tipos e vencimentos sem alterar os lançamentos já
          registrados.
        </span>
        <ShadcnButton
          type="button"
          variant="ghost"
          className="settings-add-button"
          onClick={() => onSetShowAccountForm((visible) => !visible)}
          style={{ backgroundColor: `${colors.blue}12`, color: colors.blue }}
        >
          <Plus size={15} /> Nova conta
        </ShadcnButton>
      </div>

      {showAccountForm ? (
        <CreateAccountForm
          accountName={accountName}
          accountType={accountType}
          accountTypes={accountTypes}
          cardBestPurchaseDay={cardBestPurchaseDay}
          cardDueDay={cardDueDay}
          onAddAccount={onAddAccount}
          onSetAccountName={onSetAccountName}
          onSetAccountType={onSetAccountType}
          onSetCardBestPurchaseDay={onSetCardBestPurchaseDay}
          onSetCardDueDay={onSetCardDueDay}
          onSetShowAccountForm={onSetShowAccountForm}
        />
      ) : null}

      <section className="settings-account-list" aria-label="Contas cadastradas">
        {accounts.map((account) => (
          <article className="settings-account-card" key={account.id}>
            <div className="settings-account-card-main">
              <span
                className="settings-account-icon"
                style={{
                  backgroundColor: `${getAccountTone(account.type, colors)}18`,
                  color: getAccountTone(account.type, colors),
                }}
              >
                {getAccountIcon(account.type)}
              </span>
              <div>
                <strong>{account.name}</strong>
                <small>{formatAccountSubtitle(account)}</small>
              </div>
            </div>
            <div className="settings-account-actions">
              <ShadcnButton
                type="button"
                variant="ghost"
                className="account-edit-button"
                onClick={() =>
                  onSetEditingAccountId(
                    editingAccountId === account.id ? null : account.id,
                  )
                }
                style={{
                  backgroundColor: `${colors.blue}12`,
                  color: colors.blue,
                }}
              >
                <Pencil size={14} /> Editar
              </ShadcnButton>
              <SettingsConfirmAction
                title={`Excluir a conta “${account.name}”?`}
                description="As transações já registradas serão preservadas."
                onConfirm={() => onDeleteAccount(account)}
                trigger={
                  <ShadcnButton
                    type="button"
                    variant="ghost"
                    className="account-delete-button"
                    disabled={deletingAccountId === account.id}
                    style={{
                      backgroundColor: `${colors.red}12`,
                      color: colors.red,
                    }}
                    aria-label={`Excluir conta ${account.name}`}
                  >
                    {deletingAccountId === account.id ? (
                      <Spinner />
                    ) : (
                      <Trash2 size={14} />
                    )}{" "}
                    Excluir
                  </ShadcnButton>
                }
              />
            </div>
            {editingAccountId === account.id ? (
              <AccountEditor
                account={account}
                accountTypes={accountTypes}
                onCancel={() => onSetEditingAccountId(null)}
                onSave={async (patch) => {
                  await onEditAccount(account, patch);
                  onSetEditingAccountId(null);
                }}
              />
            ) : null}
          </article>
        ))}
      </section>
    </SettingsManagerModal>
  );
}

function CreateAccountForm({
  accountName,
  accountType,
  accountTypes,
  cardBestPurchaseDay,
  cardDueDay,
  onAddAccount,
  onSetAccountName,
  onSetAccountType,
  onSetCardBestPurchaseDay,
  onSetCardDueDay,
  onSetShowAccountForm,
}: {
  accountName: string;
  accountType: Account["type"];
  accountTypes: AccountTypeOption[];
  cardBestPurchaseDay: string;
  cardDueDay: string;
  onAddAccount: (
    name: string,
    type: Account["type"],
    cardSettings?: { dueDay: number; bestPurchaseDay: number },
  ) => Promise<void>;
  onSetAccountName: (value: string) => void;
  onSetAccountType: (value: Account["type"]) => void;
  onSetCardBestPurchaseDay: (value: string) => void;
  onSetCardDueDay: (value: string) => void;
  onSetShowAccountForm: (value: boolean | ((visible: boolean) => boolean)) => void;
}) {
  const { colors } = useTheme();

  return (
    <section className="settings-create-account">
      <div className="settings-create-title">
        <span style={{ backgroundColor: `${colors.blue}16`, color: colors.blue }}>
          <Plus size={16} />
        </span>
        <div>
          <strong>Adicionar conta</strong>
          <small>Conta corrente, carteira, cartão ou reserva.</small>
        </div>
      </div>
      <div className="settings-account-form-grid">
        <Field
          value={accountName}
          onChangeText={onSetAccountName}
          placeholder="Ex: Carteira"
        />
        <ToggleGroup
          value={[accountType]}
          onValueChange={(values) => {
            const nextType = values[0] as Account["type"] | undefined;
            if (nextType) onSetAccountType(nextType);
          }}
          className="chip-grid"
          aria-label="Tipo da conta"
        >
          {accountTypes.map((item) => (
            <ToggleGroupItem
              variant="outline"
              key={item.value}
              value={item.value}
              className="chip"
              style={{
                backgroundColor: accountType === item.value ? colors.ink : colors.surface,
                borderColor: colors.line,
                color: accountType === item.value ? colors.bg : colors.ink,
              }}
            >
              {item.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      {accountType === "credit_card" ? (
        <div className="card-date-grid">
          <div>
            <Label>Dia de vencimento</Label>
            <Field
              value={cardDueDay}
              onChangeText={onSetCardDueDay}
              placeholder="10"
              keyboardType="numeric"
            />
          </div>
          <div>
            <Label>Melhor dia de compra</Label>
            <Field
              value={cardBestPurchaseDay}
              onChangeText={onSetCardBestPurchaseDay}
              placeholder="3"
              keyboardType="numeric"
            />
          </div>
        </div>
      ) : null}
      <Button
        onPress={() => {
          const dueDay = clampDay(cardDueDay, 10);
          const bestPurchaseDay = clampDay(cardBestPurchaseDay, 3);
          void onAddAccount(
            accountName,
            accountType,
            accountType === "credit_card" ? { dueDay, bestPurchaseDay } : undefined,
          ).then(() => {
            onSetAccountName("");
            onSetShowAccountForm(false);
          });
        }}
      >
        Adicionar conta
      </Button>
    </section>
  );
}

function AccountEditor({
  account,
  accountTypes,
  onSave,
  onCancel,
}: {
  account: Account;
  accountTypes: AccountTypeOption[];
  onSave: (
    patch: Partial<
      Pick<
        Account,
        | "name"
        | "type"
        | "initial_balance"
        | "credit_card_due_day"
        | "credit_card_best_purchase_day"
      >
    >,
  ) => Promise<void>;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  const [name, setName] = useState(account.name);
  const [type, setType] = useState(account.type);
  const [initialBalance, setInitialBalance] = useState(
    String(account.initial_balance).replace(".", ","),
  );
  const [dueDay, setDueDay] = useState(String(account.credit_card_due_day ?? 10));
  const [bestPurchaseDay, setBestPurchaseDay] = useState(
    String(account.credit_card_best_purchase_day ?? 3),
  );
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setName(account.name);
    setType(account.type);
    setInitialBalance(String(account.initial_balance).replace(".", ","));
    setDueDay(String(account.credit_card_due_day ?? 10));
    setBestPurchaseDay(String(account.credit_card_best_purchase_day ?? 3));
  }, [account]);

  const save = () => {
    const balance = Number(initialBalance.replace(/\./g, "").replace(",", "."));
    if (!name.trim() || !Number.isFinite(balance)) {
      setFormError("Informe nome e saldo inicial válidos.");
      return;
    }
    setFormError(null);
    void onSave({
      credit_card_best_purchase_day:
        type === "credit_card" ? clampDay(bestPurchaseDay, 3) : null,
      credit_card_due_day: type === "credit_card" ? clampDay(dueDay, 10) : null,
      initial_balance: balance,
      name: name.trim(),
      type,
    });
  };

  return (
    <div className="account-editor">
      <div className="account-editor-fields">
        <div>
          <Label>Nome</Label>
          <Field value={name} onChangeText={setName} placeholder="Nome da conta" />
        </div>
        <div>
          <Label>Saldo inicial</Label>
          <Field
            value={initialBalance}
            onChangeText={setInitialBalance}
            placeholder="0,00"
            keyboardType="numeric"
          />
        </div>
      </div>
      <ToggleGroup
        value={[type]}
        onValueChange={(values) => {
          const nextType = values[0] as Account["type"] | undefined;
          if (nextType) setType(nextType);
        }}
        className="account-type-picker"
        aria-label="Tipo da conta"
      >
        {accountTypes.map((item) => (
          <ToggleGroupItem
            variant="outline"
            key={item.value}
            value={item.value}
            className="chip"
            style={{
              backgroundColor: type === item.value ? colors.ink : colors.surface,
              borderColor: colors.line,
              color: type === item.value ? colors.bg : colors.ink,
            }}
          >
            {item.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}
      {type === "credit_card" ? (
        <div className="account-editor-fields">
          <div>
            <Label>Dia de vencimento</Label>
            <Field
              value={dueDay}
              onChangeText={setDueDay}
              placeholder="10"
              keyboardType="numeric"
            />
          </div>
          <div>
            <Label>Melhor dia de compra</Label>
            <Field
              value={bestPurchaseDay}
              onChangeText={setBestPurchaseDay}
              placeholder="3"
              keyboardType="numeric"
            />
          </div>
        </div>
      ) : null}
      <div className="account-editor-actions">
        <Button onPress={onCancel} variant="ghost">
          Cancelar
        </Button>
        <Button onPress={save}>Salvar alterações</Button>
      </div>
    </div>
  );
}

function PaymentSummaryCard({
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
    <article className="settings-payment-summary-card">
      <span style={{ backgroundColor: `${color}18`, color }}>{icon}</span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
    </article>
  );
}

function clampDay(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 31 ? parsed : fallback;
}

function formatAccountSubtitle(account: Account) {
  if (account.type === "reserve") return "Cofrinho/Reserva";
  if (account.type === "credit_card") {
    return `Cartão · vence dia ${account.credit_card_due_day ?? "-"} · melhor compra dia ${account.credit_card_best_purchase_day ?? "-"}`;
  }

  const labels: Record<Account["type"], string> = {
    cash: "Dinheiro",
    checking: "Conta corrente",
    credit_card: "Cartão de crédito",
    investment: "Investimento",
    other: "Outros",
    reserve: "Cofrinho/Reserva",
  };

  return labels[account.type];
}

function getAccountIcon(type: Account["type"]) {
  if (type === "credit_card") return <CreditCard size={17} />;
  if (type === "reserve") return <PiggyBank size={17} />;
  if (type === "cash") return <Wallet size={17} />;
  return <Building2 size={17} />;
}

function getAccountTone(type: Account["type"], colors: ReturnType<typeof useTheme>["colors"]) {
  if (type === "credit_card") return colors.gold;
  if (type === "reserve") return colors.green;
  if (type === "cash") return colors.blue;
  return colors.blue;
}

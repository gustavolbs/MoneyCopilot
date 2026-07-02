import {
  Banknote,
  Circle,
  Landmark,
  PiggyBank,
  Plus,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { Button, Field } from "@/components/ui";
import { Button as ShadcnButton } from "@/components/ui/button";
import { formatCurrency } from "@/domain/normalize";
import type { Account } from "@/domain/types";

interface ReserveAccountSelectorProps {
  accounts: Array<{ account: Account; balance: number }>;
  selectedId: string;
  newReserveName: string;
  onSelect: (accountId: string) => void;
  onNewReserveNameChange: (value: string) => void;
  onCreateReserve: () => void;
}

export function ReserveAccountSelector({
  accounts,
  selectedId,
  newReserveName,
  onSelect,
  onNewReserveNameChange,
  onCreateReserve,
}: ReserveAccountSelectorProps) {
  return (
    <section className="reserves-panel reserves-account-panel">
      <div className="reserves-section-heading">
        <div>
          <span>Fontes de saldo</span>
          <strong>Escolha onde movimentar</strong>
        </div>
        <PiggyBank size={19} />
      </div>

      {accounts.length ? (
        <div className="reserves-account-grid">
          {accounts.map(({ account, balance }) => {
            const active = account.id === selectedId;
            const Icon = accountTypeIcon(account.type);
            return (
              <ShadcnButton
                key={account.id}
                type="button"
                variant="outline"
                className="reserves-account-card"
                data-active={active}
                data-type={account.type}
                onClick={() => onSelect(account.id)}
              >
                <span className="reserves-account-icon">
                  <Icon size={17} />
                </span>
                <span className="reserves-account-copy">
                  <strong>{account.name}</strong>
                  <small>{accountTypeLabel(account.type)}</small>
                </span>
                <b>{formatCurrency(balance)}</b>
              </ShadcnButton>
            );
          })}
        </div>
      ) : (
        <p className="reserves-empty">
          Cadastre uma conta ou crie seu primeiro cofrinho para começar.
        </p>
      )}

      <div className="reserves-create-row">
        <Field
          value={newReserveName}
          onChangeText={onNewReserveNameChange}
          placeholder="Nome do novo cofrinho"
          onSubmitEditing={onCreateReserve}
        />
        <Button onPress={onCreateReserve} variant="ghost">
          <Plus size={16} /> Criar cofrinho
        </Button>
      </div>
    </section>
  );
}

export function accountTypeLabel(type: Account["type"]) {
  return {
    checking: "Conta corrente",
    credit_card: "Cartão de crédito",
    cash: "Carteira/Dinheiro",
    reserve: "Cofrinho/Reserva",
    investment: "Investimento",
    other: "Outro",
  }[type];
}

function accountTypeIcon(type: Account["type"]) {
  return {
    checking: Landmark,
    credit_card: Circle,
    cash: Wallet,
    reserve: PiggyBank,
    investment: TrendingUp,
    other: Banknote,
  }[type];
}

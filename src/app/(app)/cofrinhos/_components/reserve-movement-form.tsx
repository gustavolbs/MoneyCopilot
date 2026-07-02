import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesCombined,
  Plus,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, Field, SelectField } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatCurrency } from "@/domain/normalize";
import type { Account } from "@/domain/types";

export type MovementKind = "deposit" | "withdrawal" | "income" | "position";

export const movementOptions: Array<{
  kind: MovementKind;
  label: string;
  detail: string;
}> = [
  { kind: "deposit", label: "Transferir", detail: "Move de outra conta" },
  { kind: "withdrawal", label: "Sacar", detail: "Transfere para outra conta" },
  { kind: "income", label: "Adicionar saldo", detail: "Renda ou dinheiro externo" },
  { kind: "position", label: "Atualizar posição", detail: "Informe o saldo atual" },
];

interface ReserveMovementFormProps {
  selectedAccount: Account;
  selectedBalance: number;
  counterparties: Account[];
  kind: MovementKind;
  amount: string;
  date: string;
  description: string;
  counterpartyId: string;
  calculatedPositionDelta: number | null;
  error: string | null;
  saving: boolean;
  onKindChange: (kind: MovementKind) => void;
  onAmountChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCounterpartyChange: (value: string) => void;
  onSubmit: () => void;
}

export function ReserveMovementForm({
  selectedAccount,
  selectedBalance,
  counterparties,
  kind,
  amount,
  date,
  description,
  counterpartyId,
  calculatedPositionDelta,
  error,
  saving,
  onKindChange,
  onAmountChange,
  onDateChange,
  onDescriptionChange,
  onCounterpartyChange,
  onSubmit,
}: ReserveMovementFormProps) {
  const selectedOption = movementOptions.find((option) => option.kind === kind);

  return (
    <section className="reserves-panel reserves-movement-panel">
      <div className="reserves-section-heading">
        <div>
          <span>Novo movimento</span>
          <strong>{selectedAccount.name}</strong>
        </div>
        <CalendarDays size={19} />
      </div>

      <ToggleGroup
        value={[kind]}
        onValueChange={(values) => {
          const nextKind = values[0] as MovementKind | undefined;
          if (nextKind) onKindChange(nextKind);
        }}
        className="reserves-kind-grid"
        aria-label="Tipo de movimento"
      >
        {movementOptions.map((option) => {
          const Icon = movementIcon(option.kind);
          return (
            <ToggleGroupItem
              key={option.kind}
              value={option.kind}
              className="reserves-kind-button"
              data-active={kind === option.kind}
            >
              <Icon size={16} />
              <span>
                <strong>{option.label}</strong>
                <small>{option.detail}</small>
              </span>
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>

      <div className="reserves-form-grid">
        <label>
          <span>{kind === "position" ? "Posição atual" : "Valor"}</span>
          <Field
            value={amount}
            onChangeText={onAmountChange}
            placeholder={kind === "position" ? "Ex: 1.250,00" : "0,00"}
            keyboardType="numeric"
          />
        </label>
        <label>
          <span>Data</span>
          <Input
            className="field"
            type="date"
            value={date}
            onChange={(event) => onDateChange(event.currentTarget.value)}
          />
        </label>
        {kind === "deposit" || kind === "withdrawal" ? (
          <label>
            <span>{kind === "deposit" ? "Conta de origem" : "Conta de destino"}</span>
            <SelectField
              value={counterpartyId}
              onValueChange={onCounterpartyChange}
              placeholder="Selecione"
              options={counterparties.map((account) => ({
                value: account.id,
                label: account.name,
              }))}
            />
          </label>
        ) : null}
        <label>
          <span>Descrição opcional</span>
          <Field
            value={description}
            onChangeText={onDescriptionChange}
            placeholder={
              kind === "position"
                ? "Ex: Posição no fim de junho"
                : "Detalhes do movimento"
            }
          />
        </label>
      </div>

      {kind === "position" && calculatedPositionDelta !== null ? (
        <div className="reserves-position-preview">
          <div>
            <span>Saldo registrado</span>
            <strong>{formatCurrency(selectedBalance)}</strong>
          </div>
          <div>
            <span>
              {calculatedPositionDelta >= 0
                ? "Rendimento calculado"
                : "Variação calculada"}
            </span>
            <strong data-negative={calculatedPositionDelta < 0}>
              {calculatedPositionDelta >= 0 ? "+" : "-"}
              {formatCurrency(Math.abs(calculatedPositionDelta))}
            </strong>
          </div>
        </div>
      ) : null}

      {error ? (
        <Alert variant="destructive" className="reserves-error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button onPress={onSubmit} loading={saving}>
        {kind === "position"
          ? "Atualizar posição"
          : `Registrar ${selectedOption?.label.toLowerCase() ?? "movimento"}`}
      </Button>
    </section>
  );
}

function movementIcon(kind: MovementKind) {
  return {
    deposit: ArrowDownLeft,
    withdrawal: ArrowUpRight,
    income: Plus,
    position: ChartNoAxesCombined,
  }[kind];
}

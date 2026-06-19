"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  ChartNoAxesCombined,
  PiggyBank,
  Plus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button, Card, Field, Label, Screen, SelectField, Title } from "@/components/ui";
import { Button as ShadcnButton } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import {
  calculateAccountBalances,
  reserveMovementDelta,
  reservePositionDelta,
} from "@/domain/finance";
import { formatCurrency, formatDate, todayISODate } from "@/domain/normalize";
import { Account, Transaction } from "@/domain/types";
import { useTheme } from "@/lib/theme";
import { useAppStore } from "@/store/appStore";

type MovementKind = "deposit" | "withdrawal" | "income" | "position";

const movementOptions: Array<{
  kind: MovementKind;
  label: string;
  detail: string;
}> = [
  { kind: "deposit", label: "Transferir", detail: "Move de outra conta" },
  { kind: "withdrawal", label: "Sacar", detail: "Transfere para outra conta" },
  { kind: "income", label: "Adicionar saldo", detail: "Renda ou dinheiro externo" },
  { kind: "position", label: "Atualizar posição", detail: "Informe o saldo atual" },
];

function parseAmount(value: string) {
  if (!value.trim()) return Number.NaN;
  return Number(value.replace(/\./g, "").replace(",", "."));
}

function movementLabel(transaction: Transaction, delta: number) {
  if (transaction.notes?.startsWith("reserve_movement:position") || transaction.notes?.startsWith("account_movement:position"))
    return delta > 0 ? "Rendimento calculado" : "Variação negativa calculada";
  if (transaction.notes?.startsWith("account_movement:income") || transaction.notes?.startsWith("reserve_movement:income"))
    return "Saldo adicionado";
  if (
    transaction.type === "income" &&
    transaction.category_id === "cat_income_yield"
  )
    return "Rendimento";
  if (transaction.type === "transfer") return delta > 0 ? "Aporte" : "Saque";
  return delta > 0 ? "Entrada patrimonial" : "Saída patrimonial";
}

function accountTypeLabel(type: Account["type"]) {
  return {
    checking: "Conta corrente",
    credit_card: "Cartão de crédito",
    cash: "Carteira/Dinheiro",
    reserve: "Cofrinho/Reserva",
    investment: "Investimento",
    other: "Outro",
  }[type];
}

export function ReservesView() {
  const { accounts, transactions, addAccount, addBalanceMovement } =
    useAppStore();
  const { colors } = useTheme();
  const reserves = useMemo(
    () => accounts.filter((account) => account.type === "reserve"),
    [accounts],
  );
  const balanceAccounts = useMemo(
    () => accounts.filter((account) => account.type !== "credit_card"),
    [accounts],
  );
  const balances = useMemo(
    () => calculateAccountBalances(transactions, accounts),
    [accounts, transactions],
  );
  const [reserveId, setReserveId] = useState("");
  const [counterpartyId, setCounterpartyId] = useState("");
  const [kind, setKind] = useState<MovementKind>("deposit");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISODate());
  const [description, setDescription] = useState("");
  const [newReserveName, setNewReserveName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const counterparties = useMemo(
    () => balanceAccounts.filter((account) => account.id !== reserveId),
    [balanceAccounts, reserveId],
  );

  useEffect(() => {
    if (!balanceAccounts.some((account) => account.id === reserveId))
      setReserveId(balanceAccounts[0]?.id ?? "");
  }, [balanceAccounts, reserveId]);

  useEffect(() => {
    if (!counterparties.some((account) => account.id === counterpartyId))
      setCounterpartyId(counterparties[0]?.id ?? "");
  }, [counterparties, counterpartyId]);

  const selectedReserve =
    balanceAccounts.find((account) => account.id === reserveId) ?? null;
  const selectedBalance =
    balances.find(({ account }) => account.id === reserveId)?.balance ?? 0;
  const reserveTotal = balances
    .filter(({ account }) => account.type === "reserve")
    .reduce((sum, item) => sum + item.balance, 0);
  const reportedPosition = parseAmount(amount);
  const calculatedPositionDelta = Number.isFinite(reportedPosition)
    ? reservePositionDelta(selectedBalance, reportedPosition)
    : null;

  const history = useMemo(() => {
    if (!selectedReserve) return [];
    let runningBalance = selectedReserve.initial_balance;
    return transactions
      .filter((transaction) => !transaction.deleted_at)
      .sort(
        (a, b) =>
          a.transaction_date.localeCompare(b.transaction_date) ||
          a.created_at.localeCompare(b.created_at),
      )
      .flatMap((transaction) => {
        const delta = reserveMovementDelta(transaction, selectedReserve.id);
        if (!delta) return [];
        runningBalance += delta;
        return [{ transaction, delta, balance: runningBalance }];
      })
      .reverse();
  }, [selectedReserve, transactions]);

  const submitMovement = async () => {
    const numericAmount = parseAmount(amount);
    if (!selectedReserve) return setError("Selecione uma conta ou cofrinho.");
    if (!Number.isFinite(numericAmount) || (kind === "position" ? numericAmount < 0 : numericAmount <= 0))
      return setError(kind === "position" ? "Informe uma posição válida." : "Informe um valor maior que zero.");
    if (kind === "position" && reservePositionDelta(selectedBalance, numericAmount) === 0)
      return setError("A posição informada já é o saldo atual.");
    if ((kind === "deposit" || kind === "withdrawal") && !counterpartyId)
      return setError("Cadastre e selecione uma conta de origem ou destino.");
    setSaving(true);
    setError(null);
    try {
      await addBalanceMovement({
        accountId: selectedReserve.id,
        counterpartyAccountId: kind === "deposit" || kind === "withdrawal" ? counterpartyId : null,
        kind,
        amount: numericAmount,
        date,
        description,
      });
      setAmount("");
      setDescription("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível registrar o movimento.",
      );
    } finally {
      setSaving(false);
    }
  };

  const createReserve = async () => {
    if (!newReserveName.trim()) return;
    await addAccount(newReserveName.trim(), "reserve");
    setNewReserveName("");
  };

  return (
    <Screen>
      <div className="stack small">
        <Label>Patrimônio separado do fluxo mensal</Label>
        <Title>Cofrinhos</Title>
        <p className="reserve-intro" style={{ color: colors.muted }}>
          Cofrinhos e contas continuam separados por tipo, mas você pode selecionar
          qualquer um abaixo para movimentar ou adicionar saldo.
        </p>
      </div>

      <div className="reserve-summary-grid">
        <Card style={{ gap: 6 }}>
          <Label>Total guardado</Label>
          <strong>{formatCurrency(reserveTotal)}</strong>
          <small style={{ color: colors.muted }}>
            {reserves.length} cofrinho(s)
          </small>
        </Card>
        <Card style={{ gap: 6 }}>
          <Label>Saldo selecionado</Label>
          <strong>{formatCurrency(selectedBalance)}</strong>
          <small style={{ color: colors.muted }}>
            {selectedReserve?.name ?? "Nenhum cofrinho"}
          </small>
        </Card>
      </div>

      <Card style={{ gap: 12 }}>
        <div className="reserve-section-heading">
          <div>
            <Label>Cofrinhos e contas</Label>
            <strong>Escolha onde movimentar</strong>
          </div>
          <PiggyBank size={22} color={colors.gold} />
        </div>
        {balanceAccounts.length ? (
          <div className="reserve-account-grid">
            {balanceAccounts.map((reserve) => {
              const balance =
                balances.find(({ account }) => account.id === reserve.id)
                  ?.balance ?? 0;
              const active = reserve.id === reserveId;
              return (
                <ShadcnButton
                  key={reserve.id}
                  type="button"
                  variant="outline"
                  className={`reserve-account-card${active ? " active" : ""}`}
                  onClick={() => setReserveId(reserve.id)}
                  style={{
                    borderColor: active ? colors.gold : colors.line,
                    backgroundColor: active
                      ? `${colors.gold}12`
                      : colors.elevated,
                    color: colors.ink,
                  }}
                >
                  <span>{reserve.name}</span>
                  <small style={{ color: colors.muted }}>{accountTypeLabel(reserve.type)}</small>
                  <strong>{formatCurrency(balance)}</strong>
                </ShadcnButton>
              );
            })}
          </div>
        ) : (
          <p className="reserve-empty" style={{ color: colors.muted }}>
            Cadastre uma conta ou crie seu primeiro cofrinho para começar.
          </p>
        )}
        <div className="reserve-create-row">
          <Field
            value={newReserveName}
            onChangeText={setNewReserveName}
            placeholder="Nome do novo cofrinho"
            onSubmitEditing={() => void createReserve()}
          />
          <Button onPress={() => void createReserve()} variant="ghost">
            <Plus size={16} /> Criar cofrinho
          </Button>
        </div>
      </Card>

      {selectedReserve ? (
        <Card style={{ gap: 14 }}>
          <div>
            <Label>Novo movimento</Label>
            <strong>{selectedReserve.name}</strong>
          </div>
          <ToggleGroup value={[kind]} onValueChange={(values) => { const nextKind = values[0] as MovementKind | undefined; if (nextKind) { setKind(nextKind); setError(null); } }} className="reserve-kind-grid" aria-label="Tipo de movimento">
            {movementOptions.map((option) => (
              <ToggleGroupItem
                key={option.kind}
                variant="outline"
                value={option.kind}
                className={kind === option.kind ? "active" : ""}
                style={{
                  borderColor: kind === option.kind ? colors.blue : colors.line,
                  backgroundColor:
                    kind === option.kind ? `${colors.blue}14` : colors.elevated,
                  color: colors.ink,
                }}
              >
                {option.kind === "deposit" ? (
                  <ArrowDownLeft size={18} />
                ) : option.kind === "withdrawal" ? (
                  <ArrowUpRight size={18} />
                ) : option.kind === "income" ? (
                  <Plus size={18} />
                ) : (
                  <ChartNoAxesCombined size={18} />
                )}
                <span>
                  <strong>{option.label}</strong>
                  <small style={{ color: colors.muted }}>{option.detail}</small>
                </span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <div className="reserve-form-grid">
            <label>
              <span style={{ color: colors.muted }}>{kind === "position" ? "Posição atual" : "Valor"}</span>
              <Field
                value={amount}
                onChangeText={setAmount}
                placeholder={kind === "position" ? "Ex: 1.250,00" : "0,00"}
                keyboardType="numeric"
              />
            </label>
            <label>
              <span style={{ color: colors.muted }}>Data</span>
              <Input
                className="field"
                type="date"
                value={date}
                onChange={(event) => setDate(event.currentTarget.value)}
                style={{
                  backgroundColor: colors.elevated,
                  borderColor: colors.line,
                  color: colors.ink,
                }}
              />
            </label>
            {kind === "deposit" || kind === "withdrawal" ? (
              <label>
                <span style={{ color: colors.muted }}>
                  {kind === "deposit" ? "Conta de origem" : "Conta de destino"}
                </span>
                <SelectField
                  value={counterpartyId}
                  onValueChange={setCounterpartyId}
                  placeholder="Selecione"
                  options={counterparties.map((account) => ({ value: account.id, label: account.name }))}
                />
              </label>
            ) : null}
            <label>
              <span style={{ color: colors.muted }}>Descrição opcional</span>
              <Field
                value={description}
                onChangeText={setDescription}
                placeholder={
                  kind === "position"
                    ? "Ex: Posição no fim de junho"
                    : "Detalhes do movimento"
                }
              />
            </label>
          </div>
          {kind === "position" && calculatedPositionDelta !== null ? (
            <div className="reserve-position-preview" style={{ backgroundColor: colors.subtle, borderColor: colors.line }}>
              <div><span style={{ color: colors.muted }}>Saldo registrado</span><strong>{formatCurrency(selectedBalance)}</strong></div>
              <div><span style={{ color: colors.muted }}>{calculatedPositionDelta >= 0 ? "Rendimento calculado" : "Variação calculada"}</span><strong style={{ color: calculatedPositionDelta >= 0 ? colors.green : colors.red }}>{calculatedPositionDelta >= 0 ? "+" : "-"}{formatCurrency(Math.abs(calculatedPositionDelta))}</strong></div>
            </div>
          ) : null}
          {error ? <Alert variant="destructive" className="reserve-error"><AlertDescription>{error}</AlertDescription></Alert> : null}
          <Button onPress={() => void submitMovement()} loading={saving}>
            {kind === "position" ? "Atualizar posição" : `Registrar ${movementOptions.find((option) => option.kind === kind)?.label.toLowerCase()}`}
          </Button>
        </Card>
      ) : null}

      {selectedReserve ? (
        <Card style={{ gap: 12 }}>
          <div className="reserve-section-heading">
            <div>
              <Label>Histórico de evolução</Label>
              <strong>{history.length} movimento(s)</strong>
            </div>
            <span style={{ color: colors.muted }}>Saldo após cada evento</span>
          </div>
          {history.length ? (
            <div className="reserve-history">
              {history.map(({ transaction, delta, balance }) => (
                <div
                  className="reserve-history-row"
                  key={transaction.id}
                  style={{ borderColor: colors.line }}
                >
                  <span
                    className={`reserve-history-icon ${delta > 0 ? "positive" : "negative"}`}
                  >
                    {delta > 0 ? (
                      <ArrowDownLeft size={17} />
                    ) : (
                      <ArrowUpRight size={17} />
                    )}
                  </span>
                  <div>
                    <strong>{transaction.description}</strong>
                    <small style={{ color: colors.muted }}>
                      {movementLabel(transaction, delta)} ·{" "}
                      {formatDate(transaction.transaction_date)}
                    </small>
                  </div>
                  <div>
                    <strong
                      style={{ color: delta > 0 ? colors.green : colors.red }}
                    >
                      {delta > 0 ? "+" : "-"}
                      {formatCurrency(Math.abs(delta))}
                    </strong>
                    <small style={{ color: colors.muted }}>
                      Saldo {formatCurrency(balance)}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="reserve-empty" style={{ color: colors.muted }}>
              Nenhum movimento registrado neste cofrinho.
            </p>
          )}
        </Card>
      ) : null}
    </Screen>
  );
}

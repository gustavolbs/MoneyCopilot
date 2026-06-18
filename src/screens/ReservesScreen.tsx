"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  PiggyBank,
  Plus,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button, Card, Field, Label, Screen, Title } from "@/components/ui";
import {
  calculateAccountBalances,
  reserveMovementDelta,
} from "@/domain/finance";
import { formatCurrency, todayISODate } from "@/domain/normalize";
import { Transaction } from "@/domain/types";
import { useTheme } from "@/lib/theme";
import { useAppStore } from "@/store/appStore";

type MovementKind = "deposit" | "withdrawal" | "yield";

const movementOptions: Array<{
  kind: MovementKind;
  label: string;
  detail: string;
}> = [
  { kind: "deposit", label: "Aportar", detail: "Transfere de outra conta" },
  { kind: "withdrawal", label: "Sacar", detail: "Transfere para outra conta" },
  { kind: "yield", label: "Rendimento", detail: "Aumenta apenas o patrimônio" },
];

function parseAmount(value: string) {
  return Number(value.replace(/\./g, "").replace(",", "."));
}

function movementLabel(transaction: Transaction, delta: number) {
  if (
    transaction.type === "income" &&
    transaction.category_id === "cat_income_yield"
  )
    return "Rendimento";
  if (transaction.type === "transfer") return delta > 0 ? "Aporte" : "Saque";
  return delta > 0 ? "Entrada patrimonial" : "Saída patrimonial";
}

export function ReservesScreen() {
  const { accounts, transactions, addAccount, addReserveMovement } =
    useAppStore();
  const { colors } = useTheme();
  const reserves = useMemo(
    () => accounts.filter((account) => account.type === "reserve"),
    [accounts],
  );
  const counterparties = useMemo(
    () =>
      accounts.filter(
        (account) =>
          account.type !== "reserve" && account.type !== "credit_card",
      ),
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

  useEffect(() => {
    if (!reserves.some((reserve) => reserve.id === reserveId))
      setReserveId(reserves[0]?.id ?? "");
  }, [reserveId, reserves]);

  useEffect(() => {
    if (!counterparties.some((account) => account.id === counterpartyId))
      setCounterpartyId(counterparties[0]?.id ?? "");
  }, [counterparties, counterpartyId]);

  const selectedReserve =
    reserves.find((reserve) => reserve.id === reserveId) ?? null;
  const selectedBalance =
    balances.find(({ account }) => account.id === reserveId)?.balance ?? 0;
  const reserveTotal = balances
    .filter(({ account }) => account.type === "reserve")
    .reduce((sum, item) => sum + item.balance, 0);

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
    if (!selectedReserve) return setError("Selecione um cofrinho.");
    if (!Number.isFinite(numericAmount) || numericAmount <= 0)
      return setError("Informe um valor maior que zero.");
    if (kind !== "yield" && !counterpartyId)
      return setError("Cadastre e selecione uma conta de origem ou destino.");
    setSaving(true);
    setError(null);
    try {
      await addReserveMovement({
        reserveAccountId: selectedReserve.id,
        counterpartyAccountId: kind === "yield" ? null : counterpartyId,
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
          Aportes e saques são transferências internas. Rendimentos aumentam o
          patrimônio sem inflar suas receitas.
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
            <Label>Seus cofrinhos</Label>
            <strong>Escolha um para movimentar</strong>
          </div>
          <PiggyBank size={22} color={colors.gold} />
        </div>
        {reserves.length ? (
          <div className="reserve-account-grid">
            {reserves.map((reserve) => {
              const balance =
                balances.find(({ account }) => account.id === reserve.id)
                  ?.balance ?? 0;
              const active = reserve.id === reserveId;
              return (
                <button
                  key={reserve.id}
                  type="button"
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
                  <strong>{formatCurrency(balance)}</strong>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="reserve-empty" style={{ color: colors.muted }}>
            Crie seu primeiro cofrinho para começar.
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
            <Plus size={16} /> Criar
          </Button>
        </div>
      </Card>

      {selectedReserve ? (
        <Card style={{ gap: 14 }}>
          <div>
            <Label>Novo movimento</Label>
            <strong>{selectedReserve.name}</strong>
          </div>
          <div className="reserve-kind-grid">
            {movementOptions.map((option) => (
              <button
                key={option.kind}
                type="button"
                className={kind === option.kind ? "active" : ""}
                onClick={() => {
                  setKind(option.kind);
                  setError(null);
                }}
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
                ) : (
                  <TrendingUp size={18} />
                )}
                <span>
                  <strong>{option.label}</strong>
                  <small style={{ color: colors.muted }}>{option.detail}</small>
                </span>
              </button>
            ))}
          </div>
          <div className="reserve-form-grid">
            <label>
              <span style={{ color: colors.muted }}>Valor</span>
              <Field
                value={amount}
                onChangeText={setAmount}
                placeholder="0,00"
                keyboardType="numeric"
              />
            </label>
            <label>
              <span style={{ color: colors.muted }}>Data</span>
              <input
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
            {kind !== "yield" ? (
              <label>
                <span style={{ color: colors.muted }}>
                  {kind === "deposit" ? "Conta de origem" : "Conta de destino"}
                </span>
                <select
                  value={counterpartyId}
                  onChange={(event) =>
                    setCounterpartyId(event.currentTarget.value)
                  }
                  style={{
                    backgroundColor: colors.elevated,
                    borderColor: colors.line,
                    color: colors.ink,
                  }}
                >
                  <option value="">Selecione</option>
                  {counterparties.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label>
              <span style={{ color: colors.muted }}>Descrição opcional</span>
              <Field
                value={description}
                onChangeText={setDescription}
                placeholder={
                  kind === "yield"
                    ? "Ex: Rendimento de junho"
                    : "Detalhes do movimento"
                }
              />
            </label>
          </div>
          {error ? (
            <p className="reserve-error" style={{ color: colors.red }}>
              {error}
            </p>
          ) : null}
          <Button onPress={() => void submitMovement()} loading={saving}>
            Registrar{" "}
            {movementOptions
              .find((option) => option.kind === kind)
              ?.label.toLowerCase()}
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
                      {transaction.transaction_date
                        .split("-")
                        .reverse()
                        .join("/")}
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

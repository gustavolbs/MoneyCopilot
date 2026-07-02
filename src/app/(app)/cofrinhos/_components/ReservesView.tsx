"use client";

import { useEffect, useMemo, useState } from "react";

import { Screen } from "@/components/ui";
import {
  calculateAccountBalances,
  reserveMovementDelta,
  reservePositionDelta,
} from "@/domain/finance";
import { todayISODate } from "@/domain/normalize";
import { useAppStore } from "@/store/appStore";

import { ReserveAccountSelector } from "./reserve-account-selector";
import { ReserveHistoryList } from "./reserve-history-list";
import {
  type MovementKind,
  ReserveMovementForm,
} from "./reserve-movement-form";
import { ReserveSummaryCards } from "./reserve-summary-cards";
import { ReservesHeader } from "./reserves-header";

function parseAmount(value: string) {
  if (!value.trim()) return Number.NaN;
  return Number(value.replace(/\./g, "").replace(",", "."));
}

export function ReservesView() {
  const { accounts, transactions, addAccount, addBalanceMovement } =
    useAppStore();
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
  const accountBalanceItems = useMemo(
    () =>
      balanceAccounts.map((account) => ({
        account,
        balance:
          balances.find((item) => item.account.id === account.id)?.balance ?? 0,
      })),
    [balanceAccounts, balances],
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
    <Screen className="reserves-screen">
      <div className="reserves-page">
        <ReservesHeader
          accountCount={balanceAccounts.length}
          reserveCount={reserves.length}
        />

        <ReserveSummaryCards
          reserveTotal={reserveTotal}
          selectedBalance={selectedBalance}
          selectedName={selectedReserve?.name ?? null}
          reserveCount={reserves.length}
          accountCount={balanceAccounts.length}
        />

        <div className="reserves-layout">
          <div className="reserves-left-column">
            <ReserveAccountSelector
              accounts={accountBalanceItems}
              selectedId={reserveId}
              newReserveName={newReserveName}
              onSelect={setReserveId}
              onNewReserveNameChange={setNewReserveName}
              onCreateReserve={() => void createReserve()}
            />

            {selectedReserve ? (
              <ReserveMovementForm
                selectedAccount={selectedReserve}
                selectedBalance={selectedBalance}
                counterparties={counterparties}
                kind={kind}
                amount={amount}
                date={date}
                description={description}
                counterpartyId={counterpartyId}
                calculatedPositionDelta={calculatedPositionDelta}
                error={error}
                saving={saving}
                onKindChange={(nextKind) => {
                  setKind(nextKind);
                  setError(null);
                }}
                onAmountChange={setAmount}
                onDateChange={setDate}
                onDescriptionChange={setDescription}
                onCounterpartyChange={setCounterpartyId}
                onSubmit={() => void submitMovement()}
              />
            ) : null}
          </div>

          {selectedReserve ? <ReserveHistoryList entries={history} /> : null}
        </div>
      </div>
    </Screen>
  );
}

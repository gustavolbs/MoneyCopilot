"use client";

import { addMonths } from "date-fns";
import { useMemo, useState } from "react";

import { TransactionEditor } from "@/components/TransactionEditor";
import { Screen } from "@/components/ui";
import { isReserveMovement, transactionBelongsToMonth } from "@/domain/finance";
import { formatMonthYear, monthKey, normalizeText } from "@/domain/normalize";
import { Transaction } from "@/domain/types";
import { useAppStore } from "@/store/appStore";

import {
  type PeriodFilter,
  type TransactionPeriodOption,
  TransactionPeriodCards,
} from "./transaction-period-cards";
import {
  TransactionFilters,
  type TransactionPaymentFilter,
  type TransactionTypeFilter,
} from "./transaction-filters";
import { TransactionsList } from "./transactions-list";
import { TransactionSummaryCards } from "./transaction-summary-cards";
import { TransactionsHeader } from "./transactions-header";

export function TransactionsView() {
  const {
    transactions,
    categories,
    accounts,
    editTransaction,
    deleteTransaction,
  } = useAppStore();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [period, setPeriod] = useState<PeriodFilter>("current");
  const [type, setType] = useState<TransactionTypeFilter>("all");
  const [categoryId, setCategoryId] = useState("all");
  const [payment, setPayment] = useState<TransactionPaymentFilter>("all");
  const periodOptions = useMemo<TransactionPeriodOption[]>(() => {
    const now = new Date();
    return [
      {
        id: "previous",
        label: "Mês anterior",
        month: monthKey(addMonths(now, -1)),
        detail: formatMonthYear(addMonths(now, -1)),
      },
      {
        id: "current",
        label: "Este mês",
        month: monthKey(now),
        detail: formatMonthYear(now),
      },
      {
        id: "next",
        label: "Próximo mês",
        month: monthKey(addMonths(now, 1)),
        detail: formatMonthYear(addMonths(now, 1)),
      },
      {
        id: "all",
        label: "Histórico",
        month: null,
        detail: "Todos os períodos",
      },
    ];
  }, []);
  const selectedPeriod = periodOptions.find((option) => option.id === period)!;

  const periodCounts = useMemo(
    () =>
      new Map(
        periodOptions.map((option) => [
          option.id,
          transactions.filter(
            (transaction) =>
              !transaction.deleted_at &&
              !isReserveMovement(transaction, accounts) &&
              (!option.month ||
                transactionBelongsToMonth(transaction, option.month, accounts)),
          ).length,
        ]),
      ),
    [accounts, periodOptions, transactions],
  );

  const filtered = useMemo(() => {
    const normalized = normalizeText(query);
    return transactions
      .filter((transaction) => !transaction.deleted_at)
      .filter((transaction) => !isReserveMovement(transaction, accounts))
      .filter(
        (transaction) =>
          !selectedPeriod.month ||
          transactionBelongsToMonth(
            transaction,
            selectedPeriod.month,
            accounts,
          ),
      )
      .filter((transaction) => type === "all" || transaction.type === type)
      .filter(
        (transaction) =>
          categoryId === "all" || transaction.category_id === categoryId,
      )
      .filter(
        (transaction) =>
          payment === "all" ||
          (transaction.type === "expense" &&
            transaction.payment_method === payment),
      )
      .filter(
        (transaction) =>
          !normalized ||
          transaction.normalized_description.includes(normalized),
      )
      .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
  }, [
    accounts,
    categoryId,
    payment,
    query,
    selectedPeriod.month,
    transactions,
    type,
  ]);

  const summary = useMemo(
    () => ({
      income: filtered
        .filter((transaction) => transaction.type === "income")
        .reduce((sum, transaction) => sum + transaction.amount, 0),
      expense: filtered
        .filter((transaction) => transaction.type === "expense")
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    }),
    [filtered],
  );
  const filteredCategories =
    type === "transfer"
      ? []
      : categories.filter(
          (category) =>
            type === "all" ||
            category.type === type ||
            category.type === "both",
        );
  const hasActiveFilters =
    Boolean(query.trim()) ||
    type !== "all" ||
    categoryId !== "all" ||
    payment !== "all";

  const selectType = (nextType: TransactionTypeFilter) => {
    setType(nextType);
    setCategoryId("all");
    if (nextType !== "expense" && nextType !== "all") setPayment("all");
  };

  return (
    <Screen>
      <div className="transactions-page">
        <TransactionsHeader
          periodLabel={
            selectedPeriod.month
              ? `Competência de ${selectedPeriod.detail}`
              : "Consulta de todo o histórico"
          }
          resultCount={filtered.length}
        />

        <TransactionPeriodCards
          options={periodOptions}
          value={period}
          counts={periodCounts}
          onValueChange={setPeriod}
        />

        <TransactionFilters
          query={query}
          type={type}
          categoryId={categoryId}
          payment={payment}
          categoryOptions={[
            {
              value: "all",
              label:
                type === "transfer" ? "Não se aplica" : "Todas as categorias",
            },
            ...filteredCategories.map((category) => ({
              value: category.id,
              label: category.name,
            })),
          ]}
          categoryDisabled={type === "transfer"}
          paymentDisabled={type === "income" || type === "transfer"}
          resultCount={filtered.length}
          hasActiveFilters={hasActiveFilters}
          onQueryChange={setQuery}
          onTypeChange={selectType}
          onCategoryChange={setCategoryId}
          onPaymentChange={setPayment}
          onClear={() => {
            setQuery("");
            setType("all");
            setCategoryId("all");
            setPayment("all");
          }}
        />

        <TransactionSummaryCards
          income={summary.income}
          expense={summary.expense}
        />

        <section className="transaction-list-card" aria-label="Lançamentos">
          {filtered.length ? (
            <div className="transaction-list-mobile">
              <TransactionsList
                transactions={filtered}
                categories={categories}
                accounts={accounts}
                onSelect={setEditing}
              />
            </div>
          ) : (
            <p className="transaction-empty">
              Nenhuma transação encontrada com estes filtros.
            </p>
          )}
        </section>
      </div>

      <TransactionEditor
        transaction={editing}
        categories={categories}
        accounts={accounts}
        onClose={() => setEditing(null)}
        onSave={async (patch) => {
          if (!editing) return;
          await editTransaction(editing, patch);
          setEditing(null);
        }}
        onDelete={async () => {
          if (!editing) return;
          await deleteTransaction(editing);
          setEditing(null);
        }}
      />
    </Screen>
  );
}

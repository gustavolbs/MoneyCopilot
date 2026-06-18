"use client";

import { useMemo, useState } from "react";

import { PeriodNotice } from "@/components/PeriodNotice";
import {
  Button,
  Card,
  Field,
  Label,
  RowItem,
  Screen,
  Title,
} from "@/components/ui";
import { budgetProgress, transactionBelongsToMonth } from "@/domain/finance";
import { formatCurrency, monthKey } from "@/domain/normalize";
import { useTheme } from "@/lib/theme";
import { useAppStore } from "@/store/appStore";

export function BudgetsScreen() {
  const { colors } = useTheme();
  const { categories, budgets, transactions, accounts, saveBudget } =
    useAppStore();
  const expenseCategories = categories.filter(
    (item) => item.type === "expense",
  );
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState(expenseCategories[0]?.id ?? "");
  const currentMonth = monthKey();
  const monthBudgets = budgets.filter(
    (budget) => budget.month === currentMonth,
  );
  const summary = useMemo(() => {
    const spent = monthBudgets.reduce(
      (sum, budget) =>
        sum + budgetProgress(transactions, budget, accounts).spent,
      0,
    );
    const planned = monthBudgets.reduce(
      (sum, budget) => sum + budget.amount,
      0,
    );
    return { spent, planned, percent: planned > 0 ? spent / planned : 0 };
  }, [accounts, monthBudgets, transactions]);

  const create = async () => {
    const parsed = Number(amount.replace(/\./g, "").replace(",", "."));
    if (!categoryId || !Number.isFinite(parsed) || parsed <= 0) {
      window.alert("Informe um valor valido.");
      return;
    }
    await saveBudget(categoryId, parsed);
    setAmount("");
  };

  return (
    <Screen>
      <div className="stack small">
        <Label>Competencia {currentMonth}</Label>
        <Title>Orcamentos</Title>
      </div>

      <PeriodNotice
        label={`Periodo observado: ${currentMonth}`}
        detail="Gastos a vista seguem a data da compra; gastos no cartao seguem o mes de vencimento da fatura."
      />

      <Card style={{ gap: 12 }}>
        <Label>Total planejado</Label>
        <div className="hero-amount small">
          {formatCurrency(summary.planned)}
        </div>
        <div
          className="progress-track"
          style={{ backgroundColor: colors.subtle }}
        >
          <div
            className="progress-fill"
            style={{
              width: `${Math.min(summary.percent * 100, 100)}%`,
              backgroundColor:
                summary.percent >= 1
                  ? colors.red
                  : summary.percent >= 0.8
                    ? colors.gold
                    : colors.green,
            }}
          />
        </div>
        <p className="muted" style={{ color: colors.muted }}>
          {formatCurrency(summary.spent)} usados no mes
        </p>
      </Card>

      <Card style={{ gap: 12 }}>
        <Label>Novo orcamento</Label>
        <div className="chip-grid">
          {expenseCategories.map((category) => (
            <button
              type="button"
              key={category.id}
              onClick={() => setCategoryId(category.id)}
              className="chip"
              style={{
                backgroundColor:
                  categoryId === category.id ? category.color : colors.subtle,
                color: categoryId === category.id ? "#fff" : colors.ink,
                borderColor: "transparent",
              }}
            >
              {category.name}
            </button>
          ))}
        </div>
        <Field
          value={amount}
          onChangeText={setAmount}
          placeholder="Limite mensal. Ex: 2000"
          keyboardType="numeric"
          onSubmitEditing={() => void create()}
        />
        <Button onPress={() => void create()}>Salvar orcamento</Button>
      </Card>

      <Card style={{ gap: 4 }}>
        <Label>Ativos</Label>
        {monthBudgets.map((budget) => {
          const category = categories.find(
            (item) => item.id === budget.category_id,
          );
          const progress = budgetProgress(transactions, budget, accounts);
          return (
            <div key={budget.id} className="budget-row">
              <RowItem
                title={category?.name ?? "Categoria"}
                subtitle={`${formatCurrency(progress.spent)} de ${formatCurrency(budget.amount)}`}
                right={
                  <span
                    style={{
                      color:
                        progress.status === "over"
                          ? colors.red
                          : progress.status === "warning"
                            ? colors.gold
                            : colors.muted,
                    }}
                  >
                    {Math.round(progress.percent * 100)}%
                  </span>
                }
              />
              <div
                className="progress-track"
                style={{ backgroundColor: colors.subtle }}
              >
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min(progress.percent * 100, 100)}%`,
                    backgroundColor:
                      progress.status === "over"
                        ? colors.red
                        : progress.status === "warning"
                          ? colors.gold
                          : (category?.color ?? colors.green),
                  }}
                />
              </div>
            </div>
          );
        })}
        {!monthBudgets.length ? (
          <p className="muted" style={{ color: colors.muted }}>
            Nenhum orcamento criado para este mes.
          </p>
        ) : null}
      </Card>

      <Card style={{ gap: 4 }}>
        <Label>Sem orcamento</Label>
        {expenseCategories
          .filter(
            (category) =>
              !monthBudgets.some(
                (budget) => budget.category_id === category.id,
              ),
          )
          .slice(0, 8)
          .map((category) => {
            const spent = transactions
              .filter(
                (transaction) =>
                  transaction.type === "expense" &&
                  transaction.category_id === category.id &&
                  transactionBelongsToMonth(
                    transaction,
                    currentMonth,
                    accounts,
                  ),
              )
              .reduce((sum, transaction) => sum + transaction.amount, 0);
            return (
              <RowItem
                key={category.id}
                title={category.name}
                subtitle={
                  spent > 0
                    ? `${formatCurrency(spent)} gastos no mes`
                    : "Sem gastos no mes"
                }
                right={<span style={{ color: colors.muted }}>Adicionar</span>}
                onPress={() => setCategoryId(category.id)}
              />
            );
          })}
      </Card>
    </Screen>
  );
}

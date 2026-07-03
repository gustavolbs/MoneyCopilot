import { describe, expect, it } from "vitest";

import { defaultCategories } from "@/domain/categories";
import {
  budgetProgress,
  calculateAccountBalances,
  effectiveBudgetsForMonth,
  isReserveMovement,
  metricsForMonth,
  plannedExpensesForMonth,
  reserveMovementDelta,
  transactionEffectiveDate,
  transactionMonth,
} from "@/domain/finance";
import { Account, Budget, Transaction } from "@/domain/types";

const baseTransaction = {
  household_id: "h1",
  account_id: null,
  transfer_account_id: null,
  created_by: "u1",
  normalized_description: "",
  payment_method: "cash" as const,
  notes: null,
  source: "manual" as const,
  recurrence_id: null,
  installment_group_id: null,
  installment_index: null,
  installment_total: null,
  installment_base_description: null,
  created_at: "2026-06-17T00:00:00.000Z",
  updated_at: "2026-06-17T00:00:00.000Z",
  deleted_at: null,
};

const tx = (overrides: Partial<Transaction>): Transaction => ({
  ...baseTransaction,
  id: overrides.id ?? "t",
  description: overrides.description ?? "Item",
  amount: overrides.amount ?? 0,
  type: overrides.type ?? "expense",
  transaction_date: overrides.transaction_date ?? "2026-06-17",
  category_id: overrides.category_id ?? "cat_expense_food",
  ...overrides,
});

describe("finance calculations", () => {
  it("computes monthly metrics", () => {
    const metrics = metricsForMonth(
      [
        tx({
          id: "1",
          type: "income",
          amount: 10000,
          category_id: "cat_income_salary",
        }),
        tx({
          id: "2",
          type: "expense",
          amount: 250,
          category_id: "cat_expense_food",
        }),
        tx({
          id: "3",
          type: "expense",
          amount: 350,
          category_id: "cat_expense_market",
        }),
      ],
      defaultCategories,
      "2026-06",
    );
    expect(metrics.income).toBe(10000);
    expect(metrics.expense).toBe(600);
    expect(metrics.balance).toBe(9400);
    expect(metrics.byCategory[0].amount).toBe(350);
  });

  it("keeps internal transfers out of income and expense while updating balances", () => {
    const accounts = [
      {
        id: "checking",
        household_id: "h1",
        name: "Conta Corrente",
        type: "checking" as const,
        initial_balance: 10000,
        currency: "BRL",
        credit_card_due_day: null,
        credit_card_best_purchase_day: null,
        created_at: "",
        updated_at: "",
        deleted_at: null,
      },
      {
        id: "reserve",
        household_id: "h1",
        name: "Cofrinho Casa",
        type: "reserve" as const,
        initial_balance: 0,
        currency: "BRL",
        credit_card_due_day: null,
        credit_card_best_purchase_day: null,
        created_at: "",
        updated_at: "",
        deleted_at: null,
      },
    ];
    const metrics = metricsForMonth(
      [
        tx({
          id: "transfer",
          type: "transfer",
          amount: 5000,
          account_id: "checking",
          transfer_account_id: "reserve",
          transaction_date: "2026-06-17",
        }),
      ],
      defaultCategories,
      "2026-06",
      [],
      accounts,
    );

    expect(metrics.income).toBe(0);
    expect(metrics.expense).toBe(0);
    expect(metrics.availableToSpend).toBe(5000);
    expect(metrics.reserveTotal).toBe(5000);
    expect(metrics.netWorth).toBe(10000);
  });

  it("adds reserve yield to net worth without inflating operational income", () => {
    const reserve: Account = {
      id: "reserve",
      household_id: "h1",
      name: "Reserva",
      type: "reserve",
      initial_balance: 1000,
      currency: "BRL",
      credit_card_due_day: null,
      credit_card_best_purchase_day: null,
      created_at: "",
      updated_at: "",
      deleted_at: null,
    };
    const metrics = metricsForMonth(
      [tx({ id: "yield", type: "income", amount: 25, account_id: reserve.id, category_id: "cat_income_yield", payment_method: null })],
      defaultCategories,
      "2026-06",
      [],
      [reserve],
    );

    expect(metrics.income).toBe(0);
    expect(metrics.balance).toBe(0);
    expect(metrics.reserveTotal).toBe(1025);
    expect(metrics.netWorth).toBe(1025);
  });

  it("keeps credit-card invoices out of available balance and asset total", () => {
    const checking: Account = {
      id: "checking",
      household_id: "h1",
      name: "Conta Corrente",
      type: "checking",
      initial_balance: -100,
      currency: "BRL",
      credit_card_due_day: null,
      credit_card_best_purchase_day: null,
      created_at: "",
      updated_at: "",
      deleted_at: null,
    };
    const reserve: Account = { ...checking, id: "reserve", name: "Reserva", type: "reserve", initial_balance: 3875.96 };
    const card: Account = {
      ...checking,
      id: "card",
      name: "Cartão",
      type: "credit_card",
      initial_balance: 0,
      credit_card_due_day: 10,
      credit_card_best_purchase_day: 3,
    };
    const metrics = metricsForMonth(
      [tx({ id: "card-expense", account_id: card.id, payment_method: "credit_card", amount: 6692.98 })],
      defaultCategories,
      "2026-07",
      [],
      [checking, reserve, card],
    );

    expect(metrics.availableToSpend).toBe(-100);
    expect(metrics.reserveTotal).toBe(3875.96);
    expect(metrics.netWorth).toBe(3775.96);
  });

  it("tracks deposits, withdrawals and yield in the reserve history", () => {
    const checking: Account = {
      id: "checking",
      household_id: "h1",
      name: "Conta Corrente",
      type: "checking",
      initial_balance: 2000,
      currency: "BRL",
      credit_card_due_day: null,
      credit_card_best_purchase_day: null,
      created_at: "",
      updated_at: "",
      deleted_at: null,
    };
    const reserve: Account = { ...checking, id: "reserve", name: "Cofrinho", type: "reserve", initial_balance: 100 };
    const movements = [
      tx({ id: "deposit", type: "transfer", amount: 500, account_id: checking.id, transfer_account_id: reserve.id, category_id: null, payment_method: null }),
      tx({ id: "yield", type: "income", amount: 20, account_id: reserve.id, category_id: "cat_income_yield", payment_method: null }),
      tx({ id: "withdrawal", type: "transfer", amount: 150, account_id: reserve.id, transfer_account_id: checking.id, category_id: null, payment_method: null }),
    ];

    expect(movements.map((movement) => reserveMovementDelta(movement, reserve.id))).toEqual([500, 20, -150]);
    expect(movements.every((movement) => isReserveMovement(movement, [checking, reserve]))).toBe(true);
    expect(calculateAccountBalances(movements, [checking, reserve]).map(({ balance }) => balance)).toEqual([1650, 470]);
    expect(metricsForMonth(movements, defaultCategories, "2026-06", [], [checking, reserve])).toMatchObject({
      income: 0,
      expense: 0,
      reserveTotal: 470,
      netWorth: 2120,
    });
  });

  it("computes budget progress status", () => {
    const budget: Budget = {
      id: "b1",
      household_id: "h1",
      category_id: "cat_expense_food",
      month: "2026-06",
      amount: 1000,
      created_at: "",
      updated_at: "",
      deleted_at: null,
    };
    const progress = budgetProgress([tx({ id: "1", amount: 850 })], budget);
    expect(progress.percent).toBe(0.85);
    expect(progress.status).toBe("warning");
  });

  it("inherits budgets from the latest previous month until a new value is set", () => {
    const budgets: Budget[] = [
      {
        id: "food-june",
        household_id: "h1",
        category_id: "cat_expense_food",
        month: "2026-06",
        amount: 1000,
        created_at: "",
        updated_at: "2026-06-01T00:00:00.000Z",
        deleted_at: null,
      },
      {
        id: "food-august",
        household_id: "h1",
        category_id: "cat_expense_food",
        month: "2026-08",
        amount: 1200,
        created_at: "",
        updated_at: "2026-08-01T00:00:00.000Z",
        deleted_at: null,
      },
      {
        id: "market-deleted",
        household_id: "h1",
        category_id: "cat_expense_market",
        month: "2026-05",
        amount: 500,
        created_at: "",
        updated_at: "2026-05-01T00:00:00.000Z",
        deleted_at: "2026-05-02T00:00:00.000Z",
      },
    ];

    const july = effectiveBudgetsForMonth(budgets, "2026-07");
    const september = effectiveBudgetsForMonth(budgets, "2026-09");

    expect(july).toHaveLength(1);
    expect(july[0]).toMatchObject({
      id: "food-june",
      category_id: "cat_expense_food",
      month: "2026-07",
      amount: 1000,
    });
    expect(september[0]).toMatchObject({
      id: "food-august",
      month: "2026-09",
      amount: 1200,
    });
    expect(budgetProgress([tx({ id: "july-food", amount: 250, transaction_date: "2026-07-10" })], july[0]).spent).toBe(250);
  });

  it("combines scheduled transactions and upcoming recurrences as planned expenses", () => {
    const planned = plannedExpensesForMonth(
      [
        tx({
          id: "installment",
          description: "Notebook 2/3",
          amount: 400,
          transaction_date: "2026-08-15",
        }),
        tx({
          id: "materialized",
          description: "Spotify",
          amount: 21.9,
          transaction_date: "2026-08-10",
          recurrence_id: "spotify",
        }),
      ],
      [
        {
          id: "spotify",
          household_id: "h1",
          account_id: null,
          category_id: "cat_expense_subscriptions",
          description: "Spotify",
          amount: 21.9,
          type: "expense",
          frequency: "monthly",
          day_of_month: 10,
          next_due_date: "2026-08-10",
          active: true,
          created_at: "",
          updated_at: "",
          deleted_at: null,
        },
        {
          id: "internet",
          household_id: "h1",
          account_id: null,
          category_id: "cat_expense_bills",
          description: "Internet",
          amount: 120,
          type: "expense",
          frequency: "monthly",
          day_of_month: 5,
          next_due_date: "2026-08-05",
          active: true,
          created_at: "",
          updated_at: "",
          deleted_at: null,
        },
      ],
      "2026-08",
    );

    expect(planned.transactionTotal).toBe(421.9);
    expect(planned.recurrenceTotal).toBe(120);
    expect(planned.total).toBe(541.9);
    expect(planned.items.map((item) => item.description)).toEqual(["Internet", "Spotify", "Notebook 2/3"]);
  });

  it("moves credit-card purchases made on or after the best purchase day to next month", () => {
    const card: Account = {
      id: "card",
      household_id: "h1",
      name: "Cartao",
      type: "credit_card",
      initial_balance: 0,
      currency: "BRL",
      credit_card_due_day: 10,
      credit_card_best_purchase_day: 3,
      created_at: "",
      updated_at: "",
      deleted_at: null,
    };
    const beforeBestDay = tx({
      id: "before",
      transaction_date: "2026-06-02",
      payment_method: "credit_card",
      account_id: card.id,
      amount: 100,
    });
    const onBestDay = tx({
      id: "after",
      transaction_date: "2026-06-03",
      payment_method: "credit_card",
      account_id: card.id,
      amount: 200,
    });

    expect(transactionMonth(beforeBestDay, [card])).toBe("2026-06");
    expect(transactionMonth(onBestDay, [card])).toBe("2026-07");
    expect(transactionEffectiveDate(beforeBestDay, [card])).toBe("2026-06-10");
    expect(transactionEffectiveDate(onBestDay, [card])).toBe("2026-07-10");
    expect(
      metricsForMonth(
        [beforeBestDay, onBestDay],
        defaultCategories,
        "2026-06",
        [],
        [card],
      ).expense,
    ).toBe(100);
    expect(
      metricsForMonth(
        [beforeBestDay, onBestDay],
        defaultCategories,
        "2026-07",
        [],
        [card],
      ).expense,
    ).toBe(200);
  });

  it("uses the last valid day when a card due day does not exist in the month", () => {
    const card: Account = {
      id: "card",
      household_id: "h1",
      name: "Cartao",
      type: "credit_card",
      initial_balance: 0,
      currency: "BRL",
      credit_card_due_day: 31,
      credit_card_best_purchase_day: 20,
      created_at: "",
      updated_at: "",
      deleted_at: null,
    };
    const purchase = tx({
      transaction_date: "2026-01-20",
      payment_method: "credit_card",
      account_id: card.id,
    });

    expect(transactionEffectiveDate(purchase, [card])).toBe("2026-02-28");
  });

  it("handles a best purchase day in the month before an early due day", () => {
    const card: Account = {
      id: "card",
      household_id: "h1",
      name: "Cartao",
      type: "credit_card",
      initial_balance: 0,
      currency: "BRL",
      credit_card_due_day: 5,
      credit_card_best_purchase_day: 27,
      created_at: "",
      updated_at: "",
      deleted_at: null,
    };

    expect(transactionEffectiveDate(tx({ transaction_date: "2026-01-04", payment_method: "credit_card", account_id: card.id }), [card])).toBe("2026-01-05");
    expect(transactionEffectiveDate(tx({ transaction_date: "2026-01-20", payment_method: "credit_card", account_id: card.id }), [card])).toBe("2026-02-05");
    expect(transactionEffectiveDate(tx({ transaction_date: "2026-01-27", payment_method: "credit_card", account_id: card.id }), [card])).toBe("2026-03-05");
  });
});

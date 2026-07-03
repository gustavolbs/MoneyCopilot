import { describe, expect, it } from "vitest";

import { defaultCategories } from "@/domain/categories";
import {
  budgetProgress,
  calculateAccountBalances,
  isReserveMovement,
  metricsForMonth,
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

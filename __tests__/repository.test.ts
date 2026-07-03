import { afterEach, describe, expect, it, vi } from "vitest";

import { Account, Transaction } from "@/domain/types";
import { readLocalDb, writeLocalDb } from "@/storage/db";
import {
  completeInstallmentsFromTransaction,
  createBalanceMovement,
  createRecurrence,
  createTransactionsFromInput,
  linkTransactionToRecurrence,
  listAccounts,
  materializeDueRecurrences,
  reconcileDeletedAccountReferences,
} from "@/storage/repository";

function installLocalStorage() {
  const values = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
}

const account = (overrides: Partial<Account>): Account => ({
  id: "account",
  household_id: "household",
  name: "Conta Corrente",
  type: "checking",
  initial_balance: 0,
  currency: "BRL",
  credit_card_due_day: null,
  credit_card_best_purchase_day: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  deleted_at: null,
  ...overrides,
});

afterEach(() => vi.unstubAllGlobals());

describe("account reconciliation", () => {
  it("moves deleted duplicate references once", async () => {
    installLocalStorage();
    const state = await readLocalDb();
    const active = account({ id: "active", initial_balance: 100 });
    const deleted = account({ id: "deleted", initial_balance: 50, deleted_at: "2026-06-18T00:00:00.000Z" });
    const transaction: Transaction = {
      id: "transaction",
      household_id: "household",
      account_id: deleted.id,
      transfer_account_id: null,
      category_id: "cat_expense_other",
      created_by: "user",
      description: "Compra",
      normalized_description: "compra",
      amount: 25,
      type: "expense",
      transaction_date: "2026-06-18",
      payment_method: "cash",
      notes: null,
      source: "manual",
      recurrence_id: null,
      installment_group_id: null,
      installment_index: null,
      installment_total: null,
      installment_base_description: null,
      created_at: "2026-06-18T00:00:00.000Z",
      updated_at: "2026-06-18T00:00:00.000Z",
      deleted_at: null,
    };
    state.accounts = [active, deleted];
    state.transactions = [transaction];
    await writeLocalDb(state);

    expect(await reconcileDeletedAccountReferences("household")).toBe(2);
    const once = await readLocalDb();
    const queueSize = once.mutation_queue.length;
    expect(once.transactions[0].account_id).toBe(active.id);
    expect(once.accounts.find((item) => item.id === active.id)?.initial_balance).toBe(150);
    expect(once.accounts.find((item) => item.id === deleted.id)?.initial_balance).toBe(0);
    expect((await listAccounts("household")).map((item) => item.id)).toEqual([active.id]);

    expect(await reconcileDeletedAccountReferences("household")).toBe(0);
    const twice = await readLocalDb();
    expect(twice.accounts.find((item) => item.id === active.id)?.initial_balance).toBe(150);
    expect(twice.mutation_queue).toHaveLength(queueSize);
  });
});

describe("account movements", () => {
  it("adds external income directly to a reserve", async () => {
    installLocalStorage();
    const state = await readLocalDb();
    const reserve = account({ id: "reserve", name: "Cofrinho", type: "reserve" });
    state.accounts = [reserve];
    await writeLocalDb(state);

    const movement = await createBalanceMovement({
      householdId: "household",
      userId: "user",
      accountId: reserve.id,
      kind: "income",
      amount: 250,
      date: "2026-06-18",
      description: "Dinheiro recebido",
    });

    expect(movement).toMatchObject({
      account_id: reserve.id,
      transfer_account_id: null,
      type: "income",
      category_id: "cat_income_other",
      notes: "account_movement:income",
    });
  });

  it("adds external income to a cash account without changing its type", async () => {
    installLocalStorage();
    const state = await readLocalDb();
    const wallet = account({ id: "wallet", name: "Carteira", type: "cash" });
    state.accounts = [wallet];
    await writeLocalDb(state);

    const movement = await createBalanceMovement({
      householdId: "household",
      userId: "user",
      accountId: wallet.id,
      kind: "income",
      amount: 100,
      date: "2026-06-18",
    });

    expect(movement).toMatchObject({ account_id: wallet.id, type: "income" });
    expect((await listAccounts("household"))[0].type).toBe("cash");
  });
});

describe("installment transactions", () => {
  it("creates one transaction per installment from quick input", async () => {
    installLocalStorage();
    const state = await readLocalDb();
    const card = account({ id: "card", name: "Cartão Itaú", type: "credit_card" });
    state.accounts = [card];
    await writeLocalDb(state);

    const { transactions } = await createTransactionsFromInput({
      input: "Notebook 1200 em 3x no Cartão Itaú",
      householdId: "household",
      userId: "user",
      context: {
        categories: state.categories,
        rules: [],
        accounts: [card],
        today: new Date("2026-06-18T12:00:00.000Z"),
      },
    });

    expect(transactions).toHaveLength(3);
    expect(transactions.map((transaction) => transaction.amount)).toEqual([400, 400, 400]);
    expect(transactions.map((transaction) => transaction.transaction_date)).toEqual(["2026-06-18", "2026-07-18", "2026-08-18"]);
    expect(transactions.map((transaction) => transaction.description)).toEqual(["Notebook no Cartão Itaú 1/3", "Notebook no Cartão Itaú 2/3", "Notebook no Cartão Itaú 3/3"]);
    expect(new Set(transactions.map((transaction) => transaction.installment_group_id)).size).toBe(1);
    expect(transactions.every((transaction) => transaction.payment_method === "credit_card")).toBe(true);
  });

  it("completes remaining installments from an existing manual transaction", async () => {
    installLocalStorage();
    const state = await readLocalDb();
    const previous: Transaction = {
      id: "azul-4",
      household_id: "household",
      account_id: null,
      transfer_account_id: null,
      category_id: "cat_expense_travel",
      created_by: "user",
      description: "Azul Linhas aéreas 4/12",
      normalized_description: "azul linhas aereas 4 12",
      amount: 272.7,
      type: "expense",
      transaction_date: "2026-05-10",
      payment_method: "credit_card",
      notes: null,
      source: "manual",
      recurrence_id: null,
      installment_group_id: null,
      installment_index: null,
      installment_total: null,
      installment_base_description: null,
      created_at: "2026-05-10T00:00:00.000Z",
      updated_at: "2026-05-10T00:00:00.000Z",
      deleted_at: null,
    };
    const transaction: Transaction = {
      id: "azul",
      household_id: "household",
      account_id: null,
      transfer_account_id: null,
      category_id: "cat_expense_travel",
      created_by: "user",
      description: "Azul Linhas aéreas 5/12",
      normalized_description: "azul linhas aereas 5 12",
      amount: 272.7,
      type: "expense",
      transaction_date: "2026-06-10",
      payment_method: "credit_card",
      notes: null,
      source: "manual",
      recurrence_id: null,
      installment_group_id: null,
      installment_index: null,
      installment_total: null,
      installment_base_description: null,
      created_at: "2026-06-10T00:00:00.000Z",
      updated_at: "2026-06-10T00:00:00.000Z",
      deleted_at: null,
    };
    state.transactions = [previous, transaction];
    await writeLocalDb(state);

    const created = await completeInstallmentsFromTransaction(transaction, 5, 12);
    const db = await readLocalDb();
    const groupId = db.transactions.find((item) => item.id === transaction.id)?.installment_group_id;
    const group = db.transactions.filter((item) => item.installment_group_id === groupId);

    expect(created).toHaveLength(7);
    expect(group).toHaveLength(9);
    expect(group.map((item) => item.installment_index)).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(group.map((item) => item.description)).toContain("Azul Linhas aéreas 12/12");
    expect(group.find((item) => item.installment_index === 6)?.transaction_date).toBe("2026-07-10");
  });
});

describe("recurring transactions", () => {
  it("links an existing transaction to a recurrence", async () => {
    installLocalStorage();
    const state = await readLocalDb();
    const transaction: Transaction = {
      id: "spotify",
      household_id: "household",
      account_id: null,
      transfer_account_id: null,
      category_id: "cat_expense_subscriptions",
      created_by: "user",
      description: "Spotify Premium",
      normalized_description: "spotify premium",
      amount: 21.9,
      type: "expense",
      transaction_date: "2026-06-10",
      payment_method: "cash",
      notes: null,
      source: "manual",
      recurrence_id: null,
      installment_group_id: null,
      installment_index: null,
      installment_total: null,
      installment_base_description: null,
      created_at: "2026-06-10T00:00:00.000Z",
      updated_at: "2026-06-10T00:00:00.000Z",
      deleted_at: null,
    };
    state.transactions = [transaction];
    await writeLocalDb(state);

    const recurrence = await createRecurrence({
      household_id: "household",
      account_id: null,
      category_id: "cat_expense_subscriptions",
      description: "Spotify Premium",
      amount: 21.9,
      type: "expense",
      frequency: "monthly",
      day_of_month: 10,
      next_due_date: "2026-07-10",
      active: true,
    });

    await linkTransactionToRecurrence(transaction, recurrence.id);
    const db = await readLocalDb();

    expect(db.transactions.find((item) => item.id === transaction.id)?.recurrence_id).toBe(recurrence.id);
  });

  it("materializes due recurring expenses and advances the next due date", async () => {
    installLocalStorage();
    const state = await readLocalDb();
    const card = account({ id: "card", name: "Cartão Itaú", type: "credit_card" });
    state.accounts = [card];
    await writeLocalDb(state);

    const recurrence = await createRecurrence({
      household_id: "household",
      account_id: card.id,
      category_id: "cat_expense_subscriptions",
      description: "Spotify Premium",
      amount: 21.9,
      type: "expense",
      frequency: "monthly",
      day_of_month: 10,
      next_due_date: "2026-05-10",
      active: true,
    });

    const created = await materializeDueRecurrences("household", "2026-07-12");
    const db = await readLocalDb();
    const updatedRecurrence = db.recurrences.find((item) => item.id === recurrence.id);

    expect(created).toHaveLength(3);
    expect(created.map((transaction) => transaction.transaction_date)).toEqual(["2026-05-10", "2026-06-10", "2026-07-10"]);
    expect(created.every((transaction) => transaction.recurrence_id === recurrence.id)).toBe(true);
    expect(created.every((transaction) => transaction.source === "recurring")).toBe(true);
    expect(created.every((transaction) => transaction.payment_method === "credit_card")).toBe(true);
    expect(updatedRecurrence?.next_due_date).toBe("2026-08-10");

    await expect(materializeDueRecurrences("household", "2026-07-12")).resolves.toHaveLength(0);
  });
});

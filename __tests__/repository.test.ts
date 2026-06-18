import { afterEach, describe, expect, it, vi } from "vitest";

import { Account, Transaction } from "@/domain/types";
import { readLocalDb, writeLocalDb } from "@/storage/db";
import { createBalanceMovement, listAccounts, reconcileDeletedAccountReferences } from "@/storage/repository";

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

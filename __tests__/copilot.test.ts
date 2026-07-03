import { describe, expect, it } from "vitest";

import { defaultCategories } from "@/domain/categories";
import { buildCopilotFinancialSnapshot } from "@/domain/copilot";
import type { Account, Budget, Recurrence, Transaction } from "@/domain/types";

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
  created_at: "2026-07-01T00:00:00.000Z",
  updated_at: "2026-07-01T00:00:00.000Z",
  deleted_at: null,
};

const tx = (overrides: Partial<Transaction>): Transaction => ({
  ...baseTransaction,
  id: overrides.id ?? "t",
  description: overrides.description ?? "Item",
  amount: overrides.amount ?? 0,
  type: overrides.type ?? "expense",
  transaction_date: overrides.transaction_date ?? "2026-07-10",
  category_id: overrides.category_id ?? "cat_expense_food",
  ...overrides,
});

describe("copilot financial snapshot", () => {
  it("summarizes current and next month planning context", () => {
    const checking: Account = {
      id: "checking",
      household_id: "h1",
      name: "Conta Corrente",
      type: "checking",
      initial_balance: 5000,
      currency: "BRL",
      credit_card_due_day: null,
      credit_card_best_purchase_day: null,
      created_at: "",
      updated_at: "",
      deleted_at: null,
    };
    const budgets: Budget[] = [
      {
        id: "food-budget",
        household_id: "h1",
        category_id: "cat_expense_food",
        month: "2026-07",
        amount: 1000,
        created_at: "",
        updated_at: "",
        deleted_at: null,
      },
    ];
    const recurrences: Recurrence[] = [
      {
        id: "internet",
        household_id: "h1",
        account_id: checking.id,
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
    ];

    const snapshot = buildCopilotFinancialSnapshot({
      accounts: [checking],
      budgets,
      categories: defaultCategories,
      messages: [{ id: "m1", role: "user", content: "Como estão minhas finanças?", createdAt: "" }],
      recurrences,
      transactions: [
        tx({ id: "salary", type: "income", amount: 8000, category_id: "cat_income_salary" }),
        tx({ id: "food", amount: 300, category_id: "cat_expense_food" }),
      ],
      today: new Date("2026-07-10T12:00:00.000Z"),
    });

    expect(snapshot.currentMonth).toBe("2026-07");
    expect(snapshot.nextMonth).toBe("2026-08");
    expect(snapshot.intent).toBe("general_review");
    expect(snapshot.context.historyMonths).toHaveLength(6);
    expect(snapshot.context.futureMonths).toHaveLength(3);
    expect(snapshot.context.currentMonth.income).toBe(8000);
    expect(snapshot.context.nextMonth.plannedBudget).toBe(1000);
    expect(snapshot.context.nextMonth.plannedExpenses).toBe(120);
    expect(snapshot.context.recurrences[0]).toMatchObject({ description: "Internet", amount: 120 });
  });

  it("expands the future window for purchase planning questions", () => {
    const snapshot = buildCopilotFinancialSnapshot({
      accounts: [],
      budgets: [],
      categories: defaultCategories,
      messages: [
        {
          id: "car",
          role: "user",
          content: "Quero comprar um carro de 80 mil. Quanto posso pagar de parcela?",
          createdAt: "",
        },
      ],
      recurrences: [],
      transactions: [],
      today: new Date("2026-07-10T12:00:00.000Z"),
    });

    expect(snapshot.intent).toBe("purchase_planning");
    expect(snapshot.context.historyMonths).toHaveLength(6);
    expect(snapshot.context.futureMonths).toHaveLength(6);
  });

  it("exposes future commitments from installments and recurrences", () => {
    const checking: Account = {
      id: "checking",
      household_id: "h1",
      name: "Conta Corrente",
      type: "checking",
      initial_balance: 5000,
      currency: "BRL",
      credit_card_due_day: null,
      credit_card_best_purchase_day: null,
      created_at: "",
      updated_at: "",
      deleted_at: null,
    };
    const recurrences: Recurrence[] = [
      {
        id: "internet",
        household_id: "h1",
        account_id: checking.id,
        category_id: "cat_expense_bills",
        description: "Internet",
        amount: 110,
        type: "expense",
        frequency: "monthly",
        day_of_month: 5,
        next_due_date: "2026-08-05",
        active: true,
        created_at: "",
        updated_at: "",
        deleted_at: null,
      },
    ];

    const snapshot = buildCopilotFinancialSnapshot({
      accounts: [checking],
      budgets: [],
      categories: defaultCategories,
      messages: [
        {
          id: "commitments",
          role: "user",
          content: "Quanto eu já tenho comprometido para os próximo meses em Parcelamentos e Recorrências?",
          createdAt: "",
        },
      ],
      recurrences,
      transactions: [
        tx({
          id: "azul-6",
          account_id: checking.id,
          description: "Azul Linhas aéreas 6/12",
          amount: 272.7,
          transaction_date: "2026-08-10",
          installment_group_id: "azul",
          installment_index: 6,
          installment_total: 12,
          installment_base_description: "Azul Linhas aéreas",
        }),
        tx({
          id: "azul-7",
          account_id: checking.id,
          description: "Azul Linhas aéreas 7/12",
          amount: 272.7,
          transaction_date: "2026-09-10",
          installment_group_id: "azul",
          installment_index: 7,
          installment_total: 12,
          installment_base_description: "Azul Linhas aéreas",
        }),
      ],
      today: new Date("2026-07-10T12:00:00.000Z"),
    });

    expect(snapshot.context.futureCommitments.range).toEqual({
      startMonth: "2026-08",
      endMonth: "2027-01",
    });
    expect(snapshot.context.futureCommitments.totals.installments).toBe(545.4);
    expect(snapshot.context.futureCommitments.totals.recurrences).toBe(660);
    expect(snapshot.context.futureCommitments.totals.total).toBe(1205.4);
    expect(snapshot.context.futureCommitments.byMonth[0]).toMatchObject({
      month: "2026-08",
      installmentTotal: 272.7,
      recurrenceTotal: 110,
      total: 382.7,
    });
    expect(snapshot.context.futureCommitments.installments[0]).toMatchObject({
      description: "Azul Linhas aéreas",
      installmentIndex: 6,
      installmentTotal: 12,
    });
  });

  it("sends decision support context for education and other high-impact choices", () => {
    const snapshot = buildCopilotFinancialSnapshot({
      accounts: [],
      budgets: [],
      categories: defaultCategories,
      messages: [
        {
          id: "school",
          role: "user",
          content: "Qual a melhor parcela de escola para meu filho?",
          createdAt: "",
        },
      ],
      recurrences: [],
      transactions: [
        tx({ id: "income-jun", type: "income", amount: 9000, transaction_date: "2026-06-05", category_id: "cat_income_salary" }),
        tx({ id: "expense-jun", amount: 6200, transaction_date: "2026-06-10" }),
        tx({ id: "income-jul", type: "income", amount: 9000, transaction_date: "2026-07-05", category_id: "cat_income_salary" }),
        tx({ id: "expense-jul", amount: 6500, transaction_date: "2026-07-10" }),
      ],
      today: new Date("2026-07-10T12:00:00.000Z"),
    });

    expect(snapshot.intent).toBe("life_decision");
    expect(snapshot.context.historyMonths).toHaveLength(12);
    expect(snapshot.context.futureMonths).toHaveLength(12);
    expect(snapshot.context.decisionSupport.conservativeMonthlyCapacity).toBe(2500);
    expect(snapshot.context.decisionSupport.rules.join(" ")).toContain("não invente valores");
    expect(snapshot.context.rawData.counts.transactions).toBe(4);
  });
});

import { describe, expect, it } from "vitest";

import {
  buildPrompt,
  compactSnapshotForPrompt,
  outputText,
  shouldEnableWebSearch,
} from "@/app/api/copilot/chat/route";
import type { CopilotFinancialSnapshot } from "@/domain/copilot";

describe("copilot chat route", () => {
  it("enables web search for external school research questions", () => {
    expect(
      shouldEnableWebSearch([
        {
          id: "m1",
          role: "user",
          content:
            "Pesquise informações sobre o colégio Maple Bear Paraíba e o colégio Motiva. Preciso decidir a escola do meu filho.",
          createdAt: "",
        },
      ]),
    ).toBe(true);
  });

  it("keeps web search disabled for internal finance questions", () => {
    expect(
      shouldEnableWebSearch([
        {
          id: "m1",
          role: "user",
          content: "Quanto eu já tenho comprometido nos próximos meses em parcelamentos e recorrências?",
          createdAt: "",
        },
      ]),
    ).toBe(false);
  });

  it("uses an ultra-compact financial snapshot when web search is enabled", () => {
    const transactions = Array.from({ length: 120 }, (_item, index) => ({
      id: `tx-${index}`,
      description: `Transaction ${index}`,
      amount: 10,
      type: "expense",
      date: "2026-07-10",
      category: "Compras",
      account: "Conta",
      paymentMethod: "cash",
      source: "manual",
      recurrenceId: null,
      installmentGroupId: null,
      installmentIndex: null,
      installmentTotal: null,
      installmentBaseDescription: null,
    }));
    const snapshot = {
      generatedAt: "2026-07-03T00:00:00.000Z",
      intent: "life_decision",
      currentMonth: "2026-07",
      nextMonth: "2026-08",
      summary: "Resumo",
      context: {
        currentMonth: {
          month: "2026-07",
          income: 10000,
          expense: 7000,
          balance: 3000,
          availableToSpend: 2000,
          reserveTotal: 10000,
          netWorth: 50000,
        },
        nextMonth: {
          month: "2026-08",
          plannedBudget: 7000,
          plannedExpenses: 1000,
          plannedFree: 6000,
        },
        historyMonths: Array.from({ length: 12 }, (_item, index) => ({
          month: `2026-${String(index + 1).padStart(2, "0")}`,
          income: 10000,
          expense: 7000,
          balance: 3000,
          availableToSpend: 2000,
          plannedExpenses: 1000,
          plannedFree: 6000,
        })),
        futureMonths: Array.from({ length: 12 }, (_item, index) => ({
          month: `2027-${String(index + 1).padStart(2, "0")}`,
          income: 0,
          expense: 0,
          balance: 0,
          availableToSpend: 2000,
          plannedExpenses: 1000,
          plannedFree: 6000,
        })),
        accounts: [],
        topCategories: [],
        categoryHistory: [],
        recurrences: [],
        futureCommitments: {
          range: { startMonth: "2026-08", endMonth: "2026-09" },
          totals: { installments: 0, recurrences: 0, total: 0 },
          byMonth: [],
          installments: [],
          recurrences: [],
          note: "",
        },
        decisionSupport: {
          averageMonthlyIncome: 10000,
          averageMonthlyExpenses: 7000,
          averageMonthlyBalance: 3000,
          worstMonthlyBalance: 2500,
          averageFutureCommitments: 1000,
          averagePlannedFree: 6000,
          conservativeMonthlyCapacity: 2500,
          activeHistoryMonths: 12,
        },
        rawData: {
          months: ["2026-07"],
          counts: {
            transactions: 120,
            budgets: 0,
            accounts: 0,
            recurrences: 0,
          },
          accounts: [],
          budgets: [],
          transactions,
          note: "raw",
        },
      },
    } as unknown as CopilotFinancialSnapshot;

    const compact = compactSnapshotForPrompt(snapshot, true);
    const prompt = buildPrompt(
      [
        {
          id: "search",
          role: "user",
          content: "Pesquise escolas na Paraíba",
          createdAt: "",
        },
      ],
      compact,
      true,
    );

    expect(compact).not.toHaveProperty("context");
    expect(compact).toHaveProperty("financeSummary");
    expect(JSON.stringify(compact)).not.toContain("Transaction 119");
    expect(prompt.length).toBeLessThan(9000);
  });

  it("extracts text from responses with tool output items", () => {
    expect(
      outputText({
        output: [
          { type: "web_search_call", status: "completed" },
          {
            type: "message",
            content: [
              {
                type: "output_text",
                text: "Resposta com fontes pesquisadas.",
                annotations: [],
              },
            ],
          },
        ],
      }),
    ).toBe("Resposta com fontes pesquisadas.");
  });

  it("extracts direct output_text responses", () => {
    expect(outputText({ output_text: "Resposta direta." })).toBe("Resposta direta.");
  });

  it("uses a shorter bounded-search prompt when web search is enabled", () => {
    const snapshot = {
      generatedAt: "2026-07-03T00:00:00.000Z",
      intent: "life_decision",
      currentMonth: "2026-07",
      nextMonth: "2026-08",
      summary: "Resumo",
      context: {},
    } as unknown as ReturnType<typeof compactSnapshotForPrompt>;

    const prompt = buildPrompt(
      [
        { id: "old", role: "user", content: "Pergunta antiga", createdAt: "" },
        { id: "a1", role: "assistant", content: "Resposta antiga", createdAt: "" },
        {
          id: "new",
          role: "user",
          content: "Pesquise escolas na Paraíba",
          createdAt: "",
        },
      ],
      snapshot,
      true,
    );

    expect(prompt).toContain("faça no máximo 4 buscas web");
    expect(prompt).toContain("Pesquise escolas na Paraíba");
    expect(prompt).not.toContain("Pergunta antiga");
    expect(prompt).not.toContain("Resposta antiga");
  });
});

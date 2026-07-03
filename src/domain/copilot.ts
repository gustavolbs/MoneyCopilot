import {
  calculateAccountBalances,
  effectiveBudgetsForMonth,
  isReserveMovement,
  metricsForMonth,
  plannedExpensesForMonth,
} from "@/domain/finance";
import { formatCurrency, formatMonthYear, monthKey } from "@/domain/normalize";
import type { Account, Budget, Category, Recurrence, Transaction } from "@/domain/types";

export type CopilotChatRole = "user" | "assistant";

export type CopilotChatMessage = {
  id: string;
  role: CopilotChatRole;
  content: string;
  createdAt: string;
};

export type CopilotChat = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: CopilotChatMessage[];
};

export type CopilotIntent =
  | "general_review"
  | "purchase_planning"
  | "best_time_to_buy"
  | "budget_planning"
  | "life_decision"
  | "current_status";

export type CopilotFinancialSnapshot = {
  generatedAt: string;
  intent: CopilotIntent;
  currentMonth: string;
  nextMonth: string;
  summary: string;
  context: {
    currentMonth: ReturnType<typeof monthSummary>;
    nextMonth: ReturnType<typeof monthSummary>;
    historyMonths: ReturnType<typeof monthSummary>[];
    futureMonths: ReturnType<typeof monthSummary>[];
    accounts: Array<{ name: string; type: Account["type"]; balance: number }>;
    topCategories: Array<{ name: string; amount: number; percent: number }>;
    categoryHistory: Array<{ month: string; categories: Array<{ name: string; amount: number; percent: number }> }>;
    recurrences: Array<{ description: string; amount: number; frequency: Recurrence["frequency"]; nextDueDate: string }>;
    futureCommitments: ReturnType<typeof futureCommitmentsSummary>;
    decisionSupport: ReturnType<typeof decisionSupportSummary>;
    rawData: ReturnType<typeof rawFinancialData>;
  };
};

type SnapshotInput = {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  recurrences: Recurrence[];
  accounts: Account[];
  today?: Date;
  messages?: CopilotChatMessage[];
};

type FutureCommitmentItem =
  | {
      kind: "installment";
      description: string;
      amount: number;
      date: string;
      month: string;
      installmentIndex: number | null;
      installmentTotal: number;
      groupId: string | null;
    }
  | {
      kind: "recurrence";
      description: string;
      amount: number;
      date: string;
      month: string;
    };

function addMonths(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function detectIntent(messages: CopilotChatMessage[] = []): CopilotIntent {
  const text = messages
    .filter((message) => message.role === "user")
    .slice(-4)
    .map((message) => message.content)
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (/\b(escola|colegio|faculdade|filho|filha|educacao|saude|plano de saude|medico|terapia|investiment|aposentadoria)\w*\b/.test(text)) return "life_decision";
  if (/\b(carro|veiculo|financi|entrada|parcela|parcelament|consorcio)\w*\b/.test(text)) return "purchase_planning";
  if (/\b(celular|iphone|tv|televisao|comprar|compra|melhor momento|quando)\b/.test(text)) return "best_time_to_buy";
  if (/\b(proximo mes|orcamento|planejar|planejamento|quanto gastar|gastos planejados)\b/.test(text)) return "budget_planning";
  if (/\b(analise|analisar|andam|historico|gastando muito|melhorar|financas|saude financeira)\b/.test(text)) return "general_review";
  return "current_status";
}

function contextWindow(intent: CopilotIntent) {
  if (intent === "general_review") return { history: 6, future: 3 };
  if (intent === "purchase_planning" || intent === "best_time_to_buy") return { history: 6, future: 6 };
  if (intent === "life_decision") return { history: 12, future: 12 };
  if (intent === "budget_planning") return { history: 3, future: 6 };
  return { history: 2, future: 2 };
}

function monthSummary(input: SnapshotInput, month: string) {
  const metrics = metricsForMonth(
    input.transactions,
    input.categories,
    month,
    input.recurrences,
    input.accounts,
  );
  const budgets = effectiveBudgetsForMonth(input.budgets, month);
  const plannedExpenses = plannedExpensesForMonth(
    input.transactions,
    input.recurrences,
    month,
    input.accounts,
  );
  const plannedBudget = budgets.reduce((sum, budget) => sum + budget.amount, 0);
  return {
    month,
    label: formatMonthYear(month),
    income: metrics.income,
    expense: metrics.expense,
    balance: metrics.balance,
    availableToSpend: metrics.availableToSpend,
    reserveTotal: metrics.reserveTotal,
    netWorth: metrics.netWorth,
    plannedBudget,
    plannedExpenses: plannedExpenses.total,
    plannedFree: plannedBudget - plannedExpenses.total,
    budgetCount: budgets.length,
    transactionPlanned: plannedExpenses.transactionTotal,
    recurringPlanned: plannedExpenses.recurrenceTotal,
  };
}

function installmentInfo(transaction: Transaction) {
  const explicitIndex = transaction.installment_index;
  const explicitTotal = transaction.installment_total;
  const notesMatch = transaction.notes?.match(/installment:(\d+)\/(\d+)/i);
  const descriptionMatch = transaction.description.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  const index = explicitIndex ?? (notesMatch ? Number(notesMatch[1]) : descriptionMatch ? Number(descriptionMatch[1]) : null);
  const total = explicitTotal ?? (notesMatch ? Number(notesMatch[2]) : descriptionMatch ? Number(descriptionMatch[2]) : null);

  if (!total || total <= 1) return null;

  return {
    index,
    total,
    baseDescription:
      transaction.installment_base_description ??
      transaction.description.replace(/\s*\b\d{1,2}\/\d{1,2}\b\s*/g, " ").trim(),
    groupId: transaction.installment_group_id,
  };
}

function futureCommitmentsSummary(input: SnapshotInput, months: string[]) {
  const transactionsById = new Map(input.transactions.map((transaction) => [transaction.id, transaction]));
  const byMonth = months.map((month) => {
    const planned = plannedExpensesForMonth(input.transactions, input.recurrences, month, input.accounts);
    const items: FutureCommitmentItem[] = planned.items.flatMap((item): FutureCommitmentItem[] => {
      if (item.source === "recurrence") {
        return [
          {
            kind: "recurrence" as const,
            description: item.description,
            amount: item.amount,
            date: item.date,
            month,
          },
        ];
      }

      const transactionId = item.id.startsWith("transaction-") ? item.id.slice("transaction-".length) : null;
      const transaction = transactionId ? transactionsById.get(transactionId) : null;
      const installment = transaction ? installmentInfo(transaction) : null;
      if (!transaction || !installment || isReserveMovement(transaction, input.accounts)) return [];

      return [
        {
          kind: "installment" as const,
          description: installment.baseDescription || item.description,
          amount: item.amount,
          date: item.date,
          month,
          installmentIndex: installment.index,
          installmentTotal: installment.total,
          groupId: installment.groupId,
        },
      ];
    });
    const installmentTotal = items
      .filter((item): item is Extract<FutureCommitmentItem, { kind: "installment" }> => item.kind === "installment")
      .reduce((sum, item) => sum + item.amount, 0);
    const recurrenceTotal = items
      .filter((item): item is Extract<FutureCommitmentItem, { kind: "recurrence" }> => item.kind === "recurrence")
      .reduce((sum, item) => sum + item.amount, 0);

    return {
      month,
      label: formatMonthYear(month),
      installmentTotal,
      recurrenceTotal,
      total: installmentTotal + recurrenceTotal,
      items,
    };
  });

  const installments = byMonth.flatMap((month) =>
    month.items.filter((item): item is Extract<FutureCommitmentItem, { kind: "installment" }> => item.kind === "installment"),
  );
  const recurrences = byMonth.flatMap((month) =>
    month.items.filter((item): item is Extract<FutureCommitmentItem, { kind: "recurrence" }> => item.kind === "recurrence"),
  );

  return {
    range: {
      startMonth: months[0] ?? null,
      endMonth: months.at(-1) ?? null,
    },
    totals: {
      installments: installments.reduce((sum, item) => sum + item.amount, 0),
      recurrences: recurrences.reduce((sum, item) => sum + item.amount, 0),
      total: byMonth.reduce((sum, month) => sum + month.total, 0),
    },
    byMonth,
    installments,
    recurrences,
    note:
      "Compromissos futuros considera parcelas já materializadas como transações futuras e ocorrências de recorrências ainda não materializadas dentro da janela enviada.",
  };
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function decisionSupportSummary(
  historyMonths: ReturnType<typeof monthSummary>[],
  futureMonths: ReturnType<typeof monthSummary>[],
  futureCommitments: ReturnType<typeof futureCommitmentsSummary>,
) {
  const activeHistoryMonths = historyMonths.filter(
    (month) => month.income > 0 || month.expense > 0 || month.plannedExpenses > 0,
  );
  const monthsForCapacity = activeHistoryMonths.length ? activeHistoryMonths : historyMonths;
  const incomeValues = monthsForCapacity.map((month) => month.income).filter((value) => value > 0);
  const expenseValues = monthsForCapacity.map((month) => month.expense).filter((value) => value > 0);
  const balanceValues = monthsForCapacity.map((month) => month.balance);
  const plannedFreeValues = futureMonths.map((month) => month.plannedFree);
  const averageMonthlyIncome = average(incomeValues);
  const averageMonthlyExpenses = average(expenseValues);
  const averageMonthlyBalance = average(balanceValues);
  const worstMonthlyBalance = balanceValues.length ? Math.min(...balanceValues) : 0;
  const averageFutureCommitments = average(futureCommitments.byMonth.map((month) => month.total));
  const averagePlannedFree = average(plannedFreeValues);
  const conservativeMonthlyCapacity = Math.max(
    0,
    Math.min(
      averageMonthlyBalance,
      averagePlannedFree || averageMonthlyBalance,
      worstMonthlyBalance > 0 ? worstMonthlyBalance : averageMonthlyBalance,
    ),
  );

  return {
    averageMonthlyIncome,
    averageMonthlyExpenses,
    averageMonthlyBalance,
    worstMonthlyBalance,
    averageFutureCommitments,
    averagePlannedFree,
    conservativeMonthlyCapacity,
    activeHistoryMonths: activeHistoryMonths.length,
    rules: [
      "Use conservativeMonthlyCapacity como teto inicial para uma nova obrigação mensal recorrente.",
      "Para decisões de educação, saúde e investimentos, não trate o menor preço como melhor escolha; avalie qualidade, risco, recorrência, reajuste e impacto no fluxo.",
      "Se a pergunta depender de preços locais ou cotações externas que não estão no contexto, não invente valores. Peça a faixa real ou trabalhe com cenários informados pelo usuário.",
      "Separe claramente dados reais do app, hipóteses e informações externas ausentes.",
    ],
  };
}

function categoryName(categories: Category[], categoryId: string | null) {
  if (!categoryId) return null;
  return categories.find((category) => category.id === categoryId)?.name ?? categoryId;
}

function accountName(accounts: Account[], accountId: string | null) {
  if (!accountId) return null;
  return accounts.find((account) => account.id === accountId)?.name ?? accountId;
}

function rawFinancialData(
  input: SnapshotInput,
  months: string[],
) {
  const monthSet = new Set(months);
  const transactions = input.transactions
    .filter((transaction) => {
      if (transaction.deleted_at) return false;
      return monthSet.has(transaction.transaction_date.slice(0, 7));
    })
    .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date))
    .map((transaction) => ({
      id: transaction.id,
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      date: transaction.transaction_date,
      category: categoryName(input.categories, transaction.category_id),
      account: accountName(input.accounts, transaction.account_id),
      paymentMethod: transaction.payment_method,
      source: transaction.source,
      recurrenceId: transaction.recurrence_id,
      installmentGroupId: transaction.installment_group_id,
      installmentIndex: transaction.installment_index,
      installmentTotal: transaction.installment_total,
      installmentBaseDescription: transaction.installment_base_description,
    }));
  const budgets = input.budgets
    .filter((budget) => !budget.deleted_at && monthSet.has(budget.month))
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((budget) => ({
      month: budget.month,
      category: categoryName(input.categories, budget.category_id),
      amount: budget.amount,
    }));

  return {
    months,
    counts: {
      transactions: transactions.length,
      budgets: budgets.length,
      accounts: input.accounts.filter((account) => !account.deleted_at).length,
      recurrences: input.recurrences.filter((recurrence) => recurrence.active && !recurrence.deleted_at).length,
    },
    accounts: input.accounts
      .filter((account) => !account.deleted_at)
      .map((account) => ({
        name: account.name,
        type: account.type,
        initialBalance: account.initial_balance,
        creditCardDueDay: account.credit_card_due_day,
        creditCardBestPurchaseDay: account.credit_card_best_purchase_day,
      })),
    budgets,
    transactions,
    note:
      "Transações brutas limitadas à janela de histórico/projeção enviada. Use para conferir categorias, recorrências, parcelas e comportamento real antes de recomendar decisões.",
  };
}

export function buildCopilotFinancialSnapshot(input: SnapshotInput): CopilotFinancialSnapshot {
  const today = input.today ?? new Date();
  const intent = detectIntent(input.messages);
  const window = contextWindow(intent);
  const currentMonth = monthKey(today);
  const nextMonth = monthKey(addMonths(today, 1));
  const current = monthSummary(input, currentMonth);
  const next = monthSummary(input, nextMonth);
  const historyMonths = Array.from({ length: window.history }, (_item, index) =>
    monthSummary(input, monthKey(addMonths(today, index - window.history + 1))),
  );
  const futureMonths = Array.from({ length: window.future }, (_item, index) =>
    monthSummary(input, monthKey(addMonths(today, index + 1))),
  );
  const futureCommitments = futureCommitmentsSummary(
    input,
    futureMonths.map((month) => month.month),
  );
  const decisionSupport = decisionSupportSummary(historyMonths, futureMonths, futureCommitments);
  const rawData = rawFinancialData(
    input,
    [...historyMonths.map((month) => month.month), currentMonth, ...futureMonths.map((month) => month.month)],
  );
  const accounts = calculateAccountBalances(input.transactions, input.accounts)
    .filter(({ account }) => !account.deleted_at)
    .map(({ account, balance }) => ({ name: account.name, type: account.type, balance }))
    .sort((a, b) => b.balance - a.balance);
  const currentMetrics = metricsForMonth(
    input.transactions,
    input.categories,
    currentMonth,
    input.recurrences,
    input.accounts,
  );
  const topCategories = currentMetrics.byCategory.slice(0, 8).map((item) => ({
    name: item.category.name,
    amount: item.amount,
    percent: item.percent,
  }));
  const categoryHistory = historyMonths.map((month) => {
    const metrics = metricsForMonth(
      input.transactions,
      input.categories,
      month.month,
      input.recurrences,
      input.accounts,
    );
    return {
      month: month.month,
      categories: metrics.byCategory.slice(0, 6).map((item) => ({
        name: item.category.name,
        amount: item.amount,
        percent: item.percent,
      })),
    };
  });
  const recurrences = input.recurrences
    .filter((recurrence) => recurrence.active && !recurrence.deleted_at)
    .sort((a, b) => a.next_due_date.localeCompare(b.next_due_date))
    .slice(0, 12)
    .map((recurrence) => ({
      description: recurrence.description,
      amount: recurrence.amount,
      frequency: recurrence.frequency,
      nextDueDate: recurrence.next_due_date,
    }));

  return {
    generatedAt: today.toISOString(),
    intent,
    currentMonth,
    nextMonth,
    summary: [
      `Intenção detectada: ${intent}.`,
      `Mês atual (${current.label}): receita ${formatCurrency(current.income)}, despesa ${formatCurrency(current.expense)}, saldo ${formatCurrency(current.balance)}.`,
      `Disponível hoje: ${formatCurrency(current.availableToSpend)}. Reservas: ${formatCurrency(current.reserveTotal)}. Patrimônio líquido: ${formatCurrency(current.netWorth)}.`,
      `Próximo mês (${next.label}): orçamento ${formatCurrency(next.plannedBudget)}, gastos já planejados ${formatCurrency(next.plannedExpenses)}, livre para planejar ${formatCurrency(next.plannedFree)}.`,
      `Compromissos futuros enviados: parcelamentos ${formatCurrency(futureCommitments.totals.installments)}, recorrências ${formatCurrency(futureCommitments.totals.recurrences)}, total ${formatCurrency(futureCommitments.totals.total)}.`,
      `Capacidade mensal conservadora para nova obrigação: ${formatCurrency(decisionSupport.conservativeMonthlyCapacity)}.`,
      `Contexto enviado: ${historyMonths.length} mês(es) de histórico, mês atual e ${futureMonths.length} mês(es) de projeção.`,
    ].join(" "),
    context: {
      currentMonth: current,
      nextMonth: next,
      historyMonths,
      futureMonths,
      accounts,
      topCategories,
      categoryHistory,
      recurrences,
      futureCommitments,
      decisionSupport,
      rawData,
    },
  };
}

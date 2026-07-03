import { Account, Budget, Category, Recurrence, Transaction } from "./types";

export type DashboardMetrics = {
  income: number;
  expense: number;
  balance: number;
  left: number;
  fixedExpense: number;
  variableExpense: number;
  projectedClose: number;
  availableToSpend: number;
  reserveTotal: number;
  netWorth: number;
  accountBalances: Array<{ account: Account; balance: number }>;
  byCategory: Array<{ category: Category; amount: number; percent: number }>;
  largestExpenses: Transaction[];
};

export type PlannedExpenseItem = {
  id: string;
  description: string;
  amount: number;
  date: string;
  source: "transaction" | "recurrence";
};

export type PlannedExpenses = {
  items: PlannedExpenseItem[];
  transactionTotal: number;
  recurrenceTotal: number;
  total: number;
};

const activeTransactions = (transactions: Transaction[]) =>
  transactions.filter((item) => !item.deleted_at);

function addDaysToISODate(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const target = new Date(year, month - 1, day + days);
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;
}

function addMonthsToISODate(date: string, months: number) {
  const [year, month, day] = date.split("-").map(Number);
  const target = new Date(year, month - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;
}

function nextRecurrenceDate(date: string, frequency: Recurrence["frequency"]) {
  if (frequency === "weekly") return addDaysToISODate(date, 7);
  if (frequency === "yearly") return addMonthsToISODate(date, 12);
  return addMonthsToISODate(date, 1);
}

function lastDayOfMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function transactionEffectiveDate(
  transaction: Transaction,
  accounts: Account[] = [],
) {
  if (
    transaction.type !== "expense" ||
    transaction.payment_method !== "credit_card"
  )
    return transaction.transaction_date;

  const card = accounts.find(
    (account) =>
      account.id === transaction.account_id && account.type === "credit_card",
  );
  const dueDay = card?.credit_card_due_day;
  const bestPurchaseDay = card?.credit_card_best_purchase_day;
  if (!dueDay || !bestPurchaseDay) return transaction.transaction_date;

  const [year, month, purchaseDay] = transaction.transaction_date
    .split("-")
    .map(Number);
  let monthOffset: number;
  if (bestPurchaseDay <= dueDay) {
    monthOffset = purchaseDay < bestPurchaseDay ? 0 : 1;
  } else if (purchaseDay <= dueDay) {
    monthOffset = 0;
  } else {
    monthOffset = purchaseDay < bestPurchaseDay ? 1 : 2;
  }
  const dueMonthIndex = month - 1 + monthOffset;
  const dueDate = new Date(
    year,
    dueMonthIndex,
    Math.min(dueDay, lastDayOfMonth(year, dueMonthIndex)),
  );
  return `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`;
}

export function transactionMonth(
  transaction: Transaction,
  accounts: Account[] = [],
) {
  return transactionEffectiveDate(transaction, accounts).slice(0, 7);
}

export function transactionBelongsToMonth(
  transaction: Transaction,
  month: string,
  accounts: Account[] = [],
) {
  return transactionMonth(transaction, accounts) === month;
}

function isPatrimonialAdjustment(transaction: Transaction, accounts: Account[] = []) {
  if (transaction.type !== 'income' && transaction.type !== 'expense') return false;
  const account = accounts.find((item) => item.id === transaction.account_id);
  const isPatrimonialAccount = account?.type === 'reserve' || account?.type === 'investment';
  const isPositionAdjustment = transaction.notes?.startsWith('reserve_movement:position') || transaction.notes?.startsWith('account_movement:position');
  const isYieldAdjustment = isPatrimonialAccount && transaction.category_id === 'cat_income_yield';
  return Boolean(isPositionAdjustment || isYieldAdjustment);
}

export function reservePositionDelta(currentBalance: number, reportedPosition: number) {
  return Math.round((reportedPosition - currentBalance) * 100) / 100;
}

export function reserveMovementDelta(transaction: Transaction, reserveAccountId: string) {
  if (transaction.type === 'transfer') {
    const incoming = transaction.transfer_account_id === reserveAccountId ? transaction.amount : 0;
    const outgoing = transaction.account_id === reserveAccountId ? transaction.amount : 0;
    return incoming - outgoing;
  }
  if (transaction.account_id !== reserveAccountId) return 0;
  if (transaction.type === 'income') return transaction.amount;
  if (transaction.type === 'expense') return -transaction.amount;
  return 0;
}

export function isReserveMovement(transaction: Transaction, accounts: Account[] = []) {
  const reserveIds = new Set(accounts.filter((account) => account.type === 'reserve').map((account) => account.id));
  return Boolean(
    (transaction.account_id && reserveIds.has(transaction.account_id)) ||
    (transaction.transfer_account_id && reserveIds.has(transaction.transfer_account_id)),
  );
}

export function metricsForMonth(
  transactions: Transaction[],
  categories: Category[],
  month: string,
  recurrences: Recurrence[] = [],
  accounts: Account[] = [],
): DashboardMetrics {
  const monthTransactions = activeTransactions(transactions).filter((item) =>
    transactionBelongsToMonth(item, month, accounts),
  );
  const income = monthTransactions
    .filter((item) => item.type === "income" && !isPatrimonialAdjustment(item, accounts))
    .reduce((sum, item) => sum + item.amount, 0);
  const expense = monthTransactions
    .filter((item) => item.type === "expense" && !isPatrimonialAdjustment(item, accounts))
    .reduce((sum, item) => sum + item.amount, 0);
  const recurringProjection = recurrences
    .filter(
      (item) =>
        item.active && !item.deleted_at && item.next_due_date.startsWith(month),
    )
    .reduce(
      (sum, item) =>
        sum + (item.type === "expense" ? item.amount : -item.amount),
      0,
    );
  const byCategoryRaw = new Map<string, number>();
  monthTransactions
    .filter((item) => item.type === "expense" && !isPatrimonialAdjustment(item, accounts))
    .forEach((item) => {
      const key = item.category_id ?? "cat_expense_other";
      byCategoryRaw.set(key, (byCategoryRaw.get(key) ?? 0) + item.amount);
    });
  const byCategory = [...byCategoryRaw.entries()]
    .map(([categoryId, amount]) => ({
      category:
        categories.find((item) => item.id === categoryId) ??
        categories.find((item) => item.id === "cat_expense_other") ??
        categories[0],
      amount,
      percent: expense > 0 ? amount / expense : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const fixedExpense = monthTransactions
    .filter(
      (item) =>
        item.type === "expense" &&
        !isPatrimonialAdjustment(item, accounts) &&
        (item.source === "recurring" || item.recurrence_id),
    )
    .reduce((sum, item) => sum + item.amount, 0);
  const variableExpense = Math.max(expense - fixedExpense, 0);
  const accountBalances = calculateAccountBalances(transactions, accounts);
  const availableToSpend = accountBalances
    .filter(
      ({ account }) =>
        account.type === "checking" ||
        account.type === "cash" ||
        account.type === "other",
    )
    .reduce((sum, item) => sum + item.balance, 0);
  const reserveTotal = accountBalances
    .filter(({ account }) => account.type === "reserve")
    .reduce((sum, item) => sum + item.balance, 0);
  const netWorth = accountBalances
    .filter(({ account }) => account.type !== "credit_card")
    .reduce((sum, item) => sum + item.balance, 0);

  return {
    income,
    expense,
    balance: income - expense,
    left: income - expense,
    fixedExpense,
    variableExpense,
    projectedClose: income - expense - recurringProjection,
    availableToSpend,
    reserveTotal,
    netWorth,
    accountBalances,
    byCategory,
    largestExpenses: monthTransactions
      .filter((item) => item.type === "expense" && !isPatrimonialAdjustment(item, accounts))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5),
  };
}

export function calculateAccountBalances(
  transactions: Transaction[],
  accounts: Account[],
) {
  const balances = new Map(
    accounts.map((account) => [account.id, account.initial_balance]),
  );
  const defaultAccount =
    accounts.find((account) => account.type === "checking") ?? accounts[0];

  for (const transaction of activeTransactions(transactions)) {
    const accountId = transaction.account_id ?? defaultAccount?.id ?? null;
    if (transaction.type === "income" && accountId) {
      balances.set(
        accountId,
        (balances.get(accountId) ?? 0) + transaction.amount,
      );
    }
    if (transaction.type === "expense" && accountId) {
      balances.set(
        accountId,
        (balances.get(accountId) ?? 0) - transaction.amount,
      );
    }
    if (transaction.type === "transfer") {
      const sourceId = accountId;
      const destinationId = transaction.transfer_account_id;
      if (sourceId)
        balances.set(
          sourceId,
          (balances.get(sourceId) ?? 0) - transaction.amount,
        );
      if (destinationId)
        balances.set(
          destinationId,
          (balances.get(destinationId) ?? 0) + transaction.amount,
        );
    }
  }

  return accounts.map((account) => ({
    account,
    balance: balances.get(account.id) ?? account.initial_balance,
  }));
}

export function effectiveBudgetsForMonth(
  budgets: Budget[],
  month: string,
): Budget[] {
  const latestByCategory = new Map<string, Budget>();

  for (const budget of budgets.filter((item) => !item.deleted_at && item.month <= month)) {
    const current = latestByCategory.get(budget.category_id);
    if (
      !current ||
      budget.month > current.month ||
      (budget.month === current.month && budget.updated_at > current.updated_at)
    ) {
      latestByCategory.set(budget.category_id, budget);
    }
  }

  return [...latestByCategory.values()]
    .map((budget) => ({ ...budget, month }))
    .sort((a, b) => a.category_id.localeCompare(b.category_id));
}

export function plannedExpensesForMonth(
  transactions: Transaction[],
  recurrences: Recurrence[],
  month: string,
  accounts: Account[] = [],
): PlannedExpenses {
  const monthStart = `${month}-01`;
  const monthEndDate = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0);
  const monthEnd = `${month}-${String(monthEndDate.getDate()).padStart(2, "0")}`;
  const transactionItems = activeTransactions(transactions)
    .filter(
      (transaction) =>
        transaction.type === "expense" &&
        !isReserveMovement(transaction, accounts) &&
        !isPatrimonialAdjustment(transaction, accounts) &&
        transactionBelongsToMonth(transaction, month, accounts),
    )
    .map((transaction): PlannedExpenseItem => ({
      id: `transaction-${transaction.id}`,
      description: transaction.description,
      amount: transaction.amount,
      date: transactionEffectiveDate(transaction, accounts),
      source: "transaction",
    }));

  const recurringItems: PlannedExpenseItem[] = [];
  for (const recurrence of recurrences.filter((item) => item.active && !item.deleted_at && item.type === "expense")) {
    let dueDate = recurrence.next_due_date;
    let guard = 0;
    while (dueDate < monthStart && guard < 120) {
      dueDate = nextRecurrenceDate(dueDate, recurrence.frequency);
      guard += 1;
    }
    while (dueDate <= monthEnd && guard < 120) {
      const alreadyMaterialized = activeTransactions(transactions).some(
        (transaction) =>
          transaction.recurrence_id === recurrence.id &&
          transaction.transaction_date === dueDate,
      );
      if (!alreadyMaterialized) {
        recurringItems.push({
          id: `recurrence-${recurrence.id}-${dueDate}`,
          description: recurrence.description,
          amount: recurrence.amount,
          date: dueDate,
          source: "recurrence",
        });
      }
      dueDate = nextRecurrenceDate(dueDate, recurrence.frequency);
      guard += 1;
    }
  }

  const items = [...transactionItems, ...recurringItems].sort((a, b) => a.date.localeCompare(b.date));
  const transactionTotal = transactionItems.reduce((sum, item) => sum + item.amount, 0);
  const recurrenceTotal = recurringItems.reduce((sum, item) => sum + item.amount, 0);
  return {
    items,
    transactionTotal,
    recurrenceTotal,
    total: transactionTotal + recurrenceTotal,
  };
}

export function budgetProgress(
  transactions: Transaction[],
  budget: Budget,
  accounts: Account[] = [],
): { spent: number; percent: number; status: "ok" | "warning" | "over" } {
  const spent = activeTransactions(transactions)
    .filter(
      (item) =>
        item.type === "expense" &&
        item.category_id === budget.category_id &&
        transactionBelongsToMonth(item, budget.month, accounts),
    )
    .reduce((sum, item) => sum + item.amount, 0);
  return {
    spent,
    percent: budget.amount > 0 ? spent / budget.amount : 0,
    status:
      spent >= budget.amount
        ? "over"
        : spent >= budget.amount * 0.8
          ? "warning"
          : "ok",
  };
}

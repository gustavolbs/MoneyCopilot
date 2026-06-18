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

export const activeTransactions = (transactions: Transaction[]) =>
  transactions.filter((item) => !item.deleted_at);

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

export function isPatrimonialIncome(transaction: Transaction, accounts: Account[] = []) {
  if (transaction.type !== 'income' || transaction.category_id !== 'cat_income_yield') return false;
  const account = accounts.find((item) => item.id === transaction.account_id);
  return account?.type === 'reserve' || account?.type === 'investment';
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
    .filter((item) => item.type === "income" && !isPatrimonialIncome(item, accounts))
    .reduce((sum, item) => sum + item.amount, 0);
  const expense = monthTransactions
    .filter((item) => item.type === "expense")
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
    .filter((item) => item.type === "expense")
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
  const netWorth = accountBalances.reduce((sum, item) => sum + item.balance, 0);

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
      .filter((item) => item.type === "expense")
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

export function budgetProgress(
  transactions: Transaction[],
  budget: Budget,
  accounts: Account[] = [],
) {
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

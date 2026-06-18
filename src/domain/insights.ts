import { budgetProgress, metricsForMonth, transactionBelongsToMonth } from './finance';
import { formatCurrency } from './normalize';
import { Account, Budget, Category, Recurrence, Transaction } from './types';

export type Insight = {
  id: string;
  title: string;
  body: string;
  tone: 'good' | 'warning' | 'info';
  percentage?: number;
  comparison?: string;
};

function offsetMonth(month: string, offset: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(year, monthNumber - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function percentageChange(current: number, previous: number) {
  return previous > 0 ? ((current - previous) / previous) * 100 : null;
}

export function generateInsights(params: {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  recurrences: Recurrence[];
  accounts?: Account[];
  month: string;
  previousMonth: string;
}) {
  const { transactions, categories, budgets, recurrences, accounts = [], month, previousMonth } = params;
  const insights: Insight[] = [];
  const currentMetrics = metricsForMonth(transactions, categories, month, recurrences, accounts);
  const previousMetrics = metricsForMonth(transactions, categories, previousMonth, recurrences, accounts);
  const previousThreeMetrics = [-1, -2, -3].map((offset) => metricsForMonth(transactions, categories, offsetMonth(month, offset), recurrences, accounts));
  const previousMonthsWithExpenses = previousThreeMetrics.filter((metrics) => metrics.expense > 0);
  const previousThreeExpenseAverage = previousMonthsWithExpenses.length
    ? previousMonthsWithExpenses.reduce((sum, metrics) => sum + metrics.expense, 0) / previousMonthsWithExpenses.length
    : 0;
  const expenseChange = percentageChange(currentMetrics.expense, previousMetrics.expense);
  const incomeChange = percentageChange(currentMetrics.income, previousMetrics.income);
  const averageChange = percentageChange(currentMetrics.expense, previousThreeExpenseAverage);

  if (expenseChange !== null) {
    insights.push({
      id: 'expense-month-comparison',
      title: `Despesas ${expenseChange <= 0 ? 'diminuiram' : 'aumentaram'} ${Math.abs(Math.round(expenseChange))}%`,
      body: `${formatCurrency(currentMetrics.expense)} neste mês contra ${formatCurrency(previousMetrics.expense)} no mês anterior.`,
      tone: expenseChange <= 0 ? 'good' : 'warning',
      percentage: expenseChange,
      comparison: 'vs. mês anterior',
    });
  }

  if (incomeChange !== null) {
    insights.push({
      id: 'income-month-comparison',
      title: `Receitas ${incomeChange >= 0 ? 'aumentaram' : 'diminuiram'} ${Math.abs(Math.round(incomeChange))}%`,
      body: `${formatCurrency(currentMetrics.income)} neste mês contra ${formatCurrency(previousMetrics.income)} no mês anterior.`,
      tone: incomeChange >= 0 ? 'good' : 'warning',
      percentage: incomeChange,
      comparison: 'vs. mês anterior',
    });
  }

  if (averageChange !== null) {
    insights.push({
      id: 'expense-three-month-average',
      title: `${Math.abs(Math.round(averageChange))}% ${averageChange <= 0 ? 'abaixo' : 'acima'} da média recente`,
      body: `Média de despesas dos ${previousMonthsWithExpenses.length} meses anteriores com dados: ${formatCurrency(previousThreeExpenseAverage)}.`,
      tone: averageChange <= 0 ? 'good' : 'warning',
      percentage: averageChange,
      comparison: 'vs. média de 3 meses',
    });
  }

  if (currentMetrics.income > 0) {
    const savingsRate = (currentMetrics.balance / currentMetrics.income) * 100;
    insights.push({
      id: 'monthly-savings-rate',
      title: `Taxa de economia em ${Math.round(savingsRate)}%`,
      body: `${formatCurrency(currentMetrics.balance)} de saldo sobre ${formatCurrency(currentMetrics.income)} em receitas.`,
      tone: savingsRate >= 0 ? 'good' : 'warning',
      percentage: savingsRate,
      comparison: 'da receita mensal',
    });
  }
  const expenseFor = (categoryId: string, key: string) =>
    transactions
      .filter((item) => !item.deleted_at && item.type === 'expense' && item.category_id === categoryId && transactionBelongsToMonth(item, key, accounts))
      .reduce((sum, item) => sum + item.amount, 0);

  for (const category of categories.filter((item) => item.type !== 'income')) {
    const current = expenseFor(category.id, month);
    const previous = expenseFor(category.id, previousMonth);
    const change = percentageChange(current, previous);
    if (current > 0 && change !== null && Math.abs(change) >= 20) {
      insights.push({
        id: `growth-${category.id}`,
        title: `${category.name} ${change >= 0 ? 'cresceu' : 'diminuiu'} ${Math.abs(Math.round(change))}%`,
        body: `${formatCurrency(current)} neste mês contra ${formatCurrency(previous)} no mês passado.`,
        tone: change >= 0 ? 'warning' : 'good',
        percentage: change,
        comparison: 'vs. mês anterior',
      });
    }
  }

  for (const budget of budgets.filter((item) => !item.deleted_at && item.month === month)) {
    const category = categories.find((item) => item.id === budget.category_id);
    const progress = budgetProgress(transactions, budget, accounts);
    if (progress.percent >= 0.8) {
      insights.push({
        id: `budget-${budget.id}`,
        title: `${category?.name ?? 'Categoria'} em ${Math.round(progress.percent * 100)}%`,
        body: `Você já usou ${formatCurrency(progress.spent)} de ${formatCurrency(budget.amount)}.`,
        tone: progress.percent >= 1 ? 'warning' : 'info',
        percentage: progress.percent * 100,
        comparison: 'do orçamento',
      });
    }
  }

  for (const recurrence of recurrences.filter((item) => item.active && !item.deleted_at)) {
    insights.push({
      id: `recurrence-${recurrence.id}`,
      title: `${recurrence.description} parece fixo`,
      body: `Previsão ${recurrence.frequency === 'monthly' ? 'mensal' : recurrence.frequency} de ${formatCurrency(recurrence.amount)}.`,
      tone: 'info',
    });
  }

  return insights.slice(0, 10);
}

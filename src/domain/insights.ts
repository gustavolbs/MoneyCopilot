import { budgetProgress } from './finance';
import { formatCurrency } from './normalize';
import { Budget, Category, Recurrence, Transaction } from './types';

export type Insight = {
  id: string;
  title: string;
  body: string;
  tone: 'good' | 'warning' | 'info';
};

export function generateInsights(params: {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  recurrences: Recurrence[];
  month: string;
  previousMonth: string;
}) {
  const { transactions, categories, budgets, recurrences, month, previousMonth } = params;
  const insights: Insight[] = [];
  const expenseFor = (categoryId: string, key: string) =>
    transactions
      .filter((item) => !item.deleted_at && item.type === 'expense' && item.category_id === categoryId && item.transaction_date.startsWith(key))
      .reduce((sum, item) => sum + item.amount, 0);

  for (const category of categories.filter((item) => item.type !== 'income')) {
    const current = expenseFor(category.id, month);
    const previous = expenseFor(category.id, previousMonth);
    if (current > 0 && previous > 0 && current > previous * 1.2) {
      insights.push({
        id: `growth-${category.id}`,
        title: `${category.name} cresceu`,
        body: `Voce gastou ${Math.round(((current - previous) / previous) * 100)}% a mais que no mes passado.`,
        tone: 'warning',
      });
    }
  }

  for (const budget of budgets.filter((item) => !item.deleted_at && item.month === month)) {
    const category = categories.find((item) => item.id === budget.category_id);
    const progress = budgetProgress(transactions, budget);
    if (progress.percent >= 0.8) {
      insights.push({
        id: `budget-${budget.id}`,
        title: `${category?.name ?? 'Categoria'} em ${Math.round(progress.percent * 100)}%`,
        body: `Voce ja usou ${formatCurrency(progress.spent)} de ${formatCurrency(budget.amount)}.`,
        tone: progress.percent >= 1 ? 'warning' : 'info',
      });
    }
  }

  for (const recurrence of recurrences.filter((item) => item.active && !item.deleted_at)) {
    insights.push({
      id: `recurrence-${recurrence.id}`,
      title: `${recurrence.description} parece fixo`,
      body: `Previsao ${recurrence.frequency === 'monthly' ? 'mensal' : recurrence.frequency} de ${formatCurrency(recurrence.amount)}.`,
      tone: 'info',
    });
  }

  return insights.slice(0, 8);
}

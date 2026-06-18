import { describe, expect, it } from 'vitest';

import { defaultCategories } from '@/domain/categories';
import { generateInsights } from '@/domain/insights';
import { Transaction } from '@/domain/types';

function transaction(id: string, date: string, amount: number, type: 'income' | 'expense'): Transaction {
  return {
    id,
    household_id: 'h1',
    account_id: null,
    transfer_account_id: null,
    category_id: type === 'expense' ? 'cat_expense_market' : 'cat_income_salary',
    created_by: 'u1',
    description: id,
    normalized_description: id,
    amount,
    type,
    transaction_date: date,
    payment_method: type === 'expense' ? 'cash' : null,
    notes: null,
    source: 'manual',
    recurrence_id: null,
    created_at: '',
    updated_at: '',
    deleted_at: null,
  };
}

describe('comparative insights', () => {
  it('compares the current month with the previous month and recent average', () => {
    const insights = generateInsights({
      transactions: [
        transaction('current-expense', '2026-06-10', 150, 'expense'),
        transaction('current-income', '2026-06-01', 1200, 'income'),
        transaction('previous-expense', '2026-05-10', 100, 'expense'),
        transaction('previous-income', '2026-05-01', 1000, 'income'),
        transaction('april-expense', '2026-04-10', 50, 'expense'),
        transaction('march-expense', '2026-03-10', 100, 'expense'),
      ],
      categories: defaultCategories,
      budgets: [],
      recurrences: [],
      accounts: [],
      month: '2026-06',
      previousMonth: '2026-05',
    });

    expect(insights.find((insight) => insight.id === 'expense-month-comparison')?.percentage).toBe(50);
    expect(insights.find((insight) => insight.id === 'income-month-comparison')?.percentage).toBe(20);
    expect(insights.find((insight) => insight.id === 'expense-three-month-average')?.percentage).toBeCloseTo(80);
    expect(insights.find((insight) => insight.id === 'monthly-savings-rate')?.percentage).toBeCloseTo(87.5);
  });
});

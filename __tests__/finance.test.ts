import { describe, expect, it } from 'vitest';

import { defaultCategories } from '@/domain/categories';
import { budgetProgress, metricsForMonth } from '@/domain/finance';
import { Budget, Transaction } from '@/domain/types';

const baseTransaction = {
  household_id: 'h1',
  account_id: null,
  transfer_account_id: null,
  created_by: 'u1',
  normalized_description: '',
  notes: null,
  source: 'manual' as const,
  recurrence_id: null,
  created_at: '2026-06-17T00:00:00.000Z',
  updated_at: '2026-06-17T00:00:00.000Z',
  deleted_at: null,
};

const tx = (overrides: Partial<Transaction>): Transaction => ({
  ...baseTransaction,
  id: overrides.id ?? 't',
  description: overrides.description ?? 'Item',
  amount: overrides.amount ?? 0,
  type: overrides.type ?? 'expense',
  transaction_date: overrides.transaction_date ?? '2026-06-17',
  category_id: overrides.category_id ?? 'cat_expense_restaurants',
  ...overrides,
});

describe('finance calculations', () => {
  it('computes monthly metrics', () => {
    const metrics = metricsForMonth(
      [
        tx({ id: '1', type: 'income', amount: 10000, category_id: 'cat_income_salary' }),
        tx({ id: '2', type: 'expense', amount: 250, category_id: 'cat_expense_restaurants' }),
        tx({ id: '3', type: 'expense', amount: 350, category_id: 'cat_expense_market' }),
      ],
      defaultCategories,
      '2026-06',
    );
    expect(metrics.income).toBe(10000);
    expect(metrics.expense).toBe(600);
    expect(metrics.balance).toBe(9400);
    expect(metrics.byCategory[0].amount).toBe(350);
  });

  it('keeps internal transfers out of income and expense while updating balances', () => {
    const accounts = [
      {
        id: 'checking',
        household_id: 'h1',
        name: 'Conta Corrente',
        type: 'checking' as const,
        initial_balance: 10000,
        currency: 'BRL',
        created_at: '',
        updated_at: '',
        deleted_at: null,
      },
      {
        id: 'reserve',
        household_id: 'h1',
        name: 'Cofrinho Casa',
        type: 'reserve' as const,
        initial_balance: 0,
        currency: 'BRL',
        created_at: '',
        updated_at: '',
        deleted_at: null,
      },
    ];
    const metrics = metricsForMonth(
      [
        tx({
          id: 'transfer',
          type: 'transfer',
          amount: 5000,
          account_id: 'checking',
          transfer_account_id: 'reserve',
          transaction_date: '2026-06-17',
        }),
      ],
      defaultCategories,
      '2026-06',
      [],
      accounts,
    );

    expect(metrics.income).toBe(0);
    expect(metrics.expense).toBe(0);
    expect(metrics.availableToSpend).toBe(5000);
    expect(metrics.reserveTotal).toBe(5000);
    expect(metrics.netWorth).toBe(10000);
  });

  it('computes budget progress status', () => {
    const budget: Budget = {
      id: 'b1',
      household_id: 'h1',
      category_id: 'cat_expense_restaurants',
      month: '2026-06',
      amount: 1000,
      created_at: '',
      updated_at: '',
      deleted_at: null,
    };
    const progress = budgetProgress([tx({ id: '1', amount: 850 })], budget);
    expect(progress.percent).toBe(0.85);
    expect(progress.status).toBe('warning');
  });
});

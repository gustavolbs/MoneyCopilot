import { parseTransactionInput } from '@/domain/parser';
import { normalizeText } from '@/domain/normalize';
import { Account, Budget, Category, CategorizationRule, Household, ParsedTransaction, Recurrence, Transaction, UserRules } from '@/domain/types';
import { createId } from '@/lib/id';

import { getDb } from './db';

type TableName = 'profiles' | 'households' | 'household_members' | 'accounts' | 'categories' | 'transactions' | 'categorization_rules' | 'budgets' | 'recurrences';

const now = () => new Date().toISOString();

export async function getAppState(key: string) {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_state WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setAppState(key: string, value: string) {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)', key, value);
}

export async function enqueueMutation(tableName: TableName, rowId: string, operation: 'upsert' | 'delete', payload: unknown) {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO mutation_queue (id, table_name, row_id, operation, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    createId(),
    tableName,
    rowId,
    operation,
    JSON.stringify(payload),
    now(),
  );
}

export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Category>('SELECT * FROM categories WHERE deleted_at IS NULL ORDER BY is_default DESC, name ASC');
  return rows.map((row) => ({ ...row, is_default: Boolean(row.is_default) }));
}

export async function listAccounts(householdId: string): Promise<Account[]> {
  const db = await getDb();
  return db.getAllAsync<Account>('SELECT * FROM accounts WHERE household_id = ? AND deleted_at IS NULL ORDER BY name', householdId);
}

export async function listRules(householdId: string): Promise<CategorizationRule[]> {
  const db = await getDb();
  return db.getAllAsync<CategorizationRule>('SELECT * FROM categorization_rules WHERE household_id = ? AND deleted_at IS NULL ORDER BY priority DESC', householdId);
}

export async function listTransactions(householdId: string): Promise<Transaction[]> {
  const db = await getDb();
  return db.getAllAsync<Transaction>('SELECT * FROM transactions WHERE household_id = ? AND deleted_at IS NULL ORDER BY transaction_date DESC, created_at DESC', householdId);
}

export async function listBudgets(householdId: string): Promise<Budget[]> {
  const db = await getDb();
  return db.getAllAsync<Budget>('SELECT * FROM budgets WHERE household_id = ? AND deleted_at IS NULL ORDER BY month DESC', householdId);
}

export async function listRecurrences(householdId: string): Promise<Recurrence[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Recurrence>('SELECT * FROM recurrences WHERE household_id = ? AND deleted_at IS NULL ORDER BY next_due_date', householdId);
  return rows.map((row) => ({ ...row, active: Boolean(row.active) }));
}

export async function getHousehold(): Promise<Household | null> {
  const db = await getDb();
  return db.getFirstAsync<Household>('SELECT * FROM households ORDER BY created_at LIMIT 1');
}

export async function createLocalHousehold(userId: string, name = 'Familia') {
  const db = await getDb();
  const createdAt = now();
  const household: Household = { id: createId(), name, created_by: userId, created_at: createdAt };
  const member = { id: createId(), household_id: household.id, user_id: userId, role: 'owner', created_at: createdAt };
  await db.runAsync('INSERT INTO households (id, name, created_by, created_at) VALUES (?, ?, ?, ?)', household.id, household.name, household.created_by, household.created_at);
  await db.runAsync('INSERT INTO household_members (id, household_id, user_id, role, created_at) VALUES (?, ?, ?, ?, ?)', member.id, member.household_id, member.user_id, member.role, member.created_at);
  await enqueueMutation('households', household.id, 'upsert', household);
  await enqueueMutation('household_members', member.id, 'upsert', member);
  await seedDefaultAccounts(household.id);
  return household;
}

export async function seedDefaultAccounts(householdId: string) {
  const db = await getDb();
  const existing = await db.getFirstAsync<{ count: number }>('SELECT count(*) as count FROM accounts WHERE household_id = ?', householdId);
  if ((existing?.count ?? 0) > 0) return;
  const defaults: Array<Pick<Account, 'name' | 'type'>> = [
    { name: 'Conta Corrente', type: 'checking' },
    { name: 'Cartao de Credito', type: 'credit_card' },
    { name: 'Dinheiro', type: 'cash' },
    { name: 'Reserva Emergencia', type: 'reserve' },
    { name: 'Investimentos', type: 'investment' },
    { name: 'Outros', type: 'other' },
  ];
  for (const item of defaults) {
    const account: Account = {
      id: createId(),
      household_id: householdId,
      name: item.name,
      type: item.type,
      initial_balance: 0,
      currency: 'BRL',
      created_at: now(),
      updated_at: now(),
      deleted_at: null,
    };
    await db.runAsync(
      'INSERT INTO accounts (id, household_id, name, type, initial_balance, currency, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      account.id,
      account.household_id,
      account.name,
      account.type,
      account.initial_balance,
      account.currency,
      account.created_at,
      account.updated_at,
      account.deleted_at,
    );
    await enqueueMutation('accounts', account.id, 'upsert', account);
  }
}

export async function createTransactionsFromInput(params: { input: string; householdId: string; userId: string | null; context: UserRules }) {
  const parsed = parseTransactionInput(params.input, params.context);
  const transactions = await saveParsedTransactions(parsed, params.householdId, params.userId);
  return { parsed, transactions };
}

export async function saveParsedTransactions(parsed: ParsedTransaction[], householdId: string, userId: string | null) {
  const db = await getDb();
  const saved: Transaction[] = [];
  for (const item of parsed) {
    const accountId = item.account_id ?? (await resolveAccountId(householdId, item.account_name_hint, item.type === 'transfer' ? 'checking' : undefined));
    const transferAccountId =
      item.type === 'transfer'
        ? item.transfer_account_id ?? (await resolveAccountId(householdId, item.transfer_account_name_hint, inferTransferAccountType(item.transfer_account_name_hint)))
        : null;
    const createdAt = now();
    const transaction: Transaction = {
      id: createId(),
      household_id: householdId,
      account_id: accountId,
      transfer_account_id: transferAccountId,
      category_id: item.category_id,
      created_by: userId,
      description: item.description,
      normalized_description: item.normalized_description,
      amount: item.amount,
      type: item.type,
      transaction_date: item.transaction_date,
      notes: null,
      source: 'manual',
      recurrence_id: null,
      created_at: createdAt,
      updated_at: createdAt,
      deleted_at: null,
    };
    await db.runAsync(
      `INSERT INTO transactions
       (id, household_id, account_id, transfer_account_id, category_id, created_by, description, normalized_description, amount, type, transaction_date, notes, source, recurrence_id, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      transaction.id,
      transaction.household_id,
      transaction.account_id,
      transaction.transfer_account_id,
      transaction.category_id,
      transaction.created_by,
      transaction.description,
      transaction.normalized_description,
      transaction.amount,
      transaction.type,
      transaction.transaction_date,
      transaction.notes,
      transaction.source,
      transaction.recurrence_id,
      transaction.created_at,
      transaction.updated_at,
      transaction.deleted_at,
    );
    await enqueueMutation('transactions', transaction.id, 'upsert', transaction);
    saved.push(transaction);
  }
  return saved;
}

async function resolveAccountId(householdId: string, nameHint: string | null, preferredType: Account['type'] = 'checking') {
  const accounts = await listAccounts(householdId);
  if (!nameHint) {
    return accounts.find((account) => account.type === preferredType)?.id ?? accounts.find((account) => account.type === 'checking')?.id ?? accounts[0]?.id ?? null;
  }
  const normalizedHint = normalizeText(nameHint);
  const existing = accounts.find((account) => normalizedHint.includes(normalizeText(account.name)) || normalizeText(account.name).includes(normalizedHint));
  if (existing) return existing.id;
  if (preferredType === 'reserve' || normalizedHint.includes('cofrinho') || normalizedHint.includes('reserva')) {
    return (await createAccount(householdId, cleanAccountName(nameHint), 'reserve')).id;
  }
  return (await createAccount(householdId, cleanAccountName(nameHint), preferredType)).id;
}

function inferTransferAccountType(nameHint: string | null): Account['type'] {
  const normalized = normalizeText(nameHint ?? '');
  if (normalized.includes('cofrinho') || normalized.includes('reserva')) return 'reserve';
  if (normalized.includes('invest')) return 'investment';
  if (normalized.includes('cartao')) return 'credit_card';
  if (normalized.includes('dinheiro')) return 'cash';
  return 'checking';
}

function cleanAccountName(nameHint: string) {
  return nameHint
    .replace(/^(?:o|a|no|na|do|da|para)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function createAccount(householdId: string, name: string, type: Account['type'], initialBalance = 0) {
  const db = await getDb();
  const account: Account = {
    id: createId(),
    household_id: householdId,
    name,
    type,
    initial_balance: initialBalance,
    currency: 'BRL',
    created_at: now(),
    updated_at: now(),
    deleted_at: null,
  };
  await db.runAsync(
    'INSERT INTO accounts (id, household_id, name, type, initial_balance, currency, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    account.id,
    account.household_id,
    account.name,
    account.type,
    account.initial_balance,
    account.currency,
    account.created_at,
    account.updated_at,
    account.deleted_at,
  );
  await enqueueMutation('accounts', account.id, 'upsert', account);
  return account;
}

export async function updateTransactionCategory(transaction: Transaction, categoryId: string, createRule = true) {
  const db = await getDb();
  const updated: Transaction = { ...transaction, category_id: categoryId, updated_at: now() };
  await db.runAsync('UPDATE transactions SET category_id = ?, updated_at = ? WHERE id = ?', categoryId, updated.updated_at, transaction.id);
  await enqueueMutation('transactions', updated.id, 'upsert', updated);
  if (createRule) {
    await createRuleFromCorrection(transaction.household_id, transaction.normalized_description, categoryId, transaction.type);
  }
}

export async function updateTransaction(transaction: Transaction, patch: Partial<Pick<Transaction, 'description' | 'amount' | 'type' | 'category_id' | 'account_id' | 'transfer_account_id' | 'transaction_date' | 'notes'>>) {
  const db = await getDb();
  const updated: Transaction = {
    ...transaction,
    ...patch,
    normalized_description: patch.description ? normalizeText(patch.description) : transaction.normalized_description,
    updated_at: now(),
  };
  await db.runAsync(
    `UPDATE transactions
     SET description = ?, normalized_description = ?, amount = ?, type = ?, category_id = ?, account_id = ?, transfer_account_id = ?, transaction_date = ?, notes = ?, updated_at = ?
     WHERE id = ?`,
    updated.description,
    updated.normalized_description,
    updated.amount,
    updated.type,
    updated.category_id,
    updated.account_id,
    updated.transfer_account_id,
    updated.transaction_date,
    updated.notes,
    updated.updated_at,
    updated.id,
  );
  await enqueueMutation('transactions', updated.id, 'upsert', updated);
  return updated;
}

export async function softDeleteTransaction(transaction: Transaction) {
  const db = await getDb();
  const deletedAt = now();
  const payload = { ...transaction, deleted_at: deletedAt, updated_at: deletedAt };
  await db.runAsync('UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ?', deletedAt, deletedAt, transaction.id);
  await enqueueMutation('transactions', transaction.id, 'delete', payload);
}

export async function createRuleFromCorrection(householdId: string, pattern: string, categoryId: string, type: 'income' | 'expense' | 'transfer') {
  const db = await getDb();
  const cleanedPattern = pattern.split(' ')[0] || pattern;
  const createdAt = now();
  const rule: CategorizationRule = {
    id: createId(),
    household_id: householdId,
    pattern: cleanedPattern,
    match_type: 'contains',
    category_id: categoryId,
    account_id: null,
    type,
    priority: 200,
    created_at: createdAt,
    updated_at: createdAt,
    deleted_at: null,
  };
  await db.runAsync(
    `INSERT INTO categorization_rules
     (id, household_id, pattern, match_type, category_id, account_id, type, priority, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    rule.id,
    rule.household_id,
    rule.pattern,
    rule.match_type,
    rule.category_id,
    rule.account_id,
    rule.type,
    rule.priority,
    rule.created_at,
    rule.updated_at,
    rule.deleted_at,
  );
  await enqueueMutation('categorization_rules', rule.id, 'upsert', rule);
  return rule;
}

export async function upsertBudget(householdId: string, categoryId: string, month: string, amount: number) {
  const db = await getDb();
  const existing = await db.getFirstAsync<Budget>('SELECT * FROM budgets WHERE household_id = ? AND category_id = ? AND month = ? AND deleted_at IS NULL', householdId, categoryId, month);
  const budget: Budget = existing
    ? { ...existing, amount, updated_at: now() }
    : { id: createId(), household_id: householdId, category_id: categoryId, month, amount, created_at: now(), updated_at: now(), deleted_at: null };
  await db.runAsync(
    `INSERT OR REPLACE INTO budgets (id, household_id, category_id, month, amount, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    budget.id,
    budget.household_id,
    budget.category_id,
    budget.month,
    budget.amount,
    budget.created_at,
    budget.updated_at,
    budget.deleted_at,
  );
  await enqueueMutation('budgets', budget.id, 'upsert', budget);
  return budget;
}

export async function createRecurrence(params: Omit<Recurrence, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>) {
  const db = await getDb();
  const recurrence: Recurrence = { ...params, id: createId(), created_at: now(), updated_at: now(), deleted_at: null };
  await db.runAsync(
    `INSERT INTO recurrences
     (id, household_id, account_id, category_id, description, amount, type, frequency, day_of_month, next_due_date, active, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    recurrence.id,
    recurrence.household_id,
    recurrence.account_id,
    recurrence.category_id,
    recurrence.description,
    recurrence.amount,
    recurrence.type,
    recurrence.frequency,
    recurrence.day_of_month,
    recurrence.next_due_date,
    recurrence.active ? 1 : 0,
    recurrence.created_at,
    recurrence.updated_at,
    recurrence.deleted_at,
  );
  await enqueueMutation('recurrences', recurrence.id, 'upsert', recurrence);
  return recurrence;
}

export async function countPendingMutations() {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>('SELECT count(*) as count FROM mutation_queue');
  return row?.count ?? 0;
}

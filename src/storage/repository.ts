import { parseTransactionInput } from '@/domain/parser';
import { normalizeText } from '@/domain/normalize';
import { Account, Budget, Category, CategorizationRule, Household, ParsedTransaction, Recurrence, Transaction, UserRules } from '@/domain/types';
import { createId } from '@/lib/id';

import { LocalDbState, readLocalDb, TableName, updateLocalDb } from './db';

const now = () => new Date().toISOString();

export async function getAppState(key: string) {
  const db = await readLocalDb();
  return db.app_state[key] ?? null;
}

export async function setAppState(key: string, value: string) {
  await updateLocalDb((db) => {
    db.app_state[key] = value;
  });
}

export async function enqueueMutation(tableName: TableName, rowId: string, operation: 'upsert' | 'delete', payload: unknown) {
  await updateLocalDb((db) => {
    db.mutation_queue.push({
      id: createId(),
      table_name: tableName,
      row_id: rowId,
      operation,
      payload: JSON.stringify(payload),
      created_at: now(),
      attempts: 0,
      last_error: null,
    });
  });
}

export async function listCategories(): Promise<Category[]> {
  const db = await readLocalDb();
  return db.categories
    .filter((row) => !row.deleted_at)
    .map((row) => ({ ...row, is_default: Boolean(row.is_default) }))
    .sort((a, b) => Number(b.is_default) - Number(a.is_default) || a.name.localeCompare(b.name));
}

export async function listAccounts(householdId: string): Promise<Account[]> {
  const db = await readLocalDb();
  return db.accounts.filter((row) => row.household_id === householdId && !row.deleted_at).sort((a, b) => a.name.localeCompare(b.name));
}

export async function listRules(householdId: string): Promise<CategorizationRule[]> {
  const db = await readLocalDb();
  return db.categorization_rules.filter((row) => row.household_id === householdId && !row.deleted_at).sort((a, b) => b.priority - a.priority);
}

export async function listTransactions(householdId: string): Promise<Transaction[]> {
  const db = await readLocalDb();
  return db.transactions
    .filter((row) => row.household_id === householdId && !row.deleted_at)
    .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date) || b.created_at.localeCompare(a.created_at));
}

export async function listBudgets(householdId: string): Promise<Budget[]> {
  const db = await readLocalDb();
  return db.budgets.filter((row) => row.household_id === householdId && !row.deleted_at).sort((a, b) => b.month.localeCompare(a.month));
}

export async function listRecurrences(householdId: string): Promise<Recurrence[]> {
  const db = await readLocalDb();
  return db.recurrences
    .filter((row) => row.household_id === householdId && !row.deleted_at)
    .map((row) => ({ ...row, active: Boolean(row.active) }))
    .sort((a, b) => a.next_due_date.localeCompare(b.next_due_date));
}

export async function getHousehold(): Promise<Household | null> {
  const db = await readLocalDb();
  return [...db.households].sort((a, b) => a.created_at.localeCompare(b.created_at))[0] ?? null;
}

export async function createLocalHousehold(userId: string, name = 'Familia') {
  const createdAt = now();
  const household: Household = { id: createId(), name, created_by: userId, created_at: createdAt };
  const member = { id: createId(), household_id: household.id, user_id: userId, role: 'owner', created_at: createdAt };
  await updateLocalDb((db) => {
    db.households.push(household);
    db.household_members.push(member);
  });
  await enqueueMutation('households', household.id, 'upsert', household);
  await enqueueMutation('household_members', member.id, 'upsert', member);
  await seedDefaultAccounts(household.id);
  return household;
}

export async function reconcileHouseholdOwnership(userId: string) {
  if (!userId || userId === 'local-user') return;
  const household = await getHousehold();
  if (!household) return;

  let claimedHousehold: Household | null = null;
  let createdMember: { id: string; household_id: string; user_id: string; role: string; created_at: string } | null = null;

  await updateLocalDb((db) => {
    // Reivindica para o usuario real apenas o que estava com o placeholder 'local-user'.
    for (const item of db.households) if (item.created_by === 'local-user') item.created_by = userId;
    for (const item of db.household_members) if (item.user_id === 'local-user') item.user_id = userId;
    for (const item of db.transactions) if (item.created_by === 'local-user') item.created_by = userId;
    for (const item of db.mutation_queue) {
      if (item.payload.includes('"local-user"')) {
        item.payload = item.payload.replaceAll('"local-user"', `"${userId}"`);
        item.attempts = 0;
        item.last_error = null;
      }
    }

    const current = db.households.find((h) => h.id === household.id);
    // Garante o vinculo do usuario com a household atual; cria localmente se faltar.
    let member = db.household_members.find((item) => item.household_id === household.id && item.user_id === userId);
    if (!member) {
      const role = current && current.created_by === userId ? 'owner' : 'member';
      member = { id: createId(), household_id: household.id, user_id: userId, role, created_at: now() };
      db.household_members.push(member);
      createdMember = { ...member };
    }
    // So reenfileira a household se o usuario for o criador dela (evita sequestrar a
    // household de outro membro, ex.: a esposa entrando na Familia do marido).
    if (current && current.created_by === userId) claimedHousehold = { ...current };
  });

  if (claimedHousehold) await enqueueMutation('households', (claimedHousehold as Household).id, 'upsert', claimedHousehold);
  if (createdMember) await enqueueMutation('household_members', (createdMember as { id: string }).id, 'upsert', createdMember);
}

function enqueueInline(db: LocalDbState, table: TableName, rowId: string, payload: unknown) {
  db.mutation_queue.push({
    id: createId(),
    table_name: table,
    row_id: rowId,
    operation: 'upsert',
    payload: JSON.stringify(payload),
    created_at: now(),
    attempts: 0,
    last_error: null,
  });
}

// Converge todos os dados para UMA household canonica (a mais antiga). Necessario porque
// cada dispositivo criava a propria household com id aleatorio, fazendo a "mesma conta"
// ter households diferentes no desktop e no mobile -> dados nao apareciam entre aparelhos.
// Deve rodar DEPOIS do pull (quando as households remotas ja estao no estado local).
export async function reconcileHouseholds(userId: string): Promise<{ household: Household | null; changed: boolean }> {
  if (!userId || userId === 'local-user') {
    return { household: await getHousehold(), changed: false };
  }
  return updateLocalDb((db) => {
    // Canonica = household com MAIS membros (a Familia compartilhada), desempatando pela
    // mais antiga. Assim, ao entrar na Familia do conjuge, convergimos para a household dela
    // (que tem 2 membros) e nao para a household pessoal/sobra (1 membro).
    const memberCount = new Map<string, number>();
    for (const m of db.household_members) memberCount.set(m.household_id, (memberCount.get(m.household_id) ?? 0) + 1);
    const canonical =
      [...db.households].sort((a, b) => {
        const diff = (memberCount.get(b.id) ?? 0) - (memberCount.get(a.id) ?? 0);
        if (diff !== 0) return diff;
        return a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id);
      })[0] ?? null;
    if (!canonical) return { household: null, changed: false };

    const otherIds = new Set(db.households.filter((h) => h.id !== canonical.id).map((h) => h.id));
    if (otherIds.size === 0) return { household: canonical, changed: false };

    const ts = now();

    // Contas: migra apenas as referenciadas por transacoes. Contas sem uso (defaults seedados
    // por cada dispositivo) sao descartadas localmente para nao duplicar contas na Familia.
    const keptAccounts: Account[] = [];
    for (const acc of db.accounts) {
      if (!otherIds.has(acc.household_id)) {
        keptAccounts.push(acc);
        continue;
      }
      const referenced = db.transactions.some((t) => t.account_id === acc.id || t.transfer_account_id === acc.id);
      if (!referenced) continue; // conta sem transacao -> descarta (evita duplicar defaults)
      acc.household_id = canonical.id;
      acc.updated_at = ts;
      enqueueInline(db, 'accounts', acc.id, acc);
      keptAccounts.push(acc);
    }
    db.accounts = keptAccounts;

    for (const t of db.transactions) {
      if (otherIds.has(t.household_id)) {
        t.household_id = canonical.id;
        t.updated_at = ts;
        enqueueInline(db, 'transactions', t.id, t);
      }
    }
    for (const c of db.categories) {
      if (c.household_id && otherIds.has(c.household_id)) {
        c.household_id = canonical.id;
        c.updated_at = ts;
        enqueueInline(db, 'categories', c.id, c);
      }
    }
    for (const r of db.categorization_rules) {
      if (otherIds.has(r.household_id)) {
        r.household_id = canonical.id;
        r.updated_at = ts;
        enqueueInline(db, 'categorization_rules', r.id, r);
      }
    }
    for (const b of db.budgets) {
      if (otherIds.has(b.household_id)) {
        b.household_id = canonical.id;
        b.updated_at = ts;
        enqueueInline(db, 'budgets', b.id, b);
      }
    }
    for (const rec of db.recurrences) {
      if (otherIds.has(rec.household_id)) {
        rec.household_id = canonical.id;
        rec.updated_at = ts;
        enqueueInline(db, 'recurrences', rec.id, rec);
      }
    }

    // Garante o vinculo do usuario com a household canonica.
    if (!db.household_members.some((m) => m.household_id === canonical.id && m.user_id === userId)) {
      const m = { id: createId(), household_id: canonical.id, user_id: userId, role: 'owner', created_at: now() };
      db.household_members.push(m);
      enqueueInline(db, 'household_members', m.id, m);
    }

    // Reseta o cursor incremental para forcar um pull completo da household canonica
    // (senao 'updated_at > last_pulled_at' pularia os registros ja existentes, ex.: a transacao de 4500).
    db.sync_state = {};
    db.app_state['current_household_id'] = canonical.id;

    return { household: canonical, changed: true };
  });
}

export async function seedDefaultAccounts(householdId: string) {
  const existing = (await listAccounts(householdId)).length;
  if (existing > 0) return;
  const defaults: Array<Pick<Account, 'name' | 'type'>> = [
    { name: 'Conta Corrente', type: 'checking' },
    { name: 'Cartao de Credito', type: 'credit_card' },
    { name: 'Dinheiro', type: 'cash' },
    { name: 'Reserva Emergencia', type: 'reserve' },
    { name: 'Investimentos', type: 'investment' },
    { name: 'Outros', type: 'other' },
  ];
  for (const item of defaults) await createAccount(householdId, item.name, item.type, 0);
}

export async function createTransactionsFromInput(params: { input: string; householdId: string; userId: string | null; context: UserRules }) {
  const parsed = parseTransactionInput(params.input, params.context);
  const transactions = await saveParsedTransactions(parsed, params.householdId, params.userId);
  return { parsed, transactions };
}

export async function saveParsedTransactions(parsed: ParsedTransaction[], householdId: string, userId: string | null) {
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
    await updateLocalDb((db) => {
      db.transactions.push(transaction);
    });
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
  return nameHint.replace(/^(?:o|a|no|na|do|da|para)\s+/i, '').replace(/\s+/g, ' ').trim();
}

export async function createAccount(householdId: string, name: string, type: Account['type'], initialBalance = 0) {
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
  await updateLocalDb((db) => {
    db.accounts.push(account);
  });
  await enqueueMutation('accounts', account.id, 'upsert', account);
  return account;
}

export async function updateTransactionCategory(transaction: Transaction, categoryId: string, createRule = true) {
  const updated: Transaction = { ...transaction, category_id: categoryId, updated_at: now() };
  await updateLocalDb((db) => {
    const index = db.transactions.findIndex((item) => item.id === transaction.id);
    if (index >= 0) db.transactions[index] = updated;
  });
  await enqueueMutation('transactions', updated.id, 'upsert', updated);
  if (createRule) await createRuleFromCorrection(transaction.household_id, transaction.normalized_description, categoryId, transaction.type);
}

export async function updateTransaction(transaction: Transaction, patch: Partial<Pick<Transaction, 'description' | 'amount' | 'type' | 'category_id' | 'account_id' | 'transfer_account_id' | 'transaction_date' | 'notes'>>) {
  const updated: Transaction = {
    ...transaction,
    ...patch,
    normalized_description: patch.description ? normalizeText(patch.description) : transaction.normalized_description,
    updated_at: now(),
  };
  await updateLocalDb((db) => {
    const index = db.transactions.findIndex((item) => item.id === transaction.id);
    if (index >= 0) db.transactions[index] = updated;
  });
  await enqueueMutation('transactions', updated.id, 'upsert', updated);
  return updated;
}

export async function softDeleteTransaction(transaction: Transaction) {
  const deletedAt = now();
  const payload = { ...transaction, deleted_at: deletedAt, updated_at: deletedAt };
  await updateLocalDb((db) => {
    const index = db.transactions.findIndex((item) => item.id === transaction.id);
    if (index >= 0) db.transactions[index] = payload;
  });
  await enqueueMutation('transactions', transaction.id, 'delete', payload);
}

export async function createRuleFromCorrection(householdId: string, pattern: string, categoryId: string, type: 'income' | 'expense' | 'transfer') {
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
  await updateLocalDb((db) => {
    db.categorization_rules.push(rule);
  });
  await enqueueMutation('categorization_rules', rule.id, 'upsert', rule);
  return rule;
}

export async function upsertBudget(householdId: string, categoryId: string, month: string, amount: number) {
  const budget = await updateLocalDb<Budget>((db) => {
    const index = db.budgets.findIndex((item) => item.household_id === householdId && item.category_id === categoryId && item.month === month && !item.deleted_at);
    if (index >= 0) {
      const updated = { ...db.budgets[index], amount, updated_at: now() };
      db.budgets[index] = updated;
      return updated;
    }
    const created = { id: createId(), household_id: householdId, category_id: categoryId, month, amount, created_at: now(), updated_at: now(), deleted_at: null };
    db.budgets.push(created);
    return created;
  });
  await enqueueMutation('budgets', budget.id, 'upsert', budget);
  return budget;
}

export async function createRecurrence(params: Omit<Recurrence, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>) {
  const recurrence: Recurrence = { ...params, id: createId(), created_at: now(), updated_at: now(), deleted_at: null };
  await updateLocalDb((db) => {
    db.recurrences.push(recurrence);
  });
  await enqueueMutation('recurrences', recurrence.id, 'upsert', recurrence);
  return recurrence;
}

export async function countPendingMutations() {
  const db = await readLocalDb();
  return db.mutation_queue.length;
}

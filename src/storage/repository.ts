import { calculateAccountBalances, reservePositionDelta } from '@/domain/finance';
import { parseTransactionInput } from '@/domain/parser';
import { normalizeText } from '@/domain/normalize';
import { Account, Budget, Category, CategorizationRule, Household, ParsedTransaction, Recurrence, Transaction, UserRules } from '@/domain/types';
import { createId } from '@/lib/id';

import { LocalDbState, readLocalDb, TableName, updateLocalDb } from './db';

const now = () => new Date().toISOString();

function addMonthsToISODate(date: string, months: number) {
  const [year, month, day] = date.split('-').map(Number);
  const target = new Date(year, month - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
}

function addDaysToISODate(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number);
  const target = new Date(year, month - 1, day + days);
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
}

function nextRecurrenceDate(date: string, frequency: Recurrence['frequency']) {
  if (frequency === 'weekly') return addDaysToISODate(date, 7);
  if (frequency === 'yearly') return addMonthsToISODate(date, 12);
  return addMonthsToISODate(date, 1);
}

function splitInstallmentCents(total: number, count: number) {
  const totalCents = Math.round(total * 100);
  const base = Math.floor(totalCents / count);
  const remainder = totalCents % count;
  return Array.from({ length: count }, (_item, index) => (base + (index < remainder ? 1 : 0)) / 100);
}

export async function setAppState(key: string, value: string) {
  await updateLocalDb((db) => {
    db.app_state[key] = value;
  });
}

async function enqueueMutation(tableName: TableName, rowId: string, operation: 'upsert' | 'delete', payload: unknown) {
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

export async function reconcileDeletedAccountReferences(householdId: string) {
  return updateLocalDb((db) => {
    const deletedAccounts = db.accounts.filter((account) => account.household_id === householdId && account.deleted_at);
    let changed = 0;
    for (const deleted of deletedAccounts) {
      const replacement = findDuplicateAccountReplacement(db.accounts, deleted);
      if (replacement) changed += mergeAccountReferences(db, deleted, replacement);
    }
    return changed;
  });
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

export async function createLocalHousehold(userId: string, name = 'Família') {
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

async function seedDefaultAccounts(householdId: string) {
  const existing = (await listAccounts(householdId)).length;
  if (existing > 0) return;
  const defaults: Array<Pick<Account, 'name' | 'type'>> = [
    { name: 'Conta Corrente', type: 'checking' },
    { name: 'Cartão de Crédito', type: 'credit_card' },
    { name: 'Dinheiro', type: 'cash' },
    { name: 'Reserva Emergência', type: 'reserve' },
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

async function saveParsedTransactions(parsed: ParsedTransaction[], householdId: string, userId: string | null) {
  const saved: Transaction[] = [];
  for (const item of parsed) {
    const accountId = item.account_id ?? (await resolveAccountId(householdId, item.account_name_hint, item.type === 'transfer' ? 'checking' : undefined));
    const transferAccountId =
      item.type === 'transfer'
        ? item.transfer_account_id ?? (await resolveAccountId(householdId, item.transfer_account_name_hint, inferTransferAccountType(item.transfer_account_name_hint)))
        : null;
    const createdAt = now();
    const account = accountId ? (await listAccounts(householdId)).find((item) => item.id === accountId) : null;
    const installmentCount = item.type === 'expense' ? item.installment_count : null;
    const installmentAmounts = installmentCount ? splitInstallmentCents(item.amount, installmentCount) : [item.amount];
    const installmentGroupId = installmentCount ? createId() : null;
    const paymentMethod = item.type === 'expense' ? (account?.type === 'credit_card' ? 'credit_card' : 'cash') : null;
    const transactions = installmentAmounts.map((installmentAmount, index): Transaction => {
      const installmentIndex = installmentCount ? index + 1 : null;
      const description = installmentCount ? `${item.description} ${installmentIndex}/${installmentCount}` : item.description;
      return {
        id: createId(),
        household_id: householdId,
        account_id: accountId,
        transfer_account_id: transferAccountId,
        category_id: item.category_id,
        created_by: userId,
        description,
        normalized_description: normalizeText(description),
        amount: installmentAmount,
        type: item.type,
        transaction_date: installmentCount ? addMonthsToISODate(item.transaction_date, index) : item.transaction_date,
        payment_method: paymentMethod,
        notes: installmentCount ? `installment:${installmentIndex}/${installmentCount};total:${item.amount}` : null,
        source: 'manual',
        recurrence_id: null,
        installment_group_id: installmentGroupId,
        installment_index: installmentIndex,
        installment_total: installmentCount,
        installment_base_description: installmentCount ? item.description : null,
        created_at: createdAt,
        updated_at: createdAt,
        deleted_at: null,
      };
    });
    await updateLocalDb((db) => {
      db.transactions.push(...transactions);
    });
    for (const transaction of transactions) {
      await enqueueMutation('transactions', transaction.id, 'upsert', transaction);
      saved.push(transaction);
    }
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

export async function createAccount(
  householdId: string,
  name: string,
  type: Account['type'],
  initialBalance = 0,
  cardSettings?: { dueDay: number; bestPurchaseDay: number },
) {
  const account: Account = {
    id: createId(),
    household_id: householdId,
    name,
    type,
    initial_balance: initialBalance,
    currency: 'BRL',
    credit_card_due_day: type === 'credit_card' ? cardSettings?.dueDay ?? 10 : null,
    credit_card_best_purchase_day: type === 'credit_card' ? cardSettings?.bestPurchaseDay ?? 3 : null,
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

export async function updateAccountCardSettings(account: Account, dueDay: number, bestPurchaseDay: number) {
  const updated: Account = {
    ...account,
    credit_card_due_day: dueDay,
    credit_card_best_purchase_day: bestPurchaseDay,
    updated_at: now(),
  };
  await updateLocalDb((db) => {
    const index = db.accounts.findIndex((item) => item.id === account.id);
    if (index >= 0) db.accounts[index] = updated;
  });
  await enqueueMutation('accounts', updated.id, 'upsert', updated);
  return updated;
}

export async function updateAccount(
  account: Account,
  patch: Partial<Pick<Account, 'name' | 'type' | 'initial_balance' | 'credit_card_due_day' | 'credit_card_best_purchase_day'>>,
) {
  const nextType = patch.type ?? account.type;
  const updated: Account = {
    ...account,
    ...patch,
    credit_card_due_day: nextType === 'credit_card' ? patch.credit_card_due_day ?? account.credit_card_due_day ?? 10 : null,
    credit_card_best_purchase_day: nextType === 'credit_card' ? patch.credit_card_best_purchase_day ?? account.credit_card_best_purchase_day ?? 3 : null,
    updated_at: now(),
  };
  await updateLocalDb((db) => {
    const index = db.accounts.findIndex((item) => item.id === account.id);
    if (index >= 0) db.accounts[index] = updated;
  });
  await enqueueMutation('accounts', updated.id, 'upsert', updated);
  return updated;
}

export async function softDeleteAccount(account: Account) {
  const deletedAt = now();
  const deleted = await updateLocalDb<Account>((db) => {
    const index = db.accounts.findIndex((item) => item.id === account.id);
    if (index < 0) return { ...account, deleted_at: deletedAt, updated_at: deletedAt };

    const storedAccount = db.accounts[index];
    const replacement = findDuplicateAccountReplacement(db.accounts, storedAccount);
    if (replacement) mergeAccountReferences(db, storedAccount, replacement);

    const payload = { ...storedAccount, deleted_at: deletedAt, updated_at: deletedAt };
    db.accounts[index] = payload;
    return payload;
  });
  await enqueueMutation('accounts', account.id, 'delete', deleted);
}

function findDuplicateAccountReplacement(accounts: Account[], account: Account) {
  const normalizedName = normalizeText(account.name);
  return accounts.find(
    (candidate) =>
      candidate.id !== account.id &&
      candidate.household_id === account.household_id &&
      !candidate.deleted_at &&
      candidate.type === account.type &&
      normalizeText(candidate.name) === normalizedName,
  );
}

function mergeAccountReferences(db: LocalDbState, source: Account, replacement: Account) {
  const timestamp = now();
  let changed = 0;

  for (const transaction of db.transactions) {
    let transactionChanged = false;
    if (transaction.account_id === source.id) {
      transaction.account_id = replacement.id;
      transactionChanged = true;
    }
    if (transaction.transfer_account_id === source.id) {
      transaction.transfer_account_id = replacement.id;
      transactionChanged = true;
    }
    if (transactionChanged) {
      transaction.updated_at = timestamp;
      enqueueInline(db, 'transactions', transaction.id, transaction);
      changed += 1;
    }
  }
  for (const rule of db.categorization_rules) {
    if (rule.account_id !== source.id) continue;
    rule.account_id = replacement.id;
    rule.updated_at = timestamp;
    enqueueInline(db, 'categorization_rules', rule.id, rule);
    changed += 1;
  }
  for (const recurrence of db.recurrences) {
    if (recurrence.account_id !== source.id) continue;
    recurrence.account_id = replacement.id;
    recurrence.updated_at = timestamp;
    enqueueInline(db, 'recurrences', recurrence.id, recurrence);
    changed += 1;
  }
  if (source.initial_balance !== 0) {
    replacement.initial_balance += source.initial_balance;
    replacement.updated_at = timestamp;
    source.initial_balance = 0;
    source.updated_at = timestamp;
    enqueueInline(db, 'accounts', replacement.id, replacement);
    enqueueInline(db, 'accounts', source.id, source);
    changed += 1;
  }
  return changed;
}

export async function createBalanceMovement(params: {
  householdId: string;
  userId: string | null;
  accountId: string;
  counterpartyAccountId?: string | null;
  kind: 'deposit' | 'withdrawal' | 'income' | 'position';
  amount: number;
  date: string;
  description?: string;
}) {
  const isPosition = params.kind === 'position';
  if (!Number.isFinite(params.amount) || (isPosition ? params.amount < 0 : params.amount <= 0)) {
    throw new Error(isPosition ? 'Informe uma posição válida.' : 'Informe um valor maior que zero.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(params.date) || Number.isNaN(Date.parse(`${params.date}T00:00:00`))) {
    throw new Error('Informe uma data válida.');
  }

  const db = await readLocalDb();
  const activeAccounts = db.accounts.filter((account) => account.household_id === params.householdId && !account.deleted_at);
  const target = activeAccounts.find((account) => account.id === params.accountId);
  if (!target || target.type === 'credit_card') throw new Error('Conta ou cofrinho inválido.');

  const householdTransactions = db.transactions.filter((transaction) => transaction.household_id === params.householdId);
  const targetBalance = calculateAccountBalances(householdTransactions, activeAccounts)
    .find(({ account }) => account.id === target.id)?.balance ?? 0;

  const createdAt = now();
  const isIncome = params.kind === 'income';
  const isDeposit = params.kind === 'deposit';
  if (!isPosition && !isIncome && !params.counterpartyAccountId) throw new Error('Selecione a conta de origem ou destino.');
  const counterparty = params.counterpartyAccountId
    ? activeAccounts.find((account) => account.id === params.counterpartyAccountId)
    : null;
  if (!isPosition && !isIncome && (!counterparty || counterparty.type === 'credit_card')) throw new Error('Conta de origem ou destino inválida.');
  if (counterparty?.id === target.id) throw new Error('Selecione uma conta diferente da conta movimentada.');
  if (params.kind === 'withdrawal') {
    if (params.amount > targetBalance) throw new Error('A retirada não pode ser maior que o saldo disponível.');
  }

  const positionDelta = isPosition ? reservePositionDelta(targetBalance, params.amount) : 0;
  if (isPosition && positionDelta === 0) throw new Error('A posição informada já é o saldo atual do cofrinho.');
  const movementAmount = isPosition ? Math.abs(positionDelta) : params.amount;

  const description = params.description?.trim() || (isPosition ? `Atualização da posição de ${target.name}` : isIncome ? `Entrada em ${target.name}` : isDeposit ? `Aporte em ${target.name}` : `Retirada de ${target.name}`);
  const transaction: Transaction = {
    id: createId(),
    household_id: params.householdId,
    account_id: isPosition || isIncome || !isDeposit ? params.accountId : params.counterpartyAccountId!,
    transfer_account_id: isPosition || isIncome ? null : isDeposit ? params.accountId : params.counterpartyAccountId!,
    category_id: isPosition ? 'cat_income_yield' : isIncome ? 'cat_income_other' : null,
    created_by: params.userId,
    description,
    normalized_description: normalizeText(description),
    amount: movementAmount,
    type: isPosition ? (positionDelta > 0 ? 'income' : 'expense') : isIncome ? 'income' : 'transfer',
    transaction_date: params.date,
    payment_method: null,
    notes: isPosition ? `account_movement:position;reported_position:${params.amount}` : `account_movement:${params.kind}`,
    source: 'manual',
    recurrence_id: null,
    installment_group_id: null,
    installment_index: null,
    installment_total: null,
    installment_base_description: null,
    created_at: createdAt,
    updated_at: createdAt,
    deleted_at: null,
  };
  await updateLocalDb((db) => {
    db.transactions.push(transaction);
  });
  await enqueueMutation('transactions', transaction.id, 'upsert', transaction);
  return transaction;
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

export async function updateTransaction(transaction: Transaction, patch: Partial<Pick<Transaction, 'description' | 'amount' | 'type' | 'category_id' | 'account_id' | 'transfer_account_id' | 'transaction_date' | 'payment_method' | 'notes'>>) {
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

function stripInstallmentSuffix(description: string) {
  return description.replace(/\s+\d{1,2}\s*\/\s*\d{1,2}\s*$/i, '').trim();
}

function parseInstallmentSuffix(description: string) {
  const match = description.match(/\s+(\d{1,2})\s*\/\s*(\d{1,2})\s*$/i);
  if (!match) return null;
  return {
    baseDescription: stripInstallmentSuffix(description),
    index: Number(match[1]),
    total: Number(match[2]),
  };
}

export async function completeInstallmentsFromTransaction(transaction: Transaction, currentIndex: number, total: number) {
  if (transaction.type !== 'expense') throw new Error('Somente despesas podem ser parceladas.');
  if (!Number.isInteger(currentIndex) || !Number.isInteger(total) || total < 2 || currentIndex < 1 || currentIndex > total) {
    throw new Error('Informe uma parcela válida.');
  }

  const createdAt = now();
  const groupId = transaction.installment_group_id ?? createId();
  const baseDescription = transaction.installment_base_description ?? stripInstallmentSuffix(transaction.description);
  const nextTransactions: Transaction[] = [];

  await updateLocalDb((db) => {
    for (const item of db.transactions) {
      const parsed = parseInstallmentSuffix(item.description);
      const isSameManualInstallment =
        parsed &&
        item.household_id === transaction.household_id &&
        item.type === transaction.type &&
        item.amount === transaction.amount &&
        parsed.total === total &&
        normalizeText(parsed.baseDescription) === normalizeText(baseDescription) &&
        !item.deleted_at;
      if (!isSameManualInstallment) continue;
      item.installment_group_id = groupId;
      item.installment_index = parsed.index;
      item.installment_total = total;
      item.installment_base_description = baseDescription;
      item.updated_at = createdAt;
      enqueueInline(db, 'transactions', item.id, item);
    }

    const existingGroup = db.transactions.filter((item) => item.installment_group_id === groupId && !item.deleted_at);
    const existingIndexes = new Set(existingGroup.map((item) => item.installment_index).filter((item): item is number => Boolean(item)));
    existingIndexes.add(currentIndex);

    const current = db.transactions.find((item) => item.id === transaction.id);
    if (current) {
      current.description = `${baseDescription} ${currentIndex}/${total}`;
      current.normalized_description = normalizeText(current.description);
      current.installment_group_id = groupId;
      current.installment_index = currentIndex;
      current.installment_total = total;
      current.installment_base_description = baseDescription;
      current.notes = current.notes?.startsWith('installment:')
        ? `installment:${currentIndex}/${total}`
        : current.notes
          ? `${current.notes};installment:${currentIndex}/${total}`
          : `installment:${currentIndex}/${total}`;
      current.updated_at = createdAt;
      enqueueInline(db, 'transactions', current.id, current);
    }

    for (let index = currentIndex + 1; index <= total; index += 1) {
      if (existingIndexes.has(index)) continue;
      const description = `${baseDescription} ${index}/${total}`;
      const installment: Transaction = {
        ...transaction,
        id: createId(),
        description,
        normalized_description: normalizeText(description),
        transaction_date: addMonthsToISODate(transaction.transaction_date, index - currentIndex),
        notes: `installment:${index}/${total}`,
        installment_group_id: groupId,
        installment_index: index,
        installment_total: total,
        installment_base_description: baseDescription,
        created_at: createdAt,
        updated_at: createdAt,
        deleted_at: null,
      };
      db.transactions.push(installment);
      enqueueInline(db, 'transactions', installment.id, installment);
      nextTransactions.push(installment);
    }
  });

  return nextTransactions;
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

async function createRuleFromCorrection(householdId: string, pattern: string, categoryId: string, type: 'income' | 'expense' | 'transfer') {
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

export async function linkTransactionToRecurrence(transaction: Transaction, recurrenceId: string) {
  const updated = await updateLocalDb<Transaction | null>((db) => {
    const current = db.transactions.find((item) => item.id === transaction.id && !item.deleted_at);
    if (!current) return null;
    current.recurrence_id = recurrenceId;
    current.updated_at = now();
    enqueueInline(db, 'transactions', current.id, current);
    return { ...current };
  });
  return updated;
}

export async function materializeDueRecurrences(householdId: string, today = new Date().toISOString().slice(0, 10)) {
  const created: Transaction[] = [];
  await updateLocalDb((db) => {
    const timestamp = now();
    const householdRecurrences = db.recurrences.filter(
      (recurrence) =>
        recurrence.household_id === householdId &&
        recurrence.active &&
        !recurrence.deleted_at &&
        recurrence.next_due_date <= today,
    );

    for (const recurrence of householdRecurrences) {
      let dueDate = recurrence.next_due_date;
      let guard = 0;
      while (dueDate <= today && guard < 36) {
        const alreadyCreated = db.transactions.some(
          (transaction) =>
            transaction.recurrence_id === recurrence.id &&
            transaction.transaction_date === dueDate &&
            !transaction.deleted_at,
        );
        if (!alreadyCreated) {
          const account = db.accounts.find((item) => item.id === recurrence.account_id);
          const transaction: Transaction = {
            id: createId(),
            household_id: recurrence.household_id,
            account_id: recurrence.account_id,
            transfer_account_id: null,
            category_id: recurrence.category_id,
            created_by: null,
            description: recurrence.description,
            normalized_description: normalizeText(recurrence.description),
            amount: recurrence.amount,
            type: recurrence.type,
            transaction_date: dueDate,
            payment_method: recurrence.type === 'expense' ? (account?.type === 'credit_card' ? 'credit_card' : 'cash') : null,
            notes: 'recurrence:auto',
            source: 'recurring',
            recurrence_id: recurrence.id,
            installment_group_id: null,
            installment_index: null,
            installment_total: null,
            installment_base_description: null,
            created_at: timestamp,
            updated_at: timestamp,
            deleted_at: null,
          };
          db.transactions.push(transaction);
          enqueueInline(db, 'transactions', transaction.id, transaction);
          created.push(transaction);
        }
        dueDate = nextRecurrenceDate(dueDate, recurrence.frequency);
        guard += 1;
      }

      if (recurrence.next_due_date !== dueDate) {
        recurrence.next_due_date = dueDate;
        recurrence.updated_at = timestamp;
        enqueueInline(db, 'recurrences', recurrence.id, recurrence);
      }
    }
  });
  return created;
}

export async function countPendingMutations() {
  const db = await readLocalDb();
  return db.mutation_queue.length;
}

export async function listPendingMutationSummary() {
  const db = await readLocalDb();
  const labels: Record<TableName, string> = {
    profiles: 'Perfis',
    households: 'Famílias',
    household_members: 'Membros',
    accounts: 'Contas',
    categories: 'Categorias',
    transactions: 'Transações',
    categorization_rules: 'Regras',
    budgets: 'Orçamentos',
    recurrences: 'Recorrências',
  };
  const counts = new Map<TableName, number>();
  for (const item of db.mutation_queue) counts.set(item.table_name, (counts.get(item.table_name) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([table, count]) => ({ table, label: labels[table], count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

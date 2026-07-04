import { defaultCategories } from '@/domain/categories';
import { Account, Budget, Category, CategorizationRule, Household, Recurrence, Transaction } from '@/domain/types';

export type MutationQueueItem = {
  id: string;
  table_name: TableName;
  row_id: string;
  operation: 'upsert' | 'delete';
  payload: string;
  created_at: string;
  attempts: number;
  last_error: string | null;
};

export type TableName = 'profiles' | 'households' | 'household_members' | 'accounts' | 'categories' | 'transactions' | 'categorization_rules' | 'budgets' | 'recurrences';

export type LocalDbState = {
  app_state: Record<string, string>;
  households: Household[];
  household_members: Array<{ id: string; household_id: string; user_id: string; role: string; created_at: string }>;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  categorization_rules: CategorizationRule[];
  budgets: Budget[];
  recurrences: Recurrence[];
  mutation_queue: MutationQueueItem[];
  sync_logs: Array<{ id: string; level: string; message: string; created_at: string }>;
  sync_state: Record<string, string>;
};

const storageKey = 'moneycopilot-local-db-v1';
const indexedDbName = 'moneycopilot-offline-db';
const indexedDbVersion = 2;
const indexedDbKvStore = 'kv';
const indexedDbStateKey = 'state';
const indexedDbStores = [
  'app_state',
  'households',
  'household_members',
  'accounts',
  'categories',
  'transactions',
  'categorization_rules',
  'budgets',
  'recurrences',
  'mutation_queue',
  'sync_logs',
  'sync_state',
] as const;
const mergedRestaurantCategoryId = 'cat_expense_restaurants';
const foodCategoryId = 'cat_expense_food';

let memoryState: LocalDbState | null = null;
let indexedDbUnavailable = false;

function initialState(): LocalDbState {
  return {
    app_state: {},
    households: [],
    household_members: [],
    accounts: [],
    categories: defaultCategories,
    transactions: [],
    categorization_rules: [],
    budgets: [],
    recurrences: [],
    mutation_queue: [],
    sync_logs: [],
    sync_state: {},
  };
}

function coerceState(state: Partial<LocalDbState> | null | undefined): LocalDbState {
  const initial = initialState();
  return {
    app_state: state?.app_state ?? initial.app_state,
    households: state?.households ?? initial.households,
    household_members: state?.household_members ?? initial.household_members,
    accounts: state?.accounts ?? initial.accounts,
    categories: state?.categories ?? initial.categories,
    transactions: state?.transactions ?? initial.transactions,
    categorization_rules: state?.categorization_rules ?? initial.categorization_rules,
    budgets: state?.budgets ?? initial.budgets,
    recurrences: state?.recurrences ?? initial.recurrences,
    mutation_queue: state?.mutation_queue ?? initial.mutation_queue,
    sync_logs: state?.sync_logs ?? initial.sync_logs,
    sync_state: state?.sync_state ?? initial.sync_state,
  };
}

function normalize(input: Partial<LocalDbState> | null | undefined): LocalDbState {
  const state = coerceState(input);
  const defaultsById = new Map(defaultCategories.map((category) => [category.id, category]));
  const categories = (state.categories ?? [])
    .filter((category) => category.id !== mergedRestaurantCategoryId)
    .map((category) => {
      const defaultCategory = defaultsById.get(category.id);
      return defaultCategory && category.is_default
        ? { ...category, name: defaultCategory.name, color: defaultCategory.color, icon: defaultCategory.icon }
        : category;
    });
  const categoryIds = new Set(categories.map((category) => category.id));
  for (const category of defaultCategories) {
    if (!categoryIds.has(category.id)) categories.push(category);
  }
  const accounts = (state.accounts ?? []).map((account) => ({
    ...account,
    name:
      account.name === 'Cartao de Credito'
        ? 'Cartão de Crédito'
        : account.name === 'Reserva Emergencia'
          ? 'Reserva Emergência'
          : account.name,
    credit_card_due_day: account.type === 'credit_card' ? account.credit_card_due_day ?? 10 : null,
    credit_card_best_purchase_day: account.type === 'credit_card' ? account.credit_card_best_purchase_day ?? 3 : null,
  }));
  const households = (state.households ?? []).map((household) => ({
    ...household,
    name: household.name === 'Familia' ? 'Família' : household.name,
  }));
  const creditCardIds = new Set(accounts.filter((account) => account.type === 'credit_card').map((account) => account.id));
  const transactions = (state.transactions ?? []).map((transaction) => ({
    ...transaction,
    category_id: transaction.category_id === mergedRestaurantCategoryId ? foodCategoryId : transaction.category_id,
    payment_method:
      transaction.type === 'expense'
        ? transaction.payment_method ?? (transaction.account_id && creditCardIds.has(transaction.account_id) ? 'credit_card' : 'cash')
        : null,
    installment_group_id: transaction.installment_group_id ?? null,
    installment_index: transaction.installment_index ?? null,
    installment_total: transaction.installment_total ?? null,
    installment_base_description: transaction.installment_base_description ?? null,
  }));
  const categorization_rules = (state.categorization_rules ?? []).map((rule) => ({
    ...rule,
    category_id: rule.category_id === mergedRestaurantCategoryId ? foodCategoryId : rule.category_id,
  }));
  const recurrences = (state.recurrences ?? []).map((recurrence) => ({
    ...recurrence,
    category_id: recurrence.category_id === mergedRestaurantCategoryId ? foodCategoryId : recurrence.category_id,
  }));
  const budgetMap = new Map<string, Budget>();
  for (const budget of state.budgets ?? []) {
    const category_id = budget.category_id === mergedRestaurantCategoryId ? foodCategoryId : budget.category_id;
    if (budget.category_id === mergedRestaurantCategoryId && budget.deleted_at) continue;
    const key = `${budget.household_id}:${category_id}:${budget.month}`;
    const existing = budgetMap.get(key);
    if (!existing) {
      budgetMap.set(key, { ...budget, category_id });
      continue;
    }
    if (budget.deleted_at) continue;
    budgetMap.set(key, {
      ...existing,
      amount: (existing.deleted_at ? 0 : Number(existing.amount)) + Number(budget.amount),
      updated_at: existing.updated_at > budget.updated_at ? existing.updated_at : budget.updated_at,
      deleted_at: null,
    });
  }
  const budgets = Array.from(budgetMap.values());
  return { ...initialState(), ...state, households, accounts, transactions, categories, categorization_rules, budgets, recurrences };
}

export async function initLocalDb() {
  const state = await readLocalDb();
  await writeLocalDb(normalize(state));
}

function canUseIndexedDb() {
  return typeof window !== 'undefined' && !indexedDbUnavailable && 'indexedDB' in window;
}

function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!canUseIndexedDb()) {
      reject(new Error('IndexedDB indisponível.'));
      return;
    }
    const request = window.indexedDB.open(indexedDbName, indexedDbVersion);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(indexedDbKvStore)) db.createObjectStore(indexedDbKvStore);
      for (const store of indexedDbStores) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: store === 'app_state' || store === 'sync_state' ? 'key' : 'id' });
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Erro ao abrir IndexedDB.'));
    request.onblocked = () => reject(new Error('IndexedDB bloqueado por outra aba.'));
  });
}

function stateIsEmpty(input: Partial<LocalDbState> | null | undefined) {
  const state = coerceState(input);
  return (
    Object.keys(state.app_state).length === 0 &&
    state.households.length === 0 &&
    state.household_members.length === 0 &&
    state.accounts.length === 0 &&
    state.transactions.length === 0 &&
    state.categorization_rules.length === 0 &&
    state.budgets.length === 0 &&
    state.recurrences.length === 0 &&
    state.mutation_queue.length === 0 &&
    state.sync_logs.length === 0 &&
    Object.keys(state.sync_state).length === 0
  );
}

function objectToKeyValueRows(record: Record<string, string>) {
  return Object.entries(record).map(([key, value]) => ({ key, value }));
}

function keyValueRowsToObject(rows: Array<{ key: string; value: string }>) {
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

async function readIndexedState(): Promise<Partial<LocalDbState> | null> {
  if (!canUseIndexedDb()) return null;
  try {
    const db = await openOfflineDb();
    return await new Promise<Partial<LocalDbState> | null>((resolve, reject) => {
      const transaction = db.transaction([...indexedDbStores, indexedDbKvStore], 'readonly');
      const result = initialState();
      let legacyState: Partial<LocalDbState> | null = null;
      let pending = indexedDbStores.length + 1;

      const done = () => {
        pending -= 1;
        if (pending > 0) return;
        const structured = normalize(result);
        resolve(stateIsEmpty(structured) ? legacyState : structured);
      };

      for (const storeName of indexedDbStores) {
        const request = transaction.objectStore(storeName).getAll();
        request.onsuccess = () => {
          const rows = request.result;
          if (storeName === 'app_state' || storeName === 'sync_state') {
            result[storeName] = keyValueRowsToObject(rows as Array<{ key: string; value: string }>);
          } else {
            (result[storeName] as unknown[]) = rows;
          }
          done();
        };
        request.onerror = () => reject(request.error ?? new Error(`Erro ao ler ${storeName}.`));
      }

      const legacyRequest = transaction.objectStore(indexedDbKvStore).get(indexedDbStateKey);
      legacyRequest.onsuccess = () => {
        legacyState = (legacyRequest.result as Partial<LocalDbState> | undefined) ?? null;
        done();
      };
      legacyRequest.onerror = () => reject(legacyRequest.error ?? new Error('Erro ao ler cache legado.'));

      transaction.oncomplete = () => db.close();
      transaction.onerror = () => {
        db.close();
        reject(transaction.error ?? new Error('Transação IndexedDB falhou.'));
      };
    });
  } catch {
    indexedDbUnavailable = true;
    return null;
  }
}

async function writeIndexedState(state: LocalDbState): Promise<boolean> {
  if (!canUseIndexedDb()) return false;
  try {
    const db = await openOfflineDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([...indexedDbStores, indexedDbKvStore], 'readwrite');
      const rowsByStore = {
        app_state: objectToKeyValueRows(state.app_state),
        households: state.households,
        household_members: state.household_members,
        accounts: state.accounts,
        categories: state.categories,
        transactions: state.transactions,
        categorization_rules: state.categorization_rules,
        budgets: state.budgets,
        recurrences: state.recurrences,
        mutation_queue: state.mutation_queue,
        sync_logs: state.sync_logs,
        sync_state: objectToKeyValueRows(state.sync_state),
      };

      for (const storeName of indexedDbStores) {
        const store = transaction.objectStore(storeName);
        store.clear();
        for (const row of rowsByStore[storeName]) store.put(row);
      }
      transaction.objectStore(indexedDbKvStore).put({ schema: indexedDbVersion, migrated_at: new Date().toISOString() }, indexedDbStateKey);
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error ?? new Error('Erro ao gravar IndexedDB.'));
      };
    });
    return true;
  } catch {
    indexedDbUnavailable = true;
    return false;
  }
}

function readLocalStorageState(): Partial<LocalDbState> | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage?.getItem(storageKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Partial<LocalDbState>;
  } catch {
    return null;
  }
}

function hasLocalStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function writeLocalStorageState(state: LocalDbState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.setItem(storageKey, JSON.stringify(state));
  } catch {
    // LocalStorage pode estar indisponível ou cheio; IndexedDB/memória seguem como fonte.
  }
}

export async function readLocalDb(): Promise<LocalDbState> {
  if (typeof window === 'undefined') return initialState();

  const indexedState = await readIndexedState();
  if (indexedState) {
    memoryState = normalize(indexedState);
    return memoryState;
  }

  const localStorageState = readLocalStorageState();
  if (localStorageState) {
    const normalized = normalize(localStorageState);
    memoryState = normalized;
    await writeIndexedState(normalized);
    return normalized;
  }

  if (hasLocalStorage()) return initialState();

  return memoryState ? normalize(memoryState) : initialState();
}

export async function writeLocalDb(state: LocalDbState) {
  if (typeof window === 'undefined') return;
  const normalized = normalize(state);
  memoryState = normalized;
  const persisted = await writeIndexedState(normalized);
  if (!persisted) writeLocalStorageState(normalized);
}

export async function updateLocalDb<T>(mutator: (state: LocalDbState) => T | Promise<T>) {
  const state = await readLocalDb();
  const result = await mutator(state);
  await writeLocalDb(state);
  return result;
}

export async function resetLocalDb() {
  await writeLocalDb(initialState());
  await initLocalDb();
}

export const __localDbTestUtils = {
  normalize,
};

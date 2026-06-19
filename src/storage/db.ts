import { defaultCategories } from '@/domain/categories';
import { Account, Budget, Category, CategorizationRule, Household, Recurrence, Transaction } from '@/domain/types';

type MutationQueueItem = {
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

function normalize(state: LocalDbState): LocalDbState {
  const defaultsById = new Map(defaultCategories.map((category) => [category.id, category]));
  const categories = state.categories.map((category) => {
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
    payment_method:
      transaction.type === 'expense'
        ? transaction.payment_method ?? (transaction.account_id && creditCardIds.has(transaction.account_id) ? 'credit_card' : 'cash')
        : null,
  }));
  return { ...initialState(), ...state, households, accounts, transactions, categories };
}

export async function initLocalDb() {
  const state = await readLocalDb();
  await writeLocalDb(normalize(state));
}

export async function readLocalDb(): Promise<LocalDbState> {
  if (typeof window === 'undefined') return initialState();
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return initialState();
  try {
    return normalize(JSON.parse(raw) as LocalDbState);
  } catch {
    return initialState();
  }
}

export async function writeLocalDb(state: LocalDbState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey, JSON.stringify(normalize(state)));
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

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
  const categoryIds = new Set(state.categories.map((category) => category.id));
  const categories = [...state.categories];
  for (const category of defaultCategories) {
    if (!categoryIds.has(category.id)) categories.push(category);
  }
  return { ...initialState(), ...state, categories };
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

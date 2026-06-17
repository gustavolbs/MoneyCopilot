import { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { defaultCategories } from '@/domain/categories';
import { generateInsights, Insight } from '@/domain/insights';
import { monthKey } from '@/domain/normalize';
import { Account, Budget, Category, CategorizationRule, Household, Recurrence, Transaction } from '@/domain/types';
import { isSupabaseConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { initLocalDb, resetLocalDb } from '@/storage/db';
import {
  countPendingMutations,
  createLocalHousehold,
  reconcileHouseholdOwnership,
  reconcileHouseholds,
  createRecurrence,
  createAccount,
  createTransactionsFromInput,
  getHousehold,
  listAccounts,
  listBudgets,
  listCategories,
  listRecurrences,
  listRules,
  listTransactions,
  setAppState,
  softDeleteTransaction,
  updateTransactionCategory,
  updateTransaction,
  upsertBudget,
} from '@/storage/repository';
import { isOnline, listSyncLogs, syncNow } from '@/storage/sync';

type SyncStatus = 'idle' | 'offline' | 'syncing' | 'error';

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return Promise.race<T>([
    promise,
    new Promise<T>((_resolve, reject) => {
      window.setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}

type AppState = {
  bootstrapped: boolean;
  loading: boolean;
  session: Session | null;
  userId: string | null;
  household: Household | null;
  categories: Category[];
  accounts: Account[];
  transactions: Transaction[];
  rules: CategorizationRule[];
  budgets: Budget[];
  recurrences: Recurrence[];
  insights: Insight[];
  pendingMutations: number;
  syncStatus: SyncStatus;
  syncLogs: Array<{ level: string; message: string; created_at: string }>;
  error: string | null;
  bootstrap: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  ensureHousehold: (name?: string) => Promise<void>;
  refresh: () => Promise<void>;
  addQuickInput: (input: string) => Promise<void>;
  changeTransactionCategory: (transaction: Transaction, categoryId: string) => Promise<void>;
  deleteTransaction: (transaction: Transaction) => Promise<void>;
  editTransaction: (transaction: Transaction, patch: Partial<Pick<Transaction, 'description' | 'amount' | 'type' | 'category_id' | 'account_id' | 'transfer_account_id' | 'transaction_date' | 'notes'>>) => Promise<void>;
  saveBudget: (categoryId: string, amount: number) => Promise<void>;
  addRecurrence: (transaction: Transaction) => Promise<void>;
  sync: () => Promise<void>;
  resetCache: () => Promise<void>;
  addAccount: (name: string, type: Account['type']) => Promise<void>;
};

export const useAppStore = create<AppState>((set, get) => ({
  bootstrapped: false,
  loading: false,
  session: null,
  userId: null,
  household: null,
  categories: defaultCategories,
  accounts: [],
  transactions: [],
  rules: [],
  budgets: [],
  recurrences: [],
  insights: [],
  pendingMutations: 0,
  syncStatus: 'idle',
  syncLogs: [],
  error: null,

  bootstrap: async () => {
    set({ loading: true, error: null });
    try {
      await initLocalDb();
      const online = await isOnline();
      let session: Session | null = null;
      if (isSupabaseConfigured()) {
        const result = await withTimeout(supabase.auth.getSession(), 8000, 'Tempo esgotado ao restaurar sessao.');
        session = result.data.session;
        supabase.auth.onAuthStateChange((_event, nextSession) => {
          set({ session: nextSession, userId: nextSession?.user.id ?? null });
          void get().ensureHousehold();
        });
      }
      const household = await getHousehold();
      set({
        session,
        userId: session?.user.id ?? 'local-user',
        household,
        bootstrapped: true,
        loading: false,
        syncStatus: online ? 'idle' : 'offline',
      });
      // Só cria/garante a household automaticamente quando não há login obrigatório
      // (Supabase desconfigurado) ou já existe sessão real. Caso contrário a household
      // nasceria com 'local-user' e quebraria a RLS depois do login.
      if (!isSupabaseConfigured() || session) await get().ensureHousehold();
      await get().refresh();
      if (online) void get().sync();
    } catch (error) {
      set({
        bootstrapped: true,
        loading: false,
        userId: 'local-user',
        syncStatus: 'offline',
        error: error instanceof Error ? error.message : 'Erro ao iniciar o app.',
      });
    }
  },

  signIn: async (email, password) => {
    if (!isSupabaseConfigured()) throw new Error('Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ loading: false, error: error.message });
      throw error;
    }
    set({ session: data.session, userId: data.user?.id ?? null, loading: false });
    await get().ensureHousehold();
    await get().refresh();
  },

  signUp: async (email, password, fullName) => {
    if (!isSupabaseConfigured()) throw new Error('Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    if (error) {
      set({ loading: false, error: error.message });
      throw error;
    }
    set({ session: data.session, userId: data.user?.id ?? null, loading: false });
    await get().ensureHousehold();
    await get().refresh();
  },

  signOut: async () => {
    if (isSupabaseConfigured()) await supabase.auth.signOut();
    set({ session: null, userId: null });
  },

  ensureHousehold: async (name = 'Familia') => {
    const userId = get().userId ?? 'local-user';
    const authenticated = !isSupabaseConfigured() || (Boolean(get().session) && userId !== 'local-user');
    let household = get().household ?? (await getHousehold());
    if (!household) {
      // Não cria household com usuário placeholder quando o login é obrigatório.
      if (!authenticated) return;
      household = await createLocalHousehold(userId, name);
    } else if (authenticated) {
      // Household já existia (possivelmente criada offline): garante que pertença ao usuário real.
      await reconcileHouseholdOwnership(userId);
      household = (await getHousehold()) ?? household;
    }
    await setAppState('current_household_id', household.id);
    set({ household });
  },

  refresh: async () => {
    const household = get().household ?? (await getHousehold());
    const categories = await listCategories();
    if (!household) {
      set({ categories });
      return;
    }
    const [accounts, transactions, rules, budgets, recurrences, pendingMutations, syncLogs] = await Promise.all([
      listAccounts(household.id),
      listTransactions(household.id),
      listRules(household.id),
      listBudgets(household.id),
      listRecurrences(household.id),
      countPendingMutations(),
      listSyncLogs(),
    ]);
    const currentMonth = monthKey();
    const previous = new Date();
    previous.setMonth(previous.getMonth() - 1);
    set({
      household,
      categories,
      accounts,
      transactions,
      rules,
      budgets,
      recurrences,
      pendingMutations,
      syncLogs,
      insights: generateInsights({ transactions, categories, budgets, recurrences, month: currentMonth, previousMonth: monthKey(previous) }),
    });
  },

  addQuickInput: async (input) => {
    const { household, userId, categories, rules, accounts } = get();
    if (!household) return;
    await createTransactionsFromInput({ input, householdId: household.id, userId, context: { categories, rules, accounts } });
    await get().refresh();
    void get().sync();
  },

  changeTransactionCategory: async (transaction, categoryId) => {
    await updateTransactionCategory(transaction, categoryId, true);
    await get().refresh();
    void get().sync();
  },

  deleteTransaction: async (transaction) => {
    await softDeleteTransaction(transaction);
    await get().refresh();
    void get().sync();
  },

  editTransaction: async (transaction, patch) => {
    await updateTransaction(transaction, patch);
    if (patch.category_id && patch.category_id !== transaction.category_id) {
      await updateTransactionCategory({ ...transaction, ...patch }, patch.category_id, true);
    }
    await get().refresh();
    void get().sync();
  },

  saveBudget: async (categoryId, amount) => {
    const household = get().household;
    if (!household) return;
    await upsertBudget(household.id, categoryId, monthKey(), amount);
    await get().refresh();
    void get().sync();
  },

  addRecurrence: async (transaction) => {
    await createRecurrence({
      household_id: transaction.household_id,
      account_id: transaction.account_id,
      category_id: transaction.category_id,
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      frequency: 'monthly',
      day_of_month: Number(transaction.transaction_date.slice(8, 10)),
      next_due_date: transaction.transaction_date,
      active: true,
    });
    await get().refresh();
    void get().sync();
  },

  sync: async () => {
    const online = await isOnline();
    if (!online) {
      set({ syncStatus: 'offline' });
      return;
    }
    set({ syncStatus: 'syncing' });
    try {
      const userId = get().userId;
      await syncNow(get().household?.id);
      // Apos o pull, converge dispositivos para uma unica household (corrige dados que
      // nao apareciam entre desktop e mobile na mesma conta).
      if (userId && userId !== 'local-user') {
        const { household: canonical, changed } = await reconcileHouseholds(userId);
        if (canonical && canonical.id !== get().household?.id) set({ household: canonical });
        if (canonical && changed) await syncNow(canonical.id); // envia migrados + re-pull completo
      }
      await get().refresh();
      set({ syncStatus: 'idle' });
    } catch (error) {
      set({ syncStatus: 'error', error: error instanceof Error ? error.message : 'Erro de sincronizacao' });
    }
  },

  resetCache: async () => {
    await resetLocalDb();
    set({ household: null, transactions: [], accounts: [], budgets: [], recurrences: [], rules: [] });
    await get().ensureHousehold();
    await get().refresh();
  },

  addAccount: async (name, type) => {
    const household = get().household;
    if (!household || !name.trim()) return;
    await createAccount(household.id, name.trim(), type);
    await get().refresh();
    void get().sync();
  },
}));

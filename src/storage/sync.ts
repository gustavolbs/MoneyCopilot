import { isSupabaseConfigured } from '@/lib/env';
import { createId } from '@/lib/id';
import { supabase } from '@/lib/supabase';

import { readLocalDb, TableName, updateLocalDb } from './db';

const syncTables = ['households', 'household_members', 'accounts', 'categories', 'transactions', 'categorization_rules', 'budgets', 'recurrences'] as const;

async function logSync(level: 'info' | 'error', message: string) {
  await updateLocalDb((db) => {
    db.sync_logs.unshift({ id: createId(), level, message, created_at: new Date().toISOString() });
    db.sync_logs = db.sync_logs.slice(0, 30);
  });
}

export async function isOnline() {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

export async function syncNow(householdId?: string) {
  if (!isSupabaseConfigured()) {
    await logSync('info', 'Supabase nao configurado; sync remoto ignorado.');
    return { pushed: 0, pulled: 0, skipped: true };
  }
  if (!(await isOnline())) {
    await logSync('info', 'Sem internet; sync adiado.');
    return { pushed: 0, pulled: 0, skipped: true };
  }

  const queue = (await readLocalDb()).mutation_queue
    .slice()
    .sort((a, b) => tableOrder(a.table_name) - tableOrder(b.table_name) || a.created_at.localeCompare(b.created_at))
    .slice(0, 100);

  let pushed = 0;
  for (const item of queue) {
    const payload = JSON.parse(item.payload) as Record<string, unknown>;
    const { error } = await supabase.from(item.table_name).upsert(payload, { onConflict: 'id' });
    if (error) {
      await updateLocalDb((db) => {
        const queued = db.mutation_queue.find((row) => row.id === item.id);
        if (queued) {
          queued.attempts += 1;
          queued.last_error = error.message;
        }
      });
      await logSync('error', `${item.table_name}:${item.row_id} falhou: ${error.message}`);
    } else {
      await updateLocalDb((db) => {
        db.mutation_queue = db.mutation_queue.filter((row) => row.id !== item.id);
      });
      pushed += 1;
    }
  }

  let pulled = 0;
  if (householdId) {
    for (const table of syncTables) {
      const state = await readLocalDb();
      let query = supabase.from(table).select('*');
      if (table !== 'households' && table !== 'household_members') query = query.eq('household_id', householdId);
      if (state.sync_state[table] && table !== 'households' && table !== 'household_members') query = query.gt('updated_at', state.sync_state[table]);
      const { data, error } = await query.limit(500);
      if (error) {
        await logSync('error', `${table} pull falhou: ${error.message}`);
        continue;
      }
      for (const row of data ?? []) {
        await upsertLocalRow(table, row as Record<string, unknown>);
        pulled += 1;
      }
      await updateLocalDb((db) => {
        db.sync_state[table] = new Date().toISOString();
      });
    }
  }

  await logSync('info', `Sync concluido. Push ${pushed}, pull ${pulled}.`);
  return { pushed, pulled, skipped: false };
}

function tableOrder(table: TableName) {
  return {
    households: 0,
    household_members: 1,
    accounts: 2,
    categories: 3,
    categorization_rules: 4,
    budgets: 5,
    recurrences: 6,
    transactions: 7,
    profiles: 8,
  }[table];
}

async function upsertLocalRow(tableName: (typeof syncTables)[number], row: Record<string, unknown>) {
  await updateLocalDb((db) => {
    const table = db[tableName] as Array<Record<string, unknown>>;
    const index = table.findIndex((item) => item.id === row.id);
    if (index >= 0) table[index] = row;
    else table.push(row);
  });
}

// Puxa households e memberships sem filtro de household (RLS limita ao que o usuario pode ver).
// Usado logo apos aceitar convites, para que a household recem-entrada apareca localmente
// antes de ensureHousehold decidir se cria uma nova.
export async function pullHouseholdsAndMembers() {
  if (!isSupabaseConfigured() || !(await isOnline())) return;
  for (const table of ['households', 'household_members'] as const) {
    const { data, error } = await supabase.from(table).select('*').limit(500);
    if (error) {
      await logSync('error', `${table} pull falhou: ${error.message}`);
      continue;
    }
    for (const row of data ?? []) await upsertLocalRow(table, row as Record<string, unknown>);
  }
}

export async function listSyncLogs() {
  const db = await readLocalDb();
  return db.sync_logs.map(({ level, message, created_at }) => ({ level, message, created_at })).slice(0, 30);
}

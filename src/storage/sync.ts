import * as Network from 'expo-network';

import { isSupabaseConfigured } from '@/lib/env';
import { createId } from '@/lib/id';
import { supabase } from '@/lib/supabase';

import { getDb } from './db';

type QueueRow = {
  id: string;
  table_name: string;
  row_id: string;
  operation: 'upsert' | 'delete';
  payload: string;
  attempts: number;
};

const syncTables = ['households', 'household_members', 'accounts', 'categories', 'transactions', 'categorization_rules', 'budgets', 'recurrences'] as const;

async function logSync(level: 'info' | 'error', message: string) {
  const db = await getDb();
  await db.runAsync('INSERT INTO sync_logs (id, level, message, created_at) VALUES (?, ?, ?, ?)', createId(), level, message, new Date().toISOString());
}

export async function isOnline() {
  const state = await Network.getNetworkStateAsync();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
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

  const db = await getDb();
  const queue = await db.getAllAsync<QueueRow>('SELECT * FROM mutation_queue ORDER BY created_at ASC LIMIT 100');
  let pushed = 0;
  for (const item of queue) {
    const payload = JSON.parse(item.payload) as Record<string, unknown>;
    const { error } = await supabase.from(item.table_name).upsert(payload, { onConflict: 'id' });
    if (error) {
      await db.runAsync('UPDATE mutation_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?', error.message, item.id);
      await logSync('error', `${item.table_name}:${item.row_id} falhou: ${error.message}`);
    } else {
      await db.runAsync('DELETE FROM mutation_queue WHERE id = ?', item.id);
      pushed += 1;
    }
  }

  let pulled = 0;
  if (householdId) {
    for (const table of syncTables) {
      const lastState = await db.getFirstAsync<{ last_pulled_at: string | null }>('SELECT last_pulled_at FROM sync_state WHERE table_name = ?', table);
      let query = supabase.from(table).select('*');
      if (table !== 'households' && table !== 'household_members') query = query.eq('household_id', householdId);
      if (lastState?.last_pulled_at && table !== 'households' && table !== 'household_members') {
        query = query.gt('updated_at', lastState.last_pulled_at);
      }
      const { data, error } = await query.limit(500);
      if (error) {
        await logSync('error', `${table} pull falhou: ${error.message}`);
        continue;
      }
      for (const row of data ?? []) {
        await upsertLocalRow(table, row as Record<string, unknown>);
        pulled += 1;
      }
      await db.runAsync('INSERT OR REPLACE INTO sync_state (table_name, last_pulled_at) VALUES (?, ?)', table, new Date().toISOString());
    }
  }

  await logSync('info', `Sync concluido. Push ${pushed}, pull ${pulled}.`);
  return { pushed, pulled, skipped: false };
}

async function upsertLocalRow(tableName: string, row: Record<string, unknown>) {
  const db = await getDb();
  const columns = Object.keys(row);
  const placeholders = columns.map(() => '?').join(', ');
  const values = columns.map((key) => {
    const value = row[key];
    if (typeof value === 'boolean') return value ? 1 : 0;
    return value as SQLiteBindValue;
  });
  await db.runAsync(`INSERT OR REPLACE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`, ...values);
}

type SQLiteBindValue = string | number | null;

export async function listSyncLogs() {
  const db = await getDb();
  return db.getAllAsync<{ level: string; message: string; created_at: string }>('SELECT level, message, created_at FROM sync_logs ORDER BY created_at DESC LIMIT 30');
}

import * as SQLite from 'expo-sqlite';

import { defaultCategories } from '@/domain/categories';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb() {
  dbPromise ??= SQLite.openDatabaseAsync('moneycopilot.db');
  return dbPromise;
}

export async function initLocalDb() {
  const db = await getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      full_name TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS households (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS household_members (
      id TEXT PRIMARY KEY NOT NULL,
      household_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY NOT NULL,
      household_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      initial_balance REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'BRL',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      household_id TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      household_id TEXT NOT NULL,
      account_id TEXT,
      transfer_account_id TEXT,
      category_id TEXT,
      created_by TEXT,
      description TEXT NOT NULL,
      normalized_description TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      transaction_date TEXT NOT NULL,
      notes TEXT,
      source TEXT NOT NULL,
      recurrence_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS categorization_rules (
      id TEXT PRIMARY KEY NOT NULL,
      household_id TEXT NOT NULL,
      pattern TEXT NOT NULL,
      match_type TEXT NOT NULL,
      category_id TEXT,
      account_id TEXT,
      type TEXT,
      priority INTEGER NOT NULL DEFAULT 100,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY NOT NULL,
      household_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      month TEXT NOT NULL,
      amount REAL NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS recurrences (
      id TEXT PRIMARY KEY NOT NULL,
      household_id TEXT NOT NULL,
      account_id TEXT,
      category_id TEXT,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      frequency TEXT NOT NULL,
      day_of_month INTEGER,
      next_due_date TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS mutation_queue (
      id TEXT PRIMARY KEY NOT NULL,
      table_name TEXT NOT NULL,
      row_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT
    );

    CREATE TABLE IF NOT EXISTS sync_logs (
      id TEXT PRIMARY KEY NOT NULL,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_state (
      table_name TEXT PRIMARY KEY NOT NULL,
      last_pulled_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_household_date ON transactions(household_id, transaction_date);
    CREATE INDEX IF NOT EXISTS idx_transactions_updated ON transactions(updated_at);
    CREATE INDEX IF NOT EXISTS idx_rules_household ON categorization_rules(household_id);
    CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(household_id, month);
  `);

  const transactionColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(transactions)');
  if (!transactionColumns.some((column) => column.name === 'transfer_account_id')) {
    await db.execAsync('ALTER TABLE transactions ADD COLUMN transfer_account_id TEXT;');
  }

  for (const category of defaultCategories) {
    await db.runAsync(
      `INSERT OR IGNORE INTO categories
       (id, household_id, name, type, icon, color, is_default, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      category.id,
      category.household_id,
      category.name,
      category.type,
      category.icon,
      category.color,
      category.is_default ? 1 : 0,
      category.created_at,
      category.updated_at,
      category.deleted_at,
    );
  }
}

export async function resetLocalDb() {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM app_state;
    DELETE FROM profiles;
    DELETE FROM households;
    DELETE FROM household_members;
    DELETE FROM accounts;
    DELETE FROM transactions;
    DELETE FROM categorization_rules;
    DELETE FROM budgets;
    DELETE FROM recurrences;
    DELETE FROM mutation_queue;
    DELETE FROM sync_logs;
    DELETE FROM sync_state;
  `);
  await initLocalDb();
}

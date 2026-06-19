export type TransactionType = 'income' | 'expense' | 'transfer';
export type PaymentMethod = 'cash' | 'credit_card';

type CategoryType = 'income' | 'expense' | 'both';
type MatchType = 'contains' | 'exact' | 'regex';
type AccountType = 'checking' | 'credit_card' | 'cash' | 'reserve' | 'investment' | 'other';

export type Household = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
};

export type Account = {
  id: string;
  household_id: string;
  name: string;
  type: AccountType;
  initial_balance: number;
  currency: string;
  credit_card_due_day: number | null;
  credit_card_best_purchase_day: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Category = {
  id: string;
  household_id: string | null;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Transaction = {
  id: string;
  household_id: string;
  account_id: string | null;
  transfer_account_id: string | null;
  category_id: string | null;
  created_by: string | null;
  description: string;
  normalized_description: string;
  amount: number;
  type: TransactionType;
  transaction_date: string;
  payment_method: PaymentMethod | null;
  notes: string | null;
  source: 'manual' | 'imported' | 'recurring';
  recurrence_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CategorizationRule = {
  id: string;
  household_id: string;
  pattern: string;
  match_type: MatchType;
  category_id: string | null;
  account_id: string | null;
  type: TransactionType | null;
  priority: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Budget = {
  id: string;
  household_id: string;
  category_id: string;
  month: string;
  amount: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Recurrence = {
  id: string;
  household_id: string;
  account_id: string | null;
  category_id: string | null;
  description: string;
  amount: number;
  type: TransactionType;
  frequency: 'weekly' | 'monthly' | 'yearly';
  day_of_month: number | null;
  next_due_date: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type UserRules = {
  categories: Category[];
  rules: CategorizationRule[];
  accounts?: Account[];
  today?: Date;
};

export type ParsedTransaction = {
  raw: string;
  description: string;
  normalized_description: string;
  amount: number;
  type: TransactionType;
  category_id: string | null;
  category_name: string;
  account_id: string | null;
  transfer_account_id: string | null;
  account_name_hint: string | null;
  transfer_account_name_hint: string | null;
  transaction_date: string;
  recurrence_hint: 'none' | 'probable_monthly' | 'probable_weekly';
  movement_kind: 'income' | 'payment' | 'transfer' | 'fixed_expense' | 'variable_expense';
  confidence: number;
};

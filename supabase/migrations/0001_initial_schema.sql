create extension if not exists "pgcrypto";

create type member_role as enum ('owner', 'member');
create type transaction_type as enum ('income', 'expense', 'transfer');
create type category_type as enum ('income', 'expense', 'both');
create type account_type as enum ('checking', 'credit_card', 'cash', 'reserve', 'investment', 'other');
create type transaction_source as enum ('manual', 'imported', 'recurring');
create type match_type as enum ('contains', 'exact', 'regex');
create type recurrence_frequency as enum ('weekly', 'monthly', 'yearly');

create table public.profiles (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create table public.households (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.household_members (
  id text primary key default gen_random_uuid()::text,
  household_id text not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role member_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create table public.household_invites (
  id text primary key default gen_random_uuid()::text,
  household_id text not null references public.households(id) on delete cascade,
  email text not null,
  role member_role not null default 'member',
  invited_by uuid not null references auth.users(id),
  accepted_by uuid references auth.users(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days'
);

create table public.accounts (
  id text primary key default gen_random_uuid()::text,
  household_id text not null references public.households(id) on delete cascade,
  name text not null,
  type account_type not null,
  initial_balance numeric(14,2) not null default 0,
  currency text not null default 'BRL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.categories (
  id text primary key default gen_random_uuid()::text,
  household_id text references public.households(id) on delete cascade,
  name text not null,
  type category_type not null,
  icon text not null,
  color text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.transactions (
  id text primary key default gen_random_uuid()::text,
  household_id text not null references public.households(id) on delete cascade,
  account_id text references public.accounts(id),
  transfer_account_id text references public.accounts(id),
  category_id text references public.categories(id),
  created_by uuid references auth.users(id),
  description text not null,
  normalized_description text not null,
  amount numeric(14,2) not null check (amount >= 0),
  type transaction_type not null,
  transaction_date date not null,
  notes text,
  source transaction_source not null default 'manual',
  recurrence_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.categorization_rules (
  id text primary key default gen_random_uuid()::text,
  household_id text not null references public.households(id) on delete cascade,
  pattern text not null,
  match_type match_type not null default 'contains',
  category_id text references public.categories(id),
  account_id text references public.accounts(id),
  type transaction_type,
  priority integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.budgets (
  id text primary key default gen_random_uuid()::text,
  household_id text not null references public.households(id) on delete cascade,
  category_id text not null references public.categories(id),
  month text not null,
  amount numeric(14,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (household_id, category_id, month)
);

create table public.recurrences (
  id text primary key default gen_random_uuid()::text,
  household_id text not null references public.households(id) on delete cascade,
  account_id text references public.accounts(id),
  category_id text references public.categories(id),
  description text not null,
  amount numeric(14,2) not null check (amount >= 0),
  type transaction_type not null,
  frequency recurrence_frequency not null,
  day_of_month integer,
  next_due_date date not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.sync_metadata (
  id text primary key default gen_random_uuid()::text,
  household_id text not null references public.households(id) on delete cascade,
  device_id text,
  last_sync_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger accounts_touch_updated_at before update on public.accounts for each row execute function public.touch_updated_at();
create trigger categories_touch_updated_at before update on public.categories for each row execute function public.touch_updated_at();
create trigger transactions_touch_updated_at before update on public.transactions for each row execute function public.touch_updated_at();
create trigger rules_touch_updated_at before update on public.categorization_rules for each row execute function public.touch_updated_at();
create trigger budgets_touch_updated_at before update on public.budgets for each row execute function public.touch_updated_at();
create trigger recurrences_touch_updated_at before update on public.recurrences for each row execute function public.touch_updated_at();

create or replace function public.is_household_member(target_household_id text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.household_members hm
    where hm.household_id = target_household_id
      and hm.user_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.categorization_rules enable row level security;
alter table public.budgets enable row level security;
alter table public.recurrences enable row level security;
alter table public.sync_metadata enable row level security;

create policy "profiles own access" on public.profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

create policy "households select as member" on public.households for select using (public.is_household_member(id) or created_by = auth.uid());
create policy "households insert own" on public.households for insert with check (created_by = auth.uid());
create policy "households update owner" on public.households for update using (exists (select 1 from public.household_members hm where hm.household_id = id and hm.user_id = auth.uid() and hm.role = 'owner'));

create policy "members select same household" on public.household_members for select using (public.is_household_member(household_id) or user_id = auth.uid());
create policy "members insert owner or self bootstrap" on public.household_members for insert with check (
  user_id = auth.uid()
  or exists (select 1 from public.household_members hm where hm.household_id = household_id and hm.user_id = auth.uid() and hm.role = 'owner')
);
create policy "members update owner" on public.household_members for update using (exists (select 1 from public.household_members hm where hm.household_id = household_id and hm.user_id = auth.uid() and hm.role = 'owner'));

create policy "invites household owners" on public.household_invites for all using (
  exists (select 1 from public.household_members hm where hm.household_id = household_id and hm.user_id = auth.uid() and hm.role = 'owner')
) with check (
  exists (select 1 from public.household_members hm where hm.household_id = household_id and hm.user_id = auth.uid() and hm.role = 'owner')
);

create policy "categories read default or member" on public.categories for select using (household_id is null or public.is_household_member(household_id));
create policy "categories write household" on public.categories for all using (household_id is not null and public.is_household_member(household_id)) with check (household_id is not null and public.is_household_member(household_id));

create policy "accounts household access" on public.accounts for all using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "transactions household access" on public.transactions for all using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "rules household access" on public.categorization_rules for all using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "budgets household access" on public.budgets for all using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "recurrences household access" on public.recurrences for all using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "sync metadata household access" on public.sync_metadata for all using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));

create index accounts_household_idx on public.accounts(household_id) where deleted_at is null;
create index categories_household_idx on public.categories(household_id) where deleted_at is null;
create index transactions_household_date_idx on public.transactions(household_id, transaction_date) where deleted_at is null;
create index transactions_updated_idx on public.transactions(updated_at);
create index rules_household_idx on public.categorization_rules(household_id) where deleted_at is null;
create index budgets_household_month_idx on public.budgets(household_id, month) where deleted_at is null;
create index recurrences_household_due_idx on public.recurrences(household_id, next_due_date) where deleted_at is null;

insert into public.categories (id, household_id, name, type, icon, color, is_default)
values
  ('cat_income_salary', null, 'Salário', 'income', 'briefcase', '#2F80ED', true),
  ('cat_income_rent', null, 'Aluguel Recebido', 'income', 'home', '#10B981', true),
  ('cat_income_refund', null, 'Reembolso', 'income', 'refresh-cw', '#8B5CF6', true),
  ('cat_income_yield', null, 'Rendimentos', 'income', 'trending-up', '#D9A441', true),
  ('cat_income_other', null, 'Outros Recebimentos', 'income', 'wallet', '#6B7280', true),
  ('cat_expense_housing', null, 'Moradia', 'expense', 'home', '#64748B', true),
  ('cat_expense_food', null, 'Alimentação', 'expense', 'utensils', '#F59E0B', true),
  ('cat_expense_restaurants', null, 'Restaurantes', 'expense', 'chef-hat', '#F9735B', true),
  ('cat_expense_market', null, 'Mercado', 'expense', 'shopping-cart', '#41B883', true),
  ('cat_expense_transport', null, 'Transporte', 'expense', 'car', '#3B82F6', true),
  ('cat_expense_health', null, 'Saúde', 'expense', 'heart-pulse', '#EF4444', true),
  ('cat_expense_veterinary', null, 'Pets', 'expense', 'paw-print', '#F97316', true),
  ('cat_expense_education', null, 'Educação', 'expense', 'graduation-cap', '#7C3AED', true),
  ('cat_expense_subscriptions', null, 'Assinaturas', 'expense', 'repeat', '#06B6D4', true),
  ('cat_expense_internet', null, 'Internet/Telefone', 'expense', 'wifi', '#0EA5E9', true),
  ('cat_expense_utilities', null, 'Energia/Água', 'expense', 'zap', '#EAB308', true),
  ('cat_expense_shopping', null, 'Compras', 'expense', 'shopping-bag', '#EC4899', true),
  ('cat_expense_leisure', null, 'Lazer', 'expense', 'sparkles', '#A855F7', true),
  ('cat_expense_travel', null, 'Viagens', 'expense', 'plane', '#14B8A6', true),
  ('cat_expense_family', null, 'Família', 'expense', 'users', '#84CC16', true),
  ('cat_expense_taxes', null, 'Impostos', 'expense', 'landmark', '#78716C', true),
  ('cat_expense_investments', null, 'Investimentos', 'expense', 'chart-no-axes-combined', '#22C55E', true),
  ('cat_expense_credit_card', null, 'Cartão de Crédito', 'expense', 'credit-card', '#111827', true),
  ('cat_expense_other', null, 'Outros', 'expense', 'circle', '#9CA3AF', true)
on conflict (id) do nothing;

alter table public.accounts
  add column if not exists credit_card_due_day integer,
  add column if not exists credit_card_best_purchase_day integer;

alter table public.accounts
  drop constraint if exists accounts_credit_card_due_day_check,
  add constraint accounts_credit_card_due_day_check
    check (credit_card_due_day is null or credit_card_due_day between 1 and 31),
  drop constraint if exists accounts_credit_card_best_purchase_day_check,
  add constraint accounts_credit_card_best_purchase_day_check
    check (credit_card_best_purchase_day is null or credit_card_best_purchase_day between 1 and 31);

update public.accounts
set
  credit_card_due_day = coalesce(credit_card_due_day, 10),
  credit_card_best_purchase_day = coalesce(credit_card_best_purchase_day, 3)
where type = 'credit_card';

alter table public.transactions
  add column if not exists payment_method text;

alter table public.transactions
  drop constraint if exists transactions_payment_method_check,
  add constraint transactions_payment_method_check
    check (payment_method is null or payment_method in ('cash', 'credit_card'));

update public.transactions t
set payment_method = case
  when t.type <> 'expense' then null
  when exists (
    select 1 from public.accounts a
    where a.id = t.account_id and a.type = 'credit_card'
  ) then 'credit_card'
  else 'cash'
end
where payment_method is null;

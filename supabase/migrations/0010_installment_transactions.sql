alter table public.transactions
  add column if not exists installment_group_id text,
  add column if not exists installment_index integer,
  add column if not exists installment_total integer,
  add column if not exists installment_base_description text;

alter table public.transactions
  drop constraint if exists transactions_installment_index_check,
  add constraint transactions_installment_index_check
    check (installment_index is null or installment_index >= 1),
  drop constraint if exists transactions_installment_total_check,
  add constraint transactions_installment_total_check
    check (installment_total is null or installment_total >= 2),
  drop constraint if exists transactions_installment_bounds_check,
  add constraint transactions_installment_bounds_check
    check (
      installment_index is null
      or installment_total is null
      or installment_index <= installment_total
    );

create index if not exists transactions_installment_group_idx
  on public.transactions(installment_group_id)
  where installment_group_id is not null and deleted_at is null;

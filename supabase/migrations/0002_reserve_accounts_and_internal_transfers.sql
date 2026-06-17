alter type account_type add value if not exists 'reserve';

alter table public.transactions
  add column if not exists transfer_account_id text references public.accounts(id);

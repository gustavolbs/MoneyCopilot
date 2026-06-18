insert into public.categories (id, household_id, name, type, icon, color, is_default)
values
  ('cat_expense_veterinary', null, 'Pets', 'expense', 'paw-print', '#F97316', true),
  ('cat_expense_investments', null, 'Investimentos', 'expense', 'chart-no-axes-combined', '#22C55E', true)
on conflict (id) do update set
  name = excluded.name,
  type = excluded.type,
  icon = excluded.icon,
  color = excluded.color,
  is_default = excluded.is_default,
  updated_at = timezone('utc', now());

update public.categories
set name = case id
  when 'cat_expense_utilities' then 'Energia/Água/Gás'
  when 'cat_expense_family' then 'Filhos/Dependentes'
  when 'cat_expense_taxes' then 'Impostos/PJ'
  else name
end,
updated_at = timezone('utc', now())
where id in (
  'cat_expense_utilities',
  'cat_expense_family',
  'cat_expense_taxes'
);

insert into public.categories (id, household_id, name, type, icon, color, is_default)
values
  ('cat_expense_home_services', null, 'Serviços e Manutenção Doméstica', 'expense', 'hammer', '#B45309', true),
  ('cat_expense_personal_care', null, 'Cuidados Pessoais', 'expense', 'scissors', '#DB2777', true)
on conflict (id) do update set
  name = excluded.name,
  icon = excluded.icon,
  color = excluded.color,
  updated_at = timezone('utc', now());

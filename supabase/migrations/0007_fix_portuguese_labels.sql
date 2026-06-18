update public.categories
set name = case id
  when 'cat_income_salary' then 'Salário'
  when 'cat_expense_food' then 'Alimentação'
  when 'cat_expense_health' then 'Saúde'
  when 'cat_expense_education' then 'Educação'
  when 'cat_expense_utilities' then 'Energia/Água'
  when 'cat_expense_family' then 'Família'
  when 'cat_expense_credit_card' then 'Cartão de Crédito'
  else name
end,
updated_at = timezone('utc', now())
where id in (
  'cat_income_salary',
  'cat_expense_food',
  'cat_expense_health',
  'cat_expense_education',
  'cat_expense_utilities',
  'cat_expense_family',
  'cat_expense_credit_card'
);

update public.accounts
set name = case name
  when 'Cartao de Credito' then 'Cartão de Crédito'
  when 'Reserva Emergencia' then 'Reserva Emergência'
  else name
end,
updated_at = timezone('utc', now())
where name in ('Cartao de Credito', 'Reserva Emergencia');

update public.households
set name = 'Família'
where name = 'Familia';

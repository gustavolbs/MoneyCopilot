update public.categories
set
  name = 'Comer fora/Delivery',
  icon = 'utensils',
  color = '#F9735B',
  updated_at = timezone('utc', now()),
  deleted_at = null
where id = 'cat_expense_food';

update public.transactions
set
  category_id = 'cat_expense_food',
  updated_at = timezone('utc', now())
where category_id = 'cat_expense_restaurants';

update public.categorization_rules
set
  category_id = 'cat_expense_food',
  updated_at = timezone('utc', now())
where category_id = 'cat_expense_restaurants';

update public.recurrences
set
  category_id = 'cat_expense_food',
  updated_at = timezone('utc', now())
where category_id = 'cat_expense_restaurants';

update public.budgets food_budget
set
  amount = food_budget.amount + restaurant_budget.amount,
  deleted_at = null,
  updated_at = timezone('utc', now())
from public.budgets restaurant_budget
where restaurant_budget.category_id = 'cat_expense_restaurants'
  and restaurant_budget.deleted_at is null
  and food_budget.category_id = 'cat_expense_food'
  and food_budget.household_id = restaurant_budget.household_id
  and food_budget.month = restaurant_budget.month;

update public.budgets restaurant_budget
set
  deleted_at = timezone('utc', now()),
  updated_at = timezone('utc', now())
where restaurant_budget.category_id = 'cat_expense_restaurants'
  and restaurant_budget.deleted_at is null
  and exists (
    select 1
    from public.budgets food_budget
    where food_budget.category_id = 'cat_expense_food'
      and food_budget.household_id = restaurant_budget.household_id
      and food_budget.month = restaurant_budget.month
  );

update public.budgets
set
  category_id = 'cat_expense_food',
  updated_at = timezone('utc', now())
where category_id = 'cat_expense_restaurants'
  and deleted_at is null;

update public.categories
set
  deleted_at = timezone('utc', now()),
  updated_at = timezone('utc', now())
where id = 'cat_expense_restaurants';

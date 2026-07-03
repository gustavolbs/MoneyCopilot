import { describe, expect, it } from 'vitest';

import { defaultCategories } from '@/domain/categories';
import { parseTransactionInput } from '@/domain/parser';

const context = {
  categories: defaultCategories,
  rules: [],
  accounts: [
    {
      id: 'acc_checking',
      household_id: 'h1',
      name: 'Conta Corrente',
      type: 'checking' as const,
      initial_balance: 0,
      currency: 'BRL',
      credit_card_due_day: null,
      credit_card_best_purchase_day: null,
      created_at: '',
      updated_at: '',
      deleted_at: null,
    },
    {
      id: 'acc_house',
      household_id: 'h1',
      name: 'Cofrinho Casa',
      type: 'reserve' as const,
      initial_balance: 0,
      currency: 'BRL',
      credit_card_due_day: null,
      credit_card_best_purchase_day: null,
      created_at: '',
      updated_at: '',
      deleted_at: null,
    },
    {
      id: 'acc_picpay',
      household_id: 'h1',
      name: 'PicPay',
      type: 'checking' as const,
      initial_balance: 0,
      currency: 'BRL',
      credit_card_due_day: null,
      credit_card_best_purchase_day: null,
      created_at: '',
      updated_at: '',
      deleted_at: null,
    },
  ],
  today: new Date('2026-06-17T12:00:00.000Z'),
};

describe('parseTransactionInput', () => {
  it('parses Outback - 250 reais as eating out or delivery expense', () => {
    const [parsed] = parseTransactionInput('Outback - 250 reais', context);
    expect(parsed.amount).toBe(250);
    expect(parsed.type).toBe('expense');
    expect(parsed.category_id).toBe('cat_expense_food');
    expect(parsed.description).toBe('Outback');
  });

  it('parses Outback 250 as default expense', () => {
    const [parsed] = parseTransactionInput('Outback 250', context);
    expect(parsed.amount).toBe(250);
    expect(parsed.type).toBe('expense');
    expect(parsed.category_name).toBe('Comer fora/Delivery');
  });

  it('parses Salario +40.000 reais as income', () => {
    const [parsed] = parseTransactionInput('Salario +40.000 reais', context);
    expect(parsed.amount).toBe(40000);
    expect(parsed.type).toBe('income');
    expect(parsed.category_id).toBe('cat_income_salary');
    expect(parsed.category_name).toBe('Salário');
  });

  it('parses Internet - 160 reais', () => {
    const [parsed] = parseTransactionInput('Internet - 160 reais', context);
    expect(parsed.amount).toBe(160);
    expect(parsed.type).toBe('expense');
    expect(parsed.category_id).toBe('cat_expense_internet');
    expect(parsed.recurrence_hint).toBe('probable_monthly');
  });

  it('parses Aluguel- 2400 reais', () => {
    const [parsed] = parseTransactionInput('Aluguel- 2400 reais', context);
    expect(parsed.amount).toBe(2400);
    expect(parsed.type).toBe('expense');
    expect(parsed.category_id).toBe('cat_expense_housing');
  });

  it('parses Inquilina +580 reais', () => {
    const [parsed] = parseTransactionInput('Inquilina +580 reais', context);
    expect(parsed.amount).toBe(580);
    expect(parsed.type).toBe('income');
    expect(parsed.category_id).toBe('cat_income_rent');
  });

  it('parses Mercado 1.250,90', () => {
    const [parsed] = parseTransactionInput('Mercado 1.250,90', context);
    expect(parsed.amount).toBe(1250.9);
    expect(parsed.type).toBe('expense');
    expect(parsed.category_id).toBe('cat_expense_market');
  });

  it('categorizes veterinary expenses', () => {
    const [parsed] = parseTransactionInput('Consulta veterinaria 280', context);
    expect(parsed.type).toBe('expense');
    expect(parsed.category_id).toBe('cat_expense_veterinary');
    expect(parsed.category_name).toBe('Pets');
  });

  it('categorizes investment contributions', () => {
    const [parsed] = parseTransactionInput('Aporte investimento 1500', context);
    expect(parsed.type).toBe('expense');
    expect(parsed.category_id).toBe('cat_expense_investments');
  });

  it.each([
    ['Conta de gás 120', 'cat_expense_utilities', 'Energia/Água/Gás'],
    ['Diarista 250', 'cat_expense_home_services', 'Serviços e Manutenção Doméstica'],
    ['Manutenção da casa 400', 'cat_expense_home_services', 'Serviços e Manutenção Doméstica'],
    ['Cabelo e sobrancelha 180', 'cat_expense_personal_care', 'Cuidados Pessoais'],
    ['DAS do CNPJ 350', 'cat_expense_taxes', 'Impostos/PJ'],
    ['Fralda do dependente 90', 'cat_expense_family', 'Filhos/Dependentes'],
  ])('categorizes %s', (input, categoryId, categoryName) => {
    const [parsed] = parseTransactionInput(input, context);
    expect(parsed.category_id).toBe(categoryId);
    expect(parsed.category_name).toBe(categoryName);
  });

  it('does not classify gasoline as household gas', () => {
    const [parsed] = parseTransactionInput('Gasolina 200', context);
    expect(parsed.category_id).toBe('cat_expense_transport');
  });

  it('parses multiline blocks', () => {
    const parsed = parseTransactionInput('Outback 250\nSalario +40000\nInternet 160\nAluguel 2400', context);
    expect(parsed).toHaveLength(4);
    expect(parsed.map((item) => item.amount)).toEqual([250, 40000, 160, 2400]);
    expect(parsed[1].type).toBe('income');
  });

  it('parses reserve deposits as internal transfers', () => {
    const [parsed] = parseTransactionInput('Guardar 5000 no Cofrinho Casa', context);
    expect(parsed.amount).toBe(5000);
    expect(parsed.type).toBe('transfer');
    expect(parsed.transfer_account_id).toBe('acc_house');
    expect(parsed.movement_kind).toBe('transfer');
  });

  it('parses moving money to a new reserve by hint', () => {
    const [parsed] = parseTransactionInput('Mover 2000 para Reserva Emergência', context);
    expect(parsed.type).toBe('transfer');
    expect(parsed.transfer_account_name_hint).toBe('Reserva Emergência');
  });

  it('parses reserve withdrawals with reserve as source', () => {
    const [parsed] = parseTransactionInput('Resgatar 1000 do Cofrinho Viagem', context);
    expect(parsed.type).toBe('transfer');
    expect(parsed.account_name_hint).toBe('Cofrinho Viagem');
    expect(parsed.transfer_account_name_hint).toBeNull();
  });

  it('parses explicit origin and destination accounts', () => {
    const [parsed] = parseTransactionInput('Transferir 3000 do PicPay para Cofrinho Casa', context);
    expect(parsed.type).toBe('transfer');
    expect(parsed.account_id).toBe('acc_picpay');
    expect(parsed.transfer_account_id).toBe('acc_house');
  });
});

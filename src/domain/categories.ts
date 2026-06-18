import { Category } from './types';

const now = '2026-01-01T00:00:00.000Z';

export const defaultCategories: Category[] = [
  { id: 'cat_income_salary', household_id: null, name: 'Salario', type: 'income', icon: 'briefcase', color: '#2F80ED', is_default: true, created_at: now, updated_at: now, deleted_at: null },
  { id: 'cat_income_rent', household_id: null, name: 'Aluguel Recebido', type: 'income', icon: 'home', color: '#10B981', is_default: true, created_at: now, updated_at: now, deleted_at: null },
  { id: 'cat_income_refund', household_id: null, name: 'Reembolso', type: 'income', icon: 'refresh-cw', color: '#8B5CF6', is_default: true, created_at: now, updated_at: now, deleted_at: null },
  { id: 'cat_income_yield', household_id: null, name: 'Rendimentos', type: 'income', icon: 'trending-up', color: '#D9A441', is_default: true, created_at: now, updated_at: now, deleted_at: null },
  { id: 'cat_income_other', household_id: null, name: 'Outros Recebimentos', type: 'income', icon: 'wallet', color: '#6B7280', is_default: true, created_at: now, updated_at: now, deleted_at: null },
  { id: 'cat_expense_housing', household_id: null, name: 'Moradia', type: 'expense', icon: 'home', color: '#64748B', is_default: true, created_at: now, updated_at: now, deleted_at: null },
  { id: 'cat_expense_food', household_id: null, name: 'Alimentacao', type: 'expense', icon: 'utensils', color: '#F59E0B', is_default: true, created_at: now, updated_at: now, deleted_at: null },
  { id: 'cat_expense_restaurants', household_id: null, name: 'Restaurantes', type: 'expense', icon: 'chef-hat', color: '#F9735B', is_default: true, created_at: now, updated_at: now, deleted_at: null },
  { id: 'cat_expense_market', household_id: null, name: 'Mercado', type: 'expense', icon: 'shopping-cart', color: '#41B883', is_default: true, created_at: now, updated_at: now, deleted_at: null },
  { id: 'cat_expense_transport', household_id: null, name: 'Transporte', type: 'expense', icon: 'car', color: '#3B82F6', is_default: true, created_at: now, updated_at: now, deleted_at: null },
  { id: 'cat_expense_health', household_id: null, name: 'Saude', type: 'expense', icon: 'heart-pulse', color: '#EF4444', is_default: true, created_at: now, updated_at: now, deleted_at: null },
  { id: 'cat_expense_veterinary', household_id: null, name: 'Pets', type: 'expense', icon: 'paw-print', color: '#F97316', is_default: true, created_at: now, updated_at: now, deleted_at: null },
  { id: 'cat_expense_education', household_id: null, name: 'Educacao', type: 'expense', icon: 'graduation-cap', color: '#7C3AED', is_default: true, created_at: now, updated_at: now, deleted_at: null },
  { id: 'cat_expense_subscriptions', household_id: null, name: 'Assinaturas', type: 'expense', icon: 'repeat', color: '#06B6D4', is_default: true, created_at: now, updated_at: now, deleted_at: null },
  { id: 'cat_expense_internet', household_id: null, name: 'Internet/Telefone', type: 'expense', icon: 'wifi', color: '#0EA5E9', is_default: true, created_at: now, updated_at: now, deleted_at: null },
  { id: 'cat_expense_utilities', household_id: null, name: 'Energia/Agua', type: 'expense', icon: 'zap', color: '#EAB308', is_default: true, created_at: now, updated_at: now, deleted_at: null },
  { id: 'cat_expense_shopping', household_id: null, name: 'Compras', type: 'expense', icon: 'shopping-bag', color: '#EC4899', is_default: true, created_at: now, updated_at: now, deleted_at: null },
  { id: 'cat_expense_leisure', household_id: null, name: 'Lazer', type: 'expense', icon: 'sparkles', color: '#A855F7', is_default: true, created_at: now, updated_at: now, deleted_at: null },
  { id: 'cat_expense_travel', household_id: null, name: 'Viagens', type: 'expense', icon: 'plane', color: '#14B8A6', is_default: true, created_at: now, updated_at: now, deleted_at: null },
  { id: 'cat_expense_family', household_id: null, name: 'Familia', type: 'expense', icon: 'users', color: '#84CC16', is_default: true, created_at: now, updated_at: now, deleted_at: null },
  { id: 'cat_expense_taxes', household_id: null, name: 'Impostos', type: 'expense', icon: 'landmark', color: '#78716C', is_default: true, created_at: now, updated_at: now, deleted_at: null },
  { id: 'cat_expense_investments', household_id: null, name: 'Investimentos', type: 'expense', icon: 'chart-no-axes-combined', color: '#22C55E', is_default: true, created_at: now, updated_at: now, deleted_at: null },
  { id: 'cat_expense_credit_card', household_id: null, name: 'Cartao de Credito', type: 'expense', icon: 'credit-card', color: '#111827', is_default: true, created_at: now, updated_at: now, deleted_at: null },
  { id: 'cat_expense_other', household_id: null, name: 'Outros', type: 'expense', icon: 'circle', color: '#9CA3AF', is_default: true, created_at: now, updated_at: now, deleted_at: null },
];

export const keywordCategoryMap: Array<{ keywords: string[]; categoryId: string; type?: 'income' | 'expense' }> = [
  { keywords: ['salario', 'pro labore', 'holerite'], categoryId: 'cat_income_salary', type: 'income' },
  { keywords: ['inquilina', 'aluguel recebido', 'recebi aluguel'], categoryId: 'cat_income_rent', type: 'income' },
  { keywords: ['reembolso', 'estorno'], categoryId: 'cat_income_refund', type: 'income' },
  { keywords: ['rendimento', 'dividendo', 'juros'], categoryId: 'cat_income_yield', type: 'income' },
  { keywords: ['outback', 'restaurante', 'ifood', 'pizza', 'hamburguer', 'jantar', 'almoco'], categoryId: 'cat_expense_restaurants', type: 'expense' },
  { keywords: ['mercado', 'supermercado', 'carrefour', 'assai', 'pao de acucar', 'hortifruti'], categoryId: 'cat_expense_market', type: 'expense' },
  { keywords: ['uber', '99', 'taxi', 'combustivel', 'gasolina', 'estacionamento'], categoryId: 'cat_expense_transport', type: 'expense' },
  { keywords: ['veterinario', 'veterinaria', 'clinica veterinaria', 'pet shop', 'petshop', 'racao', 'banho e tosa'], categoryId: 'cat_expense_veterinary', type: 'expense' },
  { keywords: ['farmacia', 'drogaria', 'medico', 'consulta', 'exame'], categoryId: 'cat_expense_health', type: 'expense' },
  { keywords: ['investimento', 'investir', 'aporte', 'corretora', 'tesouro direto'], categoryId: 'cat_expense_investments', type: 'expense' },
  { keywords: ['internet', 'telefone', 'vivo', 'claro', 'tim', 'oi'], categoryId: 'cat_expense_internet', type: 'expense' },
  { keywords: ['energia', 'agua', 'luz', 'enel', 'sabesp'], categoryId: 'cat_expense_utilities', type: 'expense' },
  { keywords: ['nubank', 'cartao', 'fatura'], categoryId: 'cat_expense_credit_card', type: 'expense' },
  { keywords: ['aluguel', 'condominio', 'iptu'], categoryId: 'cat_expense_housing', type: 'expense' },
  { keywords: ['netflix', 'spotify', 'amazon prime', 'assinatura'], categoryId: 'cat_expense_subscriptions', type: 'expense' },
  { keywords: ['escola', 'faculdade', 'curso'], categoryId: 'cat_expense_education', type: 'expense' },
];

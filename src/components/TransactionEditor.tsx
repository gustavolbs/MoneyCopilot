'use client';

import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { CategoryBadge } from '@/components/CategoryBadge';
import { transactionMonth } from '@/domain/finance';
import { formatCurrency } from '@/domain/normalize';
import { Account, Category, PaymentMethod, Transaction, TransactionType } from '@/domain/types';
import { useTheme } from '@/lib/theme';

import { Button, Field } from './ui';

type Props = {
  transaction: Transaction | null;
  categories: Category[];
  accounts: Account[];
  onClose: () => void;
  onSave: (patch: Partial<Pick<Transaction, 'description' | 'amount' | 'type' | 'category_id' | 'account_id' | 'payment_method' | 'notes'>>) => Promise<void>;
  onDelete: () => Promise<void>;
};

const typeOptions: Array<{ label: string; value: TransactionType }> = [
  { label: 'Despesa', value: 'expense' },
  { label: 'Receita', value: 'income' },
  { label: 'Transferencia', value: 'transfer' },
];

export function TransactionEditor({ transaction, categories, accounts, onClose, onSave, onDelete }: Props) {
  const { colors } = useTheme();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cardAccountId, setCardAccountId] = useState<string | null>(null);

  useEffect(() => {
    if (!transaction) return;
    setDescription(transaction.description);
    setAmount(String(transaction.amount).replace('.', ','));
    setType(transaction.type);
    setCategoryId(transaction.category_id);
    setPaymentMethod(transaction.payment_method ?? 'cash');
    setCardAccountId(transaction.payment_method === 'credit_card' ? transaction.account_id : accounts.find((account) => account.type === 'credit_card')?.id ?? null);
  }, [accounts, transaction]);

  const availableCategories = useMemo(
    () => categories.filter((category) => type === 'transfer' || category.type === type || category.type === 'both'),
    [categories, type],
  );

  if (!transaction) return null;

  const parsedAmount = Number(amount.replace(/\./g, '').replace(',', '.'));
  const canSave =
    description.trim().length > 0 &&
    Number.isFinite(parsedAmount) &&
    parsedAmount >= 0 &&
    !(type === 'expense' && paymentMethod === 'credit_card' && !cardAccountId);
  const selectedCategory = categories.find((category) => category.id === categoryId);
  const creditCards = accounts.filter((account) => account.type === 'credit_card');
  const cashAccountId = accounts.find((account) => account.type === 'checking')?.id ?? accounts.find((account) => account.type === 'cash')?.id ?? transaction.account_id;
  const draftTransaction: Transaction = {
    ...transaction,
    type,
    payment_method: type === 'expense' ? paymentMethod : null,
    account_id: type === 'expense' && paymentMethod === 'credit_card' ? cardAccountId : cashAccountId,
  };
  const competenceMonth = transactionMonth(draftTransaction, accounts);
  const [competenceYear, competenceMonthNumber] = competenceMonth.split('-').map(Number);
  const competenceLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(competenceYear, competenceMonthNumber - 1, 1));

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="transaction-editor-title">
      <div className="modal-panel" style={{ backgroundColor: colors.bg }}>
        <header className="transaction-editor-header">
          <div className="transaction-editor-summary">
            <p style={{ color: colors.muted }}>Editar transacao</p>
            <h2 id="transaction-editor-title" style={{ color: colors.ink }}>{description || transaction.description}</h2>
            <strong style={{ color: transaction.type === 'income' ? colors.green : transaction.type === 'transfer' ? colors.blue : colors.red }}>
              {transaction.type === 'income' ? '+' : transaction.type === 'transfer' ? '' : '-'}{formatCurrency(parsedAmount || transaction.amount)}
            </strong>
            {type !== 'transfer' ? <CategoryBadge category={selectedCategory} label={selectedCategory?.name ?? 'Categoria'} /> : <CategoryBadge label="Transferencia" />}
          </div>
          <button type="button" onClick={onClose} className="icon-button" style={{ backgroundColor: colors.subtle }} aria-label="Fechar">
            <X size={20} color={colors.ink} />
          </button>
        </header>

        <div className="transaction-editor-content">
          <div className="editor-field-grid">
            <Field value={description} onChangeText={setDescription} placeholder="Nome da transacao" />
            <Field value={amount} onChangeText={setAmount} placeholder="0,00" keyboardType="numeric" />
          </div>

          <div className="editor-type-row">
            {typeOptions.map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => setType(option.value)}
                className="editor-type-button"
                style={{ backgroundColor: type === option.value ? colors.blue : colors.subtle, color: type === option.value ? '#00111F' : colors.ink }}
              >
                {option.label}
              </button>
            ))}
          </div>

          {type === 'expense' ? (
            <div className="editor-payment-block">
              <div className="editor-payment-row">
                <button
                  type="button"
                  className="editor-payment-button"
                  onClick={() => setPaymentMethod('cash')}
                  style={{ backgroundColor: paymentMethod === 'cash' ? colors.blue : colors.subtle, color: paymentMethod === 'cash' ? '#00111F' : colors.ink }}
                >
                  A vista
                </button>
                <button
                  type="button"
                  className="editor-payment-button"
                  onClick={() => setPaymentMethod('credit_card')}
                  disabled={!creditCards.length}
                  style={{ backgroundColor: paymentMethod === 'credit_card' ? colors.blue : colors.subtle, color: paymentMethod === 'credit_card' ? '#00111F' : colors.ink }}
                >
                  Cartao de credito
                </button>
              </div>
              {paymentMethod === 'credit_card' ? (
                <div className="editor-card-list">
                  {creditCards.map((card) => (
                    <button
                      type="button"
                      key={card.id}
                      className={`editor-card-option${cardAccountId === card.id ? ' selected' : ''}`}
                      onClick={() => setCardAccountId(card.id)}
                      style={{ borderColor: cardAccountId === card.id ? colors.blue : colors.line, backgroundColor: cardAccountId === card.id ? colors.subtle : colors.surface, color: colors.ink }}
                    >
                      <span>{card.name}</span>
                      <small style={{ color: colors.muted }}>Vence dia {card.credit_card_due_day ?? '-'} · melhor compra dia {card.credit_card_best_purchase_day ?? '-'}</small>
                    </button>
                  ))}
                </div>
              ) : null}
              <p className="editor-competence" style={{ color: colors.muted }}>Entra em {competenceLabel}</p>
            </div>
          ) : null}

          {type !== 'transfer' ? (
            <div className="editor-category-list" aria-label="Categorias">
                {availableCategories.map((category) => (
                  <CategoryBadge
                    key={category.id}
                    category={category}
                    selected={categoryId === category.id}
                    onClick={() => setCategoryId(category.id)}
                  />
                ))}
            </div>
          ) : null}
        </div>

        <footer className="modal-footer" style={{ borderColor: colors.line }}>
          <Button onPress={() => void onDelete()} variant="ghost">Excluir</Button>
          <Button
            onPress={() => {
              if (!canSave) return;
              void onSave({
                description: description.trim(),
                amount: parsedAmount,
                type,
                category_id: type === 'transfer' ? null : categoryId,
                payment_method: type === 'expense' ? paymentMethod : null,
                account_id: type === 'expense' ? (paymentMethod === 'credit_card' ? cardAccountId : cashAccountId) : transaction.account_id,
              });
            }}
          >
            Salvar
          </Button>
        </footer>
      </div>
    </div>
  );
}

'use client';

import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { CategoryBadge } from '@/components/CategoryBadge';
import { transactionMonth } from '@/domain/finance';
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
  const creditCards = accounts.filter((account) => account.type === 'credit_card');
  const selectedCard = creditCards.find((account) => account.id === cardAccountId);
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
          <div>
            <p style={{ color: colors.muted }}>Transacao</p>
            <h2 id="transaction-editor-title" style={{ color: colors.ink }}>Editar lancamento</h2>
          </div>
          <button type="button" onClick={onClose} className="icon-button" style={{ backgroundColor: colors.subtle }} aria-label="Fechar">
            <X size={20} color={colors.ink} />
          </button>
        </header>

        <div className="transaction-editor-content">
          <div className="editor-field-grid">
            <label className="editor-field-label">
              <span style={{ color: colors.muted }}>Descricao</span>
              <Field value={description} onChangeText={setDescription} placeholder="Nome da transacao" />
            </label>
            <label className="editor-field-label">
              <span style={{ color: colors.muted }}>Valor</span>
              <Field value={amount} onChangeText={setAmount} placeholder="0,00" keyboardType="numeric" />
            </label>
          </div>

          <div className="editor-section">
            <span className="editor-section-label" style={{ color: colors.muted }}>Tipo</span>
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
          </div>

          {type === 'expense' ? (
            <div className="editor-section">
              <span className="editor-section-label" style={{ color: colors.muted }}>Pagamento</span>
              <div className="editor-payment-row">
                <button
                  type="button"
                  className="editor-payment-button"
                  onClick={() => setPaymentMethod('cash')}
                  style={{ backgroundColor: paymentMethod === 'cash' ? colors.blue : colors.subtle, color: paymentMethod === 'cash' ? '#00111F' : colors.ink }}
                >
                  À vista
                </button>
                <button
                  type="button"
                  className="editor-payment-button"
                  onClick={() => setPaymentMethod('credit_card')}
                  disabled={!creditCards.length}
                  style={{ backgroundColor: paymentMethod === 'credit_card' ? colors.blue : colors.subtle, color: paymentMethod === 'credit_card' ? '#00111F' : colors.ink }}
                >
                  Cartao
                </button>
              </div>
              {paymentMethod === 'credit_card' ? (
                <label className="editor-field-label">
                  <span style={{ color: colors.muted }}>Cartao utilizado</span>
                  <select
                    className="editor-select"
                    value={cardAccountId ?? ''}
                    onChange={(event) => setCardAccountId(event.currentTarget.value || null)}
                    style={{ borderColor: colors.line, backgroundColor: colors.elevated, color: colors.ink }}
                  >
                    <option value="">Selecione um cartao</option>
                    {creditCards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
                  </select>
                  {selectedCard ? <small style={{ color: colors.muted }}>Vence dia {selectedCard.credit_card_due_day ?? '-'} · melhor compra dia {selectedCard.credit_card_best_purchase_day ?? '-'}</small> : null}
                </label>
              ) : null}
              <p className="editor-competence" style={{ color: colors.muted }}>Competencia: <strong style={{ color: colors.ink }}>{competenceLabel}</strong></p>
            </div>
          ) : null}

          {type !== 'transfer' ? (
            <div className="editor-section">
              <span className="editor-section-label" style={{ color: colors.muted }}>Categoria</span>
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
            </div>
          ) : null}
        </div>

        <footer className="modal-footer" style={{ borderColor: colors.line }}>
          <Button onPress={() => void onDelete()} variant="danger">Excluir</Button>
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

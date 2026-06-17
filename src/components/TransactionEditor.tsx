'use client';

import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { CategoryBadge } from '@/components/CategoryBadge';
import { formatCurrency } from '@/domain/normalize';
import { Category, Transaction, TransactionType } from '@/domain/types';
import { useTheme } from '@/lib/theme';

import { Button, Field } from './ui';

type Props = {
  transaction: Transaction | null;
  categories: Category[];
  onClose: () => void;
  onSave: (patch: Partial<Pick<Transaction, 'description' | 'amount' | 'type' | 'category_id' | 'notes'>>) => Promise<void>;
  onDelete: () => Promise<void>;
};

const typeOptions: Array<{ label: string; value: TransactionType }> = [
  { label: 'Despesa', value: 'expense' },
  { label: 'Receita', value: 'income' },
  { label: 'Transferencia', value: 'transfer' },
];

export function TransactionEditor({ transaction, categories, onClose, onSave, onDelete }: Props) {
  const { colors } = useTheme();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [categoryId, setCategoryId] = useState<string | null>(null);

  useEffect(() => {
    if (!transaction) return;
    setDescription(transaction.description);
    setAmount(String(transaction.amount).replace('.', ','));
    setType(transaction.type);
    setCategoryId(transaction.category_id);
  }, [transaction]);

  const availableCategories = useMemo(
    () => categories.filter((category) => type === 'transfer' || category.type === type || category.type === 'both'),
    [categories, type],
  );

  if (!transaction) return null;

  const parsedAmount = Number(amount.replace(/\./g, '').replace(',', '.'));
  const canSave = description.trim().length > 0 && Number.isFinite(parsedAmount) && parsedAmount >= 0;
  const selectedCategory = categories.find((category) => category.id === categoryId);

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

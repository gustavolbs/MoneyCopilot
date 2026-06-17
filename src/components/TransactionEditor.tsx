'use client';

import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { formatCurrency } from '@/domain/normalize';
import { Category, Transaction, TransactionType } from '@/domain/types';
import { useTheme } from '@/lib/theme';

import { Button, Field, Label } from './ui';

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
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!transaction) return;
    setDescription(transaction.description);
    setAmount(String(transaction.amount).replace('.', ','));
    setType(transaction.type);
    setCategoryId(transaction.category_id);
    setNotes(transaction.notes ?? '');
  }, [transaction]);

  const availableCategories = useMemo(
    () => categories.filter((category) => type === 'transfer' || category.type === type || category.type === 'both'),
    [categories, type],
  );

  if (!transaction) return null;

  const parsedAmount = Number(amount.replace(/\./g, '').replace(',', '.'));
  const canSave = description.trim().length > 0 && Number.isFinite(parsedAmount) && parsedAmount >= 0;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="transaction-editor-title">
      <div className="modal-panel" style={{ backgroundColor: colors.bg }}>
        <header className="modal-header">
          <div>
            <h2 id="transaction-editor-title" style={{ color: colors.ink }}>Editar transacao</h2>
            <p style={{ color: colors.muted }}>{formatCurrency(transaction.amount)}</p>
          </div>
          <button type="button" onClick={onClose} className="icon-button" style={{ backgroundColor: colors.subtle }} aria-label="Fechar">
            <X size={20} color={colors.ink} />
          </button>
        </header>

        <div className="modal-content">
          <div className="form-group">
            <Label>Descricao</Label>
            <Field value={description} onChangeText={setDescription} placeholder="Nome da transacao" />
          </div>

          <div className="form-group">
            <Label>Valor</Label>
            <Field value={amount} onChangeText={setAmount} placeholder="0,00" keyboardType="numeric" />
          </div>

          <div className="form-group">
            <Label>Tipo</Label>
            <div className="segment-row">
              {typeOptions.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => setType(option.value)}
                  className="segment"
                  style={{ backgroundColor: type === option.value ? colors.ink : colors.subtle, color: type === option.value ? colors.bg : colors.ink }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {type !== 'transfer' ? (
            <div className="form-group">
              <Label>Categoria</Label>
              <div className="chip-grid">
                {availableCategories.map((category) => (
                  <button
                    type="button"
                    key={category.id}
                    onClick={() => setCategoryId(category.id)}
                    className="chip"
                    style={{
                      backgroundColor: categoryId === category.id ? category.color : colors.subtle,
                      borderColor: categoryId === category.id ? category.color : colors.line,
                      color: categoryId === category.id ? '#fff' : colors.ink,
                    }}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="form-group">
            <Label>Observacao</Label>
            <Field value={notes} onChangeText={setNotes} placeholder="Opcional" multiline />
          </div>
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
                notes: notes.trim() || null,
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

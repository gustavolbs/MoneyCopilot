'use client';

import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { CategoryBadge } from '@/components/CategoryBadge';
import { Button as ShadcnButton } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { transactionMonth } from '@/domain/finance';
import { formatMonthYear } from '@/domain/normalize';
import { Account, Category, PaymentMethod, Transaction, TransactionType } from '@/domain/types';
import { useTheme } from '@/lib/theme';

import { Button, ComboboxField, Field } from './ui';

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
  { label: 'Transferência', value: 'transfer' },
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
  const competenceLabel = formatMonthYear(competenceMonth);

  return (
    <Dialog open={Boolean(transaction)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="modal-panel" style={{ backgroundColor: colors.bg }} showCloseButton={false}>
        <header className="transaction-editor-header">
          <div>
            <p style={{ color: colors.muted }}>Transação</p>
            <h2 id="transaction-editor-title" style={{ color: colors.ink }}>Editar lançamento</h2>
          </div>
          <DialogClose render={<ShadcnButton type="button" variant="ghost" size="icon" className="icon-button" style={{ backgroundColor: colors.subtle }} aria-label="Fechar" />}>
            <X size={20} color={colors.ink} />
          </DialogClose>
        </header>

        <div className="transaction-editor-content">
          <div className="editor-field-grid">
            <div className="editor-field-label">
              <Label style={{ color: colors.muted }}>Descrição</Label>
              <Field value={description} onChangeText={setDescription} placeholder="Nome da transação" />
            </div>
            <div className="editor-field-label">
              <Label style={{ color: colors.muted }}>Valor</Label>
              <Field value={amount} onChangeText={setAmount} placeholder="0,00" keyboardType="numeric" />
            </div>
          </div>

          <div className="editor-section">
            <span className="editor-section-label" style={{ color: colors.muted }}>Tipo</span>
            <ToggleGroup value={[type]} onValueChange={(values) => setType((values[0] ?? type) as TransactionType)} className="editor-type-row" aria-label="Tipo de transação">
              {typeOptions.map((option) => (
                <ToggleGroupItem
                  key={option.value}
                  value={option.value}
                  className="editor-type-button"
                  style={{ backgroundColor: type === option.value ? colors.blue : colors.subtle, color: type === option.value ? '#00111F' : colors.ink }}
                >
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {type === 'expense' ? (
            <div className="editor-section">
              <span className="editor-section-label" style={{ color: colors.muted }}>Pagamento</span>
              <ToggleGroup value={[paymentMethod]} onValueChange={(values) => setPaymentMethod((values[0] ?? paymentMethod) as PaymentMethod)} className="editor-payment-row" aria-label="Forma de pagamento">
                <ToggleGroupItem
                  value="cash"
                  className="editor-payment-button"
                  style={{ backgroundColor: paymentMethod === 'cash' ? colors.blue : colors.subtle, color: paymentMethod === 'cash' ? '#00111F' : colors.ink }}
                >
                  À vista
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="credit_card"
                  className="editor-payment-button"
                  disabled={!creditCards.length}
                  style={{ backgroundColor: paymentMethod === 'credit_card' ? colors.blue : colors.subtle, color: paymentMethod === 'credit_card' ? '#00111F' : colors.ink }}
                >
                  Cartão
                </ToggleGroupItem>
              </ToggleGroup>
              {paymentMethod === 'credit_card' ? (
                <div className="editor-field-label">
                  <Label style={{ color: colors.muted }}>Cartão utilizado</Label>
                  <ComboboxField
                    className="editor-select"
                    value={cardAccountId ?? ''}
                    onValueChange={(value) => setCardAccountId(value || null)}
                    placeholder="Selecione um cartão"
                    options={creditCards.map((card) => ({ value: card.id, label: card.name }))}
                  />
                  {selectedCard ? <small style={{ color: colors.muted }}>Vence dia {selectedCard.credit_card_due_day ?? '-'} · melhor compra dia {selectedCard.credit_card_best_purchase_day ?? '-'}</small> : null}
                </div>
              ) : null}
              <p className="editor-competence" style={{ color: colors.muted }}>Competência: <strong style={{ color: colors.ink }}>{competenceLabel}</strong></p>
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
      </DialogContent>
    </Dialog>
  );
}

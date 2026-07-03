'use client';

import { CalendarDays, CreditCard, Layers3, ReceiptText, Repeat, Tag, Trash2, Wallet, X } from 'lucide-react';
import { ReactNode, useEffect, useMemo, useState } from 'react';

import { CategoryBadge } from '@/components/CategoryBadge';
import { Button as ShadcnButton } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { transactionMonth } from '@/domain/finance';
import { formatCurrency, formatDate, formatMonthYear } from '@/domain/normalize';
import { Account, Category, PaymentMethod, Recurrence, Transaction, TransactionType } from '@/domain/types';

import { Button, ComboboxField, Field } from './ui';

type Props = {
  transaction: Transaction | null;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  onClose: () => void;
  onSave: (patch: Partial<Pick<Transaction, 'description' | 'amount' | 'type' | 'category_id' | 'account_id' | 'payment_method' | 'notes'>>) => Promise<void>;
  onDelete: () => Promise<void>;
  onCompleteInstallments: (currentIndex: number, total: number) => Promise<void>;
  onAddRecurrence: (frequency: Recurrence['frequency']) => Promise<void>;
};

const typeOptions: Array<{ label: string; value: TransactionType }> = [
  { label: 'Despesa', value: 'expense' },
  { label: 'Receita', value: 'income' },
  { label: 'Transferência', value: 'transfer' },
];

const typeTone: Record<TransactionType, string> = {
  expense: 'danger',
  income: 'success',
  transfer: 'info',
};

const paymentOptions: Array<{ label: string; value: PaymentMethod; icon: typeof Wallet }> = [
  { label: 'À vista', value: 'cash', icon: Wallet },
  { label: 'Cartão', value: 'credit_card', icon: CreditCard },
];

const recurrenceOptions: Array<{ label: string; value: Recurrence['frequency'] }> = [
  { label: 'Semanal', value: 'weekly' },
  { label: 'Mensal', value: 'monthly' },
  { label: 'Anual', value: 'yearly' },
];

const installmentPattern = /\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*$/;

function inferInstallment(description: string) {
  const match = description.match(installmentPattern);
  if (!match) return { index: '', total: '' };
  return { index: match[1], total: match[2] };
}

function installmentBase(description: string) {
  return description.replace(installmentPattern, '').trim();
}

export function TransactionEditor({ transaction, transactions, categories, accounts, onClose, onSave, onDelete, onCompleteInstallments, onAddRecurrence }: Props) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cardAccountId, setCardAccountId] = useState<string | null>(null);
  const [installmentIndex, setInstallmentIndex] = useState('');
  const [installmentTotal, setInstallmentTotal] = useState('');
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<Recurrence['frequency']>('monthly');

  useEffect(() => {
    if (!transaction) return;
    const inferred = inferInstallment(transaction.description);
    setDescription(transaction.description);
    setAmount(String(transaction.amount).replace('.', ','));
    setType(transaction.type);
    setCategoryId(transaction.category_id);
    setPaymentMethod(transaction.payment_method ?? 'cash');
    setCardAccountId(transaction.payment_method === 'credit_card' ? transaction.account_id : accounts.find((account) => account.type === 'credit_card')?.id ?? null);
    setInstallmentIndex(String(transaction.installment_index ?? inferred.index));
    setInstallmentTotal(String(transaction.installment_total ?? inferred.total));
    setRecurrenceFrequency('monthly');
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
  const currentInstallmentIndex = Number(installmentIndex);
  const currentInstallmentTotal = Number(installmentTotal);
  const canCompleteInstallments =
    type === 'expense' &&
    Number.isInteger(currentInstallmentIndex) &&
    Number.isInteger(currentInstallmentTotal) &&
    currentInstallmentTotal >= 2 &&
    currentInstallmentIndex >= 1 &&
    currentInstallmentIndex < currentInstallmentTotal;
  const installmentGroup = (
    transaction.installment_group_id
      ? transactions.filter((item) => item.installment_group_id === transaction.installment_group_id && !item.deleted_at)
      : currentInstallmentTotal
        ? transactions.filter((item) => {
            const inferred = inferInstallment(item.description);
            return (
              inferred.total === String(currentInstallmentTotal) &&
              item.type === transaction.type &&
              item.amount === transaction.amount &&
              installmentBase(item.description).toLowerCase() === installmentBase(transaction.description).toLowerCase() &&
              !item.deleted_at
            );
          })
        : []
  ).sort((a, b) => {
    const left = a.installment_index ?? Number(inferInstallment(a.description).index || 0);
    const right = b.installment_index ?? Number(inferInstallment(b.description).index || 0);
    return left - right || a.transaction_date.localeCompare(b.transaction_date);
  });
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
      <DialogContent className="modal-panel transaction-editor-modal" showCloseButton={false}>
        <header className="transaction-editor-header">
          <div className="transaction-editor-title-group">
            <span className="transaction-editor-kicker">Transação</span>
            <DialogTitle id="transaction-editor-title">Editar lançamento</DialogTitle>
            <p>Ajuste os dados do lançamento sem sair da tela de transações.</p>
          </div>
          <DialogClose render={<ShadcnButton type="button" variant="ghost" size="icon" className="transaction-editor-close" aria-label="Fechar" />}>
            <X size={18} />
          </DialogClose>
        </header>

        <div className="transaction-editor-content">
          <section className="transaction-editor-section transaction-editor-main-section">
            <div className="editor-field-label">
              <Label>Descrição</Label>
              <Field value={description} onChangeText={setDescription} placeholder="Nome da transação" />
            </div>
            <div className="editor-field-label">
              <Label>Valor</Label>
              <Field value={amount} onChangeText={setAmount} placeholder="0,00" keyboardType="numeric" />
            </div>
          </section>

          <div className="transaction-editor-options-grid">
            <EditorSection icon={<ReceiptText size={16} />} title="Tipo">
              <ToggleGroup value={[type]} onValueChange={(values) => setType((values[0] ?? type) as TransactionType)} className="editor-type-row" aria-label="Tipo de transação">
                {typeOptions.map((option) => (
                  <ToggleGroupItem
                    key={option.value}
                    value={option.value}
                    className="editor-type-button"
                    data-selected={type === option.value}
                    data-tone={typeTone[option.value]}
                  >
                    {option.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </EditorSection>

            {type === 'expense' ? (
              <EditorSection icon={<CreditCard size={16} />} title="Pagamento">
                <ToggleGroup value={[paymentMethod]} onValueChange={(values) => setPaymentMethod((values[0] ?? paymentMethod) as PaymentMethod)} className="editor-payment-row" aria-label="Forma de pagamento">
                  {paymentOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <ToggleGroupItem
                        key={option.value}
                        value={option.value}
                        className="editor-payment-button"
                        data-selected={paymentMethod === option.value}
                        disabled={option.value === 'credit_card' && !creditCards.length}
                      >
                        <Icon size={15} />
                        {option.label}
                      </ToggleGroupItem>
                    );
                  })}
                </ToggleGroup>
                {paymentMethod === 'credit_card' ? (
                  <div className="editor-field-label">
                    <Label>Cartão utilizado</Label>
                    <ComboboxField
                      className="editor-select"
                      value={cardAccountId ?? ''}
                      onValueChange={(value) => setCardAccountId(value || null)}
                      placeholder="Selecione um cartão"
                      options={creditCards.map((card) => ({ value: card.id, label: card.name }))}
                    />
                    {selectedCard ? <small>Vence dia {selectedCard.credit_card_due_day ?? '-'} · melhor compra dia {selectedCard.credit_card_best_purchase_day ?? '-'}</small> : null}
                  </div>
                ) : null}
                <p className="editor-competence"><CalendarDays size={14} /> Competência: <strong>{competenceLabel}</strong></p>
              </EditorSection>
            ) : null}
          </div>

          {type !== 'transfer' ? (
            <EditorSection icon={<Tag size={16} />} title="Categoria">
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
            </EditorSection>
          ) : null}

          {type === 'expense' ? (
            <EditorSection icon={<Layers3 size={16} />} title="Parcelamento">
              <div className="editor-installment-grid">
                <div className="editor-field-label">
                  <Label>Parcela atual</Label>
                  <Field value={installmentIndex} onChangeText={setInstallmentIndex} placeholder="Ex: 5" keyboardType="numeric" />
                </div>
                <div className="editor-field-label">
                  <Label>Total</Label>
                  <Field value={installmentTotal} onChangeText={setInstallmentTotal} placeholder="Ex: 12" keyboardType="numeric" />
                </div>
              </div>
              <p className="editor-installment-hint">
                Para uma compra já cadastrada como “5/12”, informe 5 e 12 para criar as parcelas 6/12 em diante.
              </p>
              <ShadcnButton
                type="button"
                variant="outline"
                className="editor-installment-action"
                disabled={!canCompleteInstallments}
                onClick={() => {
                  if (!canCompleteInstallments) return;
                  void onCompleteInstallments(currentInstallmentIndex, currentInstallmentTotal);
                }}
              >
                Cadastrar parcelas restantes
              </ShadcnButton>

              {installmentGroup.length ? (
                <div className="editor-installment-list" aria-label="Parcelas associadas">
                  {installmentGroup.map((item) => {
                    const inferred = inferInstallment(item.description);
                    return (
                      <div key={item.id} className="editor-installment-item">
                        <span>{item.installment_index ?? inferred.index ?? '-'} / {item.installment_total ?? inferred.total ?? '-'}</span>
                        <strong>{formatCurrency(item.amount)}</strong>
                        <small>{formatDate(item.transaction_date)}</small>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </EditorSection>
          ) : null}

          {type === 'expense' ? (
            <EditorSection icon={<Repeat size={16} />} title="Recorrência">
              <ToggleGroup value={[recurrenceFrequency]} onValueChange={(values) => setRecurrenceFrequency((values[0] ?? recurrenceFrequency) as Recurrence['frequency'])} className="editor-recurrence-row" aria-label="Frequência da recorrência">
                {recurrenceOptions.map((option) => (
                  <ToggleGroupItem
                    key={option.value}
                    value={option.value}
                    className="editor-recurrence-button"
                    data-selected={recurrenceFrequency === option.value}
                  >
                    {option.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <p className="editor-installment-hint">
                Mantém este lançamento como primeira ocorrência e cria os próximos automaticamente quando vencerem.
              </p>
              <ShadcnButton
                type="button"
                variant="outline"
                className="editor-installment-action"
                onClick={() => void onAddRecurrence(recurrenceFrequency)}
              >
                Cadastrar recorrência
              </ShadcnButton>
            </EditorSection>
          ) : null}
        </div>

        <footer className="modal-footer transaction-editor-footer">
          <Button onPress={() => void onDelete()} variant="danger">
            <span className="transaction-editor-delete-label"><Trash2 size={15} /> Excluir</span>
          </Button>
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

function EditorSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="transaction-editor-section">
      <div className="editor-section-heading">
        <span className="editor-section-icon">{icon}</span>
        <span className="editor-section-label">{title}</span>
      </div>
      {children}
    </section>
  );
}

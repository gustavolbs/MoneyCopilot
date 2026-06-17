'use client';

import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { TransactionEditor } from '@/components/TransactionEditor';
import { TransactionRow } from '@/components/TransactionRow';
import { Card, Field, Label, Screen, Title } from '@/components/ui';
import { normalizeText } from '@/domain/normalize';
import { Transaction } from '@/domain/types';
import { useTheme } from '@/lib/theme';
import { useAppStore } from '@/store/appStore';

export function TransactionsScreen() {
  const { transactions, categories, editTransaction, deleteTransaction } = useAppStore();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Transaction | null>(null);
  const filtered = useMemo(() => {
    const normalized = normalizeText(query);
    return transactions.filter((item) => !normalized || item.normalized_description.includes(normalized));
  }, [query, transactions]);

  return (
    <Screen>
      <div className="stack small">
        <Label>Busca, filtros e edicao</Label>
        <Title>Transacoes</Title>
      </div>
      <Card style={{ gap: 10 }}>
        <div className="search-row">
          <Search color={colors.muted} size={18} />
          <Field value={query} onChangeText={setQuery} placeholder="Buscar por texto, categoria ou merchant" />
        </div>
      </Card>
      <Card>
        {filtered.map((transaction) => (
          <TransactionRow
            key={transaction.id}
            transaction={transaction}
            category={categories.find((item) => item.id === transaction.category_id)}
            onPress={() => setEditing(transaction)}
          />
        ))}
        {!filtered.length ? <p className="muted" style={{ color: colors.muted }}>Nenhuma transacao encontrada.</p> : null}
      </Card>
      <TransactionEditor
        transaction={editing}
        categories={categories}
        onClose={() => setEditing(null)}
        onSave={async (patch) => {
          if (!editing) return;
          await editTransaction(editing, patch);
          setEditing(null);
        }}
        onDelete={async () => {
          if (!editing) return;
          await deleteTransaction(editing);
          setEditing(null);
        }}
      />
    </Screen>
  );
}

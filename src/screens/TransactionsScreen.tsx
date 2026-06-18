"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { TransactionEditor } from "@/components/TransactionEditor";
import { PeriodNotice } from "@/components/PeriodNotice";
import { TransactionRow } from "@/components/TransactionRow";
import { Card, Field, Label, Screen, Title } from "@/components/ui";
import { normalizeText } from "@/domain/normalize";
import { Transaction } from "@/domain/types";
import { useTheme } from "@/lib/theme";
import { useAppStore } from "@/store/appStore";

export function TransactionsScreen() {
  const {
    transactions,
    categories,
    accounts,
    editTransaction,
    deleteTransaction,
  } = useAppStore();
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const filtered = useMemo(() => {
    const normalized = normalizeText(query);
    return transactions.filter(
      (item) => !normalized || item.normalized_description.includes(normalized),
    );
  }, [query, transactions]);

  return (
    <Screen>
      <div className="stack small">
        <Label>Busca, filtros e edição</Label>
        <Title>Transações</Title>
      </div>
      <PeriodNotice
        label="Período observado: todo o histórico"
        detail="A data da compra aparece na primeira coluna; compras no cartão mostram também o vencimento da fatura."
      />
      <Card style={{ gap: 10 }}>
        <div className="search-row">
          <Search color={colors.muted} size={18} />
          <Field
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por texto, categoria ou merchant"
          />
        </div>
      </Card>
      <Card>
        {filtered.length ? (
          <div className="transaction-table-wrap">
            <table className="transaction-table">
              <thead>
                <tr>
                  <th>Nome e data</th>
                  <th>Categoria</th>
                  <th>Pagamento</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    category={categories.find(
                      (item) => item.id === transaction.category_id,
                    )}
                    accounts={accounts}
                    onPress={() => setEditing(transaction)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {!filtered.length ? (
          <p className="muted" style={{ color: colors.muted }}>
            Nenhuma transação encontrada.
          </p>
        ) : null}
      </Card>
      <TransactionEditor
        transaction={editing}
        categories={categories}
        accounts={accounts}
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

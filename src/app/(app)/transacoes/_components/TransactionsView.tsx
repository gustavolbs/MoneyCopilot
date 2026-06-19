"use client";

import { addMonths } from "date-fns";
import { ArrowDownRight, ArrowUpRight, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import { PeriodNotice } from "@/components/PeriodNotice";
import { TransactionEditor } from "@/components/TransactionEditor";
import { TransactionRow } from "@/components/TransactionRow";
import { Card, Label, Screen, SelectField, Title } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { isReserveMovement, transactionBelongsToMonth } from "@/domain/finance";
import { formatCurrency, formatMonthYear, monthKey, normalizeText } from "@/domain/normalize";
import { Transaction, TransactionType } from "@/domain/types";
import { useTheme } from "@/lib/theme";
import { useAppStore } from "@/store/appStore";

type PeriodFilter = "previous" | "current" | "next" | "all";
type TypeFilter = "all" | TransactionType;
type PaymentFilter = "all" | "cash" | "credit_card";

export function TransactionsView() {
  const { transactions, categories, accounts, editTransaction, deleteTransaction } = useAppStore();
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [period, setPeriod] = useState<PeriodFilter>("current");
  const [type, setType] = useState<TypeFilter>("all");
  const [categoryId, setCategoryId] = useState("all");
  const [payment, setPayment] = useState<PaymentFilter>("all");
  const now = new Date();
  const periodOptions: Array<{ id: PeriodFilter; label: string; month: string | null; detail: string }> = [
    { id: "previous", label: "Mês anterior", month: monthKey(addMonths(now, -1)), detail: formatMonthYear(addMonths(now, -1)) },
    { id: "current", label: "Este mês", month: monthKey(now), detail: formatMonthYear(now) },
    { id: "next", label: "Próximo mês", month: monthKey(addMonths(now, 1)), detail: formatMonthYear(addMonths(now, 1)) },
    { id: "all", label: "Histórico", month: null, detail: "Todos" },
  ];
  const selectedPeriod = periodOptions.find((option) => option.id === period)!;

  const periodCounts = useMemo(() => new Map(periodOptions.map((option) => [
    option.id,
    transactions.filter((transaction) => !transaction.deleted_at && !isReserveMovement(transaction, accounts) && (!option.month || transactionBelongsToMonth(transaction, option.month, accounts))).length,
  ])), [accounts, periodOptions, transactions]);

  const filtered = useMemo(() => {
    const normalized = normalizeText(query);
    return transactions
      .filter((transaction) => !transaction.deleted_at)
      .filter((transaction) => !isReserveMovement(transaction, accounts))
      .filter((transaction) => !selectedPeriod.month || transactionBelongsToMonth(transaction, selectedPeriod.month, accounts))
      .filter((transaction) => type === "all" || transaction.type === type)
      .filter((transaction) => categoryId === "all" || transaction.category_id === categoryId)
      .filter((transaction) => payment === "all" || (transaction.type === "expense" && transaction.payment_method === payment))
      .filter((transaction) => !normalized || transaction.normalized_description.includes(normalized))
      .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
  }, [accounts, categoryId, payment, query, selectedPeriod.month, transactions, type]);

  const summary = useMemo(() => ({
    income: filtered.filter((transaction) => transaction.type === "income").reduce((sum, transaction) => sum + transaction.amount, 0),
    expense: filtered.filter((transaction) => transaction.type === "expense").reduce((sum, transaction) => sum + transaction.amount, 0),
  }), [filtered]);
  const filteredCategories = type === "transfer" ? [] : categories.filter((category) => type === "all" || category.type === type || category.type === "both");
  const hasActiveFilters = Boolean(query.trim()) || type !== "all" || categoryId !== "all" || payment !== "all";

  const selectType = (nextType: TypeFilter) => {
    setType(nextType);
    setCategoryId("all");
    if (nextType !== "expense" && nextType !== "all") setPayment("all");
  };

  return (
    <Screen>
      <div className="stack small">
        <Label>Consulta por competência</Label>
        <Title>Transações</Title>
      </div>

      <ToggleGroup value={[period]} onValueChange={(values) => setPeriod((values[0] ?? period) as PeriodFilter)} className="transaction-period-grid" aria-label="Período">
        {periodOptions.map((option) => (
          <ToggleGroupItem
            variant="outline"
            key={option.id}
            value={option.id}
            className={`transaction-period-card${period === option.id ? " active" : ""}`}
            style={{ borderColor: period === option.id ? colors.blue : colors.line, backgroundColor: period === option.id ? `${colors.blue}16` : colors.surface, color: colors.ink }}
          >
            <span>{option.label}</span>
            <strong>{option.detail}</strong>
            <small style={{ color: colors.muted }}>{periodCounts.get(option.id) ?? 0} transações</small>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <PeriodNotice
        label={selectedPeriod.month ? `Competência: ${selectedPeriod.detail}` : "Período: todo o histórico"}
        detail="Compras no cartão aparecem no mês de vencimento da fatura; demais lançamentos seguem a data da transação."
      />

      <Card style={{ gap: 12 }}>
        <div className="transaction-filter-title">
          <SlidersHorizontal size={16} color={colors.blue} /><strong>Filtros</strong>
          <span style={{ color: colors.muted }}>{filtered.length} resultado(s)</span>
          {hasActiveFilters ? <Button type="button" variant="ghost" onClick={() => { setQuery(""); setType("all"); setCategoryId("all"); setPayment("all"); }} style={{ color: colors.blue, backgroundColor: colors.subtle }}>Limpar</Button> : null}
        </div>
        <InputGroup className="search-row transaction-search" style={{ backgroundColor: colors.elevated, borderColor: colors.line }}>
          <InputGroupAddon><Search color={colors.muted} size={18} /></InputGroupAddon>
          <InputGroupInput value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Buscar por descrição" />
        </InputGroup>
        <ToggleGroup value={[type]} onValueChange={(values) => selectType((values[0] ?? "all") as TypeFilter)} className="transaction-type-filter" aria-label="Tipo de transação">
          {([
            ["all", "Todos"],
            ["income", "Entradas"],
            ["expense", "Saídas"],
            ["transfer", "Transferências"],
          ] as Array<[TypeFilter, string]>).map(([value, label]) => (
            <ToggleGroupItem key={value} value={value} className={type === value ? "active" : ""} style={{ backgroundColor: type === value ? colors.ink : colors.subtle, color: type === value ? colors.bg : colors.ink }}>{label}</ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="transaction-select-filters">
          <label><span style={{ color: colors.muted }}>Categoria</span><SelectField value={categoryId} disabled={type === "transfer"} onValueChange={setCategoryId} options={[{ value: "all", label: type === "transfer" ? "Não se aplica" : "Todas as categorias" }, ...filteredCategories.map((category) => ({ value: category.id, label: category.name }))]} /></label>
          <label><span style={{ color: colors.muted }}>Pagamento</span><SelectField value={payment} disabled={type === "income" || type === "transfer"} onValueChange={(value) => setPayment(value as PaymentFilter)} options={[{ value: "all", label: type === "income" || type === "transfer" ? "Não se aplica" : "Todos" }, { value: "cash", label: "À vista" }, { value: "credit_card", label: "Cartão de crédito" }]} /></label>
        </div>
      </Card>

      <div className="transaction-summary-grid">
        <div style={{ backgroundColor: `${colors.green}12`, borderColor: `${colors.green}40` }}><span style={{ color: colors.green }}><ArrowUpRight size={16} /> Entradas</span><strong>{formatCurrency(summary.income)}</strong></div>
        <div style={{ backgroundColor: `${colors.red}12`, borderColor: `${colors.red}40` }}><span style={{ color: colors.red }}><ArrowDownRight size={16} /> Saídas</span><strong>{formatCurrency(summary.expense)}</strong></div>
        <div style={{ backgroundColor: colors.surface, borderColor: colors.line }}><span style={{ color: colors.muted }}>Saldo filtrado</span><strong style={{ color: summary.income - summary.expense >= 0 ? colors.green : colors.red }}>{formatCurrency(summary.income - summary.expense)}</strong></div>
      </div>

      <Card>
        {filtered.length ? (
          <div className="transaction-table-wrap">
            <Table className="transaction-table">
              <TableHeader><TableRow><TableHead>Nome e data</TableHead><TableHead>Categoria</TableHead><TableHead>Pagamento</TableHead><TableHead>Valor</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map((transaction) => (
                  <TransactionRow key={transaction.id} transaction={transaction} category={categories.find((category) => category.id === transaction.category_id)} accounts={accounts} onPress={() => setEditing(transaction)} />
                ))}
              </TableBody>
            </Table>
          </div>
        ) : <p className="muted transaction-empty" style={{ color: colors.muted }}>Nenhuma transação encontrada com estes filtros.</p>}
      </Card>

      <TransactionEditor
        transaction={editing}
        categories={categories}
        accounts={accounts}
        onClose={() => setEditing(null)}
        onSave={async (patch) => { if (!editing) return; await editTransaction(editing, patch); setEditing(null); }}
        onDelete={async () => { if (!editing) return; await deleteTransaction(editing); setEditing(null); }}
      />
    </Screen>
  );
}

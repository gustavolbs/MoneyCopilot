"use client";

import { AlertTriangle, CheckCircle2, Pencil, Target, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { CategoryBadge, categoryEmoji } from "@/components/CategoryBadge";
import { PeriodNotice } from "@/components/PeriodNotice";
import { Button, Card, Field, Label, Screen, Title } from "@/components/ui";
import { budgetProgress, transactionBelongsToMonth } from "@/domain/finance";
import { formatCurrency, formatDate, formatMonthYear, monthKey } from "@/domain/normalize";
import { useTheme } from "@/lib/theme";
import { useAppStore } from "@/store/appStore";

export function BudgetsScreen() {
  const { colors } = useTheme();
  const { categories, budgets, transactions, accounts, saveBudget } = useAppStore();
  const expenseCategories = categories.filter((category) => category.type === "expense");
  const currentMonth = monthKey();
  const currentMonthLabel = formatMonthYear(currentMonth);
  const monthBudgets = budgets.filter((budget) => budget.month === currentMonth && !budget.deleted_at);
  const budgetItems = useMemo(() => monthBudgets.map((budget) => ({
    budget,
    category: categories.find((category) => category.id === budget.category_id),
    progress: budgetProgress(transactions, budget, accounts),
  })).sort((a, b) => b.progress.percent - a.progress.percent), [accounts, categories, monthBudgets, transactions]);
  const summary = useMemo(() => {
    const planned = budgetItems.reduce((sum, item) => sum + item.budget.amount, 0);
    const spent = budgetItems.reduce((sum, item) => sum + item.progress.spent, 0);
    return {
      planned,
      spent,
      remaining: planned - spent,
      percent: planned > 0 ? spent / planned : 0,
      ok: budgetItems.filter((item) => item.progress.status === "ok").length,
      warning: budgetItems.filter((item) => item.progress.status === "warning").length,
      over: budgetItems.filter((item) => item.progress.status === "over").length,
    };
  }, [budgetItems]);
  const unbudgetedCategories = expenseCategories.filter((category) => !monthBudgets.some((budget) => budget.category_id === category.id));
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState(expenseCategories[0]?.id ?? "");
  const [inspectedBudgetId, setInspectedBudgetId] = useState<string | null>(null);
  const selectedCategory = categories.find((category) => category.id === categoryId);
  const existingBudget = monthBudgets.find((budget) => budget.category_id === categoryId);
  const inspectedBudget = budgetItems.find((item) => item.budget.id === inspectedBudgetId) ?? null;
  const inspectedTransactions = useMemo(() => inspectedBudget
    ? transactions
        .filter((transaction) => !transaction.deleted_at && transaction.type === "expense" && transaction.category_id === inspectedBudget.budget.category_id && transactionBelongsToMonth(transaction, currentMonth, accounts))
        .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
    : [], [accounts, currentMonth, inspectedBudget, transactions]);
  const ringColor = summary.percent >= 1 ? colors.red : summary.percent >= 0.8 ? colors.gold : colors.green;

  useEffect(() => {
    if (!inspectedBudgetId) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setInspectedBudgetId(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [inspectedBudgetId]);

  const selectCategory = (id: string, existingAmount?: number) => {
    setCategoryId(id);
    setAmount(existingAmount ? String(existingAmount).replace(".", ",") : "");
  };

  const save = async () => {
    const parsed = Number(amount.replace(/\./g, "").replace(",", "."));
    if (!categoryId || !Number.isFinite(parsed) || parsed <= 0) {
      window.alert("Informe um valor válido.");
      return;
    }
    await saveBudget(categoryId, parsed);
    setAmount("");
  };

  return (
    <Screen>
      <div className="stack small">
        <Label>Competência {currentMonthLabel}</Label>
        <Title>Orçamentos</Title>
      </div>

      <PeriodNotice label={`Período observado: ${currentMonthLabel}`} detail="Limites acompanham a competência da compra e o vencimento das faturas." />

      <Card style={{ gap: 18 }}>
        <div className="budget-overview">
          <div className="budget-ring" style={{ background: `conic-gradient(${ringColor} ${Math.min(summary.percent * 100, 100)}%, ${colors.subtle} 0)` }}>
            <div style={{ backgroundColor: colors.surface }}>
              <strong>{Math.round(summary.percent * 100)}%</strong>
              <span style={{ color: colors.muted }}>utilizado</span>
            </div>
          </div>
          <div className="budget-overview-main">
            <Label>Planejamento mensal</Label>
            <strong>{formatCurrency(summary.planned)}</strong>
            <div className="budget-overview-values">
              <div><span style={{ color: colors.muted }}>Gasto</span><b style={{ color: colors.red }}>{formatCurrency(summary.spent)}</b></div>
              <div><span style={{ color: colors.muted }}>Disponível</span><b style={{ color: summary.remaining >= 0 ? colors.green : colors.red }}>{formatCurrency(summary.remaining)}</b></div>
            </div>
          </div>
        </div>
        <div className="budget-status-strip">
          <BudgetStatus icon={<CheckCircle2 size={15} />} count={summary.ok} label="No limite" color={colors.green} />
          <BudgetStatus icon={<AlertTriangle size={15} />} count={summary.warning} label="Atenção" color={colors.gold} />
          <BudgetStatus icon={<Target size={15} />} count={summary.over} label="Estourados" color={colors.red} />
        </div>
      </Card>

      <div className="budget-section-heading">
        <div><Label>Por categoria</Label><strong>Limites ativos</strong></div>
        <span style={{ color: colors.muted }}>{budgetItems.length} categorias</span>
      </div>

      <div className="budget-card-grid">
        {budgetItems.map(({ budget, category, progress }) => {
          const statusColor = progress.status === "over" ? colors.red : progress.status === "warning" ? colors.gold : category?.color ?? colors.green;
          const remaining = budget.amount - progress.spent;
          return (
            <button type="button" className={`budget-visual-card${inspectedBudgetId === budget.id ? " selected" : ""}`} key={budget.id} onClick={() => setInspectedBudgetId(inspectedBudgetId === budget.id ? null : budget.id)} style={{ backgroundColor: colors.surface, borderColor: inspectedBudgetId === budget.id ? colors.blue : colors.line }}>
              <div className="budget-card-top">
                <span className="budget-category-icon" style={{ backgroundColor: `${category?.color ?? colors.blue}20`, color: category?.color ?? colors.blue }}>{categoryEmoji(category)}</span>
                <div><strong style={{ color: colors.ink }}>{category?.name ?? "Categoria"}</strong><small style={{ color: colors.muted }}>{formatCurrency(progress.spent)} de {formatCurrency(budget.amount)}</small></div>
                <b style={{ color: statusColor }}>{Math.round(progress.percent * 100)}%</b>
              </div>
              <div className="budget-visual-track" style={{ backgroundColor: colors.subtle }}><i style={{ width: `${Math.min(progress.percent * 100, 100)}%`, backgroundColor: statusColor }} /></div>
              <div className="budget-card-bottom" style={{ color: colors.muted }}><span>{remaining >= 0 ? "Restam" : "Excedeu"}</span><strong style={{ color: remaining >= 0 ? colors.ink : colors.red }}>{formatCurrency(Math.abs(remaining))}</strong></div>
            </button>
          );
        })}
        {!budgetItems.length ? <Card><p className="budget-empty" style={{ color: colors.muted }}>Escolha uma categoria abaixo para criar seu primeiro limite mensal.</p></Card> : null}
      </div>

      <Card style={{ gap: 14 }}>
        <div className="budget-form-heading">
          <span className="budget-category-icon" style={{ backgroundColor: `${selectedCategory?.color ?? colors.blue}20`, color: selectedCategory?.color ?? colors.blue }}>{categoryEmoji(selectedCategory)}</span>
          <div><Label>{existingBudget ? "Editar limite" : "Novo limite"}</Label><strong>{selectedCategory?.name ?? "Selecione uma categoria"}</strong></div>
        </div>
        <div className="budget-category-picker" aria-label="Categorias para orçamento">
          {(existingBudget ? expenseCategories : unbudgetedCategories).map((category) => (
            <CategoryBadge key={category.id} category={category} selected={categoryId === category.id} onClick={() => selectCategory(category.id, monthBudgets.find((budget) => budget.category_id === category.id)?.amount)} />
          ))}
        </div>
        <div className="budget-inline-form">
          <Field value={amount} onChangeText={setAmount} placeholder="Limite mensal. Ex: 2000" keyboardType="numeric" onSubmitEditing={() => void save()} />
          <Button onPress={() => void save()}>{existingBudget ? "Atualizar limite" : "Adicionar limite"}</Button>
        </div>
        {!unbudgetedCategories.length && !existingBudget ? <p className="budget-empty" style={{ color: colors.muted }}>Todas as categorias já possuem limite neste mês.</p> : null}
      </Card>

      {inspectedBudget ? (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="budget-details-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setInspectedBudgetId(null);
          }}
        >
          <div className="modal-panel budget-details-modal" style={{ backgroundColor: colors.bg }} onMouseDown={(event) => event.stopPropagation()}>
            <div className="budget-details-header" style={{ borderColor: colors.line }}>
              <span className="budget-category-icon" style={{ backgroundColor: `${inspectedBudget.category?.color ?? colors.blue}20`, color: inspectedBudget.category?.color ?? colors.blue }}>{categoryEmoji(inspectedBudget.category)}</span>
              <div>
                <Label>Transações do orçamento</Label>
                <strong id="budget-details-title">{inspectedBudget.category?.name ?? "Categoria"}</strong>
                <small style={{ color: colors.muted }}>{inspectedTransactions.length} transação(ões) · {formatCurrency(inspectedBudget.progress.spent)} utilizados</small>
              </div>
              <button type="button" className="budget-detail-close" onClick={() => setInspectedBudgetId(null)} style={{ color: colors.muted, backgroundColor: colors.subtle }} aria-label="Fechar detalhes"><X size={17} /></button>
            </div>

            <div className="budget-details-modal-content">
              {inspectedTransactions.length ? (
                <div className="budget-transaction-list">
                  {inspectedTransactions.map((transaction) => {
                    const card = accounts.find((account) => account.id === transaction.account_id && account.type === "credit_card");
                    const isCard = transaction.payment_method === "credit_card";
                    return (
                      <div className="budget-transaction-item" key={transaction.id} style={{ borderColor: colors.line }}>
                        <div><strong>{transaction.description}</strong><small style={{ color: colors.muted }}>{formatDate(transaction.transaction_date)}</small></div>
                        <span className={`payment-badge ${isCard ? "credit-card" : "cash"}`}><span aria-hidden="true">{isCard ? "💳" : "💵"}</span><span className="payment-badge-label">{isCard ? card?.name ?? "Cartão" : "À vista"}</span></span>
                        <b style={{ color: colors.red }}>-{formatCurrency(transaction.amount)}</b>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="budget-empty" style={{ color: colors.muted }}>Nenhuma transação está consumindo este orçamento.</p>}
            </div>

            <div className="budget-details-modal-footer" style={{ borderColor: colors.line }}>
              <button
                type="button"
                className="budget-edit-limit"
                onClick={() => {
                  selectCategory(inspectedBudget.budget.category_id, inspectedBudget.budget.amount);
                  setInspectedBudgetId(null);
                }}
                style={{ color: colors.blue, backgroundColor: colors.subtle }}
              >
                <Pencil size={14} />Editar limite de {formatCurrency(inspectedBudget.budget.amount)}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Screen>
  );
}

function BudgetStatus({ icon, count, label, color }: { icon: React.ReactNode; count: number; label: string; color: string }) {
  return <div className="budget-status"><span style={{ color, backgroundColor: `${color}18` }}>{icon}</span><strong>{count}</strong><small>{label}</small></div>;
}

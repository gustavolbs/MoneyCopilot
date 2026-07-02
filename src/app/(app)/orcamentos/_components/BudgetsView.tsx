"use client";

import { Pencil } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { categoryEmoji } from "@/components/CategoryBadge";
import { Label, Screen, Title } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button as ShadcnButton } from "@/components/ui/button";
import { budgetProgress, transactionBelongsToMonth } from "@/domain/finance";
import { formatCurrency, formatDate, formatMonthYear, monthKey } from "@/domain/normalize";
import { useTheme } from "@/lib/theme";
import { useAppStore } from "@/store/appStore";

import { ActiveBudgetsSection } from "./active-budgets-section";
import { BudgetLimitForm } from "./budget-limit-form";
import { BudgetMonthSelector } from "./budget-month-selector";
import { BudgetPeriodNotice } from "./budget-period-notice";
import { MonthlyBudgetSummary } from "./monthly-budget-summary";

function shiftMonth(month: string, offset: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  return monthKey(new Date(year, monthNumber - 1 + offset, 1));
}

export function BudgetsView() {
  const { colors } = useTheme();
  const { categories, budgets, transactions, accounts, saveBudget } = useAppStore();
  const expenseCategories = categories.filter((category) => category.type === "expense");
  const currentMonth = monthKey();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const selectedMonthLabel = formatMonthYear(selectedMonth);
  const isCurrentMonth = selectedMonth === currentMonth;
  const monthBudgets = budgets.filter((budget) => budget.month === selectedMonth && !budget.deleted_at);
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
  const [formError, setFormError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState(expenseCategories[0]?.id ?? "");
  const [inspectedBudgetId, setInspectedBudgetId] = useState<string | null>(null);
  const selectedCategory = categories.find((category) => category.id === categoryId);
  const existingBudget = monthBudgets.find((budget) => budget.category_id === categoryId);
  const inspectedBudget = budgetItems.find((item) => item.budget.id === inspectedBudgetId) ?? null;

  useEffect(() => {
    setAmount("");
    setFormError(null);
    setInspectedBudgetId(null);
  }, [selectedMonth]);

  const inspectedTransactions = useMemo(() => inspectedBudget
    ? transactions
        .filter((transaction) => !transaction.deleted_at && transaction.type === "expense" && transaction.category_id === inspectedBudget.budget.category_id && transactionBelongsToMonth(transaction, selectedMonth, accounts))
        .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
    : [], [accounts, selectedMonth, inspectedBudget, transactions]);

  const moveMonth = (offset: number) => {
    setSelectedMonth((month) => shiftMonth(month, offset));
  };

  const selectCategory = (id: string, existingAmount?: number) => {
    setCategoryId(id);
    setAmount(existingAmount ? String(existingAmount).replace(".", ",") : "");
  };

  const save = async () => {
    const parsed = Number(amount.replace(/\./g, "").replace(",", "."));
    if (!categoryId || !Number.isFinite(parsed) || parsed <= 0) {
      setFormError("Informe um valor válido.");
      return;
    }
    setFormError(null);
    await saveBudget(categoryId, parsed, selectedMonth);
    setAmount("");
  };

  return (
    <Screen>
      <div className="stack small">
        <Label>Competência {selectedMonthLabel}</Label>
        <Title>Orçamentos</Title>
      </div>

      <div className="budget-hero-grid">
        <BudgetMonthSelector
          isCurrentMonth={isCurrentMonth}
          label={selectedMonthLabel}
          onCurrentMonth={() => setSelectedMonth(currentMonth)}
          onNextMonth={() => moveMonth(1)}
          onPreviousMonth={() => moveMonth(-1)}
        />
        <BudgetPeriodNotice label={selectedMonthLabel} />
        <MonthlyBudgetSummary
          okCount={summary.ok}
          overCount={summary.over}
          percent={summary.percent}
          planned={summary.planned}
          remaining={summary.remaining}
          spent={summary.spent}
          warningCount={summary.warning}
        />
      </div>

      <ActiveBudgetsSection
        items={budgetItems}
        monthLabel={selectedMonthLabel}
        onInspect={(budgetId) =>
          setInspectedBudgetId(inspectedBudgetId === budgetId ? null : budgetId)
        }
        selectedBudgetId={inspectedBudgetId}
      />

      <BudgetLimitForm
        amount={amount}
        categoryId={categoryId}
        existingBudget={existingBudget}
        findBudgetAmount={(id) =>
          monthBudgets.find((budget) => budget.category_id === id)?.amount
        }
        formError={formError}
        monthLabel={selectedMonthLabel}
        onAmountChange={setAmount}
        onSave={() => void save()}
        onSelectCategory={selectCategory}
        selectableCategories={existingBudget ? expenseCategories : unbudgetedCategories}
        selectedCategory={selectedCategory}
        totalCategories={expenseCategories.length}
      />

      <Dialog open={Boolean(inspectedBudget)} onOpenChange={(open) => { if (!open) setInspectedBudgetId(null); }}>
        {inspectedBudget ? (
          <DialogContent className="modal-panel budget-details-modal" style={{ backgroundColor: colors.bg }}>
            <div className="budget-details-header" style={{ borderColor: colors.line }}>
              <span className="budget-category-icon" style={{ backgroundColor: `${inspectedBudget.category?.color ?? colors.blue}20`, color: inspectedBudget.category?.color ?? colors.blue }}>{categoryEmoji(inspectedBudget.category)}</span>
              <div>
                <Label>Transações do orçamento · {selectedMonthLabel}</Label>
                <strong id="budget-details-title">{inspectedBudget.category?.name ?? "Categoria"}</strong>
                <small style={{ color: colors.muted }}>{inspectedTransactions.length} transação(ões) · {formatCurrency(inspectedBudget.progress.spent)} utilizados</small>
              </div>
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
                        <Badge variant="outline" className={`payment-badge ${isCard ? "credit-card" : "cash"}`}><span aria-hidden="true">{isCard ? "💳" : "💵"}</span><span className="payment-badge-label">{isCard ? card?.name ?? "Cartão" : "À vista"}</span></Badge>
                        <b style={{ color: colors.red }}>-{formatCurrency(transaction.amount)}</b>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="budget-empty" style={{ color: colors.muted }}>Nenhuma transação está consumindo este orçamento.</p>}
            </div>

            <div className="budget-details-modal-footer" style={{ borderColor: colors.line }}>
              <ShadcnButton
                type="button"
                variant="ghost"
                className="budget-edit-limit"
                onClick={() => {
                  selectCategory(inspectedBudget.budget.category_id, inspectedBudget.budget.amount);
                  setInspectedBudgetId(null);
                }}
                style={{ color: colors.blue, backgroundColor: colors.subtle }}
              >
                <Pencil size={14} />Editar limite de {formatCurrency(inspectedBudget.budget.amount)}
              </ShadcnButton>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </Screen>
  );
}

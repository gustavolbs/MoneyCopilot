"use client";

import { AlertTriangle, CheckCircle2, Target } from "lucide-react";
import { useMemo, useState } from "react";

import { CategoryBadge, categoryEmoji } from "@/components/CategoryBadge";
import { PeriodNotice } from "@/components/PeriodNotice";
import { Button, Card, Field, Label, Screen, Title } from "@/components/ui";
import { budgetProgress } from "@/domain/finance";
import { formatCurrency, monthKey } from "@/domain/normalize";
import { useTheme } from "@/lib/theme";
import { useAppStore } from "@/store/appStore";

export function BudgetsScreen() {
  const { colors } = useTheme();
  const { categories, budgets, transactions, accounts, saveBudget } = useAppStore();
  const expenseCategories = categories.filter((category) => category.type === "expense");
  const currentMonth = monthKey();
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
  const selectedCategory = categories.find((category) => category.id === categoryId);
  const existingBudget = monthBudgets.find((budget) => budget.category_id === categoryId);
  const ringColor = summary.percent >= 1 ? colors.red : summary.percent >= 0.8 ? colors.gold : colors.green;

  const selectCategory = (id: string, existingAmount?: number) => {
    setCategoryId(id);
    setAmount(existingAmount ? String(existingAmount).replace(".", ",") : "");
  };

  const save = async () => {
    const parsed = Number(amount.replace(/\./g, "").replace(",", "."));
    if (!categoryId || !Number.isFinite(parsed) || parsed <= 0) {
      window.alert("Informe um valor valido.");
      return;
    }
    await saveBudget(categoryId, parsed);
    setAmount("");
  };

  return (
    <Screen>
      <div className="stack small">
        <Label>Competencia {currentMonth}</Label>
        <Title>Orcamentos</Title>
      </div>

      <PeriodNotice label={`Periodo observado: ${currentMonth}`} detail="Limites acompanham a competencia da compra e o vencimento das faturas." />

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
              <div><span style={{ color: colors.muted }}>Disponivel</span><b style={{ color: summary.remaining >= 0 ? colors.green : colors.red }}>{formatCurrency(summary.remaining)}</b></div>
            </div>
          </div>
        </div>
        <div className="budget-status-strip">
          <BudgetStatus icon={<CheckCircle2 size={15} />} count={summary.ok} label="No limite" color={colors.green} />
          <BudgetStatus icon={<AlertTriangle size={15} />} count={summary.warning} label="Atencao" color={colors.gold} />
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
            <button type="button" className="budget-visual-card" key={budget.id} onClick={() => selectCategory(budget.category_id, budget.amount)} style={{ backgroundColor: colors.surface, borderColor: colors.line }}>
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
        <div className="budget-category-picker" aria-label="Categorias para orcamento">
          {(existingBudget ? expenseCategories : unbudgetedCategories).map((category) => (
            <CategoryBadge key={category.id} category={category} selected={categoryId === category.id} onClick={() => selectCategory(category.id, monthBudgets.find((budget) => budget.category_id === category.id)?.amount)} />
          ))}
        </div>
        <div className="budget-inline-form">
          <Field value={amount} onChangeText={setAmount} placeholder="Limite mensal. Ex: 2000" keyboardType="numeric" onSubmitEditing={() => void save()} />
          <Button onPress={() => void save()}>{existingBudget ? "Atualizar limite" : "Adicionar limite"}</Button>
        </div>
        {!unbudgetedCategories.length && !existingBudget ? <p className="budget-empty" style={{ color: colors.muted }}>Todas as categorias ja possuem limite neste mes.</p> : null}
      </Card>
    </Screen>
  );
}

function BudgetStatus({ icon, count, label, color }: { icon: React.ReactNode; count: number; label: string; color: string }) {
  return <div className="budget-status"><span style={{ color, backgroundColor: `${color}18` }}>{icon}</span><strong>{count}</strong><small>{label}</small></div>;
}

"use client";

import { AlertTriangle, CalendarDays, PlusCircle } from "lucide-react";

import { CategoryBadge, categoryEmoji } from "@/components/CategoryBadge";
import { Button, Field, Label } from "@/components/ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency } from "@/domain/normalize";
import type { Budget, Category } from "@/domain/types";
import { useTheme } from "@/lib/theme";

type BudgetLimitFormProps = {
  amount: string;
  categoryId: string;
  existingBudget: Budget | undefined;
  formError: string | null;
  monthLabel: string;
  selectableCategories: Category[];
  selectedCategory: Category | undefined;
  totalCategories: number;
  onAmountChange: (value: string) => void;
  onSave: () => void;
  onSelectCategory: (id: string, existingAmount?: number) => void;
  findBudgetAmount: (categoryId: string) => number | undefined;
};

export function BudgetLimitForm({
  amount,
  categoryId,
  existingBudget,
  formError,
  monthLabel,
  selectableCategories,
  selectedCategory,
  totalCategories,
  onAmountChange,
  onSave,
  onSelectCategory,
  findBudgetAmount,
}: BudgetLimitFormProps) {
  const { colors } = useTheme();
  const modeLabel = existingBudget ? "Editar limite" : "Novo limite";
  const selectedAmount = existingBudget?.amount;
  const empty = selectableCategories.length === 0 && !existingBudget;

  return (
    <section className="budget-limit-panel" aria-labelledby="budget-limit-title">
      <div className="budget-limit-hero">
        <span
          className="budget-category-icon budget-limit-icon"
          style={{
            backgroundColor: `${selectedCategory?.color ?? colors.blue}20`,
            color: selectedCategory?.color ?? colors.blue,
          }}
        >
          {categoryEmoji(selectedCategory)}
        </span>
        <div className="budget-limit-hero-copy">
          <span>{modeLabel}</span>
          <strong id="budget-limit-title">
            {selectedCategory?.name ?? "Selecione uma categoria"}
          </strong>
          <div className="budget-limit-meta">
            <small>
              <CalendarDays size={12} aria-hidden="true" />
              {monthLabel}
            </small>
            {selectedAmount ? <small>{formatCurrency(selectedAmount)}</small> : null}
          </div>
        </div>
      </div>

      <div className="budget-limit-content">
        <div className="budget-limit-heading">
          <div>
            <Label>Categorias</Label>
            <strong>{selectableCategories.length} de {totalCategories} disponíveis</strong>
          </div>
          <span>
            <PlusCircle size={14} aria-hidden="true" />
            {modeLabel}
          </span>
        </div>

        <div className="budget-category-picker-wrap">
          <div className="budget-category-picker" aria-label="Categorias para orçamento">
            {selectableCategories.map((category) => (
              <CategoryBadge
                key={category.id}
                category={category}
                selected={categoryId === category.id}
                onClick={() => onSelectCategory(category.id, findBudgetAmount(category.id))}
              />
            ))}
          </div>
        </div>

        <div className="budget-inline-form">
          <div className="budget-limit-value-field">
            <span>Valor mensal</span>
            <Field
              value={amount}
              onChangeText={onAmountChange}
              placeholder="Ex: 2000"
              keyboardType="numeric"
              onSubmitEditing={onSave}
            />
          </div>
          <Button onPress={onSave}>{existingBudget ? "Atualizar limite" : "Adicionar limite"}</Button>
        </div>

        {formError ? (
          <Alert variant="destructive" className="budget-limit-alert">
            <AlertTriangle />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        {empty ? (
          <p className="budget-empty" style={{ color: colors.muted }}>
            Todas as categorias já possuem limite em {monthLabel}.
          </p>
        ) : null}
      </div>
    </section>
  );
}

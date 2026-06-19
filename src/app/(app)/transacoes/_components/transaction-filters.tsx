"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ComboboxField } from "@/components/ui";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { TransactionType } from "@/domain/types";

export type TransactionTypeFilter = "all" | TransactionType;
export type TransactionPaymentFilter = "all" | "cash" | "credit_card";

interface FilterOption {
  value: string;
  label: string;
}

interface TransactionFiltersProps {
  query: string;
  type: TransactionTypeFilter;
  categoryId: string;
  payment: TransactionPaymentFilter;
  categoryOptions: FilterOption[];
  categoryDisabled: boolean;
  paymentDisabled: boolean;
  resultCount: number;
  hasActiveFilters: boolean;
  onQueryChange: (value: string) => void;
  onTypeChange: (value: TransactionTypeFilter) => void;
  onCategoryChange: (value: string) => void;
  onPaymentChange: (value: TransactionPaymentFilter) => void;
  onClear: () => void;
}

const typeOptions: Array<[TransactionTypeFilter, string]> = [
  ["all", "Todos"],
  ["income", "Entradas"],
  ["expense", "Saídas"],
  ["transfer", "Transferências"],
];

export function TransactionFilters({
  query,
  type,
  categoryId,
  payment,
  categoryOptions,
  categoryDisabled,
  paymentDisabled,
  resultCount,
  hasActiveFilters,
  onQueryChange,
  onTypeChange,
  onCategoryChange,
  onPaymentChange,
  onClear,
}: TransactionFiltersProps) {
  return (
    <section className="transaction-filter-panel" aria-label="Filtros">
      <header className="transaction-filter-title">
        <span className="transaction-filter-title-icon" aria-hidden="true">
          <SlidersHorizontal size={15} />
        </span>
        <div>
          <strong>Filtros</strong>
          <small>
            {resultCount} {resultCount === 1 ? "resultado" : "resultados"}
          </small>
        </div>
        {hasActiveFilters ? (
          <Button
            type="button"
            variant="ghost"
            className="transaction-filter-clear"
            onClick={onClear}
          >
            <X size={13} aria-hidden="true" />
            Limpar
          </Button>
        ) : null}
      </header>

      <div className="transaction-filter-controls">
        <InputGroup className="transaction-search">
          <InputGroupAddon>
            <Search size={17} />
          </InputGroupAddon>
          <InputGroupInput
            value={query}
            onChange={(event) => onQueryChange(event.currentTarget.value)}
            placeholder="Buscar por descrição"
            aria-label="Buscar por descrição"
          />
        </InputGroup>

        <ToggleGroup
          value={[type]}
          onValueChange={(values) =>
            onTypeChange((values[0] ?? "all") as TransactionTypeFilter)
          }
          className="transaction-type-filter"
          aria-label="Tipo de transação"
        >
          {typeOptions.map(([value, label]) => (
            <ToggleGroupItem
              key={value}
              value={value}
              className={type === value ? "active" : ""}
            >
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <label className="transaction-filter-field">
          <span>Categoria</span>
          <ComboboxField
            className="transaction-filter-select"
            value={categoryId}
            disabled={categoryDisabled}
            onValueChange={onCategoryChange}
            options={categoryOptions}
            placeholder="Buscar categoria"
          />
        </label>

        <label className="transaction-filter-field">
          <span>Pagamento</span>
          <ComboboxField
            className="transaction-filter-select"
            value={payment}
            disabled={paymentDisabled}
            onValueChange={(value) =>
              onPaymentChange((value || "all") as TransactionPaymentFilter)
            }
            options={[
              {
                value: "all",
                label: paymentDisabled ? "Não se aplica" : "Todos",
              },
              { value: "cash", label: "À vista" },
              { value: "credit_card", label: "Cartão de crédito" },
            ]}
            placeholder="Buscar pagamento"
          />
        </label>
      </div>
    </section>
  );
}

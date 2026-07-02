"use client";

import { subMonths } from "date-fns";
import { useState } from "react";

import { Screen } from "@/components/ui";
import { metricsForMonth, transactionBelongsToMonth } from "@/domain/finance";
import { formatMonthShort, formatMonthYear, monthKey } from "@/domain/normalize";
import { useAppStore } from "@/store/appStore";

import { InsightsAutomaticAnalysis } from "./insights-automatic-analysis";
import { InsightsDistributionCard } from "./insights-distribution-card";
import { InsightsEvolutionCard } from "./insights-evolution-card";
import { InsightsHighlightsCard } from "./insights-highlights-card";
import { InsightsMetricCards } from "./insights-metric-cards";
import { InsightsPageHeader } from "./insights-page-header";
import { InsightsPeriodCard } from "./insights-period-card";

function shiftMonth(month: string, offset: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  return monthKey(new Date(year, monthNumber - 1 + offset, 1));
}

export function InsightsView() {
  const { insights, transactions, categories, recurrences, accounts } = useAppStore();
  const currentMonth = monthKey();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const selectedMonthDate = new Date(`${selectedMonth}-01T00:00:00`);
  const selectedMonthLabel = formatMonthYear(selectedMonth);
  const monthlySeries = [3, 2, 1, 0].map((offset) => {
    const date = subMonths(selectedMonthDate, offset);
    return {
      label: formatMonthShort(date),
      metrics: metricsForMonth(transactions, categories, monthKey(date), recurrences, accounts),
    };
  });
  const metrics = monthlySeries.at(-1)!.metrics;
  const previousMetrics = monthlySeries.at(-2)!.metrics;
  const previousMonthsWithExpenses = monthlySeries.slice(0, -1).filter((item) => item.metrics.expense > 0);
  const previousExpenseAverage = previousMonthsWithExpenses.length
    ? previousMonthsWithExpenses.reduce((sum, item) => sum + item.metrics.expense, 0) / previousMonthsWithExpenses.length
    : 0;
  const expenseChange = percentChange(metrics.expense, previousMetrics.expense);
  const incomeChange = percentChange(metrics.income, previousMetrics.income);
  const averageExpenseChange = percentChange(metrics.expense, previousExpenseAverage);
  const savingsRate = metrics.income > 0 ? (metrics.balance / metrics.income) * 100 : null;
  const maxMonthlyValue = Math.max(...monthlySeries.flatMap((item) => [item.metrics.expense, item.metrics.income]), 1);
  const largestExpense = metrics.largestExpenses[0];
  const transferCount = transactions.filter((transaction) => transaction.type === "transfer" && transactionBelongsToMonth(transaction, selectedMonth, accounts)).length;
  const moveMonth = (offset: number) => {
    setSelectedMonth((month) => shiftMonth(month, offset));
  };

  return (
    <Screen>
      <InsightsPageHeader
        isCurrentMonth={selectedMonth === currentMonth}
        monthLabel={selectedMonthLabel}
        onCurrentMonth={() => setSelectedMonth(currentMonth)}
        onNextMonth={() => moveMonth(1)}
        onPreviousMonth={() => moveMonth(-1)}
      />

      <InsightsPeriodCard monthLabel={selectedMonthLabel} />

      <InsightsMetricCards
        averageExpense={previousExpenseAverage}
        averageExpenseChange={averageExpenseChange}
        expense={metrics.expense}
        expenseChange={expenseChange}
        income={metrics.income}
        incomeChange={incomeChange}
        savingsRate={savingsRate}
      />

      <InsightsEvolutionCard maxValue={maxMonthlyValue} series={monthlySeries} />

      <div className="insights-visual-grid">
        <InsightsDistributionCard categories={metrics.byCategory} />
        <InsightsHighlightsCard
          largestExpense={largestExpense}
          projectedClose={metrics.projectedClose}
          transferCount={transferCount}
        />
      </div>

      <InsightsAutomaticAnalysis insights={insights} />
    </Screen>
  );
}

function percentChange(current: number, reference: number) {
  return reference > 0 ? ((current - reference) / reference) * 100 : null;
}

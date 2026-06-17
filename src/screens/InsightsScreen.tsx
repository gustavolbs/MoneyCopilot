'use client';

import { Card, Label, RowItem, Screen, Title } from '@/components/ui';
import { metricsForMonth } from '@/domain/finance';
import { formatCurrency, monthKey } from '@/domain/normalize';
import { useTheme } from '@/lib/theme';
import { useAppStore } from '@/store/appStore';

export function InsightsScreen() {
  const { colors } = useTheme();
  const { insights, transactions, categories, recurrences, accounts } = useAppStore();
  const metrics = metricsForMonth(transactions, categories, monthKey(), recurrences, accounts);
  const topCategory = metrics.byCategory[0];
  const largestExpense = metrics.largestExpenses[0];
  const transferCount = transactions.filter((transaction) => transaction.type === 'transfer' && transaction.transaction_date.startsWith(monthKey())).length;

  return (
    <Screen>
      <div className="stack small">
        <Label>Leitura do mes</Label>
        <Title>Insights</Title>
      </div>

      <Card style={{ gap: 14 }}>
        <Label>Resumo</Label>
        <RowItem title="Sobra prevista" subtitle="Receitas menos despesas e recorrencias" right={<span>{formatCurrency(metrics.projectedClose)}</span>} />
        <RowItem title="Disponivel para gastar" subtitle="Fora de cofrinhos e investimentos" right={<span>{formatCurrency(metrics.availableToSpend)}</span>} />
        <RowItem title="Guardado em reservas" subtitle="Cofrinhos e reservas" right={<span style={{ color: colors.gold }}>{formatCurrency(metrics.reserveTotal)}</span>} />
      </Card>

      <Card style={{ gap: 14 }}>
        <Label>Movimento</Label>
        <RowItem title="Principal categoria" subtitle={topCategory ? `${Math.round(topCategory.percent * 100)}% das despesas` : 'Sem despesas'} right={<span style={{ color: colors.muted }}>{topCategory?.category.name ?? '-'}</span>} />
        <RowItem title="Maior despesa" subtitle={largestExpense?.description ?? 'Sem despesas'} right={<span style={{ color: colors.red }}>{largestExpense ? formatCurrency(largestExpense.amount) : '-'}</span>} />
        <RowItem title="Transferencias internas" subtitle="Nao entram em receita/despesa" right={<span style={{ color: colors.blue }}>{transferCount}</span>} />
      </Card>

      {insights.map((insight) => (
        <Card key={insight.id} style={{ gap: 8, borderColor: insight.tone === 'warning' ? '#FCA5A5' : colors.line }}>
          <h2 className="card-title" style={{ color: colors.ink }}>{insight.title}</h2>
          <p className="muted" style={{ color: colors.muted }}>{insight.body}</p>
        </Card>
      ))}
      {!insights.length ? <Card><p className="muted" style={{ color: colors.muted }}>Use o app por alguns dias para gerar comparacoes e alertas.</p></Card> : null}
    </Screen>
  );
}

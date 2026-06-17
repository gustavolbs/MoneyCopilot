import { Text, View } from 'react-native';

import { Card, Label, RowItem, Screen, Title } from '@/components/ui';
import { metricsForMonth } from '@/domain/finance';
import { formatCurrency, monthKey } from '@/domain/normalize';
import { useTheme } from '@/lib/theme';
import { useAppStore } from '@/store/appStore';

export default function InsightsScreen() {
  const { colors } = useTheme();
  const { insights, transactions, categories, recurrences, accounts } = useAppStore();
  const metrics = metricsForMonth(transactions, categories, monthKey(), recurrences, accounts);
  const topCategory = metrics.byCategory[0];
  const largestExpense = metrics.largestExpenses[0];
  const transferCount = transactions.filter((transaction) => transaction.type === 'transfer' && transaction.transaction_date.startsWith(monthKey())).length;

  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Label>Leitura do mes</Label>
        <Title>Insights</Title>
      </View>

      <Card style={{ gap: 14 }}>
        <Label>Resumo</Label>
        <RowItem title="Sobra prevista" subtitle="Receitas menos despesas e recorrencias" right={<Text style={{ color: colors.ink, fontSize: 16 }}>{formatCurrency(metrics.projectedClose)}</Text>} />
        <RowItem title="Disponivel para gastar" subtitle="Fora de cofrinhos e investimentos" right={<Text style={{ color: colors.ink, fontSize: 16 }}>{formatCurrency(metrics.availableToSpend)}</Text>} />
        <RowItem title="Guardado em reservas" subtitle="Cofrinhos e reservas" right={<Text style={{ color: colors.gold, fontSize: 16 }}>{formatCurrency(metrics.reserveTotal)}</Text>} />
      </Card>

      <Card style={{ gap: 14 }}>
        <Label>Movimento</Label>
        <RowItem title="Principal categoria" subtitle={topCategory ? `${Math.round(topCategory.percent * 100)}% das despesas` : 'Sem despesas'} right={<Text style={{ color: colors.muted }}>{topCategory?.category.name ?? '-'}</Text>} />
        <RowItem title="Maior despesa" subtitle={largestExpense?.description ?? 'Sem despesas'} right={<Text style={{ color: colors.red }}>{largestExpense ? formatCurrency(largestExpense.amount) : '-'}</Text>} />
        <RowItem title="Transferencias internas" subtitle="Nao entram em receita/despesa" right={<Text style={{ color: colors.blue }}>{transferCount}</Text>} />
      </Card>

      {insights.map((insight) => (
        <Card key={insight.id} style={{ gap: 8, borderColor: insight.tone === 'warning' ? '#FCA5A5' : colors.line }}>
          <Text style={{ color: colors.ink, fontWeight: '600', fontSize: 16 }}>{insight.title}</Text>
          <Text style={{ color: colors.muted, lineHeight: 20 }}>{insight.body}</Text>
        </Card>
      ))}
      {!insights.length ? <Card><Text style={{ color: colors.muted }}>Use o app por alguns dias para gerar comparacoes e alertas.</Text></Card> : null}
    </Screen>
  );
}

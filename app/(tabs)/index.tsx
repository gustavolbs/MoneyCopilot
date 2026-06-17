import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Text, View } from 'react-native';

import { CategoryBars } from '@/components/FinanceCharts';
import { QuickEntry } from '@/components/QuickEntry';
import { SyncPill } from '@/components/SyncPill';
import { TransactionRow } from '@/components/TransactionRow';
import { Card, Label, Screen, Title } from '@/components/ui';
import { metricsForMonth } from '@/domain/finance';
import { formatCurrency, monthKey } from '@/domain/normalize';
import { useTheme } from '@/lib/theme';
import { useAppStore } from '@/store/appStore';

export default function HomeScreen() {
  const { transactions, categories, recurrences, accounts } = useAppStore();
  const { colors } = useTheme();
  const metrics = metricsForMonth(transactions, categories, monthKey(), recurrences, accounts);
  const monthLabel = format(new Date(), 'MMMM yyyy', { locale: ptBR });

  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <SyncPill />
        <Label>{monthLabel}</Label>
        <Title>Inicio</Title>
      </View>

      <Card style={{ gap: 8, backgroundColor: colors.ink }}>
        <Text style={{ color: colors.bg, opacity: 0.75, fontWeight: '500' }}>Saldo disponivel para gastar</Text>
        <Text style={{ color: colors.bg, fontSize: 36, fontWeight: '600' }}>{formatCurrency(metrics.availableToSpend)}</Text>
        <Text style={{ color: colors.bg, opacity: 0.72 }}>Contas correntes, dinheiro e outros saldos livres.</Text>
      </Card>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1, gap: 6 }}>
          <Label>Guardado</Label>
          <Text style={{ color: colors.gold, fontSize: 20, fontWeight: '600' }}>{formatCurrency(metrics.reserveTotal)}</Text>
        </Card>
        <Card style={{ flex: 1, gap: 6 }}>
          <Label>Patrimonio</Label>
          <Text style={{ color: colors.green, fontSize: 20, fontWeight: '600' }}>{formatCurrency(metrics.netWorth)}</Text>
        </Card>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1, gap: 6 }}>
          <Label>Sobra prevista</Label>
          <Text style={{ color: colors.ink, fontSize: 18, fontWeight: '600' }}>{formatCurrency(metrics.projectedClose)}</Text>
        </Card>
        <Card style={{ flex: 1, gap: 6 }}>
          <Label>Despesas mes</Label>
          <Text style={{ color: colors.red, fontSize: 18, fontWeight: '600' }}>{formatCurrency(metrics.expense)}</Text>
        </Card>
      </View>

      <Card style={{ gap: 14 }}>
        <Label>Lancamento rapido</Label>
        <QuickEntry />
      </Card>

      <Card style={{ gap: 14 }}>
        <Label>Gasto por categoria</Label>
        <CategoryBars metrics={metrics} />
      </Card>

      <Card>
        <Label>Recentes</Label>
        {transactions.slice(0, 6).map((transaction) => (
          <TransactionRow key={transaction.id} transaction={transaction} category={categories.find((item) => item.id === transaction.category_id)} />
        ))}
        {!transactions.length ? <Text style={{ color: colors.muted, marginTop: 12 }}>Nenhum lancamento ainda.</Text> : null}
      </Card>
    </Screen>
  );
}

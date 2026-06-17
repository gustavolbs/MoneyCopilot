import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Moon, Sun } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { CategoryBars } from '@/components/FinanceCharts';
import { QuickEntry } from '@/components/QuickEntry';
import { SyncPill } from '@/components/SyncPill';
import { TransactionRow } from '@/components/TransactionRow';
import { Card, Label, Screen, Title } from '@/components/ui';
import { metricsForMonth } from '@/domain/finance';
import { formatCurrency, monthKey } from '@/domain/normalize';
import { useTheme } from '@/lib/theme';
import { useAppStore } from '@/store/appStore';
import { useThemeStore } from '@/store/themeStore';

export default function HomeScreen() {
  const { transactions, categories, recurrences, accounts } = useAppStore();
  const { colors, isDark } = useTheme();
  const toggleDarkMode = useThemeStore((state) => state.toggleDarkMode);
  const metrics = metricsForMonth(transactions, categories, monthKey(), recurrences, accounts);
  const monthLabel = format(new Date(), 'MMMM yyyy', { locale: ptBR });

  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <SyncPill />
        <Label>{monthLabel}</Label>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Title>Inicio</Title>
          <Pressable
            onPress={() => toggleDarkMode(colors.bg)}
            accessibilityRole="button"
            accessibilityLabel={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: colors.line,
              backgroundColor: colors.surface,
            }}
          >
            {isDark ? <Sun size={19} color={colors.ink} strokeWidth={1.8} /> : <Moon size={19} color={colors.ink} strokeWidth={1.8} />}
          </Pressable>
        </View>
      </View>

      <Card
        style={{
          gap: 8,
          backgroundColor: isDark ? '#111827' : '#FFFDF5',
          borderColor: isDark ? '#273244' : '#ECE6D1',
          shadowColor: isDark ? '#000000' : '#D9A441',
          shadowOpacity: isDark ? 0.22 : 0.12,
        }}
      >
        <Text style={{ color: isDark ? '#A7B0C0' : '#7C6A3A', fontWeight: '500' }}>Saldo disponivel para gastar</Text>
        <Text style={{ color: isDark ? '#F8FAFC' : '#171717', fontSize: 36, fontWeight: '600' }}>{formatCurrency(metrics.availableToSpend)}</Text>
        <Text style={{ color: isDark ? '#8B95A7' : '#7A7464' }}>Contas correntes, dinheiro e outros saldos livres.</Text>
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

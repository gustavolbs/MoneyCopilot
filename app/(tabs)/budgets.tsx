import { useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Card, Field, Label, Screen, Title, Button, RowItem } from '@/components/ui';
import { budgetProgress } from '@/domain/finance';
import { formatCurrency, monthKey } from '@/domain/normalize';
import { useTheme } from '@/lib/theme';
import { useAppStore } from '@/store/appStore';

export default function BudgetsScreen() {
  const { colors } = useTheme();
  const { categories, budgets, transactions, saveBudget } = useAppStore();
  const expenseCategories = categories.filter((item) => item.type === 'expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState(expenseCategories[0]?.id ?? '');
  const currentMonth = monthKey();
  const monthBudgets = budgets.filter((budget) => budget.month === currentMonth);
  const summary = useMemo(() => {
    const spent = monthBudgets.reduce((sum, budget) => sum + budgetProgress(transactions, budget).spent, 0);
    const planned = monthBudgets.reduce((sum, budget) => sum + budget.amount, 0);
    return { spent, planned, percent: planned > 0 ? spent / planned : 0 };
  }, [monthBudgets, transactions]);

  const create = async () => {
    const parsed = Number(amount.replace(/\./g, '').replace(',', '.'));
    if (!categoryId || !Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert('Orcamento', 'Informe um valor valido.');
      return;
    }
    await saveBudget(categoryId, parsed);
    setAmount('');
  };

  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Label>{currentMonth}</Label>
        <Title>Orcamentos</Title>
      </View>

      <Card style={{ gap: 12 }}>
        <Label>Total planejado</Label>
        <Text style={{ color: colors.ink, fontSize: 30, fontWeight: '600' }}>{formatCurrency(summary.planned)}</Text>
        <View style={{ height: 9, borderRadius: 99, backgroundColor: colors.subtle, overflow: 'hidden' }}>
          <View style={{ height: 9, width: `${Math.min(summary.percent * 100, 100)}%`, backgroundColor: summary.percent >= 1 ? colors.red : summary.percent >= 0.8 ? colors.gold : colors.green }} />
        </View>
        <Text style={{ color: colors.muted }}>{formatCurrency(summary.spent)} usados no mes</Text>
      </Card>

      <Card style={{ gap: 12 }}>
        <Label>Novo orcamento</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {expenseCategories.map((category) => (
            <Pressable
              key={category.id}
              onPress={() => setCategoryId(category.id)}
              style={{
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: categoryId === category.id ? category.color : colors.subtle,
              }}
            >
              <Text style={{ color: categoryId === category.id ? '#fff' : colors.ink, fontWeight: '500', fontSize: 13 }}>{category.name}</Text>
            </Pressable>
          ))}
        </View>
        <Field value={amount} onChangeText={setAmount} placeholder="Limite mensal. Ex: 2000" keyboardType="numeric" />
        <Button onPress={() => void create()}>Salvar orcamento</Button>
      </Card>

      <Card style={{ gap: 4 }}>
        <Label>Ativos</Label>
        {monthBudgets.map((budget) => {
          const category = categories.find((item) => item.id === budget.category_id);
          const progress = budgetProgress(transactions, budget);
          return (
            <View key={budget.id} style={{ paddingVertical: 8, gap: 8 }}>
              <RowItem
                title={category?.name ?? 'Categoria'}
                subtitle={`${formatCurrency(progress.spent)} de ${formatCurrency(budget.amount)}`}
                right={<Text style={{ color: progress.status === 'over' ? colors.red : progress.status === 'warning' ? colors.gold : colors.muted }}>{Math.round(progress.percent * 100)}%</Text>}
              />
              <View style={{ height: 8, borderRadius: 99, backgroundColor: colors.subtle, overflow: 'hidden' }}>
                <View style={{ height: 8, width: `${Math.min(progress.percent * 100, 100)}%`, backgroundColor: progress.status === 'over' ? colors.red : progress.status === 'warning' ? colors.gold : category?.color ?? colors.green }} />
              </View>
            </View>
          );
        })}
        {!monthBudgets.length ? <Text style={{ color: colors.muted, paddingVertical: 10 }}>Nenhum orcamento criado para este mes.</Text> : null}
      </Card>

      <Card style={{ gap: 4 }}>
        <Label>Sem orcamento</Label>
        {expenseCategories.filter((category) => !monthBudgets.some((budget) => budget.category_id === category.id)).slice(0, 8).map((category) => {
          const spent = transactions
            .filter((transaction) => transaction.type === 'expense' && transaction.category_id === category.id && transaction.transaction_date.startsWith(currentMonth))
            .reduce((sum, transaction) => sum + transaction.amount, 0);
        return (
          <RowItem key={category.id} title={category.name} subtitle={spent > 0 ? `${formatCurrency(spent)} gastos no mes` : 'Sem gastos no mes'} right={<Text style={{ color: colors.muted }}>Adicionar</Text>} onPress={() => setCategoryId(category.id)} />
        );
      })}
      </Card>
    </Screen>
  );
}

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatCurrency } from '@/domain/normalize';
import { Category, Transaction } from '@/domain/types';
import { useTheme } from '@/lib/theme';

export function TransactionRow({ transaction, category, onPress }: { transaction: Transaction; category?: Category; onPress?: () => void }) {
  const { colors } = useTheme();
  const amountColor = transaction.type === 'income' ? colors.green : transaction.type === 'transfer' ? colors.blue : colors.red;
  const meta = category?.name ?? (transaction.type === 'transfer' ? 'Transferencia' : 'Outros');

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={[styles.dot, { backgroundColor: category?.color ?? colors.subtle }]} />
      <View style={styles.main}>
        <Text style={[styles.title, { color: colors.ink }]} numberOfLines={1}>{transaction.description}</Text>
        <Text style={[styles.meta, { color: colors.muted }]}>{meta} · {transaction.transaction_date}</Text>
      </View>
      <Text style={[styles.amount, { color: amountColor }]}>
        {transaction.type === 'income' ? '+' : transaction.type === 'transfer' ? '' : '-'}{formatCurrency(transaction.amount)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  dot: {
    width: 34,
    height: 34,
    borderRadius: 12,
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontWeight: '500',
    fontSize: 15,
  },
  meta: {
    fontSize: 12,
    marginTop: 3,
  },
  amount: {
    fontWeight: '600',
    fontSize: 14,
  },
});

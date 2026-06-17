import { StyleSheet, Text, View } from 'react-native';

import { DashboardMetrics } from '@/domain/finance';
import { formatCurrency } from '@/domain/normalize';
import { useTheme } from '@/lib/theme';

export function CategoryBars({ metrics }: { metrics: DashboardMetrics }) {
  const { colors } = useTheme();

  if (!metrics.byCategory.length) {
    return <Text style={[styles.empty, { color: colors.muted }]}>Sem despesas neste mes.</Text>;
  }

  return (
    <View style={styles.wrap}>
      {metrics.byCategory.slice(0, 6).map((item) => (
        <View key={item.category.id} style={styles.row}>
          <View style={styles.top}>
            <Text style={[styles.name, { color: colors.ink }]}>{item.category.name}</Text>
            <Text style={[styles.amount, { color: colors.muted }]}>{formatCurrency(item.amount)}</Text>
          </View>
          <View style={[styles.track, { backgroundColor: colors.subtle }]}>
            <View style={[styles.fill, { width: `${Math.max(item.percent * 100, 4)}%`, backgroundColor: item.category.color }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  row: { gap: 7 },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  name: { fontWeight: '500' },
  amount: { fontWeight: '500' },
  track: { height: 8, borderRadius: 999, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 999 },
  empty: { fontWeight: '400' },
});

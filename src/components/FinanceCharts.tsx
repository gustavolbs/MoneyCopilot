import { DashboardMetrics } from '@/domain/finance';
import { formatCurrency } from '@/domain/normalize';
import { useTheme } from '@/lib/theme';

export function CategoryBars({ metrics }: { metrics: DashboardMetrics }) {
  const { colors } = useTheme();

  if (!metrics.byCategory.length) {
    return <p className="muted" style={{ color: colors.muted }}>Sem despesas neste mês.</p>;
  }

  return (
    <div className="category-bars">
      {metrics.byCategory.slice(0, 6).map((item) => (
        <div key={item.category.id} className="category-row">
          <div className="category-top">
            <span className="category-name" style={{ color: colors.ink }}>{item.category.name}</span>
            <span className="category-amount" style={{ color: colors.muted }}>{formatCurrency(item.amount)}</span>
          </div>
          <div className="progress-track" style={{ backgroundColor: colors.subtle }}>
            <div className="progress-fill" style={{ width: `${Math.max(item.percent * 100, 4)}%`, backgroundColor: item.category.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

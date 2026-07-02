import { DataTooltip } from "@/components/InsightTooltip";
import { Label } from "@/components/ui";
import type { DashboardMetrics } from "@/domain/finance";
import { formatCurrency } from "@/domain/normalize";
import { useTheme } from "@/lib/theme";

type InsightsDistributionCardProps = {
  categories: DashboardMetrics["byCategory"];
};

export function InsightsDistributionCard({
  categories,
}: InsightsDistributionCardProps) {
  const { colors } = useTheme();
  const topCategory = categories[0];

  return (
    <section className="insights-distribution-card">
      <div className="insights-section-head">
        <div>
          <Label>Distribuição</Label>
          <strong>Principais categorias</strong>
        </div>
      </div>

      {topCategory ? (
        <div className="insights-category-overview">
          <div
            className="insights-donut"
            style={{
              background: `conic-gradient(${topCategory.category.color} ${topCategory.percent * 100}%, ${colors.subtle} 0)`,
            }}
          >
            <div style={{ backgroundColor: colors.surface }}>
              <strong>{Math.round(topCategory.percent * 100)}%</strong>
              <span>do total</span>
            </div>
          </div>

          <div className="insights-category-ranking">
            {categories.slice(0, 4).map((item) => (
              <DataTooltip
                key={item.category.id}
                body={formatCurrency(item.amount)}
                detail={`${Math.round(item.percent * 100)}% das despesas do mês`}
                title={item.category.name}
              >
                <div>
                  <span>
                    <i style={{ backgroundColor: item.category.color }} />
                    {item.category.name}
                  </span>
                  <strong>{Math.round(item.percent * 100)}%</strong>
                </div>
              </DataTooltip>
            ))}
          </div>
        </div>
      ) : (
        <p className="insights-empty" style={{ color: colors.muted }}>
          Sem despesas nesta competência.
        </p>
      )}
    </section>
  );
}

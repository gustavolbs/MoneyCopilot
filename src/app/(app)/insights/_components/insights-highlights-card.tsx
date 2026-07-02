import { DataTooltip } from "@/components/InsightTooltip";
import { Label } from "@/components/ui";
import { formatCurrency } from "@/domain/normalize";
import type { Transaction } from "@/domain/types";
import { useTheme } from "@/lib/theme";

type InsightsHighlightsCardProps = {
  largestExpense: Transaction | undefined;
  projectedClose: number;
  transferCount: number;
};

export function InsightsHighlightsCard({
  largestExpense,
  projectedClose,
  transferCount,
}: InsightsHighlightsCardProps) {
  const { colors } = useTheme();

  return (
    <section className="insights-highlights-card">
      <div className="insights-section-head">
        <div>
          <Label>Destaques</Label>
          <strong>Resumo rápido</strong>
        </div>
      </div>

      <div className="insights-highlights">
        <Highlight
          color={projectedClose >= 0 ? colors.green : colors.red}
          id="projected-close"
          label="Sobra prevista"
          tooltip="Receitas menos despesas e compromissos recorrentes previstos para o mês."
          value={formatCurrency(projectedClose)}
        />
        <Highlight
          color={colors.red}
          detail={largestExpense?.description}
          id="largest-expense"
          label="Maior despesa"
          tooltip={
            largestExpense
              ? `${largestExpense.description}: ${formatCurrency(largestExpense.amount)}`
              : "Nenhuma despesa registrada nesta competência."
          }
          value={largestExpense ? formatCurrency(largestExpense.amount) : "-"}
        />
        <Highlight
          color={colors.blue}
          detail="movimentos internos"
          id="transfers"
          label="Transferências"
          tooltip={`${transferCount} transferência(s) interna(s) registrada(s) nesta competência.`}
          value={String(transferCount)}
        />
      </div>
    </section>
  );
}

function Highlight({
  color,
  detail,
  id,
  label,
  tooltip,
  value,
}: {
  color: string;
  detail?: string;
  id: string;
  label: string;
  tooltip: string;
  value: string;
}) {
  return (
    <DataTooltip body={tooltip} detail={value} title={label}>
      <div className="insight-highlight" data-highlight-id={id}>
        <i style={{ backgroundColor: color }} />
        <div>
          <span>{label}</span>
          {detail ? <small>{detail}</small> : null}
        </div>
        <strong style={{ color }}>{value}</strong>
      </div>
    </DataTooltip>
  );
}

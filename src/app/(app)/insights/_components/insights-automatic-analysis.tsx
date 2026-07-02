import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Info,
  Lightbulb,
} from "lucide-react";

import { InsightTooltip } from "@/components/InsightTooltip";
import { Label } from "@/components/ui";
import type { Insight } from "@/domain/insights";
import { useTheme } from "@/lib/theme";

type InsightsAutomaticAnalysisProps = {
  insights: Insight[];
};

const toneIcon = {
  good: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
};

export function InsightsAutomaticAnalysis({
  insights,
}: InsightsAutomaticAnalysisProps) {
  const { colors } = useTheme();

  return (
    <section className="insights-analysis-section" aria-label="Análise automática">
      <div className="insights-section-head insights-analysis-head">
        <div>
          <Label>Tendências</Label>
          <strong>Análise automática</strong>
        </div>
        <span className="insights-analysis-count">
          <Lightbulb size={14} aria-hidden="true" />
          {insights.length} insights
        </span>
      </div>

      {insights.length ? (
        <div className="insights-analysis-grid">
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      ) : (
        <p className="insights-empty" style={{ color: colors.muted }}>
          Registre mais transações para visualizar tendências.
        </p>
      )}
    </section>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const { colors } = useTheme();
  const Icon = toneIcon[insight.tone];
  const inverse =
    insight.id.startsWith("expense") ||
    insight.id.startsWith("growth") ||
    insight.id.startsWith("budget");

  return (
    <InsightTooltip insight={insight}>
      <article className={`insights-analysis-card ${insight.tone}`}>
        <div className="insight-visual-icon">
          <Icon size={16} />
        </div>
        {insight.percentage !== undefined ? (
          <PercentageValue inverse={inverse} value={insight.percentage} />
        ) : null}
        <strong className="insight-visual-title">{insight.title}</strong>
        <small style={{ color: colors.muted }}>
          {insight.comparison ?? insight.body}
        </small>
      </article>
    </InsightTooltip>
  );
}

function PercentageValue({
  inverse = false,
  value,
}: {
  inverse?: boolean;
  value: number | null;
}) {
  const { colors } = useTheme();
  if (value === null) {
    return (
      <span
        className="percentage-value"
        style={{ backgroundColor: colors.subtle, color: colors.muted }}
      >
        Sem base
      </span>
    );
  }

  const favorable = inverse ? value <= 0 : value >= 0;
  const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className="percentage-value"
      style={{
        backgroundColor: favorable ? `${colors.green}18` : `${colors.red}18`,
        color: favorable ? colors.green : colors.red,
      }}
    >
      <Icon size={13} />
      {value > 0 ? "+" : ""}
      {Math.round(value)}%
    </span>
  );
}

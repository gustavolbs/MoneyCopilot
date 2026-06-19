"use client";

import {
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  WalletCards,
} from "lucide-react";

import { InsightTooltip } from "@/components/InsightTooltip";
import type { Insight } from "@/domain/insights";
import { cn } from "@/lib/utils";

interface InsightsProps {
  insights: Insight[];
  limit?: number;
  className?: string;
}

const toneMap = {
  good: { Icon: CheckCircle, color: "var(--mc-green)" },
  warning: { Icon: AlertTriangle, color: "var(--mc-gold)" },
  info: { Icon: Lightbulb, color: "var(--mc-blue)" },
} as const;

export function Insights({ insights, limit = 4, className }: InsightsProps) {
  const items = insights.slice(0, limit);

  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--mc-line)] bg-[var(--mc-surface)] p-4 sm:p-5",
        className,
      )}
    >
      <div className="mobile-section-header mb-4 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--mc-ink)]">Insights</h3>
        <span className="text-xs text-[var(--mc-muted)]">
          Análise automática
        </span>
      </div>

      <div className="mobile-insight-list flex flex-col gap-2">
        {items.map((insight) => {
          const { Icon, color } = toneMap[insight.tone];
          return (
            <InsightTooltip key={insight.id} insight={insight}>
              <div
                className="mobile-insight-item flex items-start gap-3 rounded-lg border border-[var(--mc-line)] bg-[var(--mc-subtle)] p-3 transition-colors hover:border-[var(--mc-muted)]"
                style={{ "--insight-tone": color } as React.CSSProperties}
              >
                <div
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
                  }}
                >
                  <Icon size={13} style={{ color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--mc-ink)]">
                    {insight.title}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--mc-muted)]">
                    {insight.body}
                  </p>
                </div>
              </div>
            </InsightTooltip>
          );
        })}

        {!items.length ? (
          <div
            className="mobile-insight-item flex items-start gap-3 rounded-lg border border-[var(--mc-line)] bg-[var(--mc-subtle)] p-3"
            style={
              { "--insight-tone": "var(--mc-blue)" } as React.CSSProperties
            }
          >
            <div
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--mc-blue) 14%, transparent)",
              }}
            >
              <WalletCards size={13} style={{ color: "var(--mc-blue)" }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--mc-ink)]">
                Resumo da competência
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--mc-muted)]">
                Registre mais transações para receber comparações e alertas
                personalizados.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

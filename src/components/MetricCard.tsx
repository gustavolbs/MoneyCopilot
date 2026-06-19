import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface MetricCardProps {
  label: string;
  sublabel?: string;
  value: string;
  /** Optional override for the value color. Defaults to the ink token. */
  valueColor?: string;
  /** Accent color used for the top border and the icon chip. */
  accentColor: string;
  icon?: ReactNode;
  /** Optional footer content rendered below the value (trend, hint, etc.). */
  footer?: ReactNode;
  className?: string;
}

/**
 * Shared metric card matching the Dashboard's mobile metric card.
 * Reused by the Dashboard KPIs and the Transactions summary so both
 * screens share the exact same palette, spacing and elevation.
 */
export function MetricCard({
  label,
  sublabel,
  value,
  valueColor,
  accentColor,
  icon,
  footer,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "mobile-metric-card relative flex flex-col justify-between overflow-hidden rounded-xl border border-[var(--mc-line)] bg-[var(--mc-surface)] p-4 sm:p-5",
        className,
      )}
      style={{ borderTopColor: accentColor, borderTopWidth: 2 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--mc-muted)]">
            {label}
          </p>
          {sublabel ? (
            <p className="mt-0.5 truncate text-[10px] text-[var(--mc-muted)]">
              {sublabel}
            </p>
          ) : null}
        </div>
        {icon ? (
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${accentColor}18` }}
          >
            <span style={{ color: accentColor }}>{icon}</span>
          </div>
        ) : null}
      </div>
      <div className="mt-3">
        <p
          className="truncate text-xl font-bold tracking-tight sm:text-2xl"
          style={{ color: valueColor ?? "var(--mc-ink)" }}
        >
          {value}
        </p>
        {footer ? <div className="mt-1.5">{footer}</div> : null}
      </div>
    </div>
  );
}

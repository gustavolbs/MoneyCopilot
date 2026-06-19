"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  type TooltipContentProps,
} from "recharts";

import { formatCurrency } from "@/domain/normalize";
import { cn } from "@/lib/utils";

interface FluxoPoint {
  label: string;
  expense: number;
  income: number;
}

interface FluxoChartProps {
  series: FluxoPoint[];
  expense: number;
  income: number;
  className?: string;
}

function CustomTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[var(--mc-line)] bg-[var(--mc-elevated)] p-3 shadow-xl">
      <p className="mb-2 text-xs font-medium text-[var(--mc-muted)]">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-[var(--mc-muted)]">
            {entry.name === "receitas" ? "Receitas" : "Despesas"}:{" "}
            <strong className="text-[var(--mc-ink)]">
              {formatCurrency(Number(entry.value ?? 0))}
            </strong>
          </span>
        </div>
      ))}
    </div>
  );
}

export function FluxoChart({
  series,
  expense,
  income,
  className,
}: FluxoChartProps) {
  const data = series.map((item) => ({
    mes: item.label,
    despesas: item.expense,
    receitas: item.income,
  }));

  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--mc-line)] bg-[var(--mc-surface)] p-4 sm:p-5",
        className,
      )}
    >
      <div className="mobile-chart-header mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--mc-ink)]">
            Fluxo mensal
          </h3>
          <p className="mt-0.5 text-[11px] text-[var(--mc-muted)]">
            Últimos 6 meses
          </p>
        </div>
        <div className="mobile-chart-summary flex gap-4">
          <div>
            <p className="text-[10px] text-[var(--mc-muted)]">Despesas</p>
            <p className="text-sm font-semibold text-[var(--mc-red)]">
              {formatCurrency(expense)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--mc-muted)]">Receitas</p>
            <p className="text-sm font-semibold text-[var(--mc-green)]">
              {formatCurrency(income)}
            </p>
          </div>
        </div>
      </div>

      <div className="mobile-chart-canvas">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart
            data={data}
            margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="gradReceitas" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--mc-green)"
                  stopOpacity={0.25}
                />
                <stop
                  offset="95%"
                  stopColor="var(--mc-green)"
                  stopOpacity={0.02}
                />
              </linearGradient>
              <linearGradient id="gradDespesas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--mc-red)" stopOpacity={0.2} />
                <stop
                  offset="95%"
                  stopColor="var(--mc-red)"
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--mc-line)"
              vertical={false}
            />
            <XAxis
              dataKey="mes"
              tick={{ fill: "var(--mc-muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              content={CustomTooltip}
              cursor={{ stroke: "var(--mc-line)" }}
            />
            <Area
              type="monotone"
              dataKey="despesas"
              stroke="var(--mc-red)"
              strokeWidth={2}
              fill="url(#gradDespesas)"
              dot={false}
              activeDot={{ r: 4, fill: "var(--mc-red)", strokeWidth: 0 }}
            />
            <Area
              type="monotone"
              dataKey="receitas"
              stroke="var(--mc-green)"
              strokeWidth={2}
              fill="url(#gradReceitas)"
              dot={false}
              activeDot={{ r: 4, fill: "var(--mc-green)", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex gap-4">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[var(--mc-red)]" />
          <span className="text-[10px] text-[var(--mc-muted)]">Despesas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[var(--mc-green)]" />
          <span className="text-[10px] text-[var(--mc-muted)]">Receitas</span>
        </div>
      </div>
    </div>
  );
}

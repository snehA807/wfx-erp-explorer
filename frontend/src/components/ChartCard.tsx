import { useMemo } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Skeleton } from "@/components/ui/skeleton";
import { usePrefersReducedMotion } from "@/lib/theme";
import { cn } from "@/lib/utils";

export interface ChartDatum {
  key: string;
  label: string;
  value: number;
}

export interface ChartCardProps {
  title: string;
  type: "hbar" | "donut";
  data: ChartDatum[];
  onSegment?: (key: string) => void;
  /** Tooltip/legend value display — this component never invents its own
   * number formatting (component-library.md §4 keeps formatting caller-side,
   * same as StatCard's preformatted `value`). */
  valueFormatter?: (value: number) => string;
  className?: string;
}

// design-system.md §1: charts get "accent highlight series + neutral grays"
// only — success/warning/danger are reserved for status Badges, never chart
// segments. The single largest segment is the accent highlight; the rest
// cycle through a small neutral-gray palette (tokens only, no raw hex).
const NEUTRAL_FILLS = ["hsl(var(--border-strong))", "hsl(var(--text-2-current) / 0.5)", "hsl(var(--text-2-current) / 0.32)"];
const ACCENT_FILL = "hsl(var(--accent))";

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--surface-current))",
  border: "1px solid hsl(var(--border-current))",
  borderRadius: "var(--radius-sm)",
  fontSize: "13px",
  color: "hsl(var(--text-current))",
};

function fillFor(index: number, highlightIndex: number): string {
  if (index === highlightIndex) return ACCENT_FILL;
  return NEUTRAL_FILLS[index % NEUTRAL_FILLS.length];
}

/**
 * ChartCard (component-library.md §4). Wraps Recharts with token colors,
 * 300ms initial draw only (no re-animation — data is fetched once). Segment
 * click calls `onSegment(key)`; Overview wires the revenue-by-category chart
 * to a `/products?category=` deep-link (order-status has no matching
 * Products filter, so it renders without `onSegment`).
 */
export function ChartCard({ title, type, data, onSegment, valueFormatter, className }: ChartCardProps) {
  const reducedMotion = usePrefersReducedMotion();
  const format = valueFormatter ?? String;

  const chartData = useMemo(() => {
    if (type !== "hbar") return data;
    return [...data].sort((a, b) => b.value - a.value);
  }, [data, type]);

  const highlightIndex = useMemo(() => {
    if (chartData.length === 0) return -1;
    let best = 0;
    for (let i = 1; i < chartData.length; i += 1) {
      if (chartData[i].value > chartData[best].value) best = i;
    }
    return best;
  }, [chartData]);

  return (
    <div className={cn("rounded-lg border border-border bg-surface p-5", className)}>
      <h3 className="text-role-title text-text">{title}</h3>
      <div className="mt-4" style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          {type === "hbar" ? (
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="label"
                width={110}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--text-2-current))", fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--border-current) / 0.3)" }}
                contentStyle={TOOLTIP_STYLE}
                formatter={(value: number) => format(value)}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={!reducedMotion} animationDuration={300}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={entry.key}
                    fill={fillFor(index, highlightIndex)}
                    cursor={onSegment ? "pointer" : undefined}
                    onClick={() => onSegment?.(entry.key)}
                  />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <PieChart>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => format(value)} />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="label"
                innerRadius={56}
                outerRadius={88}
                paddingAngle={2}
                isAnimationActive={!reducedMotion}
                animationDuration={300}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={entry.key}
                    fill={fillFor(index, highlightIndex)}
                    cursor={onSegment ? "pointer" : undefined}
                    onClick={() => onSegment?.(entry.key)}
                  />
                ))}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
      {type === "donut" ? (
        <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
          {chartData.map((entry, index) => (
            <li key={entry.key} className="flex items-center gap-2 text-role-small text-text-2">
              <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: fillFor(index, highlightIndex) }} />
              <span className="truncate">{entry.label}</span>
              <span className="ml-auto text-role-small tabular-nums text-text">{format(entry.value)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function ChartCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-4 w-full" style={{ height: 240 }} />
    </div>
  );
}

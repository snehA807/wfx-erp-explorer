import { cn } from "@/lib/utils";

export type StatusDotStatus = "live" | "degraded" | "down";

export interface StatusDotProps {
  status: StatusDotStatus;
  className?: string;
}

const STATUS_CONFIG: Record<StatusDotStatus, { label: string; colorClass: string; pulse: boolean }> = {
  live: { label: "Live", colorClass: "bg-success", pulse: true },
  degraded: { label: "Degraded", colorClass: "bg-warning", pulse: false },
  down: { label: "Offline", colorClass: "bg-text-2", pulse: false },
};

/**
 * StatusDot (component-library.md §2), fed by /health (navigation.md §4).
 * The dot is decorative (aria-hidden) — the text label is what carries
 * state, never color alone (design principle #6, m12b-contract.md §10).
 */
export function StatusDot({ status, className }: StatusDotProps) {
  const { label, colorClass, pulse } = STATUS_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", colorClass, pulse && "dot-pulse")} />
      <span className="text-role-small text-text-2">{label}</span>
    </span>
  );
}

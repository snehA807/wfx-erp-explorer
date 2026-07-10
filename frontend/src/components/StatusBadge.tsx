import { Badge, type BadgeProps } from "@/components/ui/badge";

export type StatusBadgeKind = "order" | "payment";

export interface StatusBadgeProps {
  kind: StatusBadgeKind;
  /** Backend status string (db/schema.sql CHECK-constrained values). */
  value: string;
  className?: string;
}

// Real backend vocabulary (db/schema.sql: sales_orders.status,
// sales_invoices.payment_status) — same mapping prototyped on /dev-tokens'
// BadgeMatrix (D-F27); this component is the one place it's actually owned.
const ORDER_STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  Confirmed: "secondary",
  "In Production": "warning",
  Shipped: "warning",
  Delivered: "success",
  Cancelled: "danger",
};

const PAYMENT_STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  Paid: "success",
  Pending: "secondary",
  "Partially Paid": "warning",
  Overdue: "danger",
};

/**
 * Status Badge (component-library.md §4). Maps a backend status string to a
 * tint + always-visible text (never color alone — design principle #6).
 * Unrecognized values fall back to the neutral `secondary` variant rather
 * than throwing, since the value is free text from the DB, only shape-
 * constrained by a CHECK, not validated client-side.
 */
export function StatusBadge({ kind, value, className }: StatusBadgeProps) {
  const variant = (kind === "order" ? ORDER_STATUS_VARIANT : PAYMENT_STATUS_VARIANT)[value] ?? "secondary";
  return (
    <Badge variant={variant} className={className}>
      {value}
    </Badge>
  );
}

import { Badge, type BadgeProps } from "@/components/ui/badge";

// Real backend vocabulary (db/schema.sql: sales_orders.status,
// sales_invoices.payment_status). Tint choice here is a dev-tokens
// demonstration of the variants added to components/ui/badge.tsx in this
// milestone — the actual kind/value -> tint mapping is owned by the custom
// status Badge component (component-library.md §4), which ships in M12d.
const ORDER_STATUS: { value: string; variant: BadgeProps["variant"] }[] = [
  { value: "Confirmed", variant: "secondary" },
  { value: "In Production", variant: "warning" },
  { value: "Shipped", variant: "warning" },
  { value: "Delivered", variant: "success" },
  { value: "Cancelled", variant: "danger" },
];

const PAYMENT_STATUS: { value: string; variant: BadgeProps["variant"] }[] = [
  { value: "Paid", variant: "success" },
  { value: "Pending", variant: "secondary" },
  { value: "Partially Paid", variant: "warning" },
  { value: "Overdue", variant: "danger" },
];

export function BadgeMatrix() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="text-role-title mb-4">Order status (5)</h3>
        <div className="flex flex-wrap gap-3">
          {ORDER_STATUS.map((s) => (
            <Badge key={s.value} variant={s.variant}>
              {s.value}
            </Badge>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-role-title mb-4">Payment status (4)</h3>
        <div className="flex flex-wrap gap-3">
          {PAYMENT_STATUS.map((s) => (
            <Badge key={s.value} variant={s.variant}>
              {s.value}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

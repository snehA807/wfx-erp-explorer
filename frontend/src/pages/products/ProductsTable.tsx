import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProductSummary } from "@/lib/api";
import { PAGE_SIZE } from "@/pages/products/useProducts";

export interface ProductsTableProps {
  items: ProductSummary[];
  onOpen: (styleNumber: string) => void;
}

// Deliberately not a reuse of components/ResultTable.tsx: that component is
// schema-agnostic for arbitrary SQL/API row data (component-library.md's own
// usage matrix marks Products as a non-consumer of ResultTable, unlike
// Overview/AICard). This is the dense professional-table presentation
// design-spec.md §4 names for the Products grid/table toggle — page-local
// until a second consumer needs it (Pagination.tsx's promotion-rule note).
export function ProductsTable({ items, onOpen }: ProductsTableProps) {
  return (
    <div className="rounded-lg border border-border bg-surface">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="h-10 text-role-micro text-text-2">Style</TableHead>
            <TableHead className="h-10 text-role-micro text-text-2">Name</TableHead>
            <TableHead className="h-10 text-role-micro text-text-2">Category</TableHead>
            <TableHead className="h-10 text-role-micro text-text-2">Fabric</TableHead>
            <TableHead className="h-10 text-right text-role-micro text-text-2">GSM</TableHead>
            <TableHead className="h-10 text-role-micro text-text-2">Color</TableHead>
            <TableHead className="h-10 text-role-micro text-text-2">Supplier</TableHead>
            <TableHead className="h-10 text-right text-role-micro text-text-2">Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.style_number}
              className="h-10 cursor-pointer border-border hover:bg-border/40"
              tabIndex={0}
              role="button"
              onClick={() => onOpen(item.style_number)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpen(item.style_number);
                }
              }}
            >
              <TableCell className="text-role-small font-medium text-text">{item.style_number}</TableCell>
              <TableCell className="text-role-small text-text">{item.style_name}</TableCell>
              <TableCell className="text-role-small text-text">{item.category ?? "—"}</TableCell>
              <TableCell className="text-role-small text-text">{item.fabric}</TableCell>
              <TableCell className="text-right text-role-small tabular-nums text-text">{item.gsm}</TableCell>
              <TableCell className="text-role-small text-text">{item.color ?? "—"}</TableCell>
              <TableCell className="text-role-small text-text">{item.supplier_name}</TableCell>
              <TableCell className="text-right text-role-small tabular-nums text-text">
                ₹{item.selling_price.toLocaleString("en-IN")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function ProductsTableSkeleton() {
  const columns = 8;
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex gap-4 border-b border-border pb-2">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: Math.min(PAGE_SIZE, 10) }).map((_, r) => (
        <div key={r} className="flex gap-4 py-3">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

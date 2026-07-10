import type { ReactNode } from "react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface ResultTableProps {
  columns: string[];
  rows: unknown[][];
  /** "inset" for AICard's dark-surface result section; "light" everywhere
   * else (design-system.md §8, §11). */
  variant?: "light" | "inset";
  maxRows?: number;
  /** Override rendering for a specific column's cells (e.g. a StatusBadge). */
  cellRenderer?: (column: string, value: unknown, rowIndex: number) => ReactNode;
  className?: string;
}

/**
 * ResultTable (component-library.md §4): schema-agnostic table for arbitrary
 * SQL/API results. Numeric-detected columns right-align with tabular-nums
 * (design-system.md §8). Truncation footer only appears when rows are
 * actually cut — Overview's recent-orders call always passes exactly
 * `maxRows` rows (the backend already caps at 10), so no footer renders
 * there.
 */
export function ResultTable({ columns, rows, variant = "light", maxRows = 10, cellRenderer, className }: ResultTableProps) {
  const visibleRows = rows.slice(0, maxRows);
  const isInset = variant === "inset";

  return (
    <div className={cn(isInset && "inset", "rounded-lg border border-border bg-surface", className)}>
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            {columns.map((column, index) => (
              <TableHead
                key={column}
                className={cn("h-10 text-role-micro text-text-2", isNumericColumn(rows, index) && "text-right")}
              >
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleRows.map((row, rowIndex) => (
            <TableRow key={rowIndex} className="h-10 border-border hover:bg-border/40">
              {columns.map((column, colIndex) => {
                const value = row[colIndex];
                return (
                  <TableCell
                    key={column}
                    className={cn(
                      "text-role-small text-text",
                      colIndex === 0 && "font-medium",
                      typeof value === "number" && "text-right tabular-nums",
                    )}
                  >
                    {cellRenderer ? cellRenderer(column, value, rowIndex) : formatCell(value)}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {rows.length > maxRows ? (
        <p className="border-t border-border px-4 py-2 text-role-small text-text-2">
          Showing {maxRows} of {rows.length}
        </p>
      ) : null}
    </div>
  );
}

function isNumericColumn(rows: unknown[][], colIndex: number): boolean {
  return rows.length > 0 && rows.every((row) => row[colIndex] === null || typeof row[colIndex] === "number");
}

function formatCell(value: unknown): ReactNode {
  if (value === null || value === undefined) return <span className="text-text-2">—</span>;
  if (typeof value === "number") return value.toLocaleString("en-IN");
  return String(value);
}

export function ResultTableSkeleton({ columns = 5, rows = 6 }: { columns?: number; rows?: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex gap-4 border-b border-border pb-2">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-3">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

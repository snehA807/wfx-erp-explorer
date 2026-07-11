import { ChevronRight, Copy } from "lucide-react";
import { Fragment, useState } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface SQLBlockProps {
  sql: string;
  /** Open by default on a turn's first render (design-system.md §11: "open
   * by default on first turn, collapsed after"). */
  defaultOpen?: boolean;
  /** This is the section currently active/settling in the pipeline (SQL
   * shown, rows not yet arrived) — a subtle pulse, not real per-character
   * streaming (the `sql` SSE event delivers the full statement in one
   * shot, not token deltas). */
  streaming?: boolean;
  className?: string;
}

// Minimal syntax tint (design-system.md §11: "subtle syntax tint") without
// a new hue: accent/lime is reserved for its six sanctioned marker uses
// (D-F04) and SQL keywords aren't one of them. Contrast comes from weight +
// brightness within the existing inset-text/inset-text-2 pair instead.
const SQL_KEYWORDS = [
  "SELECT", "FROM", "WHERE", "JOIN", "LEFT", "RIGHT", "INNER", "OUTER", "ON",
  "GROUP BY", "ORDER BY", "HAVING", "LIMIT", "WITH", "UNION", "DISTINCT",
  "AND", "OR", "NOT", "AS", "IN", "IS", "NULL", "LIKE", "ILIKE", "BETWEEN",
  "ASC", "DESC", "SUM", "COUNT", "AVG", "ROUND", "CASE", "WHEN", "THEN", "END",
];
const KEYWORD_PATTERN = new RegExp(`\\b(${SQL_KEYWORDS.join("|")})\\b`, "gi");
const KEYWORD_SET = new Set(SQL_KEYWORDS.map((k) => k.toLowerCase()));

function highlight(sql: string) {
  return sql.split(KEYWORD_PATTERN).map((part, index) => (
    <Fragment key={index}>
      {KEYWORD_SET.has(part.toLowerCase()) ? (
        <span className="font-semibold text-inset-text">{part}</span>
      ) : (
        <span className="text-inset-text-2">{part}</span>
      )}
    </Fragment>
  ));
}

/**
 * SQLBlock (component-library.md §5). Mono on inset-surface, minimal
 * keyword tinting, copy button with a "Copied" toast. Single use today
 * (AICard) — lives in pages/ask/ per the promotion rule (component-library.md
 * header: promoted to components/ on a second usage site).
 */
export function SQLBlock({ sql, defaultOpen = false, streaming, className }: SQLBlockProps) {
  const [open, setOpen] = useState(defaultOpen);
  const { toast } = useToast();

  function handleCopy() {
    navigator.clipboard.writeText(sql).then(() => toast({ description: "Copied" }));
  }

  return (
    <div className={cn("min-w-0 overflow-hidden rounded-md border border-inset-border bg-inset", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-inset-border px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center gap-1.5 text-role-micro text-inset-text-2 hover:text-inset-text"
        >
          <ChevronRight
            aria-hidden="true"
            size={14}
            className={cn("transition-transform duration-fast ease-out-app", open && "rotate-90")}
          />
          <span className={cn(streaming && "animate-pulse")}>SQL</span>
        </button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 gap-1.5 px-2 text-inset-text-2 hover:bg-inset-border hover:text-inset-text"
        >
          <Copy aria-hidden="true" size={14} />
          Copy
        </Button>
      </div>
      {open ? (
        <pre className="overflow-x-auto px-3 py-3 text-role-mono-ui leading-relaxed">
          <code>{highlight(sql)}</code>
        </pre>
      ) : null}
    </div>
  );
}

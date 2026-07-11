import type { ReactNode } from "react";
import { useMemo } from "react";

import { ResultTable } from "@/components/ResultTable";
import { SeamProgress } from "@/components/SeamProgress";
import { Button } from "@/components/ui/button";
import type { QueryDoneMeta } from "@/lib/sse";

import type { Turn } from "./reducer";
import { SQLBlock } from "./SQLBlock";

export interface AICardProps {
  turn: Turn;
  /** True only for the thread's first turn (design-system.md §11: "open by
   * default on first turn, collapsed after"). */
  defaultSqlOpen: boolean;
  onRetry: () => void;
}

/**
 * AICard (component-library.md §5) — the flagship. SeamProgress (top,
 * state from turn.phase) -> SQL -> RESULT -> ANSWER, in pipeline order,
 * each preceded by a `micro` label (design-system.md §11). Error rendering
 * branches on `error.code` (D-F10), never message strings.
 */
export function AICard({ turn, defaultSqlOpen, onRetry }: AICardProps) {
  const hasSql = turn.sql !== undefined;
  const showResult = (turn.rowCount ?? 0) > 0;
  const seamState = turn.error ? "error" : turn.phase === "done" ? "complete" : "stitching";
  // component-library.md's AICard spec names LLM_UNAVAILABLE; the real
  // deployed backend's code is LLM_ERROR (core/errors.py) — same
  // doc/backend mismatch pattern as D-F20, both branded "danger" here.
  const errorKind = turn.error?.code === "SQL_BLOCKED" ? "warning" : "danger";

  const tableRows = useMemo(() => {
    if (!turn.rows || !turn.columns) return [];
    const columns = turn.columns;
    return turn.rows.map((row) => columns.map((column) => row[column]));
  }, [turn.rows, turn.columns]);

  return (
    <div className="inset overflow-hidden rounded-lg" data-surface="machine">
      <SeamProgress state={seamState} stageIndex={turn.stageIndex} errorKind={errorKind} />
      <div className="flex flex-col gap-5 bg-inset-surface p-5">
        {turn.error?.code === "SQL_BLOCKED" ? (
          <BlockedNotice sql={turn.error.sql} />
        ) : (
          <>
            {!hasSql && !turn.error ? <p className="text-role-body text-inset-text-2">{turn.statusMessage}</p> : null}

            {hasSql ? (
              <SQLBlock sql={turn.sql!} defaultOpen={defaultSqlOpen} streaming={turn.rows === undefined} />
            ) : null}

            {showResult ? (
              <Section label="Result">
                <ResultTable columns={turn.columns!} rows={tableRows} variant="inset" maxRows={10} />
              </Section>
            ) : null}

            {hasSql ? <AnswerSection turn={turn} /> : null}

            {turn.error ? <ErrorNotice message={turn.error.message} onRetry={onRetry} /> : null}

            {turn.phase === "done" && turn.meta ? <Footer meta={turn.meta} /> : null}
          </>
        )}
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-role-micro text-inset-text-2">{label}</p>
      {children}
    </div>
  );
}

function AnswerSection({ turn }: { turn: Turn }) {
  const showCaret = turn.phase !== "done" && !turn.error;
  const text = turn.answerText || (turn.error ? "" : turn.statusMessage);
  return (
    <Section label="Answer">
      {/* architecture.md §6 / design-system.md §11: the answer region is
          aria-live="polite" — the only live region in this card. */}
      <p aria-live="polite" className="text-role-body text-inset-text">
        {text}
        {showCaret ? (
          <span
            aria-hidden="true"
            className="caret-blink ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 bg-inset-text-2 align-middle"
          />
        ) : null}
      </p>
    </Section>
  );
}

function BlockedNotice({ sql }: { sql?: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-warning/30 bg-warning-soft p-4">
      <p className="text-role-body font-medium text-warning">
        This tool is read-only — I can show you the data instead.
      </p>
      <p className="text-role-small text-warning">
        Try asking to "show" or "list" the records instead — for example, "show me all cancelled orders" rather
        than "delete all cancelled orders."
      </p>
      {sql ? <SQLBlock sql={sql} defaultOpen /> : null}
    </div>
  );
}

function ErrorNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger/30 bg-danger-soft p-4">
      <p className="text-role-body text-danger">{message}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRetry}
        className="border-danger/40 text-danger hover:bg-danger/10"
      >
        Retry
      </Button>
    </div>
  );
}

function Footer({ meta }: { meta: QueryDoneMeta }) {
  // D-F20: the real `done` payload splits usage per LLM call
  // (sql_* / answer_*), not the documented flat {model, tokens, cost} trio
  // — summed/joined here into the "model · tokens · cost" footer copy
  // design-system.md §11 still specifies.
  const totalTokens =
    (meta.sql_prompt_tokens ?? 0) +
    (meta.sql_completion_tokens ?? 0) +
    (meta.answer_prompt_tokens ?? 0) +
    (meta.answer_completion_tokens ?? 0);
  const totalCost = meta.total_cost_usd ?? 0;
  const models = [meta.sql_model, meta.answer_model].filter(Boolean).join(" → ");

  return (
    <p className="border-t border-inset-border pt-3 text-role-mono-ui text-inset-text-2">
      {models || "model unavailable"} · {totalTokens.toLocaleString("en-IN")} tokens · ${totalCost.toFixed(4)}
    </p>
  );
}

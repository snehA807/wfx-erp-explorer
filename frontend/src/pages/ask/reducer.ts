import type { QueryDoneMeta } from "@/lib/sse";

/**
 * Ask thread reducer (architecture.md §5: "page-local reducer — turns,
 * streaming stage, partial answer... survives within session only; no
 * persistence by design — not a chatbot").
 *
 * `phase` mirrors the real backend pipeline stage names verbatim
 * (backend/app/services/query_pipeline.py's `status` events: generating_sql
 * -> running_query -> writing_answer -> done, or -> error) rather than the
 * looser "sql"|"rows"|"answer"|"done"|"error" enum component-library.md's
 * AICard sketches — component-library.md's own header calls exact TS shapes
 * "the implementer's mechanical translation." `stageIndex` (0-4) is the
 * SeamProgress anchor (motion.md §4: "progress anchor = stage index / 4 of
 * width"); it only ever advances, holding at its current value on error
 * (motion.md §4: "draw halts at current anchor").
 */
export type TurnPhase = "generating_sql" | "running_query" | "writing_answer" | "done" | "error";

export interface TurnError {
  code: string;
  message: string;
  /** SQL_BLOCKED's blocked statement (from the error event's
   * `details.sql` — guardrails reject it inside generate_sql() before the
   * `sql` SSE event is ever emitted, so `turn.sql` itself stays undefined
   * on this path; docs/decisions.md M8 "guardrail-block error responses...
   * carry the blocked SQL in details"). */
  sql?: string;
}

export interface Turn {
  id: string;
  question: string;
  phase: TurnPhase;
  /** Narration line text from the latest `status` event's `message` field
   * (motion.md §5: "the AI card has no skeleton — its loading IS the
   * SeamProgress + status line narration"). */
  statusMessage: string;
  stageIndex: number;
  sql?: string;
  columns?: string[];
  rows?: Record<string, unknown>[];
  rowCount?: number;
  answerText: string;
  error?: TurnError;
  meta?: QueryDoneMeta;
}

export type ThreadAction =
  | { type: "START"; id: string; question: string }
  | { type: "STATUS"; id: string; stage: string; message: string }
  | { type: "SQL"; id: string; sql: string }
  | { type: "ROWS"; id: string; columns: string[]; rows: Record<string, unknown>[]; rowCount: number }
  | { type: "ANSWER_DELTA"; id: string; delta: string }
  | { type: "DONE"; id: string; meta: QueryDoneMeta }
  | { type: "ERROR"; id: string; code: string; message: string; sql?: string }
  | { type: "RESET_FOR_RETRY"; id: string };

function createTurn(id: string, question: string): Turn {
  return {
    id,
    question,
    phase: "generating_sql",
    statusMessage: "Generating SQL…",
    stageIndex: 0,
    answerText: "",
  };
}

// Boundary reached -> anchor position (motion.md §4's four pipeline
// segments: status->sql->rows->answer). "running_query"/"writing_answer"
// are also set directly by the SQL/ROWS event handlers below (whichever
// arrives first for a given boundary — the SSE order guarantees sql before
// running_query and rows before writing_answer, but both paths agree on the
// same anchor value either way).
const PHASE_STAGE_INDEX: Partial<Record<TurnPhase, number>> = {
  generating_sql: 0,
  running_query: 1,
  writing_answer: 3,
};

export const initialThreadState: Turn[] = [];

export function threadReducer(turns: Turn[], action: ThreadAction): Turn[] {
  if (action.type === "START") {
    return [...turns, createTurn(action.id, action.question)];
  }
  if (action.type === "RESET_FOR_RETRY") {
    return turns.map((turn) => (turn.id === action.id ? createTurn(turn.id, turn.question) : turn));
  }
  return turns.map((turn) => (turn.id === action.id ? applyEvent(turn, action) : turn));
}

function applyEvent(
  turn: Turn,
  action: Exclude<ThreadAction, { type: "START" } | { type: "RESET_FOR_RETRY" }>,
): Turn {
  switch (action.type) {
    case "STATUS": {
      const knownPhase = action.stage in PHASE_STAGE_INDEX ? (action.stage as TurnPhase) : turn.phase;
      const anchor = PHASE_STAGE_INDEX[action.stage as TurnPhase];
      return {
        ...turn,
        phase: knownPhase,
        statusMessage: action.message,
        stageIndex: anchor !== undefined ? Math.max(turn.stageIndex, anchor) : turn.stageIndex,
      };
    }
    case "SQL":
      return { ...turn, sql: action.sql, stageIndex: Math.max(turn.stageIndex, 1) };
    case "ROWS":
      return {
        ...turn,
        columns: action.columns,
        rows: action.rows,
        rowCount: action.rowCount,
        stageIndex: Math.max(turn.stageIndex, 2),
      };
    case "ANSWER_DELTA":
      return { ...turn, answerText: turn.answerText + action.delta, stageIndex: Math.max(turn.stageIndex, 3) };
    case "DONE":
      return { ...turn, phase: "done", meta: action.meta, stageIndex: 4 };
    case "ERROR":
      return { ...turn, phase: "error", error: { code: action.code, message: action.message, sql: action.sql } };
    default:
      return turn;
  }
}

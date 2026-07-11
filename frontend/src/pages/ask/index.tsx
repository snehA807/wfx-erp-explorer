import { useEffect, useReducer, useRef, useState } from "react";

import { streamQuery } from "@/lib/sse";
import { usePrefersReducedMotion } from "@/lib/theme";
import { addRecent } from "@/lib/recents";
import { cn } from "@/lib/utils";

import { AICard } from "./AICard";
import { AskComposer } from "./AskComposer";
import { AskHero } from "./AskHero";
import { SUGGESTION_CHIPS } from "./chips";
import { initialThreadState, threadReducer } from "./reducer";
import { UserTurn } from "./UserTurn";

function extractBlockedSql(details: unknown): string | undefined {
  if (typeof details === "object" && details !== null && "sql" in details) {
    const sql = (details as { sql?: unknown }).sql;
    if (typeof sql === "string") return sql;
  }
  return undefined;
}

type HeroPhase = "hero" | "collapsing" | "thread";

/**
 * Ask (component-library.md §5, implementation-plan.md M12g). The home
 * screen: AskHero -> collapse -> thread of UserTurn/AICard pairs -> docked
 * AskComposer. Owns the thread reducer and the SSE consumption loop that
 * wires `lib/sse.ts`'s existing client to the production `/query` endpoint;
 * everything the page renders derives from that stream, never from a
 * second fetch.
 */
export default function AskPage() {
  useEffect(() => {
    document.title = "Ask · WFX Explorer";
  }, []);

  const [turns, dispatch] = useReducer(threadReducer, initialThreadState);
  const [heroPhase, setHeroPhase] = useState<HeroPhase>("hero");
  const reducedMotion = usePrefersReducedMotion();
  const idCounterRef = useRef(0);
  const abortHandlesRef = useRef(new Map<string, () => void>());

  useEffect(() => {
    const abortHandles = abortHandlesRef.current;
    return () => {
      for (const abort of abortHandles.values()) abort();
    };
  }, []);

  function runTurn(id: string, question: string) {
    const stream = streamQuery(question);
    abortHandlesRef.current.set(id, stream.abort);
    let sawTerminalEvent = false;

    (async () => {
      try {
        for await (const event of stream.events) {
          switch (event.event) {
            case "status":
              dispatch({ type: "STATUS", id, stage: event.data.stage, message: event.data.message });
              break;
            case "sql":
              dispatch({ type: "SQL", id, sql: event.data.sql });
              break;
            case "rows":
              dispatch({
                type: "ROWS",
                id,
                columns: event.data.columns,
                rows: event.data.rows,
                rowCount: event.data.row_count,
              });
              break;
            case "answer":
              dispatch({ type: "ANSWER_DELTA", id, delta: event.data.delta });
              break;
            case "done":
              sawTerminalEvent = true;
              dispatch({ type: "DONE", id, meta: event.data.meta });
              break;
            case "error":
              sawTerminalEvent = true;
              dispatch({
                type: "ERROR",
                id,
                code: event.data.code,
                message: event.data.message,
                sql: extractBlockedSql(event.data.details),
              });
              break;
          }
        }
        // J2 (kill backend mid-stream): the connection can drop without
        // ever delivering a done/error event. Treat a stream that ends
        // without a terminal event as a network failure rather than
        // silently leaving the turn stuck mid-pipeline forever.
        if (!sawTerminalEvent) {
          dispatch({
            type: "ERROR",
            id,
            code: "NETWORK_ERROR",
            message: "The connection to the server was lost before the answer finished.",
          });
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        dispatch({
          type: "ERROR",
          id,
          code: "NETWORK_ERROR",
          message: "Could not reach the server. Check your connection and try again.",
        });
      } finally {
        abortHandlesRef.current.delete(id);
      }
    })();
  }

  function submitQuestion(question: string) {
    const id = `turn-${++idCounterRef.current}`;
    dispatch({ type: "START", id, question });
    addRecent({ type: "ask", text: question });
    if (heroPhase === "hero") {
      setHeroPhase("collapsing");
      // motion.md §3's signature "hero collapse" is specced at 250ms, one
      // tick off the nearest real duration token (--dur-slow, 200ms) — no
      // token exists at exactly 250ms, and this is explicitly the lowest-
      // priority item in implementation-plan.md's cut order, so the
      // existing token is reused rather than minting a new one for it.
      window.setTimeout(() => setHeroPhase("thread"), reducedMotion ? 0 : 200);
    }
    runTurn(id, question);
  }

  function retryTurn(id: string, question: string) {
    dispatch({ type: "RESET_FOR_RETRY", id });
    runTurn(id, question);
  }

  const isStreaming = turns.some((turn) => turn.phase !== "done" && !turn.error);

  if (heroPhase !== "thread") {
    return (
      <div
        className={cn(
          "transition-all duration-slow ease-out-app",
          heroPhase === "collapsing" && !reducedMotion && "-translate-y-4 opacity-0",
        )}
      >
        <AskHero onSubmit={submitQuestion} chips={SUGGESTION_CHIPS} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-thread flex-col gap-6 pb-4">
      {turns.map((turn, index) => (
        <div key={turn.id} className="flex flex-col gap-3">
          <UserTurn text={turn.question} />
          <AICard turn={turn} defaultSqlOpen={index === 0} onRetry={() => retryTurn(turn.id, turn.question)} />
        </div>
      ))}
      <AskComposer onSubmit={submitQuestion} disabled={isStreaming} pinned />
    </div>
  );
}

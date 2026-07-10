import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/lib/theme";

export type SeamProgressState = "idle" | "stitching" | "complete" | "error";

export interface SeamProgressProps {
  state: SeamProgressState;
  /** SSE pipeline stage 0-4 (status/sql/rows/answer/done). Progress anchor =
   * stageIndex / 4 of width (m12b-contract.md §6). Ignored at "idle". */
  stageIndex?: number;
  /** Which color the drawn portion recolors to on state="error" — warning
   * for SQL_BLOCKED, danger for an execution/LLM failure (motion.md §4). */
  errorKind?: "warning" | "danger";
  className?: string;
}

const STAGE_COUNT = 4;

/**
 * SeamProgress — the Running Stitch, kinetic form (design-system.md §12,
 * motion.md §4). The one animated form of the Seam system; never used
 * outside AICard (sanctioned location 4 of the exhaustive four-location
 * budget — the static Seam primitive never animates).
 *
 * States:
 *  - idle: base seam only, no accent.
 *  - stitching: accent dashes march left->right (stroke-dashoffset loop)
 *    across a segment held at stageIndex/4 of width — the loop only ever
 *    animates the already-drawn segment, never implying progress beyond the
 *    current anchor.
 *  - complete: full-width stitch, accent settles to --seam-inset over
 *    --dur-zoom — "the answer has been sewn."
 *  - error: draw halts at the current anchor; the drawn portion recolors to
 *    warning/danger over --dur-base. No shaking, no flash.
 *
 * Lives only on .inset surfaces, so colors are the fixed inset seam/accent
 * tokens directly, not the "-current" auto-resolving family.
 */
export function SeamProgress({ state, stageIndex = 0, errorKind = "danger", className }: SeamProgressProps) {
  const reducedMotion = usePrefersReducedMotion();
  const clampedStage = Math.min(Math.max(stageIndex, 0), STAGE_COUNT);
  const anchorPercent = (clampedStage / STAGE_COUNT) * 100;

  const drawnLength = state === "idle" ? 0 : state === "complete" ? 100 : anchorPercent;

  const progressColorClass =
    state === "error"
      ? errorKind === "warning"
        ? "stroke-warning"
        : "stroke-danger"
      : state === "complete"
        ? "stroke-seam-inset"
        : "stroke-accent";

  // motion.md §4: complete settles over --dur-zoom, error recolors over
  // --dur-base. No transition declared for idle/stitching — nothing to
  // settle, so the color applies instantly by omission.
  const colorTransitionDuration =
    state === "complete" ? "var(--dur-zoom)" : state === "error" ? "var(--dur-base)" : undefined;

  // Reduced motion (motion.md §6): no draw loop — the line jumps straight to
  // the stage anchor / terminal state. The anchor position itself already
  // carries the same information the loop would have animated, so nothing
  // informational is lost.
  const isMarching = state === "stitching" && !reducedMotion;

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={cn("block h-1 w-full overflow-visible", className)}
      viewBox="0 0 100 4"
      preserveAspectRatio="none"
    >
      {/* base seam — always whole, static, crisp at 1px */}
      <line
        x1={0}
        y1={2}
        x2={100}
        y2={2}
        className="stroke-seam-inset"
        shapeRendering="crispEdges"
        vectorEffect="non-scaling-stroke"
        style={{
          strokeWidth: "1px",
          strokeDasharray: "var(--seam-dash) var(--seam-gap)",
          strokeLinecap: "round",
        }}
      />
      {/* progress line — hidden at idle, holds/grows/settles per state */}
      {drawnLength > 0 && (
        <line
          x1={0}
          y1={2}
          x2={drawnLength}
          y2={2}
          className={cn(progressColorClass, isMarching && "stitch-draw")}
          vectorEffect="non-scaling-stroke"
          style={{
            strokeWidth: "2px",
            strokeDasharray: "var(--seam-dash) var(--seam-gap)",
            strokeLinecap: "round",
            ...(colorTransitionDuration
              ? { transition: `stroke ${colorTransitionDuration} var(--ease-out-app)` }
              : {}),
          }}
        />
      )}
    </svg>
  );
}

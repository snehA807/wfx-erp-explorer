import { cn } from "@/lib/utils";

export interface SeamProps {
  /** Explicit color override. Omit to auto-resolve via --seam-current (the
   * ambient .inset scope decides). Use "light"/"inset" only when a Seam must
   * render a fixed color regardless of its ambient scope. */
  variant?: "light" | "inset";
  className?: string;
}

/**
 * The Running Stitch — static divider (design-system.md §12). A dashed line
 * with machine-stitch rhythm: dash 6px, gap 4px, thickness 1px.
 *
 * Four sanctioned locations only — exhaustive, enforced in review:
 *   1. The light<->inset boundary (top edge of every machine surface).
 *   2. Under every editorial page title.
 *   3. Section separators inside DetailPanel.
 *   4. SeamProgress (the animated sibling of this component) on streaming AI
 *      cards.
 * A fifth use is a docs/frontend/decisions.md event, not a vibe.
 *
 * Decorative only — aria-hidden. Implemented as a CSS repeating-gradient
 * (cheap, crisp at 1px); the animated form (SeamProgress) is SVG instead.
 */
export function Seam({ variant, className }: SeamProps) {
  const colorClass =
    variant === "light" ? "text-seam-light" : variant === "inset" ? "text-seam-inset" : "text-seam";

  return (
    <div
      aria-hidden="true"
      className={cn("h-px w-full", colorClass, className)}
      style={{
        backgroundImage:
          "repeating-linear-gradient(to right, currentColor 0, currentColor var(--seam-dash), transparent var(--seam-dash), transparent calc(var(--seam-dash) + var(--seam-gap)))",
      }}
    />
  );
}

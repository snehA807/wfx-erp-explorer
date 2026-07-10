import type { ReactNode } from "react";

/**
 * VisuallyHidden (component-library.md §6): a11y-only label, visually
 * clipped but present for screen readers. First use: DetailPanel's
 * `SheetTitle` — Radix's Dialog primitive (which Sheet wraps) requires a
 * title element for its accessible name; the panel's own visible heading
 * already serves sighted users, so the required Title is present but hidden
 * rather than duplicated on screen.
 */
export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>;
}

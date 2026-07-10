import { useEffect, useState } from "react";

/**
 * Theming is scoped semantics (design-system.md: "light = the human's data,
 * dark = the machine thinking"), not a global mode — there is no
 * ThemeProvider for color (m12b-contract.md §8) and none should ever be
 * added out of habit. If a user-facing dark mode ever arrives, that is a
 * docs/frontend/decisions.md event, not a refactor of this file.
 */

/** The `.inset` class is the entire theming mechanism (tokens.css Region 2):
 * placing it on a root element flips every semantic "-current" token for
 * that subtree. Sanctioned roots (D-F02, exhaustive): the Ask page main
 * region, AICard, SQLBlock, CommandPalette. */
export const INSET_CLASS = "inset";

/** Every machine surface also carries this attribute — grep-ability only,
 * not a styling hook (m12b-contract.md §3). */
export const MACHINE_SURFACE_ATTR = { "data-surface": "machine" } as const;

/** z-index token names (tokens.css Region 1 / design-system.md §13). Use the
 * Tailwind `z-*` utilities that reference these (`z-shell`, `z-panel`,
 * `z-palette`, `z-toast`) rather than importing the raw numbers. */
export const Z_INDEX = {
  shell: "shell",
  panel: "panel",
  palette: "palette",
  toast: "toast",
} as const;

/**
 * Subscribes to `prefers-reduced-motion`. The CSS `@media` block in
 * tokens.css (Region 5) already collapses decorative transitions/animations
 * globally — this hook exists only for the one case that can't be expressed
 * in CSS alone: SeamProgress's *informational* degradation from a looping
 * draw to discrete per-stage jumps (motion.md §6).
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

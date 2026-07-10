import { useEffect, useRef, useState } from "react";

import { contrastRatio } from "./contrast";

interface Pairing {
  label: string;
  /** combined bg-* and text-* Tailwind classes measured together on one node */
  className: string;
  scope?: "inset";
  /** WCAG text floor is 4.5:1; UI-component (non-text) floor is 3:1 — used
   * for the ring-vs-surface pairings (m12b-contract.md §10). */
  threshold: number;
}

const PAIRINGS: Pairing[] = [
  { label: "text on bg", className: "bg-bg text-text", threshold: 4.5 },
  { label: "text on surface", className: "bg-surface text-text", threshold: 4.5 },
  { label: "text-2 on bg", className: "bg-bg text-text-2", threshold: 4.5 },
  { label: "text-2 on surface", className: "bg-surface text-text-2", threshold: 4.5 },
  { label: "accent-ink on accent", className: "bg-accent text-accent-ink", threshold: 4.5 },
  { label: "success on success-soft", className: "bg-success-soft text-success", threshold: 4.5 },
  { label: "warning on warning-soft", className: "bg-warning-soft text-warning", threshold: 4.5 },
  { label: "danger on danger-soft", className: "bg-danger-soft text-danger", threshold: 4.5 },
  { label: "inset: text on bg", className: "bg-bg text-text", scope: "inset", threshold: 4.5 },
  { label: "inset: text on surface", className: "bg-surface text-text", scope: "inset", threshold: 4.5 },
  { label: "inset: text-2 on bg", className: "bg-bg text-text-2", scope: "inset", threshold: 4.5 },
  { label: "inset: text-2 on surface", className: "bg-surface text-text-2", scope: "inset", threshold: 4.5 },
  { label: "ring on bg (non-text, UI floor)", className: "bg-bg text-ring", threshold: 3 },
  { label: "ring on surface (non-text, UI floor)", className: "bg-surface text-ring", threshold: 3 },
];

/**
 * Live contrast audit (m12b-contract.md §10/§12 acceptance criterion 3).
 * Ratios are measured from real computed styles (see ./contrast.ts) rather
 * than hardcoded, so this table can never silently drift from tokens.css.
 */
export function ContrastTable() {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const [ratios, setRatios] = useState<(number | null)[]>(() => PAIRINGS.map(() => null));

  useEffect(() => {
    const next = PAIRINGS.map((_, i) => {
      const el = refs.current[i];
      if (!el) return null;
      const cs = getComputedStyle(el);
      return contrastRatio(cs.color, cs.backgroundColor);
    });
    setRatios(next);
  }, []);

  return (
    <div className="flex flex-col divide-y divide-border">
      {PAIRINGS.map((p, i) => {
        const ratio = ratios[i];
        const pass = ratio !== null && ratio >= p.threshold;
        return (
          <div key={p.label} className="flex flex-wrap items-center gap-4 py-3">
            <div
              ref={(el) => {
                refs.current[i] = el;
              }}
              className={`${p.scope === "inset" ? "inset " : ""}${p.className} flex h-10 w-40 shrink-0 items-center justify-center rounded text-role-small`}
            >
              Aa
            </div>
            <span className="text-role-small text-text-2 w-64">{p.label}</span>
            <span className={`text-role-small font-medium ${ratio === null ? "text-text-2" : pass ? "text-success" : "text-danger"}`}>
              {ratio !== null ? `${ratio.toFixed(2)}:1` : "measuring…"} {ratio !== null ? (pass ? "PASS" : "FAIL") : ""} (≥{p.threshold}:1)
            </span>
          </div>
        );
      })}
    </div>
  );
}

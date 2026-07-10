import { AlertTriangle, Search, Sparkles, type LucideIcon } from "lucide-react";

import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import type { ProductSummary } from "@/lib/api";
import { cn } from "@/lib/utils";

export type EmptyStateFlavor = "invite" | "no-results" | "error";

export interface EmptyStateProps {
  flavor: EmptyStateFlavor;
  title: string;
  body?: string;
  action?: { label: string; onAct: () => void };
  /** `no-results` only (component-library.md §4): top semantic hits despite
   * the empty result — Search's zero-results state re-queries without
   * structured filters to populate this (decisions.md D-F47). Requires
   * `onSelectClosest` to be clickable. */
  closest?: ProductSummary[];
  onSelectClosest?: (styleNumber: string) => void;
  className?: string;
}

// `chips` (component-library.md §4) arrives with the flavor that needs it —
// Ask's invite empty state (M12g) — since SuggestionChips doesn't exist yet
// and Ask's chips are assignment-specific NL2SQL questions, not applicable
// here. `closest` ships this milestone (M12f) for `no-results`.
const FLAVOR_ICON: Record<EmptyStateFlavor, LucideIcon> = {
  invite: Sparkles,
  "no-results": Search,
  error: AlertTriangle,
};

/**
 * EmptyState (component-library.md §4). `invite`'s `chips` prop still isn't
 * built (M12g's SuggestionChips); every other flavor's documented anatomy is
 * live: `error` (Overview's regional fetch-error fallback, M12d), `no-results`
 * with an optional "Closest matches" mini-grid (Search's zero-hit state, M12f).
 */
export function EmptyState({ flavor, title, body, action, closest, onSelectClosest, className }: EmptyStateProps) {
  const Icon = FLAVOR_ICON[flavor];
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-lg border border-border bg-surface px-6 py-12 text-center", className)}>
      <Icon aria-hidden="true" size={24} className="text-text-2" />
      <p className="text-role-title text-text">{title}</p>
      {body ? <p className="max-w-sm text-role-body text-text-2">{body}</p> : null}
      {action ? (
        <Button variant="outline" size="sm" className="mt-2" onClick={action.onAct}>
          {action.label}
        </Button>
      ) : null}
      {closest && closest.length > 0 ? (
        <div className="mt-6 w-full max-w-md text-left">
          <p className="text-role-micro text-text-2">Closest matches</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {closest.map((product) => (
              <ProductCard
                key={product.style_number}
                product={product}
                size="compact"
                onOpen={(styleNumber) => onSelectClosest?.(styleNumber)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

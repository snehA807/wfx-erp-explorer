import { AlertTriangle, Search, Sparkles, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type EmptyStateFlavor = "invite" | "no-results" | "error";

export interface EmptyStateProps {
  flavor: EmptyStateFlavor;
  title: string;
  body?: string;
  action?: { label: string; onAct: () => void };
  className?: string;
}

// `chips`/`closest` (component-library.md §4) arrive with the flavors that
// need them — Ask's invite empty state (M12g) and Search/Visual's no-results
// (M12f) — added then rather than built now against components (SuggestionChips,
// ProductCard) that don't exist yet.
const FLAVOR_ICON: Record<EmptyStateFlavor, LucideIcon> = {
  invite: Sparkles,
  "no-results": Search,
  error: AlertTriangle,
};

/**
 * EmptyState (component-library.md §4). This milestone only exercises the
 * `error` flavor (Overview's regional fetch-error fallback); `invite`/
 * `no-results` render the same shared anatomy for their later consumers.
 */
export function EmptyState({ flavor, title, body, action, className }: EmptyStateProps) {
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
    </div>
  );
}

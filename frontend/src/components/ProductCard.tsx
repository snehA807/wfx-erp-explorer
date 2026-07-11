import { useState } from "react";

import { CategoryPlaceholder } from "@/components/CategoryPlaceholder";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductSummary } from "@/lib/api";
import { cn } from "@/lib/utils";

// D-F13: cosine scores below this hide their badge — weak matches shouldn't
// advertise weakness. D-F13's placeholder ~0.55 was measured too low against
// real production data at M12f acceptance: even a nonsense query scored
// 0.58-0.60, which would badge unrelated results as "matches." Raised to
// 0.65, which cleanly clears nonsense/single-keyword queries (0.53-0.65)
// while every genuinely descriptive query tested stayed at 0.71+. Full
// measurement in decisions.md D-F48.
export const MATCH_BADGE_THRESHOLD = 0.65;

export interface ProductCardProps {
  product: ProductSummary;
  /** Similarity score (0-1) from a semantic search hit (component-library.md
   * §4). Renders a badge only at/above MATCH_BADGE_THRESHOLD. Absent for
   * plain catalog browsing (Products) where there's no query to score
   * against. */
  matchScore?: number;
  /** Smaller presentation for DetailPanel's "More like this" strip. */
  size?: "default" | "compact";
  /** "card" (default) is the grid/strip presentation below. "row" is the
   * command palette's compact horizontal list-item presentation
   * (component-library.md §4, built in M12h — D-F37's incremental-growth
   * pattern: this is the variant's real second consumer). Unstyled and
   * non-interactive itself; the `CommandItem` wrapping it in CommandPalette
   * owns selection/keyboard handling, so it renders a plain `div`, not
   * another nested button. */
  variant?: "card" | "row";
  onOpen?: (styleNumber: string) => void;
  className?: string;
}

/**
 * ProductCard (component-library.md §4). 4:5 image frame, zoom-on-hover
 * (motion.md §2), `onError` -> CategoryPlaceholder (D-F14: dataset images
 * are untrusted). Card recipe: border + hover lift, no shadow at rest
 * (design-system.md §9).
 */
export function ProductCard({
  product,
  matchScore,
  size = "default",
  variant = "card",
  onOpen,
  className,
}: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const isCompact = size === "compact";
  const showBadge = matchScore !== undefined && matchScore >= MATCH_BADGE_THRESHOLD;

  if (variant === "row") {
    return (
      <div className={cn("flex min-w-0 flex-1 items-center gap-3", className)}>
        <div className="relative h-10 w-8 shrink-0 overflow-hidden rounded-sm bg-bg">
          {imgError ? (
            <CategoryPlaceholder category={product.category} className="h-full w-full" />
          ) : (
            <img
              src={product.image_url}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-role-small font-medium text-text">{product.style_name}</p>
          <p className="truncate text-role-small text-text-2">
            {product.style_number} · {product.category ?? "Uncategorized"}
          </p>
        </div>
        {showBadge ? (
          <span className="shrink-0 text-role-micro text-text-2">{Math.round(matchScore * 100)}% match</span>
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen?.(product.style_number)}
      className={cn(
        "card-hover flex flex-col overflow-hidden rounded-lg border border-border bg-surface text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        className,
      )}
    >
      <div className="img-zoom-frame relative aspect-product w-full bg-bg">
        {imgError ? (
          <CategoryPlaceholder category={product.category} className="h-full w-full" />
        ) : (
          <img
            src={product.image_url}
            alt={`${product.style_name} · ${product.color ?? "uncategorized color"} · ${product.category ?? "uncategorized"}`}
            className="img-zoom-inner h-full w-full object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        )}
        {showBadge ? (
          <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-role-micro text-accent-ink">
            {Math.round(matchScore * 100)}% match
          </span>
        ) : null}
      </div>
      <div className={cn("flex flex-1 flex-col gap-1", isCompact ? "p-3" : "p-4")}>
        <p className={cn("truncate font-medium text-text", isCompact ? "text-role-small" : "text-role-body")}>
          {product.style_name}
        </p>
        <p className="truncate text-role-small text-text-2">
          {product.style_number} · {product.fabric} · {product.gsm} GSM
        </p>
        {!isCompact ? <p className="truncate text-role-small text-text-2">{product.supplier_name}</p> : null}
        <p className="mt-auto pt-1 text-role-body font-semibold tabular-nums text-text">
          ₹{product.selling_price.toLocaleString("en-IN")}
        </p>
      </div>
    </button>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <div className="aspect-product w-full">
        <Skeleton className="h-full w-full rounded-none" />
      </div>
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="mt-2 h-4 w-16" />
      </div>
    </div>
  );
}

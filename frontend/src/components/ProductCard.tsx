import { useState } from "react";

import { CategoryPlaceholder } from "@/components/CategoryPlaceholder";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductSummary } from "@/lib/api";
import { cn } from "@/lib/utils";

export interface ProductCardProps {
  product: ProductSummary;
  /** Smaller presentation for DetailPanel's "More like this" strip. The
   * palette's compact `row` variant (component-library.md §4) is M12h scope
   * — not built here (D-F37's incremental-growth pattern: add a variant
   * when its real consumer exists, not preemptively). */
  size?: "default" | "compact";
  onOpen: (styleNumber: string) => void;
  className?: string;
}

/**
 * ProductCard (component-library.md §4). 4:5 image frame, zoom-on-hover
 * (motion.md §2), `onError` -> CategoryPlaceholder (D-F14: dataset images
 * are untrusted). Card recipe: border + hover lift, no shadow at rest
 * (design-system.md §9).
 */
export function ProductCard({ product, size = "default", onOpen, className }: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const isCompact = size === "compact";

  return (
    <button
      type="button"
      onClick={() => onOpen(product.style_number)}
      className={cn(
        "card-hover flex flex-col overflow-hidden rounded-lg border border-border bg-surface text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        className,
      )}
    >
      <div className="img-zoom-frame aspect-product w-full bg-bg">
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

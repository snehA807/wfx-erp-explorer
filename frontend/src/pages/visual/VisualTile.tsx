import { useState } from "react";

import { CategoryPlaceholder } from "@/components/CategoryPlaceholder";
import { MATCH_BADGE_THRESHOLD } from "@/components/ProductCard";
import type { SearchHit } from "@/lib/api";

export interface VisualTileProps {
  item: SearchHit;
  onOpen: (styleNumber: string) => void;
}

/**
 * Visual Search's own tile (design-spec.md §4: "image-forward grid, larger
 * tiles, info-on-hover" — distinct from ProductCard's always-visible name/
 * meta/price footer). Page-local: only Visual needs this presentation, same
 * promotion-rule pattern as ProductsTable/Pagination staying page-local
 * until a second consumer appears. The scrim reuses the `--inset`/
 * `--inset-text` tokens (the app's existing "dark surface, light text"
 * pair) rather than raw black/white, per invariant 7.
 */
export function VisualTile({ item, onOpen }: VisualTileProps) {
  const [imgError, setImgError] = useState(false);
  const showBadge = item.score >= MATCH_BADGE_THRESHOLD;

  return (
    <button
      type="button"
      onClick={() => onOpen(item.style_number)}
      className="img-zoom-frame card-hover group relative aspect-product w-full overflow-hidden rounded-lg border border-border bg-bg text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {imgError ? (
        <CategoryPlaceholder category={item.category} className="h-full w-full" />
      ) : (
        <img
          src={item.image_url}
          alt={`${item.style_name} · ${item.color ?? "uncategorized color"} · ${item.category ?? "uncategorized"}`}
          className="img-zoom-inner h-full w-full object-cover"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      )}
      {showBadge ? (
        <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-role-micro text-accent-ink">
          {Math.round(item.score * 100)}% match
        </span>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-inset/90 to-inset/0 p-3 opacity-0 transition-opacity duration-base group-hover:opacity-100 group-focus-visible:opacity-100">
        <p className="truncate text-role-small font-medium text-inset-text">{item.style_name}</p>
        <p className="truncate text-role-small text-inset-text-2">
          {item.style_number} · {item.fabric} · ₹{item.selling_price.toLocaleString("en-IN")}
        </p>
      </div>
    </button>
  );
}

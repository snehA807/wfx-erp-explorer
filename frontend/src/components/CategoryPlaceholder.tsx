import { ImageOff } from "lucide-react";

import { cn } from "@/lib/utils";

export interface CategoryPlaceholderProps {
  category?: string | null;
  className?: string;
}

/**
 * Neutral broken/missing-image fallback (component-library.md §6, design-
 * system.md §7: 24px icon in empty-state-shaped contexts). Dataset images
 * are untrusted (D-F14: shared across ~200 products, URLs can rot) — every
 * product image gets an `onError` handler that swaps to this.
 */
export function CategoryPlaceholder({ category, className }: CategoryPlaceholderProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 bg-border/30 text-text-2", className)}>
      <ImageOff aria-hidden="true" size={24} />
      <span className="text-role-micro">{category ?? "No image"}</span>
    </div>
  );
}

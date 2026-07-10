import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  /** Preformatted display string (₹ crore, thousands separators, etc.) — this
   * component never formats numbers itself (component-library.md §4). */
  value: string;
  /** Revenue is the one hero card: stat-hero type role + flex-grow. */
  hero?: boolean;
  /** e.g. the revenue-rule footnote ("Excl. cancelled · INR"). */
  footnote?: string;
  icon?: LucideIcon;
  href?: string;
  /** Load-cascade stagger index (motion.md §2: 30ms/step, once per mount). */
  cascadeIndex?: number;
  className?: string;
}

/**
 * StatCard (component-library.md §4). Used ×5 on Overview; Revenue is the
 * hero. Static card recipe (design-system.md §9): border + hover lift, no
 * shadow at rest.
 */
export function StatCard({ label, value, hero, footnote, icon: Icon, href, cascadeIndex, className }: StatCardProps) {
  const style: CSSProperties | undefined =
    cascadeIndex !== undefined ? ({ "--cascade-index": cascadeIndex } as CSSProperties) : undefined;

  const content: ReactNode = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-role-micro text-text-2">{label}</span>
        {Icon ? <Icon aria-hidden="true" size={16} className="shrink-0 text-text-2" /> : null}
      </div>
      <p className={cn("mt-2 text-text", hero ? "text-role-stat-hero" : "text-role-stat")}>{value}</p>
      {footnote ? <p className="mt-1 text-role-small text-text-2">{footnote}</p> : null}
    </>
  );

  const cardClass = cn("cascade-item card-hover rounded-lg border border-border bg-surface p-5", className);

  if (href) {
    return (
      <Link to={href} className={cardClass} style={style}>
        {content}
      </Link>
    );
  }

  return (
    <div className={cardClass} style={style}>
      {content}
    </div>
  );
}

export function StatCardSkeleton({
  hero,
  cascadeIndex,
  className,
}: {
  hero?: boolean;
  cascadeIndex?: number;
  className?: string;
}) {
  const style: CSSProperties | undefined =
    cascadeIndex !== undefined ? ({ "--cascade-index": cascadeIndex } as CSSProperties) : undefined;
  return (
    <div className={cn("cascade-item rounded-lg border border-border bg-surface p-5", className)} style={style}>
      <Skeleton className="h-3 w-20" />
      <Skeleton className={cn("mt-3", hero ? "h-8 w-32" : "h-7 w-24")} />
      <Skeleton className="mt-2 h-3 w-28" />
    </div>
  );
}

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FilterOptionsData } from "@/lib/api";
import { cn } from "@/lib/utils";

export type CategoricalFilterKey = "category" | "fabric" | "color" | "print" | "season" | "brand";

export interface FilterRailProps {
  /** Only the toolbar presentation exists so far (Products, this milestone).
   * The full facet-checkbox + GSM-slider variant is M12f's (Search) — a
   * second value joins this union then, not preemptively (D-F37 pattern). */
  variant: "toolbar";
  facets: FilterOptionsData | null;
  active: Partial<Record<CategoricalFilterKey, string>>;
  onChange: (key: CategoricalFilterKey, value: string | undefined) => void;
  onClearAll: () => void;
  className?: string;
}

const FIELDS: { key: CategoricalFilterKey; label: string }[] = [
  { key: "category", label: "Category" },
  { key: "fabric", label: "Fabric" },
  { key: "color", label: "Color" },
  { key: "print", label: "Print" },
  { key: "season", label: "Season" },
  { key: "brand", label: "Brand" },
];

const ALL_VALUE = "__all";

/**
 * FilterRail, toolbar variant (component-library.md §4): "selects + pills"
 * subset used by Products, collapsed into the page toolbar rather than a
 * vertical rail. Renders one Select per categorical facet (values/counts
 * from GET /filters/options) plus removable active-filter pills + "Clear
 * all". No GSM/price range slider here — that's the full variant only.
 */
export function FilterRail({ facets, active, onChange, onClearAll, className }: FilterRailProps) {
  const activeFields = FIELDS.filter((field) => active[field.key]);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap gap-2">
        {FIELDS.map((field) => (
          <Select
            key={field.key}
            value={active[field.key] ?? ALL_VALUE}
            onValueChange={(value) => onChange(field.key, value === ALL_VALUE ? undefined : value)}
          >
            <SelectTrigger className="h-8 w-36 text-role-small" aria-label={field.label}>
              <SelectValue placeholder={field.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All {field.label.toLowerCase()}</SelectItem>
              {(facets?.[field.key] ?? []).map((facetValue) => (
                <SelectItem key={facetValue.value} value={facetValue.value}>
                  {facetValue.value} ({facetValue.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>
      {activeFields.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {activeFields.map((field) => (
            <button
              key={field.key}
              type="button"
              onClick={() => onChange(field.key, undefined)}
              className="press flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-role-small text-text transition-colors hover:border-accent"
            >
              {field.label}: {active[field.key]}
              <X aria-hidden="true" size={12} />
            </button>
          ))}
          <Button variant="ghost" size="sm" onClick={onClearAll}>
            Clear all
          </Button>
        </div>
      ) : null}
    </div>
  );
}

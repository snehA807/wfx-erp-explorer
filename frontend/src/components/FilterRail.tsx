import { useEffect, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { VisuallyHidden } from "@/components/VisuallyHidden";
import type { FilterOptionsData, RangeFacet } from "@/lib/api";
import { cn } from "@/lib/utils";

export type CategoricalFilterKey = "category" | "fabric" | "color" | "print" | "season" | "brand";

export interface CategoricalField {
  key: CategoricalFilterKey;
  label: string;
}

// Single source of truth for the 6 categorical facet fields, shared by both
// FilterRail variants and re-exported for pages/products/params.ts +
// pages/search/params.ts (decisions.md D-F45) instead of each redefining it.
export const CATEGORICAL_FIELDS: CategoricalField[] = [
  { key: "category", label: "Category" },
  { key: "fabric", label: "Fabric" },
  { key: "color", label: "Color" },
  { key: "print", label: "Print" },
  { key: "season", label: "Season" },
  { key: "brand", label: "Brand" },
];

export type GsmRange = [number, number];

export interface FilterRailProps {
  variant: "toolbar" | "full";
  facets: FilterOptionsData | null;
  active: Partial<Record<CategoricalFilterKey, string>>;
  onChange: (key: CategoricalFilterKey, value: string | undefined) => void;
  onClearAll: () => void;
  /** "full" variant only — GSM dual-range slider (design-system.md §10). */
  gsmRange?: GsmRange;
  onGsmChange?: (range: GsmRange | undefined) => void;
  className?: string;
}

const ALL_VALUE = "__all";

export function FilterRail({
  variant,
  facets,
  active,
  onChange,
  onClearAll,
  gsmRange,
  onGsmChange,
  className,
}: FilterRailProps) {
  if (variant === "toolbar") {
    return (
      <ToolbarFilterRail facets={facets} active={active} onChange={onChange} onClearAll={onClearAll} className={className} />
    );
  }
  return (
    <FullFilterRail
      facets={facets}
      active={active}
      onChange={onChange}
      onClearAll={onClearAll}
      gsmRange={gsmRange}
      onGsmChange={onGsmChange}
      className={className}
    />
  );
}

/**
 * FilterRail, toolbar variant (component-library.md §4): "selects + pills"
 * subset used by Products, collapsed into the page toolbar rather than a
 * vertical rail. One Select per categorical facet + removable pills. No
 * GSM/price range slider here — that's the full variant only.
 */
function ToolbarFilterRail({
  facets,
  active,
  onChange,
  onClearAll,
  className,
}: Omit<FilterRailProps, "variant" | "gsmRange" | "onGsmChange">) {
  const activeFields = CATEGORICAL_FIELDS.filter((field) => active[field.key]);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap gap-2">
        {CATEGORICAL_FIELDS.map((field) => (
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
      <ActivePills active={active} activeFields={activeFields} onChange={onChange} onClearAll={onClearAll} />
    </div>
  );
}

/**
 * FilterRail, full variant (component-library.md §4): grouped checkbox
 * facets with counts + a GSM dual-range slider, used by Search. Each
 * categorical field is still single-valued backend-side (`ProductListParams`/
 * `SearchProductsRequest` take one string, not a list) — the checkboxes read
 * as a scannable list but behave as a single-select-per-group: checking a row
 * replaces any prior selection in that group, unchecking the active row
 * clears it. Collapses to a "Filters" Sheet-trigger below xl (1280px, per
 * "Collapses to a Sheet-trigger button below 1280").
 */
function FullFilterRail({
  facets,
  active,
  onChange,
  onClearAll,
  gsmRange,
  onGsmChange,
  className,
}: Omit<FilterRailProps, "variant">) {
  const activeFields = CATEGORICAL_FIELDS.filter((field) => active[field.key]);
  const activeCount = activeFields.length + (gsmRange ? 1 : 0);

  const content = (
    <FacetGroups facets={facets} active={active} onChange={onChange} gsmRange={gsmRange} onGsmChange={onGsmChange} />
  );

  return (
    <div className={cn("flex flex-col gap-4 xl:w-filter-rail xl:shrink-0", className)}>
      <div className="xl:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal aria-hidden="true" size={16} />
              Filters
              {activeCount > 0 ? (
                <Badge variant="secondary" className="ml-1">
                  {activeCount}
                </Badge>
              ) : null}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full overflow-y-auto sm:max-w-sm">
            <VisuallyHidden>
              <SheetTitle>Filters</SheetTitle>
            </VisuallyHidden>
            <div className="pt-8">{content}</div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="hidden xl:block">{content}</div>

      <ActivePills
        active={active}
        activeFields={activeFields}
        onChange={onChange}
        onClearAll={onClearAll}
        gsmRange={gsmRange}
        onGsmChange={onGsmChange}
      />
    </div>
  );
}

function FacetGroups({
  facets,
  active,
  onChange,
  gsmRange,
  onGsmChange,
}: {
  facets: FilterOptionsData | null;
  active: Partial<Record<CategoricalFilterKey, string>>;
  onChange: (key: CategoricalFilterKey, value: string | undefined) => void;
  gsmRange?: GsmRange;
  onGsmChange?: (range: GsmRange | undefined) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      {CATEGORICAL_FIELDS.map((field) => {
        const values = facets?.[field.key] ?? [];
        if (values.length === 0) return null;
        return (
          <div key={field.key}>
            <h3 className="text-role-micro text-text-2">{field.label}</h3>
            <div className="mt-2 flex flex-col gap-1.5">
              {values.map((facetValue) => {
                const checked = active[field.key] === facetValue.value;
                return (
                  <label
                    key={facetValue.value}
                    className="flex cursor-pointer items-center gap-2 text-role-small text-text"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(next) => onChange(field.key, next ? facetValue.value : undefined)}
                    />
                    <span className="flex-1 truncate">{facetValue.value}</span>
                    <span className="tabular-nums text-text-2">{facetValue.count}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
      {facets ? <GsmSlider bounds={facets.gsm} active={gsmRange} onCommit={(range) => onGsmChange?.(range)} /> : null}
    </div>
  );
}

function GsmSlider({
  bounds,
  active,
  onCommit,
}: {
  bounds: RangeFacet;
  active: GsmRange | undefined;
  onCommit: (range: GsmRange | undefined) => void;
}) {
  const fullRange: GsmRange = [bounds.min, bounds.max];
  const [local, setLocal] = useState<GsmRange>(active ?? fullRange);

  useEffect(() => {
    setLocal(active ?? fullRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.[0], active?.[1], bounds.min, bounds.max]);

  return (
    <div>
      <h3 className="text-role-micro text-text-2">GSM</h3>
      <div className="mt-3 px-1">
        <Slider
          min={bounds.min}
          max={bounds.max}
          step={1}
          value={local}
          onValueChange={(next) => setLocal([next[0], next[1]])}
          onValueCommit={(next) => {
            const range: GsmRange = [next[0], next[1]];
            onCommit(range[0] === bounds.min && range[1] === bounds.max ? undefined : range);
          }}
          aria-label="GSM range"
        />
        <div className="mt-2 flex justify-between text-role-small tabular-nums text-text-2">
          <span>{local[0]} GSM</span>
          <span>{local[1]} GSM</span>
        </div>
      </div>
    </div>
  );
}

function ActivePills({
  active,
  activeFields,
  onChange,
  onClearAll,
  gsmRange,
  onGsmChange,
}: {
  active: Partial<Record<CategoricalFilterKey, string>>;
  activeFields: CategoricalField[];
  onChange: (key: CategoricalFilterKey, value: string | undefined) => void;
  onClearAll: () => void;
  gsmRange?: GsmRange;
  onGsmChange?: (range: GsmRange | undefined) => void;
}) {
  if (activeFields.length === 0 && !gsmRange) return null;

  return (
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
      {gsmRange ? (
        <button
          type="button"
          onClick={() => onGsmChange?.(undefined)}
          className="press flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-role-small text-text transition-colors hover:border-accent"
        >
          GSM: {gsmRange[0]}–{gsmRange[1]}
          <X aria-hidden="true" size={12} />
        </button>
      ) : null}
      <Button variant="ghost" size="sm" onClick={onClearAll}>
        Clear all
      </Button>
    </div>
  );
}

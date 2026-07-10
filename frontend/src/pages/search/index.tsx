import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { DetailPanel } from "@/components/DetailPanel";
import { EmptyState } from "@/components/EmptyState";
import { FilterRail, type CategoricalFilterKey, type GsmRange } from "@/components/FilterRail";
import { PageTitle } from "@/components/PageTitle";
import { ProductCard, ProductCardSkeleton } from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { useDetailPanelRoute } from "@/lib/hooks/useDetailPanelRoute";
import { useFilterOptions } from "@/lib/hooks/useFilterOptions";

import { CATEGORICAL_KEYS, hasActiveSearchFilters, parseSearchParams } from "./params";
import { useSearch } from "./useSearch";

const SKELETON_COUNT = 12;

export default function SearchPage() {
  useEffect(() => {
    document.title = "Search · WFX Explorer";
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => parseSearchParams(searchParams), [searchParams]);
  const { items, loading, error, closest, retry } = useSearch(params);
  const { facets } = useFilterOptions();
  const { styleNumber: styleParam, openDetail, closeDetail } = useDetailPanelRoute();

  const [queryInput, setQueryInput] = useState(params.q);
  useEffect(() => {
    setQueryInput(params.q);
  }, [params.q]);

  // Search inputs debounce 300ms (design-system.md §10) — filters below
  // apply instantly (design-spec.md §7), no debounce on those.
  useEffect(() => {
    if (queryInput === params.q) return;
    const handle = setTimeout(() => {
      updateParams({ q: queryInput || undefined });
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryInput]);

  function updateParams(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setSearchParams(next, { replace: true });
  }

  const activeFilters = useMemo(() => {
    const active: Partial<Record<CategoricalFilterKey, string>> = {};
    for (const key of CATEGORICAL_KEYS) {
      if (params[key]) active[key] = params[key];
    }
    return active;
  }, [params]);

  const gsmRange: GsmRange | undefined =
    params.min_gsm !== undefined && params.max_gsm !== undefined ? [params.min_gsm, params.max_gsm] : undefined;

  const hasQuery = params.q.trim().length > 0;
  const hasFilters = hasActiveSearchFilters(params);

  function clearAll() {
    updateParams(
      Object.fromEntries([
        ...CATEGORICAL_KEYS.map((key) => [key, undefined]),
        ["min_gsm", undefined],
        ["max_gsm", undefined],
      ]),
    );
  }

  return (
    <>
      <PageTitle
        title="Search"
        description="Describe what you're looking for — fabric, style, mood."
        meta={hasQuery && !loading ? `${items.length.toLocaleString("en-IN")} results` : undefined}
      />

      <Input
        value={queryInput}
        onChange={(event) => setQueryInput(event.target.value)}
        placeholder='Try "blue floral dress" or "lightweight cotton jacket"'
        className="h-12 text-role-body"
        aria-label="Search products"
        autoFocus
      />

      <div className="mt-6 flex flex-col gap-6 xl:flex-row">
        <FilterRail
          variant="full"
          facets={facets}
          active={activeFilters}
          onChange={(key, value) => updateParams({ [key]: value })}
          onClearAll={clearAll}
          gsmRange={gsmRange}
          onGsmChange={(range) =>
            updateParams({
              min_gsm: range ? String(range[0]) : undefined,
              max_gsm: range ? String(range[1]) : undefined,
            })
          }
        />

        <div className="min-w-0 flex-1">
          {!hasQuery ? (
            <EmptyState
              flavor="invite"
              title="Search the catalog"
              body={'Describe what you’re looking for — try "navy blue jacket" or "printed cotton shirt."'}
            />
          ) : error ? (
            <EmptyState
              flavor="error"
              title="Couldn't run that search"
              body={error.message}
              action={{ label: "Retry", onAct: retry }}
            />
          ) : loading ? (
            <div className="grid-products">
              {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              flavor="no-results"
              title="No products match"
              body={hasFilters ? "Try clearing filters or rephrasing your search." : "Try rephrasing your search."}
              action={hasFilters ? { label: "Clear filters", onAct: clearAll } : undefined}
              closest={closest ?? undefined}
              onSelectClosest={openDetail}
            />
          ) : (
            <div className="grid-products">
              {items.map((item) => (
                <ProductCard key={item.style_number} product={item} matchScore={item.score} onOpen={openDetail} />
              ))}
            </div>
          )}
        </div>
      </div>

      <DetailPanel styleNumber={styleParam} onClose={closeDetail} onOpenProduct={openDetail} />
    </>
  );
}

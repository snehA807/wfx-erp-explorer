import { useEffect, useMemo, useState } from "react";
import { LayoutGrid, Table2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import { DetailPanel } from "@/components/DetailPanel";
import { EmptyState } from "@/components/EmptyState";
import { FilterRail, type CategoricalFilterKey } from "@/components/FilterRail";
import { PageTitle } from "@/components/PageTitle";
import { ProductCard, ProductCardSkeleton } from "@/components/ProductCard";
import { CommandPaletteTrigger } from "@/components/shell/CommandPalette";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDetailPanelRoute } from "@/lib/hooks/useDetailPanelRoute";
import { useFilterOptions } from "@/lib/hooks/useFilterOptions";

import { Pagination } from "./Pagination";
import { CATEGORICAL_KEYS, parseProductsParams, SORT_OPTIONS } from "./params";
import { ProductsTable, ProductsTableSkeleton } from "./ProductsTable";
import { PAGE_SIZE, useProducts } from "./useProducts";

export default function ProductsPage() {
  useEffect(() => {
    document.title = "Products · WFX Explorer";
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => parseProductsParams(searchParams), [searchParams]);
  const { items, meta, loading, error, retry } = useProducts(params);
  const { facets } = useFilterOptions();
  const { styleNumber: styleParam, openDetail, closeDetail } = useDetailPanelRoute();

  const [searchInput, setSearchInput] = useState(params.search);
  useEffect(() => {
    setSearchInput(params.search);
  }, [params.search]);

  // Search inputs debounce 300ms (design-system.md §10).
  useEffect(() => {
    if (searchInput === params.search) return;
    const handle = setTimeout(() => {
      updateParams({ search: searchInput || undefined }, { resetPage: true });
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function updateParams(patch: Record<string, string | undefined>, options?: { resetPage?: boolean }) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (options?.resetPage) next.delete("page");
    setSearchParams(next, { replace: true });
  }

  // No backend `search` param exists on GET /products (decisions.md D-F40)
  // — this narrows the already-fetched page client-side.
  const visibleItems = useMemo(() => {
    const query = params.search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      [item.style_name, item.style_number, item.brand, item.fabric].some(
        (field) => field?.toLowerCase().includes(query),
      ),
    );
  }, [items, params.search]);

  const activeFilters = useMemo(() => {
    const active: Partial<Record<CategoricalFilterKey, string>> = {};
    for (const key of CATEGORICAL_KEYS) {
      if (params[key]) active[key] = params[key];
    }
    return active;
  }, [params]);

  const hasActiveNarrowing = Object.keys(activeFilters).length > 0 || params.search.length > 0;
  const sortValue = `${params.sort_by}:${params.order}`;

  return (
    <>
      <PageTitle
        title="Products"
        description="Browse the full finished-goods catalog."
        meta={meta ? `${meta.total.toLocaleString("en-IN")} results` : undefined}
        actions={<CommandPaletteTrigger />}
      />

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Quick-filter this page…"
            className="w-64"
            aria-label="Quick-filter products on this page"
          />
          <Select
            value={sortValue}
            onValueChange={(value) => {
              const option = SORT_OPTIONS.find((o) => o.value === value);
              if (!option) return;
              updateParams({ sort_by: option.sort_by, order: option.order });
            }}
          >
            <SelectTrigger className="h-9 w-48" aria-label="Sort by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-1 rounded-md border border-border p-1">
            <Button
              variant={params.view === "grid" ? "secondary" : "ghost"}
              size="icon"
              aria-label="Grid view"
              aria-pressed={params.view === "grid"}
              onClick={() => updateParams({ view: undefined })}
            >
              <LayoutGrid aria-hidden="true" size={16} />
            </Button>
            <Button
              variant={params.view === "table" ? "secondary" : "ghost"}
              size="icon"
              aria-label="Table view"
              aria-pressed={params.view === "table"}
              onClick={() => updateParams({ view: "table" })}
            >
              <Table2 aria-hidden="true" size={16} />
            </Button>
          </div>
        </div>

        <FilterRail
          variant="toolbar"
          facets={facets}
          active={activeFilters}
          onChange={(key, value) => updateParams({ [key]: value }, { resetPage: true })}
          onClearAll={() =>
            updateParams(
              Object.fromEntries(CATEGORICAL_KEYS.map((key) => [key, undefined])),
              { resetPage: true },
            )
          }
        />

        {error ? (
          <EmptyState
            flavor="error"
            title="Couldn't load products"
            body={error.message}
            action={{ label: "Retry", onAct: retry }}
          />
        ) : loading ? (
          params.view === "table" ? (
            <ProductsTableSkeleton />
          ) : (
            <div className="grid-products">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          )
        ) : visibleItems.length === 0 ? (
          <EmptyState
            flavor="no-results"
            title="No products match"
            body="Try clearing filters or the quick-filter above."
            action={
              hasActiveNarrowing
                ? {
                    label: "Clear filters",
                    onAct: () =>
                      updateParams(
                        {
                          search: undefined,
                          ...Object.fromEntries(CATEGORICAL_KEYS.map((key) => [key, undefined])),
                        },
                        { resetPage: true },
                      ),
                  }
                : undefined
            }
          />
        ) : params.view === "table" ? (
          <ProductsTable items={visibleItems} onOpen={openDetail} />
        ) : (
          <div className="grid-products">
            {visibleItems.map((item) => (
              <ProductCard key={item.style_number} product={item} onOpen={openDetail} />
            ))}
          </div>
        )}

        {meta && !loading && !error ? (
          <Pagination
            page={meta.page}
            totalPages={meta.total_pages}
            onPageChange={(page) => updateParams({ page: String(page) })}
          />
        ) : null}
      </div>

      <DetailPanel styleNumber={styleParam} onClose={closeDetail} onOpenProduct={openDetail} />
    </>
  );
}

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { DetailPanel } from "@/components/DetailPanel";
import { EmptyState } from "@/components/EmptyState";
import { PageTitle } from "@/components/PageTitle";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDetailPanelRoute } from "@/lib/hooks/useDetailPanelRoute";

import { useVisualSearch } from "./useVisualSearch";
import { VisualTile } from "./VisualTile";

const SKELETON_COUNT = 12;

export default function VisualSearchPage() {
  useEffect(() => {
    document.title = "Visual Search · WFX Explorer";
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const { items, loading, error, retry } = useVisualSearch(q);
  const { styleNumber: styleParam, openDetail, closeDetail } = useDetailPanelRoute();

  const [queryInput, setQueryInput] = useState(q);
  useEffect(() => {
    setQueryInput(q);
  }, [q]);

  // Search inputs debounce 300ms (design-system.md §10).
  useEffect(() => {
    if (queryInput === q) return;
    const handle = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (queryInput) next.set("q", queryInput);
      else next.delete("q");
      setSearchParams(next, { replace: true });
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryInput]);

  const hasQuery = q.trim().length > 0;

  return (
    <>
      <PageTitle
        title="Visual Search"
        description="Searches what garments look like, not just their metadata."
        meta={hasQuery && !loading ? `${items.length.toLocaleString("en-IN")} results` : undefined}
      />

      <Input
        value={queryInput}
        onChange={(event) => setQueryInput(event.target.value)}
        placeholder='Try "dark garment with stripes" or "floral print dress"'
        className="h-12 text-role-body"
        aria-label="Describe how the garment looks"
        autoFocus
      />

      <div className="mt-6">
        {!hasQuery ? (
          <EmptyState
            flavor="invite"
            title="Describe how it looks"
            body="Visual search matches appearance, not labels — try describing color, pattern, or silhouette."
          />
        ) : error ? (
          <EmptyState
            flavor="error"
            title="Couldn't run that search"
            body={error.message}
            action={{ label: "Retry", onAct: retry }}
          />
        ) : loading ? (
          <div className="grid-visual">
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <Skeleton key={i} className="aspect-product w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState flavor="no-results" title="No products match" body="Try describing the garment differently." />
        ) : (
          <div className="grid-visual">
            {items.map((item) => (
              <VisualTile key={item.style_number} item={item} onOpen={openDetail} />
            ))}
          </div>
        )}
      </div>

      <DetailPanel styleNumber={styleParam} onClose={closeDetail} onOpenProduct={openDetail} />
    </>
  );
}

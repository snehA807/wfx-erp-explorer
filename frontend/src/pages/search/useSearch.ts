import { useCallback, useEffect, useState } from "react";

import { ApiError, searchProducts, type SearchHit } from "@/lib/api";

import { hasActiveSearchFilters, type SearchUrlParams } from "./params";

const LIMIT = 24;
const CLOSEST_LIMIT = 2;

interface UseSearchResult {
  items: SearchHit[];
  loading: boolean;
  error: ApiError | null;
  /** Top semantic hits re-queried without structured filters, populated only
   * when the filtered query returns zero rows (decisions.md D-F47) — null
   * while not applicable/loading, [] if genuinely nothing matches at all. */
  closest: SearchHit[] | null;
  retry: () => void;
}

/**
 * POST /search/products (M12f). One request per debounced query/filter
 * change (the page debounces the raw text input into `params.q` before this
 * hook ever sees it — filters themselves apply instantly, no debounce,
 * design-spec.md §7).
 */
export function useSearch(params: SearchUrlParams): UseSearchResult {
  const [items, setItems] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [closest, setClosest] = useState<SearchHit[] | null>(null);
  const [attempt, setAttempt] = useState(0);

  const { q, category, fabric, color, print, season, brand, min_gsm, max_gsm } = params;

  useEffect(() => {
    const query = q.trim();
    if (!query) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    searchProducts({ query, limit: LIMIT, category, fabric, color, print, season, brand, min_gsm, max_gsm })
      .then((hits) => {
        if (!cancelled) setItems(hits);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err
            : new ApiError({ code: "UNKNOWN_ERROR", message: "Something went wrong", status: null }),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [q, category, fabric, color, print, season, brand, min_gsm, max_gsm, attempt]);

  // design-spec.md §9 / component-library.md's EmptyState `closest`: only
  // worth a second request when structured filters are the likely cause of
  // the empty result — re-query the same text with no filters, capped at 2.
  useEffect(() => {
    const query = q.trim();
    if (loading || !query || items.length > 0 || !hasActiveSearchFilters(params)) {
      setClosest(null);
      return;
    }
    let cancelled = false;
    searchProducts({ query, limit: CLOSEST_LIMIT })
      .then((hits) => {
        if (!cancelled) setClosest(hits);
      })
      .catch(() => {
        if (!cancelled) setClosest([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, items.length, q, category, fabric, color, print, season, brand, min_gsm, max_gsm]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { items, loading, error, closest, retry };
}

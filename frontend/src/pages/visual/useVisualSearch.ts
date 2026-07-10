import { useCallback, useEffect, useState } from "react";

import { ApiError, searchVisual, type SearchHit } from "@/lib/api";

const LIMIT = 24;

interface UseVisualSearchResult {
  items: SearchHit[];
  loading: boolean;
  error: ApiError | null;
  retry: () => void;
}

/**
 * POST /search/visual (M12f). No structured filters exist on this endpoint
 * (SearchVisualRequest — query + limit only), so unlike useSearch.ts there's
 * no facets/closest-matches machinery here.
 */
export function useVisualSearch(query: string): UseVisualSearchResult {
  const [items, setItems] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    searchVisual({ query: q, limit: LIMIT })
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
  }, [query, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { items, loading, error, retry };
}

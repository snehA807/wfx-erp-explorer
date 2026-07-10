import { useEffect, useState } from "react";

import { ApiError, getFilterOptions, type FilterOptionsData } from "../api";

interface UseFilterOptionsResult {
  facets: FilterOptionsData | null;
  loading: boolean;
  error: ApiError | null;
}

/**
 * GET /filters/options (1-hour server-side cache — services/filters.py).
 * One fetch per mount, no retry surface: FilterRail degrades to unpopulated
 * selects on failure rather than blocking the product grid it sits above.
 */
export function useFilterOptions(): UseFilterOptionsResult {
  const [facets, setFacets] = useState<FilterOptionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    let cancelled = false;
    getFilterOptions()
      .then((data) => {
        if (!cancelled) setFacets(data);
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
  }, []);

  return { facets, loading, error };
}

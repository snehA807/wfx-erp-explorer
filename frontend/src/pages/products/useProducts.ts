import { useCallback, useEffect, useState } from "react";

import { ApiError, getProducts, type ProductListMeta, type ProductSummary } from "@/lib/api";

import type { ProductsUrlParams } from "./params";

export const PAGE_SIZE = 24;

interface UseProductsResult {
  items: ProductSummary[];
  meta: ProductListMeta | null;
  loading: boolean;
  error: ApiError | null;
  retry: () => void;
}

/**
 * Page-level server-data hook (architecture.md §5 pattern, same shape as
 * overview/useStats.ts): local useState/useEffect, one fetch per param
 * change or retry. Only the backend-supported fields of `params` are ever
 * sent — `search`/`view` are client-only and filtered out by the caller.
 */
export function useProducts(params: ProductsUrlParams): UseProductsResult {
  const [items, setItems] = useState<ProductSummary[]>([]);
  const [meta, setMeta] = useState<ProductListMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [attempt, setAttempt] = useState(0);

  const { page, sort_by, order, category, fabric, color, print, season, brand } = params;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getProducts({ page, page_size: PAGE_SIZE, sort_by, order, category, fabric, color, print, season, brand })
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setMeta(result.meta);
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
  }, [page, sort_by, order, category, fabric, color, print, season, brand, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { items, meta, loading, error, retry };
}

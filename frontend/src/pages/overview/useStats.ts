import { useCallback, useEffect, useState } from "react";

import { ApiError, getDashboardStats, type DashboardStats } from "@/lib/api";

interface UseStatsResult {
  stats: DashboardStats | null;
  loading: boolean;
  error: ApiError | null;
  retry: () => void;
}

/**
 * Page-level server-data hook (architecture.md §5): local useState/useEffect,
 * no cache library. One fetch per mount/retry; `attempt` is the de-dup guard
 * (a plain incrementing counter) that also re-triggers the effect on retry.
 */
export function useStats(): UseStatsResult {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDashboardStats()
      .then((data) => {
        if (!cancelled) setStats(data);
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
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { stats, loading, error, retry };
}

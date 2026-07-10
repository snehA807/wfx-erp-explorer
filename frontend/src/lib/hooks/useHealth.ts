import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError, getHealth, type HealthResponse } from "../api";

export type HealthStatus = "live" | "degraded" | "down";

interface UseHealthResult {
  status: HealthStatus;
  health: HealthResponse | null;
  /** True once the first health check has taken longer than 3s (cold-start signal). */
  isSlow: boolean;
}

export function useHealth(): UseHealthResult {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [status, setStatus] = useState<HealthStatus>("live");
  const [isSlow, setIsSlow] = useState(false);
  const hasCheckedOnce = useRef(false);

  const check = useCallback(async () => {
    let slowTimer: ReturnType<typeof setTimeout> | null = null;
    if (!hasCheckedOnce.current) {
      slowTimer = setTimeout(() => setIsSlow(true), 3000);
    }
    try {
      const result = await getHealth();
      setHealth(result);
      setStatus(result.status === "ok" ? "live" : "degraded");
    } catch (err) {
      // m12c-contract.md §5: an ApiError with a real HTTP status means the
      // backend was reachable and answered (e.g. the 503 envelope /health
      // returns on a DB outage) — that's "degraded", not "down". Only a
      // network-level failure (ApiError.status === null, set by api.ts's
      // fetch-rejection branch) means the backend is truly unreachable.
      setStatus(err instanceof ApiError && err.status !== null ? "degraded" : "down");
    } finally {
      if (slowTimer) clearTimeout(slowTimer);
      hasCheckedOnce.current = true;
    }
  }, []);

  useEffect(() => {
    void check();
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [check]);

  return { status, health, isSlow };
}

import type { ReactNode } from "react";

/**
 * Composition root for app-wide providers. Empty for now (D-F05: no global
 * state library) — the mount point exists so future providers have exactly
 * one place to attach.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

import { CATEGORICAL_FIELDS, type CategoricalFilterKey } from "@/components/FilterRail";

export type { CategoricalFilterKey };

// Shared with pages/products/params.ts (decisions.md D-F45) — both derive
// from FilterRail.tsx's single source of truth rather than redefining it.
export const CATEGORICAL_KEYS: CategoricalFilterKey[] = CATEGORICAL_FIELDS.map((field) => field.key);

// navigation.md §2 route tree: /search ?q + same filter params + ?style.
export interface SearchUrlParams extends Partial<Record<CategoricalFilterKey, string>> {
  q: string;
  min_gsm?: number;
  max_gsm?: number;
}

export function parseSearchParams(sp: URLSearchParams): SearchUrlParams {
  const params: SearchUrlParams = { q: sp.get("q") ?? "" };

  for (const key of CATEGORICAL_KEYS) {
    const value = sp.get(key);
    if (value) params[key] = value;
  }

  const minGsmRaw = sp.get("min_gsm");
  if (minGsmRaw !== null) {
    const n = Number(minGsmRaw);
    if (Number.isFinite(n)) params.min_gsm = n;
  }
  const maxGsmRaw = sp.get("max_gsm");
  if (maxGsmRaw !== null) {
    const n = Number(maxGsmRaw);
    if (Number.isFinite(n)) params.max_gsm = n;
  }

  return params;
}

export function hasActiveSearchFilters(params: SearchUrlParams): boolean {
  return (
    CATEGORICAL_KEYS.some((key) => Boolean(params[key])) ||
    params.min_gsm !== undefined ||
    params.max_gsm !== undefined
  );
}

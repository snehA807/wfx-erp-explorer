import { CATEGORICAL_FIELDS, type CategoricalFilterKey } from "@/components/FilterRail";
import type { ProductSortBy, SortOrder } from "@/lib/api";

// navigation.md §2 route tree: /products ?page ?sort_by ?order ?category
// ?fabric ?season ?color ?print ?min_gsm ?max_gsm ?supplier ?search ?style.
// This milestone's toolbar doesn't expose GSM range (that's the FilterRail
// full variant, M12f's Search page) or a supplier picker (GET
// /filters/options has no supplier facet to populate one from — decisions.md
// D-F40), so those two params are never produced by this UI. `search` has no
// backend counterpart on GET /products (decisions.md D-F40) — it's a
// client-side quick-filter over the fetched page, still URL-synced for
// round-trip.

export type { CategoricalFilterKey };

// Re-exported from FilterRail.tsx (the single source of truth for the 6
// categorical fields, decisions.md D-F45) rather than redefined here —
// pages/search/params.ts needs the identical list.
export const CATEGORICAL_KEYS: CategoricalFilterKey[] = CATEGORICAL_FIELDS.map((field) => field.key);

export type ProductsView = "grid" | "table";

export interface ProductsUrlParams extends Partial<Record<CategoricalFilterKey, string>> {
  page: number;
  sort_by: ProductSortBy;
  order: SortOrder;
  search: string;
  view: ProductsView;
}

const SORT_VALUES: ProductSortBy[] = ["style_number", "style_name", "selling_price", "gsm", "category"];
const ORDER_VALUES: SortOrder[] = ["asc", "desc"];

export function parseProductsParams(sp: URLSearchParams): ProductsUrlParams {
  const pageRaw = Number(sp.get("page"));
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;

  const sortByRaw = sp.get("sort_by");
  const sort_by = (SORT_VALUES as string[]).includes(sortByRaw ?? "") ? (sortByRaw as ProductSortBy) : "style_number";

  const orderRaw = sp.get("order");
  const order = (ORDER_VALUES as string[]).includes(orderRaw ?? "") ? (orderRaw as SortOrder) : "asc";

  const view: ProductsView = sp.get("view") === "table" ? "table" : "grid";
  const search = sp.get("search") ?? "";

  const params: ProductsUrlParams = { page, sort_by, order, search, view };
  for (const key of CATEGORICAL_KEYS) {
    const value = sp.get(key);
    if (value) params[key] = value;
  }
  return params;
}

export interface SortOption {
  value: string;
  label: string;
  sort_by: ProductSortBy;
  order: SortOrder;
}

export const SORT_OPTIONS: SortOption[] = [
  { value: "style_number:asc", label: "Style number (A–Z)", sort_by: "style_number", order: "asc" },
  { value: "style_name:asc", label: "Name (A–Z)", sort_by: "style_name", order: "asc" },
  { value: "style_name:desc", label: "Name (Z–A)", sort_by: "style_name", order: "desc" },
  { value: "selling_price:asc", label: "Price (low to high)", sort_by: "selling_price", order: "asc" },
  { value: "selling_price:desc", label: "Price (high to low)", sort_by: "selling_price", order: "desc" },
  { value: "gsm:asc", label: "GSM (low to high)", sort_by: "gsm", order: "asc" },
  { value: "gsm:desc", label: "GSM (high to low)", sort_by: "gsm", order: "desc" },
  { value: "category:asc", label: "Category (A–Z)", sort_by: "category", order: "asc" },
];

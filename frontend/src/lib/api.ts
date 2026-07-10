const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

export class ApiError extends Error {
  readonly code: string;
  readonly details: unknown;
  readonly status: number | null;

  constructor(params: {
    code: string;
    message: string;
    details?: unknown;
    status: number | null;
  }) {
    super(params.message);
    this.name = "ApiError";
    this.code = params.code;
    this.details = params.details ?? null;
    this.status = params.status;
  }
}

interface SuccessEnvelope<T> {
  data: T;
  meta: Record<string, unknown>;
}

interface ErrorEnvelopeBody {
  error: { code: string; message: string; details: unknown };
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T; meta: Record<string, unknown> }> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError({
      code: "NETWORK_ERROR",
      message: "Could not reach the server",
      status: null,
    });
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiError({
      code: "NETWORK_ERROR",
      message: "Received an invalid response from the server",
      status: response.status,
    });
  }

  if (!response.ok) {
    const error = (body as Partial<ErrorEnvelopeBody>).error;
    throw new ApiError({
      code: error?.code ?? "UNKNOWN_ERROR",
      message: error?.message ?? "Unknown error",
      details: error?.details,
      status: response.status,
    });
  }

  const success = body as SuccessEnvelope<T>;
  return { data: success.data, meta: success.meta ?? {} };
}

export interface HealthResponse {
  status: string;
  database: string;
  nl2sql_ready: boolean;
}

export async function getHealth(): Promise<HealthResponse> {
  const { data } = await request<HealthResponse>("/health");
  return data;
}

// backend/app/models/responses/dashboard.py — GET /dashboard/stats (M12d).
export interface DashboardTotals {
  finished_goods: number;
  suppliers: number;
  buyers: number;
  orders: number;
  revenue: number;
}

export interface CategoryRevenue {
  category: string | null;
  revenue: number;
}

export interface OrderStatusCount {
  status: string;
  count: number;
}

export interface RecentOrder {
  order_number: string;
  buyer_name: string;
  style_number: string;
  style_name: string;
  quantity: number;
  unit_price: number;
  status: string;
  shipment_date: string | null;
}

export interface DashboardStats {
  totals: DashboardTotals;
  revenue_by_category: CategoryRevenue[];
  order_status_counts: OrderStatusCount[];
  recent_orders: RecentOrder[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await request<DashboardStats>("/dashboard/stats");
  return data;
}

function buildQueryString(params: Record<string, unknown>): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    usp.set(key, String(value));
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

// backend/app/models/requests/products.py — GET /products (M12e).
export type ProductSortBy = "style_number" | "style_name" | "selling_price" | "gsm" | "category";
export type SortOrder = "asc" | "desc";

export interface ProductListParams {
  page?: number;
  page_size?: number;
  sort_by?: ProductSortBy;
  order?: SortOrder;
  category?: string;
  fabric?: string;
  color?: string;
  print?: string;
  season?: string;
  brand?: string;
  supplier_id?: string;
  min_price?: number;
  max_price?: number;
  min_gsm?: number;
  max_gsm?: number;
}

// backend/app/models/responses/products.py — shared list/card + detail shapes.
export interface ProductSummary {
  style_number: string;
  style_name: string;
  category: string | null;
  fabric: string;
  gsm: number;
  color: string | null;
  print: string | null;
  season: string | null;
  brand: string | null;
  cost: number | null;
  selling_price: number;
  image_url: string;
  supplier_name: string;
}

export interface ProductListMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export async function getProducts(
  params: ProductListParams,
): Promise<{ items: ProductSummary[]; meta: ProductListMeta }> {
  const { data, meta } = await request<ProductSummary[]>(
    `/products${buildQueryString(params as Record<string, unknown>)}`,
  );
  return {
    items: data,
    meta: {
      page: meta.page as number,
      page_size: meta.page_size as number,
      total: meta.total as number,
      total_pages: meta.total_pages as number,
    },
  };
}

export interface SupplierDetail {
  supplier_id: string;
  company_name: string;
  country: string | null;
  contact: string | null;
  lead_time_days: number;
  rating: number;
}

export interface TechPackDetail {
  tech_pack_id: string;
  fabric_details: string | null;
  construction: string | null;
  wash_instructions: string | null;
}

export interface ProductDetailData {
  style_number: string;
  style_name: string;
  category: string | null;
  fabric: string;
  gsm: number;
  color: string | null;
  print: string | null;
  season: string | null;
  brand: string | null;
  cost: number | null;
  selling_price: number;
  image_url: string;
  supplier: SupplierDetail;
  tech_pack: TechPackDetail | null;
}

export async function getProductDetail(styleNumber: string): Promise<ProductDetailData> {
  const { data } = await request<ProductDetailData>(`/products/${encodeURIComponent(styleNumber)}`);
  return data;
}

export async function getSimilarProducts(styleNumber: string, limit = 6): Promise<ProductSummary[]> {
  const { data } = await request<ProductSummary[]>(
    `/products/${encodeURIComponent(styleNumber)}/similar${buildQueryString({ limit })}`,
  );
  return data;
}

// backend/app/models/responses/filters.py — GET /filters/options.
export interface FacetValue {
  value: string;
  count: number;
}

export interface RangeFacet {
  min: number;
  max: number;
}

export interface FilterOptionsData {
  category: FacetValue[];
  fabric: FacetValue[];
  color: FacetValue[];
  print: FacetValue[];
  season: FacetValue[];
  brand: FacetValue[];
  gsm: RangeFacet;
  selling_price: RangeFacet;
}

export async function getFilterOptions(): Promise<FilterOptionsData> {
  const { data } = await request<FilterOptionsData>("/filters/options");
  return data;
}

// backend/app/models/requests/search.py — POST /search/products, /search/visual (M12f).
export interface SearchProductsParams {
  query: string;
  limit?: number;
  category?: string;
  fabric?: string;
  color?: string;
  print?: string;
  season?: string;
  brand?: string;
  supplier_id?: string;
  min_price?: number;
  max_price?: number;
  min_gsm?: number;
  max_gsm?: number;
}

export interface SearchVisualParams {
  query: string;
  limit?: number;
}

// backend/app/models/responses/search.py — ProductSummary + a similarity score.
export interface SearchHit extends ProductSummary {
  score: number;
}

function stripUndefined<T extends Record<string, unknown>>(params: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

export async function searchProducts(params: SearchProductsParams): Promise<SearchHit[]> {
  const { data } = await request<SearchHit[]>("/search/products", {
    method: "POST",
    body: JSON.stringify(stripUndefined(params as unknown as Record<string, unknown>)),
  });
  return data;
}

export async function searchVisual(params: SearchVisualParams): Promise<SearchHit[]> {
  const { data } = await request<SearchHit[]>("/search/visual", {
    method: "POST",
    body: JSON.stringify(stripUndefined(params as unknown as Record<string, unknown>)),
  });
  return data;
}

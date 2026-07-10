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

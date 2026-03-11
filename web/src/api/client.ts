import { toast } from "sonner";
import { supabase } from "../lib/supabase";

export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
  status: number;
};

export type ApiSuccessEnvelope<T> = {
  ok: true;
  data: T;
};

export type ApiErrorEnvelope = {
  ok: false;
  error: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

export type ApiAuthMode = "auto" | "bearer" | "cookie" | "none";

export type ApiFetchConfig = {
  silent?: boolean;
  authMode?: ApiAuthMode;
};

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function resolveBaseUrl(): string {
  const configured = String(import.meta.env.VITE_API_URL || "").trim();
  if (!configured) {
    return "";
  }

  if (typeof window === "undefined") {
    return stripTrailingSlash(configured);
  }

  try {
    const parsed = new URL(configured, window.location.origin);
    const currentHost = window.location.hostname.toLowerCase();
    const targetHost = parsed.hostname.toLowerCase();

    const currentIsLoopback = LOOPBACK_HOSTS.has(currentHost);
    const targetIsLoopback = LOOPBACK_HOSTS.has(targetHost);

    if (!currentIsLoopback && targetIsLoopback) {
      return "";
    }

    return stripTrailingSlash(parsed.toString());
  } catch {
    return "";
  }
}

const BASE_URL = resolveBaseUrl();
export const CUSTOM_AUTH_TOKEN_KEY = "sypev_custom_access_token";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getCustomAccessToken(): string | null {
  if (!canUseStorage()) {
    return null;
  }
  return window.localStorage.getItem(CUSTOM_AUTH_TOKEN_KEY);
}

export function setCustomAccessToken(token: string) {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.setItem(CUSTOM_AUTH_TOKEN_KEY, token);
}

export function clearCustomAccessToken() {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.removeItem(CUSTOM_AUTH_TOKEN_KEY);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isApiSuccessEnvelope<T>(value: unknown): value is ApiSuccessEnvelope<T> {
  return isObject(value) && value.ok === true && "data" in value;
}

function isApiErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  return isObject(value) && value.ok === false && isObject(value.error);
}

function getDefaultErrorForStatus(status: number): Pick<ApiError, "code" | "message"> {
  if (status === 401) {
    return { code: "UNAUTHORIZED", message: "Authentication required" };
  }

  if (status === 403) {
    return { code: "FORBIDDEN", message: "Access denied" };
  }

  if (status === 429) {
    return {
      code: "RATE_LIMIT",
      message: "Too many requests. Please wait and try again.",
    };
  }

  if (status >= 500) {
    return {
      code: "INTERNAL_ERROR",
      message: "Server error. Please try again shortly.",
    };
  }

  return {
    code: "REQUEST_FAILED",
    message: "Request failed",
  };
}

function buildApiError(
  status: number,
  partial: Partial<ApiError> = {},
): ApiError {
  const defaults = getDefaultErrorForStatus(status);

  return {
    status,
    code: partial.code || defaults.code,
    message: partial.message || defaults.message,
    details: partial.details,
  };
}

function shouldShowToast(error: ApiError, silent: boolean): boolean {
  if (silent) {
    return false;
  }

  if ([400, 401, 403, 409, 429].includes(error.status)) {
    return false;
  }

  return true;
}

function resolveRoutePath(path: string): string {
  if (!path.startsWith("http")) {
    return path;
  }

  try {
    return new URL(path).pathname;
  } catch {
    return path;
  }
}

function shouldIncludeCredentials(path: string, authMode: ApiAuthMode): boolean {
  if (authMode === "cookie") {
    return true;
  }

  if (authMode === "none" || authMode === "bearer") {
    return false;
  }

  const routePath = resolveRoutePath(path);
  return routePath.startsWith("/api/admin") || routePath.startsWith("/api/auth/admin-");
}

function shouldAttachBearer(authMode: ApiAuthMode): boolean {
  return authMode === "auto" || authMode === "bearer";
}

async function parseJsonSafely(response: Response): Promise<unknown | null> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  config: ApiFetchConfig = {},
): Promise<T> {
  const authMode = config.authMode ?? "auto";

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const customToken = getCustomAccessToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && options.body !== undefined) {
    if (!(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
  }

  if (shouldAttachBearer(authMode)) {
    if (session?.access_token) {
      headers.set("Authorization", `Bearer ${session.access_token}`);
    } else if (customToken) {
      headers.set("Authorization", `Bearer ${customToken}`);
    }
  }

  const fullUrl = path.startsWith("http") ? path : `${BASE_URL}${path}`;

  let response: Response;
  try {
    response = await fetch(fullUrl, {
      ...options,
      headers,
      credentials: shouldIncludeCredentials(path, authMode) ? "include" : "omit",
    });
  } catch {
    const networkError = buildApiError(0, {
      code: "NETWORK_ERROR",
      message: "Network error. Please check your connection and try again.",
    });

    if (shouldShowToast(networkError, Boolean(config.silent))) {
      toast.error(networkError.message);
    }

    throw networkError;
  }

  const payload = await parseJsonSafely(response);

  if (isApiErrorEnvelope(payload)) {
    const apiError = buildApiError(response.status, {
      code: payload.error.code,
      message: payload.error.message,
      details: payload.error.details,
    });

    if (shouldShowToast(apiError, Boolean(config.silent))) {
      toast.error(apiError.message);
    }

    throw apiError;
  }

  if (isApiSuccessEnvelope<T>(payload)) {
    if (!response.ok) {
      const apiError = buildApiError(response.status, {
        code: "REQUEST_FAILED",
        message: "Request failed",
      });

      if (shouldShowToast(apiError, Boolean(config.silent))) {
        toast.error(apiError.message);
      }

      throw apiError;
    }

    return payload.data;
  }

  if (!response.ok) {
    const fallbackError = buildApiError(response.status);

    if (shouldShowToast(fallbackError, Boolean(config.silent))) {
      toast.error(fallbackError.message);
    }

    throw fallbackError;
  }

  const contractError = buildApiError(response.status || 500, {
    code: "CONTRACT_MISMATCH",
    message: "Invalid API response envelope",
    details: payload,
  });

  if (shouldShowToast(contractError, Boolean(config.silent))) {
    toast.error(contractError.message);
  }

  throw contractError;
}

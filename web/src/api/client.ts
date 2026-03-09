import { toast } from "sonner";
import { supabase } from "../lib/supabase";

export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
  status?: number;
};

const BASE_URL = import.meta.env.VITE_API_URL || "";
export const CUSTOM_AUTH_TOKEN_KEY = "test_bro_custom_access_token";

export function getCustomAccessToken(): string | null {
  return localStorage.getItem(CUSTOM_AUTH_TOKEN_KEY);
}

export function setCustomAccessToken(token: string) {
  localStorage.setItem(CUSTOM_AUTH_TOKEN_KEY, token);
}

export function clearCustomAccessToken() {
  localStorage.removeItem(CUSTOM_AUTH_TOKEN_KEY);
}

function buildFallbackError(status: number, message: string): ApiError {
  if (status === 429) {
    return {
      code: "RATE_LIMIT",
      message: "Too many requests. Please wait and try again.",
      status,
    };
  }

  return {
    code: "REQUEST_FAILED",
    message,
    status,
  };
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  config: { silent?: boolean } = {},
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const customToken = getCustomAccessToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  } else if (customToken) {
    headers.set("Authorization", `Bearer ${customToken}`);
  }

  const fullUrl = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const isAdminRoute = path.includes("/admin");

  let res: Response;
  try {
    res = await fetch(fullUrl, {
      ...options,
      headers,
      credentials: isAdminRoute ? "include" : "omit",
    });
  } catch {
    const networkError: ApiError = {
      code: "NETWORK_ERROR",
      message: "Network error. Please check your connection and try again.",
      status: 0,
    };
    if (!config.silent) {
      toast.error(networkError.message);
    }
    throw networkError;
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    const fallback = buildFallbackError(
      res.status,
      res.ok ? "Unexpected non-JSON response" : "Request failed",
    );

    if (!config.silent) {
      toast.error(fallback.message);
    }

    throw fallback;
  }

  if (!data.ok) {
    const err = {
      ...(data.error as ApiError),
      status: res.status,
    } as ApiError;

    if (!err.code) {
      err.code = res.status === 429 ? "RATE_LIMIT" : "REQUEST_FAILED";
    }

    if (!err.message) {
      err.message =
        res.status === 429
          ? "Too many requests. Please wait and try again."
          : "Request failed";
    }

    if (!config.silent && ![400, 401, 403, 409, 429].includes(res.status)) {
      toast.error(err.message || "Request failed");
    }

    throw err;
  }

  return data.data as T;
}

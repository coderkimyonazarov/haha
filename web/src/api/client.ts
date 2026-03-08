import { toast } from "sonner";
import { supabase } from "../lib/supabase";

export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

const BASE_URL = import.meta.env.VITE_API_URL || "";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  config: { silent?: boolean } = {}
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  const fullUrl = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const isAdminRoute = path.includes("/admin");

  const res = await fetch(fullUrl, {
    ...options,
    headers,
    credentials: isAdminRoute ? "include" : "omit" // Admin relies on cross-domain cookies
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    const fallback = {
      ok: false,
      error: {
        code: "NON_JSON_RESPONSE",
        message: res.ok ? "Unexpected non-JSON response" : "Request failed"
      }
    };
    if (!config.silent) {
      toast.error(fallback.error.message);
    }
    throw fallback.error;
  }
  if (!data.ok) {
    const err = data.error as ApiError;
    if (!config.silent) {
      toast.error(err.message || "Request failed");
    }
    throw err;
  }
  return data.data as T;
}

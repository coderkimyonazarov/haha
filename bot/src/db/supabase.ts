import { createClient } from "@supabase/supabase-js";
import { config } from "./config";

/**
 * Singleton Supabase client using the service-role key.
 * This bypasses RLS — safe because the bot runs server-side.
 */
export const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

/** Convenience wrapper: throw on Supabase error */
export async function sbQuery<T>(
  promise: Promise<{ data: T | null; error: any }>,
): Promise<T> {
  const { data, error } = await promise;
  if (error) throw new Error(`Supabase error: ${error.message}`);
  if (data === null) throw new Error("Supabase: no data returned");
  return data;
}

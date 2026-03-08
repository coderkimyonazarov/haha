import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

let adminClient: SupabaseClient | null = null;
let anonClient: SupabaseClient | null = null;

function assertSupabaseUrlConfigured() {
  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL is missing");
  }
}

function assertSupabaseServiceKeyConfigured() {
  if (!supabaseServiceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing");
  }
}

function assertSupabaseAnonKeyConfigured() {
  if (!supabaseAnonKey) {
    throw new Error("SUPABASE_ANON_KEY is missing");
  }
}

export function getSupabaseAdmin() {
  if (!adminClient) {
    assertSupabaseUrlConfigured();
    assertSupabaseServiceKeyConfigured();
    adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}

export function getSupabaseAnon() {
  if (!anonClient) {
    assertSupabaseUrlConfigured();
    assertSupabaseAnonKeyConfigured();
    anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return anonClient;
}

export function getSupabaseConfigStatus() {
  return {
    hasUrl: Boolean(supabaseUrl),
    hasAnonKey: Boolean(supabaseAnonKey),
    hasServiceRoleKey: Boolean(supabaseServiceKey),
  };
}

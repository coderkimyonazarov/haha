import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;
let anonClient: SupabaseClient | null = null;

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
}

function getSupabaseAnonKey() {
  return process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
}

function getSupabaseServiceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function assertSupabaseUrlConfigured(supabaseUrl: string) {
  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL is missing");
  }
}

function assertSupabaseServiceKeyConfigured(supabaseServiceKey: string) {
  if (!supabaseServiceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing");
  }
}

function assertSupabaseAnonKeyConfigured(supabaseAnonKey: string) {
  if (!supabaseAnonKey) {
    throw new Error("SUPABASE_ANON_KEY is missing");
  }
}

export function getSupabaseAdmin() {
  if (!adminClient) {
    const supabaseUrl = getSupabaseUrl();
    const supabaseServiceKey = getSupabaseServiceKey();
    assertSupabaseUrlConfigured(supabaseUrl);
    assertSupabaseServiceKeyConfigured(supabaseServiceKey);
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
    const supabaseUrl = getSupabaseUrl();
    const supabaseAnonKey = getSupabaseAnonKey();
    assertSupabaseUrlConfigured(supabaseUrl);
    assertSupabaseAnonKeyConfigured(supabaseAnonKey);
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
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();
  const supabaseServiceKey = getSupabaseServiceKey();

  return {
    hasUrl: Boolean(supabaseUrl),
    hasAnonKey: Boolean(supabaseAnonKey),
    hasServiceRoleKey: Boolean(supabaseServiceKey),
  };
}

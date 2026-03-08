import { createClient } from "@supabase/supabase-js";

// Note: Ensure your environment variables in Vercel begin with "VITE_" so the frontend can read them!
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://bmirtosteqbwiysgicjx.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaXJ0b3N0ZXFid2l5c2dpY2p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMDEyNTcsImV4cCI6MjA4NzU3NzI1N30.l_CVoYcOeXS_XIoilL9QKZBRyQUE88q6n7H5LjaEI50";

if (supabaseUrl.includes("placeholder")) {
  console.warn(
    "VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing! Auth will fail. Please set them in your environment variables.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

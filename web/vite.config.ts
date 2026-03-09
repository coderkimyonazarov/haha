import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const webRoot = __dirname;
  const repoRoot = path.resolve(__dirname, "..");
  const serverRoot = path.resolve(__dirname, "../server");

  const webEnv = loadEnv(mode, webRoot, "");
  const rootEnv = loadEnv(mode, repoRoot, "");
  const serverEnv = loadEnv(mode, serverRoot, "");

  const viteApiUrl =
    webEnv.VITE_API_URL ||
    rootEnv.VITE_API_URL ||
    serverEnv.VITE_API_URL ||
    "http://localhost:5000";
  const viteSupabaseUrl =
    webEnv.VITE_SUPABASE_URL ||
    rootEnv.VITE_SUPABASE_URL ||
    serverEnv.VITE_SUPABASE_URL ||
    serverEnv.SUPABASE_URL ||
    "";
  const viteSupabaseAnonKey =
    webEnv.VITE_SUPABASE_ANON_KEY ||
    rootEnv.VITE_SUPABASE_ANON_KEY ||
    serverEnv.VITE_SUPABASE_ANON_KEY ||
    serverEnv.SUPABASE_ANON_KEY ||
    "";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      "import.meta.env.VITE_API_URL": JSON.stringify(viteApiUrl),
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(viteSupabaseUrl),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(viteSupabaseAnonKey),
    },
    server: {
      proxy: {
        "/api": "http://localhost:5000",
      },
    },
  };
});

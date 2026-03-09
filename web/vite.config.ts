import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

function readViteEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const result: Record<string, string> = {};
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalIndex = line.indexOf("=");
    if (equalIndex <= 0) {
      continue;
    }

    const key = line.slice(0, equalIndex).trim();
    if (!key.startsWith("VITE_")) {
      continue;
    }

    const rawValue = line.slice(equalIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    result[key] = value;
  }

  return result;
}

export default defineConfig(({ mode }) => {
  const webRoot = __dirname;
  const repoRoot = path.resolve(__dirname, "..");

  const webEnv = loadEnv(mode, webRoot, "VITE_");
  const rootEnv = loadEnv(mode, repoRoot, "VITE_");
  const serverDotEnv = readViteEnvFile(path.resolve(repoRoot, "server/.env"));
  const rootDotEnv = readViteEnvFile(path.resolve(repoRoot, ".env"));

  const viteApiUrl =
    process.env.VITE_API_URL ||
    webEnv.VITE_API_URL ||
    rootEnv.VITE_API_URL ||
    rootDotEnv.VITE_API_URL ||
    serverDotEnv.VITE_API_URL ||
    "";
  const viteSupabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    webEnv.VITE_SUPABASE_URL ||
    rootEnv.VITE_SUPABASE_URL ||
    rootDotEnv.VITE_SUPABASE_URL ||
    serverDotEnv.VITE_SUPABASE_URL ||
    "";
  const viteSupabaseAnonKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    webEnv.VITE_SUPABASE_ANON_KEY ||
    rootEnv.VITE_SUPABASE_ANON_KEY ||
    rootDotEnv.VITE_SUPABASE_ANON_KEY ||
    serverDotEnv.VITE_SUPABASE_ANON_KEY ||
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

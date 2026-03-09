import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

const cwd = process.cwd();
const envCandidates = Array.from(
  new Set([
    path.resolve(cwd, ".env"),
    path.resolve(cwd, "../.env"),
    path.resolve(cwd, "server/.env"),
    path.resolve(cwd, "../server/.env"),
    path.resolve(cwd, "bot/.env"),
    path.resolve(cwd, "../bot/.env"),
  ]),
);

for (const envPath of envCandidates) {
  dotenv.config({ path: envPath, override: false });
}

const inferredNodeEnv =
  process.env.NODE_ENV === "production"
    ? "production"
    : process.env.NODE_ENV === "test"
      ? "test"
      : "development";

if (!process.env.BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN) {
  process.env.BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
}

if (!process.env.BOT_INTERNAL_API_KEY) {
  process.env.BOT_INTERNAL_API_KEY =
    process.env.APP_AUTH_JWT_SECRET || process.env.ADMIN_SECRET || "";
}

if (!process.env.BACKEND_API_URL) {
  process.env.BACKEND_API_URL =
    inferredNodeEnv === "development" ? "http://localhost:5000" : "https://www.sypev.com";
}

if (!process.env.BOT_WEB_APP_URL) {
  process.env.BOT_WEB_APP_URL =
    process.env.APP_URL ||
    (inferredNodeEnv === "development" ? "http://localhost:5173" : "https://www.sypev.com");
}

const envSchema = z.object({
  BOT_TOKEN: z.string().min(20, "BOT_TOKEN is required"),
  BOT_INTERNAL_API_KEY: z.string().min(24, "BOT_INTERNAL_API_KEY is required"),
  BACKEND_API_URL: z.string().url().default("https://www.sypev.com"),
  BOT_WEB_APP_URL: z.string().url().default("https://www.sypev.com"),
  BOT_BRAND_ANIMATION_URL: z.string().url().optional(),
  BOT_BRAND_ANIMATION_COOLDOWN_SEC: z.coerce.number().int().min(60).max(86400).default(21600),
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default(inferredNodeEnv),
  BOT_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(2000).max(30000).default(12000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("[bot] Invalid environment variables", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  ...parsed.data,
  BACKEND_API_URL: parsed.data.BACKEND_API_URL.replace(/\/$/, ""),
  BOT_WEB_APP_URL: parsed.data.BOT_WEB_APP_URL.replace(/\/$/, ""),
  BOT_BRAND_ANIMATION_URL:
    parsed.data.BOT_BRAND_ANIMATION_URL || `${parsed.data.BOT_WEB_APP_URL.replace(/\/$/, "")}/brand/sypev-logo-animated.gif`,
  TELEGRAM_BOT_USERNAME: parsed.data.TELEGRAM_BOT_USERNAME
    ? parsed.data.TELEGRAM_BOT_USERNAME.replace(/^@/, "")
    : undefined,
};

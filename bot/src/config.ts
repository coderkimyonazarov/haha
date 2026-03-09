import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  BOT_TOKEN: z.string().min(20, "BOT_TOKEN is required"),
  BOT_INTERNAL_API_KEY: z.string().min(24, "BOT_INTERNAL_API_KEY is required"),
  BACKEND_API_URL: z.string().url().default("https://www.sypev.com"),
  BOT_WEB_APP_URL: z.string().url().default("https://www.sypev.com"),
  BOT_BRAND_ANIMATION_URL: z.string().url().optional(),
  BOT_BRAND_ANIMATION_COOLDOWN_SEC: z.coerce.number().int().min(60).max(86400).default(21600),
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
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

import "dotenv/config";
import { z } from "zod";

const serverEnvSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  DB_PATH: z.string().default("./data/dev.sqlite"),
  APP_URL: z.string().default("http://localhost:5173"),

  // Admin
  ADMIN_USERNAME: z.string().default("admin"),
  ADMIN_PASSWORD_HASH: z.string().optional(), // argon2 hash of admin password
  ADMIN_PASSWORD: z.string().optional(), // fallback plaintext (dev only)
  ADMIN_SECRET: z
    .string()
    .min(16)
    .default("sypev_admin_secret_key_change_in_production"),

  // Telegram Login Widget
  TELEGRAM_BOT_TOKEN: z.string().optional(),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),

  // SMTP
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional().default("Sypev <no-reply@sypev.com>"),

  // SMS Provider
  SMS_PROVIDER: z.enum(["dev", "twilio"]).default("dev"),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),

  // CORS
  CORS_ORIGIN: z.string().optional().default("http://localhost:5173"),

  // AI Provider (existing)
  OPENAI_API_KEY: z.string().optional(),
  APP_VERSION: z.string().optional().default("0.2.0"),
});

const parsed = serverEnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid server environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  // Don't exit — allow dev to start with minimal config
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
}

export const serverConfig = parsed.success
  ? parsed.data
  : (serverEnvSchema.parse({}) as z.infer<typeof serverEnvSchema>);

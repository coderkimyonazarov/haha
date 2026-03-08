import { createHmac, createHash } from "crypto";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

// ── Validate Telegram Login Widget Data ───────────────────────────────────────
// Uses HMAC-SHA256 with bot token as key, per Telegram docs:
// https://core.telegram.org/widgets/login#checking-authorization
export function validateTelegramAuth(
  data: TelegramAuthData,
  botToken: string,
): boolean {
  if (!data || !data.hash || !data.id || !data.auth_date) {
    return false;
  }

  // Reject data older than 1 day (replay protection)
  const now = Math.floor(Date.now() / 1000);
  if (now - data.auth_date > 86400) {
    return false;
  }

  // Build the check string (all fields except hash, sorted alphabetically)
  const record = data as unknown as Record<string, unknown>;
  const checkArr: string[] = [];
  for (const key of Object.keys(record).sort()) {
    if (key === "hash") continue;
    checkArr.push(`${key}=${record[key]}`);
  }
  const checkString = checkArr.join("\n");

  // For Login Widget, the secret is SHA256(bot_token)
  const secret = createHash("sha256").update(botToken).digest();
  const hmac = createHmac("sha256", secret).update(checkString).digest("hex");

  return hmac === data.hash;
}

export function getTelegramDisplayName(data: TelegramAuthData): string {
  return [data.first_name, data.last_name].filter(Boolean).join(" ") || "User";
}

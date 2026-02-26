import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { supabase } from "../db/supabase";
import type { BotUser } from "../types";

// ─── Password hashing (Argon2id) ─────────────────────────────────────────────

const ARGON_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 4,
};

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON_OPTIONS);
}

export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

// ─── JWT session tokens ───────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string; // user UUID
  telegramId: string;
  iat?: number;
  exp?: number;
}

export function signJwt(userId: string, telegramId: string): string {
  return jwt.sign(
    { sub: userId, telegramId } satisfies JwtPayload,
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN as any },
  );
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, config.JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

// ─── Suspicious login detection ───────────────────────────────────────────────

const SUSPICIOUS_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const SUSPICIOUS_FAIL_THRESHOLD = 5;

/**
 * Returns true if >5 failed attempts for this user in the last hour.
 * Also logs the current attempt.
 */
export async function recordAndCheckSuspicious(
  userId: string,
  telegramId: string,
  success: boolean,
  identifier?: string,
): Promise<boolean> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - SUSPICIOUS_WINDOW_MS);

  // Log this attempt
  await supabase.from("login_attempts").insert({
    user_id: userId || null,
    telegram_id: String(telegramId),
    identifier: identifier || null,
    success,
    created_at: now.toISOString(),
  });

  if (success) return false;

  // Count recent failures
  const { count } = await supabase
    .from("login_attempts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("success", false)
    .gte("created_at", windowStart.toISOString());

  return (count ?? 0) >= SUSPICIOUS_FAIL_THRESHOLD;
}

/**
 * Sends an alert to the admin chat if the bot is configured for it.
 * Called from conversations when suspicious activity is detected.
 */
export async function buildSuspiciousAlert(
  user: BotUser,
  telegramId: string,
): Promise<string> {
  return (
    `🚨 <b>Suspicious Login Detected</b>\n` +
    `👤 User: <code>${user.name}</code> (${user.id.slice(0, 8)}…)\n` +
    `📱 Telegram ID: <code>${telegramId}</code>\n` +
    `🕐 Time: ${new Date().toUTCString()}\n\n` +
    `⚠️ More than ${SUSPICIOUS_FAIL_THRESHOLD} failed attempts in the last hour.`
  );
}

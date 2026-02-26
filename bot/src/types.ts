// ─── Domain types shared across the bot ────────────────────────────────────

export type IdentifierType = "email" | "phone" | "telegram_id" | "username";

export interface BotUser {
  id: string;
  name: string;
  passwordHash: string | null;
  isVerified: boolean;
  isAdmin: boolean;
  isBanned: boolean;
  createdAt: string;
}

export interface LinkedIdentifier {
  id: number;
  userId: string;
  type: IdentifierType;
  value: string;
  isVerified: boolean;
  linkedAt: string;
}

export interface OtpCode {
  id: number;
  userId: string;
  target: string;
  code: string;
  purpose: "verify" | "login" | "link";
  attempts: number;
  isUsed: boolean;
  expiresAt: string;
}

export interface LoginAttempt {
  id: number;
  userId: string | null;
  identifier: string | null;
  telegramId: string | null;
  success: boolean;
  ipHint: string | null;
  createdAt: string;
}

// ─── Session data stored per Telegram user ─────────────────────────────────

export interface SessionData {
  userId?: string; // Sypev user UUID after login
  jwtToken?: string;
  pendingIdentifier?: string;
  pendingType?: IdentifierType;
  loginAttempts?: number; // failed attempts this session
  lastOtpSentAt?: number; // epoch ms, for cooldown check
}

// ─── Resolved identity result ──────────────────────────────────────────────

export interface IdentityResult {
  user: BotUser;
  linkedIds: LinkedIdentifier[];
}

// ─── Detector helper ───────────────────────────────────────────────────────

/**
 * Detects the type of an identifier string.
 * Returns null if it cannot be classified.
 */
export function detectIdentifierType(raw: string): IdentifierType | null {
  const s = raw.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return "email";
  if (/^\+?[0-9]{7,15}$/.test(s.replace(/[\s\-()]/g, ""))) return "phone";
  if (/^[a-zA-Z0-9_]{3,32}$/.test(s)) return "username";
  return null;
}

/** Normalise phone to E.164-like (strip spaces/dashes) */
export function normalisePhone(p: string): string {
  return p.replace(/[\s\-()]/g, "");
}

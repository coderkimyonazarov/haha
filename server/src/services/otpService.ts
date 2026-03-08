import { randomUUID, randomInt, createHash } from "crypto";
import { eq, and, gt } from "drizzle-orm";
import { getDb } from "../db";
import { otpCodes } from "../db/schema";

// ── Config ────────────────────────────────────────────────────────────────────
const OTP_LENGTH = 6;
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_OTPS_PER_WINDOW = 3;

// ── Generate OTP ──────────────────────────────────────────────────────────────
function generateCode(): string {
  // Generate a secure 6-digit code (100000-999999)
  return String(randomInt(100000, 999999 + 1));
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

// ── Create OTP ────────────────────────────────────────────────────────────────
export async function createOtp(
  userId: string | null,
  target: string,
  purpose: string,
): Promise<string> {
  const db = getDb();
  const now = Date.now();

  // Rate limit: check recent OTP count for this target
  const recentOtps = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.target, target.toLowerCase().trim()),
        gt(otpCodes.createdAt, now - RATE_LIMIT_WINDOW_MS),
      ),
    );

  if (recentOtps.length >= MAX_OTPS_PER_WINDOW) {
    throw new Error(
      "Too many OTP requests. Please wait before requesting another code.",
    );
  }

  const code = generateCode();
  const id = randomUUID();

  await db.insert(otpCodes).values({
    id,
    userId,
    target: target.toLowerCase().trim(),
    purpose,
    codeHash: hashCode(code),
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    expiresAt: now + OTP_EXPIRY_MS,
    usedAt: null,
    createdAt: now,
  });

  return code;
}

// ── Verify OTP ────────────────────────────────────────────────────────────────
export async function verifyOtp(
  target: string,
  code: string,
  purpose: string,
): Promise<{ valid: boolean; userId?: string | null; error?: string }> {
  const db = getDb();
  const now = Date.now();
  const normalizedTarget = target.toLowerCase().trim();

  // Find the most recent unused, non-expired OTP for this target+purpose
  const otps = await db
    .select()
    .from(otpCodes)
    .where(
      and(eq(otpCodes.target, normalizedTarget), eq(otpCodes.purpose, purpose)),
    );

  // Find the latest valid OTP
  const validOtp = otps
    .filter((o) => !o.usedAt && o.expiresAt > now)
    .sort((a, b) => b.createdAt - a.createdAt)[0];

  if (!validOtp) {
    return {
      valid: false,
      error: "No valid OTP found. Please request a new code.",
    };
  }

  // Check max attempts
  if (validOtp.attempts >= validOtp.maxAttempts) {
    return {
      valid: false,
      error: "Too many failed attempts. Please request a new code.",
    };
  }

  // Increment attempt count
  await db
    .update(otpCodes)
    .set({ attempts: validOtp.attempts + 1 })
    .where(eq(otpCodes.id, validOtp.id));

  // Verify the code
  const codeHash = hashCode(code.trim());
  if (codeHash !== validOtp.codeHash) {
    const remaining = validOtp.maxAttempts - validOtp.attempts - 1;
    return {
      valid: false,
      error: `Invalid code. ${remaining} attempt(s) remaining.`,
    };
  }

  // Mark as used
  await db
    .update(otpCodes)
    .set({ usedAt: now })
    .where(eq(otpCodes.id, validOtp.id));

  return { valid: true, userId: validOtp.userId };
}

// ── Cleanup expired OTPs (call periodically) ──────────────────────────────────
export async function cleanupExpiredOtps() {
  const db = getDb();
  const now = Date.now();
  const cutoff = now - 24 * 60 * 60 * 1000; // 24 hours ago

  await db
    .delete(otpCodes)
    .where(and(gt(otpCodes.expiresAt, 0), eq(otpCodes.expiresAt, cutoff)));
}

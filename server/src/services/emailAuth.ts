import nodemailer from "nodemailer";
import { randomUUID, createHash } from "crypto";
import { eq, and, gt } from "drizzle-orm";
import { getDb } from "../db";
import { passwordResets, users, emailVerifications } from "../db/schema";

// ── Config ────────────────────────────────────────────────────────────────────
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const VERIFICATION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Mailer ────────────────────────────────────────────────────────────────────
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    // Dev fallback: log emails to console
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || "Sypev <no-reply@sypev.com>";

  if (!transporter) {
    console.log(`[EMAIL-DEV] To: ${to} | Subject: ${subject}`);
    console.log(`[EMAIL-DEV] Body: ${html}`);
    return true;
  }

  try {
    await transporter.sendMail({ from, to, subject, html });
    return true;
  } catch (error) {
    console.error("[EMAIL] Send failed:", error);
    return false;
  }
}

// ── Password Reset ────────────────────────────────────────────────────────────
export async function createPasswordResetToken(
  email: string,
): Promise<string | null> {
  const db = getDb();
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .get();

  if (!user) return null; // Don't reveal whether email exists

  const token = randomUUID();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const now = Date.now();

  await db.insert(passwordResets).values({
    id: randomUUID(),
    userId: user.id,
    tokenHash,
    expiresAt: now + RESET_TOKEN_EXPIRY_MS,
    usedAt: null,
    createdAt: now,
  });

  return token;
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
): Promise<boolean> {
  const baseUrl = process.env.APP_URL || "http://localhost:5173";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  return sendEmail(
    email,
    "Reset Your Sypev Password",
    `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #6366f1;">Reset Your Password</h2>
      <p>Click the button below to reset your password. This link expires in 1 hour.</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
        Reset Password
      </a>
      <p style="font-size: 13px; color: #666; margin-top: 16px;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
    `,
  );
}

export async function verifyPasswordResetToken(
  token: string,
): Promise<string | null> {
  const db = getDb();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const now = Date.now();

  const reset = await db
    .select()
    .from(passwordResets)
    .where(
      and(
        eq(passwordResets.tokenHash, tokenHash),
        gt(passwordResets.expiresAt, now),
      ),
    )
    .get();

  if (!reset || reset.usedAt) return null;

  // Mark as used
  await db
    .update(passwordResets)
    .set({ usedAt: now })
    .where(eq(passwordResets.id, reset.id));

  return reset.userId;
}

// ── Email Verification ────────────────────────────────────────────────────────
export async function createEmailVerification(
  userId: string,
  email: string,
): Promise<string> {
  const db = getDb();
  const token = randomUUID();
  const now = Date.now();

  await db.insert(emailVerifications).values({
    id: randomUUID(),
    userId,
    email: email.toLowerCase().trim(),
    token,
    expiresAt: now + VERIFICATION_EXPIRY_MS,
    verifiedAt: null,
    createdAt: now,
  });

  return token;
}

export async function sendVerificationEmail(
  email: string,
  token: string,
): Promise<boolean> {
  const baseUrl = process.env.APP_URL || "http://localhost:5173";
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

  return sendEmail(
    email,
    "Verify Your Email — Sypev",
    `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #6366f1;">Verify Your Email</h2>
      <p>Click the button below to verify your email address.</p>
      <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
        Verify Email
      </a>
    </div>
    `,
  );
}

export async function verifyEmailToken(
  token: string,
): Promise<{ userId: string; email: string } | null> {
  const db = getDb();
  const now = Date.now();

  const verification = await db
    .select()
    .from(emailVerifications)
    .where(
      and(
        eq(emailVerifications.token, token),
        gt(emailVerifications.expiresAt, now),
      ),
    )
    .get();

  if (!verification || verification.verifiedAt) return null;

  await db
    .update(emailVerifications)
    .set({ verifiedAt: now })
    .where(eq(emailVerifications.id, verification.id));

  // Mark user as verified
  await db
    .update(users)
    .set({ isVerified: 1, updatedAt: now })
    .where(eq(users.id, verification.userId));

  return { userId: verification.userId, email: verification.email };
}

// ── Send OTP via Email ────────────────────────────────────────────────────────
export async function sendOtpEmail(
  email: string,
  code: string,
): Promise<boolean> {
  return sendEmail(
    email,
    "Your Login Code — Sypev",
    `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #6366f1;">Your Verification Code</h2>
      <p style="font-size: 32px; font-weight: bold; color: #111; letter-spacing: 6px;">${code}</p>
      <p style="font-size: 14px; color: #666;">This code expires in 5 minutes.</p>
    </div>
    `,
  );
}

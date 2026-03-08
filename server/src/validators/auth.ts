import { z } from "zod";

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const USERNAME_REGEX = /^[a-z0-9_]+$/;

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

export function validateNormalizedUsername(username: string): {
  valid: boolean;
  error: string | null;
} {
  if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
    return {
      valid: false,
      error: `Username must be between ${USERNAME_MIN_LENGTH} and ${USERNAME_MAX_LENGTH} characters`,
    };
  }

  if (!USERNAME_REGEX.test(username)) {
    return {
      valid: false,
      error: "Username may contain only letters, numbers, and underscores",
    };
  }

  return { valid: true, error: null };
}

// ── Email Auth ────────────────────────────────────────────────────────────────
export const registerSchema = z.object({
  email: z.string().email("Invalid email format").max(320),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
  name: z.string().max(120).optional(),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, "Username or email is required").max(320),
  password: z.string().min(1, "Password is required").max(128),
});

// ── Telegram Auth ─────────────────────────────────────────────────────────────
export const telegramAuthSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().optional(),
  auth_date: z.number(),
  hash: z.string(),
});

// ── Google Auth ───────────────────────────────────────────────────────────────
export const googleAuthSchema = z.object({
  credential: z.string().min(1, "Google credential is required"),
});

// ── Phone OTP ─────────────────────────────────────────────────────────────────
export const phoneOtpSendSchema = z.object({
  phone: z.string().min(7, "Phone number is required").max(20),
});

export const phoneOtpVerifySchema = z.object({
  phone: z.string().min(7).max(20),
  code: z.string().length(6, "Code must be 6 digits"),
});

// ── Username ──────────────────────────────────────────────────────────────────
export const usernameSchema = z.object({
  username: z.string().min(USERNAME_MIN_LENGTH).max(USERNAME_MAX_LENGTH),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters")
    .optional(),
});

// ── Password Reset ────────────────────────────────────────────────────────────
export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format").max(320),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
});

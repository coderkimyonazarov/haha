import { z } from "zod";

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
  identifier: z.string().min(3, "Username or email is required").max(320),
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
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(
      /^[a-zA-Z][a-zA-Z0-9_]{2,29}$/,
      "Username must start with a letter and contain only letters, numbers, and underscores",
    ),
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

import { Router } from "express";
import { randomUUID, createHmac, timingSafeEqual } from "crypto";
import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { users, sessions } from "../db/schema";
import {
  registerSchema,
  loginSchema,
  telegramAuthSchema,
  googleAuthSchema,
  phoneOtpSendSchema,
  phoneOtpVerifySchema,
  usernameSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators/auth";
import { parseWithSchema } from "../utils/validation";
import { AppError } from "../utils/error";
import { getSessionCookieName } from "../middleware/auth";
import {
  createSession,
  findOrCreateByProvider,
  findUserByEmail,
  findUserByUsername,
  createUser,
  linkProvider,
  hashPassword,
  verifyPassword,
  validateUsername,
  isUsernameAvailable,
  setUsername as setUsernameService,
  getUserPreferences,
  updatePreferences,
  logAudit,
  SESSION_TTL_MS,
} from "../services/authService";
import {
  validateTelegramAuth,
  getTelegramDisplayName,
  type TelegramAuthData,
} from "../services/telegramAuth";
import { verifyGoogleIdToken } from "../services/googleAuth";
import { createOtp, verifyOtp } from "../services/otpService";
import {
  sendOtpSms,
  normalizePhone,
  isValidPhone,
} from "../services/smsService";
import { sendOtpEmail } from "../services/emailAuth";
import {
  createPasswordResetToken,
  sendPasswordResetEmail,
  verifyPasswordResetToken,
} from "../services/emailAuth";

// ── Admin session helpers ──────────────────────────────────────────────────────
const ADMIN_COOKIE = "sypev_admin";

function getAdminSecret() {
  return process.env.ADMIN_SECRET || "sypev_admin_secret_change_me";
}

function signAdminToken(payload: string): string {
  const sig = createHmac("sha256", getAdminSecret())
    .update(payload)
    .digest("hex");
  return `${payload}.${sig}`;
}

function verifyAdminToken(token: string): boolean {
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return false;
  const payload = token.slice(0, lastDot);
  const expected = Buffer.from(
    createHmac("sha256", getAdminSecret()).update(payload).digest("hex"),
  );
  try {
    const provided = Buffer.from(token.slice(lastDot + 1));
    if (expected.length !== provided.length) return false;
    return timingSafeEqual(expected, provided);
  } catch {
    return false;
  }
}

function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 7,
    path: "/",
  };
}

const router = Router();

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS,
    path: "/",
  };
}

function getClientIp(req: any): string {
  return (
    req.headers["x-forwarded-for"]?.toString()?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    ""
  );
}

// ── Email Register ────────────────────────────────────────────────────────────
router.post("/register", async (req, res, next) => {
  try {
    const input = parseWithSchema(registerSchema, req.body);
    const email = input.email.toLowerCase().trim();

    const existing = await findUserByEmail(email);
    if (existing) {
      throw new AppError("EMAIL_TAKEN", "Email already registered", 409);
    }

    const passwordHash = await hashPassword(input.password);
    const user = await createUser({
      name: input.name || "Student",
      email,
      passwordHash,
    });

    // Link email provider
    await linkProvider({
      userId: user.id,
      provider: "email",
      providerUserId: email,
      providerEmail: email,
    });

    const sessionId = await createSession(user.id);

    await logAudit({
      userId: user.id,
      action: "register",
      metadata: { provider: "email" },
      ip: getClientIp(req),
      userAgent: req.headers["user-agent"],
    });

    res.cookie(getSessionCookieName(), sessionId, cookieOptions());
    res.json({
      ok: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        needsUsername: !user.username,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ── Email / Username Login ───────────────────────────────────────────────────────────────
router.post("/login", async (req, res, next) => {
  try {
    const input = parseWithSchema(loginSchema, req.body);
    const identifier = input.identifier.toLowerCase().trim();

    let user = await findUserByEmail(identifier);
    if (!user) {
      user = await findUserByUsername(identifier);
    }
    
    if (!user) {
      throw new AppError(
        "INVALID_CREDENTIALS",
        "Invalid email or password",
        401,
      );
    }
    if (user.isBanned) {
      throw new AppError("ACCOUNT_BANNED", "Account is banned", 403);
    }
    if (!user.passwordHash) {
      throw new AppError(
        "NO_PASSWORD",
        "This account uses social login. Please sign in with Google or Telegram, or reset your password.",
        401,
      );
    }

    const valid = await verifyPassword(user.passwordHash, input.password);
    if (!valid) {
      await logAudit({
        userId: user.id,
        action: "login_failed",
        metadata: { reason: "wrong_password" },
        ip: getClientIp(req),
        userAgent: req.headers["user-agent"],
      });
      throw new AppError(
        "INVALID_CREDENTIALS",
        "Invalid email or password",
        401,
      );
    }

    const sessionId = await createSession(user.id);

    await logAudit({
      userId: user.id,
      action: "login",
      metadata: { provider: "email" },
      ip: getClientIp(req),
      userAgent: req.headers["user-agent"],
    });

    res.cookie(getSessionCookieName(), sessionId, cookieOptions());
    res.json({
      ok: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        needsUsername: !user.username,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ── Telegram Auth ─────────────────────────────────────────────────────────────
router.post("/telegram", async (req, res, next) => {
  try {
    const input = parseWithSchema(telegramAuthSchema, req.body);
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      throw new AppError(
        "CONFIG_ERROR",
        "Telegram login is not configured",
        500,
      );
    }

    const authData = input as unknown as TelegramAuthData;
    const isValid = validateTelegramAuth(authData, botToken);
    if (!isValid) {
      await logAudit({
        action: "telegram_auth_failed",
        metadata: { telegramId: input.id },
        ip: getClientIp(req),
        userAgent: req.headers["user-agent"],
      });
      throw new AppError(
        "INVALID_AUTH",
        "Invalid Telegram authentication data",
        401,
      );
    }

    const displayName = getTelegramDisplayName(authData);
    const result = await findOrCreateByProvider({
      provider: "telegram",
      providerUserId: String(input.id),
      name: displayName,
      email: null, // Telegram doesn't provide email
    });

    await logAudit({
      userId: result.user.id,
      action: result.isNewUser ? "register" : "login",
      metadata: { provider: "telegram", telegramId: input.id },
      ip: getClientIp(req),
      userAgent: req.headers["user-agent"],
    });

    res.cookie(getSessionCookieName(), result.sessionId, cookieOptions());
    res.json({
      ok: true,
      data: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        username: result.user.username,
        isNewUser: result.isNewUser,
        needsUsername: result.needsUsername,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ── Google Auth ───────────────────────────────────────────────────────────────
router.post("/google", async (req, res, next) => {
  try {
    const input = parseWithSchema(googleAuthSchema, req.body);

    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new AppError("CONFIG_ERROR", "Google login is not configured", 500);
    }

    const googleUser = await verifyGoogleIdToken(input.credential);

    const result = await findOrCreateByProvider({
      provider: "google",
      providerUserId: googleUser.id,
      name: googleUser.name,
      email: googleUser.email,
    });

    await logAudit({
      userId: result.user.id,
      action: result.isNewUser ? "register" : "login",
      metadata: { provider: "google", googleEmail: googleUser.email },
      ip: getClientIp(req),
      userAgent: req.headers["user-agent"],
    });

    res.cookie(getSessionCookieName(), result.sessionId, cookieOptions());
    res.json({
      ok: true,
      data: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        username: result.user.username,
        isNewUser: result.isNewUser,
        needsUsername: result.needsUsername,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ── Phone OTP: Send ───────────────────────────────────────────────────────────
router.post("/phone/send-otp", async (req, res, next) => {
  try {
    const input = parseWithSchema(phoneOtpSendSchema, req.body);
    const phone = normalizePhone(input.phone);

    if (!isValidPhone(phone)) {
      throw new AppError("INVALID_PHONE", "Invalid phone number format", 400);
    }

    // userId is null for unauthenticated users (login/register flow)
    const userId = req.user?.id || null;
    const code = await createOtp(userId, phone, "login");

    // Send SMS
    const sent = await sendOtpSms(phone, code);

    await logAudit({
      userId,
      action: "phone_otp_sent",
      metadata: { phone: phone.slice(-4) }, // log only last 4 digits
      ip: getClientIp(req),
      userAgent: req.headers["user-agent"],
    });

    res.json({
      ok: true,
      data: {
        sent,
        message: "Verification code sent",
        // DEV ONLY: include code in development
        ...(process.env.NODE_ENV === "development" ? { code } : {}),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Too many")) {
      return next(new AppError("RATE_LIMIT", error.message, 429));
    }
    next(error);
  }
});

// ── Phone OTP: Verify ─────────────────────────────────────────────────────────
router.post("/phone/verify-otp", async (req, res, next) => {
  try {
    const input = parseWithSchema(phoneOtpVerifySchema, req.body);
    const phone = normalizePhone(input.phone);

    const result = await verifyOtp(phone, input.code, "login");
    if (!result.valid) {
      throw new AppError("INVALID_OTP", result.error || "Invalid code", 401);
    }

    // Find or create user by phone
    const authResult = await findOrCreateByProvider({
      provider: "phone",
      providerUserId: phone,
      name: "User",
      email: null,
    });

    await logAudit({
      userId: authResult.user.id,
      action: authResult.isNewUser ? "register" : "login",
      metadata: { provider: "phone" },
      ip: getClientIp(req),
      userAgent: req.headers["user-agent"],
    });

    res.cookie(getSessionCookieName(), authResult.sessionId, cookieOptions());
    res.json({
      ok: true,
      data: {
        id: authResult.user.id,
        email: authResult.user.email,
        name: authResult.user.name,
        username: authResult.user.username,
        isNewUser: authResult.isNewUser,
        needsUsername: authResult.needsUsername,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ── Forgot Password ───────────────────────────────────────────────────────────
router.post("/forgot-password", async (req, res, next) => {
  try {
    const input = parseWithSchema(forgotPasswordSchema, req.body);
    const token = await createPasswordResetToken(input.email);

    // Always return success (don't reveal if email exists)
    if (token) {
      await sendPasswordResetEmail(input.email, token);
      await logAudit({
        action: "password_reset_requested",
        metadata: { email: input.email },
        ip: getClientIp(req),
        userAgent: req.headers["user-agent"],
      });
    }

    res.json({
      ok: true,
      data: {
        message:
          "If an account with that email exists, we sent a password reset link.",
        // DEV ONLY
        ...(process.env.NODE_ENV === "development" && token ? { token } : {}),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ── Reset Password ────────────────────────────────────────────────────────────
router.post("/reset-password", async (req, res, next) => {
  try {
    const input = parseWithSchema(resetPasswordSchema, req.body);
    const userId = await verifyPasswordResetToken(input.token);

    if (!userId) {
      throw new AppError(
        "INVALID_TOKEN",
        "Invalid or expired reset token. Please request a new one.",
        400,
      );
    }

    const passwordHash = await hashPassword(input.password);
    const db = getDb();
    await db
      .update(users)
      .set({ passwordHash, updatedAt: Date.now() })
      .where(eq(users.id, userId));

    await logAudit({
      userId,
      action: "password_reset_completed",
      ip: getClientIp(req),
      userAgent: req.headers["user-agent"],
    });

    res.json({
      ok: true,
      data: { message: "Password has been reset successfully." },
    });
  } catch (error) {
    next(error);
  }
});

// ── Check Username Availability ───────────────────────────────────────────────
router.get("/check-username", async (req, res, next) => {
  try {
    const username = (req.query.username as string) || "";
    const validation = validateUsername(username);

    if (!validation.valid) {
      return res.json({
        ok: true,
        data: { available: false, error: validation.error },
      });
    }

    const available = await isUsernameAvailable(username);
    res.json({ ok: true, data: { available } });
  } catch (error) {
    next(error);
  }
});

// ── Set Username (requires auth) ──────────────────────────────────────────────
router.post("/set-username", async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    }

    const input = parseWithSchema(usernameSchema, req.body);
    const user = await setUsernameService(req.user.id, input.username, input.password);

    await logAudit({
      userId: req.user.id,
      action: "username_set",
      metadata: { username: input.username },
      ip: getClientIp(req),
      userAgent: req.headers["user-agent"],
    });

    res.json({
      ok: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ── Update Preferences (requires auth) ────────────────────────────────────────
router.patch("/preferences", async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    }

    const prefs = await updatePreferences(req.user.id, req.body);
    res.json({ ok: true, data: prefs });
  } catch (error) {
    next(error);
  }
});

// ── Logout ────────────────────────────────────────────────────────────────────
router.post("/logout", async (req, res, next) => {
  try {
    const db = getDb();
    const sessionId = req.cookies?.[getSessionCookieName()];
    if (sessionId) {
      await db.delete(sessions).where(eq(sessions.id, sessionId));
    }
    res.clearCookie(getSessionCookieName(), { path: "/" });
    res.json({ ok: true, data: { loggedOut: true } });
  } catch (error) {
    next(error);
  }
});

// ── Me ────────────────────────────────────────────────────────────────────────
router.get("/me", async (req, res, next) => {
  try {
    if (!req.user) {
      return res.json({ ok: true, data: { user: null, profile: null } });
    }
    const db = getDb();
    const { studentProfiles } = await import("../db/schema");
    const profile = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, req.user.id))
      .get();

    const { getUserProviders } = await import("../services/authService");
    const providers = await getUserProviders(req.user.id);

    res.json({
      ok: true,
      data: {
        user: {
          ...req.user,
          needsUsername: !req.user.username,
        },
        profile,
        providers: providers.map((p) => ({
          provider: p.provider,
          linkedAt: p.linkedAt,
        })),
        preferences: await getUserPreferences(req.user.id),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ── Admin-specific auth routes ─────────────────────────────────────────────────
router.post("/admin-login", async (req, res, next) => {
  try {
    const { username, password } = req.body as {
      username?: string;
      password?: string;
    };
    const envUser = process.env.ADMIN_USERNAME || "admin";
    const envPassHash = process.env.ADMIN_PASSWORD_HASH;
    const envPassPlain = process.env.ADMIN_PASSWORD;

    if (!username || !password || username !== envUser) {
      throw new AppError(
        "INVALID_CREDENTIALS",
        "Invalid admin credentials",
        401,
      );
    }

    // Secure comparison
    let valid = false;
    if (envPassHash) {
      valid = await argon2.verify(envPassHash, password);
    } else if (envPassPlain && process.env.NODE_ENV !== "production") {
      // Plaintext fallback for DEV ONLY
      const a = Buffer.from(password);
      const b = Buffer.from(envPassPlain);
      valid = a.length === b.length && timingSafeEqual(a, b);
    } else if (process.env.NODE_ENV === "production") {
      throw new AppError(
        "CONFIG_ERROR",
        "ADMIN_PASSWORD_HASH must be configured in production",
        500,
      );
    }

    if (!valid) {
      await logAudit({
        action: "admin_login_failed",
        metadata: { username },
        ip: getClientIp(req),
        userAgent: req.headers["user-agent"],
      });
      throw new AppError(
        "INVALID_CREDENTIALS",
        "Invalid admin credentials",
        401,
      );
    }

    const payload = `admin:${Date.now()}`;
    const token = signAdminToken(payload);
    res.cookie(ADMIN_COOKIE, token, adminCookieOptions());

    await logAudit({
      action: "admin_login",
      metadata: { username },
      ip: getClientIp(req),
      userAgent: req.headers["user-agent"],
    });

    res.json({ ok: true, data: { admin: true } });
  } catch (error) {
    next(error);
  }
});

router.post("/admin-logout", (_req, res) => {
  res.clearCookie(ADMIN_COOKIE, { path: "/" });
  res.json({ ok: true, data: { loggedOut: true } });
});

router.get("/admin-me", (req, res) => {
  const token = req.cookies?.[ADMIN_COOKIE];
  const admin = token ? verifyAdminToken(token) : false;
  res.json({ ok: true, data: { admin } });
});

export default router;

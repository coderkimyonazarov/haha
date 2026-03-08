import rateLimit, { ipKeyGenerator } from "express-rate-limit";

// ── Global rate limiter ───────────────────────────────────────────────────────
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: {
      code: "RATE_LIMIT",
      message: "Too many requests, please try again later.",
    },
  },
});

// ── Auth routes rate limiter ──────────────────────────────────────────────────
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: {
      code: "RATE_LIMIT",
      message: "Too many authentication attempts, please try again later.",
    },
  },
});

// ── Auth read endpoints limiter (username checks, health, me) ───────────────
export const authReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: {
      code: "RATE_LIMIT",
      message: "Too many auth status requests, please slow down.",
    },
  },
});

// ── Strict OTP rate limiter ───────────────────────────────────────────────────
export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const phone = typeof req.body?.phone === "string" ? req.body.phone.trim() : "";
    if (phone) {
      return `phone:${phone}`;
    }

    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (email) {
      return `email:${email}`;
    }

    return ipKeyGenerator(req.ip ?? "0.0.0.0");
  },
  message: {
    ok: false,
    error: {
      code: "RATE_LIMIT",
      message: "Too many OTP requests, please try again later.",
    },
  },
});

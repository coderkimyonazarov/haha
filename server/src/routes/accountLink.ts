import { Router } from "express";
import { AppError } from "../utils/error";
import {
  linkProvider,
  getUserProviders,
  unlinkProvider,
  logAudit,
  type ProviderType,
} from "../services/authService";
import {
  validateTelegramAuth,
  type TelegramAuthData,
} from "../services/telegramAuth";
import { verifyGoogleIdToken } from "../services/googleAuth";
import { createOtp, verifyOtp } from "../services/otpService";
import {
  sendOtpSms,
  normalizePhone,
  isValidPhone,
} from "../services/smsService";
import { parseWithSchema } from "../utils/validation";
import {
  telegramAuthSchema,
  googleAuthSchema,
  phoneOtpSendSchema,
  phoneOtpVerifySchema,
} from "../validators/auth";

const router = Router();

function getClientIp(req: any): string {
  return (
    req.headers["x-forwarded-for"]?.toString()?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    ""
  );
}

// ── List Linked Providers ─────────────────────────────────────────────────────
router.get("/providers", async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    }
    const providers = await getUserProviders(req.user.id);
    res.json({
      ok: true,
      data: providers.map((p) => ({
        id: p.id,
        provider: p.provider,
        providerEmail: p.providerEmail,
        linkedAt: p.linkedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// ── Link Telegram ─────────────────────────────────────────────────────────────
router.post("/link/telegram", async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    }

    const input = parseWithSchema(telegramAuthSchema, req.body);
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      throw new AppError("CONFIG_ERROR", "Telegram is not configured", 500);
    }

    const authData = input as unknown as TelegramAuthData;
    if (!validateTelegramAuth(authData, botToken)) {
      throw new AppError("INVALID_AUTH", "Invalid Telegram auth data", 401);
    }

    await linkProvider({
      userId: req.user.id,
      provider: "telegram",
      providerUserId: String(input.id),
    });

    await logAudit({
      userId: req.user.id,
      action: "provider_linked",
      metadata: { provider: "telegram" },
      ip: getClientIp(req),
      userAgent: req.headers["user-agent"],
    });

    res.json({ ok: true, data: { linked: true, provider: "telegram" } });
  } catch (error) {
    if (error instanceof Error && error.message.includes("already linked")) {
      return next(new AppError("PROVIDER_CONFLICT", error.message, 409));
    }
    next(error);
  }
});

// ── Link Google ───────────────────────────────────────────────────────────────
router.post("/link/google", async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    }

    const input = parseWithSchema(googleAuthSchema, req.body);
    const googleUser = await verifyGoogleIdToken(input.credential);

    await linkProvider({
      userId: req.user.id,
      provider: "google",
      providerUserId: googleUser.id,
      providerEmail: googleUser.email,
    });

    await logAudit({
      userId: req.user.id,
      action: "provider_linked",
      metadata: { provider: "google", email: googleUser.email },
      ip: getClientIp(req),
      userAgent: req.headers["user-agent"],
    });

    res.json({ ok: true, data: { linked: true, provider: "google" } });
  } catch (error) {
    if (error instanceof Error && error.message.includes("already linked")) {
      return next(new AppError("PROVIDER_CONFLICT", error.message, 409));
    }
    next(error);
  }
});

// ── Link Phone: Send OTP ──────────────────────────────────────────────────────
router.post("/link/phone/send-otp", async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    }

    const input = parseWithSchema(phoneOtpSendSchema, req.body);
    const phone = normalizePhone(input.phone);

    if (!isValidPhone(phone)) {
      throw new AppError("INVALID_PHONE", "Invalid phone number", 400);
    }

    const code = await createOtp(req.user.id, phone, "link");
    await sendOtpSms(phone, code);

    res.json({
      ok: true,
      data: {
        sent: true,
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

// ── Link Phone: Verify OTP ───────────────────────────────────────────────────
router.post("/link/phone/verify-otp", async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    }

    const input = parseWithSchema(phoneOtpVerifySchema, req.body);
    const phone = normalizePhone(input.phone);

    const result = await verifyOtp(phone, input.code, "link");
    if (!result.valid) {
      throw new AppError("INVALID_OTP", result.error || "Invalid code", 401);
    }

    await linkProvider({
      userId: req.user.id,
      provider: "phone",
      providerUserId: phone,
    });

    await logAudit({
      userId: req.user.id,
      action: "provider_linked",
      metadata: { provider: "phone" },
      ip: getClientIp(req),
      userAgent: req.headers["user-agent"],
    });

    res.json({ ok: true, data: { linked: true, provider: "phone" } });
  } catch (error) {
    if (error instanceof Error && error.message.includes("already linked")) {
      return next(new AppError("PROVIDER_CONFLICT", error.message, 409));
    }
    next(error);
  }
});

// ── Unlink Provider ───────────────────────────────────────────────────────────
router.delete("/providers/:provider", async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    }

    const provider = req.params.provider as ProviderType;
    const validProviders: ProviderType[] = [
      "telegram",
      "google",
      "email",
      "phone",
    ];
    if (!validProviders.includes(provider)) {
      throw new AppError("INVALID_PROVIDER", "Invalid provider", 400);
    }

    await unlinkProvider(req.user.id, provider);

    await logAudit({
      userId: req.user.id,
      action: "provider_unlinked",
      metadata: { provider },
      ip: getClientIp(req),
      userAgent: req.headers["user-agent"],
    });

    res.json({ ok: true, data: { unlinked: true, provider } });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Cannot unlink")) {
      return next(new AppError("UNLINK_BLOCKED", error.message, 400));
    }
    next(error);
  }
});

export default router;

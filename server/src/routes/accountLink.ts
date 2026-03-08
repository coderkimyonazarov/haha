import { Router } from "express";
import { AppError } from "../utils/error";
import { getDb } from "../db";
import { linkedIdentities, auditLogs } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { getSupabaseAdmin } from "../utils/supabase";
import { validateTelegramAuth, type TelegramAuthData } from "../services/telegramAuth";
import { parseWithSchema } from "../utils/validation";
import { telegramAuthSchema } from "../validators/auth";

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
    const db = getDb();
    const linked = await db.select().from(linkedIdentities).where(eq(linkedIdentities.userId, req.user.id));
    
    // Also fetch from Supabase native identities
    const { data: { user } } = await getSupabaseAdmin().auth.admin.getUserById(req.user.id);
    const nativeIdentities = user?.identities || [];
    
    const providers = [
      ...nativeIdentities.map(id => ({
        id: id.id,
        provider: id.provider,
        providerEmail: id.identity_data?.email,
        linkedAt: id.created_at ? new Date(id.created_at).getTime() : Date.now(),
      })),
      ...linked.map(l => ({
        id: l.id,
        provider: l.provider,
        providerEmail: null,
        linkedAt: new Date(l.linkedAt).getTime(),
      }))
    ];

    res.json({ ok: true, data: providers });
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

    const db = getDb();
    
    // Check if already linked
    const existing = await db.select().from(linkedIdentities)
      .where(and(eq(linkedIdentities.provider, "telegram"), eq(linkedIdentities.providerUserId, String(input.id))));
      
    if (existing.length > 0) {
      throw new AppError("PROVIDER_CONFLICT", "Telegram account is already linked", 409);
    }

    await db.insert(linkedIdentities).values({
      userId: req.user.id,
      provider: "telegram",
      providerUserId: String(input.id),
    });

    await db.insert(auditLogs).values({
      userId: req.user.id,
      action: "provider_linked",
      metadata: JSON.stringify({ provider: "telegram" }),
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

// ── Unlink Provider ───────────────────────────────────────────────────────────
router.delete("/providers/:provider", async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    }

    const provider = req.params.provider;
    const db = getDb();

    if (provider === "telegram") {
      await db.delete(linkedIdentities)
        .where(and(eq(linkedIdentities.userId, req.user.id), eq(linkedIdentities.provider, "telegram")));
    } else {
      // Unlink native provider via Supabase Admin API
      const { data: { user } } = await getSupabaseAdmin().auth.admin.getUserById(req.user.id);
      const identity = user?.identities?.find(id => id.provider === provider);
      if (identity) {
        await getSupabaseAdmin().auth.admin.deleteIdentity(identity.identity_id);
      }
    }

    await db.insert(auditLogs).values({
      userId: req.user.id,
      action: "provider_unlinked",
      metadata: JSON.stringify({ provider }),
      ip: getClientIp(req),
      userAgent: req.headers["user-agent"],
    });

    res.json({ ok: true, data: { unlinked: true, provider } });
  } catch (error) {
    next(error);
  }
});

export default router;

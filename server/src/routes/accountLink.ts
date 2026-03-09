import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { AppError } from "../utils/error";
import { getDb, isDatabaseHealthy } from "../db";
import { linkedIdentities, auditLogs } from "../db/schema";
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

function getDbOrNull() {
  if (!isDatabaseHealthy()) {
    return null;
  }

  try {
    return getDb();
  } catch {
    return null;
  }
}

async function findSupabaseUserByTelegramId(telegramUserId: string) {
  const maxPages = 50;
  const perPage = 200;

  for (let page = 1; page <= maxPages; page += 1) {
    const { data, error } = await getSupabaseAdmin().auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new AppError("AUTH_SERVICE_UNAVAILABLE", "Provider service temporarily unavailable", 503);
    }

    const users = data?.users ?? [];
    const matchedUser =
      users.find((user) => {
        const metadataTelegramId = user.user_metadata?.telegram_user_id;
        return typeof metadataTelegramId === "string" && metadataTelegramId === telegramUserId;
      }) ?? null;

    if (matchedUser) {
      return matchedUser;
    }

    if (users.length < perPage) {
      break;
    }
  }

  return null;
}

// ── List Linked Providers ─────────────────────────────────────────────────────
router.get("/providers", async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    }

    const db = getDbOrNull();
    let linked: Array<{
      id: string;
      provider: string;
      providerUserId: string;
      linkedAt: Date;
    }> = [];

    if (db) {
      linked = await db
        .select()
        .from(linkedIdentities)
        .where(eq(linkedIdentities.userId, req.user.id));
    }

    const {
      data: { user },
      error: userLookupError,
    } = await getSupabaseAdmin().auth.admin.getUserById(req.user.id);

    if (userLookupError || !user) {
      throw new AppError("AUTH_SERVICE_UNAVAILABLE", "Provider service temporarily unavailable", 503);
    }

    const nativeIdentities = user.identities || [];

    const providers = [
      ...nativeIdentities.map((id) => ({
        id: id.id,
        provider: id.provider,
        providerEmail: id.identity_data?.email,
        linkedAt: id.created_at ? new Date(id.created_at).getTime() : Date.now(),
      })),
      ...linked.map((l) => ({
        id: l.id,
        provider: l.provider,
        providerEmail: null,
        linkedAt: new Date(l.linkedAt).getTime(),
      })),
    ];

    if (typeof user.user_metadata?.telegram_user_id === "string") {
      providers.push({
        id: `telegram-meta-${user.id}`,
        provider: "telegram",
        providerEmail: null,
        linkedAt: Date.now(),
      });
    }

    const dedupedByProvider = Array.from(
      providers.reduce((acc, provider) => {
        if (!acc.has(provider.provider)) {
          acc.set(provider.provider, provider);
        }
        return acc;
      }, new Map<string, (typeof providers)[number]>()),
    ).map(([, value]) => value);

    res.json({ ok: true, data: dedupedByProvider });
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

    const telegramUserId = String(input.id);
    const db = getDbOrNull();

    let linkedUserId: string | null = null;

    if (db) {
      const existing = await db
        .select()
        .from(linkedIdentities)
        .where(
          and(
            eq(linkedIdentities.provider, "telegram"),
            eq(linkedIdentities.providerUserId, telegramUserId),
          ),
        )
        .limit(1);
      linkedUserId = existing[0]?.userId ?? null;
    }

    if (!linkedUserId) {
      const metadataLinkedUser = await findSupabaseUserByTelegramId(telegramUserId);
      linkedUserId = metadataLinkedUser?.id ?? null;
    }

    if (linkedUserId && linkedUserId !== req.user.id) {
      throw new AppError("PROVIDER_CONFLICT", "Telegram account is already linked", 409);
    }

    const metadata = {
      ...(req.user.user_metadata ?? {}),
      telegram_user_id: telegramUserId,
      telegram_username: input.username ?? null,
    };

    const { error: updateError } = await getSupabaseAdmin().auth.admin.updateUserById(req.user.id, {
      user_metadata: metadata,
    });

    if (updateError) {
      throw new AppError("AUTH_SERVICE_UNAVAILABLE", "Provider service temporarily unavailable", 503);
    }

    if (db) {
      await db
        .insert(linkedIdentities)
        .values({
          userId: req.user.id,
          provider: "telegram",
          providerUserId: telegramUserId,
        })
        .onConflictDoNothing({
          target: [linkedIdentities.provider, linkedIdentities.providerUserId],
        });

      await db.insert(auditLogs).values({
        userId: req.user.id,
        action: "provider_linked",
        metadata: JSON.stringify({ provider: "telegram" }),
        ip: getClientIp(req),
        userAgent: req.headers["user-agent"],
      });
    }

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
    const db = getDbOrNull();

    if (provider === "telegram") {
      const metadata = {
        ...(req.user.user_metadata ?? {}),
      } as Record<string, unknown>;
      delete metadata.telegram_user_id;
      delete metadata.telegram_username;

      const { error: updateError } = await getSupabaseAdmin().auth.admin.updateUserById(req.user.id, {
        user_metadata: metadata,
      });
      if (updateError) {
        throw new AppError("AUTH_SERVICE_UNAVAILABLE", "Provider service temporarily unavailable", 503);
      }

      if (db) {
        await db
          .delete(linkedIdentities)
          .where(
            and(
              eq(linkedIdentities.userId, req.user.id),
              eq(linkedIdentities.provider, "telegram"),
            ),
          );
      }
    } else {
      // Unlink native provider via Supabase Admin API
      const {
        data: { user },
      } = await getSupabaseAdmin().auth.admin.getUserById(req.user.id);
      const identity = user?.identities?.find((id) => id.provider === provider);
      if (identity) {
        await getSupabaseAdmin().auth.admin.deleteIdentity(identity.identity_id);
      }
    }

    if (db) {
      await db.insert(auditLogs).values({
        userId: req.user.id,
        action: "provider_unlinked",
        metadata: JSON.stringify({ provider }),
        ip: getClientIp(req),
        userAgent: req.headers["user-agent"],
      });
    }

    res.json({ ok: true, data: { unlinked: true, provider } });
  } catch (error) {
    next(error);
  }
});

export default router;

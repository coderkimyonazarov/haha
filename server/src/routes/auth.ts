import { randomBytes } from "crypto";
import { and, eq } from "drizzle-orm";
import { Router } from "express";
import jwt from "jsonwebtoken";

import { getDb } from "../db";
import { linkedIdentities, studentProfiles } from "../db/schema";
import { validateTelegramAuth, getTelegramDisplayName, type TelegramAuthData } from "../services/telegramAuth";
import { supabaseAdmin, supabaseAnon } from "../utils/supabase";
import { AppError } from "../utils/error";
import { parseWithSchema } from "../utils/validation";
import {
  loginSchema,
  telegramAuthSchema,
  usernameSchema,
  normalizeUsername,
  validateNormalizedUsername,
} from "../validators/auth";

const router = Router();

const TELEGRAM_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

function getTelegramJwtSecret(): string {
  const secret = process.env.APP_AUTH_JWT_SECRET;
  if (!secret) {
    throw new AppError(
      "CONFIG_ERROR",
      "APP_AUTH_JWT_SECRET is required for Telegram custom auth tokens",
      500,
    );
  }
  return secret;
}

function isEmailIdentifier(identifier: string): boolean {
  return /^\S+@\S+\.\S+$/.test(identifier);
}

async function resolveSupabaseUserFromBearerToken(authorization?: string) {
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}

function signTelegramToken(userId: string, telegramUserId: string): string {
  const secret = getTelegramJwtSecret();

  return jwt.sign(
    {
      iss: "test_bro_api",
      aud: "test_bro_telegram",
      sub: userId,
      provider: "telegram",
      telegram_user_id: telegramUserId,
    },
    secret,
    {
      algorithm: "HS256",
      expiresIn: TELEGRAM_TOKEN_TTL_SECONDS,
    },
  );
}

router.get("/check-username", async (req, res) => {
  const rawUsername = typeof req.query.username === "string" ? req.query.username : "";
  const normalizedUsername = normalizeUsername(rawUsername);
  const validation = validateNormalizedUsername(normalizedUsername);

  if (!validation.valid) {
    return res.status(200).json({
      ok: true,
      data: {
        available: false,
        valid: false,
        normalizedUsername: null,
        error: validation.error,
      },
    });
  }

  try {
    const db = getDb();
    const existing = await db
      .select({ userId: studentProfiles.userId })
      .from(studentProfiles)
      .where(eq(studentProfiles.username, normalizedUsername))
      .limit(1);

    return res.status(200).json({
      ok: true,
      data: {
        available: existing.length === 0,
        valid: true,
        normalizedUsername,
        error: null,
      },
    });
  } catch {
    return res.status(200).json({
      ok: true,
      data: {
        available: false,
        valid: false,
        normalizedUsername: null,
        error: "Could not validate username right now",
      },
    });
  }
});

router.post("/set-username", async (req, res, next) => {
  try {
    const input = parseWithSchema(usernameSchema, req.body);
    const user = await resolveSupabaseUserFromBearerToken(req.headers.authorization);

    if (!user) {
      throw new AppError("UNAUTHORIZED", "Missing or invalid auth token", 401);
    }

    const normalizedUsername = normalizeUsername(input.username);
    const validation = validateNormalizedUsername(normalizedUsername);

    if (!validation.valid) {
      throw new AppError("INVALID_INPUT", validation.error ?? "Invalid username", 400);
    }

    const db = getDb();

    const existing = await db
      .select({ userId: studentProfiles.userId })
      .from(studentProfiles)
      .where(eq(studentProfiles.username, normalizedUsername))
      .limit(1);

    if (existing.length > 0 && existing[0].userId !== user.id) {
      throw new AppError("USERNAME_TAKEN", "This username is already taken", 409);
    }

    await db
      .insert(studentProfiles)
      .values({
        userId: user.id,
        username: normalizedUsername,
      })
      .onConflictDoUpdate({
        target: studentProfiles.userId,
        set: {
          username: normalizedUsername,
          updatedAt: new Date(),
        },
      });

    return res.json({
      ok: true,
      data: {
        username: normalizedUsername,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const input = parseWithSchema(loginSchema, req.body);

    const identifier = input.identifier.trim();
    const password = input.password;

    let emailForLogin: string;

    if (isEmailIdentifier(identifier)) {
      emailForLogin = identifier.toLowerCase();
    } else {
      const normalizedUsername = normalizeUsername(identifier);
      const validation = validateNormalizedUsername(normalizedUsername);

      if (!validation.valid) {
        throw new AppError("INVALID_CREDENTIALS", "Invalid credentials", 401);
      }

      const db = getDb();
      const profile = await db
        .select({ userId: studentProfiles.userId })
        .from(studentProfiles)
        .where(eq(studentProfiles.username, normalizedUsername))
        .limit(1);

      if (profile.length === 0) {
        throw new AppError("INVALID_CREDENTIALS", "Invalid credentials", 401);
      }

      const {
        data: { user },
        error: userLookupError,
      } = await supabaseAdmin.auth.admin.getUserById(profile[0].userId);

      if (userLookupError || !user?.email) {
        throw new AppError("INVALID_CREDENTIALS", "Invalid credentials", 401);
      }

      emailForLogin = user.email;
    }

    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
      email: emailForLogin,
      password,
    });

    if (authError || !authData.session || !authData.user) {
      throw new AppError("INVALID_CREDENTIALS", "Invalid credentials", 401);
    }

    return res.json({
      ok: true,
      data: {
        session: authData.session,
        user: authData.user,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/telegram", async (req, res, next) => {
  try {
    const input = parseWithSchema(telegramAuthSchema, req.body) as TelegramAuthData;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      throw new AppError("CONFIG_ERROR", "TELEGRAM_BOT_TOKEN is missing", 500);
    }

    if (!validateTelegramAuth(input, botToken)) {
      throw new AppError("INVALID_AUTH", "Invalid Telegram auth signature", 401);
    }

    const db = getDb();
    const telegramUserId = String(input.id);

    const sessionUser = await resolveSupabaseUserFromBearerToken(req.headers.authorization);

    if (sessionUser) {
      const existingProviderLink = await db
        .select({ id: linkedIdentities.id })
        .from(linkedIdentities)
        .where(
          and(
            eq(linkedIdentities.provider, "telegram"),
            eq(linkedIdentities.providerUserId, telegramUserId),
          ),
        )
        .limit(1);

      if (existingProviderLink.length > 0) {
        throw new AppError("PROVIDER_CONFLICT", "Telegram account is already linked", 409);
      }

      await db.insert(linkedIdentities).values({
        userId: sessionUser.id,
        provider: "telegram",
        providerUserId: telegramUserId,
      });

      return res.json({
        ok: true,
        data: {
          linked: true,
          provider: "telegram",
          userId: sessionUser.id,
        },
      });
    }

    const existingLink = await db
      .select({ userId: linkedIdentities.userId })
      .from(linkedIdentities)
      .where(
        and(
          eq(linkedIdentities.provider, "telegram"),
          eq(linkedIdentities.providerUserId, telegramUserId),
        ),
      )
      .limit(1);

    let userId: string;

    if (existingLink.length > 0) {
      userId = existingLink[0].userId;
    } else {
      const syntheticEmail = `telegram_${telegramUserId}@users.telegram.local`;
      const generatedPassword = randomBytes(48).toString("hex");

      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: syntheticEmail,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: {
          name: getTelegramDisplayName(input),
          telegram_username: input.username ?? null,
          signup_provider: "telegram",
        },
      });

      if (createError || !created.user) {
        throw new AppError("CREATE_FAILED", "Failed to create Telegram account", 500);
      }

      userId = created.user.id;

      await db.insert(linkedIdentities).values({
        userId,
        provider: "telegram",
        providerUserId: telegramUserId,
      });

      await db
        .insert(studentProfiles)
        .values({ userId })
        .onConflictDoNothing({ target: studentProfiles.userId });
    }

    const accessToken = signTelegramToken(userId, telegramUserId);

    return res.json({
      ok: true,
      data: {
        accessToken,
        tokenType: "Bearer",
        expiresIn: TELEGRAM_TOKEN_TTL_SECONDS,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", async (req, res, next) => {
  try {
    if (!req.user) {
      return res.json({ ok: true, data: { user: null } });
    }

    const db = getDb();

    const profileRows = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, req.user.id))
      .limit(1);

    const providerRows = await db
      .select({ provider: linkedIdentities.provider, linkedAt: linkedIdentities.linkedAt })
      .from(linkedIdentities)
      .where(eq(linkedIdentities.userId, req.user.id));

    const {
      data: { user: adminUser },
    } = await supabaseAdmin.auth.admin.getUserById(req.user.id);

    const nativeProviders = (adminUser?.identities ?? [])
      .map((identity) => ({
        provider: identity.provider,
        linkedAt: identity.created_at ? new Date(identity.created_at).getTime() : Date.now(),
      }))
      .filter((item): item is { provider: string; linkedAt: number } => Boolean(item.provider));

    const providersMap = new Map<string, number>();

    for (const provider of nativeProviders) {
      providersMap.set(provider.provider, provider.linkedAt);
    }

    for (const row of providerRows) {
      providersMap.set(row.provider, new Date(row.linkedAt).getTime());
    }

    const profile = profileRows[0] ?? null;

    return res.json({
      ok: true,
      data: {
        user: {
          id: req.user.id,
          email: req.user.email ?? null,
          username: profile?.username ?? null,
          name: (req.user.user_metadata?.name as string | undefined) ?? "User",
          isAdmin: 0,
          isVerified: req.user.email_confirmed_at ? 1 : 0,
          needsUsername: !profile?.username,
        },
        profile,
        providers: Array.from(providersMap.entries()).map(([provider, linkedAt]) => ({
          provider,
          linkedAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", async (_req, res) => {
  return res.json({ ok: true, data: { loggedOut: true } });
});

router.post("/admin-login", async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (
      username === process.env.ADMIN_USERNAME &&
      password === process.env.ADMIN_PASSWORD &&
      username !== undefined
    ) {
      res.cookie("sypev_admin", "true", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });
      return res.json({ ok: true, data: { admin: true } });
    }
    throw new AppError("UNAUTHORIZED", "Invalid admin credentials", 401);
  } catch (error) {
    next(error);
  }
});

router.post("/admin-logout", async (_req, res, next) => {
  try {
    res.clearCookie("sypev_admin", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    res.json({ ok: true, data: { loggedOut: true } });
  } catch (error) {
    next(error);
  }
});

router.get("/admin-me", async (req, res, next) => {
  try {
    const adminCookie = req.cookies?.sypev_admin;
    if (adminCookie) {
      return res.json({ ok: true, data: { admin: true } });
    }
    return res.json({ ok: true, data: { admin: false } });
  } catch (error) {
    next(error);
  }
});

export default router;
